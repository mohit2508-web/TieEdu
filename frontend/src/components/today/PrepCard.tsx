import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ProgressRing } from '@/components/ui';
import { readinessBand, BAND_CLASS } from '@/lib/readiness';
import { fetchPrep, prepHref, useTarget, OPEN_TARGET_EVENT, type PrepView } from '@/lib/prepApi';

/**
 * Today screen (INFOSYS_SE_PREP_PLAN.md §1): how ready the student is for the
 * focus company, days left and today's first task, one tap from the plan.
 */
export const PrepCard: React.FC = () => {
  const target = useTarget(true);
  const slug = target?.slug || '';
  const [p, setP] = useState<PrepView | null>(null);
  useEffect(() => { if (slug) fetchPrep(slug).then(setP).catch(() => setP(null)); else setP(null); }, [slug]);
  if (target && !target.slug) {
    return (
      <section className="mt-6 flex flex-col gap-4 rounded-card border border-signal/40 bg-card p-5 shadow-edge-neutral sm:flex-row sm:items-center sm:p-6">
        <div className="min-w-0 flex-1">
          <p className="eyebrow">Your company prep</p>
          <p className="font-display text-xl font-bold text-heading">Which company are you preparing for?</p>
          <p className="mt-1 text-base text-body">Pick it once: you get a day-by-day plan, tests and a readiness score for that company.</p>
        </div>
        <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_TARGET_EVENT))} className="btn btn-primary min-h-[48px] px-6">Choose company</button>
      </section>
    );
  }
  if (!p) return null;
  const b = readinessBand(p.readiness.score);
  const next = p.today.items.find((i) => !i.done) || p.today.items[0];
  return (
    <section className="mt-6 rounded-card border border-signal/40 bg-card p-5 shadow-edge-neutral sm:p-6" aria-label={`${p.company.name} readiness`}>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <ProgressRing value={p.readiness.score} size={104} thickness={10} label={`${p.company.name} readiness`} />
        <div className="min-w-0 flex-1">
          <p className="eyebrow">Your company prep</p>
          <p className="font-display text-xl font-bold text-heading">{p.company.name}</p>
          <p className="mt-1 text-sm text-muted">
            {b && <span className={`mr-2 rounded-full px-2 py-0.5 text-xs font-semibold ${BAND_CLASS[b.tone]}`}>{b.label}</span>}
            {p.days_left} days left · Day {p.today.day} · {p.today.phase}
          </p>
          {next && <p className="mt-2 text-sm text-body">Today: <span className="font-semibold text-heading">{next.title}</span></p>}
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          {next && <Link href={prepHref(slug, next)} className="btn btn-primary min-h-[44px] px-5">Start today’s task <ArrowRight className="h-4 w-4" aria-hidden /></Link>}
          <Link href={`/prep/${slug}`} className="text-sm font-semibold text-link">Open my plan</Link>
          <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_TARGET_EVENT))} className="text-sm text-muted underline">Change company</button>
        </div>
      </div>
    </section>
  );
};
