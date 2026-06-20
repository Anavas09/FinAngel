export const FaDots = ({ size = 8, tone = 'brand' }: { size?: number; tone?: 'brand' | 'white' }) => {
  const colors = tone === 'white'
    ? ['#FFFFFF', '#FFFFFF', '#FFFFFF']
    : ['var(--coral)', 'var(--sun)', 'var(--sky)'];
  return (
    <span className="fa-dots" aria-hidden="true">
      {colors.map((c, i) => (
        <i key={i} style={{ width: size, height: size, background: c, animationDelay: `${i * 0.14}s` }} />
      ))}
    </span>
  );
};
