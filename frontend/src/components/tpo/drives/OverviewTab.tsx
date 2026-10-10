import React, { useEffect, useState, useCallback } from 'react';
import { BarChart3 } from 'lucide-react';
import { DriveStats } from '@/lib/drivesApi';
import { tpoDriveStats } from '@/lib/tpoDriveApi';
import KpiCard, { KpiTone } from '@/components/apple/KpiCard';
import ScoreRing from '@/components/apple/ScoreRing';
import StatusPill from '@/components/apple/StatusPill';
import EmptyState from '@/components/apple/EmptyState';
import { GroupedCard, AppleRow } from '@/components/apple/GroupedCard';
import { Donut, StackBar, Bars } from '@/components/apple/charts';

export default function OverviewTab(props: { collegeId: string; driveId: string | null }) {
  const [stats, setStats] = useState<DriveStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setStats(null);
    if (!props.driveId) return;
    try {
      setStats(await tpoDriveStats(props.collegeId, props.driveId));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [props.collegeId, props.driveId]);

  useEffect(() => { void load(); }, [load]);

  if (!props.driveId) {
    return <EmptyState title="Select a drive" body="Choose a drive above to see live registration, attempt and result analytics." icon={<BarChart3 size={24} strokeWidth={1.6} />} />;
  }
  if (error) {
    return <EmptyState title="Could not load analytics" body={error} />;
  }
  if (!stats) {
    return <div className="apple-card px-4 py-10 text-center text-sm" style={{ color: 'var(--apple-label-2)' }}>Loading analytics…</div>;
  }

  const f = stats.funnel;
  const s = stats.score;
  const donut = [
    { value: f.completed, color: 'var(--apple-green)' },
    { value: Math.max(0, f.started - f.completed), color: 'var(--apple-blue)' },
    { value: f.absent, color: 'var(--apple-red)' },
    { value: f.disqualified, color: 'var(--apple-orange)' },
  ].filter((d) => d.value > 0);

  const colorBars: Record<number, string> = {};
  stats.score_histogram.forEach((h) => {
    colorBars[h.bucket] = h.bucket >= 60 ? 'var(--apple-green)' : h.bucket >= 40 ? 'var(--apple-blue)' : 'var(--apple-orange)';
  });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Registered" value={String(f.registered)} tone="blue" hint={`${f.attendance_pct}% started`} />
        <KpiCard label="Started" value={String(f.started)} tone="teal" hint={`${f.absent} absent`} />
        <KpiCard label="Completed" value={String(f.completed)} tone="green" hint={`${f.completion_pct}% of registered`} />
        <KpiCard label="Pass rate" value={s.pass_pct ? `${s.pass_pct}%` : '0%'} tone="purple" hint={`${s.passed} passed / ${s.attempts_completed} scored`} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <GroupedCard title="Registration funnel">
          <div className="flex items-center gap-6 px-4 py-5">
            <div className="shrink-0">
              <ScoreRing value={f.registered ? f.started / f.registered : 0} size={104} label={`${f.attendance_pct}%`} sublabel="attendance" />
            </div>
            <div className="flex-1">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
                <FunnelRow label="Completed" value={f.completed} color="var(--apple-green)" />
                <FunnelRow label="In progress" value={Math.max(0, f.started - f.completed)} color="var(--apple-blue)" />
                <FunnelRow label="Absent" value={f.absent} color="var(--apple-red)" />
                <FunnelRow label="Disqualified" value={f.disqualified} color="var(--apple-orange)" />
              </div>
              <div className="mt-3">
                <StackBar segments={donut} />
              </div>
            </div>
          </div>
          <div className="apple-divider" />
          <div className="grid gap-2 px-4 py-4 text-[13px] sm:grid-cols-3">
            <div><span className="text-[var(--apple-label-3)]">Avg score </span><span className="font-semibold tabular-nums">{s.avg_score?.toFixed(1) ?? '—'}%</span></div>
            <div><span className="text-[var(--apple-label-3)]">Best score </span><span className="font-semibold tabular-nums">{s.best_score?.toFixed(1) ?? '—'}%</span></div>
            <div><span className="text-[var(--apple-label-3)]">Attempts </span><span className="font-semibold tabular-nums">{s.attempts} ({s.attempts_completed} scored)</span></div>
          </div>
        </GroupedCard>

        <GroupedCard title="Registrations over time">
          <div className="px-4 py-5">
            <Bars data={stats.daily.map((d) => ({ label: d.day.slice(5), value: d.count }))} height={120} />
          </div>
        </GroupedCard>
      </div>

      <GroupedCard title="Status mix">
        <div className="flex items-center gap-5 px-4 py-5">
          <Donut segments={donut.length ? donut : [{ value: 1, color: 'var(--apple-surface-2)' }]} size={108} centerLabel={String(f.registered)} centerSub="total" />
          <div className="grid flex-1 grid-cols-2 gap-y-2 text-[13px]">
            <Legend color="var(--apple-green)" label={`Completed · ${f.completed}`} />
            <Legend color="var(--apple-blue)" label={`In progress · ${Math.max(0, f.started - f.completed)}`} />
            <Legend color="var(--apple-red)" label={`Absent · ${f.absent}`} />
            <Legend color="var(--apple-orange)" label={`Disqualified · ${f.disqualified}`} />
          </div>
        </div>
        <div className="apple-divider" />
        <div className="px-4 py-4">
          <Bars
            data={stats.score_histogram.map((h) => ({ label: `${h.bucket}%`, value: h.count }))}
            height={88}
          />
          <p className="mt-2 text-center text-[11px] text-[var(--apple-label-3)]">Score histogram — % buckets of completed attempts</p>
        </div>
      </GroupedCard>

      <GroupedCard title="Round breakdown">
        {stats.rounds.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-[var(--apple-label-2)]">Attach rounds to this drive to see per-round progress.</div>
        ) : (
          stats.rounds.map((r) => (
            <AppleRow
              key={r.test_id}
              title={r.name}
              sub={`${r.completed}/${r.assigned} completed · avg ${r.avg_pct != null ? r.avg_pct + '%' : '—'}`}
              value={
                <StatusPill
                  label={`${r.assigned ? Math.round((r.completed / r.assigned) * 100) : 0}%`}
                  tone={r.assigned && r.completed === r.assigned ? 'green' : 'blue'}
                />
              }
              chevron={false}
            />
          ))
        )}
      </GroupedCard>
    </div>
  );
}

function FunnelRow(props: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[var(--apple-label-2)]">{props.label}</span>
      <span className="flex items-center gap-1.5 font-semibold tabular-nums">
        <span className="h-2 w-2 rounded-full" style={{ background: props.color }} />
        {props.value}
      </span>
    </div>
  );
}

function Legend(props: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-2 w-2 rounded-full" style={{ background: props.color }} />
      <span className="text-[var(--apple-label-2)]">{props.label}</span>
    </div>
  );
}