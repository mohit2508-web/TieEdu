import type { ProgressBucket, RiskLevel } from '@/lib/analytics';

export function Kpi({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-black text-slate-900">{value}</p>
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

export function DistributionBars({ buckets }: { buckets: ProgressBucket[] }) {
  const max = Math.max(1, ...buckets.map((b) => b.count));
  return (
    <div className="space-y-2">
      {buckets.map((b) => (
        <div key={b.label} className="flex items-center gap-3">
          <span className="w-14 shrink-0 text-right text-xs font-semibold text-slate-400">{b.label}%</span>
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-sky-600" style={{ width: `${(b.count / max) * 100}%` }} />
          </div>
          <span className="w-8 text-xs text-slate-500">{b.count}</span>
        </div>
      ))}
    </div>
  );
}

const RISK_STYLES: Record<RiskLevel, string> = {
  COMPLETED: 'bg-emerald-50 text-emerald-700',
  ON_TRACK: 'bg-sky-50 text-sky-700',
  WATCH: 'bg-amber-50 text-amber-700',
  AT_RISK: 'bg-red-50 text-red-700',
};

export function RiskBadge({ level, label }: { level: RiskLevel; label: string }) {
  return (
    <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${RISK_STYLES[level]}`}>{label}</span>
  );
}
