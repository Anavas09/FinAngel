import { test, expect } from '../fixtures/index';

const chartsSection = (page: import('@playwright/test').Page) =>
  page.locator('.fa-charts');

test('sección charts muestra dos cards', async ({ withSeed: app }) => {
  const cards = chartsSection(app.page).locator('.fa-chart-card');
  await expect(cards).toHaveCount(2);
});

test('chart de gastos tiene título correcto', async ({ withSeed: app }) => {
  const expenseCard = chartsSection(app.page).locator('.fa-chart-card').first();
  await expect(expenseCard.getByRole('heading')).toContainText('¿En qué se va la plata?');
});

test('chart de flujo tiene título correcto', async ({ withSeed: app }) => {
  const flowCard = chartsSection(app.page).locator('.fa-chart-card').last();
  await expect(flowCard.getByRole('heading')).toContainText('Ingresos vs Egresos');
});

test('leyenda de gastos muestra categorías con porcentaje', async ({ withSeed: app }) => {
  const legend = chartsSection(app.page).locator('.fa-chart-card').first().locator('.fa-legend');
  const items = legend.locator('.fa-legend-item');

  // El seed tiene transacciones → al menos un ítem en la leyenda
  await expect(items.first()).toBeVisible({ timeout: 5_000 });
  const count = await items.count();
  expect(count).toBeGreaterThan(0);

  // Cada ítem tiene porcentaje y valor
  const firstPct = await items.first().locator('.fa-legend-pct').innerText();
  expect(firstPct).toMatch(/\d+%/);

  const firstVal = await items.first().locator('.fa-legend-value').innerText();
  expect(firstVal.length).toBeGreaterThan(0);
});

test('leyenda de flujo muestra Ingresos y Egresos', async ({ withSeed: app }) => {
  const flowLegend = chartsSection(app.page).locator('.fa-chart-card').last().locator('.fa-legend');

  await expect(flowLegend.getByText('Ingresos')).toBeVisible({ timeout: 5_000 });
  await expect(flowLegend.getByText('Egresos')).toBeVisible();
});

test('hover en ítem de leyenda activa data-hover', async ({ withSeed: app }) => {
  const firstItem = chartsSection(app.page)
    .locator('.fa-chart-card').first()
    .locator('.fa-legend-item').first();

  await expect(firstItem).toBeVisible({ timeout: 5_000 });
  await firstItem.hover();

  await expect(firstItem).toHaveAttribute('data-hover', 'true');
});

test('donut SVG tiene arcos renderizados', async ({ withSeed: app }) => {
  const donutSvg = chartsSection(app.page)
    .locator('.fa-chart-card').first()
    .locator('svg');

  await expect(donutSvg).toBeVisible({ timeout: 5_000 });

  // Verifica que hay paths dentro del SVG (los arcos del donut)
  const paths = donutSvg.locator('path');
  const pathCount = await paths.count();
  expect(pathCount).toBeGreaterThan(0);
});

test('privacy oculta valores en la leyenda', async ({ withSeed: app }) => {
  // Activa privacidad
  await app.page.getByRole('button', { name: 'Configuración' }).click();
  const panel = app.page.locator('[style*="z-index: 100"][style*="bottom: 90px"]');
  await panel.locator('div:has(span:text-is("Privacidad"))').getByRole('switch').click();
  await app.page.mouse.click(800, 100); // cierra panel

  const firstVal = await chartsSection(app.page)
    .locator('.fa-chart-card').first()
    .locator('.fa-legend-item').first()
    .locator('.fa-legend-value').innerText();

  expect(firstVal).toContain('••••••');

  // Limpieza: desactiva privacidad
  await app.page.getByRole('button', { name: 'Configuración' }).click();
  const panel2 = app.page.locator('[style*="z-index: 100"][style*="bottom: 90px"]');
  await panel2.locator('div:has(span:text-is("Privacidad"))').getByRole('switch').click();
  await app.page.mouse.click(800, 100);
});
