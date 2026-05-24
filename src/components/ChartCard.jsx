import { Donut } from './Donut';
import { fmtMoney } from '../data/utils';

export const ChartCard = ({ title, sub, data, centerLabel, centerValue, hoverIdx, onHover, mode, privacy }) => {
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
                onMouseEnter={() => onHover && onHover(i)}
                onMouseLeave={() => onHover && onHover(null)}
              >
                <span className="fa-legend-dot" style={{ background: d.color }} />
                <span className="fa-legend-label">
                  {d.icon && <span className="fa-legend-icon">{d.icon}</span>}
                  {d.label}
                </span>
                <span className="fa-legend-pct">{pct}%</span>
                <span className="fa-legend-value">{fmtMoney(d.value, 'ARS', privacy)}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </article>
  );
};
