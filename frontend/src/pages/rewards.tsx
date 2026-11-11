import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Flame, CheckCircle2, Circle, ArrowRight, Trophy, CalendarCheck, Code2, Building2, GraduationCap, ClipboardList } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { CoinIcon } from '@/components/coins/CoinIcon';
import { StoreSection } from '@/components/coins/StoreSection';
import { BrandLoader } from '@/components/brand/BrandLoader';
import { ErrorState } from '@/components/common/ErrorState';
import { fetchCoinRules, fetchCoinsMe, type CoinRuleView, type CoinsMe } from '@/lib/coinsApi';
import { cn } from '@/lib/cn';
import { GoalBar } from '@/components/coins/GoalBar';

const RULE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  checkin: CalendarCheck, daily_problem: Code2, daily_mcq: CheckCircle2, solve: Code2, streak: Flame, month_perfect: Trophy, month_25: Trophy,
  level_done: Building2, set_done: Building2, mock_submit: ClipboardList, mock_70: ClipboardList, course_done: GraduationCap, question_report: CheckCircle2, monthly_top: Trophy,
};

function amount(r: CoinRuleView): string {
  if (r.by_difficulty) return `${r.by_difficulty.easy} / ${r.by_difficulty.medium} / ${r.by_difficulty.hard}`;
  if (r.milestones) {
    const m = Object.entries(r.milestones).sort((a, b) => Number(a[0]) - Number(b[0]));
    return `${m[0][1]} – ${m[m.length - 1][1]}`;
  }
  return String(r.coins);
}
function detail(r: CoinRuleView): string | null {
  if (r.by_difficulty) return `Easy / medium / hard. Up to ${r.cap_day || 40} a day. No coins if you opened the solution first.`;
  if (r.milestones) return Object.entries(r.milestones).sort((a, b) => Number(a[0]) - Number(b[0])).map(([d, c]) => `${d} days: ${c}`).join(' · ');
  return null;
}

/** TiE Coins: what you have, how to earn, and (phase 2) the store. TIE_COINS_STORE_PLAN.md §4, §6.3. */
export default function RewardsPage() {
  const { user, loading } = useAuth();
  const [rules, setRules] = useState<CoinRuleView[] | null>(null);
  const [me, setMe] = useState<CoinsMe | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { fetchCoinRules().then((r) => setRules(r.rules)).catch((e) => setError(e.message)); }, []);
  useEffect(() => { if (user) fetchCoinsMe().then(setMe).catch(() => undefined); }, [user]);

  return (
    <>
      <Head>
        <title>TiE Coins and rewards · TiEEdu</title>
        <meta name="description" content="Practise every day on TiEEdu, earn TiE Coins and spend them on company packs, membership and TiEEdu swag." />
      </Head>
      <main className="w-full max-w-[1200px] px-4 pb-14 pt-6 sm:px-6 lg:px-0 lg:pt-0">
        {/* Hero */}
        <section className="overflow-hidden rounded-3xl border border-line bg-card">
          <div className="grid gap-6 p-5 sm:p-8 lg:grid-cols-[1.2fr_1fr] lg:items-center [&>*]:min-w-0">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-signal-soft px-3 py-1 text-sm font-semibold text-signal-ink"><CoinIcon size={16} /> TiE Coins</p>
              <h1 className="mt-3 font-display text-3xl font-bold leading-tight text-heading sm:text-4xl">Practise daily. Earn coins. Get the hoodie.</h1>
              <p className="mt-3 max-w-xl text-base leading-relaxed text-body">Every problem you solve and every day you keep your streak earns TiE Coins. Spend them on company packs, a month of membership, mock interviews and TiEEdu swag.</p>
              {!user && !loading && (
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link href="/signup?next=/practice" className="btn btn-primary focus-ring inline-flex min-h-[48px] items-center gap-2 px-6">Start your streak <ArrowRight className="h-4 w-4" aria-hidden /></Link>
                  <a href="#store" className="btn btn-secondary focus-ring inline-flex min-h-[48px] items-center px-5">See the store</a>
                </div>
              )}
            </div>
            {user && (
              <div className="rounded-2xl border border-line bg-surface-hover/60 p-5">
                {!me ? <BrandLoader caption="Loading your coins…" delay={0} /> : (
                  <>
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <p className="flex items-center gap-2 font-display text-4xl font-bold tabular-nums text-heading"><CoinIcon size={34} />{me.coins.toLocaleString('en-IN')}</p>
                      <Link href="/streak" className="flex items-center gap-1.5 text-lg font-semibold text-heading hover:underline focus-ring"><Flame className="h-5 w-5 text-signal-hover" aria-hidden /> {me.streak.current}-day streak</Link>
                    </div>
                    <div className="mt-4 grid grid-cols-7 gap-1.5" aria-label="Last 7 days">
                      {me.streak.week.map((d) => (
                        <span key={d.day} title={`${d.day}: ${d.state}`} className={cn('flex h-9 items-center justify-center rounded-lg text-xs font-semibold',
                          d.state === 'done' ? 'bg-signal text-on-primary' : d.state === 'frozen' ? 'bg-secondary-soft text-heading' : d.state === 'today' ? 'border-2 border-dashed border-signal text-signal-ink' : 'bg-card text-muted')}>
                          {new Date(`${d.day}T00:00:00Z`).toLocaleDateString('en-IN', { weekday: 'narrow', timeZone: 'UTC' })}
                        </span>
                      ))}
                    </div>
                    <GoalBar goal={me.goal} coins={me.coins} className="mt-4" />
                    {me.next_milestone && (
                      <p className="mt-3 text-body-md text-body"><span className="font-semibold text-heading">{me.next_milestone.days - me.streak.current} more day{me.next_milestone.days - me.streak.current === 1 ? '' : 's'}</span> to your {me.next_milestone.days}-day streak bonus (+{me.next_milestone.coins}).</p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Today */}
        {me && (
          <section className="mt-8">
            <h2 className="font-display text-xl font-semibold text-heading">Today</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {me.today.map((t) => (
                <Link key={t.id} href={t.href} className={cn('flex items-center gap-3 rounded-2xl border p-4 transition-colors focus-ring', t.done ? 'border-success/40 bg-success-soft/50' : 'border-line bg-card hover:border-line-strong')}>
                  {t.done ? <CheckCircle2 className="h-6 w-6 shrink-0 text-success" aria-hidden /> : <Circle className="h-6 w-6 shrink-0 text-muted" aria-hidden />}
                  <span className="min-w-0 flex-1 text-body-md font-semibold text-heading">{t.label}</span>
                  <span className="inline-flex items-center gap-1 font-bold text-signal-ink">+{t.coins}<CoinIcon size={16} /></span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <StoreSection signedIn={!!user} />

        {/* How to earn */}
        <section className="mt-10">
          <h2 className="font-display text-2xl font-semibold text-heading">How to earn TiE Coins</h2>
          <p className="mt-1 text-body-md text-body">Coins come from real practice only, and each one is paid once.</p>
          {error && <ErrorState className="mt-4" message={error} />}
          {!rules && !error && <BrandLoader caption="Loading the earning table…" />}
          {rules && (
            <ul className="mt-4 grid gap-3 md:grid-cols-2">
              {rules.map((r) => {
                const Icon = RULE_ICON[r.id] || CheckCircle2;
                const d = detail(r);
                return (
                  <li key={r.id} className="flex items-start gap-3 rounded-2xl border border-line bg-card p-4">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-hover text-signal-ink"><Icon className="h-5 w-5" aria-hidden /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-body-md font-semibold text-heading">{r.label}</p>
                      {d && <p className="mt-0.5 text-sm text-muted">{d}</p>}
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 font-bold tabular-nums text-signal-ink">+{amount(r)}<CoinIcon size={16} /></span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Recent */}
        {me && me.recent.length > 0 && (
          <section className="mt-10">
            <h2 className="font-display text-xl font-semibold text-heading">Your recent coins</h2>
            <ul className="mt-3 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
              {me.recent.map((e, i) => (
                <li key={i} className="flex items-center gap-3 px-4 py-3">
                  <span className="min-w-0 flex-1 text-body-md text-heading">{e.note}</span>
                  <span className="text-sm text-muted">{new Date(e.at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                  <span className={cn('w-16 text-right font-bold tabular-nums', e.coins > 0 ? 'text-success' : 'text-danger')}>{e.coins > 0 ? '+' : ''}{e.coins}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </>
  );
}
