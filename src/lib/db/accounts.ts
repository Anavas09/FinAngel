import { supabase } from '../supabase';

import type { Account } from '../../types';

interface AccountRow {
  id: string; user_id: string; name: string; kind: string;
  currency: string; symbol: string; color: string; emoji: string;
  balance: number; visible: boolean;
}

const toAccount = (r: AccountRow): Account => ({
  id: r.id, name: r.name, kind: r.kind as Account['kind'],
  currency: r.currency as Account['currency'], symbol: r.symbol,
  color: r.color, emoji: r.emoji, balance: r.balance, visible: r.visible,
});

export const fetchAccounts = async (): Promise<Account[]> => {
  const { data, error } = await supabase.from('accounts').select('*').order('id');
  if (error) throw error;
  return (data as AccountRow[]).map(toAccount);
};

export const insertAccount = async (account: Account, userId: string): Promise<void> => {
  const { error } = await supabase.from('accounts').insert({
    id: account.id, user_id: userId, name: account.name, kind: account.kind,
    currency: account.currency, symbol: account.symbol, color: account.color,
    emoji: account.emoji, balance: account.balance, visible: true,
  });
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

export const deleteAccountById = async (id: string): Promise<void> => {
  const { error } = await supabase.from('accounts').delete().eq('id', id);
  if (error) throw error;
};
