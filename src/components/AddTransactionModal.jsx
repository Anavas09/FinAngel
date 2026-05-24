import { useState } from 'react';
import { CATEGORIES } from '../data/constants';

export const AddTransactionModal = ({ accounts, editing, onClose, onSave, onDelete }) => {
  const [kind, setKind] = useState(editing ? (editing.amount >= 0 ? 'income' : 'expense') : 'expense');
  const [amount, setAmount] = useState(editing ? String(Math.abs(editing.amount)) : '');
  const [accountId, setAccountId] = useState(editing?.accountId || accounts[0].id);
  const [categoryId, setCategoryId] = useState(editing?.categoryId || 'comida');
  const [note, setNote] = useState(editing?.note || '');
  const [date, setDate] = useState(editing?.date || new Date().toISOString().slice(0, 10));

  const submit = (e) => {
    e.preventDefault();
    const num = parseFloat(amount.replace(',', '.'));
    if (!num || isNaN(num)) return;
    const signed = kind === 'income' ? Math.abs(num) : -Math.abs(num);
    onSave({
      id: editing?.id,
      date,
      accountId,
      categoryId: kind === 'income' ? 'ingreso' : categoryId,
      amount: signed,
      note: note || (kind === 'income' ? 'Ingreso' : 'Gasto'),
    });
  };

  const expenseCats = CATEGORIES.filter(c => c.id !== 'ingreso');
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
            <button type="button" className={kind === 'expense' ? 'active' : ''} onClick={() => setKind('expense')}>
              <span>↓</span> Gasto
            </button>
            <button type="button" className={kind === 'income' ? 'active' : ''} onClick={() => setKind('income')}>
              <span>↑</span> Ingreso
            </button>
          </div>

          <label className="fa-field fa-field-amount">
            <span className="fa-field-label">Monto</span>
            <div className="fa-amount-input">
              <span className="fa-amount-currency">{selectedAccount?.symbol || '$'}</span>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0"
                autoFocus
              />
              <span className="fa-amount-ccy">{selectedAccount?.currency}</span>
            </div>
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
                  style={{ '--swatch': a.color }}
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
                    style={{ '--swatch': c.color }}
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
              />
            </label>
          </div>

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
