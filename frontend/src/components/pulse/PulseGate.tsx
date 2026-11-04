import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Lock, RotateCw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui';
import { PulseShell } from './PulseUi';
import { usePulseNav } from '@/lib/pulse/scope';

/**
 * Sign-in gate and loader for live Pulse pages. The server decides access; this
 * only turns its 401/403/404 into a clear screen instead of a blank one.
 */

export const usePulseLoad = <T,>(load: (() => Promise<T>) | null, deps: unknown[]) => {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<{ message: string; status?: number } | null>(null);
  const run = useCallback(async () => {
    if (!load) return;
    setError(null);
    try { setData(await load()); } catch (e: any) { setError({ message: e?.message || 'Could not load.', status: e?.status }); }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- callers pass their own deps
  }, deps);
  useEffect(() => { run(); }, [run]);
  return { data, error, reload: run, setData };
};

export const PulseGate: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
  const { user, loading } = useAuth();
  const router = useRouter();
  if (loading && !user) return <PulseShell title={title} role={null}><Skeleton className="h-64 w-full" /></PulseShell>;
  if (!user) {
    return (
      <PulseShell title={title} role={null}>
        <div className="mx-auto max-w-md rounded-band border border-line bg-card p-8 text-center">
          <Lock className="mx-auto h-8 w-8 text-muted" />
          <h2 className="mt-3 font-display text-h2 text-heading">Sign in to continue</h2>
          <p className="mt-1 text-sm text-muted">Project Pulse is invite-only. Sign in with the email your teacher or TieEdu used.</p>
          <Link href={`/login?next=${encodeURIComponent(router.asPath)}`} className="mt-5 inline-flex h-11 items-center rounded-cell bg-signal px-5 font-display text-label text-on-primary shadow-edge-primary">Sign in</Link>
        </div>
      </PulseShell>
    );
  }
  return <>{children}</>;
};

export const PulseLoadState: React.FC<{ title: string; error: { message: string; status?: number } | null; onRetry: () => void }> = ({ title, error, onRetry }) => {
  const nav = usePulseNav();
  return (
  <PulseShell title={error ? (error.status === 404 || error.status === 403 ? 'Not available' : 'Something went wrong') : title} role={null}>
    {error ? (
      <div className="mx-auto max-w-md rounded-band border border-line bg-card p-8 text-center">
        <p className="text-sm text-body">{error.status === 404 || error.status === 403 ? 'This page is not shared with your account. Pulse pages are visible only to the class’s teachers and the student themselves.' : error.message}</p>
        <div className="mt-4 flex justify-center gap-2">
          <button type="button" onClick={onRetry} className="inline-flex h-10 items-center gap-1.5 rounded-cell border border-line px-4 text-sm font-semibold text-heading"><RotateCw className="h-4 w-4" /> Try again</button>
          <Link href={nav.href('/project-pulse')} className="inline-flex h-10 items-center rounded-cell px-4 text-sm font-semibold text-link">Project Pulse home</Link>
        </div>
      </div>
    ) : (
      <div className="space-y-4" aria-busy="true"><Skeleton className="h-24 w-full" /><Skeleton className="h-72 w-full" /></div>
    )}
  </PulseShell>
  );
};
