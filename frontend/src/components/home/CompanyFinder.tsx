import React, { useId, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { ArrowRight, Search } from 'lucide-react';
import { BrandTile } from '@/components/common/BrandTile';
import { cn } from '@/lib/cn';
import type { Company } from '@/types';

/**
 * "Which company are you preparing for?" — the home page's one question
 * (UI_REDESIGN_PLAN_V2 §7, Home).
 *
 * A combobox, not a search box: it suggests companies as you type and Enter
 * goes straight to the one you meant. Anything it cannot resolve to a single
 * company is handed to /companies?q=, so typing "cyber" still lands somewhere
 * useful. The query is lifted (`value`/`onChange`) because the vault rail
 * below filters on the same text.
 *
 * ARIA 1.2 combobox pattern: the input owns `aria-activedescendant`, so focus
 * never leaves the field and a screen reader announces the highlighted option.
 */

export interface CompanyFinderProps {
  companies: Company[];
  value: string;
  onChange: (v: string) => void;
  className?: string;
}

const MAX = 6;

export const CompanyFinder: React.FC<CompanyFinderProps> = ({ companies, value, onChange, className }) => {
  const router = useRouter();
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const matches = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return [];
    const starts = companies.filter((c) => c.name.toLowerCase().startsWith(q));
    const contains = companies.filter(
      (c) =>
        !c.name.toLowerCase().startsWith(q) &&
        (c.name.toLowerCase().includes(q) || (c.industry || '').toLowerCase().includes(q))
    );
    return [...starts, ...contains].slice(0, MAX);
  }, [companies, value]);

  const showList = open && matches.length > 0;

  const go = (company?: Company) => {
    setOpen(false);
    if (company) router.push(`/company/${company.slug}`);
    else router.push(value.trim() ? `/companies?q=${encodeURIComponent(value.trim())}` : '/companies');
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(matches.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(-1, i - 1));
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActive(-1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      go(active >= 0 ? matches[active] : matches.length === 1 ? matches[0] : undefined);
    }
  };

  return (
    <form
      role="search"
      className={cn('relative', className)}
      onSubmit={(e) => {
        e.preventDefault();
        go(matches.length === 1 ? matches[0] : undefined);
      }}
    >
      <label htmlFor={`${listId}-input`} className="mb-2 block text-sm font-semibold text-heading">
        Which company are you preparing for?
      </label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden />
          <input
            id={`${listId}-input`}
            type="text"
            role="combobox"
            aria-expanded={showList}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
            autoComplete="off"
            enterKeyHint="search"
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              setOpen(true);
              setActive(-1);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 120)}
            onKeyDown={onKeyDown}
            placeholder="Zscaler, TCS, Google…"
            className="min-h-[52px] w-full rounded-xl border border-line-strong bg-card pl-12 pr-4 text-base text-heading shadow-soft placeholder:text-text-light focus:border-signal focus:outline-none focus:ring-4 focus:ring-signal/15"
          />
        </div>
        <button
          type="submit"
          className="pressable focus-ring inline-flex min-h-[52px] items-center gap-2 rounded-xl bg-signal px-5 text-base font-semibold text-white transition-colors hover:bg-signal-hover"
        >
          <span className="hidden sm:inline">Find</span>
          <ArrowRight className="h-5 w-5" aria-hidden />
          <span className="sr-only sm:hidden">Find company</span>
        </button>
      </div>

      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Matching companies"
          className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-xl border border-line bg-card py-1 shadow-raised"
        >
          {matches.map((c, i) => (
            <li
              key={c.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                go(c);
              }}
              onMouseEnter={() => setActive(i)}
              className={cn('flex items-center gap-3 px-3 py-2.5', i === active && 'bg-surface-hover')}
            >
              <BrandTile name={c.name} src={c.logo_url} className="h-8 w-8 shrink-0 rounded-lg p-0.5" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-heading">{c.name}</span>
                <span className="block truncate text-xs text-muted">{c.industry}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
};

export default CompanyFinder;
