import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Flame, CheckCircle2, Circle, Gift } from 'lucide-react';
import { CoinIcon } from './CoinIcon';
import { SwagArt } from './SwagArt';
import { GoalBar } from './GoalBar';
import { COINS_EVENT, fetchCoinsMe, type CoinsMe } from '@/lib/coinsApi';
import { cn } from '@/lib/cn';

/** The swag the strip shows, with their store prices (TIE_COINS_STORE_PLAN.md §4.2). */
const SHOWCASE = [
  { art: 'hoodie', name: 'Hoodie', coins: 10000 },
  { art: 'tshirt', name: 'T-shirt', coins: 5500 },
  { art: 'bottle', name: 'Bottle', coins: 4000 },
  { art: 'mug', name: 'Mug', coins: 2500 },
  { art: 'kit', name: 'Welcome kit', coins: 9500 },
];

/**
 * The TiE Coins call to action (plan §6.1), at the top of the home page.
 * - Guests: what you earn, what you can get, and "Start your streak".
 * - Signed in: your coins, streak, today's three tasks and the goal you are saving for.
 */
export const CoinsStrip: React.FC<{ signedIn: boolean; className?: string }> = ({ signedIn, className = '' }) => {
  const [me, setMe] = useState<CoinsMe | null>(null);
  useEffect(() => {
    if (!signedIn) return;
    const load = () => fetchCoinsMe().then(setMe).catch(() => undefined);
    load();
    window.addEventListener(COINS_EVENT, load);
    return () => window.removeEventListener(COINS_EVENT, load);
  }, [signedIn]);

  if (signedIn) {
    if (!me) return <div className={cn('h-36 animate-pulse rounded-3xl bg-surface-hover', className)} aria-hidden />;
    const done = me.today.filter((t) => t.done).length;
    return (
      <section aria-label="Your TiE Coins" className={cn('overflow-hidden rounded-3xl border border-line bg-card', className)}>
        <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[auto_1fr_1.1fr] lg:items-center">
          <div className="flex items-center gap-5">
            <div>
              <p className="text-sm font-semibold text-muted">TiE Coins</p>
              <p className="flex items-center gap-2 font-display text-3xl font-bold tabular-nums text-heading"><CoinIcon size={28} />{me.coins.toLocaleString('en-IN')}</p>
            </div>
            <div className="h-12 w-px bg-line" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-muted">Streak</p>
              <p className="flex items-center gap-1.5 font-display text-3xl font-bold tabular-nums text-heading"><Flame className={cn('h-7 w-7', me.streak.practised_today ? 'fill-current text-signal-hover' : 'text-muted')} aria-hidden />{me.streak.current}</p>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-muted">Today · {done} of {me.today.length} done</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {me.today.map((t) => (
                <li key={t.id}>
                  <Link href={t.href} className={cn('inline-flex min-h-[40px] items-center gap-2 rounded-full border px-3 text-body-md font-semibold focus-ring', t.done ? 'border-success/30 bg-success-soft text-success' : 'border-line bg-card text-heading hover:border-signal')}>
                    {t.done ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : <Circle className="h-4 w-4 text-muted" aria-hidden />}{t.label}
                    {!t.done && <span className="inline-flex items-center gap-0.5 text-signal-ink">+{t.coins}<CoinIcon size={12} /></span>}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <GoalBar goal={me.goal} coins={me.coins} />
        </div>
      </section>
    );
  }

  return (
    <section aria-label="TiE Coins" className={cn('relative overflow-hidden rounded-3xl border border-line bg-card', className)}>
      <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_1.15fr] lg:items-center">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-signal-soft px-3 py-1 text-sm font-semibold text-signal-ink"><CoinIcon size={16} /> New: TiE Coins</p>
          <h2 className="mt-3 font-display text-3xl font-bold leading-tight text-heading sm:text-4xl">Practise daily. Earn coins. Get the hoodie.</h2>
          <ul className="mt-4 space-y-2 text-base text-body">
            <li className="flex items-center gap-2"><CoinIcon size={16} /> <span><span className="font-semibold text-heading">+10</span> for today&apos;s problem, every day</span></li>
            <li className="flex items-center gap-2"><Flame className="h-4 w-4 text-signal-hover" aria-hidden /> <span>Streak bonuses up to <span className="font-semibold text-heading">1,500</span> coins</span></li>
            <li className="flex items-center gap-2"><Gift className="h-4 w-4 text-signal-ink" aria-hidden /> <span>Spend on company packs, membership and TiEEdu swag</span></li>
          </ul>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/signup?next=/practice" className="btn btn-primary focus-ring inline-flex min-h-[48px] items-center gap-2 px-6">Start your streak <ArrowRight className="h-4 w-4" aria-hidden /></Link>
            <Link href="/rewards" className="btn btn-secondary focus-ring inline-flex min-h-[48px] items-center px-5">See the store</Link>
          </div>
        </div>
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-3 xl:grid-cols-5" aria-label="TiEEdu swag you can earn">
          {SHOWCASE.map((s, i) => (
            <li key={s.art} className={cn('flex flex-col items-center rounded-2xl bg-surface-hover/70 p-2 text-center', i === 0 && 'ring-2 ring-signal/50')}>
              <SwagArt art={s.art} label={`TiEEdu ${s.name}`} className="h-20 w-full" />
              <span className="mt-1 text-sm font-semibold text-heading">{s.name}</span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold tabular-nums text-muted"><CoinIcon size={12} />{s.coins.toLocaleString('en-IN')}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};
