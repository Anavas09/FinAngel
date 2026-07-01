export type Currency = 'ARS' | 'USD' | 'USDT';
export type AccountKind = 'Banco' | 'Billetera' | 'Crédito' | 'Cripto';

export interface AccountSeed {
  id: string;
  name: string;
  kind: AccountKind;
  currency: Currency;
  symbol: string;
  color: string;
  emoji: string;
}

export interface Account extends AccountSeed {
  balance: number;
  visible: boolean;
}

export interface Transaction {
  id: string;
  date: string;
  accountId: string;
  categoryId: string;
  amount: number;
  note: string;
  recurring?: 'monthly' | 'weekly';
  debtId?: string;
  transferGroup?: string;
  createdAt?: string;
}

export type TransactionInput = Omit<Transaction, 'id'> & { id?: string };

export interface Category {
  id: string;
  label: string;
  color: string;
  icon: string;
}

export type MascotPersonality = 'motivadora' | 'sarcastica' | 'chill';
export type MascotMood = 'great' | 'ok' | 'warn';
export type MascotState = 'happy' | 'celebrating' | 'worried' | 'sleepy' | 'love' | 'chill';

export type ThemeKey = 'sticker' | 'warm' | 'night' | 'auto';
export interface ThemeConfig {
  file: string;
  label: string;
  emoji: string;
}

export type Layout = 'saludo' | 'compact' | 'stacked';

export interface Tweaks {
  privacy: boolean;
  mascotPersonality: MascotPersonality;
  layout: Layout;
  primaryAccent: string;
  fxUSD: number;
  fxUSDT: number;
}

export interface Budget {
  id: string;
  categoryId: string;
  amount: number;
}

export interface ChartDataItem {
  id: string;
  label: string;
  value: number;
  color: string;
  icon?: string;
}

export interface Debt {
  id: string;
  name: string;
  totalAmount: number;
  remainingAmount: number;
  currency: Currency;
  monthlyPayment?: number;
  dueDate?: string;
  interestRate?: number;
  status: 'active' | 'paid';
  note?: string;
  createdAt: string;
}

export type DebtInput = Omit<Debt, 'id' | 'createdAt'> & { id?: string };
