import React, { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ArrowRight, BookOpen, Check, ClipboardCheck, Lock, MessageSquare, RotateCcw, Target, TrendingUp, Trophy } from 'lucide-react';
import { ProgressRing } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { readinessBand, BAND_CLASS } from '@/lib/readiness';
import { PrepNav, type PrepTab } from '@/components/prep/PrepNav';
import { BuyPackSheet } from '@/components/prep/BuyPackSheet';
import { PlanLoader } from '@/components/prep/PlanLoader';
import { fetchPrep, markLesson, prepHref, setPrepDate, type PrepItem, type PrepView } from '@/lib/prepApi';

/**
 * My company prep (INFOSYS_SE_3T_UX_PLAN §2b): readiness and days left on top,
 * then Plan · Train · Test · Track. Pack owners land here from the company
 * page; free students see the same screens with locks that open the pack sheet.
 */
const KIND_ICON = { lesson: BookOpen, sectional: ClipboardCheck, mock: Trophy, revision: RotateCcw, interview: MessageSquare } as const;
const KIND_LABEL = { lesson: 'Lesson', sectional: 'Section test', mock: 'Full mock', revision: 'Revision test', interview: 'Interview prep' } as const;

const fmt = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
const TABS: PrepTab[] = ['plan', 'train', 'test', 'track'];

export default function PrepPage() {
  const router = useRouter();
  const slug = String(router.query.slug || '');
  const tab: PrepTab = TABS.includes(router.query.tab as PrepTab) ? (router.query.tab as PrepTab) : 'plan';
  const { user } = useAuth();
  const [data, setData] = useState<PrepView | null>(null);
  const [error, setError] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [sheet, setSheet] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!slug) return;
    fetchPrep(slug).then(setData).catch((e) => setError(e.message));
  }, [slug]);
  useEffect(() => { if (user) load(); }, [user, load]);

  useEffect(() => { if (slug && router.query.tab === 'lab') router.replace(`/prep/${slug}/lab`); }, [slug, router]);
  const setTab = (t: PrepTab) => router.replace({ query: { slug, ...(t === 'plan' ? {} : { tab: t }) } }, undefined, { shallow: true });
  const done = async (id: string) => { await markLesson(slug, id).catch(() => {}); load(); };

  if (!user) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold text-heading">Sign in to see your prep plan</h1>
        <Link href={`/login?next=/prep/${slug}`} className="btn btn-primary mt-6 inline-flex min-h-[48px] px-6">Sign in</Link>
      </main>
    );
  }
  if (error) return <main className="mx-auto max-w-xl px-4 py-16 text-center text-base text-muted">{error}</main>;
  if (!data) return <PlanLoader />;

  const r = data.readiness;
  const b = readinessBand(r.score);
  const mockTaken = (data.full_mock?.attempts || 0) > 0;
  const lessonFree = (id: string) => !!data.lessons.find((l) => l.id === id)?.free;
  const locked = (it: PrepItem) => !data.owned && (
    it.kind === 'sectional' || it.kind === 'revision' || it.kind === 'interview' || (it.kind === 'mock' && mockTaken) || (it.kind === 'lesson' && !lessonFree(it.ref) && !data.lessons_open)
  );

  const ItemRow: React.FC<{ it: PrepItem }> = ({ it }) => {
    const Icon = KIND_ICON[it.kind];
    const isLocked = !it.soon && locked(it);
    return (
      <li className="flex items-center gap-3 rounded-xl border border-line bg-card p-3">
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${it.done ? 'bg-success-soft text-success' : 'bg-signal-soft text-amber-deep'}`} aria-hidden>
          {it.done ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold uppercase tracking-wider text-muted">{KIND_LABEL[it.kind]}</span>
          <span className={`block font-semibold sm:text-lg ${it.done ? 'text-muted line-through' : 'text-heading'}`}>{it.title}</span>
        </span>
        {it.soon ? (
          <span className="shrink-0 rounded-full bg-surface-hover px-3 py-1 text-sm font-semibold text-muted">Coming soon</span>
        ) : isLocked ? (
          <button type="button" onClick={() => setSheet(it.title)} className="btn btn-ghost min-h-[44px] px-3 text-base"><Lock className="h-4 w-4" aria-hidden /> Unlock</button>
        ) : (
          <Link href={prepHref(slug, it)} className="btn btn-primary min-h-[44px] px-4 text-base">{it.kind === 'lesson' ? 'Read' : 'Start'} <ArrowRight className="h-4 w-4" aria-hidden /></Link>
        )}
      </li>
    );
  };

  const upcoming = data.plan.filter((d) => d.date >= data.today.date);
  // Today finished: offer the next unfinished task from the coming days.
  const aheadItem = data.today.items.every((i) => i.done)
    ? upcoming.filter((d) => d.date > data.today.date).flatMap((d) => d.items).find((i) => !i.done && i.ref) || null
    : null;
  // Calendar programs: by default only the days up to the next milestone; later milestones stay collapsed.
  const nextMs = data.next_milestone;
  const visible = showAll ? data.plan : nextMs ? upcoming.filter((d) => d.date <= nextMs.date) : upcoming.slice(0, 10);
  const later = nextMs && !showAll
    ? Array.from(new Set(data.plan.filter((d) => d.date > nextMs.date).map((d) => d.phase))).map((phase) => {
        const days = data.plan.filter((d) => d.date > nextMs.date && d.phase === phase);
        return { phase, from: days[0].date, to: days[days.length - 1].date, count: days.length };
      })
    : [];
  const weakest = data.sections.filter((s) => s.score !== null).sort((a, z) => a.score! - z.score!)[0];
  const L = data.labels || { section_tests: 'Section tests', section_test: 'section test', full_mock: 'Full mock', mock_blurb: 'Real pattern, fresh questions every attempt.' };
  const mockQs = data.full_mock?.questions;
  const ms = data.next_milestone;

  return (
    <>
      <Head><title>My {data.company.name} prep | TiEEdu</title></Head>
      <PrepNav slug={slug} name={data.company.name} active={tab} onTab={setTab} lab={!!data.lab} wide />
      <main className="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl font-bold text-heading sm:text-4xl">My {data.company.name} prep</h1>
          {data.free
            ? <span className="rounded-full bg-success-soft px-3 py-1 text-sm font-bold text-success">Free · all unlocked ✓</span>
            : data.owned && <span className="rounded-full bg-success-soft px-3 py-1 text-sm font-bold text-success">Pack active ✓</span>}
        </div>

        {data.free && L.free_note && <p className="mt-3 text-base text-muted">{L.free_note}</p>}

        {!data.owned && (
          <div className="mt-4 flex flex-col gap-3 rounded-card border border-signal/40 bg-signal-soft p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-base text-heading">Free plan: 1 full demo mock and the first lesson of every section. The pack unlocks everything else.</p>
            <button type="button" onClick={() => setSheet('')} className="btn btn-primary min-h-[48px] shrink-0 px-5">See what&apos;s in the pack</button>
          </div>
        )}

        {/* Readiness + countdown: shown on every tab */}
        <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-[auto_1fr]">
          <div className="flex items-center gap-5 rounded-card border border-line bg-card p-5 shadow-edge-neutral">
            <ProgressRing value={r.score} size={132} thickness={12} label={`${data.company.name} readiness`} />
            <div>
              <p className="text-base text-muted">Readiness</p>
              {b && <span className={`mt-1 inline-block rounded-full px-3 py-1 text-base font-semibold ${BAND_CLASS[b.tone]}`}>{b.label}</span>}
              {r.week_change !== 0 && <p className={`mt-2 flex items-center gap-1 text-base font-semibold ${r.week_change > 0 ? 'text-success' : 'text-danger'}`}><TrendingUp className="h-4 w-4" aria-hidden /> {r.week_change > 0 ? '+' : ''}{r.week_change}% this week</p>}
              <dl className="mt-2 space-y-1 text-base">
                <div className="flex justify-between gap-6"><dt className="text-muted">Tests (60%)</dt><dd className="font-semibold tabular-nums text-heading">{r.test}%</dd></div>
                <div className="flex justify-between gap-6"><dt className="text-muted">Lessons (25%)</dt><dd className="font-semibold tabular-nums text-heading">{r.lessons}%</dd></div>
                <div className="flex justify-between gap-6"><dt className="text-muted">Practice (15%)</dt><dd className="font-semibold tabular-nums text-heading">{r.consistency}%</dd></div>
              </dl>
            </div>
          </div>
          <div className="rounded-card border border-line bg-card p-5 shadow-edge-neutral">
            <p className="flex items-center gap-1.5 text-base text-muted"><Target className="h-5 w-5" aria-hidden /> {ms ? `Next: ${ms.name}` : 'Test day'}</p>
            <p className="font-display text-4xl font-bold text-heading">{data.days_left === 0 ? 'Today' : `${data.days_left} day${data.days_left === 1 ? '' : 's'} left`}</p>
            <p className="text-base text-muted">{fmt(data.test_date)} · plan of {data.plan.length} days</p>
            <label className="mt-3 flex flex-wrap items-center gap-2 text-base text-muted">
              Change test date
              <input
                type="date"
                defaultValue={data.test_date}
                onChange={async (e) => { if (e.target.value) { await setPrepDate(slug, e.target.value).catch(() => {}); load(); } }}
                className="min-h-[44px] rounded-lg border border-line bg-card px-2 text-heading"
              />
            </label>
            <p className="mt-3 text-base text-body">{b?.message(data.company.name)}</p>
          </div>
        </section>

        {tab === 'plan' && (
          <>
            {!mockTaken && data.full_mock && !data.free && (
              <section className="mt-8 flex flex-col gap-4 rounded-card bg-brand-ink p-6 text-white sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="eyebrow text-money">Step 1 · Free</p>
                  <h2 className="mt-1 font-display text-2xl font-bold text-white">Take the free demo test</h2>
                  <p className="mt-1 text-base text-white/80">{mockQs ? `${mockQs} questions in the real ${data.company.name} pattern.` : 'The real test pattern.'} You get your score in every section and exactly what to study first.</p>
                </div>
                <Link href={`/practice/test/${data.full_mock.slug}`} className="btn btn-primary min-h-[52px] shrink-0 px-6 text-lg">Start demo test <ArrowRight className="h-5 w-5" aria-hidden /></Link>
              </section>
            )}

            {/* Calendar programs: the next milestone's own test, front and centre. */}
            {ms && (() => {
              const s = data.sections.find((x) => x.key === ms.key);
              if (!s?.test_slug) return null;
              return (
                <section className="mt-8 flex flex-col gap-4 rounded-card bg-brand-ink p-6 text-white sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="eyebrow text-money">{fmt(ms.date)} · {data.days_left === 0 ? 'today' : `in ${data.days_left} day${data.days_left === 1 ? '' : 's'}`}</p>
                    <h2 className="mt-1 font-display text-2xl font-bold text-white">{ms.name}: mock test</h2>
                    <p className="mt-1 text-base text-white/80">
                      {s.attempts ? `Last score ${s.score}% after ${s.attempts} attempt${s.attempts === 1 ? '' : 's'}. ` : ''}Timed, fresh questions every attempt, full explanations after you submit. Aim for 80%+ twice before the real test.
                    </p>
                  </div>
                  <Link href={`/practice/test/${s.test_slug}`} className="btn btn-primary min-h-[52px] shrink-0 px-6 text-lg">{s.attempts ? 'Retake' : 'Start'} mock <ArrowRight className="h-5 w-5" aria-hidden /></Link>
                </section>
              );
            })()}

            <div className="mt-8 grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <section>
              <h2 className="font-display text-2xl font-bold text-heading">Today · Day {data.today.day} · {data.today.phase}</h2>
              <ul className="mt-3 space-y-2">{data.today.items.map((it, i) => <ItemRow key={i} it={it} />)}</ul>
              {aheadItem && (
                <div className="mt-3 rounded-xl border border-success/40 bg-success-soft p-3">
                  <p className="mb-2 text-base font-semibold text-success">Done for today. Want to get ahead?</p>
                  <ul><ItemRow it={aheadItem} /></ul>
                </div>
              )}
            </section>

            <section className="rounded-card border border-danger/30 bg-card p-5 shadow-edge-neutral">
              <h2 className="font-display text-xl font-bold text-heading">Fix next: {data.fix.name}{data.fix.score !== null ? ` · ${data.fix.score}%` : ''}</h2>
              <p className="text-base text-muted">Read these lessons, then take the {L.section_test} again.</p>
              <ul className="mt-3 space-y-2">
                {data.fix.lessons.map((l) => <ItemRow key={l.id} it={{ kind: 'lesson', ref: l.id, title: l.title, done: false }} />)}
                {data.fix.test_slug && <ItemRow it={{ kind: 'sectional', ref: data.fix.test_slug, title: `${data.fix.name}: ${L.section_test}`, done: false }} />}
              </ul>
            </section>
            </div>

            <section className="mt-8">
              <h2 className="font-display text-2xl font-bold text-heading">Your roadmap</h2>
              <ol className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                {visible.map((d) => {
                  const all = d.items.every((i) => i.done);
                  const isToday = d.date === data.today.date;
                  return (
                    <li key={d.day} className={`flex items-start gap-3 rounded-xl border p-3 ${isToday ? 'border-signal bg-signal-soft' : 'border-line bg-card'}`}>
                      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-base font-bold ${all ? 'bg-success text-white' : 'bg-surface-hover text-heading'}`}>{all ? <Check className="h-4 w-4" aria-hidden /> : d.day}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-base font-semibold text-heading">{fmt(d.date)} · {d.phase}{isToday ? ' · today' : ''}</span>
                        <span className="block text-base text-muted">{d.items.map((i) => i.title).join(' · ')}</span>
                      </span>
                    </li>
                  );
                })}
              </ol>
              {later.length > 0 && (
                <ul className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                  {later.map((m) => (
                    <li key={m.phase} className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-line p-3 text-base text-muted">
                      <span className="font-semibold text-heading">{m.phase}</span>
                      <span>{fmt(m.from)} – {fmt(m.to)} · {m.count} days</span>
                    </li>
                  ))}
                </ul>
              )}
              <button type="button" onClick={() => setShowAll((v) => !v)} className="btn btn-ghost mt-3 min-h-[44px] px-4 text-base">
                {showAll ? (nextMs ? `Show only until ${nextMs.name.split(' · ')[0]}` : 'Show the next 10 days') : `Show all ${data.plan.length} days`}
              </button>
            </section>
          </>
        )}

        {tab === 'train' && (
          <section className="mt-8 grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
            <p className="text-base text-body lg:col-span-2">Read a lesson, answer its practice questions, then take the {L.section_test}. Lessons are ticked when you finish the practice.</p>
            {data.sections.map((s) => {
              const ls = data.lessons.filter((l) => l.section === s.key);
              if (!ls.length) return null;
              return (
                <div key={s.key} className="rounded-card border border-line bg-card p-5 shadow-edge-neutral">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="font-display text-xl font-bold text-heading">{s.name}</h2>
                    <p className="text-base font-semibold text-muted">{s.lessons_done}/{s.lessons_total} done</p>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-hover" aria-hidden><div className="h-full rounded-full bg-success" style={{ width: `${(s.lessons_done / Math.max(1, s.lessons_total)) * 100}%` }} /></div>
                  <ul className="mt-4 space-y-2">
                    {ls.map((l) => <ItemRow key={l.id} it={{ kind: 'lesson', ref: l.id, title: l.title.replace(/^[^:]+:\s*/, ''), done: l.done }} />)}
                    {s.test_slug && <ItemRow it={{ kind: 'sectional', ref: s.test_slug, title: `${s.name}: ${L.section_test}`, done: s.attempts > 0 }} />}
                  </ul>
                </div>
              );
            })}
            {(data.interview_modules || []).length > 0 && (
              <div className="rounded-card border border-line bg-card p-5 shadow-edge-neutral">
                <h2 className="font-display text-xl font-bold text-heading">Interview prep</h2>
                <ul className="mt-3 space-y-2">
                  {data.interview_modules!.map((m) => (
                    <ItemRow key={m.id} it={{ kind: 'interview', ref: m.id, title: `${m.title.replace(/:.*/, '')}: ${m.count} questions with model answers`, done: false }} />
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {tab === 'test' && (
          <section className="mt-8 grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
            {data.full_mock && (
              <div className="rounded-card border border-line bg-card p-5 shadow-edge-neutral">
                <h2 className="font-display text-xl font-bold text-heading">{L.full_mock}{mockQs ? ` · ${mockQs} questions` : ''}{data.full_mock.minutes ? ` · ${data.full_mock.minutes} min` : ''}</h2>
                <p className="mt-1 text-base text-muted">{L.mock_blurb} Taken {data.full_mock.attempts} time{data.full_mock.attempts === 1 ? '' : 's'}{data.full_mock.last !== null && ` · last score ${data.full_mock.last}%`}.</p>
                <ul className="mt-3"><ItemRow it={{ kind: 'mock', ref: data.full_mock.slug, title: mockTaken ? `Take another ${L.full_mock.toLowerCase()}` : data.free ? `Start the ${L.full_mock.toLowerCase()}` : 'Free demo test', done: false }} /></ul>
              </div>
            )}
            <div className="rounded-card border border-line bg-card p-5 shadow-edge-neutral lg:col-span-2 lg:row-start-1">
              <h2 className="font-display text-xl font-bold text-heading">{L.section_tests}</h2>
              <p className="mt-1 text-base text-muted">One at a time, unlimited retakes. Retake your weakest one after reading its lessons.</p>
              <ul className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                {data.sections.map((s) => (
                  <ItemRow key={s.key} it={{ kind: 'sectional', ref: s.test_slug || '', title: `${s.name}${s.score !== null ? ` · last ${s.score}%` : ''}`, done: false, soon: !s.test_slug }} />
                ))}
              </ul>
            </div>
            {weakest?.test_slug && (
              <div className="rounded-card border border-danger/30 bg-card p-5 shadow-edge-neutral">
                <h2 className="font-display text-xl font-bold text-heading">Revision test: your weakest section</h2>
                <ul className="mt-3"><ItemRow it={{ kind: 'revision', ref: weakest.test_slug, title: `${weakest.name} · ${weakest.score}%`, done: false }} /></ul>
              </div>
            )}
          </section>
        )}

        {tab === 'track' && (
          <section className="mt-8 space-y-6">
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {data.sections.map((s) => (
                <li key={s.key} className="rounded-card border border-line bg-card p-4 shadow-edge-neutral">
                  <div className="flex items-baseline justify-between">
                    <p className="text-lg font-semibold text-heading">{s.name}</p>
                    <p className="font-display text-3xl font-bold tabular-nums text-heading">{s.score === null ? '—' : `${s.score}%`}</p>
                  </div>
                  <Trend values={s.trend} />
                  <p className="mt-2 text-base text-muted">{s.attempts} test{s.attempts === 1 ? '' : 's'} · lessons {s.lessons_done}/{s.lessons_total}</p>
                </li>
              ))}
            </ul>
            <div className="rounded-card border border-line bg-card p-5 shadow-edge-neutral">
              <h2 className="font-display text-xl font-bold text-heading">All your tests</h2>
              {data.attempts.length === 0
                ? <p className="mt-2 text-base text-muted">No tests yet. {data.free ? `Start with a ${L.section_test} on the Test tab.` : 'Start with the free demo test on the Plan tab.'}</p>
                : (
                  <ul className="mt-3 divide-y divide-line">
                    {data.attempts.map((a) => (
                      <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                        <span className="min-w-0">
                          <span className="block truncate text-base font-semibold text-heading">{a.title}</span>
                          <span className="block text-sm text-muted">{a.at ? new Date(a.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : ''}</span>
                        </span>
                        <Link href={`/practice/test/${a.slug}/result/${a.id}`} className="shrink-0 text-base font-semibold text-link">{a.score}% · Review</Link>
                      </li>
                    ))}
                  </ul>
                )}
            </div>
          </section>
        )}
      </main>
      {!data.free && <BuyPackSheet open={sheet !== null} onClose={() => setSheet(null)} slug={slug} name={data.company.name} what={sheet || undefined} />}
    </>
  );
}

/** Last 5 scores of a section as a small line chart. */
const Trend: React.FC<{ values: number[] }> = ({ values }) => {
  if (values.length < 2) return <div className="mt-3 h-12 rounded-lg bg-surface-hover" aria-hidden />;
  const w = 240, h = 48;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - (v / 100) * (h - 6) - 3}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-3 h-12 w-full" role="img" aria-label={`Scores: ${values.join(', ')}`}>
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="3" className="text-success" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
};

