import React from 'react';
import { cn } from '@/lib/cn';

/**
 * Chip — a short label, or a filter when it has `onClick`.
 *
 * Tones are meanings, not decoration: `train` / `test` / `track` are the three
 * product modes and appear only for those; status tones only for status. A chip
 * that is just "a pill to make it look designed" should be `neutral`.
 *
 * As a filter it is a real <button> with `aria-pressed`, so the selected state is
 * announced, not just coloured.
 */

export type ChipTone = 'neutral' | 'signal' | 'money' | 'train' | 'test' | 'track' | 'success' | 'warning' | 'danger';

const TONE: Record<ChipTone, string> = {
  neutral: 'bg-surface-hover text-body border-line',
  signal: 'bg-signal-soft text-signal-ink border-signal/20',
  money: 'bg-money/15 text-amber-deep border-money/30',
  train: 'bg-train/10 text-train border-train/20',
  test: 'bg-test/10 text-test border-test/20',
  track: 'bg-track/10 text-track border-track/20',
  success: 'bg-success-soft text-success border-success/20',
  warning: 'bg-warning-soft text-warning border-warning/20',
  danger: 'bg-danger-soft text-danger border-danger/20',
};

export interface ChipProps {
  tone?: ChipTone;
  icon?: React.ComponentType<{ className?: string }>;
  /** Filter mode: renders a button. */
  onClick?: () => void;
  selected?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const Chip: React.FC<ChipProps> = ({ tone = 'neutral', icon: Icon, onClick, selected, className, children }) => {
  const base = 'inline-flex items-center gap-1.5 rounded-full border px-3 text-xs font-semibold whitespace-nowrap';
  const content = (
    <>
      {Icon ? <Icon className="h-3.5 w-3.5 shrink-0" /> : null}
      {children}
    </>
  );
  if (!onClick) return <span className={cn(base, 'py-1', TONE[tone], className)}>{content}</span>;
  return (
    <button
      type="button"
      aria-pressed={!!selected}
      onClick={onClick}
      className={cn(
        base,
        'pressable focus-ring min-h-[36px] transition-colors',
        selected ? 'bg-heading text-card border-heading' : 'bg-card text-body border-line hover:border-line-strong',
        className
      )}
    >
      {content}
    </button>
  );
};

export default Chip;
