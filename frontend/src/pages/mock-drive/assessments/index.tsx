import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { FileCheck2, Clock, CheckCircle2, Loader2 } from 'lucide-react';
import { DriveShell } from '@/components/drives/DriveShell';
import { Skeleton } from '@/components/ui/Skeleton';
import { fetchDriveAssessmentsApi } from '@/lib/drivesApi';
import type { DriveAssessment } from '@/types/drives';

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'completed', label: 'Completed' },
] as const;

type TabId = (typeof TABS)[number]['id'];

const pct = (a: DriveAssessment) =>
  a.percentage != null ? `${Math.round(a.percentage)}%` : a.score != null ? `${a.score}/${a.max_score ?? '—'}` : null;

const fmt = (iso: string | null) => {
  if (!iso) return null;
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata',
  });
};

export default function AssessmentsScreen() {
  const [tab, setTab] = useState<TabId>('all');
  const [rows, setRows] = useState<DriveAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (t: TabId) => {
    setLoading(true);
    setError(null);
    try {
      setRows(await fetchDriveAssessmentsApi(t));
    } catch (e) {
      setError((e as Error).message || 'Could not load assessments.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(tab); }, [tab, load]);

  return (
    <DriveShell title="Assessments">
      <div className="mx-auto w-full max-w-[720px] px-4 pb-8 pt-4">
        {/* Segmented tabs */}
        <div className="flex gap-1 rounded-[10px] p-1" style={{ background: 'var(--apple-fill)' }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className="flex-1 rounded-[8px] py-1.5 text-[13px] font-semibold transition-colors"
              style={{
                background: tab === t.id ? 'var(--apple-surface)' : 'transparent',
                color: tab === t.id ? 'var(--apple-label)' : 'var(--apple-label-2)',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-[72px] w-full" />)}
            </div>
          ) : error ? (
            <p className="rounded-[10px] px-3 py-2 text-[13px]" style={{ background: 'var(--apple-red-soft)', color: 'var(--apple-red)' }}>{error}</p>
          ) : rows.length === 0 ? (
            <div className="rounded-[12px] border px-4 py-10 text-center" style={{ borderColor: 'var(--apple-separator)', background: 'var(--apple-surface)' }}>
              <FileCheck2 size={26} className="mx-auto" style={{ color: 'var(--apple-label-3)' }} />
              <p className="mt-2 text-[14px] font-medium" style={{ color: 'var(--apple-label)' }}>No assessments yet</p>
              <p className="mt-1 text-[13px]" style={{ color: 'var(--apple-label-2)' }}>
                {tab === 'active' ? 'Nothing in progress right now.' : 'Register for a drive to start an assessment.'}
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {rows.map((a) => (
                <li key={a.attempt_id}>
                  <Link
                    href={`/mock-drive/assessments/${a.attempt_id}`}
                    className="block rounded-[12px] border p-4"
                    style={{ background: 'var(--apple-surface)', borderColor: 'var(--apple-separator)' }}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]"
                        style={{ background: 'var(--apple-blue-soft)', color: 'var(--apple-blue)' }}
                      >
                        <FileCheck2 size={18} strokeWidth={1.9} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-semibold" style={{ color: 'var(--apple-label)' }}>
                          {a.test_name || a.drive_title}
                        </p>
                        <p className="truncate text-[12px]" style={{ color: 'var(--apple-label-2)' }}>{a.company_name}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]" style={{ color: 'var(--apple-label-2)' }}>
                          {a.duration_minutes != null && <span className="inline-flex items-center gap-1"><Clock size={11} />{a.duration_minutes} min</span>}
                          {a.submitted_at && <span>{fmt(a.submitted_at)}</span>}
                          {a.started_at && !a.submitted_at && <span>Started {fmt(a.started_at)}</span>}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        {a.status === 'in_progress' ? (
                          <span className="inline-flex items-center gap-1 text-[12px] font-semibold" style={{ color: 'var(--apple-blue)' }}>
                            <Loader2 size={12} className="animate-spin" />Resume
                          </span>
                        ) : a.passed != null ? (
                          <span className="inline-flex items-center gap-1 text-[12px] font-semibold" style={{ color: a.passed ? 'var(--apple-green)' : 'var(--apple-red)' }}>
                            <CheckCircle2 size={12} />{pct(a) ?? (a.passed ? 'Pass' : 'Fail')}
                          </span>
                        ) : (
                          <span className="text-[12px]" style={{ color: 'var(--apple-label-3)' }}>{a.status}</span>
                        )}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </DriveShell>
  );
}
