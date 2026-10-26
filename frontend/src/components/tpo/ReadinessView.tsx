import React, { useMemo, useState } from 'react';
import { Download, Users } from 'lucide-react';
import { Button, Chip, EmptyState } from '@/components/ui';
import type { BatchReadiness, ReadinessSegment } from '@/lib/placementApi';
import { cn } from '@/lib/cn';

/**
 * Batch readiness — students × target companies, segments and CSV export
 * (UI_REDESIGN_PLAN_V2 §7.2). Presentational: the caller fetches. The CSV is
 * built in the browser from what is on screen, so it can never contain more
 * than the viewer can already see.
 */

export const SEGMENTS: Array<{ key: ReadinessSegment; label: string; note: string; tone: string }> = [
  { key: 'not_started', label: 'Not started', note: 'No tests or lessons yet', tone: 'border-line bg-surface-hover text-heading' },
  { key: 'at_risk', label: 'At risk', note: 'Below 50%, or inactive 14+ days', tone: 'border-danger/30 bg-danger-soft text-danger' },
  { key: 'in_progress', label: 'In progress', note: 'Working, 50–69%', tone: 'border-warning/30 bg-warning-soft text-warning' },
  { key: 'ready', label: 'Ready', note: '70% or more, active', tone: 'border-success/30 bg-success-soft text-success' },
];

/** Heatmap bands; text stays ≥ 4.5:1 on every fill. */
const cellTone = (v: number | null) =>
  v === null ? 'bg-paper text-muted' : v >= 70 ? 'bg-success text-white' : v >= 50 ? 'bg-warning-soft text-warning' : 'bg-danger-soft text-danger';

const shortDate = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });

function toCsv(data: BatchReadiness, rows: BatchReadiness['students']): string {
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = ['Student', 'Roll no', 'Branch', 'Batch', 'Segment', 'Average %', ...data.companies.map((c) => `${c.name} %`), 'Tests', 'Lessons', 'Last active'];
  const body = rows.map((s) =>
    [s.label, s.roll_no, s.branch, s.batch, s.segment.replace('_', ' '), s.average, ...data.companies.map((c) => s.readiness[c.id]), s.tests, s.lessons, s.last_active]
      .map(esc)
      .join(',')
  );
  return [head.map(esc).join(','), ...body].join('\n');
}

/** The batch readiness screen, given data. Used by /tpo/analytics (live) and /colleges (sample data). */
export const ReadinessView: React.FC<{ data: BatchReadiness }> = ({ data }) => {
  const [segment, setSegment] = useState<ReadinessSegment | 'all'>('all');
  const [branch, setBranch] = useState('all');

  const branches = useMemo(() => [...new Set(data.students.map((s) => s.branch).filter(Boolean) as string[])].sort(), [data]);
  const rows = useMemo(
    () =>
      data.students
        .filter((s) => (segment === 'all' || s.segment === segment) && (branch === 'all' || s.branch === branch))
        .sort((a, b) => (a.average ?? -1) - (b.average ?? -1)),
    [data, segment, branch]
  );

  const exportCsv = () => {
    if (!data) return;
    const blob = new Blob([toCsv(data, rows)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `batch-readiness-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  if (data.students.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No students from this college have linked their profile yet."
        note="Students appear here once they fill in their college and roll number on TieEdu."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {SEGMENTS.map((s) => (
          <button
            key={s.key}
            type="button"
            aria-pressed={segment === s.key}
            onClick={() => setSegment(segment === s.key ? 'all' : s.key)}
            className={cn('focus-ring rounded-[14px] border p-4 text-left transition-shadow [&_p]:text-current', s.tone, segment === s.key && 'ring-2 ring-signal')}
          >
            <p className="text-sm font-semibold">{s.label}</p>
            <p className="mt-1 font-display text-3xl font-bold tabular-nums">{data.segments[s.key]}</p>
            <p className="text-xs">{s.note}</p>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {branches.length > 1 && (
            <>
              <Chip selected={branch === 'all'} onClick={() => setBranch('all')}>All branches</Chip>
              {branches.map((b) => (
                <Chip key={b} selected={branch === b} onClick={() => setBranch(b)}>{b}</Chip>
              ))}
            </>
          )}
          <span className="text-sm text-muted">
            {rows.length} of {data.students.length} students{segment !== 'all' && ` · ${SEGMENTS.find((s) => s.key === segment)?.label}`}
          </span>
        </div>
        <Button kind="secondary" size="sm" icon={Download} onClick={exportCsv}>
          Export CSV
        </Button>
      </div>

      <div className="overflow-x-auto rounded-[14px] border border-line bg-card">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <caption className="sr-only">Readiness by student and company, lowest average first</caption>
          <thead>
            <tr className="border-b border-line text-left">
              <th scope="col" className="sticky left-0 z-10 bg-card px-4 py-3 font-semibold text-heading">Student</th>
              <th scope="col" className="px-3 py-3 text-center font-semibold text-heading">Average</th>
              {data.companies.map((c) => (
                <th key={c.id} scope="col" className="px-3 py-3 text-center font-semibold text-heading" title={`${c.targeted_by} students preparing`}>
                  {c.name}
                </th>
              ))}
              <th scope="col" className="px-3 py-3 text-right font-semibold text-heading">Last active</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.user_id} className="border-b border-line last:border-0">
                <th scope="row" className="sticky left-0 z-10 bg-card px-4 py-2.5 text-left font-medium text-heading">
                  {s.label}
                  <span className="block text-xs font-normal text-muted">
                    {[s.branch, s.batch].filter(Boolean).join(' · ') || s.roll_no}
                  </span>
                </th>
                <td className="px-3 py-2 text-center font-display font-bold tabular-nums text-heading">{s.average ?? '—'}</td>
                {data.companies.map((c) => {
                  const v = s.readiness[c.id];
                  return (
                    <td key={c.id} className="px-1.5 py-1.5 text-center">
                      <span className={cn('inline-flex h-9 min-w-[3rem] items-center justify-center rounded-md font-semibold tabular-nums', cellTone(v))}>
                        {v === null ? '—' : v}
                      </span>
                    </td>
                  );
                })}
                <td className="px-3 py-2 text-right text-muted">
                  {s.last_active ? shortDate.format(new Date(`${s.last_active}T00:00:00Z`)) : 'Never'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted">
        Readiness is each student&apos;s skill-test score on the rounds of that company, the same number they see on their own
        screen. “—” means no test taken for that company yet. Updated {new Date(data.generated_at).toLocaleString('en-IN')}.
      </p>
    </div>
  );
};

