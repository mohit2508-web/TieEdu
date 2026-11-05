import { useSyncExternalStore } from 'react';
import { API_BASE_URL } from './assetUrl';
import { getAccessToken } from './auth';

/**
 * CLIENT MIRROR of backend/src/lib/festival.ts — Diwali Utsav 2026.
 *
 * The server decides every charged rupee; this module only lets the UI show
 * the same sale price instantly. Before the first /api/festival answer the
 * state is derived from the same fixed window, so server and client render
 * the same price; the answer then applies the admin's kill switch / early
 * start and the signed-in user's membership.
 *
 * After 10 Nov 2026 23:59:59 IST `active` is false and every helper here is
 * the identity — nothing needs removing for the site to look normal again.
 */

export const DIWALI = {
  id: 'diwali-2026',
  name: 'Diwali Sale',
  starts_at: '2026-11-05T00:00:00+05:30',
  ends_at: '2026-11-10T23:59:59+05:30',
  peak_day: '2026-11-08',
  discount_percent: 50,
  membership_days: 90,
} as const;

export interface Membership {
  tier: 'member';
  source: string;
  granted_at: string;
  expires_at: string;
}

export interface FestivalState {
  active: boolean;
  ends_at: string;
  discount_percent: number;
  membership_days: number;
  is_peak_day: boolean;
  is_last_day: boolean;
  internships_open: number;
  membership: Membership | null;
  /** True once the server has answered (membership is only known then). */
  loaded: boolean;
}

const istDay = (ms: number) => new Date(ms + 330 * 60 * 1000).toISOString().slice(0, 10);

function fromClock(now = Date.now()): FestivalState {
  const active = now >= new Date(DIWALI.starts_at).getTime() && now <= new Date(DIWALI.ends_at).getTime();
  return {
    active,
    ends_at: DIWALI.ends_at,
    discount_percent: DIWALI.discount_percent,
    membership_days: DIWALI.membership_days,
    is_peak_day: istDay(now) === DIWALI.peak_day,
    is_last_day: istDay(now) === istDay(new Date(DIWALI.ends_at).getTime()),
    internships_open: 0,
    membership: null,
    loaded: false,
  };
}

let state: FestivalState = fromClock();

// The server render has no fetched state, and a long-running Next server must
// not keep a snapshot from boot past the end of the sale: derive it from the
// clock each time, cached so useSyncExternalStore sees a stable object.
let serverCached: FestivalState | null = null;
function serverSnapshot(): FestivalState {
  const s = fromClock();
  if (serverCached && serverCached.active === s.active && serverCached.is_peak_day === s.is_peak_day && serverCached.is_last_day === s.is_last_day) {
    return serverCached;
  }
  serverCached = s;
  return s;
}
const current = (): FestivalState => (typeof (globalThis as any).window === 'undefined' ? serverSnapshot() : state);
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function set(next: FestivalState) {
  state = next;
  emit();
}

export function getFestival(): FestivalState {
  return current();
}

export function useFestival(): FestivalState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    serverSnapshot
  );
}

/** Sale price for a list price — the identity outside the sale. Same rounding as the server. */
export function salePrice(list: number, s: FestivalState = current()): number {
  const p = Math.max(0, Number(list) || 0);
  if (!s.active || p <= 0) return p;
  return Math.floor((p * (100 - s.discount_percent)) / 100);
}

/**
 * What a course costs today: the lower of the buyer's own price (list or
 * personalised path) and the sale price of the list price — checkout's rule.
 */
export function courseSalePrice(list: number, own?: number | null, s: FestivalState = current()): number {
  const base = Math.max(0, Number(own ?? list) || 0);
  return Math.min(base, salePrice(list, s));
}

function headers(): Record<string, string> {
  const t = getAccessToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

/** Fetches the live window + my membership. Safe to call repeatedly (e.g. after login). */
export async function loadFestival(): Promise<FestivalState> {
  try {
    const res = await fetch(`${API_BASE_URL}/festival`, { headers: headers(), credentials: 'include' });
    if (!res.ok) return state;
    const d: any = await res.json();
    if (!d.active) {
      set({ ...fromClock(), active: false, loaded: true });
    } else {
      set({
        active: true,
        ends_at: d.ends_at,
        discount_percent: d.discount_percent,
        membership_days: d.membership_days,
        is_peak_day: !!d.is_peak_day,
        is_last_day: !!d.is_last_day,
        internships_open: Number(d.internships_open) || 0,
        membership: d.membership || null,
        loaded: true,
      });
    }
  } catch {
    // Offline: keep the clock-derived state; checkout is authoritative anyway.
  }
  return state;
}

export async function claimMembership(): Promise<Membership> {
  const res = await fetch(`${API_BASE_URL}/festival/membership`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers() },
    credentials: 'include',
  });
  const d: any = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.error || 'Could not claim membership');
  set({ ...state, membership: d.membership });
  return d.membership;
}

/** Pages where nothing festive moves or pops up: tests, exams, checkout-like and admin flows. */
const QUIET_PREFIXES = [
  '/skill-test/', '/mock-drive', '/mock-interview', '/drive-day', '/peer-mock', '/prep/',
  '/admin', '/school', '/tpo', '/parent', '/verify', '/login', '/signup', '/reset-password',
  '/forgot-password', '/daily', '/english-coach', '/project-pulse', '/p/',
];

export function isQuietRoute(pathname: string): boolean {
  return QUIET_PREFIXES.some((p) => pathname === p.replace(/\/$/, '') || pathname.startsWith(p));
}

/** Remaining time split for the countdown. */
export function timeLeft(endsAt: string, now = Date.now()) {
  const ms = Math.max(0, new Date(endsAt).getTime() - now);
  return {
    ms,
    days: Math.floor(ms / 86400000),
    hours: Math.floor((ms % 86400000) / 3600000),
    minutes: Math.floor((ms % 3600000) / 60000),
    seconds: Math.floor((ms % 60000) / 1000),
  };
}

export const prefersReducedMotion = (): boolean => {
  const w = (globalThis as any).window;
  return !!w?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
};
