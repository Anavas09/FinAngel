import { test, expect } from '../fixtures/index';
import { fillCreditCardForm, submitCreditCardForm } from '../helpers/modals';

// Todos los tests usan withClear excepto los que necesitan cuentas para pagar

// ─── Estado vacío ─────────────────────────────────────────────────────────────

test('estado vacío muestra botón agregar tarjeta', async ({ withClear: app }) => {
  const section = app.creditCardsSection();
  await expect(section.locator('.fa-empty')).toBeVisible();
  await expect(section.getByRole('button', { name: 'Agregar tarjeta' })).toBeVisible();
});

// ─── Crear tarjeta ────────────────────────────────────────────────────────────

test('agregar tarjeta mínima aparece en la lista', async ({ withClear: app }) => {
  await app.openAddCreditCard();
  await fillCreditCardForm(app.page, { name: 'Visa Santander', creditLimit: '100000' });
  await submitCreditCardForm(app.page);

  await expect(app.getCreditCards().filter({ hasText: 'Visa Santander' })).toBeVisible();
});

test('agregar tarjeta con todos los campos muestra los detalles', async ({ withClear: app }) => {
  await app.openAddCreditCard();
  await fillCreditCardForm(app.page, {
    name: 'Mastercard BBVA',
    creditLimit: '200000',
    currentBalance: '50000',
    closingDay: '10',
    dueDay: '25',
    interestRate: '120',
    note: 'Solo supermercado',
  });
  await submitCreditCardForm(app.page);

  const card = app.getCreditCards().filter({ hasText: 'Mastercard BBVA' });
  await expect(card).toBeVisible();
  await expect(card).toContainText('TNA: 120%');
  await expect(card).toContainText('Cierra día 10');
  await expect(card).toContainText('Vence día 25');
  await expect(card).toContainText('Solo supermercado');
});

test('nombre max 60 caracteres', async ({ withClear: app }) => {
  await app.openAddCreditCard();
  const input = app.page.locator('.fa-modal').getByPlaceholder('Ej: Visa Santander, Mastercard BBVA');
  await input.fill('A'.repeat(70));
  const value = await input.inputValue();
  expect(value.length).toBeLessThanOrEqual(60);
});

test('saldo actual por defecto es cero al crear', async ({ withClear: app }) => {
  await app.openAddCreditCard();
  await fillCreditCardForm(app.page, { name: 'Tarjeta nueva', creditLimit: '50000' });
  await submitCreditCardForm(app.page);

  const card = app.getCreditCards().filter({ hasText: 'Tarjeta nueva' });
  // Con saldo 0 no se muestra el botón de pago
  await expect(card.getByTitle('Registrar pago')).toHaveCount(0);
});

test('disponible muestra límite menos saldo', async ({ withClear: app }) => {
  await app.openAddCreditCard();
  await fillCreditCardForm(app.page, {
    name: 'Visa Galicia',
    creditLimit: '100000',
    currentBalance: '30000',
  });
  await submitCreditCardForm(app.page);

  const card = app.getCreditCards().filter({ hasText: 'Visa Galicia' });
  await expect(card).toContainText('Disponible:');
  await expect(card).toContainText('30% utilizado');
});

test('límite excedido muestra aviso cuando saldo supera el límite', async ({ withClear: app }) => {
  await app.openAddCreditCard();
  await fillCreditCardForm(app.page, {
    name: 'Tarjeta overlimit',
    creditLimit: '10000',
    currentBalance: '15000',
  });
  await submitCreditCardForm(app.page);

  const card = app.getCreditCards().filter({ hasText: 'Tarjeta overlimit' });
  await expect(card).toContainText('Límite excedido');
});

test('alerta de interés visible en la tarjeta cuando TNA está seteada', async ({ withClear: app }) => {
  await app.openAddCreditCard();
  await fillCreditCardForm(app.page, {
    name: 'Visa TNA',
    creditLimit: '100000',
    currentBalance: '50000',
    interestRate: '120',
  });
  await submitCreditCardForm(app.page);

  const card = app.getCreditCards().filter({ hasText: 'Visa TNA' });
  await expect(card).toContainText('Mínimo:');
  await expect(card).toContainText('de interés');
});

// ─── Editar tarjeta ───────────────────────────────────────────────────────────

test('editar tarjeta pre-rellena el modal', async ({ withClear: app }) => {
  await app.openAddCreditCard();
  await fillCreditCardForm(app.page, {
    name: 'Tarjeta editar',
    creditLimit: '80000',
    note: 'Nota original',
  });
  await submitCreditCardForm(app.page);

  await app.getCreditCards().filter({ hasText: 'Tarjeta editar' }).getByTitle('Editar').click();

  const modal = app.page.locator('.fa-modal');
  await expect(modal.getByRole('heading', { name: 'Editar tarjeta' })).toBeVisible();
  await expect(modal.getByPlaceholder('Ej: Visa Santander, Mastercard BBVA')).toHaveValue('Tarjeta editar');
  await expect(modal.getByPlaceholder('Ej: uso solo para supermercado')).toHaveValue('Nota original');
});

test('editar y guardar actualiza la tarjeta en la lista', async ({ withClear: app }) => {
  await app.openAddCreditCard();
  await fillCreditCardForm(app.page, { name: 'Nombre viejo CC', creditLimit: '50000' });
  await submitCreditCardForm(app.page);

  await app.getCreditCards().filter({ hasText: 'Nombre viejo CC' }).getByTitle('Editar').click();

  const nameInput = app.page.locator('.fa-modal').getByPlaceholder('Ej: Visa Santander, Mastercard BBVA');
  await nameInput.clear();
  await nameInput.fill('Nombre nuevo CC');
  await submitCreditCardForm(app.page, true);

  await expect(app.getCreditCards().filter({ hasText: 'Nombre nuevo CC' })).toBeVisible();
  await expect(app.page.locator('.fa-credit-card', { hasText: 'Nombre viejo CC' })).toHaveCount(0);
});

// ─── Cerrar / reabrir tarjeta ─────────────────────────────────────────────────

test('cerrar tarjeta muestra badge Cerrada', async ({ withClear: app }) => {
  await app.openAddCreditCard();
  await fillCreditCardForm(app.page, { name: 'Tarjeta cerrar', creditLimit: '40000' });
  await submitCreditCardForm(app.page);

  const card = app.getCreditCards().filter({ hasText: 'Tarjeta cerrar' });
  await card.getByTitle('Cerrar tarjeta').click();

  await expect(card.getByText('Cerrada')).toBeVisible({ timeout: 5_000 });
  await expect(card.getByTitle('Cerrar tarjeta')).toHaveCount(0);
  await expect(card.getByTitle('Reactivar tarjeta')).toBeVisible();
});

test('reabrir tarjeta muestra badge Activa', async ({ withClear: app }) => {
  await app.openAddCreditCard();
  await fillCreditCardForm(app.page, { name: 'Tarjeta reabrir', creditLimit: '40000' });
  await submitCreditCardForm(app.page);

  const card = app.getCreditCards().filter({ hasText: 'Tarjeta reabrir' });
  await card.getByTitle('Cerrar tarjeta').click();
  await expect(card.getByText('Cerrada')).toBeVisible({ timeout: 5_000 });

  await card.getByTitle('Reactivar tarjeta').click();
  await expect(card.getByText('Activa')).toBeVisible({ timeout: 5_000 });
  await expect(card.getByTitle('Cerrar tarjeta')).toBeVisible();
});

// ─── Eliminar tarjeta ─────────────────────────────────────────────────────────

test('eliminar tarjeta muestra toast con deshacer', async ({ withClear: app }) => {
  await app.openAddCreditCard();
  await fillCreditCardForm(app.page, { name: 'Tarjeta borrar', creditLimit: '20000' });
  await submitCreditCardForm(app.page);

  await app.getCreditCards().filter({ hasText: 'Tarjeta borrar' }).getByTitle('Eliminar').click();

  const toast = app.getToast();
  await expect(toast).toBeVisible({ timeout: 5_000 });
  await expect(toast).toContainText('Tarjeta eliminada');
  await expect(toast.getByRole('button', { name: 'Deshacer' })).toBeVisible();
});

test('deshacer eliminación restaura la tarjeta', async ({ withClear: app }) => {
  await app.openAddCreditCard();
  await fillCreditCardForm(app.page, { name: 'Tarjeta undo', creditLimit: '30000' });
  await submitCreditCardForm(app.page);

  await app.getCreditCards().filter({ hasText: 'Tarjeta undo' }).getByTitle('Eliminar').click();
  await app.getToast().getByRole('button', { name: 'Deshacer' }).click();

  await expect(app.getCreditCards().filter({ hasText: 'Tarjeta undo' })).toBeVisible({ timeout: 8_000 });
});

// ─── Modal de pago ────────────────────────────────────────────────────────────

test('modal de pago muestra fallback cuando no hay cuentas en la moneda', async ({ withClear: app }) => {
  await app.openAddCreditCard();
  await fillCreditCardForm(app.page, {
    name: 'Visa USD',
    currency: 'USD US$',
    creditLimit: '5000',
    currentBalance: '1000',
  });
  await submitCreditCardForm(app.page);

  await app.getCreditCards().filter({ hasText: 'Visa USD' }).getByTitle('Registrar pago').click();

  await expect(app.page.locator('.fa-modal').getByText(/No tenés cuentas en USD/)).toBeVisible();
});

test('modal de pago pre-rellena monto con saldo total', async ({ withSeed: app }) => {
  await app.openAddCreditCard();
  await fillCreditCardForm(app.page, {
    name: 'Visa pago',
    creditLimit: '100000',
    currentBalance: '45000',
  });
  await submitCreditCardForm(app.page);

  await app.getCreditCards().filter({ hasText: 'Visa pago' }).getByTitle('Registrar pago').click();

  const modal = app.page.locator('.fa-modal');
  await expect(modal).toBeVisible();
  await expect(modal.locator('.fa-amount-input input')).toHaveValue('45000');
});

test('registrar pago muestra toast confirmación', async ({ withSeed: app }) => {
  await app.openAddCreditCard();
  await fillCreditCardForm(app.page, {
    name: 'Visa confirmar',
    creditLimit: '100000',
    currentBalance: '20000',
  });
  await submitCreditCardForm(app.page);

  await app.getCreditCards().filter({ hasText: 'Visa confirmar' }).getByTitle('Registrar pago').click();

  const modal = app.page.locator('.fa-modal');
  const amountInput = modal.locator('.fa-amount-input input');
  await amountInput.clear();
  await amountInput.fill('5000');

  await modal.getByRole('button', { name: 'Registrar pago' }).click();

  await expect(app.getToast()).toContainText('Pago registrado', { timeout: 5_000 });
});

test('calculadora de intereses visible en modal de pago con TNA', async ({ withSeed: app }) => {
  await app.openAddCreditCard();
  await fillCreditCardForm(app.page, {
    name: 'Visa interés',
    creditLimit: '100000',
    currentBalance: '60000',
    interestRate: '120',
  });
  await submitCreditCardForm(app.page);

  await app.getCreditCards().filter({ hasText: 'Visa interés' }).getByTitle('Registrar pago').click();

  const modal = app.page.locator('.fa-modal');
  await expect(modal).toContainText('Calculadora de intereses');
  await expect(modal).toContainText('Pago mínimo estimado');
});

// ─── Totales ──────────────────────────────────────────────────────────────────

test('total saldo tarjetas ARS se muestra con tarjetas activas', async ({ withClear: app }) => {
  await app.openAddCreditCard();
  await fillCreditCardForm(app.page, {
    name: 'Visa total',
    creditLimit: '100000',
    currentBalance: '25000',
  });
  await submitCreditCardForm(app.page);

  await expect(app.creditCardsSection().getByText('Total saldo tarjetas en ARS')).toBeVisible();
});

test('abrir modal desde botón del estado vacío', async ({ withClear: app }) => {
  await app.creditCardsSection().getByRole('button', { name: 'Agregar tarjeta' }).click();

  const modal = app.page.locator('.fa-modal');
  await expect(modal).toBeVisible();
  await expect(modal.getByRole('heading', { name: 'Nueva tarjeta de crédito' })).toBeVisible();
});
