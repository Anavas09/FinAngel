import { useState, useRef } from 'react';
import type { DebtInput, TransactionInput } from '../types';

export interface ModalState {
  addOpen: boolean;
  setAddOpen: (v: boolean) => void;
  addAccountOpen: boolean;
  setAddAccountOpen: (v: boolean) => void;
  editingTx: TransactionInput | null;
  setEditingTx: (tx: TransactionInput | null) => void;
  exportOpen: boolean;
  setExportOpen: (v: boolean) => void;
  transferOpen: boolean;
  setTransferOpen: (v: boolean) => void;
  debtOpen: boolean;
  setDebtOpen: (v: boolean) => void;
  editingDebt: DebtInput | null;
  setEditingDebt: (d: DebtInput | null) => void;
  toast: { msg: string; onUndo?: () => void } | null;
  showToast: (msg: string, onUndo?: () => void) => void;
  clearToast: () => void;
}

export const useModalState = (): ModalState => {
  const [addOpen, setAddOpen]               = useState(false);
  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const [editingTx, setEditingTx]           = useState<TransactionInput | null>(null);
  const [exportOpen, setExportOpen]         = useState(false);
  const [transferOpen, setTransferOpen]     = useState(false);
  const [debtOpen, setDebtOpen]             = useState(false);
  const [editingDebt, setEditingDebt]       = useState<DebtInput | null>(null);
  const [toast, setToast]                   = useState<{ msg: string; onUndo?: () => void } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string, onUndo?: () => void) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ msg, onUndo });
    toastTimerRef.current = setTimeout(() => setToast(null), onUndo ? 4000 : 2200);
  };

  const clearToast = () => setToast(null);

  return {
    addOpen, setAddOpen,
    addAccountOpen, setAddAccountOpen,
    editingTx, setEditingTx,
    exportOpen, setExportOpen,
    transferOpen, setTransferOpen,
    debtOpen, setDebtOpen,
    editingDebt, setEditingDebt,
    toast, showToast, clearToast,
  };
};
