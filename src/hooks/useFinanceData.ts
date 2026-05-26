import { useState, useEffect, useMemo } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  fetchAccounts, fetchTransactions, seedUserData,
  insertAccount, insertTransaction, updateTransaction, deleteTransactionById,
  updateAccountBalance, updateAccountVisibility, clearUserData,
} from '../lib/db';
import { FX_TO_ARS } from '../data/constants';
import type { Account, ChartDataItem, Currency, Transaction, TransactionInput } from '../types';

export const useFinanceData = (session: Session | null, showToast: (msg: string) => void) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    setLoading(true);
    Promise.all([fetchAccounts(), fetchTransactions()])
      .then(([accs, txs]) => { setAccounts(accs); setTransactions(txs); })
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

  // --- Transacciones ---

  const upsertTx = (tx: TransactionInput) => {
    if (tx.id && transactions.find(t => t.id === tx.id)) {
      const updated = tx as Transaction;
      setTransactions(prev => prev.map(t => t.id === tx.id ? updated : t));
      updateTransaction(updated).catch(() => {
        setTransactions(transactions);
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

  const deleteTx = (id: string) => {
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;
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
    showToast('Movimiento eliminado');
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
    () => visibleAccounts.reduce((s, a) => s + a.balance * (FX_TO_ARS[a.currency] ?? 0), 0),
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
      const ars = Math.abs(t.amount) * (a ? FX_TO_ARS[a.currency] : 0);
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
      const ars = t.amount * (a ? FX_TO_ARS[a.currency] : 0);
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
    toggleAccount, addAccount,
    upsertTx, deleteTx,
    handleLoadSeed, handleClearAll,
  };
};
