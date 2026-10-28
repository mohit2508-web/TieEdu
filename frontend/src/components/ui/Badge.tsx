import React from 'react';
import { cn } from '@/lib/cn';

/**
 * Badge — a mono-caps tag on a tint: "NEW", "50% OFF", "JUST ADDED"
 * (UI_REDESIGN_PLAN_V3 §10). For a label a person reads, use Chip; a badge is
 * a stamp on something else.
 */

export type BadgeTone = 'primary' | 'secondary' | 'info' | 'rose' | 'success' | 'danger' | 'neutral';

const TONE: Record<BadgeTone, string> = {
  primary: 'bg-signal-soft text-signal-ink',
  secondary: 'bg-secondary-soft text-secondary',
  info: 'bg-info-soft text-info',
  rose: 'bg-rose-soft text-rose',
  success: 'bg-success-soft text-success',
  danger: 'bg-danger-soft text-danger',
  neutral: 'bg-surface-hover text-body',
};

export const Badge: React.FC<{ tone?: BadgeTone; className?: string; children: React.ReactNode }> = ({
  tone = 'primary',
  className,
  children,
}) => (
  <span className={cn('inline-flex items-center rounded-[6px] px-1.5 py-0.5 font-mono text-eyebrow font-medium uppercase', TONE[tone], className)}>
    {children}
  </span>
);

export default Badge;
