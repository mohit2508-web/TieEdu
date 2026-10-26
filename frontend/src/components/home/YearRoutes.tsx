import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { RouteLine, SectionHead } from '@/components/ui';

/**
 * Three routes by year (UI_REDESIGN_PLAN_V2 §7, Home) — "where are you on the
 * route?" answered before the visitor has to understand the product.
 *
 * Every step links to a page that exists today; nothing here promises a
 * feature. The steps are numbered, not ticked: this explains a route, it does
 * not pretend to track one (that is the Today screen's job, Phase 3).
 */

interface YearRoute {
  year: string;
  goal: string;
  steps: string[];
  cta: { label: string; href: string };
  more: { label: string; href: string };
}

const ROUTES: YearRoute[] = [
  {
    year: '1st and 2nd year',
    goal: 'Build the base everything else stands on.',
    steps: ['Programming', 'Data structures', 'Core subjects'],
    cta: { label: 'Start with the basics', href: '/courses?bucket=a&src=routes' },
    more: { label: 'See career tracks', href: '/tracks' },
  },
  {
    year: '3rd year',
    goal: 'Find your gaps while there is time to fix them.',
    steps: ['Skill tests', 'Fill the gaps', 'Certificate'],
    cta: { label: 'Take a free skill test', href: '/skill-test' },
    more: { label: 'Placement courses', href: '/courses?bucket=d&src=routes' },
  },
  {
    year: 'Final year',
    goal: 'Prepare for the companies coming to your campus.',
    steps: ['Pick companies', 'Learn their rounds', 'Mock drive'],
    cta: { label: 'Browse companies', href: '/companies' },
    more: { label: 'Mock drives', href: '/mock-drive' },
  },
];

export const YearRoutes: React.FC = () => (
  <section className="py-12 sm:py-16" aria-labelledby="routes-title">
    <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6">
      <SectionHead id="routes-title" eyebrow="Your route" title="Where are you right now?" description="Pick your year. Each route starts with something free." />
      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        {ROUTES.map((r) => (
          <article key={r.year} className="flex min-w-0 flex-col rounded-[14px] border border-line bg-card p-5 sm:p-6">
            <p className="eyebrow text-signal-ink">{r.year}</p>
            <h3 className="mt-2 font-display text-xl font-bold text-heading">{r.goal}</h3>
            <RouteLine numbered className="mt-6" stations={r.steps.map((label) => ({ label, state: 'next' as const }))} />
            <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-6">
              <Link
                href={r.cta.href}
                className="pressable focus-ring inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-signal px-4 text-sm font-semibold text-white transition-colors hover:bg-signal-hover"
              >
                {r.cta.label} <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link href={r.more.href} className="focus-ring inline-flex min-h-[44px] items-center text-sm font-semibold text-signal hover:underline">
                {r.more.label}
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  </section>
);

export default YearRoutes;
