import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Code2, Building2, ClipboardList, Flame } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PracticeLayout, Progress } from '@/components/practice/PracticeLayout';
import { fetchPracticeHome, type PracticeHome } from '@/lib/codeApi';

/** The last 12 weeks as a grid of days; a filled cell = practised that day. */
function Heatmap({ days }: { days: string[] }) {
  const set = new Set(days);
  const today = new Date();
  const cells = Array.from({ length: 84 }, (_, i) => {
    const d = new Date(today.getTime() - (83 - i) * 86400000);
    const key = d.toISOString().slice(0, 10);
    return { key, on: set.has(key) };
  });
  return (
    <div className="grid grid-flow-col grid-rows-7 gap-1" aria-label={`Practised on ${days.length} days in the last 12 weeks`} role="img">
      {cells.map((c) => <span key={c.key} title={c.key} className={`h-3 w-3 rounded-sm ${c.on ? 'bg-success' : 'bg-surface-hover'}`} />)}
    </div>
  );
}

/** Practice home (PRACTICE_MODE_PLAN.md §3.1): continue, next step, topics, companies, activity. */
export default function PracticeHomePage() {
  const { user } = useAuth();
  const [h, setH] = useState<PracticeHome | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { fetchPracticeHome().then(setH).catch((e) => setError(e.message)); }, [user?.id]);

  return (
    <PracticeLayout title="Practice" intro="Coding problems topic by topic, every company's question set, and tests in the real pattern. Pick up where you left off.">
      {error && <p className="text-base text-danger">{error}</p>}
      {!h && !error && <p className="text-base text-muted">Loading…</p>}
      {h && (
        <div className="space-y-10">
          <section className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-line bg-card p-5 md:col-span-2">
              <p className="text-sm font-medium text-muted">{h.continue ? 'Continue' : 'Start here'}</p>
              {h.continue ? (
                <>
                  <p className="mt-1 text-xl font-semibold text-heading">{h.continue.title}</p>
                  <Link href={`/practice/problem/${h.continue.id}`} className="btn btn-primary focus-ring mt-4 inline-flex min-h-[48px] px-5">Open the editor <ArrowRight className="h-4 w-4" aria-hidden /></Link>
                </>
              ) : h.next ? (
                <>
                  <p className="mt-1 text-xl font-semibold text-heading">{h.next.title}</p>
                  <p className="text-base text-body">{h.next.topic}</p>
                  <Link href={`/practice/problem/${h.next.id}`} className="btn btn-primary focus-ring mt-4 inline-flex min-h-[48px] px-5">Solve your first problem <ArrowRight className="h-4 w-4" aria-hidden /></Link>
                </>
              ) : null}
              {h.continue && h.next && h.next.id !== h.continue.id && (
                <p className="mt-4 text-[15px] text-body">Next up: <Link href={`/practice/problem/${h.next.id}`} className="font-semibold text-link hover:underline">{h.next.title}</Link> · {h.next.topic}</p>
              )}
            </div>
            <div className="rounded-2xl border border-line bg-card p-5">
              <p className="flex items-center gap-2 text-sm font-medium text-muted"><Flame className="h-4 w-4" aria-hidden /> Your practice</p>
              <p className="mt-1 text-3xl font-bold tabular-nums text-heading">{h.totals.solved}<span className="text-lg font-semibold text-muted"> / {h.totals.total} solved</span></p>
              <p className="text-[15px] text-body">{h.totals.attempted} in progress · {h.totals.active_days} active days</p>
              <div className="mt-4 overflow-x-auto"><Heatmap days={h.activity} /></div>
            </div>
          </section>

          <section>
            <div className="flex items-end justify-between gap-4">
              <h2 className="flex items-center gap-2 font-display text-2xl font-semibold text-heading"><Code2 className="h-6 w-6" aria-hidden /> DSA sheet</h2>
              <Link href="/practice/dsa" className="text-[15px] font-semibold text-link hover:underline">All topics →</Link>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {h.topics.map((t) => (
                <Link key={t.key} href={`/practice/dsa#${t.key}`} className="rounded-xl border border-line bg-card p-4 hover:border-signal focus-ring">
                  <p className="text-base font-semibold text-heading">{t.name}</p>
                  <p className="mt-1 text-[15px] text-muted">{t.solved} of {t.total} solved</p>
                  <div className="mt-3"><Progress done={t.solved} total={t.total} label={`${t.name} progress`} /></div>
                </Link>
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-end justify-between gap-4">
              <h2 className="flex items-center gap-2 font-display text-2xl font-semibold text-heading"><Building2 className="h-6 w-6" aria-hidden /> Company sets</h2>
              <Link href="/practice/companies" className="text-[15px] font-semibold text-link hover:underline">All companies →</Link>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {h.companies.map((c) => (
                <Link key={c.slug} href={`/practice/companies/${c.slug}`} className="flex items-center gap-4 rounded-xl border border-line bg-card p-4 hover:border-signal focus-ring">
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-semibold text-heading">{c.name}</p>
                    <p className="text-[15px] text-muted">{c.solved} / {c.total} coding solved · {c.tests} tests{c.owned ? ' · pack active' : ''}</p>
                    <div className="mt-3"><Progress done={c.solved} total={c.total} label={`${c.name} progress`} /></div>
                  </div>
                  <ArrowRight className="h-5 w-5 shrink-0 text-muted" aria-hidden />
                </Link>
              ))}
            </div>
          </section>

          <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-surface p-5">
            <div>
              <p className="flex items-center gap-2 text-lg font-semibold text-heading"><ClipboardList className="h-5 w-5" aria-hidden /> Ready for a full test?</p>
              <p className="text-[15px] text-body">Company mocks in the real pattern, with coding on real test cases.</p>
            </div>
            <Link href="/practice/tests" className="btn btn-ghost focus-ring min-h-[48px] px-5">See company tests</Link>
          </section>
        </div>
      )}
    </PracticeLayout>
  );
}
