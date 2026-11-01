import React, { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ArrowRight, BookOpen, Check, ClipboardCheck, Lock, MessageSquare, RotateCcw, Target, Trophy } from 'lucide-react';
import { ProgressRing } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { readinessBand, BAND_CLASS } from '@/lib/readiness';
import { fetchPrep, markLesson, prepHref, setPrepDate, type PrepItem, type PrepView } from '@/lib/prepApi';

/**
 * "My <company> prep" (INFOSYS_SE_PREP_PLAN.md §1): readiness, countdown,
 * today's tasks, the fix list, section scores and the full roadmap. Pack
 * owners get every test; others see the plan with locked tests.
 */
const KIND_ICON = { lesson: BookOpen, sectional: ClipboardCheck, mock: Trophy, revision: RotateCcw, interview: MessageSquare } as const;
const KIND_LABEL = { lesson: 'Lesson', sectional: 'Section test', mock: 'Full mock', revision: 'Revision test', interview: 'Interview prep' } as const;

const fmt = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

export default function PrepPage() {
  const { query } = useRouter();
  const slug = String(query.slug || '');
  const { user } = useAuth();
  const [data, setData] = useState<PrepView | null>(null);
  const [error, setError] = useState('');
  const [showAll, setShowAll] = useState(false);

  const load = useCallback(() => {
    if (!slug) return;
    fetchPrep(slug).then(setData).catch((e) => setError(e.message));
  }, [slug]);
  useEffect(() => { if (user) load(); }, [user, load]);

  const done = async (id: string) => { await markLesson(slug, id).catch(() => {}); load(); };

  if (!user) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold text-heading">Sign in to see your prep plan</h1>
        <Link href={`/login?next=/prep/${slug}`} className="btn btn-primary mt-6 inline-flex min-h-[48px] px-6">Sign in</Link>
      </main>
    );
  }
  if (error) return <main className="mx-auto max-w-xl px-4 py-16 text-center text-muted">{error}</main>;
  if (!data) return <main className="mx-auto max-w-5xl px-4 py-16 text-center text-muted" aria-busy="true">Building your plan…</main>;

  const r = data.readiness;
  const b = readinessBand(r.score);
  const locked = (it: PrepItem) => !data.owned && (it.kind === 'sectional' || it.kind === 'revision' || it.kind === 'interview' || (it.kind === 'mock' && (data.full_mock?.attempts || 0) > 0));

  const ItemRow: React.FC<{ it: PrepItem }> = ({ it }) => {
    const Icon = KIND_ICON[it.kind];
    const isLocked = locked(it);
    return (
      <li className="flex items-center gap-3 rounded-xl border border-line bg-card p-3">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${it.done ? 'bg-success-soft text-success' : 'bg-signal-soft text-amber-deep'}`} aria-hidden>
          {it.done ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-semibold uppercase tracking-wider text-muted">{KIND_LABEL[it.kind]}</span>
          <span className={`block truncate font-semibold ${it.done ? 'text-muted line-through' : 'text-heading'}`}>{it.title}</span>
        </span>
        {isLocked ? (
          <Link href={`/company/${slug}#prep-pack`} className="btn btn-ghost min-h-[40px] px-3 text-sm"><Lock className="h-4 w-4" aria-hidden /> Pack</Link>
        ) : (
          <>
            {it.kind === 'lesson' && !it.done && (
              <button type="button" onClick={() => done(it.ref)} className="btn btn-ghost min-h-[40px] px-3 text-sm">Mark done</button>
            )}
            <Link href={prepHref(slug, it)} className="btn btn-primary min-h-[40px] px-4 text-sm">{it.kind === 'lesson' ? 'Read' : 'Start'} <ArrowRight className="h-4 w-4" aria-hidden /></Link>
          </>
        )}
      </li>
    );
  };

  const upcoming = data.plan.filter((d) => d.date >= data.today.date);
  const visible = showAll ? data.plan : upcoming.slice(0, 10);

  return (
    <>
      <Head><title>My {data.company.name} prep | TieEdu</title></Head>
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <p className="eyebrow">My prep</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-heading sm:text-4xl">{data.company.name}</h1>

        {!data.owned && (
          <div className="mt-4 flex flex-col gap-3 rounded-card border border-signal/40 bg-signal-soft p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-heading">You are on the free plan: lessons and 1 full mock. The pack unlocks section tests, revision tests, unlimited mocks and every interview answer.</p>
            <Link href={`/company/${slug}#prep-pack`} className="btn btn-primary min-h-[44px] shrink-0 px-5">Get the pack</Link>
          </div>
        )}

        {/* Readiness + countdown */}
        <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-[auto_1fr]">
          <div className="flex items-center gap-5 rounded-card border border-line bg-card p-5 shadow-edge-neutral">
            <ProgressRing value={r.score} size={128} thickness={12} label={`${data.company.name} readiness`} />
            <div>
              <p className="text-sm text-muted">Readiness</p>
              {b && <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-sm font-semibold ${BAND_CLASS[b.tone]}`}>{b.label}</span>}
              <dl className="mt-3 space-y-1 text-sm">
                <div className="flex justify-between gap-6"><dt className="text-muted">Tests (60%)</dt><dd className="font-semibold tabular-nums text-heading">{r.test}%</dd></div>
                <div className="flex justify-between gap-6"><dt className="text-muted">Lessons (25%)</dt><dd className="font-semibold tabular-nums text-heading">{r.lessons}%</dd></div>
                <div className="flex justify-between gap-6"><dt className="text-muted">Practice (15%)</dt><dd className="font-semibold tabular-nums text-heading">{r.consistency}%</dd></div>
              </dl>
            </div>
          </div>
          <div className="rounded-card border border-line bg-card p-5 shadow-edge-neutral">
            <p className="flex items-center gap-1.5 text-sm text-muted"><Target className="h-4 w-4" aria-hidden /> Test day</p>
            <p className="font-display text-3xl font-bold text-heading">{data.days_left} days left</p>
            <p className="text-sm text-muted">{fmt(data.test_date)} · plan of {data.plan.length} days</p>
            <label className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted">
              Change date
              <input
                type="date"
                defaultValue={data.test_date}
                onChange={async (e) => { if (e.target.value) { await setPrepDate(slug, e.target.value).catch(() => {}); load(); } }}
                className="min-h-[40px] rounded-lg border border-line bg-card px-2 text-heading"
              />
            </label>
            <p className="mt-3 text-sm text-body">{b?.message(data.company.name)}</p>
          </div>
        </section>

        {/* Today */}
        <section className="mt-8">
          <h2 className="font-display text-xl font-bold text-heading">Today · Day {data.today.day} · {data.today.phase}</h2>
          <ul className="mt-3 space-y-2">{data.today.items.map((it, i) => <ItemRow key={i} it={it} />)}</ul>
        </section>

        {/* Fix list */}
        <section className="mt-8 rounded-card border border-danger/30 bg-card p-5 shadow-edge-neutral">
          <h2 className="font-display text-lg font-bold text-heading">Fix next: {data.fix.name}{data.fix.score !== null ? ` · ${data.fix.score}%` : ''}</h2>
          <p className="text-sm text-muted">Read these, then retest the section.</p>
          <ul className="mt-3 space-y-2">
            {data.fix.lessons.map((l) => <ItemRow key={l.id} it={{ kind: 'lesson', ref: l.id, title: l.title, done: false }} />)}
            {data.fix.test_slug && <ItemRow it={{ kind: 'sectional', ref: data.fix.test_slug, title: `${data.fix.name} test`, done: false }} />}
          </ul>
        </section>

        {/* Section scores */}
        <section className="mt-8">
          <h2 className="font-display text-xl font-bold text-heading">Section scores</h2>
          <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.sections.map((s) => (
              <li key={s.key} className="rounded-card border border-line bg-card p-4 shadow-edge-neutral">
                <div className="flex items-baseline justify-between">
                  <p className="font-semibold text-heading">{s.name}</p>
                  <p className="font-display text-2xl font-bold tabular-nums text-heading">{s.score === null ? '—' : `${s.score}%`}</p>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-hover" aria-hidden>
                  <div className={`h-full rounded-full ${s.score !== null && s.score < 50 ? 'bg-danger' : s.score !== null && s.score < 70 ? 'bg-signal' : 'bg-success'}`} style={{ width: `${s.score ?? 0}%` }} />
                </div>
                <p className="mt-2 text-sm text-muted">
                  {s.attempts} test{s.attempts === 1 ? '' : 's'} · lessons {s.lessons_done}/{s.lessons_total}
                  {s.trend.length > 1 && ` · trend ${s.trend.join(' → ')}`}
                </p>
                {s.test_slug && (
                  data.owned
                    ? <Link href={`/skill-test/${s.test_slug}/assessment`} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-link">Take the section test <ArrowRight className="h-4 w-4" aria-hidden /></Link>
                    : <span className="mt-3 inline-flex items-center gap-1 text-sm text-muted"><Lock className="h-4 w-4" aria-hidden /> Section test in the pack</span>
                )}
              </li>
            ))}
          </ul>
          {data.full_mock && (
            <p className="mt-3 text-sm text-muted">
              Full mocks taken: {data.full_mock.attempts}{data.full_mock.last !== null && ` · last score ${data.full_mock.last}%`} ·{' '}
              <Link href={`/skill-test/${data.full_mock.slug}/assessment`} className="font-semibold text-link">Take a full mock</Link>
            </p>
          )}
        </section>

        {/* Roadmap */}
        <section className="mt-8">
          <h2 className="font-display text-xl font-bold text-heading">Your roadmap</h2>
          <ol className="mt-3 space-y-2">
            {visible.map((d) => {
              const all = d.items.every((i) => i.done);
              const isToday = d.date === data.today.date;
              return (
                <li key={d.day} className={`flex items-start gap-3 rounded-xl border p-3 ${isToday ? 'border-signal bg-signal-soft' : 'border-line bg-card'}`}>
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold ${all ? 'bg-success text-white' : 'bg-surface-hover text-heading'}`}>{all ? <Check className="h-4 w-4" aria-hidden /> : d.day}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-heading">{fmt(d.date)} · {d.phase}{isToday ? ' · today' : ''}</span>
                    <span className="block text-sm text-muted">{d.items.map((i) => i.title).join(' · ')}</span>
                  </span>
                </li>
              );
            })}
          </ol>
          <button type="button" onClick={() => setShowAll((v) => !v)} className="btn btn-ghost mt-3 min-h-[44px] px-4 text-sm">
            {showAll ? 'Show the next 10 days' : `Show all ${data.plan.length} days`}
          </button>
        </section>
      </main>
    </>
  );
}
