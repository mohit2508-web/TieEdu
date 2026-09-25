import React from 'react';

const TILE_COLORS = [
  'bg-[#1F3A5F]/90',
  'bg-[#0284C7]/90',
  'bg-[#0F766E]/90',
  'bg-[#B45309]/90',
  'bg-[#6D28D9]/90',
  'bg-[#BE123C]/90',
  'bg-[#4D7C0F]/90',
  'bg-[#334155]/90',
];

const isRealUrl = (src?: string | null): boolean => {
  if (!src || !src.trim()) return false;
  return src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:image/');
};

function tileIndex(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h % TILE_COLORS.length;
}

function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

interface BrandTileProps {
  name: string;
  src?: string | null;
  className?: string; // sizing + shape (w-10 h-10 rounded-xl, etc.)
  title?: string;
}

// Shows the company logo image ONLY when a real URL exists.
// Otherwise renders an honest initials tile — never a placeholder photo.
export const BrandTile: React.FC<BrandTileProps> = ({ name, src, className = 'w-10 h-10 rounded-xl', title }) => {
  if (isRealUrl(src)) {
    return (
      <img
        src={src!}
        alt={name}
        title={title || name}
        className={`object-cover border border-[#E9E7E1] bg-white ${className}`}
      />
    );
  }
  return (
    <div
      title={title || name}
      className={`${TILE_COLORS[tileIndex(name)]} text-white flex items-center justify-center font-extrabold select-none ${className}`}
      style={{ letterSpacing: '0.02em' }}
    >
      {initials(name)}
    </div>
  );
};

export default BrandTile;