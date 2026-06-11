import { useState } from 'react';
import { fmtMoney } from '../../data/utils';
import type { Account } from '../../types';

interface TransferModalProps {
  accounts: Account[];
  onClose: () => void;
  onSave: (fromId: string, toId: string, amount: number, date: string, note: string) => void;
  privacy: boolean;
}

export const TransferModal = ({ accounts, onClose, onSave, privacy }: TransferModalProps) => {
  const [fromId, setFromId] = useState(accounts[0]?.id ?? '');
  const [toId, setToId]     = useState(accounts[1]?.id ?? accounts[0]?.id ?? '');
  const [amount, setAmount] = useState('');
  const [date, setDate]     = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote]     = useState('');
  const [amountError, setAmountError] = useState(false);
  const [accountError, setAccountError] = useState(false);

  const fromAccount = accounts.find(a => a.id === fromId);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount.replace(',', '.'));
    if (!num || isNaN(num) || num <= 0) { setAmountError(true); return; }
    setAmountError(false);
    if (fromId === toId) return;
    if (fromAccount && num > fromAccount.balance) { setAccountError(true); return; }
    setAccountError(false);
    onSave(fromId, toId, num, date, note.trim() || 'Transferencia');
  };

  return (
    <div className="fa-modal-wrap" onClick={onClose}>
      <div className="fa-modal" onClick={e => e.stopPropagation()}>
        <div className="fa-modal-handle" />
        <header className="fa-modal-head">
          <h3>Transferencia entre cuentas</h3>
          <button className="fa-iconbtn fa-iconbtn-ghost" onClick={onClose} aria-label="Cerrar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6 L18 18 M18 6 L6 18" />
            </svg>
          </button>
        </header>

        <form onSubmit={submit} className="fa-form">
          <label className="fa-field">
            <span className="fa-field-label">Desde</span>
            <div className="fa-account-chips">
              {accounts.map(a => (
                <button
                  key={a.id}
                  type="button"
                  className={`fa-account-chip ${fromId === a.id ? 'active' : ''}`}
                  onClick={() => { setFromId(a.id); setAccountError(false); if (toId === a.id) setToId(accounts.find(x => x.id !== a.id)?.id ?? ''); }}
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
            {accountError && fromAccount && (
              <span style={{ fontSize: 11, color: '#C44A3D', marginTop: 4, display: 'block' }}>
                Saldo insuficiente{!privacy ? ` (disponible: ${fmtMoney(fromAccount.balance, fromAccount.currency, false)})` : ''}
              </span>
            )}
          </label>

          <label className="fa-field">
            <span className="fa-field-label">Hacia</span>
            <div className="fa-account-chips">
              {accounts.filter(a => a.id !== fromId).map(a => (
                <button
                  key={a.id}
                  type="button"
                  className={`fa-account-chip ${toId === a.id ? 'active' : ''}`}
                  onClick={() => setToId(a.id)}
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
            <span className="fa-field-label">Monto</span>
            <div className="fa-amount-input" style={amountError ? { border: '2px solid #C44A3D', borderRadius: 12 } : undefined}>
              <span className="fa-amount-currency">{fromAccount?.symbol ?? '$'}</span>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={e => { setAmountError(false); setAccountError(false); if (e.target.value.replace(/[^0-9]/g, '').length <= 12) setAmount(e.target.value); }}
                placeholder="0"
                autoFocus
              />
              <span className="fa-amount-ccy">{fromAccount?.currency}</span>
            </div>
            {amountError && <span style={{ fontSize: 11, color: '#C44A3D', marginTop: 4, display: 'block' }}>Ingresá un monto válido mayor a cero</span>}
          </label>

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
                placeholder="ej. Paso a cripto"
                maxLength={200}
              />
            </label>
          </div>

          <div className="fa-modal-actions">
            <button type="button" className="fa-btn fa-btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="fa-btn fa-btn-primary">Transferir</button>
          </div>
        </form>
      </div>
    </div>
  );
};
