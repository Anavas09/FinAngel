import { supabase } from './supabase';
import { ACCOUNTS_SEED, ACCOUNT_BALANCES, TRANSACTIONS_SEED } from '../data/constants';
import type { Account, Transaction } from '../types';

interface AccountRow {
  id: string; user_id: string; name: string; kind: string;
  currency: string; symbol: string; color: string; emoji: string;
  balance: number; visible: boolean;
}

interface TransactionRow {
  id: string; user_id: string; account_id: string;
  category_id: string; date: string; amount: number; note: string;
}

const toAccount = (r: AccountRow): Account => ({
  id: r.id, name: r.name, kind: r.kind as Account['kind'],
  currency: r.currency as Account['currency'], symbol: r.symbol,
  color: r.color, emoji: r.emoji, balance: r.balance, visible: r.visible,
});

const toTransaction = (r: TransactionRow): Transaction => ({
  id: r.id, accountId: r.account_id, categoryId: r.category_id,
  date: r.date, amount: r.amount, note: r.note,
});

export const fetchAccounts = async (): Promise<Account[]> => {
  const { data, error } = await supabase.from('accounts').select('*').order('id');
  if (error) throw error;
  return (data as AccountRow[]).map(toAccount);
};

export const fetchTransactions = async (): Promise<Transaction[]> => {
  const { data, error } = await supabase
    .from('transactions').select('*')
    .order('date', { ascending: false })
    .order('id', { ascending: false });
  if (error) throw error;
  return (data as TransactionRow[]).map(toTransaction);
};

export const seedUserData = async (userId: string): Promise<void> => {
  const { error: accErr } = await supabase.from('accounts').insert(
    ACCOUNTS_SEED.map(a => ({
      id: a.id, user_id: userId, name: a.name, kind: a.kind,
      currency: a.currency, symbol: a.symbol, color: a.color, emoji: a.emoji,
      balance: ACCOUNT_BALANCES[a.id], visible: true,
    }))
  );
  if (accErr) throw accErr;

  const { error: txErr } = await supabase.from('transactions').insert(
    TRANSACTIONS_SEED.map(t => ({
      id: t.id, user_id: userId, account_id: t.accountId,
      category_id: t.categoryId, date: t.date, amount: t.amount, note: t.note,
    }))
  );
  if (txErr) throw txErr;
};

export const insertAccount = async (account: Account, userId: string): Promise<void> => {
  const { error } = await supabase.from('accounts').insert({
    id: account.id, user_id: userId, name: account.name, kind: account.kind,
    currency: account.currency, symbol: account.symbol, color: account.color,
    emoji: account.emoji, balance: account.balance, visible: true,
  });
  if (error) throw error;
};

export const insertTransaction = async (tx: Transaction, userId: string): Promise<void> => {
  const { error } = await supabase.from('transactions').insert({
    id: tx.id, user_id: userId, account_id: tx.accountId,
    category_id: tx.categoryId, date: tx.date, amount: tx.amount, note: tx.note,
  });
  if (error) throw error;
};

export const updateTransaction = async (tx: Transaction): Promise<void> => {
  const { error } = await supabase.from('transactions').update({
    account_id: tx.accountId, category_id: tx.categoryId,
    date: tx.date, amount: tx.amount, note: tx.note,
  }).eq('id', tx.id);
  if (error) throw error;
};

export const deleteTransactionById = async (id: string): Promise<void> => {
  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) throw error;
};

export const updateAccountBalance = async (id: string, balance: number): Promise<void> => {
  const { error } = await supabase.from('accounts').update({ balance }).eq('id', id);
  if (error) throw error;
};

export const updateAccountVisibility = async (id: string, visible: boolean): Promise<void> => {
  const { error } = await supabase.from('accounts').update({ visible }).eq('id', id);
  if (error) throw error;
};

export const clearUserData = async (): Promise<void> => {
  // RLS garantiza que solo se borran los datos del usuario actual.
  // El CASCADE en transactions.account_id los borra al borrar accounts.
  const { error } = await supabase.from('accounts').delete().neq('id', '');
  if (error) throw error;
};
