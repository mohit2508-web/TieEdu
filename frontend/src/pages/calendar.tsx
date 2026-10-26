import React, { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { BookOpen, CalendarDays, ClipboardCheck, Flag, RotateCcw, Trash2, Zap } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button, Card, EmptyState, Skeleton } from '@/components/ui';
import { fetchCalendar, type CalendarView, type PlanTaskKind } from '@/lib/calendarApi';
import { updateCpMe } from '@/lib/companyPagesApi';
import { fetchCompanies } from '@/lib/api';
import { cn } from '@/lib/cn';

/*
 * Test dates and countdown (B2). Every company test date a student has set,
 * soonest first, and a day-by-day plan to the soonest one (backend
 * lib/prepPlan). Dates are the same ones set on each company page; this is the
 * one place to see and change all of them.
 */

const dayFmt = new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
const fmt = (d: string) => dayFmt.format(new Date(`${d}T00:00:00Z`));

const TASK_ICON: Record<PlanTaskKind, React.ComponentType<{ className?: string }>> = {
  train: BookOpen,
  test: ClipboardCheck,
  revise: RotateCcw,
  drive: Flag,
  daily: Zap,
};

const countdown = (n: number) => (n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : `${n} days`);

export default function CalendarPage() {
  const { user, loading } = useAuth();
  const [view, setView] = useState<CalendarView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Array<{ name: string; slug: string }>>([]);
  const [slug, setSlug] = useState('');
  const [date, setDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);

  const load = () =>
    fetchCalendar()
      .then(setView)
      .catch(() => setError('Your calendar could not be loaded. Check your connection and try again.'));

  useEffect(() => {
    if (!user) return;
    load();
    fetchCompanies()
      .then((cs) => setCompanies((cs || []).map((c: any) => ({ name: c.name, slug: c.slug })).sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => { /* the form explains itself without the list */ });
  }, [user]);

  const save = async (s: string, d: string) => {
    setBusy(true);
    setFormErr(null);
    try {
      await updateCpMe(s, { test_date: d });
      await load();
      setSlug('');
      setDate('');
    } catch (e) {
      setFormErr((e as Error).message || 'That date could not be saved.');
    } finally {
      setBusy(false);
    }
  };

  const soonest = view?.entries[0] ?? null;
  const todayPlan = useMemo(() => view?.plan?.days.find((d) => d.date === view.today) ?? null, [view]);

  return (
    <>
      <Head>
        <title>Test dates and countdown · TieEdu</title>
        <meta name="description" content="Every company test date in one place, a countdown to each, and a day-by-day plan to the next one." />
      </Head>
      <main className="mx-auto w-full max-w-[880px] px-4 pb-14 pt-6 sm:px-6 sm:pt-10">
        <p className="eyebrow text-signal">Your calendar</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-heading sm:text-4xl">Test dates and countdown</h1>
        <p className="mt-2 max-w-[600px] text-base text-body">
          Add the date of each company’s test. You get a countdown to every one, and a plan for each day until the next.
        </p>

        {!loading && !user && (
          <Card pad="lg" className="mt-6 text-center">
            <p className="font-display text-xl font-bold text-heading">Sign in to keep your test dates</p>
            <p className="mt-1 text-sm text-muted">Your dates and plan are saved to your account, so they follow you to every device.</p>
            <Button href="/login?next=%2Fcalendar" className="mt-4">Sign in</Button>
          </Card>
        )}

        {user && (
          <>
            {error && <p className="mt-6 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>}

            {/* The next test, big. */}
            {soonest && (
              <Card variant="ink" pad="lg" className="mt-6">
                <p className="eyebrow text-money">Next test</p>
                <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-display text-4xl font-bold text-white sm:text-5xl">{countdown(soonest.days_left)}</p>
                    <p className="mt-1 text-white/80">
                      {soonest.company} · {fmt(soonest.date)}
                      {soonest.overall !== null && <> · readiness {soonest.overall}%</>}
                    </p>
                  </div>
                  <Button href={`/company/${soonest.slug}`} kind="secondary">Open {soonest.company}</Button>
                </div>
                {todayPlan && (
                  <div className="mt-5 rounded-[14px] bg-white/[0.06] p-4 ring-1 ring-inset ring-white/10">
                    <p className="eyebrow text-white/70">Today</p>
                    <ul className="mt-2 space-y-2">
                      {todayPlan.tasks.map((t) => {
                        const Icon = TASK_ICON[t.kind];
                        return (
                          <li key={t.href + t.kind}>
                            <Link href={t.href} className="focus-ring flex min-h-[44px] items-center gap-3 rounded-xl bg-white/[0.06] px-3 text-white hover:bg-white/10">
                              <Icon className="h-4 w-4 shrink-0 text-money" />
                              <span className="min-w-0 flex-1 text-sm font-semibold">{t.title}</span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </Card>
            )}

            {/* Add a date */}
            <Card pad="lg" className="mt-6">
              <h2 className="font-display text-lg font-bold text-heading">Add a test date</h2>
              <form
                className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (slug && date) save(slug, date);
                }}
              >
                <label className="block">
                  <span className="text-sm font-semibold text-heading">Company</span>
                  <select value={slug} onChange={(e) => setSlug(e.target.value)} required className="mt-1 min-h-[44px] w-full rounded-xl border border-line bg-card px-3 text-base text-heading">
                    <option value="">Choose a company</option>
                    {companies.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-heading">Test date</span>
                  <input type="date" value={date} min={view?.today} onChange={(e) => setDate(e.target.value)} required autoComplete="off" className="mt-1 min-h-[44px] w-full rounded-xl border border-line bg-card px-3 text-base text-heading" />
                </label>
                <Button type="submit" disabled={busy || !slug || !date}>{busy ? 'Saving…' : 'Add date'}</Button>
              </form>
              {formErr && <p className="mt-2 text-sm text-danger">{formErr}</p>}
            </Card>

            {/* All dates */}
            <section className="mt-6" aria-labelledby="dates-h">
              <h2 id="dates-h" className="font-display text-lg font-bold text-heading">All your test dates</h2>
              {!view && !error && <Skeleton className="mt-3 h-24 w-full rounded-[14px]" />}
              {view && view.entries.length === 0 && (
                <EmptyState icon={CalendarDays} title="No test dates yet" note="Add one above, or set it on any company page." />
              )}
              <ul className="mt-3 space-y-3">
                {view?.entries.map((e) => (
                  <li key={e.slug}>
                    <Card className="flex items-center gap-4">
                      <div className="w-20 shrink-0 text-center">
                        <p className="font-display text-2xl font-bold leading-none text-heading">{e.days_left}</p>
                        <p className="mt-1 text-xs text-muted">{e.days_left === 1 ? 'day' : 'days'} left</p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <Link href={`/company/${e.slug}`} className="block truncate font-bold text-heading hover:text-signal">{e.company}</Link>
                        <p className="text-sm text-muted">{fmt(e.date)}{e.overall !== null && ` · readiness ${e.overall}%`}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => save(e.slug, '')}
                        disabled={busy}
                        aria-label={`Remove the ${e.company} test date`}
                        className="focus-ring flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted hover:bg-surface-hover hover:text-danger"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    </Card>
                  </li>
                ))}
              </ul>
            </section>

            <p className="mt-6 text-sm text-body">
              A test did not go your way?{' '}
              <Link href="/debrief" className="font-semibold text-signal hover:underline">Debrief it in two minutes</Link> and get a plan for the next one.
            </p>

            {/* The plan to the soonest test. */}
            {view?.plan && view.plan.days.length > 0 && (
              <section className="mt-8" aria-labelledby="plan-h">
                <h2 id="plan-h" className="font-display text-lg font-bold text-heading">Your plan to {view.plan.company}</h2>
                <p className="mt-1 text-sm text-muted">Weakest rounds first. It updates itself as you take tests.</p>
                <ol className="mt-4 space-y-2">
                  {view.plan.days.map((d) => (
                    <li key={d.date} className={cn('rounded-[14px] border p-4', d.date === view.today ? 'border-signal bg-signal-soft' : 'border-line bg-card')}>
                      <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted">
                        {d.date === view.today ? 'Today' : fmt(d.date)} · {d.days_left === 0 ? 'test day' : `${d.days_left} to go`}
                      </p>
                      <ul className="mt-2 space-y-1">
                        {d.tasks.map((t) => {
                          const Icon = TASK_ICON[t.kind];
                          return (
                            <li key={t.href + t.kind}>
                              <Link href={t.href} className="focus-ring inline-flex min-h-[32px] items-center gap-2 text-sm font-semibold text-heading hover:text-signal">
                                <Icon className="h-4 w-4 shrink-0 text-signal" aria-hidden />
                                {t.title}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </>
        )}
      </main>
    </>
  );
}
