import { getAccessToken } from '@/lib/auth';

/**
 * Crash reporting (PRACTICE_POLISH_PLAN.md §3.2): a short ref the student can quote,
 * and a fire-and-forget report to POST /api/client-errors that admins read.
 */

/** e.g. "ERR-7Q2K9X": short enough to read out to support. */
export function newErrorRef(): string {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += abc[Math.floor(Math.random() * abc.length)];
  return `ERR-${s}`;
}

export function reportClientError(err: unknown, area: string, ref = newErrorRef()): string {
  try {
    const e = err instanceof Error ? err : new Error(String(err));
    const token = getAccessToken();
    void fetch('/api/client-errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({
        ref,
        area,
        route: typeof window !== 'undefined' ? window.location.pathname : '',
        message: e.message || 'Unknown error',
        stack: (e.stack || '').split('\n').slice(0, 4).join('\n'),
      }),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // Reporting must never throw from inside an error handler.
  }
  return ref;
}

/** Support link with the error ref filled in (contact page reads ?topic and ?ref). */
export const reportHref = (ref: string) => `/contact?topic=other&ref=${encodeURIComponent(ref)}`;
