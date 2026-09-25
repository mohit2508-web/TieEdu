import React from 'react';
import { Star, ShieldCheck, Flame, Clock, Award } from 'lucide-react';
import { TrustStats } from '@/types';

interface TrustBadgeBarProps {
  trustStats?: TrustStats;
  companyName: string;
  className?: string;
}

export const TrustBadgeBar: React.FC<TrustBadgeBarProps> = ({
  trustStats,
  className = ''
}) => {
  const rating = trustStats?.rating || 0;
  const ratingCount = trustStats?.rating_count || 0;
  const weeklyUnlocks = trustStats?.weekly_unlocks || 0;
  const verifiedRole = trustStats?.verified_by_role || null;
  const recency = trustStats?.recency_label || 'Updated for 2026 Hiring Season';
  const accuracy = trustStats?.accuracy_rate || 0;

  return (
    <div className={`w-full bg-[#FAFAF9] border border-[#EDEDEB] rounded-2xl p-4 sm:p-5 shadow-2xs ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-4 text-[13px]">

        {/* Rating — real (0 until candidate reports are published) */}
        <div className="flex items-center gap-2">
          {rating > 0 ? (
            <div className="flex items-center text-amber-500 font-bold bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/60">
              <Star className="w-4 h-4 fill-amber-400 text-amber-500 mr-1" />
              <span>{rating.toFixed(1)}</span>
            </div>
          ) : (
            <div className="flex items-center px-2.5 py-1 rounded-lg bg-[#EEF1F4] text-[#7D8794] font-semibold">
              <Star className="w-4 h-4 text-[#AEB6BE] mr-1" />
              <span>No ratings yet</span>
            </div>
          )}
          <span className="text-[#8A8A8A] font-medium">({ratingCount} verified reports)</span>
        </div>

        {/* Weekly Unlocks — live ledger count */}
        <div className="flex items-center gap-2 text-[#4A4A4A] font-medium">
          <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 shrink-0">
            <Flame className="w-4 h-4 fill-orange-500" />
          </div>
          <div>
            <span className="font-bold text-[#1F3A5F]">{weeklyUnlocks} candidates</span>
            <span className="text-[13px] text-[#8A8A8A]"> unlocked this week</span>
          </div>
        </div>

        {/* Verified proof — real only, no fabricated person */}
        <div className="flex items-center gap-2 bg-emerald-50/80 px-3 py-1.5 rounded-xl border border-emerald-200/80 text-emerald-900">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="text-[13px] font-semibold">
            {verifiedRole ? `Verified by ${verifiedRole}` : 'Verified candidate reports'}
          </span>
        </div>

        {/* Recency Badge */}
        <div className="flex items-center gap-1.5 text-[13px] text-indigo-900 bg-indigo-50/80 px-3 py-1.5 rounded-xl border border-indigo-200/80 font-medium">
          <Clock className="w-4 h-4 text-indigo-600" />
          <span>{recency}</span>
        </div>

        {/* Accuracy score — real */}
        <div className="flex items-center gap-1.5 bg-[#1F3A5F]/5 px-3 py-1.5 rounded-xl border border-[#1F3A5F]/15 font-bold text-[#1F3A5F] text-[13px]">
          <Award className="w-4 h-4 text-[#E8A33D]" />
          <span>{accuracy > 0 ? `${accuracy}% Exam Match Score` : 'Match score pending reports'}</span>
        </div>

      </div>
    </div>
  );
};