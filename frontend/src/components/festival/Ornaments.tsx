import React from 'react';

/** Hand-drawn SVG ornaments for the Diwali skin. Decorative only (aria-hidden). */

export const Diya: React.FC<{ size?: number; lit?: boolean; delay?: number; className?: string }> = ({ size = 40, lit = true, delay = 0, className }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden className={className}>
    <defs>
      <radialGradient id="diya-glow-g" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#FFE08A" stopOpacity="0.9" />
        <stop offset="100%" stopColor="#FF8A00" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="diya-flame-g" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0%" stopColor="#FF6B00" />
        <stop offset="55%" stopColor="#FFC93C" />
        <stop offset="100%" stopColor="#FFF6CF" />
      </linearGradient>
      <linearGradient id="diya-clay-g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#E0662A" />
        <stop offset="100%" stopColor="#8C2E10" />
      </linearGradient>
    </defs>
    {lit && <circle className="diya-glow" cx="32" cy="26" r="20" fill="url(#diya-glow-g)" style={{ animationDelay: `${delay}s` }} />}
    {lit && (
      <path className="diya-flame" style={{ animationDelay: `${delay}s` }}
        d="M32 12 C36 20 38 25 35 30 C33.5 33 30.5 33 29 30 C26 25 28 20 32 12 Z" fill="url(#diya-flame-g)" />
    )}
    <path d="M8 36 C14 50 50 50 56 36 C48 40 16 40 8 36 Z" fill="url(#diya-clay-g)" />
    <path d="M8 36 C16 40 48 40 56 36" fill="none" stroke="#FFC93C" strokeWidth="1.5" />
    <circle cx="20" cy="43" r="1.6" fill="#FFD966" /><circle cx="32" cy="45" r="1.6" fill="#FFD966" /><circle cx="44" cy="43" r="1.6" fill="#FFD966" />
  </svg>
);

/** A marigold + mango-leaf garland across the full width. */
export const Toran: React.FC = () => {
  const flowers = Array.from({ length: 36 });
  return (
    <div className="diwali-toran" aria-hidden>
      <svg viewBox="0 0 720 22" preserveAspectRatio="none" className="diwali-toran__sway">
        <path d="M0 2 Q 180 14 360 2 T 720 2" fill="none" stroke="#B35A00" strokeWidth="1.2" />
        {flowers.map((_, i) => {
          const x = 10 + i * 20;
          const t = (x % 360) / 360;
          const y = 2 + Math.sin(t * Math.PI) * 11;
          const leaf = i % 3 === 1;
          return leaf ? (
            <path key={i} d={`M${x} ${y} q 4 8 0 14 q -4 -6 0 -14 z`} fill="#2E7D32" />
          ) : (
            <g key={i}>
              <circle cx={x} cy={y + 4} r="4.6" fill={i % 2 ? '#FF8A00' : '#FFB300'} />
              <circle cx={x} cy={y + 4} r="2" fill={i % 2 ? '#E65100' : '#FF8A00'} />
            </g>
          );
        })}
      </svg>
    </div>
  );
};

/** Akash kandil — a hanging star lantern. */
export const Kandil: React.FC<{ size?: number; color?: string; className?: string; style?: React.CSSProperties }> = ({ size = 70, color = '#D6246E', className, style }) => (
  <svg width={size} height={size * 1.6} viewBox="0 0 60 96" aria-hidden className={className} style={style}>
    <line x1="30" y1="0" x2="30" y2="18" stroke="#FFD966" strokeWidth="1" />
    <defs>
      <radialGradient id={`kandil-${color}`} cx="50%" cy="50%" r="60%">
        <stop offset="0%" stopColor="#FFF3B0" />
        <stop offset="60%" stopColor={color} />
        <stop offset="100%" stopColor="#5A0A2A" />
      </radialGradient>
    </defs>
    <polygon points="30,18 37,34 55,36 41,47 46,66 30,56 14,66 19,47 5,36 23,34" fill={`url(#kandil-${color})`} stroke="#FFD966" strokeWidth="1.2" />
    {[22, 27, 32, 37].map((x) => (
      <path key={x} d={`M${x} 62 q 1 14 -1 28`} stroke="#FFD966" strokeWidth="1" fill="none" />
    ))}
  </svg>
);

/** A symmetric rangoli that draws itself (pathLength=1 for the dash trick). */
export const Rangoli: React.FC<{ size?: number; className?: string; spin?: boolean }> = ({ size = 320, className, spin = true }) => {
  const petals = Array.from({ length: 12 });
  return (
    // The spin sits on the <svg> box itself: rotating an inner <g> pivots
    // differently across browsers and swung the drawing out of its viewport.
    <svg width={size} height={size} viewBox="-100 -100 200 200" aria-hidden overflow="visible"
      className={`rangoli-draw ${spin ? 'rangoli-spin' : ''} ${className || ''}`}>
      <g>
        {petals.map((_, i) => (
          <path key={`p${i}`} pathLength={1} transform={`rotate(${i * 30})`} d="M0 -18 C 18 -40 14 -70 0 -88 C -14 -70 -18 -40 0 -18 Z"
            fill="none" stroke={i % 2 ? '#FF4F93' : '#FFC93C'} strokeWidth="2.2" style={{ animationDelay: `${i * 0.08}s` }} />
        ))}
        {petals.map((_, i) => (
          <path key={`q${i}`} pathLength={1} transform={`rotate(${i * 30 + 15})`} d="M0 -30 C 10 -44 8 -56 0 -64 C -8 -56 -10 -44 0 -30 Z"
            fill="none" stroke="#FF8A00" strokeWidth="1.6" style={{ animationDelay: `${0.6 + i * 0.06}s` }} />
        ))}
        <circle pathLength={1} r="92" fill="none" stroke="#FFD966" strokeWidth="1.4" strokeDasharray="1" style={{ animationDelay: '1.2s' }} />
        <circle pathLength={1} r="16" fill="none" stroke="#FFF3B0" strokeWidth="2" style={{ animationDelay: '0.2s' }} />
        {petals.map((_, i) => (
          <circle key={`d${i}`} cx={Math.sin((i * Math.PI) / 6) * 76} cy={-Math.cos((i * Math.PI) / 6) * 76} r="2.6" fill="#FFD966" />
        ))}
      </g>
    </svg>
  );
};

/** Footer row of flickering diyas. */
export const DiyaRow: React.FC<{ count?: number }> = ({ count = 7 }) => (
  <div className="diya-row" aria-hidden>
    {Array.from({ length: count }).map((_, i) => <Diya key={i} size={34} delay={i * 0.23} />)}
  </div>
);
