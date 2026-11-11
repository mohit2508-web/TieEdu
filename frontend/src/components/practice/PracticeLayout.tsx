import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { cn } from '@/lib/cn';

const SECTIONS = [
  { href: '/practice', label: 'Overview', exact: true },
  { href: '/practice/dsa', label: 'DSA sheet' },
  { href: '/practice/companies', label: 'Company sets' },
  { href: '/practice/tests', label: 'Company tests' },
  { href: '/skill-test', label: 'Skill tests' },
];

/**
 * The Practice hub frame (PRACTICE_MODE_PLAN.md §3): page title, one line of
 * context, and the section tabs, so every practice page shows where you are.
 */
export function PracticeLayout({ title, intro, children, actions, crumb }: {
  title: string; intro?: React.ReactNode; children: React.ReactNode; actions?: React.ReactNode; crumb?: { href: string; label: string };
}) {
  const { pathname } = useRouter();
  return (
    <>
      <Head><title>{`${title} · Practice · TieEdu`}</title></Head>
      <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-4 sm:px-6 lg:pt-8">
        <nav aria-label="Practice sections" className="-mx-1 flex gap-1 overflow-x-auto border-b border-line [scrollbar-width:none]">
          {SECTIONS.map((s) => {
            const on = s.exact ? pathname === s.href : pathname === s.href || pathname.startsWith(`${s.href}/`);
            return (
              <Link key={s.href} href={s.href} aria-current={on ? 'page' : undefined}
                className={cn('relative inline-flex h-11 shrink-0 items-center px-3 text-body-md font-semibold focus-ring', on ? 'text-heading' : 'text-muted hover:text-heading')}>
                {s.label}
                {on && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-signal" aria-hidden />}
              </Link>
            );
          })}
        </nav>
        <header className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            {crumb && <Link href={crumb.href} className="text-body-md font-medium text-link hover:underline">← {crumb.label}</Link>}
            <h1 className="mt-1 font-display text-3xl font-bold text-heading">{title}</h1>
            {intro && <p className="mt-2 max-w-3xl text-base leading-relaxed text-body">{intro}</p>}
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
