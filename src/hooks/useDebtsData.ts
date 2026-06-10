import { useState, useEffect, useMemo } from 'react';
import type { Session } from '@supabase/supabase-js';
import { fetchDebts, insertDebt, updateDebt, deleteDebtById } from '../lib/db';
import { loadOrder, saveOrder, applyOrder } from '../data/utils';
import type { Currency, Debt, DebtInput } from '../types';

const DEBT_ORDER_KEY = 'finangel:debt-order';

export const useDebtsData = (
  session: Session | null,
  showToast: (msg: string, onUndo?: () => void) => void,
  fxRates: Record<Currency, number>,
) => {
  const [debts, setDebts] = useState<Debt[]>([]);

  useEffect(() => {
    if (!session) return;
    fetchDebts()
      .then(ds => setDebts(applyOrder(ds, loadOrder(DEBT_ORDER_KEY))))
      .catch(() => showToast('Error al cargar deudas'));
  }, [session?.user.id]);

  const addDebt = (fields: Omit<DebtInput, 'id'>) => {
    const newDebt: Debt = {
      ...fields,
      id: 'debt-' + Date.now(),
      createdAt: new Date().toISOString().slice(0, 10),
    } as Debt;
    setDebts(prev => [newDebt, ...prev]);
    insertDebt(newDebt, session!.user.id).catch(() => {
      setDebts(prev => prev.filter(d => d.id !== newDebt.id));
      showToast('Error al guardar la deuda');
    });
    showToast('Deuda agregada');
  };

  const editDebt = (id: string, fields: Partial<Omit<Debt, 'id' | 'createdAt'>>) => {
    const prev = debts.find(d => d.id === id);
    if (!prev) return;
    const updated = { ...prev, ...fields };
    setDebts(ds => ds.map(d => d.id === id ? updated : d));
    updateDebt(id, fields).catch(() => {
      setDebts(ds => ds.map(d => d.id === id ? prev : d));
      showToast('Error al actualizar la deuda');
    });
    showToast('Deuda actualizada');
  };

  const removeDebt = (id: string) => {
    const prev = debts.find(d => d.id === id);
    if (!prev) return;
    setDebts(ds => ds.filter(d => d.id !== id));
    deleteDebtById(id).catch(() => {
      setDebts(ds => [prev, ...ds]);
      showToast('Error al eliminar la deuda');
    });
    showToast('Deuda eliminada', () => {
      setDebts(ds => [prev, ...ds]);
      insertDebt(prev, session!.user.id).catch(() => {
        setDebts(ds => ds.filter(d => d.id !== id));
        showToast('Error al restaurar la deuda');
      });
    });
  };

  const markDebtPaid = (id: string) => {
    editDebt(id, { status: 'paid', remainingAmount: 0 });
  };

  const partialPayDebt = (id: string, amount: number) => {
    const debt = debts.find(d => d.id === id);
    if (!debt) return;
    const newRemaining = Math.max(0, debt.remainingAmount - Math.abs(amount));
    editDebt(id, {
      remainingAmount: newRemaining,
      ...(newRemaining === 0 ? { status: 'paid' as const } : {}),
    });
  };

  // delta > 0: more paid (reduce remaining), delta < 0: less paid (restore remaining)
  const adjustDebtPayment = (id: string, delta: number) => {
    const debt = debts.find(d => d.id === id);
    if (!debt) return;
    const newRemaining = Math.max(0, debt.remainingAmount - delta);
    editDebt(id, {
      remainingAmount: newRemaining,
      status: newRemaining === 0 ? 'paid' : 'active',
    });
  };

  const totalDebtARS = useMemo(
    () => debts
      .filter(d => d.status === 'active')
      .reduce((s, d) => s + d.remainingAmount * (fxRates[d.currency] ?? 1), 0),
    [debts, fxRates],
  );

  const reorderDebts = (ids: string[]) => {
    saveOrder(DEBT_ORDER_KEY, ids);
    setDebts(prev => applyOrder(prev, ids));
  };

  const clearDebts = () => setDebts([]);

  return { debts, addDebt, editDebt, removeDebt, markDebtPaid, partialPayDebt, adjustDebtPayment, totalDebtARS, clearDebts, reorderDebts };
};
