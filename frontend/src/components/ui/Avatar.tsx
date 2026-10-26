import React from 'react';
import { cn } from '@/lib/cn';

/**
 * Avatar — a photo when there is one, otherwise initials on a tone picked from
 * the name, so the same person gets the same colour everywhere without storing
 * one. Tones are the mode colours at 15–20%; amber uses `amber-deep` so it stays legible in both themes.
 */

const TONES = ['bg-train/15 text-train', 'bg-test/15 text-test', 'bg-track/15 text-track', 'bg-signal-soft text-signal-ink', 'bg-money/20 text-amber-deep'];

const hash = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

export const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('') || '?';

export interface AvatarProps {
  name: string;
  src?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-14 w-14 text-lg' };

export const Avatar: React.FC<AvatarProps> = ({ name, src, size = 'md', className }) => {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element -- user-supplied avatar URLs from arbitrary hosts; next/image would need every host allow-listed
    return <img src={src} alt={name} className={cn('rounded-full object-cover', SIZE[size], className)} />;
  }
  return (
    <span
      role="img"
      aria-label={name}
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-bold', SIZE[size], TONES[hash(name) % TONES.length], className)}
    >
      {initials(name)}
    </span>
  );
};

export default Avatar;
