import { useEffect, useState } from 'react';

import type { Currency, DebtInput } from '../../types';

interface AddDebtModalProps {
  editing: DebtInput | null;
  onClose: () => void;
  onSave: (fields: Omit<DebtInput, 'id'>) => void;
  onUpdate: (id: string, fields: Partial<Omit<DebtInput, 'id'>>) => void;
}

const CURRENCIES: { value: Currency; label: string }[] = [
  { value: 'ARS',  label: 'ARS $'   },
  { value: 'USD',  label: 'USD US$' },
  { value: 'USDT', label: 'USDT'    },
];

export const AddDebtModal = ({ editing, onClose, onSave, onUpdate }: AddDebtModalProps) => {
  const [name, setName]               = useState('');
  const [currency, setCurrency]       = useState<Currency>('ARS');
  const [totalAmount, setTotalAmount] = useState('');
  const [remaining, setRemaining]     = useState('');
  const [monthly, setMonthly]         = useState('');
  const [dueDate, setDueDate]         = useState('');
  const [interest, setInterest]       = useState('');
  const [note, setNote]               = useState('');

  useEffect(() => {
    if (editing) {
      setName(editing.name);
      setCurrency(editing.currency);
      setTotalAmount(String(editing.totalAmount));
      setRemaining(String(editing.remainingAmount));
      setMonthly(editing.monthlyPayment != null ? String(editing.monthlyPayment) : '');
      setDueDate(editing.dueDate ?? '');
      setInterest(editing.interestRate != null ? String(editing.interestRate) : '');
      setNote(editing.note ?? '');
    }
  }, [editing]);

  const parseNum = (s: string) => parseFloat(s.replace(',', '.')) || 0;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim().slice(0, 60);
    if (!trimmed || !totalAmount) return;
    const fields: Omit<DebtInput, 'id'> = {
      name: trimmed,
      currency,
      totalAmount: parseNum(totalAmount),
      remainingAmount: remaining ? parseNum(remaining) : parseNum(totalAmount),
      status: editing?.status ?? 'active',
      monthlyPayment: monthly ? parseNum(monthly) : undefined,
      dueDate: dueDate || undefined,
      interestRate: interest ? parseNum(interest) : undefined,
      note: note.trim() || undefined,
    };
    if (editing?.id) {
      onUpdate(editing.id, fields);
    } else {
      onSave(fields);
    }
    onClose();
  };

  return (
    <div className="fa-modal-wrap" onClick={onClose}>
      <div className="fa-modal" onClick={e => e.stopPropagation()}>
        <header className="fa-modal-head">
          <h3>{editing?.id ? 'Editar deuda' : 'Nueva deuda'}</h3>
          <button className="fa-iconbtn fa-iconbtn-ghost" onClick={onClose} aria-label="Cerrar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6 L18 18 M18 6 L6 18" />
            </svg>
          </button>
        </header>

        <form onSubmit={submit} className="fa-form">

          <label className="fa-field">
            <span className="fa-field-label">Nombre</span>
            <input
              className="fa-input"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej: Tarjeta Visa, Préstamo banco"
              maxLength={60}
              required
              autoFocus
            />
          </label>

          <div className="fa-field">
            <span className="fa-field-label">Moneda</span>
            <div className="fa-kind-chips">
              {CURRENCIES.map(c => (
                <button
                  key={c.value} type="button"
                  className={`fa-chip ${currency === c.value ? 'fa-chip-active' : ''}`}
                  onClick={() => setCurrency(c.value)}
                >{c.label}</button>
              ))}
            </div>
          </div>

          <label className="fa-field fa-field-amount">
            <span className="fa-field-label">Monto total de la deuda</span>
            <div className="fa-amount-input">
              <span className="fa-amount-currency">{currency === 'ARS' ? '$' : currency === 'USD' ? 'US$' : ''}</span>
              <input
                type="text" inputMode="decimal"
                value={totalAmount}
                onChange={e => { if (e.target.value.replace(/[^0-9.,]/g, '').length <= 14) setTotalAmount(e.target.value); }}
                placeholder="0"
                required
              />
              <span className="fa-amount-ccy">{currency}</span>
            </div>
          </label>

          <label className="fa-field fa-field-amount">
            <span className="fa-field-label">Monto pendiente</span>
            <div className="fa-amount-input">
              <span className="fa-amount-currency">{currency === 'ARS' ? '$' : currency === 'USD' ? 'US$' : ''}</span>
              <input
                type="text" inputMode="decimal"
                value={remaining}
                onChange={e => { if (e.target.value.replace(/[^0-9.,]/g, '').length <= 14) setRemaining(e.target.value); }}
                placeholder={totalAmount || '0'}
              />
              <span className="fa-amount-ccy">{currency}</span>
            </div>
          </label>

          <label className="fa-field fa-field-amount">
            <span className="fa-field-label">Cuota mensual <span style={{ fontWeight: 400, opacity: 0.6 }}>(opcional)</span></span>
            <div className="fa-amount-input">
              <span className="fa-amount-currency">{currency === 'ARS' ? '$' : currency === 'USD' ? 'US$' : ''}</span>
              <input
                type="text" inputMode="decimal"
                value={monthly}
                onChange={e => { if (e.target.value.replace(/[^0-9.,]/g, '').length <= 14) setMonthly(e.target.value); }}
                placeholder="0"
              />
              <span className="fa-amount-ccy">{currency}</span>
            </div>
          </label>

          <label className="fa-field">
            <span className="fa-field-label">Próximo vencimiento <span style={{ fontWeight: 400, opacity: 0.6 }}>(opcional)</span></span>
            <input
              className="fa-input"
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
            />
          </label>

          <label className="fa-field">
            <span className="fa-field-label">Tasa de interés anual % <span style={{ fontWeight: 400, opacity: 0.6 }}>(opcional)</span></span>
            <input
              className="fa-input"
              type="text" inputMode="decimal"
              value={interest}
              onChange={e => setInterest(e.target.value.replace(/[^0-9.,]/g, ''))}
              placeholder="Ej: 65"
            />
          </label>

          <label className="fa-field">
            <span className="fa-field-label">Nota <span style={{ fontWeight: 400, opacity: 0.6 }}>(opcional)</span></span>
            <input
              className="fa-input"
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Ej: Cuota 3 de 12"
              maxLength={100}
            />
          </label>

          <div className="fa-modal-actions">
            <button type="button" className="fa-btn fa-btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="fa-btn fa-btn-primary" disabled={!name.trim() || !totalAmount}>
              {editing?.id ? 'Guardar cambios' : 'Agregar deuda'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
