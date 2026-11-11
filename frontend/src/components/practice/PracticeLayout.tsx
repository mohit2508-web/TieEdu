import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { LayoutGrid, Code2, Building2, ListChecks } from 'lucide-react';

/** Header icon per practice page (the rails now come from SectionShell, UI_FIX_PLAN.md §3). */
const ICONS: Array<{ prefix: string; icon: React.ComponentType<{ className?: string }> }> = [
  { prefix: '/practice/dsa', icon: Code2 },
  { prefix: '/practice/companies', icon: Building2 },
  { prefix: '/practice/tests', icon: ListChecks },
  { prefix: '/practice/test', icon: ListChecks },
];

/**
 * A Practice page: the page header (icon · crumb · title · intro · action) and its content.
 * Navigation (left rail, phone switcher) and the right rail are the section shell's job.
 */
export function PracticeLayout({ title, intro, children, actions, crumb, icon }: {
  title: string; intro?: React.ReactNode; children: React.ReactNode; actions?: React.ReactNode; crumb?: { href: string; label: string };
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const { pathname } = useRouter();
  const HeaderIcon = icon || ICONS.find((x) => pathname.startsWith(x.prefix))?.icon || LayoutGrid;
  return (
    <>
      <Head><title>{`${title} · Practice · TiEEdu`}</title></Head>
      <main className="w-full px-4 pb-16 pt-4 sm:px-6 lg:px-0 lg:pt-0">
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
