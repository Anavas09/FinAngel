import { Donut } from './Donut';
import { fmtMoney } from '../../data/utils';

import type { Budget, ChartDataItem } from '../../types';

interface ChartCardProps {
  title: string;
  sub: string;
  data: ChartDataItem[];
  centerLabel: string;
  centerValue: string;
  hoverIdx: number | null;
  onHover: (idx: number | null) => void;
  mode?: string;
  privacy: boolean;
  budgets?: Budget[];
}

export const ChartCard = ({ title, sub, data, centerLabel, centerValue, hoverIdx, onHover, mode, privacy, budgets }: ChartCardProps) => {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  return (
    <article className="fa-chart-card">
      <header>
        <h3>{title}</h3>
        <span>{sub}</span>
      </header>
      <div className="fa-chart-body">
        <Donut
          data={data}
          size={220}
          thickness={mode === 'flow' ? 40 : 32}
          centerLabel={centerLabel}
          centerValue={centerValue}
          hoverIdx={hoverIdx}
          onHover={onHover}
        />
        <ul className="fa-legend">
          {data.length === 0 && <li className="fa-legend-empty">Sin movimientos aún</li>}
          {data.map((d, i) => {
            const pct = ((d.value / total) * 100).toFixed(0);
            return (
              <li
                key={d.id || d.label}
                className="fa-legend-item"
                data-hover={hoverIdx === i}
                onMouseEnter={() => onHover(i)}
                onMouseLeave={() => onHover(null)}
              >
                <span className="fa-legend-dot" style={{ background: d.color }} />
                <span className="fa-legend-label">
                  {d.icon && <span className="fa-legend-icon">{d.icon}</span>}
                  {d.label}
                </span>
                <span className="fa-legend-pct">{pct}%</span>
                <span className="fa-legend-value">{fmtMoney(d.value, 'ARS', privacy)}</span>
                {budgets && (() => {
                  const budget = budgets.find(b => b.categoryId === d.id);
                  if (!budget) return null;
                  const used = Math.min((d.value / budget.amount) * 100, 100);
                  const barColor = d.value > budget.amount ? '#F26B5E' : used > 80 ? '#F2C94C' : '#5BB890';
                  return (
                    <div style={{ gridColumn: '1 / -1', marginTop: 2, marginBottom: 2 }}>
                      <div style={{ height: 4, background: 'var(--bg-warm, #F5EDD8)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: `${used}%`, height: '100%', background: barColor, borderRadius: 2, transition: 'width 400ms' }} />
                      </div>
                      <span style={{ fontSize: 10, color: 'var(--ink-muted, #8A7E72)', marginTop: 2, display: 'block' }}>
                        {fmtMoney(d.value, 'ARS', privacy)} / {fmtMoney(budget.amount, 'ARS', privacy)}
                      </span>
                    </div>
                  );
                })()}
              </li>
            );
          })}
        </ul>
      </div>
    </article>
  );
};
