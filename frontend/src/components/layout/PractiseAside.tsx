import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Flame, ArrowRight, ServerCrash } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAuth } from '@/context/AuthContext';
import { usePracticeSummary, streakOf } from '@/components/practice/usePracticeSummary';
import { GoalBar } from '@/components/coins/GoalBar';
import { COINS_EVENT, fetchCoinSummary, type CoinGoal } from '@/lib/coinsApi';

/**
 * The Practise right rail (UI_FIX_PLAN.md §3.1): streak, the coin goal, continue and next
 * problem, runner status. Shown beside every Practise page from 1280 px.
 */
export function PractiseAside() {
  const summary = usePracticeSummary();
  const { user } = useAuth();
  const [coinGoal, setCoinGoal] = useState<{ coins: number; goal: CoinGoal | null } | null>(null);
  useEffect(() => {
    if (!user) { setCoinGoal(null); return; }
    const load = () => fetchCoinSummary().then((s) => setCoinGoal(s.signed_in ? { coins: s.coins, goal: s.goal || null } : null)).catch(() => setCoinGoal(null));
    load();
    window.addEventListener(COINS_EVENT, load);
    return () => window.removeEventListener(COINS_EVENT, load);
  }, [user]);
  const streak = summary ? streakOf(summary.activity) : 0;

  return (
    <div className="space-y-4">
      <Link href={user ? '/streak' : '/signup?next=/practice'} className="block rounded-2xl border border-line bg-card p-5 transition-colors hover:border-line-strong focus-ring">
        <p className="flex items-center gap-2 text-sm font-semibold text-muted"><Flame className={cn('h-4 w-4', streak > 0 && 'text-signal-hover')} aria-hidden /> Streak</p>
        <p className="mt-1 font-display text-3xl font-bold tabular-nums text-heading">{streak}<span className="text-lg font-semibold text-muted"> day{streak === 1 ? '' : 's'}</span></p>
        <p className="text-body-md text-body">{streak ? 'Solve one today to keep it going.' : 'Solve one problem today to start.'}</p>
      </Link>
      {coinGoal && <GoalBar goal={coinGoal.goal} coins={coinGoal.coins} compact />}
      {summary?.continue && (
        <Link href={`/practice/problem/${summary.continue.id}`} className="block rounded-2xl border border-line bg-card p-5 transition-colors hover:border-line-strong focus-ring">
          <p className="text-sm font-semibold text-muted">Continue</p>
          <p className="mt-1 text-lg font-semibold text-heading">{summary.continue.title}</p>
          <p className="mt-2 inline-flex items-center gap-1 text-body-md font-semibold text-link">Open <ArrowRight className="h-4 w-4" aria-hidden /></p>
        </Link>
      )}
      {summary?.next && summary.next.id !== summary.continue?.id && (
        <Link href={`/practice/problem/${summary.next.id}`} className="block rounded-2xl border border-line bg-card p-5 transition-colors hover:border-line-strong focus-ring">
          <p className="text-sm font-semibold text-muted">Next up</p>
          <p className="mt-1 text-lg font-semibold text-heading">{summary.next.title}</p>
          <p className="text-body-md text-body">{summary.next.topic}</p>
        </Link>
      )}
      {summary && !summary.runner && (
        <p className="flex items-start gap-2 rounded-2xl border border-line bg-card p-4 text-body-md text-body"><ServerCrash className="mt-0.5 h-5 w-5 shrink-0 text-muted" aria-hidden /> The code runner is offline. You can still read problems.</p>
      )}
    </div>
  );
}
