import { supabase } from '../supabase';

import type { Debt } from '../../types';

interface DebtRow {
  id: string; user_id: string; name: string;
  total_amount: number; remaining_amount: number; currency: string;
  monthly_payment: number | null; due_date: string | null;
  interest_rate: number | null; status: string; note: string | null;
  created_at: string;
}

const toDebt = (r: DebtRow): Debt => ({
  id: r.id, name: r.name,
  totalAmount: r.total_amount, remainingAmount: r.remaining_amount,
  currency: r.currency as Debt['currency'],
  monthlyPayment: r.monthly_payment ?? undefined,
  dueDate: r.due_date ?? undefined,
  interestRate: r.interest_rate ?? undefined,
  status: r.status as Debt['status'],
  note: r.note ?? undefined,
  createdAt: r.created_at,
});

export const fetchDebts = async (): Promise<Debt[]> => {
  const { data, error } = await supabase.from('debts').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data as DebtRow[]).map(toDebt);
};

export const insertDebt = async (debt: Debt, userId: string): Promise<void> => {
  const { error } = await supabase.from('debts').insert({
    id: debt.id, user_id: userId, name: debt.name,
    total_amount: debt.totalAmount, remaining_amount: debt.remainingAmount,
    currency: debt.currency,
    monthly_payment: debt.monthlyPayment ?? null,
    due_date: debt.dueDate ?? null,
    interest_rate: debt.interestRate ?? null,
    status: debt.status,
    note: debt.note ?? null,
    created_at: debt.createdAt,
  });
  if (error) throw error;
};

export const updateDebt = async (id: string, fields: Partial<Omit<Debt, 'id' | 'createdAt'>>): Promise<void> => {
  const row: Record<string, unknown> = {};
  if (fields.name             !== undefined) row.name              = fields.name;
  if (fields.totalAmount      !== undefined) row.total_amount      = fields.totalAmount;
  if (fields.remainingAmount  !== undefined) row.remaining_amount  = fields.remainingAmount;
  if (fields.currency         !== undefined) row.currency          = fields.currency;
  if (fields.monthlyPayment   !== undefined) row.monthly_payment   = fields.monthlyPayment ?? null;
  if (fields.dueDate          !== undefined) row.due_date          = fields.dueDate ?? null;
  if (fields.interestRate     !== undefined) row.interest_rate     = fields.interestRate ?? null;
  if (fields.status           !== undefined) row.status            = fields.status;
  if (fields.note             !== undefined) row.note              = fields.note ?? null;
  const { error } = await supabase.from('debts').update(row).eq('id', id);
  if (error) throw error;
};

export const deleteDebtById = async (id: string): Promise<void> => {
  const { error } = await supabase.from('debts').delete().eq('id', id);
  if (error) throw error;
};
