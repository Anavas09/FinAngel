import { useState, useEffect, useMemo } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  fetchAccounts, fetchTransactions, seedUserData,
  insertAccount, insertTransaction, updateTransaction, deleteTransactionById,
  updateAccountBalance, updateAccountVisibility, deleteAccountById,
  fetchBudgets, upsertBudget, deleteBudget, clearUserData,
} from '../lib/db';
import type { Account, Budget, ChartDataItem, Currency, Transaction, TransactionInput } from '../types';

const isoWeekKey = (d: Date) => {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
};

const autoGenerateRecurring = (txs: Transaction[], now: Date): Transaction[] => {
  const generated: Transaction[] = [];
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentWeek = isoWeekKey(now);
  const today = now.toISOString().slice(0, 10);

  txs.filter(t => t.recurring).forEach((t, i) => {
    const period = t.recurring === 'monthly' ? currentMonth : currentWeek;
    const txPeriod = t.recurring === 'monthly' ? t.date.slice(0, 7) : isoWeekKey(new Date(t.date));
    if (txPeriod === period) return;
    const alreadyExists = txs.some(
      x => !x.recurring && (t.recurring === 'monthly' ? x.date.startsWith(currentMonth) : isoWeekKey(new Date(x.date)) === currentWeek)
           && x.note === t.note && x.accountId === t.accountId && x.amount === t.amount
    );
    if (alreadyExists) return;
    generated.push({ id: `t_rec_${Date.now()}_${i}`, date: today, accountId: t.accountId, categoryId: t.categoryId, amount: t.amount, note: t.note });
  });
  return generated;
};

export const useFinanceData = (session: Session | null, showToast: (msg: string) => void, fxRates: Record<Currency, number>) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    setLoading(true);
    Promise.all([fetchAccounts(), fetchTransactions(), fetchBudgets()])
      .then(([accs, txs, bgs]) => {
        const generated = autoGenerateRecurring(txs, new Date());
        if (generated.length === 0) {
          setAccounts(accs); setTransactions(txs); setBudgets(bgs);
          return;
        }
        const updatedAccounts = accs.map(a => {
          const delta = generated.filter(t => t.accountId === a.id).reduce((s, t) => s + t.amount, 0);
          return delta !== 0 ? { ...a, balance: a.balance + delta } : a;
        });
        setAccounts(updatedAccounts);
        setTransactions([...generated, ...txs]);
        setBudgets(bgs);
        Promise.all([
          ...generated.map(t => insertTransaction(t, session.user.id)),
          ...updatedAccounts
            .filter(a => generated.some(t => t.accountId === a.id))
            .map(a => updateAccountBalance(a.id, a.balance)),
        ]).catch(() => { setAccounts(accs); setTransactions(txs); });
      })
      .finally(() => setLoading(false));
  }, [session]);

  // --- Cuentas ---

  const toggleAccount = (id: string) => {
    const updated = accounts.map(a => a.id === id ? { ...a, visible: !a.visible } : a);
    setAccounts(updated);
    const acc = updated.find(a => a.id === id)!;
    updateAccountVisibility(id, acc.visible).catch(() => {
      setAccounts(accounts);
      showToast('Error al actualizar la cuenta');
    });
  };

  const addAccount = (fields: Omit<Account, 'id' | 'visible'>) => {
    const newAccount: Account = { ...fields, id: 'acc_' + Date.now(), visible: true };
    setAccounts(prev => [...prev, newAccount]);
    insertAccount(newAccount, session!.user.id).catch(() => {
      setAccounts(accounts);
      showToast('Error al crear la cuenta');
    });
    showToast('Cuenta creada');
  };

  const deleteAccount = (id: string) => {
    const prevAccounts = accounts;
    const prevTransactions = transactions;
    setAccounts(prev => prev.filter(a => a.id !== id));
    setTransactions(prev => prev.filter(t => t.accountId !== id));
    deleteAccountById(id).catch(() => {
      setAccounts(prevAccounts);
      setTransactions(prevTransactions);
      showToast('Error al eliminar la cuenta');
    });
    showToast('Cuenta eliminada');
  };

  const setBudget = (categoryId: string, amount: number) => {
    const existing = budgets.find(b => b.categoryId === categoryId);
    const newBudget: Budget = { id: existing?.id ?? 'b' + Date.now(), categoryId, amount };
    setBudgets(prev => [...prev.filter(b => b.categoryId !== categoryId), newBudget]);
    upsertBudget({ categoryId, amount }, session!.user.id).catch(() => {
      setBudgets(budgets);
      showToast('Error al guardar presupuesto');
    });
  };

  const removeBudget = (categoryId: string) => {
    setBudgets(prev => prev.filter(b => b.categoryId !== categoryId));
    deleteBudget(categoryId).catch(() => {
      setBudgets(budgets);
      showToast('Error al eliminar presupuesto');
    });
  };

  const insertTransfer = (fromId: string, toId: string, amount: number, date: string, note: string) => {
    const id1 = 't' + Date.now();
    const id2 = 't' + (Date.now() + 1);
    const txOut: Transaction = { id: id1, date, accountId: fromId, categoryId: 'transfer', amount: -amount, note };
    const txIn: Transaction  = { id: id2, date, accountId: toId,   categoryId: 'transfer', amount:  amount, note };
    const newAccounts = accounts.map(a => {
      if (a.id === fromId) return { ...a, balance: a.balance - amount };
      if (a.id === toId)   return { ...a, balance: a.balance + amount };
      return a;
    });
    const prevAccounts     = accounts;
    const prevTransactions = transactions;
    setTransactions(prev => [txIn, txOut, ...prev]);
    setAccounts(newAccounts);
    const fromBalance = newAccounts.find(a => a.id === fromId)!.balance;
    const toBalance   = newAccounts.find(a => a.id === toId)!.balance;
    Promise.all([
      insertTransaction(txOut, session!.user.id),
      insertTransaction(txIn,  session!.user.id),
      updateAccountBalance(fromId, fromBalance),
      updateAccountBalance(toId,   toBalance),
    ]).catch(() => {
      setTransactions(prevTransactions);
      setAccounts(prevAccounts);
      showToast('Error al registrar la transferencia');
    });
    showToast('Transferencia registrada');
  };

  // --- Transacciones ---

  const upsertTx = (tx: TransactionInput) => {
    const existing = tx.id ? transactions.find(t => t.id === tx.id) : undefined;
    if (existing) {
      const updated = tx as Transaction;
      const delta = updated.amount - existing.amount;
      const newAccounts = accounts.map(a =>
        a.id === updated.accountId ? { ...a, balance: a.balance + delta } : a
      );
      setTransactions(prev => prev.map(t => t.id === tx.id ? updated : t));
      setAccounts(newAccounts);
      const newBalance = newAccounts.find(a => a.id === updated.accountId)!.balance;
      Promise.all([
        updateTransaction(updated),
        updateAccountBalance(updated.accountId, newBalance),
      ]).catch(() => {
        setTransactions(transactions);
        setAccounts(accounts);
        showToast('Error al actualizar el movimiento');
      });
      showToast('Movimiento actualizado');
    } else {
      const newTx: Transaction = { ...tx, id: 't' + Date.now() };
      const newAccounts = accounts.map(a =>
        a.id === newTx.accountId ? { ...a, balance: a.balance + newTx.amount } : a
      );
      setTransactions(prev => [newTx, ...prev]);
      setAccounts(newAccounts);
      const newBalance = newAccounts.find(a => a.id === newTx.accountId)!.balance;
      Promise.all([
        insertTransaction(newTx, session!.user.id),
        updateAccountBalance(newTx.accountId, newBalance),
      ]).catch(() => {
        setTransactions(transactions);
        setAccounts(accounts);
        showToast('Error al guardar el movimiento');
      });
      showToast('Movimiento agregado');
    }
  };

  const deleteTx = (id: string): (() => void) => {
    const tx = transactions.find(t => t.id === id);
    if (!tx) return () => {};
    const newAccounts = accounts.map(a =>
      a.id === tx.accountId ? { ...a, balance: a.balance - tx.amount } : a
    );
    const prevTransactions = transactions;
    const prevAccounts = accounts;
    setTransactions(prev => prev.filter(t => t.id !== id));
    setAccounts(newAccounts);
    const newBalance = newAccounts.find(a => a.id === tx.accountId)!.balance;
    Promise.all([
      deleteTransactionById(id),
      updateAccountBalance(tx.accountId, newBalance),
    ]).catch(() => {
      setTransactions(prevTransactions);
      setAccounts(prevAccounts);
      showToast('Error al eliminar el movimiento');
    });
    return () => {
      setTransactions(prevTransactions);
      setAccounts(prevAccounts);
      const restoredBalance = prevAccounts.find(a => a.id === tx.accountId)!.balance;
      Promise.all([
        insertTransaction(tx, session!.user.id),
        updateAccountBalance(tx.accountId, restoredBalance),
      ]).catch(() => {
        setTransactions(prev => prev.filter(t => t.id !== id));
        setAccounts(newAccounts);
        showToast('Error al restaurar el movimiento');
      });
    };
  };

  // --- Gestión de datos ---

  const handleLoadSeed = async () => {
    if (!session) return;
    await clearUserData();
    await seedUserData(session.user.id);
    const [accs, txs] = await Promise.all([fetchAccounts(), fetchTransactions()]);
    setAccounts(accs);
    setTransactions(txs);
    showToast('Datos de ejemplo cargados');
  };

  const handleClearAll = async () => {
    if (!session) return;
    await clearUserData();
    setAccounts([]);
    setTransactions([]);
    showToast('Todos los datos fueron borrados');
  };

  // --- Valores derivados ---

  const visibleAccounts = accounts.filter(a => a.visible);

  const totalsByCcy = useMemo<Record<Currency, number>>(() => {
    const out: Record<Currency, number> = { ARS: 0, USD: 0, USDT: 0 };
    visibleAccounts.forEach(a => { out[a.currency] = (out[a.currency] ?? 0) + a.balance; });
    return out;
  }, [visibleAccounts]);

  const totalInARS = useMemo(
    () => visibleAccounts.reduce((s, a) => s + a.balance * (fxRates[a.currency] ?? 0), 0),
    [visibleAccounts]
  );

  const thisMonth = useMemo(() => {
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return transactions.filter(
      t => t.date.startsWith(ym) && accounts.find(a => a.id === t.accountId)?.visible
    );
  }, [transactions, accounts]);

  const categoryData = useMemo<ChartDataItem[]>(() => {
    const byCat: Record<string, number> = {};
    thisMonth.forEach(t => {
      if (t.amount >= 0) return;
      const a = accounts.find(x => x.id === t.accountId);
      const ars = Math.abs(t.amount) * (a ? fxRates[a.currency] : 0);
      byCat[t.categoryId] = (byCat[t.categoryId] ?? 0) + ars;
    });
    const catMap: Record<string, { label: string; color: string; icon: string }> = {
      comida:          { label: 'Comida',          color: '#F26B5E', icon: '🛒' },
      vivienda:        { label: 'Vivienda',         color: '#7EC4F2', icon: '🏠' },
      servicios:       { label: 'Servicios',        color: '#F2C94C', icon: '💡' },
      salud:           { label: 'Salud',            color: '#5BB890', icon: '🩺' },
      entretenimiento: { label: 'Entretenimiento',  color: '#D4C5F9', icon: '🎬' },
      ahorro:          { label: 'Ahorro',           color: '#F49B8A', icon: '🐷' },
      ingreso:         { label: 'Ingreso',          color: '#5BB890', icon: '💰' },
      otros:           { label: 'Otros',            color: '#B8B0A0', icon: '✨' },
    };
    return Object.entries(byCat)
      .map(([id, value]) => {
        const cat = catMap[id] ?? { label: id, color: '#B8B0A0', icon: '✨' };
        return { id, value, ...cat };
      })
      .sort((a, b) => b.value - a.value);
  }, [thisMonth, accounts]);

  const flowData = useMemo<ChartDataItem[]>(() => {
    let inc = 0, exp = 0;
    thisMonth.forEach(t => {
      const a = accounts.find(x => x.id === t.accountId);
      const ars = t.amount * (a ? fxRates[a.currency] : 0);
      if (ars >= 0) inc += ars; else exp += Math.abs(ars);
    });
    return [
      { id: 'inc', label: 'Ingresos', value: inc, color: '#5BB890', icon: '⬆' },
      { id: 'exp', label: 'Egresos',  value: exp, color: '#F26B5E', icon: '⬇' },
    ];
  }, [thisMonth, accounts]);

  const monthNet = flowData[0].value - flowData[1].value;

  return {
    accounts, transactions, loading,
    visibleAccounts, totalsByCcy, totalInARS,
    categoryData, flowData, monthNet,
    toggleAccount, addAccount, deleteAccount, insertTransfer,
    budgets, setBudget, removeBudget,
    upsertTx, deleteTx,
    handleLoadSeed, handleClearAll,
  };
};
