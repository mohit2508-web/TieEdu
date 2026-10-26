import { API_BASE_URL, apiFetch } from './api';

/** Mirrors backend/src/lib/passport.ts `PassportView`. */
export interface PassportView {
  handle: string;
  name: string;
  year: string | null;
  xp: number;
  best_streak: number;
  skills: Array<{ name: string; slug: string; score: number; level: string | null; certificate: { number: string; verify_url: string } | null }>;
  certificates: Array<{ title: string; serial: string; issued_at: string; verify_url: string }>;
  companies: Array<{ name: string; slug: string; readiness: number; cleared: number; rounds: number }>;
  courses_completed: number;
}

export interface MyPassport {
  settings: { public: boolean; handle: string | null };
  suggestion: string;
  preview: PassportView;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(`${API_BASE_URL}${path}`, init);
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error || `Request failed (${res.status})`);
  return body as T;
}

export const fetchMyPassport = () => call<MyPassport>('/me/passport');

export const saveMyPassport = (settings: { public: boolean; handle: string }) =>
  call<MyPassport>('/me/passport', { method: 'PUT', body: JSON.stringify(settings) });

/** Public, server-side. `base` is `serverApiBase()` in getServerSideProps. Null when not public. */
export async function fetchPublicPassport(handle: string, base: string = API_BASE_URL): Promise<PassportView | null> {
  try {
    const res = await fetch(`${base}/passport/${encodeURIComponent(handle)}`);
    return res.ok ? ((await res.json()) as PassportView) : null;
  } catch {
    return null;
  }
}

/** The shareable address. Uses the current origin so it is right on every deployment. */
export const passportUrl = (handle: string) =>
  `${typeof window !== 'undefined' ? window.location.origin : ''}/p/${encodeURIComponent(handle)}`;
