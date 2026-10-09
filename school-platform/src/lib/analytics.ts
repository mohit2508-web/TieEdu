/**
 * Pure analytics helpers (Phase 4, spec §7).
 *
 * All aggregation maths lives here so it is unit-testable without a database
 * and usable from the service layer.
 */

export function averageProgress(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((a, b) => a + clamp(b), 0);
  return Math.round(sum / values.length);
}

export function completionRate(completed: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((Math.min(Math.max(0, completed), total) / total) * 100);
}

export type RiskLevel = 'COMPLETED' | 'ON_TRACK' | 'WATCH' | 'AT_RISK';

export interface RiskInput {
  progressPct: number;
  /** Days since the student last interacted; null = unknown/never. */
  daysSinceActive: number | null;
  completed?: boolean;
}

export interface RiskThresholds {
  watchProgress: number;
  atRiskProgress: number;
  inactiveDays: number;
}

export const DEFAULT_RISK_THRESHOLDS: RiskThresholds = {
  watchProgress: 60,
  atRiskProgress: 30,
  inactiveDays: 14,
};

export function classifyRisk(
  input: RiskInput,
  thresholds: RiskThresholds = DEFAULT_RISK_THRESHOLDS
): RiskLevel {
  if (input.completed) return 'COMPLETED';
  const idle =
    input.daysSinceActive != null && input.daysSinceActive >= thresholds.inactiveDays;
  if (input.progressPct < thresholds.atRiskProgress || (idle && input.progressPct < 100)) {
    return 'AT_RISK';
  }
  if (input.progressPct < thresholds.watchProgress || idle) return 'WATCH';
  return 'ON_TRACK';
}

export interface ProgressBucket {
  label: string;
  from: number;
  to: number;
  count: number;
}

const BUCKETS: { label: string; from: number; to: number }[] = [
  { label: '0-24', from: 0, to: 24 },
  { label: '25-49', from: 25, to: 49 },
  { label: '50-74', from: 50, to: 74 },
  { label: '75-99', from: 75, to: 99 },
  { label: '100', from: 100, to: 100 },
];

/** Bucket a list of progress percentages into a fixed distribution. */
export function progressDistribution(values: number[]): ProgressBucket[] {
  const buckets = BUCKETS.map((b) => ({ ...b, count: 0 }));
  for (const v of values) {
    const n = clamp(v);
    const bucket = buckets.find((b) => n >= b.from && n <= b.to);
    if (bucket) bucket.count++;
  }
  return buckets;
}

function clamp(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.min(100, Math.max(0, n));
}
