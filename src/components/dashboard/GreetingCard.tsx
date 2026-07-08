import { FinAngel } from '../mascot/Mascot';

import type { Budget, ChartDataItem, Layout, MascotState } from '../../types';

interface GreetingCardProps {
  mood: MascotState;
  line: string;
  layout: Layout;
  userName?: string;
  budgets?: Budget[];
  categoryData?: ChartDataItem[];
}

const greetingTime = (): string => {
  const h = new Date().getHours();
  if (h < 6)  return 'Trasnochando';
  if (h < 12) return 'Buen día';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
};

const currentMonthYear = (): string =>
  new Date().toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
    .replace(/^\w/, c => c.toUpperCase());

const layoutLabel = (l: Layout): string =>
  l === 'compact' ? 'Vista compacta' : l === 'stacked' ? 'Vista apilada' : 'Vista normal';

const SparklesDecor = () => (
  <svg className="fa-sparkles" viewBox="0 0 220 180" aria-hidden="true">
    <g fill="none" stroke="#F26B5E" strokeWidth="2" strokeLinecap="round">
      <path d="M20 30 L20 42 M14 36 L26 36" />
      <path d="M190 18 L190 30 M184 24 L196 24" />
    </g>
    <g fill="#F2C94C">
      <circle cx="200" cy="110" r="3.5" />
      <circle cx="14" cy="120" r="3" />
    </g>
    <g fill="none" stroke="#7EC4F2" strokeWidth="2" strokeLinecap="round">
      <path d="M180 150 L180 158 M176 154 L184 154" />
    </g>
    <path d="M10 80 Q14 72 22 76" stroke="#D4C5F9" strokeWidth="2" fill="none" strokeLinecap="round" />
  </svg>
);

export const GreetingCard = ({ mood, line, layout, userName, budgets, categoryData }: GreetingCardProps) => {
  const moodColors: Partial<Record<MascotState, string>> = {
    happy: '#FFE9D6', celebrating: '#FFF1B8', worried: '#FFD9C7',
  };
  const moodColor = moodColors[mood] ?? '#FFE9D6';

  const fulfilledBudgets = budgets && categoryData
    ? budgets
        .map(b => ({ b, cat: categoryData.find(d => d.id === b.categoryId) }))
        .filter(({ b, cat }) => cat && cat.value >= b.amount)
    : [];

  return (
    <section className="fa-greeting" style={{ '--mood-bg': moodColor } as React.CSSProperties}>
      <div className="fa-greeting-text">
        <span className="fa-greeting-eyebrow">{greetingTime()}{userName ? `, ${userName}` : ''} 👋</span>
        <h1 className="fa-greeting-title">{line}</h1>
        <div className="fa-greeting-chips">
          <span className="fa-chip">📅 {currentMonthYear()}</span>
          <span className="fa-chip">📊 {layoutLabel(layout)}</span>
        </div>
        {fulfilledBudgets.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.55, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Presupuesto pagado
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {fulfilledBudgets.map(({ b, cat }) => {
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
          </div>
        )}
      </div>
      <div className="fa-greeting-mascot">
        <div className="fa-greeting-mascot-bubble">
          <FinAngel mood={mood} size={170} />
        </div>
        <SparklesDecor />
      </div>
    </section>
  );
};
