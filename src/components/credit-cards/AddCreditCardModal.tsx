import { useEffect, useState } from 'react';

import type { CreditCardInput, Currency } from '../../types';

interface AddCreditCardModalProps {
  editing: CreditCardInput | null;
  onClose: () => void;
  onSave: (fields: Omit<CreditCardInput, 'id'>) => void;
  onUpdate: (id: string, fields: Partial<Omit<CreditCardInput, 'id'>>) => void;
}

const CURRENCIES: { value: Currency; label: string }[] = [
  { value: 'ARS',  label: 'ARS $'   },
  { value: 'USD',  label: 'USD US$' },
  { value: 'USDT', label: 'USDT'    },
];

const currencySymbol = (c: Currency) => c === 'ARS' ? '$' : c === 'USD' ? 'US$' : '';

export const AddCreditCardModal = ({ editing, onClose, onSave, onUpdate }: AddCreditCardModalProps) => {
  const [name, setCname]             = useState('');
  const [currency, setCurrency]      = useState<Currency>('ARS');
  const [creditLimit, setCreditLimit] = useState('');
  const [currentBalance, setBalance] = useState('0');
  const [closingDay, setClosingDay]  = useState('');
  const [dueDay, setDueDay]          = useState('');
  const [interest, setInterest]      = useState('');
  const [minPct, setMinPct]          = useState('');
  const [note, setNote]              = useState('');

  useEffect(() => {
    if (editing) {
      setCname(editing.name);
      setCurrency(editing.currency);
      setCreditLimit(String(editing.creditLimit));
      setBalance(String(editing.currentBalance));
      setClosingDay(editing.closingDay != null ? String(editing.closingDay) : '');
      setDueDay(editing.dueDay != null ? String(editing.dueDay) : '');
      setInterest(editing.interestRate != null ? String(editing.interestRate) : '');
      setMinPct(editing.minPaymentPct != null ? String(editing.minPaymentPct) : '');
      setNote(editing.note ?? '');
    }
  }, [editing]);

  const parseNum = (s: string) => parseFloat(s.replace(',', '.')) || 0;
  const parseDay = (s: string) => { const n = parseInt(s, 10); return n >= 1 && n <= 31 ? n : undefined; };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim().slice(0, 60);
    if (!trimmed || !creditLimit) return;
    const fields: Omit<CreditCardInput, 'id'> = {
      name: trimmed,
      currency,
      creditLimit: parseNum(creditLimit),
      currentBalance: parseNum(currentBalance),
      status: editing?.status ?? 'active',
      closingDay: parseDay(closingDay),
      dueDay: parseDay(dueDay),
      interestRate: interest ? parseNum(interest) : undefined,
      minPaymentPct: minPct ? parseNum(minPct) : undefined,
      note: note.trim() || undefined,
    };
    if (editing?.id) {
      onUpdate(editing.id, fields);
    } else {
      onSave(fields);
    }
    onClose();
  };

  const sym = currencySymbol(currency);

  return (
    <div className="fa-modal-wrap" onClick={onClose}>
      <div className="fa-modal" onClick={e => e.stopPropagation()}>
        <header className="fa-modal-head">
          <h3>{editing?.id ? 'Editar tarjeta' : 'Nueva tarjeta de crédito'}</h3>
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
              onChange={e => setCname(e.target.value)}
              placeholder="Ej: Visa Santander, Mastercard BBVA"
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
            <span className="fa-field-label">Límite de crédito</span>
            <div className="fa-amount-input">
              <span className="fa-amount-currency">{sym}</span>
              <input
                type="text" inputMode="decimal"
                value={creditLimit}
                onChange={e => { if (e.target.value.replace(/[^0-9.,]/g, '').length <= 14) setCreditLimit(e.target.value); }}
                placeholder="0"
                required
              />
              <span className="fa-amount-ccy">{currency}</span>
            </div>
          </label>

          <label className="fa-field fa-field-amount">
            <span className="fa-field-label">Saldo actual <span style={{ fontWeight: 400, opacity: 0.6 }}>(lo que debés pagar)</span></span>
            <div className="fa-amount-input">
              <span className="fa-amount-currency">{sym}</span>
              <input
                type="text" inputMode="decimal"
                value={currentBalance}
                onChange={e => { if (e.target.value.replace(/[^0-9.,]/g, '').length <= 14) setBalance(e.target.value); }}
                placeholder="0"
              />
              <span className="fa-amount-ccy">{currency}</span>
            </div>
          </label>

          <div className="fa-field">
            <span className="fa-field-label">Días del ciclo <span style={{ fontWeight: 400, opacity: 0.6 }}>(opcional)</span></span>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="fa-input"
                type="number" inputMode="numeric" min={1} max={31}
                value={closingDay}
                onChange={e => setClosingDay(e.target.value)}
                placeholder="Día de cierre"
                style={{ flex: 1 }}
              />
              <input
                className="fa-input"
                type="number" inputMode="numeric" min={1} max={31}
                value={dueDay}
                onChange={e => setDueDay(e.target.value)}
                placeholder="Día de vencimiento"
                style={{ flex: 1 }}
              />
            </div>
          </div>

          <label className="fa-field">
            <span className="fa-field-label">TNA % <span style={{ fontWeight: 400, opacity: 0.6 }}>(opcional)</span></span>
            <input
              className="fa-input"
              type="text" inputMode="decimal"
              value={interest}
              onChange={e => setInterest(e.target.value.replace(/[^0-9.,]/g, ''))}
              placeholder="Ej: 120"
            />
          </label>

          <label className="fa-field">
            <span className="fa-field-label">Pago mínimo % <span style={{ fontWeight: 400, opacity: 0.6 }}>(opcional, default 5%)</span></span>
            <input
              className="fa-input"
              type="text" inputMode="decimal"
              value={minPct}
              onChange={e => setMinPct(e.target.value.replace(/[^0-9.,]/g, ''))}
              placeholder="5"
            />
          </label>

          <label className="fa-field">
            <span className="fa-field-label">Nota <span style={{ fontWeight: 400, opacity: 0.6 }}>(opcional)</span></span>
            <input
              className="fa-input"
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Ej: uso solo para supermercado"
              maxLength={100}
            />
          </label>

          <div className="fa-modal-actions">
            <button type="button" className="fa-btn fa-btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="fa-btn fa-btn-primary" disabled={!name.trim() || !creditLimit}>
              {editing?.id ? 'Guardar cambios' : 'Agregar tarjeta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
