import { test, expect } from '../fixtures/index';
import { fillDebtForm, submitDebtForm } from '../helpers/modals';

// Tests para:
//  - QuickPayDebtModal (pago rápido desde DebtCard)
//  - Nueva categoría "Monotributo" y renombrado "Luz / Agua / Gas"
//  - Verificación de que eliminar transacción restaura el balance

// ─── QuickPayDebtModal ────────────────────────────────────────────────────────

test('quick pay abre modal de pago rápido con encabezado correcto', async ({ withSeed: app }) => {
  await app.openAddDebt();
  await fillDebtForm(app.page, { name: 'Deuda QP', totalAmount: '5000' });
  await submitDebtForm(app.page);

  await app.getDebts().filter({ hasText: 'Deuda QP' }).getByTitle('Registrar pago').click();

  const modal = app.page.locator('.fa-modal');
  await expect(modal).toBeVisible();
  await expect(modal.getByRole('heading', { name: /Pago — Deuda QP/ })).toBeVisible();
});

test('quick pay sin cuentas en esa moneda muestra mensaje de fallback', async ({ withClear: app }) => {
  // withClear no tiene cuentas → ARS debt no puede pagarse
  await app.openAddDebt();
  await fillDebtForm(app.page, { name: 'Deuda sin cuenta', totalAmount: '3000' });
  await submitDebtForm(app.page);

  await app.getDebts().filter({ hasText: 'Deuda sin cuenta' }).getByTitle('Registrar pago').click();

  const modal = app.page.locator('.fa-modal');
  await expect(modal.getByText(/No tenés cuentas en ARS/)).toBeVisible();
});

test('quick pay pre-rellena monto con cuota mensual', async ({ withSeed: app }) => {
  await app.openAddDebt();
  await fillDebtForm(app.page, {
    name: 'Deuda cuota',
    totalAmount: '20000',
    remainingAmount: '15000',
    monthlyPayment: '2500',
  });
  await submitDebtForm(app.page);

  await app.getDebts().filter({ hasText: 'Deuda cuota' }).getByTitle('Registrar pago').click();

  const modal = app.page.locator('.fa-modal');
  await expect(modal.locator('.fa-amount-input input')).toHaveValue('2500');
});

test('quick pay pre-rellena monto con saldo pendiente cuando no hay cuota', async ({ withSeed: app }) => {
  await app.openAddDebt();
  await fillDebtForm(app.page, { name: 'Deuda saldo', totalAmount: '8000' });
  await submitDebtForm(app.page);

  await app.getDebts().filter({ hasText: 'Deuda saldo' }).getByTitle('Registrar pago').click();

  const modal = app.page.locator('.fa-modal');
  await expect(modal.locator('.fa-amount-input input')).toHaveValue('8000');
});

test('quick pay monto inválido muestra error y no cierra el modal', async ({ withSeed: app }) => {
  await app.openAddDebt();
  await fillDebtForm(app.page, { name: 'Deuda error val', totalAmount: '5000' });
  await submitDebtForm(app.page);

  await app.getDebts().filter({ hasText: 'Deuda error val' }).getByTitle('Registrar pago').click();

  const modal = app.page.locator('.fa-modal');
  await modal.locator('.fa-amount-input input').fill('0');
  await modal.getByRole('button', { name: 'Registrar pago' }).click();

  await expect(modal.getByText(/Monto inválido/)).toBeVisible();
  await expect(modal).toBeVisible();
});

test('quick pay registra pago, cierra el modal y muestra toast', async ({ withSeed: app }) => {
  await app.openAddDebt();
  await fillDebtForm(app.page, {
    name: 'Deuda registrar',
    totalAmount: '10000',
    monthlyPayment: '1000',
  });
  await submitDebtForm(app.page);

  await app.getDebts().filter({ hasText: 'Deuda registrar' }).getByTitle('Registrar pago').click();

  const modal = app.page.locator('.fa-modal');
  await modal.getByRole('button', { name: 'Registrar pago' }).click();

  await expect(modal).not.toBeVisible({ timeout: 5_000 });
  await expect(app.getToast()).toContainText('Pago registrado', { timeout: 5_000 });
});

test('quick pay pago completo marca la deuda como pagada', async ({ withSeed: app }) => {
  await app.openAddDebt();
  await fillDebtForm(app.page, { name: 'Deuda liquidar', totalAmount: '3000' });
  await submitDebtForm(app.page);

  const debtCard = app.getDebts().filter({ hasText: 'Deuda liquidar' });
  await debtCard.getByTitle('Registrar pago').click();

  // El monto pre-relleno es 3000 (= remainingAmount); pago completo
  const modal = app.page.locator('.fa-modal');
  await modal.getByRole('button', { name: 'Registrar pago' }).click();

  await expect(debtCard.getByText('Pagada')).toBeVisible({ timeout: 5_000 });
});

test('quick pay descuenta el balance de la cuenta seleccionada', async ({ withSeed: app }) => {
  const firstAccount = app.getAccounts().first();
  const balanceBefore = await firstAccount.locator('.fa-account-balance').innerText();

  await app.openAddDebt();
  await fillDebtForm(app.page, {
    name: 'Deuda balance',
    totalAmount: '5000',
    monthlyPayment: '1000',
  });
  await submitDebtForm(app.page);

  await app.getDebts().filter({ hasText: 'Deuda balance' }).getByTitle('Registrar pago').click();

  const modal = app.page.locator('.fa-modal');
  await modal.getByRole('button', { name: 'Registrar pago' }).click();
  await expect(modal).not.toBeVisible({ timeout: 5_000 });

  const balanceAfter = await firstAccount.locator('.fa-account-balance').innerText();
  expect(balanceAfter).not.toBe(balanceBefore);
});

// ─── Categorías ──────────────────────────────────────────────────────────────

test('categoría Luz / Agua / Gas aparece en el grid de gastos', async ({ withSeed: app }) => {
  await app.openAddTransaction();
  const modal = app.page.locator('.fa-modal');
  await expect(modal.locator('.fa-cat-chip', { hasText: 'Luz / Agua / Gas' })).toBeVisible();
});

test('categoría Monotributo aparece en el grid de gastos', async ({ withSeed: app }) => {
  await app.openAddTransaction();
  const modal = app.page.locator('.fa-modal');
  await expect(modal.locator('.fa-cat-chip', { hasText: 'Monotributo' })).toBeVisible();
});

test('puede seleccionar Monotributo y registrar un gasto', async ({ withSeed: app }) => {
  await app.openAddTransaction();
  const modal = app.page.locator('.fa-modal');

  await modal.locator('.fa-cat-chip', { hasText: 'Monotributo' }).click();
  await modal.locator('.fa-amount-input input').fill('5000');
  await modal.getByPlaceholder('ej. Café con Lu').fill('Cuota monotributo');
  await modal.getByRole('button', { name: 'Agregar' }).click();

  await expect(app.page.locator('.fa-tx-note', { hasText: 'Cuota monotributo' })).toBeVisible();
});

// ─── Eliminar pago de deuda restaura el remainingAmount ──────────────────────

test('eliminar pago de deuda restaura el remainingAmount de la deuda', async ({ withSeed: app }) => {
  // Crear deuda de 5000 (remainingAmount = totalAmount por defecto)
  await app.openAddDebt();
  await fillDebtForm(app.page, { name: 'Deuda restore test', totalAmount: '5000' });
  await submitDebtForm(app.page);

  const debtCard = app.getDebts().filter({ hasText: 'Deuda restore test' });
  await expect(debtCard.getByText('0% pagado')).toBeVisible();

  // Registrar pago parcial de 1000 via QuickPayDebtModal
  await debtCard.getByTitle('Registrar pago').click();
  const modal = app.page.locator('.fa-modal');
  await modal.locator('.fa-amount-input input').fill('1000');
  await modal.getByRole('button', { name: 'Registrar pago' }).click();
  await expect(modal).not.toBeVisible({ timeout: 5_000 });

  // Confirmar que el monto pendiente bajó (1000 de 5000 = 20% pagado)
  await expect(debtCard.getByText('20% pagado')).toBeVisible();

  // Abrir la transacción del pago y eliminarla
  await app.getTransactionItems().filter({ hasText: 'Pago de Deuda restore test' }).first().click();
  await app.page.locator('.fa-modal').getByRole('button', { name: 'Eliminar' }).click();

  // El remainingAmount debe volver a 5000 (0% pagado)
  await expect(debtCard.getByText('0% pagado')).toBeVisible({ timeout: 5_000 });
});

// ─── Eliminar transacción restaura el balance ─────────────────────────────────

test('eliminar transacción restaura el balance de la cuenta', async ({ withSeed: app }) => {
  const firstCard = app.getAccounts().first();
  const accountName = await firstCard.locator('.fa-account-name').innerText();
  const balanceBefore = await firstCard.locator('.fa-account-balance').innerText();

  // Agrega un gasto en esa cuenta
  await app.openAddTransaction();
  const modal = app.page.locator('.fa-modal');
  await modal.locator('.fa-account-chip', { hasText: accountName }).click();
  await modal.locator('.fa-amount-input input').fill('1000');
  await modal.getByRole('button', { name: 'Agregar' }).click();

  const balanceAfterAdd = await firstCard.locator('.fa-account-balance').innerText();
  expect(balanceAfterAdd).not.toBe(balanceBefore);

  // Abre y elimina la transacción recién creada (aparece primera en la lista)
  await app.getTransactionItems().first().click();
  await app.page.locator('.fa-modal').getByRole('button', { name: 'Eliminar' }).click();

  // El balance vuelve al valor original
  const balanceAfterDelete = await firstCard.locator('.fa-account-balance').innerText();
  expect(balanceAfterDelete).toBe(balanceBefore);
});
