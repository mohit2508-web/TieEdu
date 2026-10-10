import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { AlertCircle, CheckCircle2, XCircle, Clock, FileText } from 'lucide-react';
import { DriveShell } from '@/components/drives/DriveShell';
import { Skeleton } from '@/components/ui/Skeleton';
import { fetchDriveAttemptApi } from '@/lib/drivesApi';
import type { DriveAssessment } from '@/types/drives';

const fmt = (iso: string | null) => {
  if (!iso) return null;
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata',
  });
};

export default function AttemptDetailScreen() {
  const router = useRouter();
  const attemptId = typeof router.query.attemptId === 'string' ? router.query.attemptId : '';

  const [attempt, setAttempt] = useState<DriveAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!attemptId) return;
    let alive = true;
    (async () => {
      try {
        const a = await fetchDriveAttemptApi(attemptId);
        if (alive) setAttempt(a);
      } catch (e) {
        if (alive) setError((e as Error).message || 'Could not load this attempt.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [attemptId]);

  if (loading) {
    return (
      <DriveShell title="Result">
        <div className="mx-auto w-full max-w-[720px] space-y-4 px-4 pb-8 pt-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </DriveShell>
    );
  }

  if (error || !attempt) {
    return (
      <DriveShell title="Result">
        <div className="mx-auto w-full max-w-[720px] px-4 pb-8 pt-10">
          <div className="flex items-start gap-2.5 rounded-[12px] px-4 py-3 text-[13px]" style={{ background: 'var(--apple-red-soft)', color: 'var(--apple-red)' }}>
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error || 'Attempt not found.'}</span>
          </div>
          <Link href="/mock-drive/assessments" className="mt-4 inline-block text-[14px] font-medium" style={{ color: 'var(--apple-blue)' }}>
            ← Back to assessments
          </Link>
        </div>
      </DriveShell>
    );
  }

  const passed = attempt.passed;
  const ringColor = passed == null ? 'var(--apple-label-3)' : passed ? 'var(--apple-green)' : 'var(--apple-red)';

  return (
    <DriveShell title="Result">
      <div className="mx-auto w-full max-w-[720px] px-4 pb-8 pt-4">
        {/* Score card */}
        <div className="rounded-[14px] border p-5 text-center" style={{ background: 'var(--apple-surface)', borderColor: 'var(--apple-separator)' }}>
          <div
            className="mx-auto flex h-24 w-24 items-center justify-center rounded-full"
            style={{ border: `5px solid ${ringColor}` }}
          >
            <span className="text-[24px] font-bold" style={{ color: ringColor }}>
              {attempt.percentage != null ? `${Math.round(attempt.percentage)}%` : attempt.score != null ? attempt.score : '—'}
            </span>
          </div>
          <p className="mt-3 text-[16px] font-semibold" style={{ color: 'var(--apple-label)' }}>
            {attempt.test_name || attempt.drive_title}
          </p>
          <p className="mt-0.5 text-[13px]" style={{ color: 'var(--apple-label-2)' }}>{attempt.company_name}</p>
          {passed != null && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: ringColor }}>
              {passed ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
              {passed ? 'Passed' : 'Not passed'}
            </p>
          )}
        </div>

        {/* Detail rows */}
        <div className="mt-4 rounded-[12px] border" style={{ borderColor: 'var(--apple-separator)', background: 'var(--apple-surface)' }}>
          <Row icon={<FileText size={14} />} label="Status" value={attempt.status.replace(/_/g, ' ')} />
          {attempt.max_score != null && (
            <Row icon={<FileText size={14} />} label="Score" value={`${attempt.score ?? '—'} / ${attempt.max_score}`} />
          )}
          {attempt.duration_minutes != null && (
            <Row icon={<Clock size={14} />} label="Duration" value={`${attempt.duration_minutes} min`} />
          )}
          {attempt.total_questions != null && (
            <Row icon={<FileText size={14} />} label="Questions" value={String(attempt.total_questions)} />
          )}
          {attempt.started_at && <Row icon={<Clock size={14} />} label="Started" value={fmt(attempt.started_at)} />}
          {attempt.submitted_at && <Row icon={<CheckCircle2 size={14} />} label="Submitted" value={fmt(attempt.submitted_at)} last />}
        </div>

        {/* Per-section breakdown, if the provider returned one */}
        {Array.isArray((attempt as any).sections) && (attempt as any).sections.length > 0 && (
          <div className="mt-4 rounded-[12px] border p-4" style={{ borderColor: 'var(--apple-separator)', background: 'var(--apple-surface)' }}>
            <p className="mb-2 text-[13px] font-semibold" style={{ color: 'var(--apple-label)' }}>Sections</p>
            <ul className="space-y-2">
              {(attempt as any).sections.map((s: any, i: number) => (
                <li key={i} className="flex items-center justify-between text-[13px]">
                  <span style={{ color: 'var(--apple-label-2)' }}>{s.name || s.section || `Section ${i + 1}`}</span>
                  <span className="font-medium" style={{ color: 'var(--apple-label)' }}>
                    {s.score != null && s.max_score != null ? `${s.score}/${s.max_score}` : s.percentage != null ? `${Math.round(s.percentage)}%` : '—'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <Link href="/mock-drive/assessments" className="mt-5 inline-block text-[14px] font-medium" style={{ color: 'var(--apple-blue)' }}>
          ← Back to assessments
        </Link>
      </div>
    </DriveShell>
  );
}

const Row: React.FC<{ icon: React.ReactNode; label: string; value: string | null; last?: boolean }> = ({ icon, label, value, last }) =>
  value == null ? null : (
  <div
    className="flex items-center gap-3 px-4 py-3 text-[13px]"
    style={{ borderBottom: last ? 'none' : '0.5px solid var(--apple-separator)' }}
  >
    <span style={{ color: 'var(--apple-label-3)' }}>{icon}</span>
    <span className="flex-1" style={{ color: 'var(--apple-label-2)' }}>{label}</span>
    <span className="font-medium capitalize" style={{ color: 'var(--apple-label)' }}>{value}</span>
  </div>
);
