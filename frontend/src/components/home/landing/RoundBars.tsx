import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { SegmentedControl } from '@/components/ui';
import type { Company } from '@/types';
import { LandingHead, LandingSection } from './LandingHead';

/**
 * E11 · "Pick a company. See its rounds." (UI_REDESIGN_PLAN_V3 §9): a
 * segmented control over four real companies and, for the one picked, its
 * rounds as bars sized by how much material each round has. The biggest round
 * is amber. Renders nothing unless at least two companies have a round list.
 */
export const RoundBars: React.FC<{ companies: Company[] }> = ({ companies }) => {
  const picks = useMemo(() => companies.filter((c) => (c.rounds_pipeline?.length ?? 0) >= 2).slice(0, 4), [companies]);
  const [slug, setSlug] = useState<string | null>(null);
  if (picks.length < 2) return null;

  const current = picks.find((c) => c.slug === slug) ?? picks[0];
  const rounds = [...(current.rounds_pipeline ?? [])].sort((a, b) => a.step_number - b.step_number);
  const max = Math.max(1, ...rounds.map((r) => r.module_count || 0));
  const lead = rounds.reduce((best, r) => ((r.module_count || 0) > (best.module_count || 0) ? r : best), rounds[0]);

  return (
    <LandingSection labelledBy="rounds-title">
      <div className="mx-auto max-w-3xl rounded-band border border-line bg-card p-6 shadow-edge-neutral sm:p-10">
        <div className="flex justify-center">
          <SegmentedControl
            label="Company"
            value={current.slug}
            onChange={setSlug}
            options={picks.map((c) => ({ value: c.slug, label: c.name }))}
            className="max-w-full overflow-x-auto"
          />
        </div>
        <LandingHead id="rounds-title" title="Pick a company. See its rounds." className="mt-8" />

        <ol className="mt-8 space-y-4">
          {rounds.map((r) => {
            const pct = Math.round(((r.module_count || 0) / max) * 100);
            const isLead = r === lead;
            return (
              <li key={r.step_number} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 sm:grid-cols-[minmax(0,12rem)_1fr_auto]">
                <span className="truncate font-display text-label text-heading">
                  <span className="mr-2 font-mono text-caption text-muted">{String(r.step_number).padStart(2, '0')}</span>
                  {r.title}
                </span>
                <span className="h-3 overflow-hidden rounded-full bg-surface-hover" aria-hidden>
                  <span className={isLead ? 'block h-full rounded-full bg-signal' : 'block h-full rounded-full bg-line-strong/40'} style={{ width: `${Math.max(pct, 4)}%` }} />
                </span>
                <span className="font-mono text-caption tabular-nums text-muted">
                  {r.module_count || 0} {r.module_count === 1 ? 'module' : 'modules'}
                </span>
              </li>
            );
          })}
        </ol>

        <div className="mt-8 flex justify-center">
          <Link href={`/company/${current.slug}`} className="focus-ring inline-flex items-center gap-1.5 font-display text-label text-link hover:underline">
            Open the {current.name} page <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </LandingSection>
  );
};

export default RoundBars;
