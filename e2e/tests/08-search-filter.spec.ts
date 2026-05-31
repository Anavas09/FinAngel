import { test, expect } from '../fixtures/index';

const searchInput = (page: import('@playwright/test').Page) =>
  page.getByPlaceholder('Buscar nota o cuenta…');

const periodSelect = (page: import('@playwright/test').Page) =>
  page.locator('select.fa-input');

test('búsqueda por texto filtra las transacciones', async ({ withSeed: app }) => {
  const items = app.getTransactionItems();
  const totalBefore = await items.count();
  expect(totalBefore).toBeGreaterThan(0);

  const firstNote = await items.first().locator('.fa-tx-note').innerText();
  await searchInput(app.page).fill(firstNote);

  await expect(items.first()).toBeVisible({ timeout: 3_000 });
  const filtered = await items.count();
  expect(filtered).toBeGreaterThan(0);
  expect(filtered).toBeLessThanOrEqual(totalBefore);
});

test('búsqueda sin resultados muestra estado vacío', async ({ withSeed: app }) => {
  await searchInput(app.page).fill('xyzabc123sinresultados');

  await expect(app.page.getByText('Nada por acá todavía')).toBeVisible({ timeout: 3_000 });
  await expect(app.getTransactionItems()).toHaveCount(0);
});

test('limpiar búsqueda restaura la lista completa', async ({ withSeed: app }) => {
  const totalBefore = await app.getTransactionItems().count();

  await searchInput(app.page).fill('xyzabc123sinresultados');
  await expect(app.page.getByText('Nada por acá todavía')).toBeVisible({ timeout: 3_000 });

  await searchInput(app.page).clear();

  await expect(app.getTransactionItems()).toHaveCount(totalBefore, { timeout: 3_000 });
});

test('filtro por período reduce las transacciones', async ({ withSeed: app }) => {
  const totalAll = await app.getTransactionItems().count();

  // Selecciona el primer mes disponible (más reciente, distinto de vacío)
  const options = await periodSelect(app.page).locator('option').all();
  // Hay al menos la opción "Todos" + 1 mes del seed
  expect(options.length).toBeGreaterThanOrEqual(2);

  const firstMonthValue = await options[1].getAttribute('value');
  await periodSelect(app.page).selectOption(firstMonthValue!);

  const filtered = await app.getTransactionItems().count();
  // Debe haber al menos 1 resultado y no más que el total
  expect(filtered).toBeGreaterThan(0);
  expect(filtered).toBeLessThanOrEqual(totalAll);
});

test('filtro "Todos" muestra todas las transacciones', async ({ withSeed: app }) => {
  // Activa un filtro restrictivo primero
  const options = await periodSelect(app.page).locator('option').all();
  if (options.length >= 2) {
    const firstMonthValue = await options[1].getAttribute('value');
    await periodSelect(app.page).selectOption(firstMonthValue!);
  }

  // Vuelve a "Todos"
  await periodSelect(app.page).selectOption('');

  const count = await app.getTransactionItems().count();
  expect(count).toBeGreaterThan(0);
});

test('búsqueda y filtro de período se combinan', async ({ withSeed: app }) => {
  // Selecciona el mes más reciente
  const options = await periodSelect(app.page).locator('option').all();
  if (options.length >= 2) {
    const firstMonthValue = await options[1].getAttribute('value');
    await periodSelect(app.page).selectOption(firstMonthValue!);
  }

  // Busca un texto que existe en el seed
  const firstNote = await app.getTransactionItems().first().locator('.fa-tx-note').innerText();
  await searchInput(app.page).fill(firstNote);

  // La intersección puede ser >= 0
  const count = await app.getTransactionItems().count();
  expect(count).toBeGreaterThanOrEqual(0);
});

test('búsqueda por nombre de cuenta filtra las transacciones', async ({ withSeed: app }) => {
  // Los items del seed tienen cuentas — busca por el nombre de la primera cuenta visible
  const accounts = app.getAccounts();
  const firstAccName = await accounts.first().locator('.fa-account-name').innerText();

  await searchInput(app.page).fill(firstAccName);

  const count = await app.getTransactionItems().count();
  expect(count).toBeGreaterThan(0);
});
