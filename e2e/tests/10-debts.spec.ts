import { test, expect } from '../fixtures/index';
import { fillDebtForm, submitDebtForm } from '../helpers/modals';

// Todos los tests usan withClear: las deudas no forman parte de los datos semilla

// --- Estado vacío ---

test('estado vacío muestra botón registrar deuda', async ({ withClear: app }) => {
  const section = app.debtsSection();
  await expect(section.locator('.fa-empty')).toBeVisible();
  await expect(section.getByRole('button', { name: 'Registrar deuda' })).toBeVisible();
});

// --- Crear deuda ---

test('agregar deuda mínima aparece en la lista', async ({ withClear: app }) => {
  await app.openAddDebt();
  await fillDebtForm(app.page, { name: 'Préstamo test', totalAmount: '50000' });
  await submitDebtForm(app.page);

  await expect(app.getDebts().filter({ hasText: 'Préstamo test' })).toBeVisible();
});

test('agregar deuda con todos los campos muestra los detalles', async ({ withClear: app }) => {
  await app.openAddDebt();
  await fillDebtForm(app.page, {
    name: 'Tarjeta Visa',
    currency: 'USD US$',
    totalAmount: '2000',
    remainingAmount: '1500',
    monthlyPayment: '200',
    dueDate: '2026-12-31',
    interestRate: '45',
    note: 'Cuota 3 de 12',
  });
  await submitDebtForm(app.page);

  const debtCard = app.getDebts().filter({ hasText: 'Tarjeta Visa' });
  await expect(debtCard).toBeVisible();
  await expect(debtCard).toContainText('25% pagado');
  await expect(debtCard).toContainText('TNA: 45%');
  await expect(debtCard).toContainText('Cuota 3 de 12');
});

test('nombre de deuda max 60 caracteres', async ({ withClear: app }) => {
  await app.openAddDebt();
  const input = app.page.locator('.fa-modal').getByPlaceholder('Ej: Tarjeta Visa, Préstamo banco');
  await input.fill('A'.repeat(70));
  const value = await input.inputValue();
  expect(value.length).toBeLessThanOrEqual(60);
});

test('monto pendiente por defecto igual al total cuando se omite', async ({ withClear: app }) => {
  await app.openAddDebt();
  await fillDebtForm(app.page, { name: 'Deuda sin pendiente', totalAmount: '10000' });
  await submitDebtForm(app.page);

  // Si total = pendiente, la leyenda "de X" no se muestra → 0% pagado
  const debtCard = app.getDebts().filter({ hasText: 'Deuda sin pendiente' });
  await expect(debtCard).toContainText('0% pagado');
});

// --- Editar deuda ---

test('editar deuda pre-rellena el modal', async ({ withClear: app }) => {
  await app.openAddDebt();
  await fillDebtForm(app.page, {
    name: 'Deuda editar',
    totalAmount: '8000',
    note: 'Nota original',
  });
  await submitDebtForm(app.page);

  // Abre edición
  const debtCard = app.getDebts().filter({ hasText: 'Deuda editar' });
  await debtCard.getByTitle('Editar').click();

  const modal = app.page.locator('.fa-modal');
  await expect(modal.getByRole('heading', { name: 'Editar deuda' })).toBeVisible();
  await expect(modal.getByPlaceholder('Ej: Tarjeta Visa, Préstamo banco')).toHaveValue('Deuda editar');
  await expect(modal.getByPlaceholder('Ej: Cuota 3 de 12')).toHaveValue('Nota original');
});

test('editar y guardar actualiza la deuda en la lista', async ({ withClear: app }) => {
  await app.openAddDebt();
  await fillDebtForm(app.page, { name: 'Nombre viejo', totalAmount: '5000' });
  await submitDebtForm(app.page);

  const debtCard = app.getDebts().filter({ hasText: 'Nombre viejo' });
  await debtCard.getByTitle('Editar').click();

  const nameInput = app.page.locator('.fa-modal').getByPlaceholder('Ej: Tarjeta Visa, Préstamo banco');
  await nameInput.clear();
  await nameInput.fill('Nombre nuevo');
  await submitDebtForm(app.page, true);

  await expect(app.getDebts().filter({ hasText: 'Nombre nuevo' })).toBeVisible();
  await expect(app.page.locator('.fa-debt', { hasText: 'Nombre viejo' })).toHaveCount(0);
});

// --- Marcar como pagada ---

test('marcar deuda como pagada muestra badge Pagada', async ({ withClear: app }) => {
  await app.openAddDebt();
  await fillDebtForm(app.page, { name: 'Deuda a pagar', totalAmount: '3000' });
  await submitDebtForm(app.page);

  const debtCard = app.getDebts().filter({ hasText: 'Deuda a pagar' });
  await debtCard.getByTitle('Marcar como pagada').click();

  await expect(debtCard.getByText('Pagada')).toBeVisible({ timeout: 5_000 });
  // El botón de marcar pagada desaparece
  await expect(debtCard.getByTitle('Marcar como pagada')).toHaveCount(0);
});

test('deuda pagada aparece con 100% pagado', async ({ withClear: app }) => {
  await app.openAddDebt();
  await fillDebtForm(app.page, { name: 'Deuda completa', totalAmount: '1000' });
  await submitDebtForm(app.page);

  await app.getDebts().filter({ hasText: 'Deuda completa' }).getByTitle('Marcar como pagada').click();

  await expect(app.getDebts().filter({ hasText: 'Deuda completa' })).toContainText('100% pagado', { timeout: 5_000 });
});

// --- Eliminar deuda ---

test('eliminar deuda muestra toast con deshacer', async ({ withClear: app }) => {
  await app.openAddDebt();
  await fillDebtForm(app.page, { name: 'Deuda borrar', totalAmount: '2000' });
  await submitDebtForm(app.page);

  await app.getDebts().filter({ hasText: 'Deuda borrar' }).getByTitle('Eliminar').click();

  const toast = app.getToast();
  await expect(toast).toBeVisible({ timeout: 5_000 });
  await expect(toast).toContainText('Deuda eliminada');
  await expect(toast.getByRole('button', { name: 'Deshacer' })).toBeVisible();
});

test('deshacer eliminación restaura la deuda', async ({ withClear: app }) => {
  await app.openAddDebt();
  await fillDebtForm(app.page, { name: 'Deuda undo', totalAmount: '4000' });
  await submitDebtForm(app.page);

  await app.getDebts().filter({ hasText: 'Deuda undo' }).getByTitle('Eliminar').click();

  // Undo
  await app.getToast().getByRole('button', { name: 'Deshacer' }).click();

  await expect(app.getDebts().filter({ hasText: 'Deuda undo' })).toBeVisible({ timeout: 8_000 });
});

// --- Estados y totales ---

test('deuda vencida muestra badge Vencida', async ({ withClear: app }) => {
  await app.openAddDebt();
  await fillDebtForm(app.page, {
    name: 'Deuda vencida',
    totalAmount: '5000',
    dueDate: '2020-01-01',
  });
  await submitDebtForm(app.page);

  const debtCard = app.getDebts().filter({ hasText: 'Deuda vencida' });
  await expect(debtCard.getByText('Vencida', { exact: true })).toBeVisible();
});

test('total deuda ARS se muestra con deudas activas', async ({ withClear: app }) => {
  await app.openAddDebt();
  await fillDebtForm(app.page, { name: 'Deuda total', totalAmount: '15000' });
  await submitDebtForm(app.page);

  await expect(app.debtsSection().getByText('Total deuda pendiente en ARS')).toBeVisible();
});

test('agregar deuda desde botón del estado vacío', async ({ withClear: app }) => {
  await app.debtsSection().getByRole('button', { name: 'Registrar deuda' }).click();

  await expect(app.page.locator('.fa-modal')).toBeVisible();
  await expect(app.page.locator('.fa-modal').getByRole('heading', { name: 'Nueva deuda' })).toBeVisible();
});
