import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, TrendingUp } from 'lucide-react';
import { fetchPrep, type PrepView } from '@/lib/prepApi';

/**
 * After a company test (INFOSYS_SE_3T_UX_PLAN §4–5): readiness was → now, the
 * weakest section, the lessons to read and the retest, then back to the plan.
 */
export const PrepResultPanel: React.FC<{ slug: string }> = ({ slug }) => {
  const [p, setP] = useState<PrepView | null>(null);
  useEffect(() => { fetchPrep(slug).then(setP).catch(() => {}); }, [slug]);
  if (!p) return null;
  const r = p.readiness;
  const up = r.previous !== null ? r.score - r.previous : 0;
  return (
    <section className="mt-6 rounded-2xl border border-signal/40 bg-card p-6 text-left shadow-sm">
      <p className="eyebrow">{p.company.name} readiness</p>
      <p className="mt-1 flex flex-wrap items-baseline gap-3 font-display text-4xl font-bold text-heading">
        {r.score}%
        {r.previous !== null && up !== 0 && (
          <span className={`flex items-center gap-1 text-lg ${up > 0 ? 'text-success' : 'text-danger'}`}><TrendingUp className="h-5 w-5" aria-hidden /> was {r.previous}%</span>
        )}
      </p>
      <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {p.sections.map((s) => (
          <li key={s.key} className="flex justify-between rounded-xl bg-surface-hover px-4 py-2 text-base">
            <span className="text-heading">{s.name}</span>
            <span className={`font-bold tabular-nums ${s.score === null ? 'text-muted' : s.score < 50 ? 'text-danger' : s.score < 70 ? 'text-amber-deep' : 'text-success'}`}>{s.score === null ? '—' : `${s.score}%`}</span>
          </li>
        ))}
      </ul>
      <div className="mt-5 rounded-xl border border-danger/30 p-4">
        <p className="text-lg font-bold text-heading">Fix next: {p.fix.name}{p.fix.score !== null ? ` (${p.fix.score}%)` : ''}</p>
        <ul className="mt-2 space-y-1">
          {p.fix.lessons.map((l) => (
            <li key={l.id}><Link href={`/prep/${slug}/learn/${l.id}`} className="text-base font-semibold text-link">Read: {l.title.replace(/^[^:]+:\s*/, '')}</Link></li>
          ))}
        </ul>
        {p.fix.test_slug && p.owned && <Link href={`/practice/test/${p.fix.test_slug}`} className="btn btn-ghost mt-3 min-h-[44px] px-4 text-base">Then retest {p.fix.name}</Link>}
      </div>
      <Link href={`/prep/${slug}`} className="btn btn-primary mt-5 min-h-[52px] w-full text-lg">Back to my {p.company.name} plan <ArrowRight className="h-5 w-5" aria-hidden /></Link>
    </section>
  );
};
