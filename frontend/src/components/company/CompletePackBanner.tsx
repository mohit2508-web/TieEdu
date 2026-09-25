import React from 'react';
import { ShoppingCart, BadgeCheck, Layers, CheckCircle2 } from 'lucide-react';

interface Props {
  companyName: string;
  premiumCount: number;
  ownedCount?: number;
  remainingPrice?: number;
  onAddCompletePack: () => void;
  isUnlocked?: boolean;
  onBrowseModules?: () => void;
}

export const CompletePackBanner: React.FC<Props> = ({ companyName, premiumCount, ownedCount = 0, remainingPrice, onAddCompletePack, isUnlocked, onBrowseModules }) => {
  if (isUnlocked) {
    return (
      <section className="rounded-3xl border-2 border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-emerald-50 shadow-sm p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-14 h-14 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-md">
              <BadgeCheck className="w-7 h-7" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                In your vault
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight leading-tight mt-1.5">
                {companyName} Complete Pack — all {premiumCount} rounds unlocked
              </h2>
              <p className="text-sm sm:text-base text-gray-600 mt-2 max-w-xl leading-relaxed">
                Every premium module, PDF guide and cheat sheet in this company is available to read, download and revise.
              </p>
            </div>
          </div>
          <button
            onClick={onBrowseModules}
            className="inline-flex items-center justify-center gap-2 min-h-[46px] px-6 py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold rounded-xl shadow-lg transition-all shrink-0"
          >
            <Layers className="w-5 h-5" /> Browse Modules
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-3xl border-2 border-[#E8A33D]/50 bg-gradient-to-r from-[#1F3A5F] via-[#1F3A5F]/95 to-slate-900 shadow-lg p-6 sm:p-8">
      <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-amber-400/10 blur-3xl pointer-events-none" />
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative">
        <div className="flex items-start gap-4 min-w-0">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 text-[#1F3A5F] flex items-center justify-center shrink-0 shadow-md">
            <Layers className="w-7 h-7" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="text-xs font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-400 text-[#1F3A5F]">
                Best Value · 37% OFF
              </span>
              {ownedCount > 0 ? (
                <span className="text-xs font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/10 text-amber-200 border border-white/20">
                  {premiumCount - ownedCount} rounds left
                </span>
              ) : (
                <span className="text-xs font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/10 text-amber-200 border border-white/20">
                  {premiumCount} Round Packs
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight leading-tight">
              {ownedCount > 0
                ? `${companyName} Complete Pack — finish your pack (${premiumCount - ownedCount} round${premiumCount - ownedCount === 1 ? '' : 's'} left)`
                : `${companyName} Complete Pack — all ${premiumCount} rounds, everything included`}
            </h2>
            <p className="text-sm sm:text-base text-sky-100/90 mt-2 max-w-xl leading-relaxed">
              {ownedCount > 0
                ? 'Top up with the remaining rounds at a single pack price — no need to buy them one by one.'
                : 'OA + Technical + System Design + HR — more content than the single packs, at one price.'}
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              {['OA + DSA', 'Technical R1', 'System Design', 'HR & STAR'].map(label => (
                <span key={label} className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-white/10 text-white border border-white/15">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" /> {label}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-stretch sm:items-center gap-3 shrink-0 lg:pl-6">
          <div className="text-white">
            <div className="flex items-baseline justify-center sm:justify-start gap-2">
              <span className="text-3xl font-black">₹{remainingPrice ?? 249}</span>
              {ownedCount === 0 && (
                <>
                  <span className="text-sm text-sky-300/80 line-through">₹396</span>
                  <BadgeCheck className="w-4 h-4 text-emerald-300" />
                </>
              )}
            </div>
            <p className="text-[11px] text-sky-200/70 text-center sm:text-left mt-0.5">
              {ownedCount > 0
                ? `${premiumCount - ownedCount} round${premiumCount - ownedCount === 1 ? '' : 's'} at one combo price`
                : '₹99 × 4 singles = ₹396 → ₹249 for the full pack'}
            </p>
          </div>
          <button
            onClick={onAddCompletePack}
            className="inline-flex items-center justify-center gap-2 min-h-[46px] px-6 py-3.5 bg-[#E8A33D] hover:bg-[#D4902C] text-[#1F3A5F] text-sm font-black rounded-xl shadow-lg transition-all"
          >
            <ShoppingCart className="w-5 h-5" />
            {ownedCount > 0 ? `Add Remaining ${premiumCount - ownedCount} Rounds` : 'Add Complete Pack to Cart'}
          </button>
        </div>
      </div>
    </section>
  );
};