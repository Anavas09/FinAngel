import { test, expect } from '../fixtures/index';

test('selector de tema abre el dropdown con las 3 opciones', async ({ withSeed: app }) => {
  await app.page.getByRole('button', { name: 'Cambiar tema' }).click();

  const dropdown = app.page.locator('.fa-theme-dropdown');
  await expect(dropdown).toBeVisible();
  await expect(dropdown.getByText('Sticker Pack')).toBeVisible();
  await expect(dropdown.getByText('Cálido')).toBeVisible();
  await expect(dropdown.getByText('Noche')).toBeVisible();
});

test('cambiar a tema Cálido inyecta warm.css', async ({ withSeed: app }) => {
  await app.page.getByRole('button', { name: 'Cambiar tema' }).click();
  await app.page.locator('.fa-theme-dropdown').getByText('Cálido').click();

  const href = await app.page.locator('link[data-fa-theme]').getAttribute('href');
  expect(href).toContain('warm.css');

  // Vuelve al tema por defecto para no afectar otros tests
  await app.page.getByRole('button', { name: 'Cambiar tema' }).click();
  await app.page.locator('.fa-theme-dropdown').getByText('Sticker Pack').click();
});

test('cambiar a tema Noche inyecta night.css', async ({ withSeed: app }) => {
  await app.page.getByRole('button', { name: 'Cambiar tema' }).click();
  await app.page.locator('.fa-theme-dropdown').getByText('Noche').click();

  const href = await app.page.locator('link[data-fa-theme]').getAttribute('href');
  expect(href).toContain('night.css');

  // Limpieza
  await app.page.getByRole('button', { name: 'Cambiar tema' }).click();
  await app.page.locator('.fa-theme-dropdown').getByText('Sticker Pack').click();
});

test('tema persiste al recargar la página', async ({ withSeed: app }) => {
  // Activa Noche
  await app.page.getByRole('button', { name: 'Cambiar tema' }).click();
  await app.page.locator('.fa-theme-dropdown').getByText('Noche').click();

  await app.page.reload();
  await app.page.locator('.fa-fab').waitFor({ timeout: 15_000 });

  const href = await app.page.locator('link[data-fa-theme]').getAttribute('href');
  expect(href).toContain('night.css');

  // Limpieza
  await app.page.getByRole('button', { name: 'Cambiar tema' }).click();
  await app.page.locator('.fa-theme-dropdown').getByText('Sticker Pack').click();
});

test('tema activo muestra checkmark en el dropdown', async ({ withSeed: app }) => {
  // Establece Cálido
  await app.page.getByRole('button', { name: 'Cambiar tema' }).click();
  await app.page.locator('.fa-theme-dropdown').getByText('Cálido').click();

  // Reabre el dropdown
  await app.page.getByRole('button', { name: 'Cambiar tema' }).click();
  const dropdown = app.page.locator('.fa-theme-dropdown');

  // La opción activa tiene ✓
  const activeOption = dropdown.locator('button', { hasText: 'Cálido' });
  await expect(activeOption.getByText('✓')).toBeVisible();

  // Las otras NO tienen ✓
  await expect(dropdown.locator('button', { hasText: 'Sticker Pack' }).getByText('✓')).toHaveCount(0);

  // Limpieza
  await dropdown.getByText('Sticker Pack').click();
});

test('toast aparece y desaparece automáticamente', async ({ withSeed: app }) => {
  // El seed ya se cargó (fixture withSeed), pero podemos cargar de nuevo para disparar el toast.
  // Usamos el botón de la UI que muestra toast sin undo (dura 2200ms).
  await app.page.getByRole('button', { name: 'Configuración' }).click();
  await app.page.getByRole('button', { name: 'Cargar datos de ejemplo' }).last().click();

  const toast = app.getToast();
  await expect(toast).toBeVisible({ timeout: 5_000 });

  // Desaparece solo (sin undo → 2200ms)
  await expect(toast).not.toBeVisible({ timeout: 5_000 });
});

test('toast de eliminación tiene botón Deshacer y funciona', async ({ withSeed: app }) => {
  const firstTx = app.getTransactionItems().first();
  const noteText = await firstTx.locator('.fa-tx-note').innerText();

  await firstTx.click();
  await app.page.locator('.fa-modal').getByRole('button', { name: 'Eliminar' }).click();

  const toast = app.getToast();
  await expect(toast).toBeVisible({ timeout: 5_000 });
  await expect(toast.getByRole('button', { name: 'Deshacer' })).toBeVisible();

  // Deshace
  await toast.getByRole('button', { name: 'Deshacer' }).click();

  // La transacción vuelve y el toast desaparece
  await expect(app.page.locator('.fa-tx-note', { hasText: noteText })).toBeVisible({ timeout: 8_000 });
  await expect(toast).not.toBeVisible({ timeout: 3_000 });
});
