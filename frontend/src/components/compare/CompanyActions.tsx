import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, CheckCircle2, Lock, ShoppingBag, Sparkles, MessageSquarePlus, Info } from 'lucide-react';
import type { CompareCompany } from '@/types';
import { packPrice, savingsFor, packSizeLabel, listPrice } from '@/lib/packPricing';

/**
 * One CTA block per company, shared by the desktop matrix footer and the mobile
 * cards so the offer can never drift between the two layouts.
 *
 * Price fix: the price is ALWAYS `packPrice(number of rounds this user has not
 * already bought)`. The old compare page pushed a bare `Company` object into the
 * cart, which CartModal bills at the flat COMPLETE_PACK_PRICE (Rs 249) — so a
 * one-round vault was quoted full pack price. Here we pass the exact un-owned
 * `module_ids`, which is the same shape the company detail page builds, and the
 * cart prices the real remaining size.
 */
export interface CompanyActionsProps {
  company: CompareCompany;
  onUnlock: (c: CompareCompany, moduleIds: string[]) => void;
  onSubmitReport: (c: CompareCompany) => void;
  inCart?: boolean;
  variant?: 'row' | 'card';
}

export const CompanyActions: React.FC<CompanyActionsProps> = ({
  company,
  onUnlock,
  onSubmitReport,
  inCart = false,
  variant = 'row',
}) => {
  const [showWhy, setShowWhy] = useState(false);

  const remainingIds = company.premium_module_ids.filter((id) => !company.owned_module_ids.includes(id));
  const price = packPrice(remainingIds.length);
  const list = listPrice(remainingIds.length);
  const save = savingsFor(remainingIds.length);
  const fullyFree = company.premium_module_count === 0;
  const fullyOwned = remainingIds.length === 0;

  const vaultHref = `/company/${company.slug}`;
  const sizeLabel = packSizeLabel(remainingIds.length || 1);

  return (
    <div className={variant === 'card' ? 'space-y-3' : 'space-y-2'}>
      {/* Primary action */}
      {fullyOwned || company.is_unlocked ? (
        <Link
          href={vaultHref}
          className="w-full inline-flex items-center justify-center gap-2 min-h-[46px] px-5 py-2.5 rounded-xl bg-[#1F3A5F] hover:bg-[#2A4D7E] text-white text-sm font-bold shadow-sm transition-colors"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{fullyFree ? 'Open Free Vault' : 'Open Vault'}</span>
          <ArrowUpRight className="w-4 h-4 shrink-0" />
        </Link>
      ) : (
        <button
          onClick={() => onUnlock(company, remainingIds)}
          className="w-full inline-flex items-center justify-center gap-2 min-h-[46px] px-5 py-2.5 rounded-xl bg-[var(--brand-accent)] hover:bg-[var(--brand-accent-hover)] text-[#241A06] text-sm font-bold shadow-sm transition-colors"
        >
          {inCart ? <ShoppingBag className="w-4 h-4 shrink-0" /> : <Lock className="w-4 h-4 shrink-0" />}
          <span>
            {inCart ? 'In Cart' : `Unlock ${sizeLabel} · ₹${price}`}
          </span>
        </button>
      )}

      {/* Honest price breakdown — only shown when there is a real purchase */}
      {!fullyOwned && !fullyFree && (
        <div className="text-[11px] leading-snug">
          <p className="text-[#4A4A4A]">
            <span className="font-bold text-[#1A1A1A]">₹{price}</span>
            {save > 0 && <span className="line-through text-[--text-muted] ml-1.5">₹{list}</span>}
            <span className="text-[--text-muted]">
              {' '}for {remainingIds.length} round{remainingIds.length === 1 ? '' : 's'}
              {save > 0 && <span className="text-emerald-700 font-bold"> · save ₹{save}</span>}
            </span>
          </p>
          {company.owned_module_count > 0 && (
            <p className="text-[--text-muted] mt-0.5">
              You already own {company.owned_module_count} round{company.owned_module_count === 1 ? '' : 's'} — you are only
              charged for the {remainingIds.length} left.
            </p>
          )}
        </div>
      )}

      {fullyFree && (
        <p className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5 leading-snug">
          Every module in this vault is free. No payment needed.
        </p>
      )}

      {/* Secondary actions */}
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={vaultHref}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1F3A5F]/20 bg-white text-[12px] font-semibold text-[#1F3A5F] hover:border-[#1F3A5F]/40 transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5" /> View vault
        </Link>

        {company.derived.published_report_count === 0 && (
          <button
            onClick={() => onSubmitReport(company)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#B45309]/25 bg-[#FFFBF2] text-[12px] font-semibold text-[#8A5200] hover:border-[#B45309]/50 transition-colors"
          >
            <MessageSquarePlus className="w-3.5 h-3.5" />
            Be the first to report
          </button>
        )}
      </div>

      {company.derived.published_report_count === 0 && (
        <button
          onClick={() => setShowWhy((v) => !v)}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[--text-muted] hover:text-[#1A1A1A] transition-colors"
        >
          <Info className="w-3 h-3" />
          {showWhy ? 'Hide' : 'Why are match numbers missing?'}
        </button>
      )}

      {showWhy && company.derived.published_report_count === 0 && (
        <p className="text-[11px] text-[#4A4A4A] bg-[#FAFAF9] border border-[#EDEDEB] rounded-lg px-2.5 py-2 leading-relaxed">
          Match accuracy and ratings are computed only from candidate reports that an admin has reviewed and
          published. None exist for {company.name} yet, so we show a gap instead of an estimate. If you attended
          an interview, submitting your experience is what fills this in.
        </p>
      )}
    </div>
  );
};

/** Legend explaining the derived vs sourced vs unverified distinction. */
export const MatrixLegend: React.FC = () => (
  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-[--text-muted]">
    <span className="inline-flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full bg-emerald-600" /> Counted live from the database
    </span>
    <span className="inline-flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full bg-sky-600" /> Editorial figure with a recorded source
    </span>
    <span className="inline-flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full bg-amber-600" /> Editorial figure with no source yet
    </span>
    <span className="inline-flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full bg-[#C9C9C4]" /> Not recorded
    </span>
  </div>
);
