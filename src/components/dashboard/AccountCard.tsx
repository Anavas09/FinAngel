import { Toggle } from '../ui/Toggle';
import { fmtMoney } from '../../data/utils';
import type { Account } from '../../types';

interface AccountCardProps {
  account: Account;
  onToggle: () => void;
  privacy: boolean;
}

export const AccountCard = ({ account, onToggle, privacy }: AccountCardProps) => (
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
  </div>
);
