import React from 'react';
import { cn } from '@/lib/cn';

/**
 * RadioCard — a whole card as a radio option (plans, goals, slots). Selected
 * is the amber ring plus an amber dot (UI_REDESIGN_PLAN_V3 §10). Group the
 * cards in an element with `role="radiogroup"` and an accessible name.
 */
export const RadioCard: React.FC<{
  checked: boolean;
  onSelect: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Right-hand slot, e.g. a price. */
  aside?: React.ReactNode;
  className?: string;
}> = ({ checked, onSelect, title, description, aside, className }) => (
  <button
    type="button"
    role="radio"
    aria-checked={checked}
    onClick={onSelect}
    className={cn(
      'focus-ring flex w-full items-start gap-3 rounded-card border bg-card p-4 text-left transition-[box-shadow,border-color] duration-flip',
      checked ? 'border-signal shadow-[inset_0_0_0_2px_rgb(var(--rgb-signal))]' : 'border-line hover:border-line-strong',
      className
    )}
  >
    <span
      className={cn('mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full border-2', checked ? 'border-signal' : 'border-line-strong')}
      aria-hidden
    >
      {checked ? <span className="h-2.5 w-2.5 rounded-full bg-signal" /> : null}
    </span>
    <span className="min-w-0 flex-1">
      <span className="block font-display text-label text-heading">{title}</span>
      {description ? <span className="mt-0.5 block text-sm text-muted">{description}</span> : null}
    </span>
    {aside ? <span className="flex-none font-display text-label text-heading">{aside}</span> : null}
  </button>
);

export default RadioCard;
