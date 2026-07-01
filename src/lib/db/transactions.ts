import { supabase } from '../supabase';

import type { Transaction } from '../../types';

interface TransactionRow {
  id: string; user_id: string; account_id: string;
  category_id: string; date: string; amount: number; note: string;
  recurring: string | null; debt_id: string | null;
  transfer_group: string | null; created_at: string | null;
}

const toTransaction = (r: TransactionRow): Transaction => ({
  id: r.id, accountId: r.account_id, categoryId: r.category_id,
  date: r.date, amount: r.amount, note: r.note,
  ...(r.recurring ? { recurring: r.recurring as Transaction['recurring'] } : {}),
  ...(r.debt_id ? { debtId: r.debt_id } : {}),
  ...(r.transfer_group ? { transferGroup: r.transfer_group } : {}),
  ...(r.created_at ? { createdAt: r.created_at } : {}),
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
  const { error } = await supabase.rpc('register_transaction', {
    p_id:          tx.id,
    p_user_id:     userId,
    p_account_id:  tx.accountId,
    p_category_id: tx.categoryId,
    p_amount:      tx.amount,
    p_date:        tx.date,
    p_note:        tx.note,
    p_recurring:   tx.recurring ?? null,
    p_debt_id:     tx.debtId ?? null,
  });
  if (error) throw error;
};

export const insertTransferRpc = async (
  userId: string, fromId: string, toId: string,
  amount: number, toAmount: number, date: string, note: string,
  id1: string, id2: string,
): Promise<void> => {
  const { error } = await supabase.rpc('register_transfer', {
    p_user_id:      userId,
    p_from_account: fromId,
    p_to_account:   toId,
    p_amount:       amount,
    p_to_amount:    toAmount,
    p_date:         date,
    p_note:         note,
    p_id1:          id1,
    p_id2:          id2,
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
