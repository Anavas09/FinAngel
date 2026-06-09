import { useState } from 'react';
import { CATEGORIES } from '../../data/constants';
import type { Account, Transaction, TransactionInput } from '../../types';

interface AddTransactionModalProps {
  accounts: Account[];
  editing: TransactionInput | null;
  onClose: () => void;
  onSave: (tx: TransactionInput) => void;
  onDelete: (() => void) | null;
}

export const AddTransactionModal = ({ accounts, editing, onClose, onSave, onDelete }: AddTransactionModalProps) => {
  const [kind, setKind] = useState<'income' | 'expense'>(
    editing ? (editing.amount >= 0 ? 'income' : 'expense') : 'expense'
  );
  const [amount, setAmount] = useState(editing ? String(Math.abs(editing.amount)) : '');
  const [accountId, setAccountId] = useState(editing?.accountId ?? accounts[0].id);
  const [categoryId, setCategoryId] = useState(editing?.categoryId ?? 'comida');
  const [note, setNote] = useState(editing?.note ?? '');
  const [date, setDate] = useState(editing?.date ?? new Date().toISOString().slice(0, 10));
  const [amountError, setAmountError] = useState(false);
  const [recurring, setRecurring] = useState<Transaction['recurring'] | ''>(editing?.recurring ?? '');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount.replace(',', '.'));
    if (!num || isNaN(num) || num <= 0) { setAmountError(true); return; }
    setAmountError(false);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    const signed = kind === 'income' ? Math.abs(num) : -Math.abs(num);
    const cleanNote = (note.trim() || (kind === 'income' ? 'Ingreso' : 'Gasto')).slice(0, 200);
    onSave({
      id: editing?.id,
      date,
      accountId,
      categoryId: kind === 'income' ? 'ingreso' : categoryId,
      amount: signed,
      note: cleanNote,
      ...(recurring ? { recurring } : {}),
    });
  };

  const expenseCats = CATEGORIES.filter(c => c.id !== 'ingreso' && c.id !== 'transfer');
  const selectedAccount = accounts.find(a => a.id === accountId);

  return (
    <div className="fa-modal-wrap" onClick={onClose}>
      <div className="fa-modal" onClick={e => e.stopPropagation()}>
        <div className="fa-modal-handle" />
        <header className="fa-modal-head">
          <h3>{editing ? 'Editar movimiento' : 'Nuevo movimiento'}</h3>
          <button className="fa-iconbtn fa-iconbtn-ghost" onClick={onClose} aria-label="Cerrar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6 L18 18 M18 6 L6 18" />
            </svg>
          </button>
        </header>

        <form onSubmit={submit} className="fa-form">
          <div className="fa-kind-tabs">
            <button type="button" data-kind="expense" className={kind === 'expense' ? 'active' : ''} onClick={() => setKind('expense')}>
              <span>↓</span> Gasto
            </button>
            <button type="button" data-kind="income" className={kind === 'income' ? 'active' : ''} onClick={() => setKind('income')}>
              <span>↑</span> Ingreso
            </button>
          </div>

          <label className="fa-field fa-field-amount">
            <span className="fa-field-label">Monto</span>
            <div className="fa-amount-input" style={amountError ? { border: '2px solid #C44A3D', borderRadius: 12 } : undefined}>
              <span className="fa-amount-currency">{selectedAccount?.symbol ?? '$'}</span>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={e => { setAmountError(false); if (e.target.value.replace(/[^0-9]/g, '').length <= 12) setAmount(e.target.value); }}
                placeholder="0"
                autoFocus
              />
              <span className="fa-amount-ccy">{selectedAccount?.currency}</span>
            </div>
            {amountError && <span style={{ fontSize: 11, color: '#C44A3D', marginTop: 4, display: 'block' }}>Ingresá un monto válido mayor a cero</span>}
          </label>

          <label className="fa-field">
            <span className="fa-field-label">Cuenta</span>
            <div className="fa-account-chips">
              {accounts.map(a => (
                <button
                  key={a.id}
                  type="button"
                  className={`fa-account-chip ${accountId === a.id ? 'active' : ''}`}
                  onClick={() => setAccountId(a.id)}
                  style={{ '--swatch': a.color } as React.CSSProperties}
                >
                  <span>{a.emoji}</span> {a.name}
                </button>
              ))}
            </div>
          </label>

          {kind === 'expense' && (
            <label className="fa-field">
              <span className="fa-field-label">Categoría</span>
              <div className="fa-cat-grid">
                {expenseCats.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    className={`fa-cat-chip ${categoryId === c.id ? 'active' : ''}`}
                    onClick={() => setCategoryId(c.id)}
                    style={{ '--swatch': c.color } as React.CSSProperties}
                  >
                    <span className="fa-cat-chip-icon">{c.icon}</span>
                    <span>{c.label}</span>
                  </button>
                ))}
              </div>
            </label>
          )}

          <div className="fa-field-row">
            <label className="fa-field">
              <span className="fa-field-label">Fecha</span>
              <input className="fa-input" type="date" value={date} onChange={e => setDate(e.target.value)} />
            </label>
            <label className="fa-field">
              <span className="fa-field-label">Nota</span>
              <input
                className="fa-input"
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="ej. Café con Lu"
                maxLength={200}
              />
            </label>
          </div>

          <label className="fa-field">
            <span className="fa-field-label">Repetir</span>
            <select
              className="fa-input"
              value={recurring}
              onChange={e => setRecurring(e.target.value as Transaction['recurring'] | '')}
              style={{ fontSize: 13 }}
            >
              <option value="">No repetir</option>
              <option value="monthly">Cada mes 📅</option>
              <option value="weekly">Cada semana 🔁</option>
            </select>
          </label>

          <div className="fa-modal-actions">
            {onDelete && (
              <button type="button" className="fa-btn fa-btn-danger" onClick={onDelete}>Eliminar</button>
            )}
            <button type="button" className="fa-btn fa-btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="fa-btn fa-btn-primary">{editing ? 'Guardar' : 'Agregar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};
