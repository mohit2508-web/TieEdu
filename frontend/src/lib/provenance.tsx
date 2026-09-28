import React from 'react';
import { ShieldCheck, ShieldAlert } from 'lucide-react';
import type { MetricProvenance, ProvenanceMap } from '@/types';
import { formatDay } from '@/lib/date';

export { formatDay };

export function getProvenance(
  sources: ProvenanceMap | null | undefined,
  key: string
): MetricProvenance | null {
  const p = sources?.[key];
  return p && typeof p.source === 'string' && p.source.trim() ? p : null;
}

/**
 * Badge for one editorial metric.
 *
 * The whole point of this component: a figure an admin typed in is not the same
 * as a figure someone checked. `sourced` means an admin recorded where the
 * number came from; `unverified` means they did not, and we say so instead of
 * letting the number pass as fact.
 */
export const ProvenanceChip: React.FC<{
  sources: ProvenanceMap | null | undefined;
  metricKey: string;
  hasValue: boolean;
  className?: string;
}> = ({ sources, metricKey, hasValue, className = '' }) => {
  if (!hasValue) return null;
  const prov = getProvenance(sources, metricKey);
  const day = formatDay(prov?.verified_at);

  if (!prov) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wide bg-amber-50 text-amber-800 border border-amber-200 ${className}`}
        title="No source recorded. Treat this figure as an unconfirmed claim."
      >
        <ShieldAlert className="w-2.5 h-2.5" /> Unverified
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wide bg-sky-50 text-sky-700 border border-sky-200 ${className}`}
      title={`Source: ${prov.source}${day ? ` · checked ${day}` : ''}`}
    >
      <ShieldCheck className="w-2.5 h-2.5" /> Sourced
    </span>
  );
};

/** One-line explanation under a figure, shown when it has (or lacks) provenance. */
export const ProvenanceNote: React.FC<{
  sources: ProvenanceMap | null | undefined;
  metricKey: string;
  hasValue: boolean;
  absentText?: string;
}> = ({ sources, metricKey, hasValue, absentText }) => {
  if (!hasValue) {
    return absentText ? <p className="text-[10.5px] text-[--text-muted] leading-snug">{absentText}</p> : null;
  }
  const prov = getProvenance(sources, metricKey);
  if (!prov) {
    return (
      <p className="text-[10.5px] text-[#8A7B63] leading-snug">
        No source recorded — unconfirmed claim.
      </p>
    );
  }
  const day = formatDay(prov.verified_at);
  return (
    <p className="text-[10.5px] text-[--text-muted] leading-snug break-words">
      {prov.source}
      {day ? ` · checked ${day}` : ''}
    </p>
  );
};
