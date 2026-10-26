import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { RouteLine, SectionHead } from '@/components/ui';

/**
 * How a company page works, drawn as the route (UI_REDESIGN_PLAN_V2 §3: one ink
 * band per page — this is the home page's).
 *
 * It replaces the old four-tile "How it works" grid, which was cut for being
 * prose nobody read. This is four stations and one line each: the shape of the
 * product rather than a description of it.
 */

const STEPS = [
  { label: 'Pick a company', note: 'Its rounds, in order' },
  { label: 'Read the free pack', note: 'No account needed' },
  { label: 'Practise each round', note: 'Real questions, solved' },
  { label: 'Walk in prepared', note: 'Know what comes next' },
];

export const RouteBand: React.FC = () => (
  <section className="bg-brand-ink py-14 sm:py-20" aria-labelledby="route-band-title">
    <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6">
      <SectionHead
        onInk
        id="route-band-title"
        eyebrow="How it works"
        title="Every company, one round at a time"
        description="Each company page lists its rounds in order, with the questions asked and how to answer them. Every figure says whether we have checked it."
        action={
          <Link
            href="/companies"
            className="pressable focus-ring inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-heading transition-colors hover:bg-white/90"
          >
            Browse companies <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        }
      />
      <RouteLine onInk numbered className="mt-10 hidden sm:block" stations={STEPS.map((s) => ({ ...s, state: 'next' as const }))} />
      <RouteLine onInk numbered orientation="vertical" className="mt-8 sm:hidden" stations={STEPS.map((s) => ({ ...s, state: 'next' as const }))} />
    </div>
  </section>
);

export default RouteBand;
