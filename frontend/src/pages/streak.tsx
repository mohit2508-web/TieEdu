import React, { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Flame, ChevronLeft, ChevronRight, Share2, Award, Lock, CheckCircle2, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { BrandLoader } from '@/components/brand/BrandLoader';
import { ErrorState } from '@/components/common/ErrorState';
import { CoinIcon } from '@/components/coins/CoinIcon';
import { ShareCard } from '@/components/coins/ShareCard';
import { announceCoins, fetchCoinRules, fetchStreakPage, type StreakDayState, type StreakPage } from '@/lib/coinsApi';
import { redeemItem } from '@/lib/storeApi';
import { cn } from '@/lib/cn';

const CELL: Record<StreakDayState, string> = {
  solved: 'bg-signal text-on-primary', practised: 'bg-signal-soft text-signal-ink', repaired: 'bg-secondary-soft text-heading ring-1 ring-inset ring-secondary/40',
  frozen: 'bg-secondary-soft text-heading', missed: 'bg-card text-muted ring-1 ring-inset ring-line', today: 'bg-card text-heading ring-2 ring-signal', future: 'bg-transparent text-muted/50',
};
const LABEL: Record<StreakDayState, string> = { solved: 'Daily problem solved', practised: 'Practised', repaired: 'Repaired', frozen: 'Covered by the weekly freeze', missed: 'Missed', today: 'Today', future: '' };
const shift = (m: string, n: number) => { const d = new Date(Date.UTC(Number(m.slice(0, 4)), Number(m.slice(5, 7)) - 1 + n, 1)); return d.toISOString().slice(0, 7); };
const monthName = (m: string) => new Date(`${m}-01T00:00:00Z`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });

/** A badge medallion: amber when earned, outlined when not yet. */
function Medal({ name, earned, sub }: { name: string; earned: boolean; sub?: string }) {
  return (
    <div className={cn('flex flex-col items-center rounded-2xl border p-3 text-center', earned ? 'border-signal/40 bg-signal-soft/40' : 'border-line bg-card')}>
      <span className={cn('grid h-14 w-14 place-items-center rounded-full', earned ? 'bg-signal text-on-primary shadow-sm' : 'bg-surface-hover text-muted')}>
        {earned ? <Award className="h-7 w-7" aria-hidden /> : <Lock className="h-6 w-6" aria-hidden />}
      </span>
      <span className="mt-2 text-body-md font-semibold text-heading">{name}</span>
      {sub && <span className="text-sm text-muted">{sub}</span>}
    </div>
  );
}

/** The streak page (TIE_COINS_STORE_PLAN.md §6.5): calendar, Streak Repair, milestones and badges, share card. */
export default function StreakPageView() {
  const { user, loading } = useAuth();
  const [month, setMonth] = useState<string | undefined>(undefined);
  const [p, setP] = useState<StreakPage | null>(null);
  const [error, setError] = useState('');
  const [bonus, setBonus] = useState<Record<string, number>>({});
  const [share, setShare] = useState(false);
  const [repairing, setRepairing] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(() => { setError(''); fetchStreakPage(month).then(setP).catch((e) => setError(e.message)); }, [month]);
  useEffect(() => { if (user) load(); }, [user, load]);
  useEffect(() => { fetchCoinRules().then((r) => setBonus(r.rules.find((x) => x.id === 'streak')?.milestones || {})).catch(() => undefined); }, []);

  const repair = async (day: string) => {
    setRepairing(day); setMsg('');
    try {
      const r = await redeemItem({ item_id: 'repair', day });
      announceCoins([{ rule: 'spend', coins: -r.order.coins, note: 'Streak Repair' }]);
      setMsg(`Repaired. Your streak is ${r.order.result?.streak || ''} days.`);
      load();
    } catch (e) { setMsg((e as Error).message); } finally { setRepairing(''); }
  };

  if (!loading && !user) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <Flame className="mx-auto h-12 w-12 text-signal-hover" aria-hidden />
        <h1 className="mt-3 font-display text-3xl font-bold text-heading">Start a streak</h1>
        <p className="mt-2 text-base text-body">Practise a little every day. Your streak, badges and TiE Coins live here.</p>
        <Link href="/signup?next=/practice" className="btn btn-primary focus-ring mt-6 inline-flex min-h-[48px] items-center gap-2 px-6">Start today <ArrowRight className="h-4 w-4" aria-hidden /></Link>
      </main>
    );
  }

  const firstDow = p ? (new Date(`${p.month}-01T00:00:00Z`).getUTCDay() + 6) % 7 : 0; // Monday first
  const repairable = new Set(p?.repairable_days || []);

  return (
    <>
      <Head><title>Your streak · TiEEdu</title></Head>
      <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:px-6 lg:pt-10">
        {error && <ErrorState message={error} onRetry={load} />}
        {!p && !error && <BrandLoader caption="Loading your streak…" />}
        {p && (
          <>
            <section className="flex flex-wrap items-center gap-6 rounded-3xl border border-line bg-card p-6 sm:p-8">
              <span className="grid h-20 w-20 place-items-center rounded-full bg-signal-soft"><Flame className={cn('h-11 w-11', p.current ? 'fill-current text-signal-hover' : 'text-muted')} aria-hidden /></span>
              <div className="min-w-0 flex-1">
                <h1 className="font-display text-4xl font-bold text-heading">{p.current}-day streak</h1>
                <p className="mt-1 text-base text-body">Best {p.best} day{p.best === 1 ? '' : 's'} · {p.earned.length} badge{p.earned.length === 1 ? '' : 's'} · {p.repairs_left} of 3 repairs left this month</p>
                {!p.daily_today_done && <Link href="/practice" className="mt-2 inline-flex items-center gap-1 text-body-md font-semibold text-link hover:underline">Solve today&apos;s problem to keep it going <ArrowRight className="h-4 w-4" aria-hidden /></Link>}
              </div>
              <button type="button" onClick={() => setShare(true)} disabled={!p.current} className="btn btn-primary focus-ring inline-flex min-h-[48px] items-center gap-2 px-5 disabled:opacity-50"><Share2 className="h-4 w-4" aria-hidden /> Share</button>
            </section>

            <div className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
              {/* Calendar */}
              <section className="rounded-3xl border border-line bg-card p-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <button type="button" aria-label="Previous month" onClick={() => setMonth(shift(p.month, -1))} className="grid h-10 w-10 place-items-center rounded-lg hover:bg-surface-hover focus-ring"><ChevronLeft className="h-5 w-5" aria-hidden /></button>
                  <h2 className="font-display text-xl font-semibold text-heading">{monthName(p.month)}</h2>
                  <button type="button" aria-label="Next month" disabled={p.month >= p.today.slice(0, 7)} onClick={() => setMonth(shift(p.month, 1))} className="grid h-10 w-10 place-items-center rounded-lg hover:bg-surface-hover focus-ring disabled:opacity-30"><ChevronRight className="h-5 w-5" aria-hidden /></button>
                </div>
                <div className="mt-4 grid grid-cols-7 gap-1.5 text-center text-xs font-semibold text-muted" aria-hidden>{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <span key={i}>{d}</span>)}</div>
                <ol className="mt-1.5 grid grid-cols-7 gap-1.5" aria-label={`${monthName(p.month)} calendar`}>
                  {Array.from({ length: firstDow }, (_, i) => <li key={`pad${i}`} aria-hidden />)}
                  {p.days.map((d) => {
                    const canFix = repairable.has(d.day) && p.repairs_left > 0;
                    return (
                      <li key={d.day}>
                        <button type="button" disabled={!canFix || !!repairing} onClick={() => canFix && repair(d.day)} title={canFix ? 'Repair this day (60 coins)' : LABEL[d.state]}
                          aria-label={`${d.day}: ${LABEL[d.state] || 'Upcoming'}${canFix ? '. Repair for 60 coins' : ''}`}
                          className={cn('relative flex aspect-square w-full items-center justify-center rounded-xl text-sm font-semibold transition-transform', CELL[d.state], canFix && 'cursor-pointer hover:scale-105 hover:ring-2 hover:ring-signal', repairing === d.day && 'animate-pulse')}>
                          {Number(d.day.slice(8))}
                          {d.state === 'solved' && <Flame className="absolute bottom-0.5 right-0.5 h-3 w-3" aria-hidden />}
                        </button>
                      </li>
                    );
                  })}
                </ol>
                <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
                  {(['solved', 'practised', 'repaired', 'missed'] as StreakDayState[]).map((s) => <li key={s} className="inline-flex items-center gap-1.5"><span className={cn('h-3 w-3 rounded', CELL[s])} />{LABEL[s]}</li>)}
                </ul>
                {p.repairs_left > 0 && p.repairable_days.length > 0 && <p className="mt-3 inline-flex items-center gap-1.5 text-body-md text-body"><CoinIcon size={16} /> Tap a missed day this month to repair it for 60 coins.</p>}
                {msg && <p role="status" className="mt-2 text-body-md font-semibold text-heading">{msg}</p>}
              </section>

              {/* Month badge + year */}
              <section className="space-y-4">
                <div className="rounded-3xl border border-line bg-card p-5">
                  <p className="text-sm font-semibold text-muted">This month&apos;s badge</p>
                  <p className="mt-1 text-lg font-semibold text-heading">{p.month_badge.name}</p>
                  <p className="text-body-md text-body">{p.month_badge.earned ? 'Earned. Every daily problem solved.' : `Solve every daily problem this month: ${p.month_badge.done} of ${p.month_badge.total}.`}</p>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-hover"><div className={cn('h-full rounded-full', p.month_badge.earned ? 'bg-success' : 'bg-signal')} style={{ width: `${(p.month_badge.done / p.month_badge.total) * 100}%` }} /></div>
                </div>
                <div className="rounded-3xl border border-line bg-card p-5">
                  <p className="text-sm font-semibold text-muted">Active days in {p.month.slice(0, 4)}</p>
                  <ul className="mt-2 space-y-3">
                    {p.year_badges.map((y) => (
                      <li key={y.key}>
                        <p className="flex justify-between text-body-md"><span className="font-semibold text-heading">{y.name}</span><span className="tabular-nums text-muted">{y.earned ? <CheckCircle2 className="inline h-4 w-4 text-success" aria-label="Earned" /> : `${y.progress} / ${y.days}`}</span></p>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-hover"><div className={cn('h-full rounded-full', y.earned ? 'bg-success' : 'bg-signal')} style={{ width: `${(y.progress / y.days) * 100}%` }} /></div>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            </div>

            {/* Milestones */}
            <section className="mt-8">
              <h2 className="font-display text-2xl font-semibold text-heading">Streak milestones</h2>
              <p className="mt-1 text-body-md text-body">Each one pays TiE Coins and a badge for your profile.</p>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {p.milestones.map((m) => (
                  <Medal key={m.key} name={m.name} earned={m.earned} sub={`${m.days} days${bonus[String(m.days)] ? ` · +${bonus[String(m.days)]} coins` : ''}`} />
                ))}
              </div>
            </section>

            {p.earned.length > 0 && (
              <section className="mt-8">
                <h2 className="font-display text-2xl font-semibold text-heading">Your badges</h2>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  {p.earned.map((b) => <Medal key={b.key} name={b.name} earned sub={new Date(b.earned_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} />)}
                </div>
              </section>
            )}
          </>
        )}
        {share && p && <ShareCard streak={p.current} best={p.best} badges={p.earned.length} name={user?.name?.split(' ')[0] || ''} onClose={() => setShare(false)} />}
      </main>
    </>
  );
}
