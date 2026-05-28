import { useState } from 'react';
import { Toggle } from '../ui/Toggle';
import { fmtMoney } from '../../data/utils';
import type { Account } from '../../types';

interface AccountCardProps {
  account: Account;
  onToggle: () => void;
  privacy: boolean;
  onDelete?: () => void;
}

export const AccountCard = ({ account, onToggle, privacy, onDelete }: AccountCardProps) => {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div
      className={`fa-account ${account.visible ? '' : 'fa-account-off'}`}
      style={{ '--swatch': account.color } as React.CSSProperties}
    >
      <div className="fa-account-head">
        <div className="fa-account-emoji">{account.emoji}</div>
        <Toggle checked={account.visible} onChange={onToggle} label={`Mostrar ${account.name}`} />
      </div>
      <div className="fa-account-body">
        <span className="fa-account-name">{account.name}</span>
        <span className="fa-account-kind">{account.kind} · {account.currency}</span>
        <span className="fa-account-balance">{fmtMoney(account.balance, account.currency, privacy)}</span>
      </div>
      {onDelete && (
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          {confirmDelete ? (
            <>
              <button
                className="fa-btn fa-btn-danger"
                style={{ padding: '6px 14px', fontSize: 12 }}
                onClick={() => { onDelete(); setConfirmDelete(false); }}
              >
                ¿Eliminar?
              </button>
              <button
                className="fa-btn fa-btn-ghost"
                style={{ padding: '6px 14px', fontSize: 12 }}
                onClick={() => setConfirmDelete(false)}
              >
                Cancelar
              </button>
            </>
          ) : (
            <button
              className="fa-btn fa-btn-ghost"
              style={{ padding: '6px 14px', fontSize: 12, marginLeft: 'auto' }}
              onClick={() => setConfirmDelete(true)}
            >
              🗑 Eliminar
            </button>
          )}
        </div>
      )}
    </div>
  );
};
