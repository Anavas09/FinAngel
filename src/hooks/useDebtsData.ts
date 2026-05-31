import { useState, useEffect, useMemo } from 'react';
import type { Session } from '@supabase/supabase-js';
import { fetchDebts, insertDebt, updateDebt, deleteDebtById } from '../lib/db';
import type { Currency, Debt, DebtInput } from '../types';

export const useDebtsData = (
  session: Session | null,
  showToast: (msg: string, onUndo?: () => void) => void,
  fxRates: Record<Currency, number>,
) => {
  const [debts, setDebts] = useState<Debt[]>([]);

  useEffect(() => {
    if (!session) return;
    fetchDebts().then(setDebts).catch(() => showToast('Error al cargar deudas'));
  }, [session]);

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

  const totalDebtARS = useMemo(
    () => debts
      .filter(d => d.status === 'active')
      .reduce((s, d) => s + d.remainingAmount * (fxRates[d.currency] ?? 1), 0),
    [debts, fxRates],
  );

  const clearDebts = () => setDebts([]);

  return { debts, addDebt, editDebt, removeDebt, markDebtPaid, totalDebtARS, clearDebts };
};
