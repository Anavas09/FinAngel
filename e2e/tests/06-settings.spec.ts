import { test, expect } from '../fixtures/index';
import type { Page } from '@playwright/test';

// El panel usa Row = div con span label + control. No tiene clase propia.
// Selector: div dentro del panel que tiene exactamente ese span de label.
const panelRow = (panel: ReturnType<Page['locator']>, label: string) =>
  panel.locator(`div:has(span:text-is("${label}"))`);

const openPanel = async (page: Page) => {
  await page.getByRole('button', { name: 'Configuración' }).click();
  await expect(page.getByText('⚙️ Configuración')).toBeVisible();
  return page.locator('[style*="z-index: 100"][style*="bottom: 90px"]');
};

const closePanel = async (page: Page) => {
  await page.mouse.click(800, 100);
  await expect(page.getByText('⚙️ Configuración')).not.toBeVisible();
};

// ─── Tests ────────────────────────────────────────────────────────────────────

test('abrir y cerrar el panel con clic fuera', async ({ withSeed: app }) => {
  await openPanel(app.page);
  await closePanel(app.page);
});

test('editar nombre de usuario actualiza el saludo', async ({ withSeed: app }) => {
  const panel = await openPanel(app.page);
  const nameRow = panel.locator('div:has(input[placeholder="Tu nombre"])').last();

  // Nombre único para este test (timestamp evita colisiones entre runs)
  const testName = 'E2EUser';

  await nameRow.locator('input').fill(testName);
  await expect(nameRow.locator('input')).toHaveValue(testName);
  await nameRow.getByRole('button', { name: 'OK' }).click();

  // USER_UPDATED dispara un reload del hook → app muestra spinner → luego vuelve con el nuevo nombre
  await expect(app.page.locator('.fa-greeting-eyebrow')).toContainText(testName, { timeout: 15_000 });
  // El panel se cierra durante el reload → espera a que la app estabilice
  await app.page.locator('.fa-fab').waitFor({ timeout: 10_000 });
});

test('toggle privacidad oculta los montos', async ({ withSeed: app }) => {
  const totalBefore = await app.getTotalAmount().innerText();

  const panel = await openPanel(app.page);
  await panelRow(panel, 'Privacidad').getByRole('switch').click();
  await closePanel(app.page);

  await expect(app.getTotalAmount()).toHaveText('••••••');

  // Limpieza
  const panel2 = await openPanel(app.page);
  await panelRow(panel2, 'Privacidad').getByRole('switch').click();
  await closePanel(app.page);
  await expect(app.getTotalAmount()).toHaveText(totalBefore);
});

test('toggle privacidad persiste al recargar', async ({ withSeed: app }) => {
  const panel = await openPanel(app.page);
  await panelRow(panel, 'Privacidad').getByRole('switch').click();
  await closePanel(app.page);

  await app.page.reload();
  await app.page.locator('.fa-fab').waitFor({ timeout: 15_000 });

  await expect(app.getTotalAmount()).toHaveText('••••••');

  // Limpieza
  const panel2 = await openPanel(app.page);
  await panelRow(panel2, 'Privacidad').getByRole('switch').click();
  await closePanel(app.page);
});

test('cambiar layout aplica la clase en el root', async ({ withSeed: app }) => {
  const panel = await openPanel(app.page);
  await panelRow(panel, 'Layout').locator('select').selectOption('compact');
  await closePanel(app.page);

  await expect(app.page.locator('.fa-app')).toHaveClass(/fa-layout-compact/);

  // Limpieza
  const panel2 = await openPanel(app.page);
  await panelRow(panel2, 'Layout').locator('select').selectOption('saludo');
  await closePanel(app.page);
});

test('cambiar color de acento actualiza la CSS var --accent', async ({ withSeed: app }) => {
  const panel = await openPanel(app.page);
  const targetColor = '#5BB890';
  await panel.getByRole('button', { name: targetColor }).click();
  await closePanel(app.page);

  const accent = await app.page.evaluate(
    () => document.documentElement.style.getPropertyValue('--accent')
  );
  expect(accent).toBe(targetColor);
});

test('actualizar tipo de cambio USD recalcula el total ARS', async ({ withSeed: app }) => {
  const totalBefore = await app.getTotalAmount().innerText();

  const panel = await openPanel(app.page);

  // Fila FX: div flex que contiene el span "Dólar (USD)" y el input numérico
  const usdRow = panel.locator('div:has(span:text-is("Dólar (USD)"))').last();
  await usdRow.locator('input').fill('9999');
  await usdRow.getByRole('button', { name: 'OK' }).click();
  await closePanel(app.page);

  await expect(app.getTotalAmount()).not.toHaveText(totalBefore, { timeout: 5_000 });
});

// Helper: asegura que Comida no tenga presupuesto guardado antes del test
const clearComidaBudget = async (page: import('@playwright/test').Page) => {
  const panel = await openPanel(page);
  const comidaRow = panel.locator('div:has(span:text-is("Comida"))').last();
  const removeBtn = comidaRow.getByRole('button', { name: '✕' });
  if (await removeBtn.isVisible({ timeout: 500 }).catch(() => false)) {
    await removeBtn.click();
  }
  await closePanel(page);
};

test('configurar presupuesto muestra barra en el chart', async ({ withSeed: app }) => {
  await clearComidaBudget(app.page);

  const panel = await openPanel(app.page);
  const comidaRow = panel.locator('div:has(span:text-is("Comida"))').last();
  await comidaRow.locator('input[inputmode="numeric"]').fill('50000');
  const checkBtn = comidaRow.getByRole('button', { name: '✓' });
  await expect(checkBtn).toBeVisible({ timeout: 3_000 });
  await checkBtn.click();
  await closePanel(app.page);

  await expect(app.page.locator('.fa-charts').getByText(/\/\s*\$/).first())
    .toBeVisible({ timeout: 5_000 });
});

test('eliminar presupuesto quita la barra del chart', async ({ withSeed: app }) => {
  // Asegura presupuesto limpio, luego lo crea
  await clearComidaBudget(app.page);

  const panel = await openPanel(app.page);
  const comidaRow = panel.locator('div:has(span:text-is("Comida"))').last();
  await comidaRow.locator('input[inputmode="numeric"]').fill('50000');
  const checkBtn = comidaRow.getByRole('button', { name: '✓' });
  await expect(checkBtn).toBeVisible({ timeout: 3_000 });
  await checkBtn.click();
  await closePanel(app.page);
  await expect(app.page.locator('.fa-charts').getByText(/\/\s*\$/).first()).toBeVisible();

  // Elimina el presupuesto
  const panel2 = await openPanel(app.page);
  const comidaRow2 = panel2.locator('div:has(span:text-is("Comida"))').last();
  await comidaRow2.getByRole('button', { name: '✕' }).click();
  await closePanel(app.page);

  await expect(app.page.locator('.fa-charts').getByText(/\/\s*\$/)).toHaveCount(0, { timeout: 5_000 });
});

test('borrar todo requiere confirmación y se puede cancelar', async ({ withSeed: app }) => {
  const initialCount = await app.getAccounts().count();

  const panel = await openPanel(app.page);
  await panel.getByRole('button', { name: 'Borrar todos los datos' }).click();
  await expect(panel.getByText(/¿Borrar todo?/)).toBeVisible();
  await panel.getByRole('button', { name: 'Cancelar' }).click();
  await closePanel(app.page);

  await expect(app.getAccounts()).toHaveCount(initialCount);
});

test('borrar todo elimina todos los datos', async ({ withSeed: app }) => {
  const panel = await openPanel(app.page);
  await panel.getByRole('button', { name: 'Borrar todos los datos' }).click();
  await panel.getByRole('button', { name: 'Sí, borrar' }).click();

  await expect(app.accountsSection().locator('.fa-empty')).toBeVisible({ timeout: 8_000 });
});
