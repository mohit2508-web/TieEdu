import React, { useState } from 'react';
import { ChevronDown, FileText } from 'lucide-react';
import { BrandTile } from '@/components/common/BrandTile';
import type { CompareCompany, ComparisonMatrix } from '@/types';
import { CompanyActions } from './CompanyActions';
import { previewQuestionsRow, STATIC_ROWS, buildRoundRows, type RowDef, type Cell } from './comparisonRows';

/**
 * Mobile (< lg) comparison layout.
 *
 * Deliberately NOT a horizontally-scrolling table. A 3-column metric grid on a
 * 360px screen leaves ~60px per column, which is unusable, and a `min-w-[680px]`
 * scroller hides the real values off-screen. Instead: one card per company, all
 * metrics stacked vertically, plus a sticky tab bar to jump between companies.
 *
 * Reads from the same `RowDef` list as the desktop matrix, so the two views can
 * never show different numbers.
 */
export const CompareCompanyCards: React.FC<{
  matrix: ComparisonMatrix;
  groups: Array<{ id: string; title: string; blurb: string; icon: any }>;
  activeSlug: string;
  onActiveSlugChange: (slug: string) => void;
  onUnlock: (c: CompareCompany, moduleIds: string[]) => void;
  onSubmitReport: (c: CompareCompany) => void;
  cartKeys: Set<string>;
}> = ({
  matrix, groups, activeSlug, onActiveSlugChange, onUnlock, onSubmitReport, cartKeys,
}) => {
  const companies = matrix.companies;
  const roundRows = buildRoundRows(matrix);
  const active = companies.find((c) => c.slug === activeSlug) || companies[0];

  const rowsFor = (groupId: string): RowDef[] => {
    if (groupId === 'rounds') return roundRows;
    return STATIC_ROWS[groupId] || [];
  };

  if (!active) return null;

  return (
    <div className="space-y-3">
      {/* Sticky company switcher */}
      <div className="sticky top-[var(--header-total)] z-30 -mx-4 px-4 py-2 bg-app-warm/95 backdrop-blur border-b border-line">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar" role="tablist" aria-label="Company to compare">
          {companies.map((c) => {
            const on = c.slug === active.slug;
            return (
              <button
                key={c.id}
                role="tab"
                aria-selected={on}
                onClick={() => onActiveSlugChange(c.slug)}
                className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                  on
                    ? 'bg-brand-ink text-white border-brand-ink'
                    : 'bg-white text-brand-ink border-brand-ink/20'
                }`}
              >
                <BrandTile name={c.name} src={c.logo_url} className="w-4 h-4 rounded-full p-0 shrink-0" />
                <span className="max-w-[110px] truncate">{c.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Company identity */}
      <div className="bg-white border border-line rounded-2xl p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <BrandTile name={active.name} src={active.logo_url} className="w-12 h-12 rounded-2xl p-1 shrink-0" />
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-extrabold text-heading leading-tight break-words">
              {active.name}
            </h2>
            {active.tagline ? (
              <p className="text-xs text-body leading-snug mt-1">{active.tagline}</p>
            ) : (
              <p className="text-xs text-[--text-muted] leading-snug mt-1 italic">
                No tagline written by an admin yet.
              </p>
            )}
            <p className="text-xs text-[--text-muted] mt-1.5">
              {active.industry || 'Industry not recorded'}
            </p>
          </div>
        </div>

        {/* Quick counters */}
        <div className="grid grid-cols-3 gap-2 mt-3.5">
          <Stat label="Modules" value={active.derived.module_count} />
          <Stat label="Questions" value={active.derived.question_count} />
          <Stat label="Free" value={active.derived.free_preview_question_count} accent />
        </div>
      </div>

      {/* Actions — above the fold on mobile */}
      <div className="bg-white border border-line rounded-2xl p-4 shadow-sm">
        <CompanyActions
          company={active}
          onUnlock={onUnlock}
          onSubmitReport={onSubmitReport}
          inCart={cartKeys.has(active.slug)}
          variant="card"
        />
      </div>

      {/* Metric groups as accordions */}
      {groups.map((group) => {
        const rows = rowsFor(group.id);
        if (rows.length === 0) return null;
        const Icon = group.icon;
        return (
          <details key={group.id} open className="bg-white border border-line rounded-2xl shadow-sm overflow-hidden group">
            <summary className="flex items-start gap-2.5 px-4 py-3.5 list-none [&::-webkit-details-marker]:hidden">
              <Icon className="w-4 h-4 text-brand-ink shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-extrabold text-heading leading-tight">{group.title}</h3>
                <p className="text-xs text-[--text-muted] leading-snug mt-0.5">{group.blurb}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-[--text-muted] shrink-0 mt-0.5 transition-transform group-open:rotate-180" />
            </summary>
            <div className="border-t border-line divide-y divide-line">
              {rows.map((row) => (
                <MobileRow key={row.id} row={row} cell={row.cell(active)} />
              ))}
            </div>
          </details>
        );
      })}

      {/* Free preview questions */}
      <details open className="bg-white border border-line rounded-2xl shadow-sm overflow-hidden group">
        <summary className="flex items-start gap-2.5 px-4 py-3.5 list-none [&::-webkit-details-marker]:hidden">
          <FileText className="w-4 h-4 text-brand-ink shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-extrabold text-heading leading-tight">Free preview questions</h3>
            <p className="text-xs text-[--text-muted] leading-snug mt-0.5">
              Real titles from this vault. Locked content is never included.
            </p>
          </div>
          <ChevronDown className="w-4 h-4 text-[--text-muted] shrink-0 mt-0.5 transition-transform group-open:rotate-180" />
        </summary>
        <div className="border-t border-line px-4 py-3.5">
          {previewQuestionsRow(active).value}
        </div>
      </details>
    </div>
  );
};

const Stat: React.FC<{ label: string; value: number; accent?: boolean }> = ({ label, value, accent }) => (
  <div className="rounded-xl bg-app-warm border border-line px-2.5 py-2 text-center">
    <div className={`text-base font-extrabold leading-none ${accent ? 'text-emerald-700' : 'text-heading'}`}>
      {value}
    </div>
    <div className="text-xs uppercase tracking-wide text-[--text-muted] mt-1">{label}</div>
  </div>
);

/** One label/value line. The value and its provenance note come from the shared row spec. */
const MobileRow: React.FC<{ row: RowDef; cell: Cell }> = ({ row, cell }) => (
  <div className="px-4 py-3">
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-xs font-bold text-heading leading-snug">{row.label}</span>
      {cell.badge && (
        <span
          className={`shrink-0 px-1.5 py-0.5 rounded text-xs font-bold uppercase tracking-wide ${
            cell.state === 'verified'
              ? 'bg-signal-soft text-signal-hover border border-signal/30'
              : 'bg-amber-50 text-amber-800 border border-amber-200'
          }`}
        >
          {cell.badge}
        </span>
      )}
    </div>
    <div className="text-sm leading-snug mt-1.5 break-words">{cell.value}</div>
    {cell.note && <p className="text-xs text-[--text-muted] leading-snug mt-1">{cell.note}</p>}
    {row.hint && (
      <p className="text-xs text-[--text-muted] leading-snug mt-1 italic md:hidden">{row.hint}</p>
    )}
  </div>
);
