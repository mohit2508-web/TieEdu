import React, { useEffect, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Download, Send } from 'lucide-react';
import { tpoAttempts, tpoDriveStats, tpoDriveFetch, tpoDownloadCsv } from '@/lib/tpoDriveApi';
import StatusPill, { driveStatusTone } from '@/components/apple/StatusPill';
import EmptyState from '@/components/apple/EmptyState';
import { GroupedCard } from '@/components/apple/GroupedCard';

const field =
  'rounded-[10px] border-0 bg-[var(--apple-fill)] px-3 py-2 text-[13px] text-[var(--apple-label)] focus:outline-none';

const RESULTS = [
  { value: '', label: 'All results' },
  { value: 'passed', label: 'Passed' },
  { value: 'failed', label: 'Failed' },
  { value: 'disqualified', label: 'Disqualified' },
  { value: 'in_progress', label: 'In progress' },
];

export default function ResultsTab(props: {
  collegeId: string;
  driveId: string | null;
  busy: boolean;
  setBusy: (b: boolean) => void;
  notice: string | null;
  setNotice: (n: string | null) => void;
  error: string | null;
  setError: (e: string | null) => void;
}) {
  const [rounds, setRounds] = useState<{ test_id: string; name: string }[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [result, setResult] = useState('');
  const [testId, setTestId] = useState('');

  const { collegeId, driveId, setError } = props;
  const load = useCallback(async () => {
    if (!driveId) { setRows([]); setTotal(0); return; }
    try {
      const [attempts, stats] = await Promise.all([
        tpoAttempts(collegeId, driveId, { test_id: testId || undefined, result: result || undefined, page, limit }),
        rounds.length ? Promise.resolve(null) : tpoDriveStats(collegeId, driveId),
      ]);
      setRows(attempts.attempts || []);
      setTotal(attempts.total ?? 0);
      if (stats) setRounds(stats.rounds.map((r) => ({ test_id: r.test_id, name: r.name })));
    } catch (e) {
      setError((e as Error).message);
      setRows([]);
      setTotal(0);
    }
  }, [collegeId, driveId, testId, result, page, limit, rounds.length, setError]);

  useEffect(() => { void load(); }, [load]);

  if (!props.driveId) {
    return <EmptyState title="Select a drive" body="Pick a drive to inspect attempt-level scores, filter by round and result, publish results and export CSV." />;
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 px-1">
        <select className={`${field} min-w-[180px]`} value={testId} onChange={(e) => { setTestId(e.target.value); setPage(1); }}>
          <option value="">All rounds</option>
          {rounds.map((t) => <option key={t.test_id} value={t.test_id}>{t.name}</option>)}
        </select>
        <select className={`${field} min-w-[160px]`} value={result} onChange={(e) => { setResult(e.target.value); setPage(1); }}>
          {RESULTS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-[10px] px-3.5 py-2 text-[13px] font-semibold text-white transition-transform active:scale-[0.98]"
          style={{ background: 'var(--apple-blue)' }}
          onClick={async () => {
            props.setBusy(true);
            try {
              const res = await tpoDriveFetch(props.collegeId, `/${props.driveId}/publish-results`, { method: 'POST' });
              if (!res.ok) { const b = await res.json().catch(() => null); throw new Error(b?.error || `publish ${res.status}`); }
              props.setNotice('Results published — students can now see their outcome.');
            } catch (e) {
              props.setError((e as Error).message);
            } finally {
              props.setBusy(false);
            }
          }}
        >
          <Send size={13} /> Publish results
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-[10px] px-3.5 py-2 text-[13px] font-semibold transition-transform active:scale-[0.98]"
          style={{ background: 'var(--apple-fill)', color: 'var(--apple-label)' }}
          onClick={() => tpoDownloadCsv(props.collegeId, props.driveId!)}
        >
          <Download size={13} /> Export CSV
        </button>
      </div>

      <GroupedCard title={`Attempts · ${total}`}>
        <div className="apple-scroll overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-[13px]">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--apple-label-3)' }}>
                <th className="px-4 pb-2 font-semibold">Round</th>
                <th className="px-4 pb-2 font-semibold">Roll no</th>
                <th className="px-4 pb-2 font-semibold">Status</th>
                <th className="px-4 pb-2 text-right font-semibold">Score</th>
                <th className="px-4 pb-2 text-right font-semibold">%</th>
                <th className="px-4 pb-2 font-semibold">Result</th>
                <th className="px-4 pb-2 text-right font-semibold">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.attempt_id} style={{ borderTop: '0.5px solid var(--apple-separator)' }}>
                  <td className="px-4 py-2.5 font-medium">{a.test_name}</td>
                  <td className="px-4 py-2.5 font-semibold tabular-nums">{a.roll_no || '—'}</td>
                  <td className="px-4 py-2.5"><StatusPill label={a.status} tone={driveStatusTone(a.status)} /></td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{a.score != null ? `${a.score}/${a.max_score}` : '—'}</td>
                  <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{a.percentage != null ? `${a.percentage}%` : '—'}</td>
                  <td className="px-4 py-2.5">
                    {a.status === 'completed' ? (
                      <StatusPill label={a.passed ? 'Passed' : 'Failed'} tone={a.passed ? 'green' : 'red'} dot />
                    ) : (
                      <StatusPill label="—" tone="neutral" />
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-[var(--apple-label-2)]">
                    {a.submitted_at ? new Date(a.submitted_at).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-[var(--apple-label-3)]">No attempts match.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-[12px] tabular-nums text-[var(--apple-label-2)]">Page {page} of {totalPages}</span>
          <div className="flex items-center gap-2">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="inline-flex h-8 w-8 items-center justify-center rounded-full disabled:opacity-30" style={{ background: 'var(--apple-fill)', color: 'var(--apple-label)' }}>
              <ChevronLeft size={14} />
            </button>
            <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="inline-flex h-8 w-8 items-center justify-center rounded-full disabled:opacity-30" style={{ background: 'var(--apple-fill)', color: 'var(--apple-label)' }}>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </GroupedCard>
    </div>
  );
}