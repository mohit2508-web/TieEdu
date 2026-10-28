import React from 'react';
import { cn } from '@/lib/cn';

/**
 * IconTile — an icon on a tinted square, the icon in the tint's own colour
 * (UI_REDESIGN_PLAN_V3 §10). Used in floating chips, tabs-as-cards and lists.
 */

export type IconTileTone = 'primary' | 'secondary' | 'info' | 'rose' | 'success' | 'neutral';

const TONE: Record<IconTileTone, string> = {
  primary: 'bg-signal-soft text-signal-ink',
  secondary: 'bg-secondary-soft text-secondary',
  info: 'bg-info-soft text-info',
  rose: 'bg-rose-soft text-rose',
  success: 'bg-success-soft text-success',
  neutral: 'bg-surface-hover text-heading',
};

const SIZE = { sm: 'h-8 w-8 rounded-lg', md: 'h-10 w-10 rounded-well' };

export const IconTile: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  tone?: IconTileTone;
  size?: keyof typeof SIZE;
  className?: string;
}> = ({ icon: Icon, tone = 'primary', size = 'md', className }) => (
  <span className={cn('inline-flex flex-none items-center justify-center', SIZE[size], TONE[tone], className)} aria-hidden>
    <Icon className={size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'} />
  </span>
);

export default IconTile;
