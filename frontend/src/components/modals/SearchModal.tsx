'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { fetchCompanies } from '@/lib/api';
import { BrandTile } from '@/components/common/BrandTile';
import { ArrowRight, ChevronLeft, Command, Search, Sparkles } from 'lucide-react';
import { useShell } from '@/context/ShellContext';
import { useAuth } from '@/context/AuthContext';
import {
  COMPANY_RESULT_LIMIT,
  buildCommands,
  rankCommands,
  rankCompanies,
  type CompanyLike,
  type RankedCommand,
  type RankedCompany,
} from '@/lib/palette';
import { cn } from '@/lib/cn';

/** One flat row per result, so ArrowDown walks both groups without a seam. */
type FlatResult =
  | { kind: 'command'; row: RankedCommand }
  | { kind: 'company'; row: RankedCompany };

/**
 * The result list, shared by the mobile full-screen view and the desktop
 * palette. Both render the same rows in the same order, so keyboard navigation
 * cannot behave differently between the two.
 */
const Results: React.FC<{
  flat: FlatResult[];
  commandResults: RankedCommand[];
  companyResults: RankedCompany[];
  empty: boolean;
  query: string;
  activeIndex: number;
  setActiveIndex: (i: number) => void;
  go: (index: number) => void;
  listRef: React.RefObject<HTMLDivElement>;
}> = ({
  flat,
  commandResults,
  companyResults,
  empty,
  query,
  activeIndex,
  setActiveIndex,
  go,
  listRef,
}) => (
  <div
    ref={listRef}
    id="palette-results"
    role="listbox"
    aria-label="Results"
    className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-2"
  >
    {empty ? (
      <div className="px-4 py-10 text-center">
        <Sparkles size={18} className="mx-auto mb-2 text-[var(--amber-deep)]" aria-hidden />
        <p className="text-sm font-semibold text-[#10151C]">Nothing matches “{query}”</p>
        <p className="mt-1 text-[13px] text-[var(--text-muted)]">
          Try a company name, or a page like pricing, compare or courses.
        </p>
      </div>
    ) : (
      <>
        {commandResults.length > 0 && (
          <div className="mb-1">
            <h2 className="nav-group-label">Go to</h2>
            {commandResults.map((command, i) => (
              <button
                key={command.id}
                id={`palette-row-${i}`}
                data-index={i}
                type="button"
                role="option"
                aria-selected={i === activeIndex}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => go(i)}
                className={cn(
                  'flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors',
                  i === activeIndex ? 'bg-[var(--brand-sky-soft)]' : 'hover:bg-[#FAFAF8]'
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold leading-snug text-[#10151C]">
                    {command.label}
                  </span>
                  <span className="block truncate text-[12.5px] text-[var(--text-muted)]">
                    {command.description}
                  </span>
                </span>
                <ArrowRight
                  size={15}
                  className={cn('flex-none', i === activeIndex ? 'text-[var(--brand-sky)]' : 'opacity-35')}
                  aria-hidden
                />
              </button>
            ))}
          </div>
        )}

        {companyResults.length > 0 && (
          <div className="mb-1">
            <h2 className="nav-group-label">Company vaults</h2>
            {companyResults.map((company, j) => {
              const i = commandResults.length + j;
              return (
                <button
                  key={company.id}
                  id={`palette-row-${i}`}
                  data-index={i}
                  type="button"
                  role="option"
                  aria-selected={i === activeIndex}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => go(i)}
                  className={cn(
                    'flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors',
                    i === activeIndex ? 'bg-[var(--brand-sky-soft)]' : 'hover:bg-[#FAFAF8]'
                  )}
                >
                  <BrandTile
                    name={company.name}
                    src={company.logo_url ?? undefined}
                    className="h-8 w-8 rounded-lg p-0.5"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-semibold leading-snug text-[#10151C]">
                      {company.name}
                    </span>
                    <span className="block truncate text-[12.5px] text-[var(--text-muted)]">
                      {[company.industry, company.avg_rounds ? `${company.avg_rounds} rounds` : null]
                        .filter(Boolean)
                        .join(' · ') || 'Interview vault'}
                    </span>
                  </span>
                  <ArrowRight
                    size={15}
                    className={cn('flex-none', i === activeIndex ? 'text-[var(--brand-sky)]' : 'opacity-35')}
                    aria-hidden
                  />
                </button>
              );
            })}
          </div>
        )}
      </>
    )}
  </div>
);

/**
 * The ⌘K palette.
 *
 * It replaced a search box that only matched company names, tags and industry.
 * That made it useless for the thing people actually press ⌘K to do — go
 * somewhere — and it was also why the shortcut was bound on the homepage only:
 * there was nothing global to bind to.
 *
 * Two result groups. Destinations come from `navConfig` and are role-filtered
 * (`buildCommands`), so Admin and Campus appear for a platform admin and not for
 * a student. Company vaults come from the existing public list endpoint.
 *
 * No props: open state comes from `ShellContext`, which also owns Escape, so
 * this component never registers its own keydown listener for closing.
 */
export const SearchModal: React.FC = () => {
  const router = useRouter();
  const { isOpen, closeOverlay, openOverlay } = useShell();
  const { user } = useAuth();

  const [query, setQuery] = useState('');
  const [companies, setCompanies] = useState<CompanyLike[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const open = isOpen('search');
  const [belowMd, setBelowMd] = useState(false);

  // Mobile search is a full-screen page; desktop keeps the floating palette. The
  // distinction decides both the layout and whether this is a dialog at all, so
  // it has to be in JS rather than left to `md:` classes.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 767px)');
    const sync = () => setBelowMd(mq.matches);
    sync();
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', sync);
      return () => mq.removeEventListener('change', sync);
    }
    mq.addListener(sync);
    return () => mq.removeListener(sync);
  }, []);

  const commands = useMemo(() => buildCommands(user?.role ?? null), [user?.role]);

  // Fetch the company list once per open, not once per keystroke. The list is
  // small and public, and the old modal refetched on every `isOpen` change
  // without cancelling properly.
  useEffect(() => {
    if (!open) return;
    let active = true;
    fetchCompanies()
      .then((list) => {
        if (active) setCompanies((list || []) as unknown as CompanyLike[]);
      })
      .catch(() => {
        if (active) setCompanies([]);
      });
    return () => {
      active = false;
    };
  }, [open]);

  // Reset per open so a previous query never greets the student.
  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActiveIndex(0);
    // Focus after paint, otherwise the dialog is on screen before the field
    // takes focus and the first keystroke goes nowhere on some browsers.
    const id = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(id);
  }, [open]);

  const commandResults = useMemo(() => rankCommands(commands, query), [commands, query]);
  const companyResults = useMemo(
    () => rankCompanies(companies, query).slice(0, COMPANY_RESULT_LIMIT),
    [companies, query]
  );

  // One flat list, so ArrowDown walks destinations and then vaults without the
  // student having to think about where the boundary is.
  const flat: FlatResult[] = useMemo(
    () => [
      ...commandResults.map((c) => ({ kind: 'command' as const, row: c })),
      ...companyResults.map((c) => ({ kind: 'company' as const, row: c })),
    ],
    [commandResults, companyResults]
  );

  useEffect(() => {
    setActiveIndex((prev) => (prev >= flat.length ? 0 : prev));
  }, [flat.length]);

  // Keep the highlighted row in view during keyboard navigation.
  useEffect(() => {
    const node = listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    node?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  if (!open) return null;

  const go = (index: number) => {
    const item = flat[index];
    if (!item) return;
    closeOverlay('search');
    if (item.kind === 'command') {
      /*
       * Action rows are not routes. Without this branch they only closed the
       * palette, so picking "Cart" or "Leaderboard" from Cmd-K looked like it
       * worked and then did nothing at all.
       */
      const actionId = item.row.id.replace(/^action:/, '');
      if (actionId === 'cart' || actionId === 'leaderboard') {
        // Both are functional updates on the same stack, so the palette is
        // closed and the target opened in one render.
        openOverlay(actionId);
        return;
      }
      if (actionId === 'search') return; // Already open; nothing to do.
      if (item.row.href) router.push(item.row.href);
      return;
    }
    router.push(`/company/${item.row.slug}`);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((i) => (flat.length === 0 ? 0 : (i + 1) % flat.length));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((i) => (flat.length === 0 ? 0 : (i - 1 + flat.length) % flat.length));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      go(activeIndex);
    } else if (event.key === 'Home') {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      setActiveIndex(Math.max(0, flat.length - 1));
    }
    // Escape is handled globally in ShellContext, which closes the top overlay.
  };

  const empty = flat.length === 0;

  return (
    <div
      className={cn(
        /*
         * Mobile: a full-screen page. The palette was anchored at 12vh, which on
         * a 390px phone pushes the results into the bottom third and leaves a
         * dead band of scrim above a box that never fills the screen anyway.
         */
        'fixed inset-0 z-[80] flex flex-col bg-white',
        'md:bg-transparent md:items-start md:justify-center md:px-3 md:pt-[16vh]'
      )}
    >
      {/* No scrim on mobile: the page underneath is fully covered. */}
      <div
        className="absolute inset-0 hidden bg-[#10151C]/40 md:block"
        onClick={() => closeOverlay('search')}
        aria-hidden
      />

      {belowMd ? (
        // A full-screen view, not a dialog: it covers the page, so claiming
        // `aria-modal` would tell a screen reader the wrong thing about the
        // surface the rest of the app is still sitting on.
        <section aria-label="Search" className="relative flex h-full w-full flex-col overflow-hidden bg-white md:animate-slide-up-chrome">
          <div className="flex items-center border-b border-[#EDEDEB] px-1 pt-[var(--safe-top)]">
            <button
              type="button"
              onClick={() => closeOverlay('search')}
              className="-ml-1 flex min-h-[44px] items-center gap-0.5 rounded-lg px-3 text-[15px] font-semibold text-[#0284C7] transition-colors active:bg-black/5"
            >
              <ChevronLeft size={20} aria-hidden />
              Back
            </button>
          </div>

          <div className="flex items-center gap-3 border-b border-[#EDEDEB] px-4 py-3">
            <Search size={18} className="flex-none text-[#0E2A44]" aria-hidden />
            <input
              ref={inputRef}
              type="search"
              value={query}
              inputMode="search"
              enterKeyHint="go"
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={onKeyDown}
              role="combobox"
              aria-expanded
              aria-controls="palette-results"
              aria-activedescendant={flat[activeIndex] ? `palette-row-${activeIndex}` : undefined}
              aria-label="Search destinations and company vaults"
              placeholder="Company, page, or action…"
              className="w-full bg-transparent text-base text-[#10151C] placeholder:text-[var(--text-muted)] focus:outline-none"
            />
          </div>

          <Results
            flat={flat}
            commandResults={commandResults}
            companyResults={companyResults}
            empty={empty}
            query={query}
            activeIndex={activeIndex}
            setActiveIndex={setActiveIndex}
            go={go}
            listRef={listRef}
          />

          <div className="shrink-0 pb-[var(--safe-bottom)]" />
        </section>
      ) : (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Search"
          className="relative flex max-h-[70vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-[#EDEDEB] bg-white shadow-[var(--shadow-float)] md:animate-slide-up-chrome"
        >
          <div className="flex items-center gap-3 border-b border-[#EDEDEB] px-4 py-3">
            <Search size={18} className="flex-none text-[#0E2A44]" aria-hidden />
            <input
              ref={inputRef}
              type="search"
              value={query}
              /* The mobile field above already had these; the desktop palette had
                 neither, so the same search behaved differently per breakpoint. */
              inputMode="search"
              enterKeyHint="go"
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={onKeyDown}
              role="combobox"
              aria-expanded
              aria-controls="palette-results"
              aria-activedescendant={flat[activeIndex] ? `palette-row-${activeIndex}` : undefined}
              aria-label="Search destinations and company vaults"
              placeholder="Jump to a page, or find a company vault…"
              className="w-full bg-transparent text-[15px] text-[#10151C] placeholder:text-[var(--text-muted)] focus:outline-none"
            />
            <kbd className="flex-none rounded-md bg-black/[0.05] px-1.5 py-0.5 text-[11px] font-bold text-[var(--text-muted)]">
              ESC
            </kbd>
          </div>

          <Results
            flat={flat}
            commandResults={commandResults}
            companyResults={companyResults}
            empty={empty}
            query={query}
            activeIndex={activeIndex}
            setActiveIndex={setActiveIndex}
            go={go}
            listRef={listRef}
          />

          <div className="flex items-center justify-between gap-3 border-t border-[#EDEDEB] bg-[#FAFAF8] px-4 py-2">
            <span className="flex items-center gap-3 text-[11px] text-[var(--text-muted)]">
              <span>
                <kbd className="rounded bg-black/[0.05] px-1 py-0.5 font-bold">↑</kbd>{' '}
                <kbd className="rounded bg-black/[0.05] px-1 py-0.5 font-bold">↓</kbd> to move
              </span>
              <span>
                <kbd className="rounded bg-black/[0.05] px-1 py-0.5 font-bold">↵</kbd> to open
              </span>
            </span>
            <span className="flex items-center gap-1 text-[11px] font-semibold text-[var(--text-muted)]">
              <Command size={11} strokeWidth={2.5} aria-hidden />
              K anywhere
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
