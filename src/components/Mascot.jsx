export const FinAngel = ({ mood = 'happy', size = 120, style = {}, className = '' }) => {
  const body = '#FFE9D6';
  const bodyShade = '#F7C9A3';
  const blush = '#F49B8A';
  const dark = '#2D2A26';
  const halo = mood === 'worried' ? '#E8B86C' : mood === 'love' ? '#F26B7A' : '#F2C94C';
  const wing = '#FFFFFF';
  const wingShade = '#F6EFE3';

  const eyes = {
    happy: (
      <g fill={dark}>
        <ellipse cx="78" cy="100" rx="5.5" ry="7" />
        <ellipse cx="122" cy="100" rx="5.5" ry="7" />
        <circle cx="80" cy="97" r="1.6" fill="#fff" />
        <circle cx="124" cy="97" r="1.6" fill="#fff" />
      </g>
    ),
    chill: (
      <g fill="none" stroke={dark} strokeWidth="3.5" strokeLinecap="round">
        <path d="M72 102 Q78 96 84 102" />
        <path d="M116 102 Q122 96 128 102" />
      </g>
    ),
    worried: (
      <g>
        <g fill={dark}>
          <ellipse cx="78" cy="103" rx="5" ry="6" />
          <ellipse cx="122" cy="103" rx="5" ry="6" />
        </g>
        <g fill="none" stroke={dark} strokeWidth="3" strokeLinecap="round">
          <path d="M70 92 L86 96" />
          <path d="M130 92 L114 96" />
        </g>
      </g>
    ),
    celebrating: (
      <g fill="none" stroke={dark} strokeWidth="3.5" strokeLinecap="round">
        <path d="M72 98 L84 104" />
        <path d="M72 104 L84 98" />
        <path d="M116 98 L128 104" />
        <path d="M116 104 L128 98" />
      </g>
    ),
    sleepy: (
      <g fill="none" stroke={dark} strokeWidth="3.5" strokeLinecap="round">
        <path d="M72 102 L84 102" />
        <path d="M116 102 L128 102" />
      </g>
    ),
    love: (
      <g fill="#F26B7A">
        <path d="M72 96 C72 92, 76 90, 78 93 C80 90, 84 92, 84 96 C84 100, 78 105, 78 105 C78 105, 72 100, 72 96 Z" />
        <path d="M116 96 C116 92, 120 90, 122 93 C124 90, 128 92, 128 96 C128 100, 122 105, 122 105 C122 105, 116 100, 116 96 Z" />
      </g>
    ),
  };

  const mouths = {
    happy:       <path d="M88 118 Q100 128 112 118" fill="none" stroke={dark} strokeWidth="3.5" strokeLinecap="round" />,
    chill:       <path d="M90 120 Q100 124 110 120" fill="none" stroke={dark} strokeWidth="3.5" strokeLinecap="round" />,
    worried:     <path d="M88 124 Q100 116 112 124" fill="none" stroke={dark} strokeWidth="3.5" strokeLinecap="round" />,
    celebrating: <path d="M86 116 Q100 134 114 116 Q100 124 86 116 Z" fill={dark} />,
    sleepy:      <path d="M92 122 Q100 126 108 122" fill="none" stroke={dark} strokeWidth="3" strokeLinecap="round" />,
    love:        <path d="M88 118 Q100 130 112 118" fill="none" stroke={dark} strokeWidth="3.5" strokeLinecap="round" />,
  };

  const accessory = mood === 'sleepy' ? (
    <g fill={dark} fontFamily="Bricolage Grotesque, sans-serif" fontWeight="700">
      <text x="148" y="58" fontSize="14">z</text>
      <text x="158" y="46" fontSize="18">Z</text>
    </g>
  ) : mood === 'celebrating' ? (
    <g>
      <path d="M40 60 L48 60 M44 56 L44 64" stroke="#F26B5E" strokeWidth="3" strokeLinecap="round" />
      <path d="M152 50 L160 50 M156 46 L156 54" stroke="#5BB890" strokeWidth="3" strokeLinecap="round" />
      <circle cx="170" cy="80" r="3" fill="#F2C94C" />
      <circle cx="30" cy="90" r="3" fill="#D4C5F9" />
    </g>
  ) : mood === 'worried' ? (
    <path d="M150 80 Q156 95 150 100 Q144 95 150 80 Z" fill="#7EC4F2" opacity="0.8" />
  ) : null;

  return (
    <svg viewBox="0 0 200 200" width={size} height={size} style={style} className={className} aria-hidden="true">
      <ellipse cx="100" cy="38" rx="32" ry="8" fill="none" stroke={halo} strokeWidth="5" />
      <ellipse cx="100" cy="38" rx="32" ry="8" fill="none" stroke="#fff" strokeWidth="1.5" opacity="0.6" />
      <g>
        <path d="M50 110 Q20 100 22 130 Q24 150 56 138 Z" fill={wing} stroke={wingShade} strokeWidth="2" />
        <path d="M150 110 Q180 100 178 130 Q176 150 144 138 Z" fill={wing} stroke={wingShade} strokeWidth="2" />
        <path d="M32 122 Q40 128 50 124" stroke={wingShade} strokeWidth="1.5" fill="none" />
        <path d="M168 122 Q160 128 150 124" stroke={wingShade} strokeWidth="1.5" fill="none" />
      </g>
      <ellipse cx="100" cy="115" rx="55" ry="58" fill={body} />
      <ellipse cx="100" cy="160" rx="48" ry="14" fill={bodyShade} opacity="0.35" />
      <ellipse cx="72" cy="125" rx="9" ry="5" fill={blush} opacity="0.55" />
      <ellipse cx="128" cy="125" rx="9" ry="5" fill={blush} opacity="0.55" />
      {eyes[mood] || eyes.happy}
      {mouths[mood] || mouths.happy}
      {accessory}
    </svg>
  );
};

export const FinAngelMini = ({ size = 28, mood = 'happy' }) => (
  <FinAngel mood={mood} size={size} style={{ display: 'inline-block', verticalAlign: 'middle' }} />
);
