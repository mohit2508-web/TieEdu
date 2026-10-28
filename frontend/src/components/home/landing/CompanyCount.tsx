import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Badge, Button, Marquee } from '@/components/ui';
import type { Company } from '@/types';
import type { PublicStats } from '@/lib/api';
import { LandingSection } from './LandingHead';

/**
 * E7 · big number and a moving row of company cards (UI_REDESIGN_PLAN_V3 §9).
 * The numbers come from /api/public/stats and the cards from the real company
 * list; the raised card is the page most recently checked. Nothing renders
 * without real companies.
 */

const CompanyMini: React.FC<{ c: Company }> = ({ c }) => (
  <Link
    href={`/company/${c.slug}`}
    className="focus-ring flex w-56 flex-none items-center gap-3 rounded-card border border-line bg-card p-3 shadow-edge-neutral hover:bg-surface-hover"
  >
    <span className="flex h-10 w-10 flex-none items-center justify-center rounded-well bg-secondary-soft font-display text-label text-secondary" aria-hidden>
      {c.name.charAt(0)}
    </span>
    <span className="min-w-0">
      <span className="block truncate font-display text-label text-heading">{c.name}</span>
      <span className="block text-caption text-muted">
        {c.rounds_pipeline?.length ? `${c.rounds_pipeline.length} rounds` : c.industry || 'Company page'}
      </span>
    </span>
  </Link>
);

export const CompanyCount: React.FC<{ companies: Company[]; stats: PublicStats | null }> = ({ companies, stats }) => {
  if (companies.length === 0) return null;
  const half = Math.ceil(companies.length / 2);
  const rowA = companies.slice(0, half);
  const rowB = companies.slice(half).length ? companies.slice(half) : rowA;
  const latest = stats?.latest_company;

  return (
    <LandingSection labelledBy="count-title" className="overflow-hidden" inner="max-w-none px-0 sm:px-0">
      <div className="mx-auto flex max-w-[1200px] flex-col items-center px-4 text-center sm:px-6">
        <p className="eyebrow mb-3">Company pages</p>
        <h2 id="count-title" className="font-display text-heading">
          <span className="block text-[clamp(56px,9vw,80px)] font-extrabold leading-none tracking-[-0.04em]">{stats?.companies ?? companies.length}</span>
          <span className="mt-2 block text-h2">companies, round by round</span>
        </h2>
        {stats && stats.rounds > 0 ? (
          <span className="mt-4 rounded-full bg-success-soft px-3 py-1 text-chip font-medium text-success">{stats.rounds} rounds mapped</span>
        ) : null}
      </div>

      <div className="relative mt-12 space-y-4">
        <Marquee label="Companies on TieEdu">
          {rowA.map((c) => (
            <CompanyMini key={c.id} c={c} />
          ))}
        </Marquee>
        <Marquee className="[&_.tk-marquee-track]:[animation-direction:reverse]">
          {rowB.map((c) => (
            <CompanyMini key={`b-${c.id}`} c={c} />
          ))}
        </Marquee>

        {latest ? (
          <Link
            href={`/company/${latest.slug}`}
            className="focus-ring absolute left-1/2 top-1/2 z-10 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-3 rounded-card border-2 border-signal bg-card px-5 py-3 shadow-pop sm:flex"
          >
            <Badge>Just updated</Badge>
            <span className="font-display text-label text-heading">{latest.name}</span>
            <span className="text-sm text-muted">{latest.rounds ? `${latest.rounds} rounds checked` : 'checked'}</span>
          </Link>
        ) : null}
      </div>

      <div className="mt-10 flex justify-center px-4">
        <Button href="/companies" kind="secondary" icon={ArrowRight} iconEnd>
          Browse companies
        </Button>
      </div>
    </LandingSection>
  );
};

export default CompanyCount;
