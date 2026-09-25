import React from 'react';

const TILE_COLORS = [
  'bg-[#1F3A5F]',
  'bg-[#0369A1]',
  'bg-[#115E59]',
  'bg-[#92400E]',
  'bg-[#6D28D9]',
  'bg-[#BE123C]',
  'bg-[#3F6212]',
  'bg-[#334155]',
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
  const safeName = name || 'Company';
  if (isRealUrl(src)) {
    return (
      <img
        src={src!}
        alt={safeName}
        title={title || safeName}
        className={`object-cover border border-[#E9E7E1] bg-white ${className}`}
      />
    );
  }
  return (
    <div
      title={title || safeName}
      className={`${TILE_COLORS[tileIndex(safeName)]} text-white flex items-center justify-center font-extrabold select-none ${className}`}
      style={{ letterSpacing: '0.02em' }}
    >
      {initials(safeName)}
    </div>
  );
};

export default BrandTile;