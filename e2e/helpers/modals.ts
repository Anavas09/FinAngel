import type { Page } from '@playwright/test';

export interface TransactionFormOptions {
  kind?: 'Gasto' | 'Ingreso';
  amount: string;
  accountName?: string;
  categoryLabel?: string;
  note?: string;
  date?: string;
  recurring?: '' | 'monthly' | 'weekly';
}

export interface TransferFormOptions {
  fromAccountName: string;
  toAccountName: string;
  amount: string;
  note?: string;
  date?: string;
}

export interface AccountFormOptions {
  emoji?: string;
  color?: string;
  name: string;
  kind?: 'Banco' | 'Billetera' | 'Crédito' | 'Cripto';
  currency?: 'ARS $' | 'USD US$' | 'USDT';
  balance?: string;
}

export async function fillTransactionForm(page: Page, opts: TransactionFormOptions) {
  const modal = page.locator('.fa-modal');

  // Kind
  if (opts.kind) {
    await modal.getByRole('button', { name: new RegExp(opts.kind) }).click();
  }

  // Amount
  await modal.locator('.fa-amount-input input').fill(opts.amount);

  // Account (click chip by account name)
  if (opts.accountName) {
    await modal.locator('.fa-account-chip', { hasText: opts.accountName }).click();
  }

  // Category (only for expenses)
  if (opts.categoryLabel) {
    await modal.locator('.fa-cat-chip', { hasText: opts.categoryLabel }).click();
  }

  // Date
  if (opts.date) {
    await modal.locator('input[type="date"]').fill(opts.date);
  }

  // Note
  if (opts.note !== undefined) {
    await modal.getByPlaceholder('ej. Café con Lu').fill(opts.note);
  }

  // Recurring
  if (opts.recurring !== undefined) {
    const selectValue = opts.recurring === 'monthly' ? 'monthly' : opts.recurring === 'weekly' ? 'weekly' : '';
    await modal.locator('select').selectOption(selectValue);
  }
}

export async function submitTransactionForm(page: Page, isEditing = false) {
  const label = isEditing ? 'Guardar' : 'Agregar';
  await page.locator('.fa-modal').getByRole('button', { name: label }).click();
}

export async function fillTransferForm(page: Page, opts: TransferFormOptions) {
  const modal = page.locator('.fa-modal');

  // From account
  const fromSection = modal.locator('.fa-field', { hasText: 'Desde' });
  await fromSection.locator('.fa-account-chip', { hasText: opts.fromAccountName }).click();

  // To account
  const toSection = modal.locator('.fa-field', { hasText: 'Hacia' });
  await toSection.locator('.fa-account-chip', { hasText: opts.toAccountName }).click();

  // Amount
  await modal.locator('.fa-amount-input input').fill(opts.amount);

  // Date
  if (opts.date) {
    await modal.locator('input[type="date"]').fill(opts.date);
  }

  // Note
  if (opts.note !== undefined) {
    await modal.getByPlaceholder('ej. Paso a cripto').fill(opts.note);
  }
}

export async function submitTransferForm(page: Page) {
  await page.locator('.fa-modal').getByRole('button', { name: 'Transferir' }).click();
}

export async function fillAccountForm(page: Page, opts: AccountFormOptions) {
  const modal = page.locator('.fa-modal');

  // Emoji
  if (opts.emoji) {
    await modal.getByRole('button', { name: opts.emoji }).click();
  }

  // Color (aria-label is the hex value)
  if (opts.color) {
    await modal.getByRole('button', { name: opts.color }).click();
  }

  // Name
  await modal.getByPlaceholder('Ej: Cuenta corriente').fill(opts.name);

  // Kind chip
  if (opts.kind) {
    await modal.locator('.fa-kind-chips .fa-chip', { hasText: opts.kind }).first().click();
  }

  // Currency chip
  if (opts.currency) {
    await modal.locator('.fa-kind-chips .fa-chip', { hasText: opts.currency }).click();
  }

  // Balance
  if (opts.balance) {
    await modal.locator('.fa-amount-input input').fill(opts.balance);
  }
}

export async function submitAccountForm(page: Page) {
  await page.locator('.fa-modal').getByRole('button', { name: 'Crear cuenta' }).click();
}

export interface DebtFormOptions {
  name: string;
  currency?: 'ARS $' | 'USD US$' | 'USDT';
  totalAmount: string;
  remainingAmount?: string;
  monthlyPayment?: string;
  dueDate?: string;
  interestRate?: string;
  note?: string;
}

export async function fillDebtForm(page: Page, opts: DebtFormOptions) {
  const modal = page.locator('.fa-modal');

  await modal.getByPlaceholder('Ej: Tarjeta Visa, Préstamo banco').fill(opts.name);

  if (opts.currency) {
    await modal.locator('.fa-kind-chips .fa-chip', { hasText: opts.currency }).click();
  }

  // Los inputs de monto están en orden: total, pendiente, cuota mensual
  const amountInputs = modal.locator('.fa-amount-input input');
  await amountInputs.nth(0).fill(opts.totalAmount);

  if (opts.remainingAmount !== undefined) {
    await amountInputs.nth(1).fill(opts.remainingAmount);
  }

  if (opts.monthlyPayment !== undefined) {
    await amountInputs.nth(2).fill(opts.monthlyPayment);
  }

  if (opts.dueDate) {
    await modal.locator('input[type="date"]').fill(opts.dueDate);
  }

  if (opts.interestRate !== undefined) {
    await modal.getByPlaceholder('Ej: 65').fill(opts.interestRate);
  }

  if (opts.note !== undefined) {
    await modal.getByPlaceholder('Ej: Cuota 3 de 12').fill(opts.note);
  }
}

export async function submitDebtForm(page: Page, isEditing = false) {
  const label = isEditing ? 'Guardar cambios' : 'Agregar deuda';
  await page.locator('.fa-modal').getByRole('button', { name: label }).click();
}
