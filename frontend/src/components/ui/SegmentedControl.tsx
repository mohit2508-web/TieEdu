import React, { useRef } from 'react';
import { cn } from '@/lib/cn';

/**
 * SegmentedControl — a sunk pill track with the selected option as a white
 * pill on an edge (UI_REDESIGN_PLAN_V3 §10). A radio group: one Tab stop,
 * arrow keys move and select, as in LangSwitch and ThemeSwitch.
 */
export interface SegmentOption<T extends string> {
  value: T;
  label: React.ReactNode;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: Array<SegmentOption<T>>;
  value: T;
  onChange: (value: T) => void;
  /** Accessible name for the group. */
  label: string;
  className?: string;
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (i + step + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div role="radiogroup" aria-label={label} className={cn('inline-flex rounded-full bg-surface-hover p-1', className)}>
      {options.map((o, i) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            ref={(el) => {
              refs.current[i] = el;
            }}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              'focus-ring inline-flex min-h-[36px] items-center rounded-full px-4 font-display text-chip font-medium transition-[background-color,color,box-shadow] duration-flip ease-paper',
              on ? 'bg-card text-heading shadow-edge-neutral' : 'text-muted hover:text-heading'
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export default SegmentedControl;
