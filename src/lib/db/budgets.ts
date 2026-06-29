import { supabase } from '../supabase';

import type { Budget } from '../../types';

export const fetchBudgets = async (): Promise<Budget[]> => {
  const { data, error } = await supabase.from('budgets').select('*');
  if (error) throw error;
  return (data as { id: string; category_id: string; amount: number }[]).map(r => ({
    id: r.id, categoryId: r.category_id, amount: r.amount,
  }));
};

export const upsertBudget = async (b: { categoryId: string; amount: number }, userId: string): Promise<void> => {
  const { error } = await supabase.from('budgets').upsert(
    { user_id: userId, category_id: b.categoryId, amount: b.amount },
    { onConflict: 'user_id,category_id' }
  );
  if (error) throw error;
};

export const deleteBudget = async (categoryId: string): Promise<void> => {
  const { error } = await supabase.from('budgets').delete().eq('category_id', categoryId);
  if (error) throw error;
};
