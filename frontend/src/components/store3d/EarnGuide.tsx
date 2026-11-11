import React, { useMemo, useState } from 'react';
import { MapPin, ShieldCheck } from 'lucide-react';
import { CoinIcon } from '@/components/coins/CoinIcon';
import { SwagArt } from '@/components/coins/SwagArt';
import { Segmented } from '@/components/ui/Segmented';
import type { CoinRuleView } from '@/lib/coinsApi';
import type { StoreItemView } from '@/lib/storeApi';
import { planFor, daysTo, daysLabel } from '@/lib/storeEarn';
import { cn } from '@/lib/cn';

/**
 * "How coins work" (STORE_3D_SHOWCASE_AND_SPEED_PLAN.md §B5): pick your daily
 * practice time and see coins per day, what makes them up, and when you reach
 * each reward on a ladder with "You are here". Uses the live coin rules.
 */
type Mins = '15' | '30' | '60';
const inr = (n: number) => n.toLocaleString('en-IN');

export function EarnGuide({ rules, items, coins, signedIn, pace, onOpen }: {
  rules: CoinRuleView[]; items: StoreItemView[]; coins: number; signedIn: boolean; pace?: number; onOpen: (i: StoreItemView) => void;
}) {
  const [mins, setMins] = useState<Mins>('30');
  const plan = useMemo(() => planFor(Number(mins), rules), [mins, rules]);
  const ladder = useMemo(() => items.filter((i) => i.coins > 0).slice().sort((a, b) => a.coins - b.coins), [items]);
  const have = signedIn ? coins : 0;
  const hereAt = ladder.findIndex((i) => i.coins > have);

  return (
    <section id="earn" className="mt-10 scroll-mt-24 rounded-3xl border border-line bg-card p-5 sm:p-8" aria-labelledby="earn-h">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="earn-h" className="font-display text-2xl font-semibold text-heading">How long until you get it?</h2>
          <p className="mt-1 text-body-md text-body">Choose how long you practise each day. The numbers use today&rsquo;s coin rules.</p>
        </div>
        <Segmented label="Practice per day" value={mins} onChange={setMins} items={[{ key: '15', label: '15 min' }, { key: '30', label: '30 min' }, { key: '60', label: '1 hour' }]} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.4fr] [&>*]:min-w-0">
        {/* A day's coins */}
        <div className="rounded-2xl bg-surface-hover/60 p-5">
          <p className="text-sm font-semibold text-muted">A {mins === '60' ? '1-hour' : `${mins}-minute`} day earns about</p>
          <p className="mt-1 flex items-center gap-2 font-display text-4xl font-bold tabular-nums text-heading"><CoinIcon size={32} />{plan.perDay}<span className="text-lg font-semibold text-muted">/ day</span></p>
          <ul className="mt-4 space-y-2 text-sm">
            {plan.steps.map((s) => <li key={s.label} className="flex justify-between gap-3 border-b border-line/60 pb-2 last:border-0"><span className="text-body">{s.label}</span><span className="font-semibold tabular-nums text-heading">+{s.coins}</span></li>)}
          </ul>
          {signedIn && pace ? <p className="mt-4 rounded-xl bg-card px-3 py-2 text-sm text-body">Your last 14 days: <span className="font-semibold text-heading">{pace} coins a day</span>.</p> : null}
          <p className="mt-4 flex items-start gap-2 text-xs text-muted"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> Fair play: no coins for a problem after you open its solution; daily caps apply; physical swag needs a verified email and an account 30+ days old.</p>
        </div>

        {/* Ladder */}
        <ol className="relative space-y-2 border-l-2 border-line pl-5" aria-label="Rewards in order of price">
          {ladder.map((i, k) => {
            const days = daysTo(i.coins - have, plan.perDay);
            const got = i.coins <= have;
            return (
              <React.Fragment key={i.id}>
                {signedIn && k === hereAt && (
                  <li className="relative -ml-[31px] flex items-center gap-2 py-1 text-sm font-bold text-signal-ink">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-signal text-on-primary"><MapPin className="h-3.5 w-3.5" aria-hidden /></span> You are here · {inr(have)} coins
                  </li>
                )}
                <li className="relative">
                  <span className={cn('absolute -left-[27px] top-4 h-3 w-3 rounded-full border-2', got ? 'border-success bg-success' : 'border-line bg-card')} aria-hidden />
                  <button type="button" onClick={() => onOpen(i)} className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-surface-hover focus-ring">
                    <span className="grid h-12 w-14 shrink-0 place-items-center rounded-lg bg-surface-hover p-1"><SwagArt art={i.art} image={i.image} label="" className="h-full w-full" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-heading">{i.name}</span>
                      <span className="flex items-center gap-1 text-sm text-muted"><CoinIcon size={13} />{inr(i.coins)}</span>
                    </span>
                    <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold', got ? 'bg-success-soft text-success' : 'bg-surface-hover text-heading')}>{got ? 'Ready now' : daysLabel(days)}</span>
                  </button>
                </li>
              </React.Fragment>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
