import React from 'react';
import Link from 'next/link';
import { ArrowRight, Layers, Timer, Users } from 'lucide-react';
import { BrandTile } from '@/components/common/BrandTile';
import { Stamp } from '@/components/ui';
import type { Company } from '@/types';

/**
 * A company on the /companies list, in the Route style.
 *
 * Replaces `CompanyCard`'s five zones (freshness pill, rating pill, tag row,
 * uppercase stat grid, footer CTA) with what a student scans a list for: who,
 * what it pays, how long it takes, how much is written up, and whether any of
 * that has been checked. The stamp is the honest part — a figure nobody has
 * fact-checked says so instead of sitting there looking authoritative.
 */

const MONTH = new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' });

const checkedLabel = (iso?: string | null): string | null => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : `Checked ${MONTH.format(d)}`;
};

export const CompanyListCard: React.FC<{ company: Company }> = ({ company }) => {
  const checked = checkedLabel(company.fact_checked_at);
  const modules = company.module_count ?? company.modules?.length ?? 0;
  const ctc = company.ctc_min != null && company.ctc_max != null ? `₹${company.ctc_min}–${company.ctc_max}` : null;

  return (
    <Link
      href={`/company/${company.slug}`}
      className="group focus-ring flex flex-col rounded-[14px] border border-line bg-card p-5 transition-colors hover:border-line-strong"
    >
      <div className="flex items-start gap-3">
        <BrandTile name={company.name} src={company.logo_url} className="h-12 w-12 shrink-0 rounded-xl p-1" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-lg font-bold text-heading transition-colors group-hover:text-signal">
            {company.name}
          </h2>
          <p className="truncate text-sm text-muted">{company.tagline || company.industry || 'Company'}</p>
        </div>
        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-4">
        <div className="min-w-0">
          <dt className="text-xs text-muted">CTC</dt>
          <dd className="font-display text-base font-bold tabular-nums text-heading">
            {ctc ? (
              <>
                {ctc}
                <span className="ml-0.5 text-xs font-semibold text-muted">LPA</span>
              </>
            ) : (
              <span className="text-muted">—</span>
            )}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="flex items-center gap-1 text-xs text-muted">
            <Timer className="h-3.5 w-3.5" aria-hidden /> Process
          </dt>
          <dd className="font-display text-base font-bold tabular-nums text-heading">
            {company.avg_process_days != null ? `${company.avg_process_days} days` : <span className="text-muted">—</span>}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="flex items-center gap-1 text-xs text-muted">
            <Layers className="h-3.5 w-3.5" aria-hidden /> Modules
          </dt>
          <dd className="font-display text-base font-bold tabular-nums text-heading">{modules}</dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        {checked ? <Stamp kind="verified" flat>{checked}</Stamp> : <Stamp kind="pending" flat>Being verified</Stamp>}
        {company.unlock_count > 0 && (
          <span className="inline-flex items-center gap-1 text-xs text-muted">
            <Users className="h-3.5 w-3.5" aria-hidden />
            {company.unlock_count} unlocked
          </span>
        )}
      </div>
    </Link>
  );
};

export default CompanyListCard;
