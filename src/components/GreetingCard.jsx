import { FinAngel } from './Mascot';

const greetingTime = () => {
  const h = new Date().getHours();
  if (h < 6)  return 'Trasnochando';
  if (h < 12) return 'Buen día';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
};

const layoutLabel = (l) =>
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

export const GreetingCard = ({ mood, line, layout }) => {
  const moodColor = { happy: '#FFE9D6', celebrating: '#FFF1B8', worried: '#FFD9C7' }[mood] || '#FFE9D6';
  return (
    <section className="fa-greeting" style={{ '--mood-bg': moodColor }}>
      <div className="fa-greeting-text">
        <span className="fa-greeting-eyebrow">{greetingTime()}, Cami 👋</span>
        <h1 className="fa-greeting-title">{line}</h1>
        <div className="fa-greeting-chips">
          <span className="fa-chip">📅 Mayo 2026</span>
          <span className="fa-chip">📊 {layoutLabel(layout)}</span>
        </div>
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
