import React, { useEffect, useState } from 'react';
import { fetchLeaderboardApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useShell } from '@/context/ShellContext';
import { Flame, Trophy, Award, UserRound, ArrowRight } from 'lucide-react';
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
        <p className="flex items-center gap-2 text-xs text-[color:var(--text-muted)]">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-warning-soft text-amber-deep">
            <Flame className="h-3.5 w-3.5 fill-current" />
          </span>
          Real accounts · real XP — no seeded names
        </p>

        {user && (
          <div className="bg-signal-soft border border-signal/30 rounded-xl px-4 py-3 mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-signal text-white flex items-center justify-center text-sm font-extrabold uppercase">
                {user.name.charAt(0)}
              </span>
              <div>
                <p className="text-xs font-bold text-brand-ink">{user.name}</p>
                {/*
                  XP only. A streak used to sit here, but the XP system no longer
                  touches `user.streak`, so the stored number is frozen — showing
                  it next to live XP would imply it is still being measured.
                */}
                <p className="text-xs text-signal">{user.xp || 0} XP</p>
              </div>
            </div>
            <span className="text-xs font-extrabold uppercase tracking-wide text-signal bg-white/70 px-2 py-1 rounded-md">
              Rank #{entries.find((e) => e.id === user.id)?.rank ?? '—'}
            </span>
          </div>
        )}

        {user && (
          <div className="flex flex-wrap gap-2 mt-4">
            <Link href="/interview-course" onClick={onClose} className="chip hover:border-signal hover:text-signal">
              <Award className="w-3.5 h-3.5 text-signal" /> Interview course se XP kamao
            </Link>
            <Link href="/companies" onClick={onClose} className="chip hover:border-money hover:text-amber-deep">
              <Award className="w-3.5 h-3.5 text-amber-deep" /> +50 XP for submitting a report
            </Link>
          </div>
        )}

        <div className="space-y-2 mt-5">
          <h4 className="text-xs font-bold text-heading flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-amber-deep" /> Placement season ranking
          </h4>

          {loading && (
            <div className="py-10 text-center">
              <div className="w-8 h-8 border-[3px] border-signal-soft border-t-signal rounded-full animate-spin mx-auto" />
            </div>
          )}

          {!loading && error && (
            <div className="px-4 py-8 text-center text-sm font-semibold text-danger">{error}</div>
          )}

          {!loading && !error && entries.length === 0 && (
            <div className="vault-card p-6 text-center space-y-2">
              <span className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-surface-hover text-[--text-muted]">
                <UserRound className="w-5 h-5" />
              </span>
              <p className="text-sm font-bold text-heading">Leaderboard is empty right now</p>
              <p className="text-sm text-[--text-muted]">
                The first student to earn XP will appear here. Complete the free interview course or submit a verified report to get started.
              </p>
              {!user && (
                <Link
                  href="/signup"
                  onClick={onClose}
                  className="inline-flex items-center gap-1.5 mt-2 text-sm font-bold text-signal hover:text-signal"
                >
                  Create free account <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
          )}

          {!loading && !error && entries.map((u) => (
            <div
              key={u.id}
              className={`flex items-center justify-between p-3 rounded-xl border text-sm ${
                user && u.id === user.id
                  ? 'bg-signal-soft/60 border-signal/30 font-semibold'
                  : 'bg-app-warm border-line'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                  u.rank === 1 ? 'bg-money text-money-ink' : u.rank === 2 ? 'bg-line-strong text-body' : 'bg-surface-hover text-body'
                }`}>
                  {u.rank}
                </span>
                <div>
                  <span className="text-heading block font-bold">{u.name}</span>
                  {/* Only render what is actually true. An empty college and a
                      null badge must not print as " · " or "null". */}
                  <span className="text-xs text-[--text-muted]">
                    {[u.college, u.badge].filter(Boolean).join(' · ') || '—'}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-brand-ink font-bold block stat-num">{u.xp} XP</span>
                <span className="text-xs text-amber-deep font-semibold">
                  {u.report_contributions > 0
                    ? `${u.report_contributions} published report${u.report_contributions > 1 ? 's' : ''}`
                    : 'in progress'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Sheet>
  );
};