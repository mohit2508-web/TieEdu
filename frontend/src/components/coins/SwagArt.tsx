import React from 'react';

/**
 * TiEEdu swag and reward illustrations (TIE_COINS_STORE_PLAN.md §4.2): flat drawings with the
 * real TiEEdu logo (public/logo.svg, never recoloured), shown until an admin uploads a photo.
 */
const LOGO = '/logo.svg?v=3';
const Logo = ({ x, y, w }: { x: number; y: number; w: number }) => <image href={LOGO} x={x} y={y} width={w} height={w * 0.642} preserveAspectRatio="xMidYMid meet" />;

const ART: Record<string, React.ReactNode> = {
  tshirt: (
    <g>
      <path d="M52 22 L68 14 Q80 24 92 14 L108 22 L124 40 L110 52 L104 46 L104 104 L56 104 L56 46 L50 52 L36 40 Z" fill="#1C1917" />
      <path d="M68 14 Q80 26 92 14" fill="none" stroke="#3A332D" strokeWidth="3" />
      <rect x="64" y="46" width="32" height="22" rx="3" fill="#FFF8EE" />
      <Logo x={66} y={48} w={28} />
    </g>
  ),
  hoodie: (
    <g>
      <path d="M48 30 Q80 0 112 30 L128 46 L114 60 L108 54 L108 106 L52 106 L52 54 L46 60 L32 46 Z" fill="#2A2522" />
      <path d="M64 26 Q80 46 96 26 Q80 14 64 26 Z" fill="#141210" />
      <path d="M72 40 L70 58 M88 40 L90 58" stroke="#FFF8EE" strokeWidth="2" strokeLinecap="round" />
      <rect x="62" y="82" width="36" height="16" rx="3" fill="#141210" />
      <rect x="64" y="58" width="32" height="20" rx="3" fill="#FFF8EE" />
      <Logo x={66} y={60} w={28} />
    </g>
  ),
  bottle: (
    <g>
      <rect x="68" y="10" width="24" height="12" rx="3" fill="#57534E" />
      <rect x="70" y="20" width="20" height="8" fill="#A8A29E" />
      <path d="M64 30 Q80 24 96 30 L98 104 Q80 112 62 104 Z" fill="url(#steel)" />
      <rect x="66" y="56" width="28" height="20" rx="3" fill="#FFF8EE" />
      <Logo x={67} y={57} w={26} />
    </g>
  ),
  mug: (
    <g>
      <path d="M104 46 Q124 46 124 64 Q124 82 104 82" fill="none" stroke="#FFF8EE" strokeWidth="8" />
      <path d="M104 46 Q124 46 124 64 Q124 82 104 82" fill="none" stroke="#E8DCC8" strokeWidth="2" />
      <rect x="44" y="34" width="62" height="70" rx="8" fill="#FFF8EE" stroke="#E8DCC8" strokeWidth="2" />
      <Logo x={52} y={46} w={46} />
      <text x="75" y="92" textAnchor="middle" fontSize="7" fontFamily="ui-monospace, monospace" fill="#6B5B4B">{'// compiled at 2 AM'}</text>
    </g>
  ),
  cap: (
    <g>
      <path d="M38 72 Q40 30 80 28 Q120 30 122 72 Z" fill="#1C1917" />
      <path d="M30 72 Q80 64 132 72 Q130 82 80 84 Q34 82 30 72 Z" fill="#141210" />
      <rect x="62" y="44" width="36" height="20" rx="3" fill="#FFF8EE" />
      <Logo x={64} y={45} w={32} />
    </g>
  ),
  notebook: (
    <g>
      <rect x="46" y="14" width="70" height="94" rx="5" fill="#0B4F4A" />
      <rect x="46" y="14" width="10" height="94" rx="3" fill="#083B37" />
      <rect x="64" y="34" width="44" height="30" rx="4" fill="#FFF8EE" />
      <Logo x={67} y={37} w={38} />
      <text x="86" y="84" textAnchor="middle" fontSize="8" fontWeight="700" fill="#FFF8EE">O(n log n)</text>
    </g>
  ),
  stickers: (
    <g>
      <rect x="34" y="20" width="56" height="40" rx="10" fill="#FFF8EE" stroke="#E8DCC8" strokeWidth="2" transform="rotate(-8 62 40)" />
      <Logo x={38} y={24} w={48} />
      <circle cx="110" cy="44" r="20" fill="#FFA41B" />
      <text x="110" y="48" textAnchor="middle" fontSize="9" fontWeight="800" fill="#2A1E14">Brain on</text>
      <rect x="62" y="70" width="70" height="28" rx="14" fill="#146C45" transform="rotate(6 97 84)" />
      <text x="97" y="88" textAnchor="middle" fontSize="10" fontWeight="800" fill="#FFF8EE" transform="rotate(6 97 84)">Accepted ✓</text>
    </g>
  ),
  keychain: (
    <g>
      <circle cx="80" cy="22" r="10" fill="none" stroke="#A8A29E" strokeWidth="4" />
      <rect x="77" y="30" width="6" height="12" fill="#A8A29E" />
      <path d="M56 44 Q80 36 104 46 Q112 70 92 86 L88 104 L78 94 Q52 92 50 70 Q48 52 56 44 Z" fill="url(#steel)" stroke="#78716C" strokeWidth="2" />
      <path d="M60 56 L80 66 L98 54 M80 66 L74 84 M80 66 L94 78" stroke="#57534E" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <circle cx="80" cy="66" r="4" fill="#FFA41B" />
    </g>
  ),
  sleeve: (
    <g>
      <rect x="26" y="26" width="108" height="76" rx="10" fill="#57534E" />
      <path d="M26 40 L134 40" stroke="#78716C" strokeWidth="3" />
      <rect x="58" y="54" width="44" height="30" rx="4" fill="#FFF8EE" />
      <Logo x={61} y={56} w={38} />
    </g>
  ),
  kit: (
    <g>
      <path d="M28 46 L80 30 L132 46 L132 100 L80 114 L28 100 Z" fill="#FFF8EE" stroke="#E8DCC8" strokeWidth="2" />
      <path d="M28 46 L80 60 L132 46" fill="none" stroke="#E8DCC8" strokeWidth="2" />
      <path d="M80 60 L80 114" stroke="#E8DCC8" strokeWidth="2" />
      <path d="M28 46 L80 60 L80 114 L28 100 Z" fill="#FFA41B" />
      <Logo x={88} y={68} w={38} />
      <rect x="44" y="64" width="22" height="34" rx="3" fill="#2A1E14" opacity=".15" />
    </g>
  ),
  backpack: (
    <g>
      <path d="M52 30 Q80 8 108 30 L112 104 Q80 112 48 104 Z" fill="#1C1917" />
      <rect x="58" y="70" width="44" height="28" rx="6" fill="#2A2522" />
      <rect x="62" y="40" width="36" height="22" rx="3" fill="#FFF8EE" />
      <Logo x={64} y={42} w={32} />
    </g>
  ),
  repair: (
    <g>
      <path d="M30 34 H130 V56 Q120 60 130 64 V86 H30 V64 Q40 60 30 56 Z" fill="#FFE7BF" stroke="#D9800A" strokeWidth="2" />
      <path d="M100 34 V86" stroke="#D9800A" strokeWidth="2" strokeDasharray="4 4" />
      <path d="M58 72 Q48 60 58 46 Q60 54 66 54 Q64 42 74 36 Q72 50 80 56 Q84 64 76 72 Z" fill="#F84109" />
      <text x="115" y="64" textAnchor="middle" fontSize="10" fontWeight="800" fill="#6B3E00">+1</text>
    </g>
  ),
  coupon: (
    <g>
      <path d="M30 34 H130 V56 Q120 60 130 64 V86 H30 V64 Q40 60 30 56 Z" fill="#DDF1E7" stroke="#146C45" strokeWidth="2" />
      <text x="72" y="68" textAnchor="middle" fontSize="22" fontWeight="800" fill="#146C45">₹50</text>
      <text x="115" y="64" textAnchor="middle" fontSize="9" fontWeight="700" fill="#146C45">OFF</text>
    </g>
  ),
  pack: (
    <g>
      <path d="M30 36 H70 L78 44 H130 V100 H30 Z" fill="#0B4F4A" />
      <rect x="30" y="50" width="100" height="50" rx="4" fill="#126B64" />
      <rect x="66" y="62" width="28" height="22" rx="3" fill="#FFA41B" />
      <path d="M72 62 V54 Q80 44 88 54" fill="none" stroke="#FFA41B" strokeWidth="4" strokeLinecap="round" />
    </g>
  ),
  membership: (
    <g>
      <rect x="26" y="28" width="108" height="68" rx="10" fill="#1C1917" />
      <rect x="36" y="40" width="40" height="26" rx="4" fill="#FFF8EE" />
      <Logo x={38} y={42} w={36} />
      <text x="104" y="58" textAnchor="middle" fontSize="11" fontWeight="800" fill="#FFB547">MEMBER</text>
      <text x="40" y="86" fontSize="8" fill="#B4A898" fontFamily="ui-monospace, monospace">30 DAYS</text>
    </g>
  ),
};

const RING: Record<string, string> = { 'frame-bronze': '#B8743A', 'frame-silver': '#A8A9AD', 'frame-gold': '#E3B232' };

export const SwagArt: React.FC<{ art: string; image?: string | null; className?: string; label: string }> = ({ art, image, className = '', label }) => {
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element -- admin-uploaded product photo
    return <img src={image} alt={label} className={`h-full w-full object-contain ${className}`} loading="lazy" />;
  }
  const ring = RING[art];
  return (
    <svg viewBox="0 0 160 120" role="img" aria-label={label} className={className}>
      <defs>
        <linearGradient id="steel" x1="0" x2="1"><stop offset="0" stopColor="#D6D3D1" /><stop offset=".5" stopColor="#F5F5F4" /><stop offset="1" stopColor="#A8A29E" /></linearGradient>
      </defs>
      {ring ? (
        <g>
          <circle cx="80" cy="60" r="40" fill="none" stroke={ring} strokeWidth="10" />
          <circle cx="80" cy="60" r="30" fill="#FFF8EE" />
          <text x="80" y="66" textAnchor="middle" fontSize="18" fontWeight="800" fill="#2A1E14">You</text>
        </g>
      ) : (ART[art] || ART.kit)}
    </svg>
  );
};
