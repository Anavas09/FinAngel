import type { ChartDataItem } from '../../types';

interface DonutProps {
  data: ChartDataItem[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
  hoverIdx: number | null;
  onHover: (idx: number | null) => void;
}

const polarToCartesian = (cx: number, cy: number, r: number, angle: number) => {
  const rad = (angle - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
};

const arcPath = (cx: number, cy: number, rOuter: number, rInner: number, start: number, end: number): string => {
  const largeArc = end - start > 180 ? 1 : 0;
  const so = polarToCartesian(cx, cy, rOuter, end);
  const eo = polarToCartesian(cx, cy, rOuter, start);
  const si = polarToCartesian(cx, cy, rInner, start);
  const ei = polarToCartesian(cx, cy, rInner, end);
  return [
    'M', so.x, so.y,
    'A', rOuter, rOuter, 0, largeArc, 0, eo.x, eo.y,
    'L', si.x, si.y,
    'A', rInner, rInner, 0, largeArc, 1, ei.x, ei.y,
    'Z',
  ].join(' ');
};

export const Donut = ({ data, size = 220, thickness = 32, centerLabel, centerValue, hoverIdx, onHover }: DonutProps) => {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = size / 2 - 8;
  const rInner = rOuter - thickness;

  let angle = 0;
  const slices = data.map((d, i) => {
    const span = (d.value / total) * 360;
    const start = angle;
    const end = angle + Math.max(span, 0.001);
    angle = end;
    return {
      ...d,
      path: arcPath(cx, cy, rOuter, rInner, start, start + Math.max(0, end - start - 1.5)),
      i,
    };
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
      <defs>
        <filter id="donut-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#2D2A26" floodOpacity="0.08" />
        </filter>
      </defs>
      <g filter="url(#donut-shadow)">
        {slices.map((s, i) => {
          const active = hoverIdx == null || hoverIdx === i;
          return (
            <path
              key={i}
              d={s.path}
              fill={s.color}
              opacity={active ? 1 : 0.35}
              style={{
                transition: 'opacity 200ms, transform 200ms',
                transformOrigin: `${cx}px ${cy}px`,
                transform: hoverIdx === i ? 'scale(1.03)' : 'scale(1)',
                cursor: 'pointer',
              }}
              onMouseEnter={() => onHover(i)}
              onMouseLeave={() => onHover(null)}
            />
          );
        })}
      </g>
      {(centerLabel || centerValue) && (
        <g>
          {centerValue && (
            <text x={cx} y={cy - 2} textAnchor="middle" fontFamily="Bricolage Grotesque, sans-serif" fontWeight="700" fontSize="22" fill="#2D2A26">
              {centerValue}
            </text>
          )}
          {centerLabel && (
            <text x={cx} y={cy + 18} textAnchor="middle" fontFamily="Plus Jakarta Sans, sans-serif" fontWeight="500" fontSize="11" fill="#6F6A62" letterSpacing="0.5">
              {centerLabel}
            </text>
          )}
        </g>
      )}
    </svg>
  );
};
