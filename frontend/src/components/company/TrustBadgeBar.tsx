import React from 'react';
import { Star, ShieldCheck, Flame, Clock, Award, FileWarning } from 'lucide-react';
import { TrustStats } from '@/types';

interface TrustBadgeBarProps {
  trustStats?: TrustStats;
  companyName: string;
  className?: string;
}

/** "12 Mar 2026" from an ISO string. Returns null for anything unparseable. */
function formatDay(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export const TrustBadgeBar: React.FC<TrustBadgeBarProps> = ({
  trustStats,
  className = ''
}) => {
  const rating = trustStats?.rating || 0;
  const ratingCount = trustStats?.rating_count || 0;
  const weeklyUnlocks = trustStats?.weekly_unlocks || 0;
  const verifiedRole = trustStats?.verified_by_role || null;
  const accuracy = trustStats?.accuracy_rate || 0;

  // Freshness comes from the newest PUBLISHED report in the ledger. There is no
  // season string to fall back on — with no reports we say so honestly instead of
  // claiming the vault was "updated for <year>".
  const lastReportDay = formatDay(trustStats?.last_report_at);
  const hasReports = ratingCount > 0 && !!lastReportDay;

  return (
    <div className={`w-full bg-[#FAFAF9] border border-[#EDEDEB] rounded-2xl p-4 sm:p-5 shadow-2xs ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5 text-[13px]">

        {/* Rating — real (0 until candidate reports are published) */}
        <div className="flex items-center gap-2">
          {rating > 0 ? (
            <div className="flex items-center text-amber-500 font-bold bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/60">
              <Star className="w-4 h-4 fill-amber-400 text-amber-500 mr-1" />
              <span>{rating.toFixed(1)}</span>
            </div>
          ) : (
            <div className="flex items-center px-2.5 py-1 rounded-lg bg-[#EEF1F4] text-[--text-muted] font-semibold">
              <Star className="w-4 h-4 text-[#AEB6BE] mr-1" />
              <span>No ratings yet</span>
            </div>
          )}
          <span className="text-[--text-muted] font-medium">({ratingCount} verified reports)</span>
        </div>

        {/* Weekly Unlocks — live ledger count */}
        <div className="flex items-center gap-2 text-[#4A4A4A] font-medium">
          <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 shrink-0">
            <Flame className="w-4 h-4 fill-orange-500" />
          </div>
          <div>
            <span className="font-bold text-[#1F3A5F]">{weeklyUnlocks} candidates</span>
            <span className="text-[13px] text-[--text-muted]"> unlocked this week</span>
          </div>
        </div>

        {/* Verification status — never claim proof that does not exist */}
        {hasReports ? (
          <div className="flex items-center gap-2 bg-emerald-50/80 px-3 py-1.5 rounded-xl border border-emerald-200/80 text-emerald-900">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-[13px] font-semibold">
              {verifiedRole ? `Verified by ${verifiedRole}` : 'Verified candidate reports'}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-[#EEF1F4] px-3 py-1.5 rounded-xl border border-[#DCE1E6] text-[#4A4A4A]">
            <ShieldCheck className="w-4 h-4 text-[#AEB6BE] shrink-0" />
            <span className="text-[13px] font-semibold">Awaiting verified reports</span>
          </div>
        )}

        {/* Freshness — derived from the newest published report, or an honest gap */}
        {hasReports ? (
          <div className="flex items-center gap-1.5 text-[13px] text-indigo-900 bg-indigo-50/80 px-3 py-1.5 rounded-xl border border-indigo-200/80 font-medium">
            <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>Last verified report {lastReportDay}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-[13px] text-amber-900 bg-amber-50/80 px-3 py-1.5 rounded-xl border border-amber-200/80 font-medium">
            <FileWarning className="w-4 h-4 text-amber-600 shrink-0" />
            <span>No candidate reports yet — freshness unknown</span>
          </div>
        )}

        {/* Accuracy score — real */}
        <div className="flex items-center gap-1.5 bg-[#1F3A5F]/5 px-3 py-1.5 rounded-xl border border-[#1F3A5F]/15 font-bold text-[#1F3A5F] text-[13px]">
          <Award className="w-4 h-4 text-[#B45309]" />
          <span>{accuracy > 0 ? `${accuracy}% Exam Match Score` : 'Match score pending reports'}</span>
        </div>

      </div>
    </div>
  );
};