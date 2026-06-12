import { test, expect } from '../fixtures/index';
import { fillTransactionForm, submitTransactionForm } from '../helpers/modals';

// Todos los tests usan datos semilla para tener cuentas disponibles
// withSeed = clearAllData + loadSeedData → estado predecible

test('agregar gasto aparece en la lista', async ({ withSeed: app }) => {
  await app.openAddTransaction();
  await fillTransactionForm(app.page, {
    kind: 'Gasto',
    amount: '500',
    categoryLabel: 'Comida',
    note: 'Test almuerzo',
  });
  await submitTransactionForm(app.page);

  await expect(app.page.locator('.fa-tx-note', { hasText: 'Test almuerzo' })).toBeVisible();
});

test('agregar ingreso aparece en la lista', async ({ withSeed: app }) => {
  await app.openAddTransaction();
  await fillTransactionForm(app.page, {
    kind: 'Ingreso',
    amount: '10000',
    note: 'Sueldo test',
  });
  await submitTransactionForm(app.page);

  await expect(app.page.locator('.fa-tx-note', { hasText: 'Sueldo test' })).toBeVisible();
  // Los ingresos tienen data-positive=true
  await expect(
    app.page.locator('.fa-tx', { hasText: 'Sueldo test' }).locator('.fa-tx-amount[data-positive="true"]')
  ).toBeVisible();
});

test('monto cero muestra error de validación', async ({ withSeed: app }) => {
  await app.openAddTransaction();
  await fillTransactionForm(app.page, { amount: '0' });
  await submitTransactionForm(app.page);

  await expect(app.page.locator('.fa-modal').getByText(/monto válido/i)).toBeVisible();
  // Modal sigue abierto
  await expect(app.page.locator('.fa-modal')).toBeVisible();
});

test('monto con texto muestra error de validación', async ({ withSeed: app }) => {
  await app.openAddTransaction();
  // Escribe texto en el campo de monto
  await app.page.locator('.fa-modal .fa-amount-input input').fill('abc');
  await submitTransactionForm(app.page);

  await expect(app.page.locator('.fa-modal').getByText(/monto válido/i)).toBeVisible();
});

test('acepta coma como separador decimal', async ({ withSeed: app }) => {
  await app.openAddTransaction();
  await fillTransactionForm(app.page, {
    amount: '1500,50',
    note: 'Coma decimal test',
  });
  await submitTransactionForm(app.page);

  // Se guardó — aparece en lista (sin error de validación)
  await expect(app.page.locator('.fa-tx-note', { hasText: 'Coma decimal test' })).toBeVisible();
});

test('nota max 200 caracteres', async ({ withSeed: app }) => {
  await app.openAddTransaction();
  const noteInput = app.page.locator('.fa-modal').getByPlaceholder('ej. Café con Lu');
  await noteInput.fill('A'.repeat(210));
  const value = await noteInput.inputValue();
  expect(value.length).toBeLessThanOrEqual(200);
});

test('editar transacción pre-rellena el modal', async ({ withSeed: app }) => {
  const firstTx = app.getTransactionItems().first();
  const noteBefore = await firstTx.locator('.fa-tx-note').innerText();

  await firstTx.click();

  const modal = app.page.locator('.fa-modal');
  await expect(modal).toBeVisible();
  // El título es "Editar movimiento"
  await expect(modal.getByRole('heading', { name: 'Editar movimiento' })).toBeVisible();
  // El botón de eliminar está presente
  await expect(modal.getByRole('button', { name: 'Eliminar' })).toBeVisible();
  // La nota pre-rellena coincide
  const noteInput = modal.getByPlaceholder('ej. Café con Lu');
  await expect(noteInput).toHaveValue(noteBefore);
});

test('editar y guardar actualiza la nota en la lista', async ({ withSeed: app }) => {
  const firstTx = app.getTransactionItems().first();
  await firstTx.click();

  const modal = app.page.locator('.fa-modal');
  const noteInput = modal.getByPlaceholder('ej. Café con Lu');
  await noteInput.clear();
  await noteInput.fill('Nota editada e2e');

  await submitTransactionForm(app.page, true);

  await expect(app.page.locator('.fa-tx-note', { hasText: 'Nota editada e2e' })).toBeVisible();
});

test('eliminar transacción muestra toast con deshacer', async ({ withSeed: app }) => {
  const firstTx = app.getTransactionItems().first();
  await firstTx.click();

  await app.page.locator('.fa-modal').getByRole('button', { name: 'Eliminar' }).click();

  const toast = app.getToast();
  await expect(toast).toBeVisible({ timeout: 5_000 });
  await expect(toast).toContainText('Movimiento eliminado');
  await expect(toast.getByRole('button', { name: 'Deshacer' })).toBeVisible();
});

test('deshacer eliminación restaura la transacción', async ({ withSeed: app }) => {
  const firstTx = app.getTransactionItems().first();
  const noteText = await firstTx.locator('.fa-tx-note').innerText();
  const initialCount = await app.getTransactionItems().count();

  await firstTx.click();
  await app.page.locator('.fa-modal').getByRole('button', { name: 'Eliminar' }).click();

  // Deshacer
  await app.getToast().getByRole('button', { name: 'Deshacer' }).click();

  // La transacción vuelve
  await expect(app.page.locator('.fa-tx-note', { hasText: noteText })).toBeVisible({ timeout: 8_000 });
  await expect(app.getTransactionItems()).toHaveCount(initialCount, { timeout: 8_000 });
});

test('transacción recurrente mensual se guarda', async ({ withSeed: app }) => {
  await app.openAddTransaction();
  await fillTransactionForm(app.page, {
    amount: '2000',
    note: 'Alquiler recurrente',
    recurring: 'monthly',
  });
  await submitTransactionForm(app.page);

  // Aparece en lista
  await expect(app.page.locator('.fa-tx-note', { hasText: 'Alquiler recurrente' })).toBeVisible();
});

test('saldo insuficiente en gasto muestra error en el input de monto', async ({ withSeed: app }) => {
  // Mercado Pago tiene saldo 86450 ARS en seed
  await app.openAddTransaction();
  const modal = app.page.locator('.fa-modal');

  await modal.locator('.fa-account-chip', { hasText: 'Mercado Pago' }).click();
  await modal.locator('.fa-amount-input input').fill('999999');
  await modal.getByRole('button', { name: 'Agregar' }).click();

  // El error aparece dentro del campo de monto (no debajo de los chips de cuenta)
  await expect(modal.locator('.fa-field-amount').getByText(/Saldo insuficiente/i)).toBeVisible();
  await expect(modal).toBeVisible();
});

test('balance de cuenta cambia al agregar gasto', async ({ withSeed: app }) => {
  // Lee balance de la primera cuenta
  const firstCard = app.getAccounts().first();
  const balanceBefore = await firstCard.locator('.fa-account-balance').innerText();
  const accountName = await firstCard.locator('.fa-account-name').innerText();

  // Agrega gasto en esa cuenta
  await app.openAddTransaction();
  await fillTransactionForm(app.page, {
    kind: 'Gasto',
    amount: '100',
    accountName,
    note: 'Test balance',
  });
  await submitTransactionForm(app.page);

  // El balance cambió
  const balanceAfter = await firstCard.locator('.fa-account-balance').innerText();
  expect(balanceAfter).not.toBe(balanceBefore);
});
