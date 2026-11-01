import { useEffect } from 'react';
import { API_BASE_URL, apiFetch } from './api';
import { hasConsent } from './consent';
import { useAuth } from '@/context/AuthContext';

/**
 * Personalisation client (PROFESSIONAL_PLATFORM_PLAN §3).
 *
 * Signed-in: views are sent to the account (part of the service — it is how
 * "Recently viewed" follows you to another device). Signed-out: views stay in
 * this browser, and only if Personalisation cookies are allowed.
 */
export type InterestKind = 'course' | 'company';

export interface ForYouView {
  stage: 'foundation' | 'internship' | 'placement' | null;
  show_companies: boolean;
  recent: Array<{ kind: InterestKind; slug: string; title: string; href: string }>;
  courses: Array<{ slug: string; title: string; subtitle: string; category: string; is_free: boolean; reason: string }>;
  companies: Array<{ slug: string; name: string; logo_url: string; reason: string }>;
}

const LOCAL_KEY = 'tieedu_recent';

export interface LocalRecent { kind: InterestKind; slug: string; title: string; at: number }

export function readLocalRecent(): LocalRecent[] {
  if (typeof window === 'undefined' || !hasConsent('personalisation')) return [];
  try {
    const list = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
    return Array.isArray(list) ? list.slice(0, 8) : [];
  } catch {
    return [];
  }
}

export function clearLocalRecent() {
  try { localStorage.removeItem(LOCAL_KEY); } catch {}
}

export function trackView(kind: InterestKind, slug: string, title: string, signedIn: boolean) {
  if (!slug) return;
  if (signedIn) {
    void apiFetch(`${API_BASE_URL}/me/interest`, { method: 'POST', body: JSON.stringify({ kind, slug }) }).catch(() => {});
    return;
  }
  if (!hasConsent('personalisation')) return;
  try {
    const list = readLocalRecent().filter((r) => !(r.kind === kind && r.slug === slug));
    list.unshift({ kind, slug, title: String(title || slug).slice(0, 80), at: Date.now() });
    localStorage.setItem(LOCAL_KEY, JSON.stringify(list.slice(0, 8)));
  } catch {
    // Storage blocked: nothing to remember.
  }
}

/**
 * Record one view of this page once both the page and the sign-in state are
 * known. Waiting for auth matters: on a full page load the session is restored
 * a moment after first render, and recording before that would file a
 * signed-in student's view as an anonymous one.
 */
export function useTrackView(kind: InterestKind, slug: string | null | undefined, title: string | null | undefined, ready = true) {
  const { user, loading } = useAuth();
  const signedIn = !!user;
  useEffect(() => {
    if (!ready || !slug || loading) return;
    trackView(kind, slug, title || slug, signedIn);
  }, [kind, slug, title, ready, loading, signedIn]);
}

export async function fetchForYou(): Promise<ForYouView> {
  const res = await apiFetch(`${API_BASE_URL}/me/for-you`);
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error || `Request failed (${res.status})`);
  return body as ForYouView;
}
