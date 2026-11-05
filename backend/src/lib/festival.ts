/**
 * FESTIVAL SALE SWITCH — Diwali Utsav 2026 (DIWALI_SALE_PLAN.md).
 *
 * One window, one multiplier. Every place that charges or shows a price asks
 * this module, so the card, the cart and the gateway can never disagree, and
 * the whole sale switches itself off at `ends_at` with no deploy.
 *
 * Admin override lives in `db.settings.festival_mode`:
 *   'auto' (default) — live between starts_at and ends_at
 *   'off'            — kill switch, never live
 *   'on'             — live early (preview / soft launch), still never past ends_at
 *
 * The sale price is the real list price halved, rounded down to the rupee.
 * The list price itself is never touched, so the struck-out figure is honest.
 */

export interface Festival {
  id: string;
  name: string;
  starts_at: string;
  ends_at: string;
  /** The main day, for the "today is Diwali" special mode. */
  peak_day: string;
  discount_percent: number;
  membership_days: number;
}

export const DIWALI_2026: Festival = {
  id: 'diwali-2026',
  name: 'Diwali Sale',
  starts_at: '2026-11-05T00:00:00+05:30',
  ends_at: '2026-11-10T23:59:59+05:30',
  peak_day: '2026-11-08',
  discount_percent: 50,
  membership_days: 90,
};

export type FestivalMode = 'auto' | 'on' | 'off';

export function festivalMode(db: any): FestivalMode {
  // FESTIVAL_MODE env wins — test suites pin the sale on or off this way.
  const env = process.env.FESTIVAL_MODE;
  if (env === 'on' || env === 'off' || env === 'auto') return env;
  const m = db?.settings?.festival_mode;
  return m === 'on' || m === 'off' ? m : 'auto';
}

/** The live festival, or null. `db` may be omitted (then 'auto'). */
export function activeFestival(db?: any, nowMs = Date.now()): Festival | null {
  const f = DIWALI_2026;
  const mode = festivalMode(db);
  if (mode === 'off') return null;
  if (nowMs > new Date(f.ends_at).getTime()) return null;
  if (mode === 'on') return f;
  return nowMs >= new Date(f.starts_at).getTime() ? f : null;
}

/** Sale price for a list price while the festival is live; the list price otherwise. */
export function salePrice(list: number, fest: Festival | null): number {
  const p = Math.max(0, Number(list) || 0);
  if (!fest || p <= 0) return p;
  return Math.floor((p * (100 - fest.discount_percent)) / 100);
}

/** A price function bound to the current window — handy to pass into pure pricing code. */
export function saleFnFor(db?: any, nowMs = Date.now()): (list: number) => number {
  const fest = activeFestival(db, nowMs);
  return (list: number) => salePrice(list, fest);
}

/** "2026-11-08" in IST for a timestamp. */
export function istDay(nowMs = Date.now()): string {
  return new Date(nowMs + 330 * 60 * 1000).toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Free membership (plan §4)
// ---------------------------------------------------------------------------

export interface Membership {
  tier: 'member';
  source: string;
  granted_at: string;
  expires_at: string;
}

/** Extra free company-mock attempts a member gets on top of the default. */
export const MEMBER_EXTRA_MOCK_ATTEMPTS = 2;

export function membershipOf(user: any, nowMs = Date.now()): Membership | null {
  const m = user?.membership;
  if (!m || m.tier !== 'member') return null;
  const t = new Date(String(m.expires_at)).getTime();
  if (!Number.isFinite(t) || t < nowMs) return null;
  return m as Membership;
}

export function isMember(db: any, userId: string | null | undefined, nowMs = Date.now()): boolean {
  if (!userId) return false;
  const user = (db?.users || []).find((u: any) => u.id === userId);
  return !!membershipOf(user, nowMs);
}

export class FestivalError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/**
 * Grants the festival membership. Idempotent: a user who already holds a live
 * membership keeps it unchanged (no stacking or extending by re-claiming).
 */
export function claimMembership(db: any, userId: string, nowMs = Date.now()): Membership {
  const fest = activeFestival(db, nowMs);
  if (!fest) throw new FestivalError(410, 'The Diwali offer has ended.');
  const user = (db.users || []).find((u: any) => u.id === userId);
  if (!user) throw new FestivalError(404, 'User not found');
  const live = membershipOf(user, nowMs);
  if (live) return live;
  const m: Membership = {
    tier: 'member',
    source: fest.id,
    granted_at: new Date(nowMs).toISOString(),
    expires_at: new Date(nowMs + fest.membership_days * 24 * 3600 * 1000).toISOString(),
  };
  user.membership = m;
  return m;
}

/** Public shape for GET /api/festival. */
export function festivalPublic(db: any, userId: string | null, nowMs = Date.now()) {
  const fest = activeFestival(db, nowMs);
  if (!fest) return { active: false as const };
  const user = userId ? (db.users || []).find((u: any) => u.id === userId) : null;
  const internships = (db.internships || []).filter((i: any) => i.status === 'open').length;
  return {
    active: true as const,
    id: fest.id,
    name: fest.name,
    starts_at: fest.starts_at,
    ends_at: fest.ends_at,
    peak_day: fest.peak_day,
    is_peak_day: istDay(nowMs) === fest.peak_day,
    is_last_day: istDay(nowMs) === istDay(new Date(fest.ends_at).getTime()),
    discount_percent: fest.discount_percent,
    membership_days: fest.membership_days,
    internships_open: internships,
    membership: user ? membershipOf(user, nowMs) : null,
    server_now: new Date(nowMs).toISOString(),
  };
}
