import React from 'react';

/** The TiE Coin: an amber coin with a raised rim and the TiEEdu "T". Decorative; pair it with a number. */
export const CoinIcon: React.FC<{ size?: number; className?: string }> = ({ size = 18, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={`shrink-0 ${className}`}>
    <defs>
      <linearGradient id="tie-coin-face" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#FFD27A" />
        <stop offset=".55" stopColor="#FFA41B" />
        <stop offset="1" stopColor="#D9800A" />
      </linearGradient>
    </defs>
    <circle cx="12" cy="12" r="11" fill="#B86A06" />
    <circle cx="12" cy="11.4" r="10.2" fill="url(#tie-coin-face)" />
    <circle cx="12" cy="11.4" r="7.6" fill="none" stroke="#FFF1D2" strokeOpacity=".7" strokeWidth="1" />
    <path d="M8.2 7.6h7.6v2.1h-2.6v6.2h-2.4V9.7H8.2z" fill="#7A3E00" />
  </svg>
);
