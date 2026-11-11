import React from 'react';
import { cn } from '@/lib/cn';

/**
 * Segmented control (PRACTICE_POLISH_PLAN.md §4.3): a pill group with a sliding
 * highlight, for the few places that still switch views inside a page. Replaces
 * underlined text tabs there. Real tablist semantics.
 */
export interface SegmentItem<K extends string> { key: K; label: string; icon?: React.ComponentType<{ className?: string }>; badge?: string | number | null }

export function Segmented<K extends string>({ items, value, onChange, label, className }: {
  items: SegmentItem<K>[]; value: K; onChange: (k: K) => void; label: string; className?: string;
}) {
  const i = Math.max(0, items.findIndex((t) => t.key === value));
  return (
    <div role="tablist" aria-label={label} className={cn('relative inline-grid rounded-full border border-line bg-surface-hover p-1', className)} style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      <span aria-hidden className="absolute bottom-1 top-1 rounded-full bg-card shadow-sm transition-transform duration-300 ease-out" style={{ left: 4, width: `calc((100% - 8px) / ${items.length})`, transform: `translateX(${i * 100}%)` }} />
      {items.map((t) => {
        const on = t.key === value;
        const Icon = t.icon;
        return (
          <button key={t.key} type="button" role="tab" aria-selected={on} onClick={() => onChange(t.key)}
            className={cn('relative z-[1] inline-flex min-h-[40px] items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 text-body-md font-semibold transition-colors focus-ring', on ? 'text-heading' : 'text-muted hover:text-heading')}>
            {Icon && <Icon className="h-4 w-4" aria-hidden />}
            {t.label}
            {t.badge != null && t.badge !== '' && <span className={cn('rounded-full px-1.5 text-xs font-semibold tabular-nums', on ? 'bg-signal-soft text-signal-ink' : 'bg-card text-muted')}>{t.badge}</span>}
          </button>
        );
      })}
    </div>
  );
}
