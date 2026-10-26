import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, CalendarClock, ClipboardCheck, Flame, RotateCw, Snowflake, TrendingUp } from 'lucide-react';
import { Button, Card, EmptyState, ProgressRing, RouteLine, Skeleton } from '@/components/ui';
import { fetchToday, saveGradYear, TodayView } from '@/lib/todayApi';
import { cn } from '@/lib/cn';
import { PassportCard } from './PassportCard';
import { ParentLinkCard } from './ParentLinkCard';

/**
 * Today — the signed-in home (UI_REDESIGN_PLAN_V2 §6.1).
 *
 * One question answered first ("what should I do now?"), then the context:
 * the route, this week, where to resume, last week's recap and the companies
 * being prepared for. Every block comes from /api/me/today and is computed from
 * the student's own records; a block with no data is not rendered, so a new
 * account sees a short, honest page instead of a dashboard of zeros.
 */

const greeting = () => {
  const h = Number(new Intl.DateTimeFormat('en-IN', { hour: 'numeric', hour12: false, timeZone: 'Asia/Kolkata' }).format(new Date()));
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

const longDate = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Kolkata' });
const shortDay = new Intl.DateTimeFormat('en-IN', { weekday: 'narrow', timeZone: 'UTC' });
const shortDate = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });

/** The year question, asked once (§6.5) — inline, never a popup. */
const YearPicker: React.FC<{ onSaved: (t: TodayView) => void }> = ({ onSaved }) => {
  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => thisYear - 1 + i);
  const [year, setYear] = useState(thisYear + 1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end"
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        try {
          onSaved(await saveGradYear(year));
        } catch (err: any) {
          setError(err?.message || 'Could not save. Try again.');
        } finally {
          setSaving(false);
        }
      }}
    >
      <label className="flex flex-col gap-1.5 text-sm font-semibold text-heading">
        I graduate in
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="min-h-[44px] rounded-xl border border-line-strong bg-card px-3 text-base text-heading focus:border-signal focus:outline-none"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </label>
      <Button type="submit" disabled={saving}>
        {saving ? 'Saving…' : 'Save'}
      </Button>
      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
    </form>
  );
};

const StreakWeek: React.FC<{ streak: TodayView['this_week']['streak'] }> = ({ streak }) => (
  <div>
    <div className="flex items-end gap-3">
      <Flame className={cn('h-8 w-8', streak.current > 0 ? 'text-signal' : 'text-muted')} aria-hidden />
      <p className="font-display text-4xl font-bold leading-none tabular-nums text-heading">{streak.current}</p>
      <p className="pb-1 text-sm text-muted">day{streak.current === 1 ? '' : 's'} in a row</p>
    </div>
    <ol className="mt-4 grid grid-cols-7 gap-1.5" aria-label="Last seven days">
      {streak.week.map((d) => (
        <li key={d.day} className="flex flex-col items-center gap-1">
          <span
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full border-2',
              d.state === 'done' && 'border-signal bg-signal text-white',
              d.state === 'frozen' && 'border-info/60 bg-info-soft text-info',
              d.state === 'missed' && 'border-line bg-card',
              d.state === 'today' && 'border-dashed border-signal bg-card'
            )}
            title={`${shortDate.format(new Date(`${d.day}T00:00:00Z`))}: ${d.state === 'today' ? 'today' : d.state}`}
          >
            {d.state === 'frozen' && <Snowflake className="h-3.5 w-3.5" aria-hidden />}
            <span className="sr-only">{`${shortDate.format(new Date(`${d.day}T00:00:00Z`))}: ${d.state}`}</span>
          </span>
          <span className="text-xs text-muted" aria-hidden>
            {shortDay.format(new Date(`${d.day}T00:00:00Z`))}
          </span>
        </li>
      ))}
    </ol>
    <p className="mt-3 text-sm text-muted">
      {streak.protected_by_freeze
        ? 'You missed yesterday. Study today and this week’s freeze covers it.'
        : streak.practised_today
          ? 'Today counts. Finish a lesson or a test tomorrow to keep it going.'
          : streak.freeze_available_this_week
            ? 'Finish a lesson or a test today. One missed day a week is covered.'
            : 'This week’s freeze is used, so today counts.'}
      {streak.best > streak.current && streak.best > 1 && ` Best: ${streak.best} days.`}
    </p>
  </div>
);

/**
 * `ready` is false while sign-in is still restoring: the cached user shows up
 * before the access token does, and a request in that gap would 401.
 */
export const TodayScreen: React.FC<{ ready: boolean }> = ({ ready }) => {
  const [data, setData] = useState<TodayView | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    fetchToday()
      .then(setData)
      .catch(() => setFailed(true));
  }, []);
  useEffect(() => {
    if (ready) load();
  }, [ready, load]);

  if (failed) {
    return (
      <main className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6">
        <EmptyState icon={RotateCw} title="Today could not be loaded." note="Check your connection and try again." action={{ label: 'Try again', onClick: load }} />
      </main>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6" aria-busy="true">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="mt-6 h-40 w-full" />
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </main>
    );
  }

  const step = data.next_step;
  const week = data.this_week;
  const hasWeekNumbers = week.lessons + week.tests + week.xp > 0;

  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6 sm:py-10">
      <header>
        <p className="text-sm text-muted">{longDate.format(new Date())}</p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-heading sm:text-4xl">
          {greeting()}, {data.first_name}.
        </h1>
      </header>

      {/* The route: where you are, then the one thing to do next. */}
      <Card variant="ink" pad="lg" className="mt-6">
        <p className="eyebrow text-money">Your route</p>
        <RouteLine
          onInk
          className="mt-5"
          stations={data.route.map((s) => ({ label: s.label, note: s.note || undefined, state: s.state }))}
        />
        <div className="mt-8 rounded-[14px] bg-white/[0.06] p-5 ring-1 ring-inset ring-white/10 sm:p-6">
          <p className="eyebrow text-white/70">Next step</p>
          <h2 className="mt-2 font-display text-xl font-bold text-white sm:text-2xl">{step.title}</h2>
          <p className="mt-1.5 max-w-2xl text-base text-white/80">{step.body}</p>
          {step.kind === 'set_year' ? (
            <div className="[&_label]:text-white [&_select]:text-heading">
              <YearPicker onSaved={setData} />
            </div>
          ) : (
            step.href && (
              <Button href={step.href} icon={ArrowRight} iconEnd className="mt-5">
                {step.cta}
              </Button>
            )
          )}
        </div>
      </Card>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* This week */}
        <Card className="lg:row-span-2">
          <h2 className="font-display text-lg font-bold text-heading">This week</h2>
          <div className="mt-4">
            <StreakWeek streak={week.streak} />
          </div>
          {hasWeekNumbers && (
            <dl className="mt-5 grid grid-cols-3 gap-2 border-t border-line pt-4 text-center">
              {[
                ['Lessons', week.lessons],
                ['Tests', week.tests],
                ['XP', week.xp],
              ].map(([label, n]) => (
                <div key={label as string}>
                  <dd className="font-display text-2xl font-bold tabular-nums text-heading">{n}</dd>
                  <dt className="text-xs text-muted">{label}</dt>
                </div>
              ))}
            </dl>
          )}
          {week.test_dates.length > 0 && (
            <ul className="mt-5 space-y-2 border-t border-line pt-4">
              {week.test_dates.map((t) => (
                <li key={t.slug}>
                  <Link href={`/company/${t.slug}`} className="group flex items-center gap-3 rounded-lg py-1">
                    <CalendarClock className="h-5 w-5 shrink-0 text-signal" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-heading group-hover:text-signal">{t.company} test</span>
                      <span className="block text-xs text-muted">{shortDate.format(new Date(`${t.date}T00:00:00Z`))}</span>
                    </span>
                    <span className="text-sm font-bold tabular-nums text-heading">
                      {t.days_left === 0 ? 'Today' : `${t.days_left} day${t.days_left === 1 ? '' : 's'}`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Continue */}
        {data.continue && (
          <Card>
            <p className="eyebrow text-muted">Continue</p>
            <div className="mt-3 flex items-center gap-4">
              {data.continue.percent !== null ? (
                <ProgressRing value={data.continue.percent} size={64} thickness={6} label={`${data.continue.title} progress`} tone="train" />
              ) : (
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-test/10 text-test">
                  <ClipboardCheck className="h-7 w-7" aria-hidden />
                </span>
              )}
              <div className="min-w-0">
                <h3 className="line-clamp-2 font-semibold text-heading">{data.continue.title}</h3>
                <p className="text-sm text-muted">{data.continue.detail}</p>
              </div>
            </div>
            <Button href={data.continue.href} kind="secondary" block className="mt-4">
              {data.continue.kind === 'course' ? 'Resume lesson' : 'Back to the test'}
            </Button>
          </Card>
        )}

        {/* Last week */}
        {data.recap && (
          <Card>
            <p className="eyebrow text-muted">Last 7 days</p>
            <ul className="mt-3 space-y-1.5 text-sm text-body">
              {data.recap.lessons > 0 && (
                <li className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-train" aria-hidden /> {data.recap.lessons} lesson{data.recap.lessons === 1 ? '' : 's'} finished
                </li>
              )}
              {data.recap.tests > 0 && (
                <li className="flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4 text-test" aria-hidden /> {data.recap.tests} skill test{data.recap.tests === 1 ? '' : 's'} taken
                </li>
              )}
              {data.recap.certificates > 0 && (
                <li className="flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4 text-success" aria-hidden /> {data.recap.certificates} certificate{data.recap.certificates === 1 ? '' : 's'} earned
                </li>
              )}
              {data.recap.xp > 0 && <li className="pl-6 text-muted">{data.recap.xp} XP</li>}
            </ul>
            {data.recap.best_improvement && (
              <p className="mt-4 flex items-start gap-2 rounded-lg bg-success-soft p-3 text-sm text-success">
                <TrendingUp className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span>
                  {data.recap.best_improvement.skill}: {data.recap.best_improvement.from}% → {data.recap.best_improvement.to}%
                </span>
              </p>
            )}
          </Card>
        )}

        {/* Companies being prepared for */}
        {data.targets.length > 0 && (
          <Card className={cn(!data.continue && !data.recap && 'lg:col-span-2')}>
            <p className="eyebrow text-muted">Your companies</p>
            <ul className="mt-3 divide-y divide-line">
              {data.targets.map((t) => (
                <li key={t.slug}>
                  <Link href={`/company/${t.slug}`} className="group flex items-center gap-3 py-3">
                    <ProgressRing value={t.overall ?? 0} size={44} thickness={4} label={`${t.company} readiness`} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-heading group-hover:text-signal">{t.company}</span>
                      <span className="block text-xs text-muted">
                        {t.overall === null ? 'Take a round’s skill test to get a score' : `${t.cleared} of ${t.rounds} rounds cleared`}
                      </span>
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* A new account: point at the three doors instead of empty boxes. */}
        {!data.continue && !data.recap && data.targets.length === 0 && (
          <Card className="lg:col-span-2">
            <p className="eyebrow text-muted">Start somewhere</p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { href: '/courses', label: 'Learn', note: 'Courses, free to start' },
                { href: '/skill-test', label: 'Practise', note: 'Free skill tests' },
                { href: '/companies', label: 'Companies', note: 'Round-by-round prep' },
              ].map((x) => (
                <Link key={x.href} href={x.href} className="group rounded-xl border border-line p-4 transition-colors hover:border-line-strong">
                  <span className="block font-semibold text-heading group-hover:text-signal">{x.label}</span>
                  <span className="block text-sm text-muted">{x.note}</span>
                </Link>
              ))}
            </div>
          </Card>
        )}

        <PassportCard ready={ready} />
        <ParentLinkCard ready={ready} />
      </div>
    </main>
  );
};

export default TodayScreen;
