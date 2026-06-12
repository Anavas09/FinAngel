import { test, expect } from '../fixtures/index';
import { fillTransferForm, submitTransferForm } from '../helpers/modals';

test('transferencia crea dos transacciones en la lista', async ({ withSeed: app }) => {
  const countBefore = await app.getTransactionItems().count();

  // Toma nombres de las dos primeras cuentas
  const fromName = await app.getAccounts().nth(0).locator('.fa-account-name').innerText();
  const toName   = await app.getAccounts().nth(1).locator('.fa-account-name').innerText();

  await app.openTransfer();
  await fillTransferForm(app.page, {
    fromAccountName: fromName,
    toAccountName:   toName,
    amount: '500',
    note: 'Transfer test',
  });
  await submitTransferForm(app.page);

  // Deben aparecer 2 transacciones nuevas (salida + entrada)
  await expect(app.getTransactionItems()).toHaveCount(countBefore + 2, { timeout: 8_000 });

  // Ambas tienen categoría "Transferencia" en el meta
  const transferMetas = app.page.locator('.fa-tx-meta', { hasText: 'Transferencia' });
  await expect(transferMetas).toHaveCount(2);
});

test('balances de origen y destino se actualizan', async ({ withSeed: app }) => {
  const fromCard = app.getAccounts().nth(0);
  const toCard   = app.getAccounts().nth(1);

  const fromName = await fromCard.locator('.fa-account-name').innerText();
  const toName   = await toCard.locator('.fa-account-name').innerText();

  const balFromBefore = await fromCard.locator('.fa-account-balance').innerText();
  const balToBefore   = await toCard.locator('.fa-account-balance').innerText();

  await app.openTransfer();
  await fillTransferForm(app.page, {
    fromAccountName: fromName,
    toAccountName:   toName,
    amount: '1000',
  });
  await submitTransferForm(app.page);

  await expect(fromCard.locator('.fa-account-balance')).not.toHaveText(balFromBefore, { timeout: 8_000 });
  await expect(toCard.locator('.fa-account-balance')).not.toHaveText(balToBefore, { timeout: 8_000 });
});

test('destino no incluye la cuenta origen', async ({ withSeed: app }) => {
  const fromName = await app.getAccounts().nth(0).locator('.fa-account-name').innerText();

  await app.openTransfer();
  const modal = app.page.locator('.fa-modal');

  // Selecciona la primera cuenta como origen
  await modal.locator('.fa-field', { hasText: 'Desde' })
    .locator('.fa-account-chip', { hasText: fromName }).click();

  // La sección "Hacia" no debe mostrar esa misma cuenta
  const haciaSection = modal.locator('.fa-field', { hasText: 'Hacia' });
  await expect(haciaSection.locator('.fa-account-chip', { hasText: fromName })).toHaveCount(0);
});

test('cambiar origen auto-actualiza el destino', async ({ withSeed: app }) => {
  await app.openTransfer();
  const modal = app.page.locator('.fa-modal');

  const desdeSection  = modal.locator('.fa-field', { hasText: 'Desde' });
  const haciaSection  = modal.locator('.fa-field', { hasText: 'Hacia' });

  // Lee el destino inicial
  const initialToChip = haciaSection.locator('.fa-account-chip.active');
  const initialToName = await initialToChip.innerText();

  // Selecciona como origen la cuenta que estaba en destino
  await desdeSection.locator('.fa-account-chip', { hasText: initialToName.trim() }).click();

  // El destino ya no puede ser esa misma cuenta → cambió
  await expect(haciaSection.locator('.fa-account-chip.active')).not.toHaveText(initialToName.trim());
});

test('monto cero muestra error y no cierra el modal', async ({ withSeed: app }) => {
  await app.openTransfer();
  await app.page.locator('.fa-modal .fa-amount-input input').fill('0');
  await submitTransferForm(app.page);

  await expect(app.page.locator('.fa-modal').getByText(/monto válido/i)).toBeVisible();
  await expect(app.page.locator('.fa-modal')).toBeVisible();
});

test('saldo insuficiente muestra error en el input de monto', async ({ withSeed: app }) => {
  // Mercado Pago tiene saldo 86450 ARS en seed
  await app.openTransfer();
  const modal = app.page.locator('.fa-modal');

  await modal.locator('.fa-field', { hasText: 'Desde' })
    .locator('.fa-account-chip', { hasText: 'Mercado Pago' }).click();
  await modal.locator('.fa-amount-input input').fill('999999');
  await submitTransferForm(app.page);

  // El error aparece dentro del campo de monto (no debajo de los chips de cuenta)
  await expect(modal.locator('.fa-field-amount').getByText(/Saldo insuficiente/i)).toBeVisible();
  await expect(modal).toBeVisible();
});

test('nota vacía usa "Transferencia" como default', async ({ withSeed: app }) => {
  const fromName = await app.getAccounts().nth(0).locator('.fa-account-name').innerText();
  const toName   = await app.getAccounts().nth(1).locator('.fa-account-name').innerText();

  await app.openTransfer();
  await fillTransferForm(app.page, {
    fromAccountName: fromName,
    toAccountName:   toName,
    amount: '200',
    // sin nota
  });
  await submitTransferForm(app.page);

  // Las transacciones creadas tienen nota "Transferencia"
  await expect(app.page.locator('.fa-tx-note', { hasText: 'Transferencia' }).first())
    .toBeVisible({ timeout: 8_000 });
});
