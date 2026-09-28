import React from 'react';
import { Company, RoundStep, RoundType } from '@/types';
import { BrandTile } from '@/components/common/BrandTile';
import { ProvenanceChip, ProvenanceNote, formatDay } from '@/lib/provenance';
import {
  Briefcase, DollarSign, Layers, Calendar, Star, Sparkles, CheckCircle2,
  ExternalLink, FileText, MapPin, Building2
} from 'lucide-react';
import { COMPLETE_PACK_PRICE, COMPLETE_PACK_COUNT, packSizeLabel } from '@/lib/packPricing';

interface CompanyOverviewHeaderProps {
  company: Company;
  activeRoundTab: 'all' | RoundType;
  onSelectRoundTab: (round: 'all' | RoundType) => void;
  onUnlockClick?: () => void;
  isUnlocked?: boolean;
  /**
   * Real amount the ladder will charge for the rounds this viewer still lacks.
   * No default — a fake fallback here is what makes a vault advertise a price
   * the checkout will not honour.
   */
  unlockPrice?: number;
  /** How many premium rounds remain — drives an honest "complete pack" label. */
  remainingRounds?: number;
}

export const CompanyOverviewHeader: React.FC<CompanyOverviewHeaderProps> = ({
  company,
  activeRoundTab,
  onSelectRoundTab,
  onUnlockClick,
  isUnlocked = false,
  unlockPrice,
  remainingRounds
}) => {
  const roundsLeft = remainingRounds ?? 0;
  const packLabel = roundsLeft > 0 ? packSizeLabel(roundsLeft) : 'pack';
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

  // Counted from the vault itself — the one number on this card that cannot be
  // wrong. Replaces a hardcoded "On-Campus & Off-Campus" drive-window claim.
  const questionCount = (company.modules || []).reduce((s, m) => s + (m.items?.length || 0), 0);
  const moduleCount = (company.modules || []).length;
  const authoredPacks = (company.modules || []).filter((m) => m.section_data && Object.keys(m.section_data).length > 0).length;

  const factCheckedDay = formatDay(company.fact_checked_at);
  const careersHref = company.careers_link
    ? (company.careers_link.startsWith('http') ? company.careers_link : `https://${company.careers_link}`)
    : null;

  const profileFacts: Array<{ icon: typeof MapPin; text: string }> = [];
  if (company.hq) profileFacts.push({ icon: MapPin, text: company.hq });
  if (company.founded_year) profileFacts.push({ icon: Building2, text: `Founded ${company.founded_year}` });
  if (company.employee_band) profileFacts.push({ icon: Building2, text: `${company.employee_band} employees` });

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
              {company.industry || 'Industry not recorded'}
              {company.avg_rounds != null && ` • ${company.avg_rounds} Rounds`}
              {company.avg_process_days != null && ` • ${company.avg_process_days} Days`}
            </p>

            {company.tagline && (
              <p className="text-[13px] sm:text-[15px] text-[#1F3A5F] font-semibold leading-snug mb-2.5 max-w-xl">
                {company.tagline}
              </p>
            )}

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
                <span className="text-2xl font-black text-[#1F3A5F]">
                  {typeof unlockPrice === 'number' ? `₹${unlockPrice}` : '—'}
                </span>
                <span className="text-xs text-gray-500">
                  {roundsLeft === COMPLETE_PACK_COUNT
                    ? 'complete pack · one-time'
                    : roundsLeft === 1
                      ? 'single round · one-time'
                      : `${roundsLeft}-round pack · one-time`}
                </span>
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
            <span>
              {typeof unlockPrice === 'number' && unlockPrice < COMPLETE_PACK_PRICE
                ? `Finish Pack — ₹${unlockPrice}`
                : `Unlock ${packLabel === 'pack' ? 'Intelligence Hub' : packLabel}`}
            </span>
          </button>
          )}
        </div>
      </div>

      {/* About + profile facts — all admin-written, gaps shown honestly */}
      {(company.about || profileFacts.length > 0 || careersHref || factCheckedDay) && (
        <div className="rounded-2xl border border-[#EDEDEB] bg-[#FAFAF9] p-4 sm:p-5 space-y-3">
          {company.about && (
            <div>
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-[--text-muted] mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> About {company.name}
              </h2>
              <p className="text-[13px] sm:text-sm text-[#1F3A5F] leading-relaxed whitespace-pre-line">
                {company.about}
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11.5px] text-[#4A4A4A]">
            {profileFacts.map((f, i) => (
              <span key={i} className="inline-flex items-center gap-1.5">
                <f.icon className="w-3.5 h-3.5 text-[--text-muted] shrink-0" />
                {f.text}
              </span>
            ))}
            {careersHref && (
              <a
                href={careersHref}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-1.5 font-semibold text-[#1F3A5F] hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                Official careers page
              </a>
            )}
          </div>

          <p className="text-[11px] text-[--text-muted]">
            {factCheckedDay
              ? `Profile last fact-checked by an admin on ${factCheckedDay}.`
              : 'This profile has not been fact-checked by an admin yet — treat the figures below as unconfirmed.'}
          </p>
        </div>
      )}

      {/* Overview Metadata Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">

        <div className="p-4 bg-[#FAFAF9] rounded-2xl border border-[#EDEDEB] space-y-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-500">
            <DollarSign className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="truncate">CTC Package Range</span>
          </div>
          <p className="text-base sm:text-lg font-bold text-[#1F3A5F]">{ctcText}</p>
          <ProvenanceChip sources={company.metric_sources} metricKey="ctc" hasValue={hasCtc} className="mt-1" />
          <ProvenanceNote
            sources={company.metric_sources}
            metricKey="ctc"
            hasValue={hasCtc}
            absentText="No CTC figure recorded by an admin."
          />
        </div>

        {/* Counted from the vault — cannot be fabricated */}
        <div className="p-4 bg-[#FAFAF9] rounded-2xl border border-[#EDEDEB] space-y-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-500">
            <Layers className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="truncate">Questions in Vault</span>
          </div>
          <p className="text-base sm:text-lg font-bold text-[#1F3A5F]">
            {questionCount}
            <span className="text-xs font-semibold text-[--text-muted]"> / {moduleCount} modules</span>
          </p>
          <p className="text-[10.5px] text-[--text-muted] leading-snug">
            {authoredPacks === moduleCount && moduleCount > 0
              ? 'Every module has a written pack.'
              : `${authoredPacks} of ${moduleCount} modules have a written pack.`}
          </p>
        </div>

        {/* Real process figure, not a hardcoded drive-window claim */}
        <div className="p-4 bg-[#FAFAF9] rounded-2xl border border-[#EDEDEB] space-y-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-500">
            <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="truncate">Avg Process Duration</span>
          </div>
          <p className="text-base sm:text-lg font-bold text-[#1F3A5F]">
            {company.avg_process_days != null ? `${company.avg_process_days} days` : 'Not recorded'}
          </p>
          <ProvenanceChip sources={company.metric_sources} metricKey="process_days" hasValue={company.avg_process_days != null} className="mt-1" />
          <ProvenanceNote
            sources={company.metric_sources}
            metricKey="process_days"
            hasValue={company.avg_process_days != null}
            absentText="No duration recorded by an admin."
          />
        </div>

        <div className="p-4 bg-[#FAFAF9] rounded-2xl border border-[#EDEDEB] space-y-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-500">
            <Briefcase className="w-4 h-4 text-orange-600 shrink-0" />
            <span className="truncate">Difficulty Rating</span>
          </div>
          <div className="flex items-center gap-1 text-amber-500">
            {company.difficulty_rating > 0 ? (
              [1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className={`w-4 h-4 ${s <= company.difficulty_rating ? 'fill-amber-400 text-amber-500' : 'text-gray-300'}`} />
              ))
            ) : (
              <span className="text-xs text-gray-500">Not rated</span>
            )}
          </div>
          <ProvenanceChip sources={company.metric_sources} metricKey="difficulty" hasValue={company.difficulty_rating > 0} className="mt-1" />
          <ProvenanceNote
            sources={company.metric_sources}
            metricKey="difficulty"
            hasValue={company.difficulty_rating > 0}
            absentText="No difficulty rating recorded."
          />
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