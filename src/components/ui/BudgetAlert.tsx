import { fmtMoney } from '../../data/utils';

interface BudgetAlertProps {
  level: 'critical' | 'warning';
  totalBudgeted: number;
  totalInARS: number;
  monthIncome: number;
  amountLabel?: string;
}

export const BudgetAlert = ({ level, totalBudgeted, totalInARS, monthIncome, amountLabel = 'Presupuestado' }: BudgetAlertProps) => (
  <div style={{
    background: level === 'critical' ? '#FDECEA' : '#FFF4E5',
    color: level === 'critical' ? '#C13B3B' : '#E07B00',
    borderRadius: 10, padding: '8px 12px', fontSize: 12,
    display: 'flex', flexDirection: 'column', gap: 2,
  }}>
    <span style={{ fontWeight: 700 }}>
      {level === 'critical' ? '🚨 Superás tu patrimonio total' : '⚠️ Superás tus ingresos del mes'}
    </span>
    <span style={{ opacity: 0.85 }}>
      {amountLabel}: {fmtMoney(totalBudgeted, 'ARS', false)} ·{' '}
      {level === 'critical'
        ? `Patrimonio: ${fmtMoney(totalInARS, 'ARS', false)}`
        : `Ingresos: ${fmtMoney(monthIncome, 'ARS', false)}`}
    </span>
  </div>
);
