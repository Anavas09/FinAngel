import { supabase } from '../supabase';

import type { CreditCard } from '../../types';

interface CreditCardRow {
  id: string; user_id: string; name: string;
  credit_limit: number; current_balance: number; currency: string;
  interest_rate: number | null; closing_day: number | null; due_day: number | null;
  min_payment_pct: number | null; note: string | null;
  status: string; created_at: string;
}

const toCreditCard = (r: CreditCardRow): CreditCard => ({
  id: r.id, name: r.name,
  creditLimit: r.credit_limit, currentBalance: r.current_balance,
  currency: r.currency as CreditCard['currency'],
  interestRate: r.interest_rate ?? undefined,
  closingDay: r.closing_day ?? undefined,
  dueDay: r.due_day ?? undefined,
  minPayment: r.min_payment_pct ?? undefined,
  note: r.note ?? undefined,
  status: r.status as CreditCard['status'],
  createdAt: r.created_at,
});

export const fetchCreditCards = async (): Promise<CreditCard[]> => {
  const { data, error } = await supabase.from('credit_cards').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data as CreditCardRow[]).map(toCreditCard);
};

export const insertCreditCard = async (card: CreditCard, userId: string): Promise<void> => {
  const { error } = await supabase.from('credit_cards').insert({
    id: card.id, user_id: userId, name: card.name,
    credit_limit: card.creditLimit, current_balance: card.currentBalance,
    currency: card.currency,
    interest_rate: card.interestRate ?? null,
    closing_day: card.closingDay ?? null,
    due_day: card.dueDay ?? null,
    min_payment_pct: card.minPayment ?? null,
    note: card.note ?? null,
    status: card.status,
    created_at: card.createdAt,
  });
  if (error) throw error;
};

export const updateCreditCard = async (id: string, fields: Partial<Omit<CreditCard, 'id' | 'createdAt'>>): Promise<void> => {
  const row: Record<string, unknown> = {};
  if (fields.name            !== undefined) row.name             = fields.name;
  if (fields.creditLimit     !== undefined) row.credit_limit     = fields.creditLimit;
  if (fields.currentBalance  !== undefined) row.current_balance  = fields.currentBalance;
  if (fields.currency        !== undefined) row.currency         = fields.currency;
  if (fields.interestRate    !== undefined) row.interest_rate    = fields.interestRate ?? null;
  if (fields.closingDay      !== undefined) row.closing_day      = fields.closingDay ?? null;
  if (fields.dueDay          !== undefined) row.due_day          = fields.dueDay ?? null;
  if (fields.minPayment   !== undefined) row.min_payment_pct  = fields.minPayment ?? null;
  if (fields.note            !== undefined) row.note             = fields.note ?? null;
  if (fields.status          !== undefined) row.status           = fields.status;
  const { error } = await supabase.from('credit_cards').update(row).eq('id', id);
  if (error) throw error;
};

export const deleteCreditCardById = async (id: string): Promise<void> => {
  const { error } = await supabase.from('credit_cards').delete().eq('id', id);
  if (error) throw error;
};
