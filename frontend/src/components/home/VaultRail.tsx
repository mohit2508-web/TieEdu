import React from 'react';
import Link from 'next/link';
import { ArrowRight, Flame, Star } from 'lucide-react';
import { Rail } from '@/components/home/Rail';
import { BrandTile } from '@/components/common/BrandTile';
import { Company } from '@/types';

const CARD_W = 'w-[80vw] max-w-[300px] sm:w-[260px] lg:w-[280px]';

/**
 * A company vault as a feed card. The grid's CompanyCard is a comparison
 * surface (stat grid, tag row, 5 zones) — at feed width it read as a table, so
 * this is the four facts that earn a tap: who, how hot, what it pays, how
 * fresh. `unlock_count` is the heat: it is the server's own count of vaults
 * people actually bought, not a made-up popularity number.
 */
const VaultRailCard: React.FC<{ company: Company }> = ({ company }) => (
  <Link
    href={`/company/${company.slug}`}
    className={`vault-card group flex flex-col gap-3 p-4 ${CARD_W}`}
  >
    <div className="flex items-center gap-3">
      <BrandTile
        name={company.name}
        src={company.logo_url}
        className="h-11 w-11 shrink-0 rounded-2xl p-1"
      />
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-serif-heading text-[17px] font-extrabold text-[#10151C] transition-colors group-hover:text-[#0271B5]">
          {company.name}
        </h3>
        <p className="truncate text-[12px] font-semibold text-[var(--text-muted)]">
          {company.industry || 'Interview vault'}
        </p>
      </div>
      <ArrowRight
        className="h-4 w-4 shrink-0 text-[var(--text-muted)] transition-transform group-hover:translate-x-0.5"
        aria-hidden
      />
    </div>

    <div className="flex flex-wrap gap-1.5">
      <span className="inline-flex items-center gap-1 rounded-full bg-[#FDEDE9] border border-[#F2C9BC] px-2 py-1 text-[12px] font-bold text-[#A63D28]">
        <Flame className="w-3.5 h-3.5" aria-hidden />
        {company.unlock_count} unlocks
      </span>
      {company.accuracy_score != null && (
        <span className="inline-flex items-center rounded-full bg-[#E9F6EE] border border-[#CDE9D4] px-2 py-1 text-[12px] font-bold text-[#15803D]">
          {company.accuracy_score}% accuracy
        </span>
      )}
      {company.ctc_min != null && company.ctc_max != null && (
        <span className="inline-flex items-center rounded-full bg-[#F1F3F5] px-2 py-1 text-[12px] font-bold text-[#3E4754]">
          ₹{company.ctc_min}–{company.ctc_max}L
        </span>
      )}
    </div>

    <div className="mt-auto flex items-center justify-between border-t border-[#EFEEE9] pt-2.5 text-[12px] font-semibold text-[var(--text-muted)]">
      <span>Updated {company.last_updated_days_ago || 1}d ago</span>
      {company.difficulty_rating > 0 && (
        <span className="inline-flex items-center gap-1 font-bold text-[#92400E]">
          <Star className="w-3.5 h-3.5 fill-[#E8A33D] text-[#B45309]" aria-hidden />
          {company.difficulty_rating}/5
        </span>
      )}
    </div>
  </Link>
);

/**
 * The vault directory, as a feed. Presentational: the page owns the company
 * list, the search query and the industry chips because the hero search shares
 * that state. Sorted by unlocks (trending), filtered, then capped — a feed
 * shows the hottest dozen, not the whole table.
 */
export const VaultRail: React.FC<{
  companies: Company[];
  loading: boolean;
  total: number;
  industries: string[];
  selectedIndustry: string;
  onSelectIndustry: (ind: string) => void;
  searchQuery: string;
}> = ({ companies, loading, total, industries, selectedIndustry, onSelectIndustry, searchQuery }) => {
  const q = searchQuery.trim().toLowerCase();
  const filtered = companies
    .filter((c) => selectedIndustry === 'All' || (c.industry || '').includes(selectedIndustry))
    .filter(
      (c) =>
        !q ||
        (c.name || '').toLowerCase().includes(q) ||
        (c.tags || []).some((t) => t.toLowerCase().includes(q))
    )
    .sort((a, b) => (b.unlock_count || 0) - (a.unlock_count || 0));

  return (
    <Rail
      id="companies"
      eyebrow="Trending"
      title="Company vaults"
      meta={!loading && total > 0 ? `${total} verified vaults` : undefined}
      loading={loading}
      skeletonWidth={CARD_W}
      skeletonHeight="h-[212px]"
      controls={
        <IndustryChips
          industries={industries}
          selected={selectedIndustry}
          onSelect={onSelectIndustry}
        />
      }
    >
      {filtered.length > 0 ? (
        filtered.slice(0, 12).map((c) => <VaultRailCard key={c.id} company={c} />)
      ) : (
        <div className="flex w-full items-center justify-center rounded-2xl border border-dashed border-[#E9E7E1] bg-white px-6 py-10 text-center">
          <p className="text-[15px] text-[var(--text-muted)]">
            No company matched — try another keyword or chip.
          </p>
        </div>
      )}
    </Rail>
  );
};

/**
 * The industry chips sit between the rail header and the track so filtering
 * stays one thumb-scroll away from the cards it changes.
 */
export const IndustryChips: React.FC<{
  industries: string[];
  selected: string;
  onSelect: (ind: string) => void;
}> = ({ industries, selected, onSelect }) => (
  <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none sm:mx-0 sm:px-0 sm:flex-wrap sm:overflow-visible">
    {industries.map((ind) => (
      <button
        key={ind}
        type="button"
        onClick={() => onSelect(ind)}
        aria-pressed={selected === ind}
        className="dir-chip focus-ring flex-none"
      >
        {ind}
      </button>
    ))}
  </div>
);

export default VaultRail;
