import React from 'react';
import { Company, RoundStep, RoundType } from '@/types';
import { BrandTile } from '@/components/common/BrandTile';
import { Briefcase, DollarSign, GraduationCap, Calendar, Star, Sparkles, CheckCircle2 } from 'lucide-react';

interface CompanyOverviewHeaderProps {
  company: Company;
  activeRoundTab: 'all' | RoundType;
  onSelectRoundTab: (round: 'all' | RoundType) => void;
  onUnlockClick?: () => void;
  isUnlocked?: boolean;
  unlockPrice?: number;
}

export const CompanyOverviewHeader: React.FC<CompanyOverviewHeaderProps> = ({
  company,
  activeRoundTab,
  onSelectRoundTab,
  onUnlockClick,
  isUnlocked = false,
  unlockPrice = 249
}) => {
  // Derive pipeline from real modules when a custom pipeline isn't configured.
  const defaultRounds: RoundStep[] = company.rounds_pipeline && company.rounds_pipeline.length > 0
    ? company.rounds_pipeline
    : (company.modules || []).reduce((acc: RoundStep[], mod) => {
        if (!mod.round_type) return acc;
        if (!acc.some((r) => r.round_type === mod.round_type)) {
          acc.push({
            step_number: acc.length + 1,
            title: `Round ${acc.length + 1}: ${mod.round_type}`,
            subtitle: mod.title || '',
            round_type: mod.round_type,
            difficulty: 'medium',
            module_count: 1,
          });
        }
        return acc;
      }, []);

  const hasCtc = company.ctc_min != null && company.ctc_max != null;
  const ctcText = hasCtc ? `₹${company.ctc_min} - ₹${company.ctc_max} LPA` : 'Not disclosed yet';

  return (
    <div className="w-full bg-white border border-[#EDEDEB] rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-xs space-y-6 overflow-hidden">

      {/* Top Banner: Logo + Company Info + Unlock Badge */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 sm:gap-6 pb-5 sm:pb-6 border-b border-[#EDEDEB]">

        <div className="flex items-start gap-3.5 sm:gap-5 min-w-0">
          <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl border border-[#EDEDEB] p-1.5 sm:p-2 bg-[#FAFAF9] shadow-inner flex items-center justify-center shrink-0 overflow-hidden">
            <BrandTile
              name={company.name}
              src={company.logo_url}
              className="w-full h-full rounded-xl"
              title={company.name}
            />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl sm:text-3xl font-extrabold text-[#1A1A1A] tracking-tight truncate">{company.name} Intelligence Hub</h1>
              {company.status === 'published' && (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold text-[11px] sm:text-xs border border-emerald-200">
                  Active Vault
                </span>
              )}
            </div>

            <p className="text-xs sm:text-base text-gray-600 font-medium mb-2.5 leading-snug">
              {company.industry || 'General Tech'}
              {company.avg_rounds != null && ` • ${company.avg_rounds} Rounds`}
              {company.avg_process_days != null && ` • ${company.avg_process_days} Days`}
            </p>

            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {(company.tags || []).map((tag, idx) => (
                <span key={idx} className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-[#FAFAF9] border border-[#EDEDEB] text-[#1F3A5F] font-mono text-[11px] sm:text-xs font-semibold">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Quick CTA Card — hidden buy CTA once the vault is fully owned */}
        <div className="w-full sm:w-auto sm:max-w-xs rounded-2xl p-4 sm:p-5 flex flex-col items-start sm:items-end justify-between shrink-0 shadow-2xs border ${
          isUnlocked
            ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200'
            : 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200'
        }">
          <div className="text-left sm:text-right mb-3">
            <span className={`text-xs font-mono uppercase font-bold tracking-wider ${isUnlocked ? 'text-emerald-800' : 'text-amber-800'}`}>
              {isUnlocked ? 'Placement Vault — Unlocked' : 'Placement Vault Price'}
            </span>
            {isUnlocked ? (
              <div className="flex items-center gap-1.5 justify-start sm:justify-end mt-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-bold text-emerald-700">All rounds access granted</span>
              </div>
            ) : (
              <div className="flex items-baseline gap-2 justify-start sm:justify-end">
                <span className="text-2xl font-black text-[#1F3A5F]">₹{unlockPrice}</span>
                <span className="text-xs text-gray-500">complete pack · one-time</span>
              </div>
            )}
          </div>

          {isUnlocked ? (
            <span className="w-full inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md uppercase tracking-wide">
              <CheckCircle2 className="w-4 h-4" />
              Vault Unlocked
            </span>
          ) : (
          <button
            onClick={onUnlockClick}
            className="w-full px-5 py-2.5 bg-[#E8A33D] hover:bg-[#D4902C] text-[#241A06] text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 uppercase tracking-wide"
          >
            <Sparkles className="w-4 h-4 fill-white" />
            <span>{unlockPrice < 249 ? `Finish Pack — ₹${unlockPrice}` : 'Unlock Intelligence Hub'}</span>
          </button>
          )}
        </div>
      </div>

      {/* Overview Metadata Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">

        <div className="p-4 bg-[#FAFAF9] rounded-2xl border border-[#EDEDEB] space-y-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-500">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <span>CTC Package Range</span>
          </div>
          <p className="text-base sm:text-lg font-bold text-[#1F3A5F]">{ctcText}</p>
        </div>

        <div className="p-4 bg-[#FAFAF9] rounded-2xl border border-[#EDEDEB] space-y-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-500">
            <GraduationCap className="w-4 h-4 text-indigo-600" />
            <span>Interview Rounds</span>
          </div>
          <p className="text-base sm:text-lg font-bold text-[#1F3A5F]">{defaultRounds.length || 'Pending'}</p>
        </div>

        <div className="p-4 bg-[#FAFAF9] rounded-2xl border border-[#EDEDEB] space-y-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-500">
            <Calendar className="w-4 h-4 text-amber-600" />
            <span>Hiring Drive Window</span>
          </div>
          <p className="text-base sm:text-lg font-bold text-[#1F3A5F]">On-Campus & Off-Campus</p>
        </div>

        <div className="p-4 bg-[#FAFAF9] rounded-2xl border border-[#EDEDEB] space-y-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-500">
            <Briefcase className="w-4 h-4 text-orange-600" />
            <span>Difficulty Rating</span>
          </div>
          <div className="flex items-center gap-1 text-amber-500 mt-1">
            {company.difficulty_rating > 0 ? (
              [1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className={`w-4 h-4 ${s <= company.difficulty_rating ? 'fill-amber-400 text-amber-500' : 'text-gray-300'}`} />
              ))
            ) : (
              <span className="text-xs text-gray-500">Not rated yet</span>
            )}
          </div>
        </div>

      </div>

      {/* Visual Round Pipeline Stepper */}
      {defaultRounds.length > 0 && (
      <div className="pt-2">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm sm:text-base font-bold uppercase tracking-wider text-[#1F3A5F] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#E8A33D]"></span>
            Recruitment Process Pipeline (Click to filter round modules)
          </h2>
          <button
            onClick={() => onSelectRoundTab('all')}
            className={`text-xs sm:text-sm font-semibold font-mono ${activeRoundTab === 'all' ? 'text-[#B45309] underline' : 'text-gray-500 hover:text-gray-900'}`}
          >
            Show All Rounds
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {defaultRounds.map((r) => {
            const isActive = activeRoundTab === r.round_type;
            return (
              <button
                key={r.step_number}
                onClick={() => onSelectRoundTab(r.round_type)}
                className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden group ${
                  isActive
                    ? 'bg-[#1F3A5F] text-white border-[#1F3A5F] shadow-md'
                    : 'bg-[#FAFAF9] hover:bg-white text-gray-800 border-[#EDEDEB] hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-xs font-mono font-bold uppercase px-2 py-0.5 rounded-md ${
                    isActive ? 'bg-amber-400 text-[#1F3A5F]' : 'bg-gray-200 text-gray-700'
                  }`}>
                    Step {r.step_number}
                  </span>
                  <span className={`text-xs font-mono font-semibold ${isActive ? 'text-amber-300' : 'text-gray-500'}`}>
                    {r.module_count > 0 ? `${r.module_count} Modules` : ''}
                  </span>
                </div>

                <h3 className="text-sm sm:text-base font-bold truncate mb-0.5">{r.title}</h3>
                <p className={`text-xs sm:text-sm ${isActive ? 'text-gray-200' : 'text-gray-500'}`}>{r.subtitle}</p>
              </button>
            );
          })}
        </div>
      </div>
      )}

    </div>
  );
};