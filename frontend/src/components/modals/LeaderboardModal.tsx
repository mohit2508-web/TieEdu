import React, { useEffect, useState } from 'react';
import { fetchLeaderboardApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Flame, Trophy, Award, X, Sparkles, UserRound, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface LeaderboardEntry {
  rank: number;
  name: string;
  xp: number;
  streak: number;
  college: string;
  badge: string;
  report_contributions: number;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
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
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="vault-card bg-white rounded-2xl max-w-lg w-full p-6 shadow-float border-[#E9E7E1] relative">

        <div className="flex items-center justify-between pb-4 border-b border-[#E9E7E1] mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#FBF1E1] text-[#C77B12] flex items-center justify-center">
              <Flame className="w-4 h-4 fill-current" />
            </div>
            <div>
              <h3 className="font-serif-heading text-lg font-bold text-[#10151C]">XP Leaderboard</h3>
              <p className="text-[11px] text-[#7D8794]">Real accounts · real XP — no seeded names</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-[#7D8794] hover:text-[#10151C]" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {user && (
          <div className="bg-[#E8F4FB] border border-[#bcdced] rounded-xl px-4 py-3 mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-[#0284C7] text-white flex items-center justify-center text-[13px] font-extrabold uppercase">
                {user.name.charAt(0)}
              </span>
              <div>
                <p className="text-xs font-bold text-[#0E2A44]">{user.name}</p>
                <p className="text-[10px] text-[#0271B5]">
                  {user.xp || 0} XP · {user.streak || 0}d streak
                </p>
              </div>
            </div>
            <span className="text-[10px] font-extrabold uppercase tracking-wide text-[#0271B5] bg-white/70 px-2 py-1 rounded-md">
              Rank #{entries.find((e) => e.name === user.name)?.rank ?? '—'}
            </span>
          </div>
        )}

        {user && (
          <div className="flex flex-wrap gap-2 mb-5">
            <Link href="/" onClick={onClose} className="chip hover:border-[#0284C7] hover:text-[#0271B5]">
              <Sparkles className="w-3.5 h-3.5 text-[#0284C7]" /> Interview course se XP kamao
            </Link>
            <Link href="/" onClick={onClose} className="chip hover:border-[#E8A33D] hover:text-[#C77B12]">
              <Award className="w-3.5 h-3.5 text-[#E8A33D]" /> +50 XP for submitting a report
            </Link>
          </div>
        )}

        <div className="space-y-2 max-h-64 overflow-y-auto">
          <h4 className="text-xs font-bold text-[#10151C] mb-3 flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-[#E8A33D]" /> Placement season ranking
          </h4>

          {loading && (
            <div className="py-10 text-center">
              <div className="w-8 h-8 border-[3px] border-[#E8F4FB] border-t-[#0284C7] rounded-full animate-spin mx-auto" />
            </div>
          )}

          {!loading && error && (
            <div className="px-4 py-8 text-center text-[13px] font-semibold text-[#A63D28]">{error}</div>
          )}

          {!loading && !error && entries.length === 0 && (
            <div className="vault-card p-6 text-center space-y-2">
              <span className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-[#EEF1F4] text-[#7D8794]">
                <UserRound className="w-5 h-5" />
              </span>
              <p className="text-[14px] font-bold text-[#10151C]">Leaderboard is empty right now</p>
              <p className="text-[13px] text-[#7D8794]">
                The first student to earn XP will appear here. Complete the free interview course or submit a verified report to get started.
              </p>
              {!user && (
                <Link
                  href="/signup"
                  onClick={onClose}
                  className="inline-flex items-center gap-1.5 mt-2 text-[13px] font-bold text-[#0284C7] hover:text-[#0271B5]"
                >
                  Create free account <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
          )}

          {!loading && !error && entries.map((u) => (
            <div
              key={`${u.rank}-${u.name}`}
              className={`flex items-center justify-between p-3 rounded-xl border text-[13px] ${
                user && u.name === user.name
                  ? 'bg-[#E8F4FB]/60 border-[#bcdced] font-semibold'
                  : 'bg-[#FCFBF8] border-[#E9E7E1]'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] ${
                  u.rank === 1 ? 'bg-[#E8A33D] text-white' : u.rank === 2 ? 'bg-[#D6D2C8] text-[#3E4754]' : 'bg-[#EEF1F4] text-[#3E4754]'
                }`}>
                  {u.rank}
                </span>
                <div>
                  <span className="text-[#10151C] block font-bold">{u.name}</span>
                  <span className="text-[11px] text-[#7D8794]">{u.college} · {u.badge}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[#0E2A44] font-mono font-bold block stat-num">{u.xp} XP</span>
                <span className="text-[11px] text-[#C77B12] font-semibold">{u.streak}d streak</span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};