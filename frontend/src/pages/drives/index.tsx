import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Briefcase, CalendarClock, ChevronRight, ClipboardList } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchDrivesApi, DriveSummary } from '@/lib/drivesApi';
import { formatDate } from '@/lib/date';
import StatusPill, { driveStatusTone } from '@/components/apple/StatusPill';
import EmptyState from '@/components/apple/EmptyState';

/**
 * Student landing for company mock drives. Apple-touch: iOS grouped cards,
 * hairline separators, status pills in system colours, large-title header.
 */
export default function DrivesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [drives, setDrives] = useState<DriveSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const userId = user?.id ?? null;

  useEffect(() => {
    if (authLoading) return;
    if (!userId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchDrivesApi()
      .then((d) => { if (!cancelled) setDrives(d); })
      .catch((e: Error) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [authLoading, userId]);

  return (
    <>
      <Head>
        <title>Mock drives · TieEdu</title>
      </Head>
      <main className="mx-auto w-full max-w-3xl px-4 pb-28 pt-8 sm:px-6" style={{ background: 'var(--apple-bg)' }}>
        <header className="px-1">
          <h1 className="text-[32px] font-bold tracking-tight" style={{ color: 'var(--apple-label)' }}>Mock drives</h1>
          <p className="mt-1 text-[14px]" style={{ color: 'var(--apple-label-2)' }}>
            Company mock tests and assessments. Register, launch and see your results.
          </p>
        </header>

        {!authLoading && !user && (
          <div className="apple-card mt-8 px-6 py-10 text-center">
            <ClipboardList className="mx-auto h-8 w-8" style={{ color: 'var(--apple-label-3)' }} />
            <p className="mt-3 text-[14px] font-medium" style={{ color: 'var(--apple-label)' }}>Sign in to see upcoming mock drives.</p>
            <button
              type="button"
              onClick={() => router.push('/login?next=/drives')}
              className="mt-4 rounded-[12px] px-5 py-2.5 text-[14px] font-semibold text-white transition-transform active:scale-[0.98]"
              style={{ background: 'var(--apple-blue)' }}
            >
              Sign in
            </button>
          </div>
        )}

        {loading && user && <p className="mt-10 px-2 text-[14px]" style={{ color: 'var(--apple-label-2)' }}>Loading…</p>}

        {error && user && (
          <div className="mt-6 rounded-2xl px-4 py-3 text-[13px] font-medium" style={{ background: 'var(--apple-red-soft)', color: 'var(--apple-red)' }}>{error}</div>
        )}

        {!loading && user && drives.length === 0 && !error && (
          <div className="mt-8">
            <EmptyState title="No mock drives open right now" body="Check back when your placement cell publishes one." icon={<ClipboardList size={24} strokeWidth={1.6} />} />
          </div>
        )}

        <div className="mt-8 space-y-3">
          {drives.map((d) => (
            <Link
              key={d.drive_id}
              href={`/drives/${d.drive_id}`}
              className="apple-card apple-cell group px-4 py-4"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ background: 'var(--apple-blue-soft)', color: 'var(--apple-blue)' }}>
                <Briefcase className="h-5 w-5" strokeWidth={1.9} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-[16px] font-semibold" style={{ color: 'var(--apple-label)' }}>{d.title}</span>
                </span>
                {d.company_name ? (
                  <span className="block truncate text-[13px]" style={{ color: 'var(--apple-label-2)' }}>{d.company_name}</span>
                ) : null}
                <span className="mt-1 flex items-center gap-3 text-[12px]" style={{ color: 'var(--apple-label-2)' }}>
                  <span className="flex items-center gap-1"><CalendarClock size={12.5} />{d.ends_at ? `Ends ${formatDate(d.ends_at)}` : 'Open'}</span>
                  <span className="font-medium capitalize">{d.drive_type}</span>
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <StatusPill
                  label={
                    d.registered
                      ? d.my_registration_status === 'completed' ? 'Completed' : d.my_registration_status === 'in_progress' ? 'In progress' : 'Registered'
                      : d.window_open ? 'Open' : 'Closed'
                  }
                  tone={driveStatusTone(d.registered ? (d.my_registration_status ?? 'registered') : d.window_open ? 'open' : 'draft')}
                  dot={d.registered}
                />
                <ChevronRight className="chevron h-4 w-4" strokeWidth={2.4} />
              </span>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}