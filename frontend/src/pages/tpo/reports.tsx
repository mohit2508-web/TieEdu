import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { Download, Lock, RotateCw } from 'lucide-react';
import { RequirePlacement } from '@/components/placement/RequirePlacement';
import { TpoShell } from '@/components/tpo/TpoShell';
import { usePlacement } from '@/context/PlacementContext';
import { Button, Card, EmptyState, Skeleton } from '@/components/ui';
import { downloadCollegeReport, getCollegeReport, type ReportQuery } from '@/lib/placementApi';

/**
 * Management / NAAC report (E2). Aggregate figures for a period and batch,
 * previewed here and downloaded as a PDF. No student names or rows, and
 * branches under five students are combined (backend lib/collegeReport).
 */

const SEG_LABEL: Record<string, string> = { not_started: 'Not started', at_risk: 'At risk', in_progress: 'In progress', ready: 'Ready' };
const isoDay = (d: Date) => d.toISOString().slice(0, 10);

const ReportsBody: React.FC = () => {
  const { activeCollegeId } = usePlacement();
  const today = new Date();
  const [q, setQ] = useState<ReportQuery>({ from: isoDay(new Date(today.getTime() - 364 * 86_400_000)), to: isoDay(today), batch: '' });
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    setError(null);
    setData(null);
    getCollegeReport(q, activeCollegeId).then(setData).catch((e) => setError(e?.message || 'The report could not be prepared.'));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh on college switch; period changes use the button
  useEffect(load, [activeCollegeId]);

  const download = async () => {
    setBusy(true);
    try {
      await downloadCollegeReport(q, activeCollegeId);
    } catch (e: any) {
      setError(e?.message || 'The PDF could not be downloaded.');
    } finally {
      setBusy(false);
    }
  };

  const field = 'mt-1 min-h-[44px] w-full rounded-xl border border-line bg-card px-3 text-base text-heading';
  return (
    <div className="space-y-6">
      <Card pad="lg">
        <h2 className="font-display text-lg font-bold text-heading">Placement readiness report</h2>
        <p className="mt-1 flex items-start gap-2 text-sm text-muted">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
          For management and as supporting evidence for NAAC Criterion 5. Totals only: no student names or roll numbers, and branches with fewer than five students are combined.
        </p>
        <form onSubmit={(e) => { e.preventDefault(); load(); }} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
          <label className="block"><span className="text-sm font-semibold text-heading">From</span><input type="date" required value={q.from} max={q.to} onChange={(e) => setQ({ ...q, from: e.target.value })} className={field} /></label>
          <label className="block"><span className="text-sm font-semibold text-heading">To</span><input type="date" required value={q.to} min={q.from} onChange={(e) => setQ({ ...q, to: e.target.value })} className={field} /></label>
          <label className="block"><span className="text-sm font-semibold text-heading">Batch</span>
            <select value={q.batch} onChange={(e) => setQ({ ...q, batch: e.target.value })} className={field}>
              <option value="">All batches</option>
              {(data?.batches || []).map((b: string) => <option key={b}>{b}</option>)}
            </select>
          </label>
          <div className="flex items-end gap-2">
            <Button type="submit" kind="secondary">Update</Button>
            <Button icon={Download} onClick={download} disabled={busy || !data}>{busy ? 'Preparing…' : 'Download PDF'}</Button>
          </div>
        </form>
      </Card>

      {error && <EmptyState icon={RotateCw} title="The report could not be prepared." note={error} action={{ label: 'Try again', onClick: load }} />}
      {!data && !error && <Skeleton className="h-64 w-full" />}
      {data && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <p className="eyebrow text-muted">Students and readiness</p>
            <p className="mt-2 font-display text-3xl font-bold text-heading">{data.students}</p>
            <p className="text-sm text-muted">students on TieEdu · {data.active_in_period} practised in the period</p>
            <ul className="mt-3 grid grid-cols-2 gap-2 text-sm">
              {Object.entries(data.segments).map(([k, v]) => <li key={k} className="rounded-lg bg-surface-hover px-3 py-2"><span className="block text-muted">{SEG_LABEL[k]}</span><span className="font-bold text-heading">{String(v)}</span></li>)}
            </ul>
          </Card>
          <Card>
            <p className="eyebrow text-muted">Practice in the period</p>
            <ul className="mt-2 space-y-1 text-sm text-body">
              <li>Skill tests completed: <strong className="text-heading">{data.practice.tests}</strong></li>
              <li>Lessons completed: <strong className="text-heading">{data.practice.lessons}</strong></li>
              <li>Student practice days: <strong className="text-heading">{data.practice.practice_days}</strong></li>
              <li>Certificates earned: <strong className="text-heading">{data.practice.course_certificates + data.practice.skill_certificates}</strong></li>
            </ul>
          </Card>
          <Card className="lg:col-span-2">
            <p className="eyebrow text-muted">Placement results by year</p>
            {data.results.length === 0
              ? <p className="mt-2 text-sm text-muted">None recorded yet. Add them under Campus intel and they appear here and in the PDF.</p>
              : <ul className="mt-2 space-y-1 text-sm text-body">{data.results.map((r: any) => <li key={r.year}><strong className="text-heading">{r.year}</strong>: {r.selected} students selected across {r.companies} compan{r.companies === 1 ? 'y' : 'ies'}</li>)}</ul>}
          </Card>
        </div>
      )}
    </div>
  );
};

export default function TpoReportsPage() {
  return (
    <RequirePlacement>
      <Head>
        <title>Reports — Campus TPO Portal</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <TpoShell title="Reports">
        <div className="mx-auto max-w-[1180px] px-4 py-6">
          <ReportsBody />
        </div>
      </TpoShell>
    </RequirePlacement>
  );
}
