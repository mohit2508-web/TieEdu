import React from 'react';
import { BrandTile } from '@/components/common/BrandTile';
import type { CompareCompany, ComparisonMatrix } from '@/types';
import { CompanyActions } from './CompanyActions';
import { previewQuestionsRow, STATIC_ROWS, buildRoundRows, type RowDef } from './comparisonRows';

/**
 * Desktop (lg+) comparison matrix.
 *
 * Sticky label column + sticky company header so a 3-company × 24-row grid stays
 * readable while scrolling. Every row comes from the shared `RowDef` list, which
 * is the same list the mobile cards consume.
 */
export const CompareMatrixTable: React.FC<{
  matrix: ComparisonMatrix;
  groups: Array<{ id: string; title: string; blurb: string; icon: any }>;
  onUnlock: (c: CompareCompany, moduleIds: string[]) => void;
  onSubmitReport: (c: CompareCompany) => void;
  cartKeys: Set<string>;
}> = ({ matrix, groups, onUnlock, onSubmitReport, cartKeys }) => {
  const companies = matrix.companies;
  const roundRows = buildRoundRows(matrix);

  const rowsFor = (groupId: string): RowDef[] => {
    if (groupId === 'rounds') {
      return roundRows.length > 0
        ? roundRows
        : [{ id: 'rounds:none', label: 'Hiring rounds', cell: () => ({ value: '—', state: 'absent' as const }) }];
    }
    return STATIC_ROWS[groupId] || [];
  };

  const gridCols = { gridTemplateColumns: `200px repeat(${companies.length}, minmax(220px, 1fr))` };

  return (
    <div className="space-y-5">
      {groups.map((group) => {
        const rows = rowsFor(group.id);
        if (rows.length === 0) return null;
        const Icon = group.icon;
        return (
          <section key={group.id} className="bg-white border border-[#EDEDEB] rounded-2xl overflow-hidden shadow-sm">
            <div className="px-4 sm:px-5 py-3.5 border-b border-[#EDEDEB] bg-[#FAFAF9] flex items-start gap-2.5">
              <Icon className="w-4 h-4 text-[#1F3A5F] shrink-0 mt-0.5" />
              <div className="min-w-0">
                <h3 className="text-[13px] font-extrabold text-[#1A1A1A] leading-tight">{group.title}</h3>
                <p className="text-[11px] text-[--text-muted] leading-snug mt-0.5">{group.blurb}</p>
              </div>
            </div>

            {rows.map((row) => (
              <div key={row.id} className="border-b border-[#EDEDEB] last:border-b-0">
                <div className="grid gap-px" style={gridCols}>
                  <div className="compare-sticky-col px-4 sm:px-5 py-3.5 bg-white">
                    <div className="text-[12px] font-bold text-[#1A1A1A] leading-snug">{row.label}</div>
                    {row.hint && (
                      <p className="text-[10.5px] text-[--text-muted] leading-snug mt-1">{row.hint}</p>
                    )}
                  </div>
                  {companies.map((c) => {
                    const cell = row.cell(c);
                    return (
                      <div key={c.id} className="px-4 sm:px-5 py-3.5 bg-white min-w-0">
                        <div className="text-[13px] leading-snug break-words">{cell.value}</div>
                        {cell.badge && (
                          <span
                            className={`inline-block mt-1.5 px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wide ${
                              cell.state === 'verified'
                                ? 'bg-sky-50 text-sky-700 border border-sky-200'
                                : 'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {cell.badge}
                          </span>
                        )}
                        {cell.note && (
                          <p className="text-[10.5px] text-[--text-muted] leading-snug mt-1.5 break-words">
                            {cell.note}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>
        );
      })}

      {/* Free preview questions — real titles, free items only */}
      <section className="bg-white border border-[#EDEDEB] rounded-2xl overflow-hidden shadow-sm">
        <div className="px-4 sm:px-5 py-3.5 border-b border-[#EDEDEB] bg-[#FAFAF9]">
          <h3 className="text-[13px] font-extrabold text-[#1A1A1A] leading-tight">Free preview questions</h3>
          <p className="text-[11px] text-[--text-muted] leading-snug mt-0.5">
            Actual question titles pulled from each vault. Locked content is never included.
          </p>
        </div>
        <div className="grid gap-px" style={gridCols}>
          <div className="compare-sticky-col px-4 sm:px-5 py-3.5 bg-white">
            <div className="text-[12px] font-bold text-[#1A1A1A]">Open questions</div>
            <p className="text-[10.5px] text-[--text-muted] leading-snug mt-1">High-frequency free items first.</p>
          </div>
          {companies.map((c) => {
            const cell = previewQuestionsRow(c);
            return (
              <div key={c.id} className="px-4 sm:px-5 py-3.5 bg-white min-w-0">
                {cell.value}
                {cell.note && <p className="text-[10.5px] text-[--text-muted] leading-snug mt-1.5">{cell.note}</p>}
              </div>
            );
          })}
        </div>
      </section>

      {/* Actions */}
      <section className="bg-white border border-[#EDEDEB] rounded-2xl overflow-hidden shadow-sm">
        <div className="px-4 sm:px-5 py-3.5 border-b border-[#EDEDEB] bg-[#FAFAF9]">
          <h3 className="text-[13px] font-extrabold text-[#1A1A1A] leading-tight">Get this vault</h3>
          <p className="text-[11px] text-[--text-muted] leading-snug mt-0.5">
            Priced on the rounds you do not already own. Nothing is re-bought.
          </p>
        </div>
        <div className="grid gap-px" style={gridCols}>
          <div className="compare-sticky-col px-4 sm:px-5 py-4 bg-white">
            <div className="text-[12px] font-bold text-[#1A1A1A]">Action</div>
          </div>
          {companies.map((c) => (
            <div key={c.id} className="px-4 sm:px-5 py-4 bg-white min-w-0">
              <CompanyActions
                company={c}
                onUnlock={onUnlock}
                onSubmitReport={onSubmitReport}
                inCart={cartKeys.has(c.slug)}
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

/** Sticky company header rendered above the matrix so columns stay identifiable. */
export const CompareColumnHeader: React.FC<{ matrix: ComparisonMatrix }> = ({ matrix }) => {
  const companies = matrix.companies;
  if (companies.length === 0) return null;
  return (
    <div
      className="sticky top-0 z-20 hidden lg:grid gap-px bg-white border border-[#EDEDEB] rounded-2xl shadow-sm overflow-hidden"
      style={{ gridTemplateColumns: `200px repeat(${companies.length}, minmax(220px, 1fr))` }}
    >
      <div className="compare-sticky-col px-5 py-3.5 bg-[#FAFAF9]">
        <span className="text-[10.5px] font-mono uppercase font-bold text-[--text-muted]">Comparing</span>
      </div>
      {companies.map((c) => (
        <div key={c.id} className="px-5 py-3.5 bg-[#FAFAF9] flex items-center gap-3 min-w-0">
          <BrandTile name={c.name} src={c.logo_url} className="w-9 h-9 rounded-xl p-1 shrink-0" />
          <div className="min-w-0">
            <div className="font-bold text-[13px] text-[#1A1A1A] truncate">{c.name}</div>
            <div className="text-[10.5px] text-[--text-muted] truncate">
              {c.derived.module_count} modules · {c.derived.question_count} questions
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
