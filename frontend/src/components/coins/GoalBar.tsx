import React from 'react';
import Link from 'next/link';
import { Target } from 'lucide-react';
import { CoinIcon } from './CoinIcon';
import { SwagArt } from './SwagArt';
import type { CoinGoal } from '@/lib/coinsApi';
import { cn } from '@/lib/cn';

/**
 * "320 / 5,500 to the TiEEdu T-shirt" (TIE_COINS_STORE_PLAN.md §6.3): the item a student
 * is saving for, everywhere they practise. Without a goal it invites them to pick one.
 */
export const GoalBar: React.FC<{ goal: CoinGoal | null | undefined; coins: number; className?: string; compact?: boolean }> = ({ goal, coins, className = '', compact = false }) => {
  if (!goal) {
    return (
      <Link href="/rewards#store" className={cn('flex items-center gap-3 rounded-2xl border border-dashed border-line bg-card p-3 text-body-md text-body hover:border-signal focus-ring', className)}>
        <Target className="h-5 w-5 shrink-0 text-signal-ink" aria-hidden />
        <span className="flex-1">Pick something in the store to save for.</span>
        <span className="font-semibold text-link">Choose</span>
      </Link>
    );
  }
  const pct = Math.min(100, Math.round((coins / goal.coins) * 100));
  const left = Math.max(0, goal.coins - coins);
  return (
    <Link href="/rewards#store" className={cn('flex items-center gap-3 rounded-2xl border border-line bg-card p-3 transition-colors hover:border-signal focus-ring', className)}>
      {!compact && <span className="grid h-12 w-14 shrink-0 place-items-center rounded-xl bg-surface-hover"><SwagArt art={goal.art} image={goal.image} label="" className="h-full w-full" /></span>}
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2 text-body-md">
          <span className="truncate font-semibold text-heading">{left ? `Saving for ${goal.name}` : `${goal.name} is yours to claim`}</span>
          <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold tabular-nums text-muted"><CoinIcon size={13} />{coins.toLocaleString('en-IN')} / {goal.coins.toLocaleString('en-IN')}</span>
        </span>
        <span className="mt-1.5 block h-2 overflow-hidden rounded-full bg-surface-hover"><span className={cn('block h-full rounded-full', left ? 'bg-signal' : 'bg-success')} style={{ width: `${pct}%` }} /></span>
        {!compact && <span className="mt-1 block text-sm text-muted">{left ? `${left.toLocaleString('en-IN')} more coins: about ${Math.max(1, Math.ceil(left / 20))} days of daily practice` : 'Open the store to get it.'}</span>}
      </span>
    </Link>
  );
};
