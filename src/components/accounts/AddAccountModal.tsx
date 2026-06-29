import { useState } from 'react';

import type { Account, AccountKind, Currency } from '../../types';

interface AddAccountModalProps {
  onClose: () => void;
  onSave: (account: Omit<Account, 'id' | 'visible'>) => void;
}

const KINDS: AccountKind[] = ['Banco', 'Billetera', 'Crédito', 'Cripto'];
const CURRENCIES: { value: Currency; label: string; symbol: string }[] = [
  { value: 'ARS', label: 'ARS $',   symbol: '$'   },
  { value: 'USD', label: 'USD US$', symbol: 'US$' },
  { value: 'USDT',label: 'USDT',   symbol: ''    },
];
const COLORS = ['#7EC4F2', '#B8E6C9', '#FFD66B', '#F4A8C0', '#D4C5F9', '#F49B8A', '#5BB890', '#F26B5E'];
const EMOJIS = ['🏦', '💳', '💵', '🪙', '💰', '📱', '💼', '🏠', '🎯', '💎', '🔒', '⭐'];

export const AddAccountModal = ({ onClose, onSave }: AddAccountModalProps) => {
  const [name, setName]         = useState('');
  const [kind, setKind]         = useState<AccountKind>('Banco');
  const [currency, setCurrency] = useState<Currency>('ARS');
  const [color, setColor]       = useState(COLORS[0]);
  const [emoji, setEmoji]       = useState(EMOJIS[0]);
  const [balance, setBalance]   = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim().slice(0, 50);
    if (!trimmed) return;
    const num = parseFloat(balance.replace(',', '.')) || 0;
    const symbol = CURRENCIES.find(c => c.value === currency)!.symbol;
    onSave({ name: trimmed, kind, currency, symbol, color, emoji, balance: num });
  };

  return (
    <div className="fa-modal-wrap" onClick={onClose}>
      <div className="fa-modal" onClick={e => e.stopPropagation()}>
        <header className="fa-modal-head">
          <h3>Nueva cuenta</h3>
          <button className="fa-iconbtn fa-iconbtn-ghost" onClick={onClose} aria-label="Cerrar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6 L18 18 M18 6 L6 18" />
            </svg>
          </button>
        </header>

        <form onSubmit={submit} className="fa-form">

          {/* Emoji */}
          <div className="fa-field">
            <span className="fa-field-label">Ícono</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {EMOJIS.map(e => (
                <button
                  key={e} type="button"
                  onClick={() => setEmoji(e)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
                    fontSize: 22, width: 40, height: 40,
                    border: emoji === e ? '2px solid var(--ink, #1D1A18)' : '2px solid var(--line-soft, #DBCFB4)',
                    borderRadius: 10, background: emoji === e ? 'var(--bg-elev, #fff)' : 'transparent',
                    cursor: 'pointer',
                    boxShadow: emoji === e ? '2px 2px 0 var(--ink, #1D1A18)' : 'none',
                    transform: emoji === e ? 'translate(-1px,-1px)' : 'none',
                    transition: 'all 100ms',
                  }}
                >{e}</button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div className="fa-field">
            <span className="fa-field-label">Color</span>
            <div style={{ display: 'flex', gap: 8 }}>
              {COLORS.map(c => (
                <button
                  key={c} type="button"
                  onClick={() => setColor(c)}
                  style={{
                    width: 28, height: 28, borderRadius: '50%', background: c,
                    border: color === c ? '3px solid var(--ink, #1D1A18)' : '2px solid var(--line-soft, #DBCFB4)',
                    cursor: 'pointer',
                    transform: color === c ? 'scale(1.2)' : 'scale(1)',
                    transition: 'transform 120ms',
                  }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>

          {/* Nombre */}
          <label className="fa-field">
            <span className="fa-field-label">Nombre</span>
            <input
              className="fa-input"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej: Cuenta corriente"
              maxLength={50}
              required
              autoFocus
            />
          </label>

          {/* Tipo */}
          <div className="fa-field">
            <span className="fa-field-label">Tipo</span>
            <div className="fa-kind-chips">
              {KINDS.map(k => (
                <button
                  key={k} type="button"
                  className={`fa-chip ${kind === k ? 'fa-chip-active' : ''}`}
                  onClick={() => setKind(k)}
                >{k}</button>
              ))}
            </div>
          </div>

          {/* Moneda */}
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

          {/* Saldo inicial */}
          <label className="fa-field fa-field-amount">
            <span className="fa-field-label">Saldo inicial</span>
            <div className="fa-amount-input">
              <span className="fa-amount-currency">
                {CURRENCIES.find(c => c.value === currency)!.symbol || currency}
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={balance}
                onChange={e => { if (e.target.value.replace(/[^0-9]/g, '').length <= 12) setBalance(e.target.value); }}
                placeholder="0"
              />
              <span className="fa-amount-ccy">{currency}</span>
            </div>
          </label>

          <div className="fa-modal-actions">
            <button type="button" className="fa-btn fa-btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="fa-btn fa-btn-primary" disabled={!name.trim()}>
              Crear cuenta
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
