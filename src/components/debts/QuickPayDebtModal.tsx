import { useRef, useState } from 'react';
import { fmtMoney } from '../../data/utils';
import type { Account, Debt, TransactionInput } from '../../types';

interface Props {
  debt: Debt;
  accounts: Account[];
  onClose: () => void;
  onSave: (tx: TransactionInput, debtId: string) => void;
  privacy: boolean;
}

export const QuickPayDebtModal = ({ debt, accounts, onClose, onSave, privacy }: Props) => {
  const eligible = accounts.filter(a => a.visible && a.currency === debt.currency);
  const [accountId, setAccountId] = useState(eligible[0]?.id ?? '');
  const [amount, setAmount] = useState(String(debt.monthlyPayment ?? debt.remainingAmount));
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [amountError, setAmountError] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);
  const acc = eligible.find(a => a.id === accountId);

  if (eligible.length === 0) {
    return (
      <div className="fa-modal-wrap" onClick={onClose}>
        <div className="fa-modal" onClick={e => e.stopPropagation()}>
          <div className="fa-modal-handle" />
          <header className="fa-modal-head">
            <h3>Registrar pago</h3>
            <button className="fa-iconbtn fa-iconbtn-ghost" onClick={onClose} aria-label="Cerrar">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6 L18 18 M18 6 L6 18" />
              </svg>
            </button>
          </header>
          <p style={{ padding: '16px 20px', textAlign: 'center', opacity: 0.7 }}>
            No tenés cuentas en <strong>{debt.currency}</strong> para registrar este pago.
          </p>
          <div className="fa-modal-actions">
            <button type="button" className="fa-btn fa-btn-ghost" onClick={onClose}>Cerrar</button>
          </div>
        </div>
      </div>
    );
  }

  const selectedAcc = eligible.find(a => a.id === accountId);

  const setError = () => { setAmountError(true); amountRef.current?.focus(); };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount.replace(',', '.'));
    if (!num || isNaN(num) || num <= 0 || num > debt.remainingAmount) {
      setError(); return;
    }
    if (selectedAcc && num > selectedAcc.balance) {
      setError(); return;
    }
    onSave(
      { date, accountId, categoryId: 'envio_pago', amount: -num, note: `Pago de ${debt.name}`, debtId: debt.id },
      debt.id,
    );
  };

  return (
    <div className="fa-modal-wrap" onClick={onClose}>
      <div className="fa-modal" onClick={e => e.stopPropagation()}>
        <div className="fa-modal-handle" />
        <header className="fa-modal-head">
          <h3>Pago — {debt.name}</h3>
          <button className="fa-iconbtn fa-iconbtn-ghost" onClick={onClose} aria-label="Cerrar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6 L18 18 M18 6 L6 18" />
            </svg>
          </button>
        </header>

        <form onSubmit={submit} className="fa-form">
          <label className="fa-field">
            <span className="fa-field-label">Cuenta ({debt.currency})</span>
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
              Monto (máx. {debt.remainingAmount.toLocaleString('es-AR')} {debt.currency})
            </span>
            <div className="fa-amount-input" style={amountError ? { border: '2px solid #C44A3D', borderRadius: 12 } : undefined}>
              <span className="fa-amount-currency">{acc?.symbol ?? '$'}</span>
              <input
                ref={amountRef}
                type="text"
                inputMode="decimal"
                value={amount}
                autoFocus
                onChange={e => { setAmountError(false); if (e.target.value.replace(/[^0-9]/g, '').length <= 12) setAmount(e.target.value); }}
                placeholder="0"
              />
              <span className="fa-amount-ccy">{debt.currency}</span>
            </div>
            {amountError && (
              <span style={{ fontSize: 11, color: '#C44A3D', marginTop: 4, display: 'block' }}>
                {selectedAcc && parseFloat(amount.replace(',', '.')) > selectedAcc.balance
                  ? `Saldo insuficiente${!privacy ? ` (disponible: ${fmtMoney(selectedAcc.balance, debt.currency, false)})` : ''}`
                  : `Monto inválido (máx. ${debt.remainingAmount.toLocaleString('es-AR')})`
                }
              </span>
            )}
          </label>

          <label className="fa-field">
            <span className="fa-field-label">Fecha</span>
            <input className="fa-input" type="date" value={date} onChange={e => setDate(e.target.value)} />
          </label>

          <div className="fa-modal-actions">
            <button type="button" className="fa-btn fa-btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="fa-btn fa-btn-primary">Registrar pago</button>
          </div>
        </form>
      </div>
    </div>
  );
};
