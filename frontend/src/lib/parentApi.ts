import { API_BASE_URL, apiFetch } from './api';

export interface ParentLink {
  token: string;
  created_at: string;
}

/** Mirrors backend/src/lib/parentView.ts `ParentView`. */
export interface ParentView {
  first_name: string;
  year: string | null;
  streak: { current: number; best: number };
  weeks: Array<{ from: string; to: string; lessons: number; tests: number }>;
  certificates: Array<{ title: string; issued_at: string; verify_url: string }>;
  companies: Array<{ name: string; readiness: number; cleared: number; rounds: number }>;
  next_step: string;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(`${API_BASE_URL}${path}`, init);
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error || `Request failed (${res.status})`);
  return body as T;
}

export const getParentLink = () => call<{ link: ParentLink | null }>('/me/parent-link');
export const createParentLink = () => call<{ link: ParentLink }>('/me/parent-link', { method: 'POST' });
export const deleteParentLink = () => call<{ link: null }>('/me/parent-link', { method: 'DELETE' });

/** Server-side fetch for /parent/[token]. Null when the link is not active. */
export async function fetchParentView(token: string, base: string): Promise<ParentView | null> {
  try {
    const res = await fetch(`${base}/parent/${encodeURIComponent(token)}`);
    return res.ok ? ((await res.json()) as ParentView) : null;
  } catch {
    return null;
  }
}
