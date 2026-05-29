import { supabase } from '../supabase';
import { ACCOUNTS_SEED, ACCOUNT_BALANCES, TRANSACTIONS_SEED } from '../../data/constants';

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

export const clearUserData = async (): Promise<void> => {
  // RLS garantiza que solo se borran los datos del usuario actual.
  const { error } = await supabase.from('accounts').delete().neq('id', '');
  if (error) throw error;
};
