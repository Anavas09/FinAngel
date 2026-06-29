import { supabase } from '../supabase';

import type { Transaction } from '../../types';

interface TransactionRow {
  id: string; user_id: string; account_id: string;
  category_id: string; date: string; amount: number; note: string;
  recurring: string | null; debt_id: string | null;
}

const toTransaction = (r: TransactionRow): Transaction => ({
  id: r.id, accountId: r.account_id, categoryId: r.category_id,
  date: r.date, amount: r.amount, note: r.note,
  ...(r.recurring ? { recurring: r.recurring as Transaction['recurring'] } : {}),
  ...(r.debt_id ? { debtId: r.debt_id } : {}),
});

export const fetchTransactions = async (): Promise<Transaction[]> => {
  const { data, error } = await supabase
    .from('transactions').select('*')
    .order('date', { ascending: false })
    .order('id', { ascending: false });
  if (error) throw error;
  return (data as TransactionRow[]).map(toTransaction);
};

export const insertTransaction = async (tx: Transaction, userId: string): Promise<void> => {
  const { error } = await supabase.from('transactions').insert({
    id: tx.id, user_id: userId, account_id: tx.accountId,
    category_id: tx.categoryId, date: tx.date, amount: tx.amount, note: tx.note,
    recurring: tx.recurring ?? null, debt_id: tx.debtId ?? null,
  });
  if (error) throw error;
};

export const updateTransaction = async (tx: Transaction): Promise<void> => {
  const { error } = await supabase.from('transactions').update({
    account_id: tx.accountId, category_id: tx.categoryId,
    date: tx.date, amount: tx.amount, note: tx.note,
    recurring: tx.recurring ?? null, debt_id: tx.debtId ?? null,
  }).eq('id', tx.id);
  if (error) throw error;
};

export const deleteTransactionById = async (id: string): Promise<void> => {
  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) throw error;
};
