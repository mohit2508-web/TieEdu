import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Video, MapPin, CalendarClock, UserRound } from 'lucide-react';
import { DriveShell } from '@/components/drives/DriveShell';
import { Skeleton } from '@/components/ui/Skeleton';
import { fetchDriveInterviewsApi } from '@/lib/drivesApi';
import type { DriveInterview } from '@/types/drives';

const statusStyle = (s: string) => {
  switch (s) {
    case 'scheduled': return { bg: 'var(--apple-blue-soft)', fg: 'var(--apple-blue)' };
    case 'completed': return { bg: 'var(--apple-green-soft)', fg: 'var(--apple-green)' };
    case 'cancelled': return { bg: 'var(--apple-red-soft)', fg: 'var(--apple-red)' };
    case 'rescheduled': return { bg: 'var(--apple-orange-soft)', fg: 'var(--apple-orange)' };
    default: return { bg: 'var(--apple-fill)', fg: 'var(--apple-label-2)' };
  }
};

export default function InterviewsScreen() {
  const [rows, setRows] = useState<DriveInterview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const d = await fetchDriveInterviewsApi();
        if (alive) setRows(d);
      } catch (e) {
        if (alive) setError((e as Error).message || 'Could not load interviews.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <DriveShell title="Interviews">
      <div className="mx-auto w-full max-w-[720px] px-4 pb-8 pt-4">
        {loading ? (
          <div className="space-y-3">{[0, 1].map((i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
        ) : error ? (
          <p className="rounded-[10px] px-3 py-2 text-[13px]" style={{ background: 'var(--apple-red-soft)', color: 'var(--apple-red)' }}>{error}</p>
        ) : rows.length === 0 ? (
          <div className="rounded-[12px] border px-4 py-12 text-center" style={{ borderColor: 'var(--apple-separator)', background: 'var(--apple-surface)' }}>
            <Video size={24} className="mx-auto" style={{ color: 'var(--apple-label-3)' }} />
            <p className="mt-2 text-[14px] font-medium" style={{ color: 'var(--apple-label)' }}>No interviews scheduled</p>
            <p className="mt-1 text-[13px]" style={{ color: 'var(--apple-label-2)' }}>
              Interviews appear here after you clear a drive&apos;s assessment rounds.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {rows.map((iv) => {
              const st = statusStyle(iv.status);
              return (
                <li key={iv.interview_id}>
                  <Link
                    href={`/mock-drive/drives/${iv.drive_id}`}
                    className="block rounded-[14px] border p-4"
                    style={{ background: 'var(--apple-surface)', borderColor: 'var(--apple-separator)' }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-semibold" style={{ color: 'var(--apple-label)' }}>{iv.round_name}</p>
                        <p className="truncate text-[13px]" style={{ color: 'var(--apple-label-2)' }}>{iv.company_name} · {iv.drive_title}</p>
                      </div>
                      <span className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize" style={{ background: st.bg, color: st.fg }}>
                        {iv.status}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-1.5 text-[12px]" style={{ color: 'var(--apple-label-2)' }}>
                      {iv.scheduled_at_ist && (
                        <span className="inline-flex items-center gap-1.5"><CalendarClock size={12} />{iv.scheduled_at_ist} · {iv.duration_minutes} min</span>
                      )}
                      <span className="inline-flex items-center gap-1.5"><Video size={12} />{iv.mode}{iv.location ? ` · ${iv.location}` : ''}</span>
                      {iv.interviewer && (
                        <span className="inline-flex items-center gap-1.5"><UserRound size={12} />{iv.interviewer}</span>
                      )}
                    </div>
                    {iv.meeting_url && iv.status === 'scheduled' && (
                      <span className="mt-3 inline-block rounded-[10px] px-3 py-1.5 text-[12px] font-semibold text-white" style={{ background: 'var(--apple-blue)' }}>
                        Join meeting
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </DriveShell>
  );
}
