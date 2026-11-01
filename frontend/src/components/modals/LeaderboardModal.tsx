import React, { useEffect, useState } from 'react';
import { fetchLeaderboardApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useShell } from '@/context/ShellContext';
import { Trophy, Award, UserRound, ArrowRight, Crown } from 'lucide-react';
import Link from 'next/link';
import { Sheet } from '@/components/common/Sheet';

/**
 * Mirrors GET /api/gamification/leaderboard.
 *
 * `xp` is the authoritative ledger total. `streak` is intentionally nullable —
 * the API no longer invents one, so the UI must not render "0d streak" as if
 * that were a real measurement. `badge` is null unless the account genuinely
 * earned it; it is never derived from rank.
 */
interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  xp: number;
  streak: number | null;
  college: string;
  badge: string | null;
  report_contributions: number;
}

/* Medal tones for the podium: gold, silver, bronze. Tokens only. */
const MEDAL: Record<number, { ring: string; plinth: string; h: string }> = {
  1: { ring: 'ring-[rgb(var(--rgb-signal))]', plinth: 'bg-signal text-on-primary', h: 'h-24' },
  2: { ring: 'ring-line-strong', plinth: 'bg-surface-hover text-heading', h: 'h-16' },
  3: { ring: 'ring-amber-deep/60', plinth: 'bg-warning-soft text-amber-deep', h: 'h-12' },
};

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w.charAt(0)).join('').toUpperCase() || '?';

const Avatar: React.FC<{ name: string; className?: string }> = ({ name, className = '' }) => (
  <span className={`flex shrink-0 items-center justify-center rounded-full bg-secondary-soft font-display font-bold text-secondary ${className}`} aria-hidden>
    {initials(name)}
  </span>
);

const PodiumSpot: React.FC<{ e: LeaderboardEntry; me: boolean }> = ({ e, me }) => {
  const m = MEDAL[e.rank];
  return (
    <li className="flex min-w-0 flex-1 flex-col items-center">
      {e.rank === 1 && <Crown className="mb-1 h-5 w-5 text-amber-deep" aria-hidden />}
      <Avatar name={e.name} className={`ring-4 ${m.ring} ${e.rank === 1 ? 'h-16 w-16 text-lg' : 'h-12 w-12 text-sm'}`} />
      <p className={`mt-2 w-full truncate text-center text-sm font-bold ${me ? 'text-link' : 'text-heading'}`}>{e.name}</p>
      <p className="stat-num text-xs font-semibold text-muted">{e.xp} XP</p>
      <div className={`mt-2 flex w-full items-start justify-center rounded-t-xl pt-2 font-display text-xl font-extrabold ${m.plinth} ${m.h}`}>
        <span className="sr-only">Rank </span>{e.rank}
      </div>
    </li>
  );
};

/**
 * Opened from the header and the drawer. Takes no props: visibility is owned by
 * `ShellContext`, which is also where Escape and the body scroll lock live. It
 * used to be rendered per page behind an `onOpenLeaderboard` handler, so the
 * button was dead on eight of twelve pages.
 *
 * Phase 2: a bottom sheet on mobile. Escape and the scroll lock stay with
 * `ShellContext` (`closeOnEscape`/`blocksScroll` off) so the provider remains the
 * single owner of both — a second Escape listener here would pop the overlay
 * beneath this one as well.
 */
export const LeaderboardModal: React.FC = () => {
  const { user } = useAuth();
  const { isOpen, closeOverlay } = useShell();
  const isOpenNow = isOpen('leaderboard');
  const onClose = () => closeOverlay('leaderboard');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpenNow) return;
    let active = true;
    setLoading(true);
    setError(null);
    fetchLeaderboardApi()
      .then((data: LeaderboardEntry[]) => {
        if (active) setEntries(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (active) setError('Leaderboard could not be loaded — check the server and try again.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [isOpenNow]);

  // Podium order is 2nd, 1st, 3rd so the winner stands in the middle.
  const podium = [2, 1, 3]
    .map((r) => entries.find((e) => e.rank === r))
    .filter((e): e is LeaderboardEntry => !!e);
  const rest = entries.filter((e) => e.rank > 3);
  const maxXp = Math.max(1, ...entries.map((e) => e.xp));

  return (
    <Sheet
      open={isOpenNow}
      onClose={onClose}
      title="XP Leaderboard"
      zIndex={50}
      closeOnEscape={false}
      blocksScroll={false}
      data-testid="leaderboard"
    >
      <div className="px-5 pb-5">
        <div className="rounded-card border border-signal/30 bg-gradient-to-br from-warning-soft to-card p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-signal text-on-primary shadow-edge-neutral">
              <Trophy className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="font-display text-base font-bold text-heading">Placement season ranking</p>
              <p className="text-xs text-muted">Real accounts, real XP. No seeded names.</p>
            </div>
          </div>
        </div>

        {loading && (
          <div className="py-12 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-[3px] border-signal-soft border-t-signal" />
          </div>
        )}

        {!loading && error && (
          <div className="px-4 py-8 text-center text-sm font-semibold text-danger">{error}</div>
        )}

        {!loading && !error && entries.length === 0 && (
          <div className="vault-card mt-5 space-y-2 p-6 text-center">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-surface-hover text-muted">
              <UserRound className="h-5 w-5" />
            </span>
            <p className="text-sm font-bold text-heading">Leaderboard is empty right now</p>
            <p className="text-sm text-muted">
              The first student to earn XP will appear here. Complete the free interview course or submit a verified report to get started.
            </p>
            {!user && (
              <Link href="/signup" onClick={onClose} className="mt-2 inline-flex items-center gap-1.5 text-sm font-bold text-link">
                Create free account <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        )}

        {!loading && !error && podium.length > 0 && (
          <ol className="mt-6 flex items-end gap-3" aria-label="Top three">
            {podium.map((e) => <PodiumSpot key={e.id} e={e} me={!!user && e.id === user.id} />)}
          </ol>
        )}

        {!loading && !error && rest.length > 0 && (
          <ol className="mt-4 space-y-2" start={4}>
            {rest.map((u) => {
              const me = !!user && u.id === user.id;
              const meta = [
                u.college,
                u.badge,
                u.report_contributions > 0 ? `${u.report_contributions} report${u.report_contributions > 1 ? 's' : ''}` : null,
              ].filter(Boolean).join(' · ');
              return (
                <li
                  key={u.id}
                  className={`flex items-center gap-3 rounded-xl border p-3 text-sm ${me ? 'border-signal/40 bg-signal-soft/60' : 'border-line bg-card'}`}
                >
                  <span className="w-6 text-center font-display text-sm font-bold tabular-nums text-muted">{u.rank}</span>
                  <Avatar name={u.name} className="h-9 w-9 text-xs" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate font-bold text-heading">{u.name}</span>
                      <span className="stat-num shrink-0 font-bold text-heading">{u.xp} XP</span>
                    </div>
                    {/* Only what is actually true: an empty college and a null badge print nothing. */}
                    {meta && <p className="truncate text-xs text-muted">{meta}</p>}
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-hover" aria-hidden>
                      <div className="h-full rounded-full bg-signal" style={{ width: `${Math.max(4, (u.xp / maxXp) * 100)}%` }} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        {user && (
          <div className="sticky bottom-0 mt-5 rounded-card border border-signal/40 bg-card p-3 shadow-[var(--shadow-pop)]">
            <div className="flex items-center gap-3">
              <Avatar name={user.name} className="h-10 w-10 text-sm ring-2 ring-[rgb(var(--rgb-signal))]" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-heading">You · {user.name}</p>
                {/*
                  XP only. The XP system no longer touches `user.streak`, so the
                  stored number is frozen; showing it would imply it is measured.
                */}
                <p className="stat-num text-xs text-muted">{user.xp || 0} XP</p>
              </div>
              <span className="rounded-full bg-signal px-3 py-1 font-display text-sm font-bold text-on-primary">
                #{entries.find((e) => e.id === user.id)?.rank ?? '—'}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/interview-course" onClick={onClose} className="chip hover:border-signal hover:text-link">
                <Award className="h-3.5 w-3.5 text-link" /> Interview course se XP kamao
              </Link>
              <Link href="/companies" onClick={onClose} className="chip hover:border-money hover:text-amber-deep">
                <Award className="h-3.5 w-3.5 text-amber-deep" /> +50 XP per report
              </Link>
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
};