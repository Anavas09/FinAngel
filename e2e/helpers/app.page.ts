import { expect, type Page, type Locator } from '@playwright/test';

export class AppPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // --- Navigation helpers ---

  async openSettings() {
    await this.page.getByRole('button', { name: 'Configuración' }).click();
    await this.page.getByText('⚙️ Configuración').waitFor();
  }

  async closeSettings() {
    // Clica el backdrop (div fijo sin contenido antes del panel)
    await this.page.keyboard.press('Escape');
    // Fallback: clic fuera del panel si Escape no cierra
    const panel = this.page.locator('[style*="bottom: 90px"]');
    if (await panel.isVisible()) {
      await this.page.mouse.click(10, 10);
    }
  }

  async openAddTransaction() {
    await this.page.getByRole('button', { name: 'Agregar movimiento' }).click();
  }

  async openTransfer() {
    await this.page.getByRole('button', { name: '↔ Transferir' }).click();
  }

  accountsSection() {
    return this.page.locator('section.fa-section', { hasText: 'Tus cuentas' });
  }

  async openAddAccount() {
    await this.accountsSection().getByRole('button', { name: '+ Agregar' }).click();
  }

  async openExport() {
    await this.page.getByRole('button', { name: 'Exportar' }).first().click();
  }

  // --- Data helpers (via settings panel) ---

  async loadSeedData() {
    await this.openSettings();
    // Usa .last() porque puede haber otro botón igual en el empty-state del main
    await this.page.getByRole('button', { name: 'Cargar datos de ejemplo' }).last().click();
    await this.page.locator('.fa-accounts').waitFor({ timeout: 10_000 });
  }

  async clearAllData() {
    await this.openSettings();
    await this.page.getByRole('button', { name: 'Borrar todos los datos' }).click();
    await this.page.getByRole('button', { name: 'Sí, borrar' }).click();
    // El toast confirma que clearUserData completó y el estado fue reseteado
    await this.page.locator('.fa-toast').waitFor({ timeout: 10_000 });
  }

  // --- UI element accessors ---

  getToast(): Locator {
    return this.page.locator('.fa-toast');
  }

  getTotalAmount(): Locator {
    return this.page.locator('.fa-total-amount');
  }

  getGreetingCard(): Locator {
    return this.page.locator('.fa-greeting');
  }

  getFab(): Locator {
    return this.page.locator('.fa-fab');
  }

  getAccounts(): Locator {
    return this.page.locator('.fa-accounts .fa-account');
  }

  getTransactionItems(): Locator {
    return this.page.locator('.fa-tx-list .fa-tx');
  }

  getSearchInput(): Locator {
    return this.page.getByPlaceholder('Buscar nota o cuenta…');
  }

  getPeriodSelect(): Locator {
    return this.page.locator('select').last();
  }

  debtsSection(): Locator {
    return this.page.locator('section.fa-debts');
  }

  getDebts(): Locator {
    return this.page.locator('.fa-debts .fa-debt');
  }

  async openAddDebt() {
    await this.debtsSection().getByRole('button', { name: '+ Agregar' }).click();
  }

  creditCardsSection(): Locator {
    return this.page.locator('section.fa-credit-cards');
  }

  getCreditCards(): Locator {
    return this.page.locator('.fa-credit-cards .fa-credit-card');
  }

  async openAddCreditCard() {
    await this.creditCardsSection().getByRole('button', { name: '+ Agregar' }).click();
  }
}
