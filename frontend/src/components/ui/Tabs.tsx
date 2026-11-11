import React from 'react';
import { cn } from '@/lib/cn';

/**
 * Tabs (PRACTICE_MODE_PLAN.md §10.3): 15px/600 labels, 44px tall, a 2px
 * underline on the active tab, a muted inactive state, and horizontal scroll on
 * narrow screens. Real tablist semantics, so screen readers announce the tab.
 */
export interface TabItem<K extends string> { key: K; label: string; icon?: React.ComponentType<{ className?: string }>; badge?: string | number | null }

export function Tabs<K extends string>({ items, value, onChange, className, size = 'md', label }: {
  items: TabItem<K>[]; value: K; onChange: (k: K) => void; className?: string; size?: 'sm' | 'md'; label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className={cn('flex shrink-0 items-stretch gap-1 overflow-x-auto border-b border-line [scrollbar-width:none]', className)}>
      {items.map((t) => {
        const on = t.key === value;
        const Icon = t.icon;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(t.key)}
            className={cn(
              'relative inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 font-semibold transition-colors focus-ring',
              size === 'sm' ? 'h-10 text-sm' : 'h-11 text-body-md',
              on ? 'text-heading' : 'text-muted hover:text-heading',
            )}
          >
            {Icon && <Icon className="h-4 w-4" aria-hidden />}
            {t.label}
            {t.badge != null && t.badge !== '' && <span className="rounded-full bg-surface-hover px-1.5 text-xs font-semibold text-muted">{t.badge}</span>}
            {on && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-signal" aria-hidden />}
          </button>
        );
      })}
    </div>
  );
}
