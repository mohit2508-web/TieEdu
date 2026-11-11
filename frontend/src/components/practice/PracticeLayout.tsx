import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { LayoutGrid, Code2, Building2, ListChecks, ChevronDown, PanelLeftClose, PanelLeftOpen, Flame, ArrowRight, ServerCrash } from 'lucide-react';
import { cn } from '@/lib/cn';
import { usePracticeSummary, streakOf } from './usePracticeSummary';
import { NAV_ITEMS } from '@/lib/navConfig';

/** The rest of the Practise section (they were the header's sub-tabs, hidden on practice pages). */
const MORE = ['skillTest', 'daily', 'mockInterview', 'peerMock', 'englishCoach', 'drives'].map((id) => NAV_ITEMS[id]).filter(Boolean);

/**
 * The Practice frame (PRACTICE_POLISH_PLAN.md §4): one navigation level.
 * - Desktop: a left rail (sections, companies expand into their sets, counts) and,
 *   from 1280 px, a right rail (streak, continue, next). The page uses the full width.
 * - Phone/tablet: a single "Practice ▾" switcher replaces the rail.
 * The old row of five text tabs is gone.
 */
type Section = { href: string; label: string; icon: React.ComponentType<{ className?: string }>; exact?: boolean; external?: boolean };
const SECTIONS: Section[] = [
  { href: '/practice', label: 'Overview', icon: LayoutGrid, exact: true },
  { href: '/practice/dsa', label: 'DSA sheet', icon: Code2 },
  { href: '/practice/companies', label: 'Companies', icon: Building2 },
  { href: '/practice/tests', label: 'Company tests', icon: ListChecks },
];
const RAIL_KEY = 'tie_practice_rail';

const isOn = (pathname: string, asPath: string, s: { href: string; exact?: boolean }) =>
  s.exact ? pathname === s.href : asPath === s.href || asPath.startsWith(`${s.href}/`) || asPath.startsWith(`${s.href}?`);

export function PracticeLayout({ title, intro, children, actions, crumb, icon }: {
  title: string; intro?: React.ReactNode; children: React.ReactNode; actions?: React.ReactNode; crumb?: { href: string; label: string };
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const { pathname, asPath } = useRouter();
  const summary = usePracticeSummary();
  const [collapsed, setCollapsed] = useState(false);
  const [menu, setMenu] = useState(false);
  useEffect(() => { try { setCollapsed(localStorage.getItem(RAIL_KEY) === 'icons'); } catch { /* private mode */ } }, []);
  useEffect(() => setMenu(false), [asPath]);
  const toggle = () => setCollapsed((c) => { try { localStorage.setItem(RAIL_KEY, c ? 'full' : 'icons'); } catch { /* ignore */ } return !c; });

  const counts: Record<string, string | null> = {
    '/practice/dsa': summary ? `${summary.totals.solved}/${summary.totals.total}` : null,
    '/practice/tests': summary ? String(summary.companies.reduce((n, c) => n + c.tests, 0)) : null,
  };
  const current = SECTIONS.find((s) => isOn(pathname, asPath, s)) || SECTIONS[0];
  const HeaderIcon = icon || current.icon;
  const companies = summary?.companies || [];

  const nav = (compact: boolean) => (
    <ul className="space-y-1">
      {SECTIONS.map((s) => {
        const on = isOn(pathname, asPath, s);
        const Icon = s.icon;
        return (
          <li key={s.href}>
            <Link href={s.href} aria-current={on ? 'page' : undefined} title={compact ? s.label : undefined}
              className={cn('group relative flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-body-md font-semibold transition-colors focus-ring',
                on ? 'bg-signal-soft text-heading' : 'text-body hover:bg-surface-hover hover:text-heading', compact && 'justify-center px-0')}>
              {on && <span aria-hidden className="absolute bottom-2 left-0 top-2 w-[3px] rounded-full bg-signal" />}
              <Icon className={cn('h-5 w-5 shrink-0', on ? 'text-signal-ink' : 'text-muted group-hover:text-heading')} />
              {!compact && <span className="min-w-0 flex-1 truncate">{s.label}</span>}
              {!compact && counts[s.href] && <span className="rounded-full bg-card px-2 text-xs font-semibold tabular-nums text-muted">{counts[s.href]}</span>}
            </Link>
            {!compact && s.href === '/practice/companies' && companies.length > 0 && (
              <ul className="ml-[22px] mt-1 space-y-0.5 border-l border-line pl-3">
                {companies.map((c) => {
                  const href = `/practice/companies/${c.slug}`;
                  const cOn = asPath === href || asPath.startsWith(`${href}?`);
                  return (
                    <li key={c.slug}>
                      <Link href={href} aria-current={cOn ? 'page' : undefined}
                        className={cn('flex min-h-[36px] items-center gap-2 rounded-lg px-2 text-body-md transition-colors focus-ring', cOn ? 'font-semibold text-heading' : 'text-body hover:text-heading')}>
                        <span className="min-w-0 flex-1 truncate">{c.name}</span>
                        <span className="text-xs tabular-nums text-muted">{c.solved}/{c.total}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        );
      })}
      <li className="!mt-3 border-t border-line pt-3">
        {!compact && <p className="px-3 pb-1 text-sm font-semibold text-muted">More practice</p>}
        <ul className="space-y-0.5">
          {MORE.map((m) => {
            const Icon = m.icon;
            return (
              <li key={m.id}>
                <Link href={m.href} title={compact ? m.label : undefined}
                  className={cn('group flex min-h-[40px] items-center gap-3 rounded-xl px-3 text-body-md text-body transition-colors hover:bg-surface-hover hover:text-heading focus-ring', compact && 'justify-center px-0')}>
                  <Icon className="h-5 w-5 shrink-0 text-muted group-hover:text-heading" />
                  {!compact && <span className="min-w-0 flex-1 truncate">{m.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </li>
    </ul>
  );

  const streak = summary ? streakOf(summary.activity) : 0;

  return (
    <>
      <Head><title>{`${title} · Practice · TiEEdu`}</title></Head>
      <div className={cn('mx-auto grid w-full max-w-[1760px] gap-6 px-4 pb-16 pt-4 sm:px-6 lg:gap-8 lg:pt-8',
        collapsed ? 'lg:grid-cols-[72px_minmax(0,1fr)] xl:grid-cols-[72px_minmax(0,1fr)_300px]' : 'lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)_300px]')}>

        {/* Left rail (desktop) */}
        <aside aria-label="Practice sections" className="hidden lg:block">
          <nav className="sticky space-y-3" style={{ top: 'calc(var(--header-total, 64px) + 24px)' }}>
            {!collapsed && <p className="px-3 text-sm font-semibold text-muted">Practice</p>}
            {nav(collapsed)}
            <button type="button" onClick={toggle} aria-label={collapsed ? 'Expand the menu' : 'Collapse the menu'}
              className={cn('flex min-h-[40px] w-full items-center gap-2 rounded-xl px-3 text-sm font-medium text-muted hover:bg-surface-hover hover:text-heading focus-ring', collapsed && 'justify-center px-0')}>
              {collapsed ? <PanelLeftOpen className="h-5 w-5" aria-hidden /> : <><PanelLeftClose className="h-5 w-5" aria-hidden /> Collapse</>}
            </button>
          </nav>
        </aside>

        <main className="min-w-0">
          {/* Phone/tablet: one switcher instead of a row of tabs */}
          <div className="relative mb-4 lg:hidden">
            <button type="button" aria-expanded={menu} aria-controls="practice-menu" onClick={() => setMenu((m) => !m)}
              className="flex min-h-[48px] w-full items-center gap-3 rounded-xl border border-line bg-card px-4 text-left text-body-md font-semibold text-heading focus-ring">
              <current.icon className="h-5 w-5 text-signal-ink" />
              <span className="flex-1">Practice · {current.label}</span>
              <ChevronDown className={cn('h-5 w-5 text-muted transition-transform', menu && 'rotate-180')} aria-hidden />
            </button>
            {menu && <div id="practice-menu" className="absolute inset-x-0 top-[calc(100%+6px)] z-30 rounded-2xl border border-line bg-card p-2 shadow-lg">{nav(false)}</div>}
          </div>

          <header className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-line bg-surface-hover/60 px-5 py-5 sm:px-6">
            <div className="flex min-w-0 gap-4">
              <span className="hidden h-12 w-12 shrink-0 place-items-center rounded-xl bg-card text-signal-ink shadow-sm sm:grid"><HeaderIcon className="h-6 w-6" /></span>
              <div className="min-w-0">
                {crumb && <Link href={crumb.href} className="text-body-md font-medium text-link hover:underline">← {crumb.label}</Link>}
                <h1 className="font-display text-2xl font-bold text-heading sm:text-3xl">{title}</h1>
                {intro && <p className="mt-1 max-w-3xl text-base leading-relaxed text-body">{intro}</p>}
              </div>
            </div>
            {actions}
          </header>
          <div className="mt-8">{children}</div>
        </main>

        {/* Right rail (wide screens) */}
        <aside aria-label="Your practice" className="hidden xl:block">
          <div className="sticky space-y-4" style={{ top: 'calc(var(--header-total, 64px) + 24px)' }}>
            <div className="rounded-2xl border border-line bg-card p-5">
              <p className="flex items-center gap-2 text-sm font-semibold text-muted"><Flame className={cn('h-4 w-4', streak > 0 && 'text-signal-hover')} aria-hidden /> Streak</p>
              <p className="mt-1 font-display text-3xl font-bold tabular-nums text-heading">{streak}<span className="text-lg font-semibold text-muted"> day{streak === 1 ? '' : 's'}</span></p>
              <p className="text-body-md text-body">{summary ? (streak ? 'Solve one today to keep it going.' : 'Solve one problem today to start a streak.') : ' '}</p>
            </div>
            {summary?.continue && (
              <Link href={`/practice/problem/${summary.continue.id}`} className="block rounded-2xl border border-line bg-card p-5 transition-colors hover:border-line-strong focus-ring">
                <p className="text-sm font-semibold text-muted">Continue</p>
                <p className="mt-1 text-lg font-semibold text-heading">{summary.continue.title}</p>
                <p className="mt-2 inline-flex items-center gap-1 text-body-md font-semibold text-link">Open the editor <ArrowRight className="h-4 w-4" aria-hidden /></p>
              </Link>
            )}
            {summary?.next && summary.next.id !== summary.continue?.id && (
              <Link href={`/practice/problem/${summary.next.id}`} className="block rounded-2xl border border-line bg-card p-5 transition-colors hover:border-line-strong focus-ring">
                <p className="text-sm font-semibold text-muted">Next up</p>
                <p className="mt-1 text-lg font-semibold text-heading">{summary.next.title}</p>
                <p className="text-body-md text-body">{summary.next.topic}</p>
              </Link>
            )}
            {summary && !summary.runner && (
              <p className="flex items-start gap-2 rounded-2xl border border-line bg-card p-4 text-body-md text-body"><ServerCrash className="mt-0.5 h-5 w-5 shrink-0 text-muted" aria-hidden /> The code runner is offline right now. You can still read problems and solutions.</p>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}

/** A thin progress bar with an accessible label. */
export function Progress({ done, total, label }: { done: number; total: number; label: string }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div role="progressbar" aria-label={label} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} className="h-2 w-full overflow-hidden rounded-full bg-surface-hover">
      <div className="h-full rounded-full bg-success transition-[width]" style={{ width: `${pct}%` }} />
    </div>
  );
}
