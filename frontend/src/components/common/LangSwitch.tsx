import React, { useRef } from 'react';
import { Languages } from 'lucide-react';
import { useLang, type Lang } from '@/lib/lang';
import { cn } from '@/lib/cn';

const OPTIONS: Array<{ value: Lang; label: string }> = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hinglish' },
];

/**
 * English / Hinglish, site-wide (lib/lang). Same radio-group pattern and
 * keyboard behaviour as ThemeSwitch; the choice applies everywhere at once.
 */
export const LangSwitch: React.FC<{ className?: string }> = ({ className }) => {
  const [lang, setLang] = useLang();
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (i + step + OPTIONS.length) % OPTIONS.length;
    setLang(OPTIONS[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div role="radiogroup" aria-label="Language" className={cn('inline-flex items-center rounded-xl border border-line bg-card p-1', className)}>
      <Languages className="mx-1.5 h-4 w-4 text-muted" aria-hidden />
      {OPTIONS.map((o, i) => {
        const on = lang === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            lang={o.value === 'hi' ? 'hi-Latn' : 'en'}
            ref={(el) => {
              refs.current[i] = el;
            }}
            onClick={() => setLang(o.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              'focus-ring inline-flex min-h-[36px] items-center rounded-lg px-3 text-sm font-semibold transition-colors',
              on ? 'bg-heading text-card' : 'text-muted hover:text-heading'
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
};

export default LangSwitch;
