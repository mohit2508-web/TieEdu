import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Zap } from 'lucide-react';
import { fetchDailyChallenge, type ChallengeView } from '@/lib/dailyChallengeApi';

/**
 * Today's daily challenge, as one line on the Today screen: start it, finish
 * it, or see that it is done. Fetches its own status so the Today payload does
 * not grow; while loading or on error it simply shows the invitation.
 */
export const DailyChallengeCard: React.FC = () => {
  const [view, setView] = useState<ChallengeView | null>(null);
  useEffect(() => {
    let alive = true;
    fetchDailyChallenge().then((v) => alive && setView(v)).catch(() => { /* the invitation still works */ });
    return () => { alive = false; };
  }, []);

  const answered = view?.items.filter((i) => i.answered).length ?? 0;
  const total = view?.items.length ?? 3;
  const done = !!view?.completed;

  return (
    <Link
      href="/daily"
      className="focus-ring group mt-4 flex items-center gap-4 rounded-[14px] border border-line bg-card p-4 transition-colors hover:border-line-strong sm:p-5"
    >
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${done ? 'bg-success-soft text-success' : 'bg-signal-soft text-signal-ink'}`} aria-hidden>
        {done ? <CheckCircle2 className="h-5 w-5" /> : <Zap className="h-5 w-5" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-base font-bold text-heading sm:text-lg">
          {done ? 'Daily challenge done' : 'Today’s 10-minute challenge'}
        </span>
        <span className="block text-sm text-muted">
          {done
            ? 'Come back tomorrow for a new set.'
            : answered > 0
              ? `${answered} of ${total} done — finish it to count today.`
              : 'One aptitude, one coding and one HR question. Counts for your streak.'}
        </span>
      </span>
      {!done && <ArrowRight className="h-5 w-5 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />}
    </Link>
  );
};

export default DailyChallengeCard;
