import { EyeToggle } from '../ui/EyeToggle';
import { BudgetAlert } from '../ui/BudgetAlert';
import { fmtMoney } from '../../data/utils';
import type { Budget, ChartDataItem, Currency } from '../../types';

interface TotalCardProps {
  totalARS: number;
  totals: Record<Currency, number>;
  privacy: boolean;
  setPrivacy: (v: boolean) => void;
  monthNet: number;
  budgetAlert?: 'critical' | 'warning' | null;
  totalBudgeted?: number;
  monthIncome?: number;
  budgets?: Budget[];
  categoryData?: ChartDataItem[];
}

const BudgetChips = ({ budgets, categoryData }: { budgets: Budget[]; categoryData: ChartDataItem[] }) => {
  const fulfilled = budgets
    .map(b => ({ b, cat: categoryData.find(d => d.id === b.categoryId) }))
    .filter(({ b, cat }) => cat && cat.value >= b.amount);

  if (fulfilled.length === 0) return null;

  return (
    <div style={{ gridColumn: '1 / -1', display: 'flex', flexWrap: 'wrap', gap: 6, padding: '0 16px 16px' }}>
      {fulfilled.map(({ b, cat }) => {
        const over = cat!.value > b.amount * 1.1;
        return (
          <span key={b.categoryId} style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
            background: over ? '#C13B3B22' : '#5BB89022',
            color: over ? '#C13B3B' : '#5BB890',
            border: `1px solid ${over ? '#C13B3B55' : '#5BB89055'}`,
          }}>
            {cat!.icon} {cat!.label} {over ? '⚠' : '✓'}
          </span>
        );
      })}
    </div>
  );
};

const DecorBlobs = () => (
  <svg className="fa-total-blobs" viewBox="0 0 400 200" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">
    <circle cx="340" cy="40" r="70" fill="#FFD66B" opacity="0.5" />
    <circle cx="380" cy="160" r="50" fill="#F49B8A" opacity="0.4" />
    <circle cx="280" cy="170" r="22" fill="#B8E6C9" opacity="0.7" />
  </svg>
);

export const TotalCard = ({ totalARS, totals, privacy, setPrivacy, monthNet, budgetAlert, totalBudgeted, monthIncome, budgets, categoryData }: TotalCardProps) => {
  const positive = monthNet >= 0;
  return (
    <section className="fa-total">
      <div className="fa-total-main">
        <span className="fa-total-eyebrow">Patrimonio total (≈ ARS)</span>
        <div className="fa-total-amount-row">
          <h2 className="fa-total-amount">{fmtMoney(totalARS, 'ARS', privacy)}</h2>
          <EyeToggle privacy={privacy} setPrivacy={setPrivacy} variant="dark" />
        </div>
        <div className="fa-total-delta" data-positive={positive}>
          <span className="fa-total-delta-arrow">{positive ? '↑' : '↓'}</span>
          <span>{fmtMoney(Math.abs(monthNet), 'ARS', privacy)} este mes</span>
        </div>
      </div>
      <div className="fa-total-breakdown">
        {(Object.entries(totals) as [Currency, number][])
          .filter(([, v]) => v !== 0)
          .map(([ccy, v]) => (
            <div key={ccy} className="fa-total-ccy">
              <span className="fa-total-ccy-label">{ccy}</span>
              <span className="fa-total-ccy-value">{fmtMoney(v, ccy, privacy)}</span>
            </div>
          ))}
      </div>
      {budgetAlert && totalBudgeted !== undefined && monthIncome !== undefined && (
        <div style={{ padding: '0 16px 16px' }}>
          <BudgetAlert level={budgetAlert} totalBudgeted={totalBudgeted} totalInARS={totalARS} monthIncome={monthIncome} />
        </div>
      )}
      {budgets && categoryData && <BudgetChips budgets={budgets} categoryData={categoryData} />}
      <DecorBlobs />
    </section>
  );
};
