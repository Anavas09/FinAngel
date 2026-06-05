import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: account.id });
  const neg = account.balance < 0;
  let bal = fmtMoney(account.balance, account.currency, privacy);
  if (account.currency === 'USDT' && !privacy) bal = bal.replace(' USDT', '');

  return (
    <div
      ref={setNodeRef}
      className={`fa-account ${account.visible ? '' : 'fa-account-off'}`}
      style={{
        '--swatch': account.color,
        ...(transform ? { transform: CSS.Transform.toString(transform) } : {}),
        transition,
        opacity: isDragging ? 0.5 : 1,
      } as React.CSSProperties}
    >
      <div className="fa-account-rail">
        <span className="fa-account-emoji">{account.emoji}</span>
      </div>
      <div className="fa-account-content">
        <button
          className="fa-drag-handle"
          {...attributes}
          {...listeners}
          aria-label="Arrastrar para reordenar"
          tabIndex={-1}
        >
          ⠿
        </button>
        <div className="fa-account-head">
          <span className="fa-account-kind">{account.kind} · {account.currency}</span>
          <Toggle checked={account.visible} onChange={onToggle} label={`Mostrar ${account.name}`} />
        </div>
        <span className="fa-account-name">{account.name}</span>
        <div className="fa-account-balrow">
          <span className={`fa-account-balance${neg ? ' is-neg' : ''}`}>{bal}</span>
          {!privacy && <span className="fa-account-ccy">{account.currency}</span>}
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
    </div>
  );
};
