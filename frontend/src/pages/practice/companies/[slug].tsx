import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Lock, ArrowRight, Clock, ListChecks, Code2, Gauge, Sparkle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PracticeLayout } from '@/components/practice/PracticeLayout';
import { ProblemRow } from '@/components/practice/ProblemRow';
import { BuyPackSheet } from '@/components/prep/BuyPackSheet';
import { Segmented } from '@/components/ui/Segmented';
import { Chip } from '@/components/ui/Chip';
import { BrandTile } from '@/components/common/BrandTile';
import { ErrorState } from '@/components/common/ErrorState';
import { ProgressRing, MixBar, RouteLine } from '@/components/practice/SetVisuals';
import { fetchCompanyPractice, type CompanyPractice } from '@/lib/codeApi';
import { PracticeSkeleton } from '@/components/practice/PracticeSkeleton';

type Tab = 'coding' | 'tests';

/** One company's practice (PRACTICE_POLISH_PLAN.md §6.2): hero, route line, levels with the recommended next problem, tests. */
export default function CompanyPracticePage() {
  const router = useRouter();
  const slug = String(router.query.slug || '');
  const { user } = useAuth();
  const [d, setD] = useState<CompanyPractice | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('coding');
  const [pack, setPack] = useState(false);
  const levelRefs = useRef<Array<HTMLElement | null>>([]);
  // Defaults keep the page working against an older API (frontend deployed before the backend).
  const load = () => { if (slug) { setError(''); fetchCompanyPractice(slug).then((r) => setD({ ...r, insights: r.insights || { mix: { easy: 0, medium: 0, hard: 0 }, reported: 0, continue: null, readiness: null }, levels: r.levels.map((l) => ({ ...l, recommended: l.recommended ?? null, locked: l.locked ?? 0 })) })).catch((e) => setError(e.message)); } };
  useEffect(load, [slug, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (router.query.tab === 'tests') setTab('tests'); }, [router.query.tab]);

  const c = d?.company;
  const ins = d?.insights;
  const jump = (i: number) => { setTab('coding'); setTimeout(() => levelRefs.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50); };

  return (
    <PracticeLayout title={c ? `${c.name} practice` : 'Company practice'} crumb={{ href: '/practice/companies', label: 'Company sets' }}
      intro={c ? <>Solve the set level by level, then take the tests. {d!.prep && <Link href={`/prep/${slug}`} className="font-semibold text-link hover:underline">Your {c.name} plan and readiness →</Link>}</> : undefined}>
      {error && <ErrorState kind={/no practice set/i.test(error) ? 'notfound' : 'network'} message={error} onRetry={/no practice set/i.test(error) ? undefined : load} action={/no practice set/i.test(error) ? { label: 'All company sets', href: '/practice/companies' } : undefined} />}
      {!d && !error && <PracticeSkeleton kind="list" label="Loading this company's questions" />}
      {d && c && ins && (
        <>
          {/* Hero band */}
          <section className="overflow-hidden rounded-2xl border border-line bg-card">
            <span aria-hidden className="block h-1.5" style={{ background: c.brand_color || 'rgb(var(--rgb-border-subtle))' }} />
            <div className="flex flex-wrap items-center gap-6 p-5 sm:p-6">
              <BrandTile name={c.name} src={c.logo_url} className="h-16 w-16 rounded-2xl" />
              <ProgressRing done={d.progress.solved} total={d.progress.total} size={84} label={`${c.name} progress`} />
              <div className="min-w-[220px] flex-1">
                <p className="text-body-md text-body"><span className="font-semibold text-heading">{d.progress.solved}</span> of {d.progress.total} coding problems solved · {d.levels.length} levels</p>
                <div className="mt-2 max-w-md"><MixBar mix={ins.mix} /></div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {ins.reported > 0 && <Chip>{ins.reported} reported questions</Chip>}
                  <Chip icon={ListChecks}>{d.tests.length ? `${d.tests.length} tests` : 'Tests soon'}</Chip>
                  {ins.readiness != null && <Chip icon={Gauge}>Readiness {ins.readiness}%</Chip>}
                  {c.owned && <Chip tone="success">Pack active</Chip>}
                </div>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto">
                {ins.continue && (
                  <Link href={`/practice/problem/${ins.continue.id}?company=${slug}`} className="btn btn-primary focus-ring inline-flex min-h-[48px] items-center justify-center gap-2 px-5">
                    {ins.continue.started ? 'Continue' : 'Start'}: {ins.continue.title} <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                )}
                {!c.owned && d.progress.locked > 0 && (
                  <button type="button" onClick={() => setPack(true)} className="btn btn-secondary focus-ring inline-flex min-h-[44px] items-center justify-center gap-2 px-5">
                    <Lock className="h-4 w-4" aria-hidden /> Unlock {d.progress.locked} more{c.price ? ` · ₹${c.price}` : ''}
                  </button>
                )}
              </div>
            </div>
            <div className="border-t border-line px-3 pt-4 sm:px-6">
              <RouteLine levels={d.levels} onJump={jump} />
            </div>
          </section>

          <Segmented className="mt-8" label="Company practice" value={tab} onChange={setTab}
            items={[{ key: 'coding', label: 'Coding set', icon: Code2, badge: d.progress.total }, { key: 'tests', label: 'Tests', icon: ListChecks, badge: d.tests.length }]} />

          {tab === 'coding' && (
            <div className="mt-6 space-y-10">
              {d.levels.map((l, li) => {
                const offset = d.levels.slice(0, li).reduce((n, x) => n + x.problems.length, 0);
                const rec = l.recommended ? l.problems.find((p) => p.id === l.recommended) : null;
                return (
                  <section key={l.name} ref={(el) => { levelRefs.current[li] = el; }} className="scroll-mt-28">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <h2 className="font-display text-xl font-semibold text-heading">{l.name}</h2>
                        <p className="text-body-md text-body">{l.blurb}</p>
                      </div>
                      <p className="text-body-md text-muted">{l.solved} / {l.total} solved{l.locked ? ` · ${l.locked} in the pack` : ''}</p>
                    </div>
                    {rec && l.solved < l.total && (
                      <Link href={`/practice/problem/${rec.id}?company=${slug}`} className="mt-3 flex items-center gap-3 rounded-xl border border-signal/40 bg-signal-soft/60 px-4 py-3 text-body-md focus-ring hover:border-signal">
                        <Sparkle className="h-4 w-4 shrink-0 text-signal-ink" aria-hidden />
                        <span className="min-w-0 flex-1"><span className="font-semibold text-signal-ink">Recommended next:</span> <span className="font-semibold text-heading">{rec.title}</span></span>
                        <ArrowRight className="h-4 w-4 shrink-0 text-signal-ink" aria-hidden />
                      </Link>
                    )}
                    <ul className="mt-3 divide-y divide-line overflow-hidden rounded-xl border border-line bg-card">
                      {l.problems.map((p, i) => (
                        <ProblemRow key={p.id} row={p} index={offset + i + 1} href={`/practice/problem/${p.id}?company=${slug}`} onUnlock={() => setPack(true)} showCompanies={false} />
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          )}

          {tab === 'tests' && (
            <div className="mt-6 space-y-3">
              {!d.tests.length && <p className="rounded-2xl border border-line bg-card p-5 text-base text-body">Tests for {c.name} open once its question bank is complete. Until then, the coding set and the <Link href={`/prep/${slug}`} className="font-semibold text-link underline">prep plan</Link> are ready.</p>}
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
