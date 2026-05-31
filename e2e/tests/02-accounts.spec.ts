import { test, expect } from '../fixtures/index';
import { fillAccountForm, submitAccountForm } from '../helpers/modals';

// --- Estado vacío ---

test('estado vacío muestra botón de ejemplo', async ({ withClear: app }) => {
  const accountsSection = app.accountsSection();
  await expect(accountsSection.locator('.fa-empty')).toBeVisible();
  await expect(accountsSection.getByRole('button', { name: 'Cargar datos de ejemplo' })).toBeVisible();
});

// --- Crear cuentas ---

test('crear cuenta ARS con todos los campos', async ({ withClear: app }) => {
  await app.openAddAccount();
  await fillAccountForm(app.page, {
    emoji: '💰',
    color: '#B8E6C9',
    name: 'Mi cuenta test',
    kind: 'Billetera',
    currency: 'ARS $',
    balance: '5000',
  });
  await submitAccountForm(app.page);

  await expect(app.page.locator('.fa-account-name', { hasText: 'Mi cuenta test' })).toBeVisible();
});

test('crear cuenta USD con saldo decimal', async ({ withClear: app }) => {
  await app.openAddAccount();
  await fillAccountForm(app.page, {
    name: 'Cuenta USD',
    currency: 'USD US$',
    balance: '1234.50',
  });
  await submitAccountForm(app.page);

  await expect(app.page.locator('.fa-account-name', { hasText: 'Cuenta USD' })).toBeVisible();
  // El balance muestra la moneda USD
  await expect(app.page.locator('.fa-account-kind', { hasText: 'USD' })).toBeVisible();
});

test('nombre de cuenta max 50 caracteres', async ({ withClear: app }) => {
  await app.openAddAccount();
  const input = app.page.locator('.fa-modal').getByPlaceholder('Ej: Cuenta corriente');
  await input.fill('A'.repeat(60));
  const value = await input.inputValue();
  expect(value.length).toBeLessThanOrEqual(50);
});

// --- Toggle visibilidad (requieren cuentas cargadas) ---

test('toggle visibilidad oculta la cuenta', async ({ withSeed: app }) => {
  const firstCard = app.getAccounts().first();
  const accountName = await firstCard.locator('.fa-account-name').innerText();

  // Toggle off
  await firstCard.getByRole('switch').click();

  // Card tiene clase fa-account-off
  await expect(firstCard).toHaveClass(/fa-account-off/);

  // El toggle está desactivado
  await expect(firstCard.getByRole('switch', { name: `Mostrar ${accountName}` }))
    .toHaveAttribute('aria-checked', 'false');
});

test('toggle visibilidad restaura la cuenta', async ({ withSeed: app }) => {
  const firstCard = app.getAccounts().first();

  // Toggle off → on
  await firstCard.getByRole('switch').click();
  await expect(firstCard).toHaveClass(/fa-account-off/);
  await firstCard.getByRole('switch').click();
  await expect(firstCard).not.toHaveClass(/fa-account-off/);
});

// --- Eliminar cuentas ---

test('eliminar cuenta requiere confirmación', async ({ withSeed: app }) => {
  const cards = app.getAccounts();
  const initialCount = await cards.count();

  // Primer card: clica Eliminar → aparece "¿Eliminar?"
  await cards.first().getByRole('button', { name: /eliminar/i }).click();
  await expect(cards.first().getByRole('button', { name: '¿Eliminar?' })).toBeVisible();

  // Cancela → cuenta sigue
  await cards.first().getByRole('button', { name: 'Cancelar' }).click();
  await expect(cards).toHaveCount(initialCount);
});

test('eliminar cuenta borra la card', async ({ withSeed: app }) => {
  const cards = app.getAccounts();
  const initialCount = await cards.count();

  // Clica Eliminar → confirma
  await cards.first().getByRole('button', { name: /eliminar/i }).click();
  await cards.first().getByRole('button', { name: '¿Eliminar?' }).click();

  await expect(cards).toHaveCount(initialCount - 1, { timeout: 8_000 });
});
