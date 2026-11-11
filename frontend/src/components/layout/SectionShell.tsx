import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ChevronDown, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { NAV_ITEMS, RAIL_PERSONAL, SECTION_RAILS, isItemActive, railSectionFor, type NavItem } from '@/lib/navConfig';
import { DRIVE_TABS } from '@/lib/mockDriveNav';
import { usePracticeSummary } from '@/components/practice/usePracticeSummary';
import type { PracticeHome } from '@/lib/codeApi';
import { PractiseAside } from './PractiseAside';
import { Footer } from './Footer';
import { cn } from '@/lib/cn';

/**
 * The one navigation inside a section (UI_FIX_PLAN.md §3).
 * - Desktop (≥1024): a grouped left rail, the same for every page of Learn / Practise /
 *   Companies; Practise adds a right rail from 1280 px. The page uses the rest of the width.
 * - Phone: no sideways tab strip; one "Section · Page ▾" switcher opening the same list.
 * Mounted once by AppShell, so a page cannot get its navigation wrong.
 */
const RAIL_KEY = 'tie_section_rail';
type Child = { href: string; label: string; meta?: string; exact?: boolean };

function childrenOf(item: NavItem, pathname: string, summary: PracticeHome | null): Child[] {
  if (item.id === 'companySets') return (summary?.companies || []).map((c) => ({ href: `/practice/companies/${c.slug}`, label: c.name, meta: `${c.solved}/${c.total}` }));
  if (item.id === 'drives' && (pathname === '/mock-drive' || pathname.startsWith('/mock-drive/'))) return DRIVE_TABS.map((t) => ({ href: t.href, label: t.label, exact: t.href === '/mock-drive' }));
  return [];
}

function RailItem({ item, compact, pathname, asPath, count, summary }: { item: NavItem; compact: boolean; pathname: string; asPath: string; count?: string | null; summary: PracticeHome | null }) {
  const on = isItemActive(pathname, item) || (item.id === 'drives' && pathname.startsWith('/mock-drive'));
  const children = childrenOf(item, pathname, summary);
  const Icon = item.icon;
  return (
    <li>
      <Link href={item.href} aria-current={on ? 'page' : undefined} title={compact ? item.label : undefined}
        className={cn('group relative flex min-h-[42px] items-center gap-3 rounded-xl px-3 text-body-md font-semibold transition-colors focus-ring',
          on ? 'bg-signal-soft text-heading' : 'text-body hover:bg-surface-hover hover:text-heading', compact && 'justify-center px-0')}>
        {on && <span aria-hidden className="absolute bottom-2 left-0 top-2 w-[3px] rounded-full bg-signal" />}
        <Icon className={cn('h-5 w-5 shrink-0', on ? 'text-signal-ink' : 'text-muted group-hover:text-heading')} />
        {!compact && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
        {!compact && item.badge === 'free' && <span className="rounded-full bg-success-soft px-1.5 text-xs font-semibold text-success">Free</span>}
        {!compact && count && <span className="rounded-full bg-card px-2 text-xs font-semibold tabular-nums text-muted">{count}</span>}
      </Link>
      {!compact && children.length > 0 && (on || item.id === 'companySets') && (
        <ul className="ml-[22px] mt-1 space-y-0.5 border-l border-line pl-3">
          {children.map((c) => {
            const cOn = c.exact ? asPath.split(/[?#]/)[0] === c.href : asPath === c.href || asPath.startsWith(`${c.href}/`) || asPath.startsWith(`${c.href}?`);
            return (
              <li key={c.href}>
                <Link href={c.href} aria-current={cOn ? 'page' : undefined}
                  className={cn('flex min-h-[34px] items-center gap-2 rounded-lg px-2 text-body-md transition-colors focus-ring', cOn ? 'font-semibold text-heading' : 'text-body hover:text-heading')}>
                  <span className="min-w-0 flex-1 truncate">{c.label}</span>
                  {c.meta && <span className="text-xs tabular-nums text-muted">{c.meta}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

export function SectionShell({ children }: { children: React.ReactNode }) {
  const { pathname, asPath } = useRouter();
  const { user } = useAuth();
  const section = railSectionFor(asPath || pathname);
  const summary = usePracticeSummary(section?.id === 'practise');
  const [collapsed, setCollapsed] = useState(false);
  const [menu, setMenu] = useState(false);
  useEffect(() => { try { setCollapsed(localStorage.getItem(RAIL_KEY) === 'icons'); } catch { /* private mode */ } }, []);
  useEffect(() => setMenu(false), [asPath]);

  if (!section) return <>{children}</>;
  const path = (asPath || pathname).split(/[?#]/)[0];
  const groups = (SECTION_RAILS[section.id] || []).map((g) => ({
    ...g, items: g.itemIds.map((id) => NAV_ITEMS[id]).filter((i): i is NavItem => !!i && (!!user || !RAIL_PERSONAL.has(i.id))),
  })).filter((g) => g.items.length);
  const current = groups.flatMap((g) => g.items).find((i) => isItemActive(path, i) || (i.id === 'drives' && path.startsWith('/mock-drive'))) || groups[0]?.items[0];
  const counts: Record<string, string | null> = section.id === 'practise' && summary ? { dsa: `${summary.totals.solved}/${summary.totals.total}` } : {};
  const practise = section.id === 'practise';
  const toggle = () => setCollapsed((c) => { try { localStorage.setItem(RAIL_KEY, c ? 'full' : 'icons'); } catch { /* ignore */ } return !c; });

  const list = (compact: boolean) => (
    <div className="space-y-4">
      {groups.map((g, gi) => (
        <div key={g.title || gi}>
          {g.title && !compact && <p className="px-3 pb-1 text-xs font-semibold text-muted">{g.title}</p>}
          {g.title && compact && gi > 0 && <hr className="mx-3 mb-2 border-line" />}
          <ul className="space-y-0.5">
            {g.items.map((i) => <RailItem key={i.id} item={i} compact={compact} pathname={path} asPath={asPath} count={counts[i.id]} summary={summary} />)}
          </ul>
        </div>
      ))}
    </div>
  );

  return (
    <div className="section-shell">
      <div className={cn('mx-auto grid w-full max-w-[1760px] lg:gap-8 lg:px-6 lg:pt-6',
        collapsed ? 'lg:grid-cols-[72px_minmax(0,1fr)]' : 'lg:grid-cols-[232px_minmax(0,1fr)]',
        practise && (collapsed ? 'xl:grid-cols-[72px_minmax(0,1fr)_300px]' : 'xl:grid-cols-[232px_minmax(0,1fr)_300px]'))}>
        <aside aria-label={`${section.label} pages`} className="hidden lg:block">
          <nav className="sticky max-h-[calc(100dvh-var(--header-total,64px)-32px)] space-y-4 overflow-y-auto pb-6 [scrollbar-width:thin]" style={{ top: 'calc(var(--header-total, 64px) + 16px)' }}>
            {!collapsed && <p className="px-3 font-display text-lg font-bold text-heading">{section.label}</p>}
            {list(collapsed)}
            <button type="button" onClick={toggle} aria-label={collapsed ? 'Expand the menu' : 'Collapse the menu'}
              className={cn('flex min-h-[40px] w-full items-center gap-2 rounded-xl px-3 text-sm font-medium text-muted hover:bg-surface-hover hover:text-heading focus-ring', collapsed && 'justify-center px-0')}>
              {collapsed ? <PanelLeftOpen className="h-5 w-5" aria-hidden /> : <><PanelLeftClose className="h-5 w-5" aria-hidden /> Collapse</>}
            </button>
          </nav>
        </aside>

        <div className="section-main min-w-0">
          {/* Phone/tablet: one switcher instead of a sideways tab strip. */}
          <div className="relative px-4 pt-3 sm:px-6 lg:hidden">
            <button type="button" aria-expanded={menu} aria-controls="section-menu" onClick={() => setMenu((m) => !m)}
              className="flex min-h-[48px] w-full items-center gap-3 rounded-xl border border-line bg-card px-4 text-left text-body-md font-semibold text-heading focus-ring">
              {current && <current.icon className="h-5 w-5 shrink-0 text-signal-ink" />}
              <span className="min-w-0 flex-1 truncate">{section.label} · {current?.label}</span>
              <ChevronDown className={cn('h-5 w-5 shrink-0 text-muted transition-transform', menu && 'rotate-180')} aria-hidden />
            </button>
            {menu && (
              <div id="section-menu" className="absolute inset-x-4 top-[calc(100%+6px)] z-40 max-h-[70vh] overflow-y-auto rounded-2xl border border-line bg-card p-3 shadow-xl sm:inset-x-6">
                {list(false)}
              </div>
            )}
          </div>
          {children}
        </div>

        {practise && (
          <aside aria-label="Your practice" className="hidden xl:block">
            <div className="sticky" style={{ top: 'calc(var(--header-total, 64px) + 16px)' }}><PractiseAside /></div>
          </aside>
        )}
      </div>
      {/* One full-width footer for rail pages; pages' own footers are hidden inside the rail column (globals.css). */}
      <Footer />
    </div>
  );
}
