import { FinAngel } from './Mascot';
import { catById, fmtMoney, fmtDate } from '../data/utils';

export const TransactionList = ({ transactions, accounts, privacy, onEdit }) => {
  if (transactions.length === 0) {
    return (
      <div className="fa-empty">
        <FinAngel mood="sleepy" size={120} />
        <p>Nada por acá todavía. Agregá tu primer movimiento ✨</p>
      </div>
    );
  }

  const groups = transactions.reduce((acc, t) => {
    (acc[t.date] = acc[t.date] || []).push(t);
    return acc;
  }, {});

  return (
    <div className="fa-tx-list">
      {Object.entries(groups).map(([date, items]) => (
        <div key={date} className="fa-tx-group">
          <div className="fa-tx-date">{fmtDate(date)}</div>
          <div className="fa-tx-items">
            {items.map((t) => {
              const cat = catById(t.categoryId);
              const acc = accounts.find(a => a.id === t.accountId);
              const positive = t.amount >= 0;
              return (
                <div key={t.id} className="fa-tx" onClick={() => onEdit(t)}>
                  <div className="fa-tx-icon" style={{ background: `${cat.color}22`, color: cat.color }}>
                    <span>{cat.icon}</span>
                  </div>
                  <div className="fa-tx-text">
                    <span className="fa-tx-note">{t.note}</span>
                    <span className="fa-tx-meta">{cat.label} · {acc?.name}</span>
                  </div>
                  <div className="fa-tx-amount" data-positive={positive}>
                    {positive ? '+' : ''}{fmtMoney(t.amount, acc?.currency || 'ARS', privacy)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
