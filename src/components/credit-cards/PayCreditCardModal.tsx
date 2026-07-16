import { useRef, useState } from 'react';

import { fmtMoney } from '../../data/utils';

import type { Account, CreditCard, TransactionInput } from '../../types';

interface Props {
  card: CreditCard;
  accounts: Account[];
  privacy: boolean;
  onClose: () => void;
  onSave: (tx: TransactionInput, cardId: string) => void;
}

export const PayCreditCardModal = ({ card, accounts, privacy, onClose, onSave }: Props) => {
  const eligible = accounts.filter(a => a.visible && a.currency === card.currency);
  const [accountId, setAccountId] = useState(eligible[0]?.id ?? '');
  const [amount, setAmount]       = useState(String(card.currentBalance));
  const [date, setDate]           = useState(new Date().toISOString().slice(0, 10));
  const [amountError, setAmountError] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);
  const acc = eligible.find(a => a.id === accountId);

  if (eligible.length === 0) {
    return (
      <div className="fa-modal-wrap" onClick={onClose}>
        <div className="fa-modal" onClick={e => e.stopPropagation()}>
          <div className="fa-modal-handle" />
          <header className="fa-modal-head">
            <h3>Pagar tarjeta</h3>
            <button className="fa-iconbtn fa-iconbtn-ghost" onClick={onClose} aria-label="Cerrar">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6 L18 18 M18 6 L6 18" />
              </svg>
            </button>
          </header>
          <p style={{ padding: '16px 20px', textAlign: 'center', opacity: 0.7 }}>
            No tenés cuentas en <strong>{card.currency}</strong> para registrar este pago.
          </p>
          <div className="fa-modal-actions">
            <button type="button" className="fa-btn fa-btn-ghost" onClick={onClose}>Cerrar</button>
          </div>
        </div>
      </div>
    );
  }

  const setError = () => { setAmountError(true); amountRef.current?.focus(); };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount.replace(',', '.'));
    if (!num || isNaN(num) || num <= 0 || num > card.currentBalance) { setError(); return; }
    if (acc && num > acc.balance) { setError(); return; }
    onSave(
      { date, accountId, categoryId: 'envio_pago', amount: -num, note: `Pago tarjeta ${card.name}`, creditCardId: card.id },
      card.id,
    );
  };

  const num = parseFloat(amount.replace(',', '.')) || 0;
  const availableLimit = Math.max(0, card.creditLimit - card.currentBalance);
  const showInterest = (card.interestRate ?? 0) > 0 && card.currentBalance > 0;
  const minPayment = card.currentBalance * ((card.minPaymentPct ?? 5) / 100);
  const interestIfMin = showInterest
    ? (card.currentBalance - minPayment) * (card.interestRate! / 12 / 100)
    : 0;

  return (
    <div className="fa-modal-wrap" onClick={onClose}>
      <div className="fa-modal" onClick={e => e.stopPropagation()}>
        <div className="fa-modal-handle" />
        <header className="fa-modal-head">
          <h3>Pago — {card.name}</h3>
          <button className="fa-iconbtn fa-iconbtn-ghost" onClick={onClose} aria-label="Cerrar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6 L18 18 M18 6 L6 18" />
            </svg>
          </button>
        </header>

        <form onSubmit={submit} className="fa-form">

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, opacity: 0.7, marginBottom: 4 }}>
            <span>Disponible: {fmtMoney(availableLimit, card.currency, privacy)}</span>
            <span>Límite: {fmtMoney(card.creditLimit, card.currency, privacy)}</span>
          </div>

          <label className="fa-field">
            <span className="fa-field-label">Cuenta ({card.currency})</span>
            <div className="fa-account-chips">
              {eligible.map(a => (
                <button
                  key={a.id}
                  type="button"
                  className={`fa-account-chip ${accountId === a.id ? 'active' : ''}`}
                  onClick={() => { setAccountId(a.id); setAmountError(false); }}
                  style={{ '--swatch': a.color } as React.CSSProperties}
                >
                  <span>{a.emoji}</span> {a.name}
                  {!privacy && (
                    <span style={{ opacity: 0.6, fontSize: 11, marginLeft: 4 }}>
                      {fmtMoney(a.balance, a.currency, false)}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </label>

          <label className="fa-field fa-field-amount">
            <span className="fa-field-label">
              Monto (máx. {card.currentBalance.toLocaleString('es-AR')} {card.currency})
            </span>
            <div className="fa-amount-input" style={amountError ? { border: '2px solid #C44A3D', borderRadius: 12 } : undefined}>
              <span className="fa-amount-currency">{card.currency === 'ARS' ? '$' : card.currency === 'USD' ? 'US$' : ''}</span>
              <input
                ref={amountRef}
                type="text"
                inputMode="decimal"
                value={amount}
                autoFocus
                onChange={e => { setAmountError(false); if (e.target.value.replace(/[^0-9]/g, '').length <= 12) setAmount(e.target.value); }}
                placeholder="0"
              />
              <span className="fa-amount-ccy">{card.currency}</span>
            </div>
            {amountError && (
              <span style={{ fontSize: 11, color: '#C44A3D', marginTop: 4, display: 'block' }}>
                {acc && num > acc.balance
                  ? `Saldo insuficiente${!privacy ? ` (disponible: ${fmtMoney(acc.balance, card.currency, false)})` : ''}`
                  : `Monto inválido (máx. ${card.currentBalance.toLocaleString('es-AR')})`
                }
              </span>
            )}
          </label>

          <label className="fa-field">
            <span className="fa-field-label">Fecha</span>
            <input className="fa-input" type="date" value={date} onChange={e => setDate(e.target.value)} />
          </label>

          {showInterest && (
            <div style={{
              background: 'var(--bg-elev, #fff)',
              border: '2px solid var(--line-soft, #DBCFB4)',
              borderRadius: 10,
              padding: '10px 14px',
              fontSize: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}>
              <span style={{ fontWeight: 700, marginBottom: 2 }}>Calculadora de intereses</span>
              <span>Pago mínimo estimado: <strong>{fmtMoney(minPayment, card.currency, privacy)}</strong></span>
              {num > 0 && num >= card.currentBalance ? (
                <span style={{ color: '#5BB890', fontWeight: 600 }}>✓ Pagás el total — sin interés</span>
              ) : num > 0 && num >= minPayment ? (
                <span style={{ opacity: 0.75 }}>
                  Restante: {fmtMoney(card.currentBalance - num, card.currency, privacy)} — interés estimado: {fmtMoney((card.currentBalance - num) * (card.interestRate! / 12 / 100), card.currency, false)}
                </span>
              ) : (
                <span style={{ color: '#F26B5E' }}>
                  Si pagás el mínimo, generarás ~{fmtMoney(interestIfMin, card.currency, false)} de interés este mes
                </span>
              )}
            </div>
          )}

          <div className="fa-modal-actions">
            <button type="button" className="fa-btn fa-btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="fa-btn fa-btn-primary">Registrar pago</button>
          </div>
        </form>
      </div>
    </div>
  );
};
