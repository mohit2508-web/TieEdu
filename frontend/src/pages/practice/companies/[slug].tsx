import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Lock, ArrowRight, Clock, ListChecks, Code2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PracticeLayout, Progress } from '@/components/practice/PracticeLayout';
import { ProblemRow } from '@/components/practice/ProblemRow';
import { BuyPackSheet } from '@/components/prep/BuyPackSheet';
import { Tabs } from '@/components/ui/Tabs';
import { Chip } from '@/components/ui/Chip';
import { fetchCompanyPractice, type CompanyPractice } from '@/lib/codeApi';

type Tab = 'coding' | 'tests';

/** One company's practice (PRACTICE_MODE_PLAN.md §3.3): its coding set by level and its tests. */
export default function CompanyPracticePage() {
  const router = useRouter();
  const slug = String(router.query.slug || '');
  const { user } = useAuth();
  const [d, setD] = useState<CompanyPractice | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('coding');
  const [pack, setPack] = useState(false);
  useEffect(() => { if (slug) fetchCompanyPractice(slug).then(setD).catch((e) => setError(e.message)); }, [slug, user?.id]);
  useEffect(() => { if (router.query.tab === 'tests') setTab('tests'); }, [router.query.tab]);

  const c = d?.company;
  const actions = c && !c.owned && d!.progress.locked > 0 ? (
    <div className="rounded-2xl border border-line bg-card p-4">
      <p className="flex items-center gap-2 text-body-md text-body"><Lock className="h-4 w-4" aria-hidden /> {d!.progress.locked} problems and the full tests are in the pack</p>
      <button type="button" onClick={() => setPack(true)} className="btn btn-primary focus-ring mt-3 min-h-[44px] w-full">Unlock {c.name}{c.price ? ` · ₹${c.price}` : ''}</button>
    </div>
  ) : c?.owned ? <Chip tone="success">Pack active</Chip> : null;

  return (
    <PracticeLayout title={c ? `${c.name} practice` : 'Company practice'} crumb={{ href: '/practice/companies', label: 'Company sets' }} actions={actions}
      intro={c ? <>Solve the set level by level, then take the tests. {d!.prep && <Link href={`/prep/${slug}`} className="font-semibold text-link hover:underline">Your {c.name} plan and readiness →</Link>}</> : undefined}>
      {error && <p className="text-base text-danger">{error}</p>}
      {!d && !error && <p className="text-base text-muted">Loading…</p>}
      {d && (
        <>
          <div className="max-w-md">
            <p className="text-body-md text-body"><span className="font-semibold text-heading">{d.progress.solved}</span> of {d.progress.total} coding problems solved</p>
            <div className="mt-2"><Progress done={d.progress.solved} total={d.progress.total} label="Set progress" /></div>
          </div>
          <Tabs className="mt-6" label="Company practice" value={tab} onChange={setTab}
            items={[{ key: 'coding', label: 'Coding set', icon: Code2, badge: d.progress.total }, { key: 'tests', label: 'Tests', icon: ListChecks, badge: d.tests.length }]} />

          {tab === 'coding' && (
            <div className="mt-6 space-y-8">
              {d.levels.map((l, li) => (
                <section key={l.name}>
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <h2 className="font-display text-xl font-semibold text-heading">{l.name}</h2>
                      <p className="text-body-md text-body">{l.blurb}</p>
                    </div>
                    <p className="text-body-md text-muted">{l.solved} / {l.total} solved</p>
                  </div>
                  <ul className="mt-3 divide-y divide-line overflow-hidden rounded-xl border border-line bg-card">
                    {l.problems.map((p, i) => (
                      <ProblemRow key={p.id} row={p} index={d.levels.slice(0, li).reduce((n, x) => n + x.problems.length, 0) + i + 1}
                        href={`/practice/problem/${p.id}?company=${slug}`} onUnlock={() => setPack(true)} showCompanies={false} />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}

          {tab === 'tests' && (
            <div className="mt-6 space-y-3">
              {!d.tests.length && <p className="text-base text-body">Tests for {c!.name} open once its question bank is complete.</p>}
              {d.tests.map((t) => (
                <div key={t.slug} className="flex flex-wrap items-center gap-4 rounded-xl border border-line bg-card p-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-semibold text-heading">{t.name}</p>
                    <p className="flex flex-wrap items-center gap-x-3 text-body-md text-muted">
                      <span>{t.kind === 'full' ? 'Full mock' : 'Sectional test'}</span>
                      <span>{t.questions} questions{t.coding ? ' + coding' : ''}</span>
                      <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" aria-hidden />{t.minutes} min</span>
                      {t.attempts > 0 && <span>Best {t.best}% · {t.attempts} attempt{t.attempts > 1 ? 's' : ''}</span>}
                    </p>
                  </div>
                  {t.last && <Link href={`/practice/test/${t.slug}/result/${t.last.id}`} className="btn btn-ghost focus-ring min-h-[44px] px-4">Last result</Link>}
                  <Link href={`/practice/test/${t.slug}`} className="btn btn-primary focus-ring min-h-[44px] px-5">{t.attempts ? 'Retake' : 'Start'} <ArrowRight className="h-4 w-4" aria-hidden /></Link>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      <BuyPackSheet open={pack} onClose={() => setPack(false)} slug={slug} what="This set" />
    </PracticeLayout>
  );
}
