import React, { useEffect, useRef, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { readTheme, setTheme, ThemeChoice } from '@/lib/theme';
import { cn } from '@/lib/cn';

const OPTIONS: Array<{ value: ThemeChoice; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

/**
 * Light / Dark / System, as a radio group. Rendered unselected on the server
 * (the stored choice lives in the browser) and settles on mount, so there is
 * no hydration mismatch — the page itself was already themed by THEME_BOOT.
 * Keyboard: one Tab stop; arrow keys move and select, as in any radio group.
 * OS changes are followed app-wide from _app, not here.
 */
export const ThemeSwitch: React.FC<{ className?: string }> = ({ className }) => {
  const [choice, setChoice] = useState<ThemeChoice | null>(null);
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  useEffect(() => setChoice(readTheme()), []);

  const pick = (value: ThemeChoice) => {
    setTheme(value);
    setChoice(value);
  };
  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (i + step + OPTIONS.length) % OPTIONS.length;
    pick(OPTIONS[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div role="radiogroup" aria-label="Theme" className={cn('inline-flex rounded-xl border border-line bg-card p-1', className)}>
      {OPTIONS.map((o, i) => {
        const on = choice === o.value;
        // Until the stored choice is read, the first option holds the Tab stop.
        const tabbable = choice ? on : i === 0;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={tabbable ? 0 : -1}
            ref={(el) => {
              refs.current[i] = el;
            }}
            onClick={() => pick(o.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              'focus-ring inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition-colors',
              on ? 'bg-heading text-card' : 'text-muted hover:text-heading'
            )}
          >
            <o.icon className="h-4 w-4" aria-hidden />
            {o.label}
          </button>
        );
      })}
    </div>
  );
};

export default ThemeSwitch;
