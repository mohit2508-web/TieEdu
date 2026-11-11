import React, { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PracticeLayout, Progress } from '@/components/practice/PracticeLayout';
import { ProblemRow } from '@/components/practice/ProblemRow';
import { BuyPackSheet } from '@/components/prep/BuyPackSheet';
import { Chip } from '@/components/ui/Chip';
import { fetchDsaSheet, type DsaSheet } from '@/lib/codeApi';
import { PracticeSkeleton } from '@/components/practice/PracticeSkeleton';

type Diff = 'all' | 'easy' | 'medium' | 'hard';
type Stat = 'all' | 'todo' | 'attempted' | 'solved';

/** The DSA sheet (PRACTICE_MODE_PLAN.md §3.2): topics in study order with filters. */
export default function DsaSheetPage() {
  const { user } = useAuth();
  const [d, setD] = useState<DsaSheet | null>(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [diff, setDiff] = useState<Diff>('all');
  const [stat, setStat] = useState<Stat>('all');
  const [company, setCompany] = useState('all');
  const [reported, setReported] = useState(false);
  const [pack, setPack] = useState<string | null>(null);
  useEffect(() => { fetchDsaSheet().then(setD).catch((e) => setError(e.message)); }, [user?.id]);

  const topics = useMemo(() => (d?.topics || []).map((t) => ({
    ...t,
    shown: t.problems.filter((p) => (diff === 'all' || p.difficulty === diff) && (stat === 'all' || p.status === stat)
      && (company === 'all' || p.companies.some((c) => c.slug === company)) && (!reported || p.kind === 'pyq')
      && (!q.trim() || p.title.toLowerCase().includes(q.trim().toLowerCase()))),
  })), [d, diff, stat, company, reported, q]);
  const shownTotal = topics.reduce((n, t) => n + t.shown.length, 0);

  const filter = <T extends string>(value: T, set: (v: T) => void, options: Array<[T, string]>, label: string) => (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label={label}>
      {options.map(([v, l]) => <Chip key={v} onClick={() => set(v)} selected={value === v}>{l}</Chip>)}
    </div>
  );

  return (
    <PracticeLayout title="DSA sheet" intro="Every problem runs on real test cases in C, C++, Java or Python. Go topic by topic: each starts easy and builds to the level companies ask.">
      {error && <p className="text-base text-danger">{error}</p>}
      {!d && !error && <PracticeSkeleton kind="list" label="Loading the DSA sheet" />}
      {d && (
        <>
          <div className="sticky top-0 z-10 -mx-4 space-y-3 border-b border-line bg-surface/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
            <label className="relative block max-w-md">
              <span className="sr-only">Search problems</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search problems" className="h-11 w-full rounded-xl border border-line bg-card pl-9 pr-3 text-base text-heading focus:border-signal focus:outline-none" />
            </label>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {filter(diff, setDiff, [['all', 'Any level'], ['easy', 'Easy'], ['medium', 'Medium'], ['hard', 'Hard']], 'Difficulty')}
              {filter(stat, setStat, [['all', 'Any status'], ['todo', 'Not started'], ['attempted', 'Attempted'], ['solved', 'Solved']], 'Status')}
              <div className="flex flex-wrap items-center gap-2">
                <label className="sr-only" htmlFor="dsa-company">Company</label>
                <select id="dsa-company" value={company} onChange={(e) => setCompany(e.target.value)} className="h-9 rounded-full border border-line bg-card px-3 text-sm font-medium text-heading focus-ring">
                  <option value="all">All companies</option>
                  {d.companies.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                </select>
                <Chip onClick={() => setReported(!reported)} selected={reported}>Reported questions only</Chip>
              </div>
            </div>
          </div>

          {/* Topic index */}
          <nav aria-label="Topics" className="mt-6 flex flex-wrap gap-2">
            {topics.map((t) => <a key={t.key} href={`#${t.key}`} className="rounded-full border border-line bg-card px-3 py-1.5 text-sm font-medium text-body hover:border-signal hover:text-heading">{t.name} <span className="text-muted">{t.solved}/{t.total}</span></a>)}
          </nav>

          {shownTotal === 0 && <p className="mt-8 text-base text-body">No problems match these filters.</p>}
          <div className="mt-6 space-y-10">
            {topics.filter((t) => t.shown.length).map((t, ti) => (
              <section key={t.key} id={t.key} className="scroll-mt-40">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-muted">Topic {ti + 1}</p>
                    <h2 className="font-display text-2xl font-semibold text-heading">{t.name}</h2>
                    <p className="mt-1 text-body-md text-body">{t.blurb}</p>
                  </div>
                  <div className="w-full max-w-[220px]">
                    <p className="text-right text-body-md text-muted">{t.solved} / {t.total} solved</p>
                    <div className="mt-1"><Progress done={t.solved} total={t.total} label={`${t.name} progress`} /></div>
                  </div>
                </div>
                <ul className="mt-4 divide-y divide-line overflow-hidden rounded-xl border border-line bg-card">
                  {t.shown.map((p) => <ProblemRow key={p.id} row={p} href={`/practice/problem/${p.id}?topic=${t.key}`} onUnlock={(c) => setPack(c.slug)} />)}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}
      <BuyPackSheet open={!!pack} onClose={() => setPack(null)} slug={pack || ''} what="This problem" />
    </PracticeLayout>
  );
}
