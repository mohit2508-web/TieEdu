import React from 'react';
import Link from 'next/link';
import { ArrowUpRight, Layers, Timer, Users } from 'lucide-react';
import { BrandTile } from '@/components/common/BrandTile';
import { Stamp } from '@/components/ui';
import { industryGroup } from '@/lib/industryGroup';
import type { Company, RoundType } from '@/types';

/**
 * A company on the /companies list (design B, "rich card").
 *
 * What a student scans for, biggest first: who, what it pays, the rounds in
 * order, how long it takes and how much is written up. The stamp stays the
 * honest part: a figure nobody has fact-checked says so.
 */

const MONTH = new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' });

const checkedLabel = (iso?: string | null): string | null => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : `Checked ${MONTH.format(d)}`;
};

const ROUND_SHORT: Record<RoundType, string> = {
  OA: 'OA',
  Technical: 'Tech',
  SystemDesign: 'Design',
  HR: 'HR',
  Managerial: 'Mgr',
};

/* More than five dots stop reading as a path on a 360px card. */
const MAX_DOTS = 5;

export const CompanyListCard: React.FC<{ company: Company }> = ({ company }) => {
  const checked = checkedLabel(company.fact_checked_at);
  const modules = company.module_count ?? company.modules?.length ?? 0;
  const ctc = company.ctc_min != null && company.ctc_max != null ? `₹${company.ctc_min}–${company.ctc_max}` : null;
  const rounds = [...(company.rounds_pipeline ?? [])].sort((a, b) => a.step_number - b.step_number);
  const dots = rounds.slice(0, MAX_DOTS);

  return (
    <Link
      href={`/company/${company.slug}`}
      className="group focus-ring relative flex h-full flex-col overflow-hidden rounded-card border border-line bg-card p-5 shadow-edge-neutral transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-1 hover:border-signal/60 hover:shadow-[var(--shadow-pop)] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <div className="flex items-start gap-3">
        <BrandTile name={company.name} src={company.logo_url} className="h-14 w-14 shrink-0 rounded-2xl p-1.5" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-lg font-bold text-heading">{company.name}</h2>
          <p className="mt-0.5 truncate text-sm text-muted">{industryGroup(company.industry)}</p>
        </div>
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-muted transition-colors group-hover:border-signal group-hover:bg-signal group-hover:text-heading"
          aria-hidden
        >
          <ArrowUpRight className="h-4 w-4" />
        </span>
      </div>

      <div className="mt-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">CTC</p>
        <p className="font-display text-3xl font-bold tabular-nums leading-tight text-heading">
          {ctc ? (
            <>
              {ctc}
              <span className="ml-1 text-sm font-semibold text-muted">LPA</span>
            </>
          ) : (
            <span className="text-xl text-muted">Not shared yet</span>
          )}
        </p>
      </div>

      <div className="mt-5 min-h-[44px]">
        {dots.length > 0 ? (
          <ol className="flex items-start" aria-label={`Rounds: ${rounds.map((r) => r.title).join(', ')}`}>
            {dots.map((r, i) => (
              <li key={r.step_number} className="flex flex-1 flex-col items-start last:flex-none">
                <span className="flex w-full items-center">
                  <span className="h-3 w-3 shrink-0 rounded-full border-2 border-signal bg-signal-soft group-hover:bg-signal" aria-hidden />
                  {i < dots.length - 1 && <span className="mx-1 h-0.5 flex-1 rounded-full bg-line" aria-hidden />}
                </span>
                <span className="mt-1.5 text-xs font-medium text-body" aria-hidden>{ROUND_SHORT[r.round_type] ?? r.title}</span>
              </li>
            ))}
            {rounds.length > MAX_DOTS && (
              <li className="ml-2 self-start text-xs text-muted" aria-hidden>+{rounds.length - MAX_DOTS}</li>
            )}
          </ol>
        ) : (
          <p className="text-sm text-muted">Rounds being mapped</p>
        )}
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line pt-4 text-sm text-body">
        <span className="inline-flex items-center gap-1.5">
          <Timer className="h-4 w-4 text-muted" aria-hidden />
          {company.avg_process_days != null ? `${company.avg_process_days} days` : '—'}
          <span className="sr-only">process</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Layers className="h-4 w-4 text-muted" aria-hidden />
          {modules} module{modules === 1 ? '' : 's'}
        </span>
        {company.unlock_count > 0 && (
          <span className="inline-flex items-center gap-1.5 text-muted">
            <Users className="h-4 w-4" aria-hidden />
            {company.unlock_count}
          </span>
        )}
      </div>

      <div className="mt-3">
        {checked ? <Stamp kind="verified" flat>{checked}</Stamp> : <Stamp kind="pending" flat>Being verified</Stamp>}
      </div>
    </Link>
  );
};

export default CompanyListCard;
