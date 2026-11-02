import type { Session } from '../data/db';

/**
 * Sign-ins per account (EMAIL_LIFECYCLE_AND_DEVICES_PLAN §4).
 *
 * A "sign-in" is one refresh-token family: every rotation of the same login
 * shares a `family`, so the 2-minute rotation grace never counts twice. A
 * student may hold at most MAX_SIGNINS at once; admins are exempt (they share
 * office machines). Pure functions — the routes do the saving.
 */
export const MAX_SIGNINS = 2;

export interface SignIn {
  /** The family id — stable for the life of the sign-in. */
  id: string;
  device_name: string;
  signed_in_at: string;
  last_active_at: string;
}

/** "Chrome on Windows", "Safari on iPhone", "TieEdu app on Android"… */
export function deviceNameFromUA(ua: unknown, standalone = false): string {
  const s = String(ua || '');
  if (!s) return 'Unknown device';
  const os =
    /iPhone/i.test(s) ? 'iPhone'
    : /iPad/i.test(s) ? 'iPad'
    : /Android/i.test(s) ? 'Android'
    : /CrOS/i.test(s) ? 'Chromebook'
    : /Windows/i.test(s) ? 'Windows'
    : /Mac OS X|Macintosh/i.test(s) ? 'Mac'
    : /Linux/i.test(s) ? 'Linux'
    : 'device';
  if (standalone) return `TieEdu app on ${os}`;
  const browser =
    /Edg\//i.test(s) ? 'Edge'
    : /OPR\/|Opera/i.test(s) ? 'Opera'
    : /SamsungBrowser/i.test(s) ? 'Samsung Internet'
    : /Firefox|FxiOS/i.test(s) ? 'Firefox'
    : /CriOS|Chrome\//i.test(s) ? 'Chrome'
    : /Safari/i.test(s) ? 'Safari'
    : 'Browser';
  return `${browser} on ${os}`;
}

const usable = (s: Session, now: number, graceMs: number) =>
  new Date(s.expires_at).getTime() >= now && (!s.rotated_at || now - Date.parse(s.rotated_at) <= graceMs);

/** This user's live sign-ins, newest activity first. */
export function activeSignIns(sessions: Session[], userId: string, now = Date.now(), graceMs = 2 * 60 * 1000): SignIn[] {
  const fams = new Map<string, Session[]>();
  for (const s of sessions || []) {
    if (s.user_id !== userId || !usable(s, now, graceMs)) continue;
    const f = s.family || s.id;
    if (!fams.has(f)) fams.set(f, []);
    fams.get(f)!.push(s);
  }
  // A family whose only live rows are inside the rotation grace has already
  // moved on to a newer row in the same family, so families stay distinct.
  return [...fams.entries()]
    .map(([id, rows]) => {
      const sorted = [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at));
      const named = sorted.slice().reverse().find((r) => r.device_name);
      return {
        id,
        device_name: named?.device_name || 'Unknown device',
        signed_in_at: (sorted[0] as any).signed_in_at || sorted[0].created_at,
        last_active_at: sorted[sorted.length - 1].created_at,
      };
    })
    .sort((a, b) => b.last_active_at.localeCompare(a.last_active_at));
}

export type LimitCheck =
  | { ok: true; signOut: string | null }
  | { ok: false; devices: SignIn[] };

/**
 * Before issuing a new sign-in: may it proceed, and does one need to go first?
 * `chosen` is the sign-in the student picked to sign out, if they were asked.
 */
export function checkSignInLimit(role: string, current: SignIn[], chosen: unknown): LimitCheck {
  if (role === 'admin' || current.length < MAX_SIGNINS) return { ok: true, signOut: null };
  const pick = typeof chosen === 'string' ? current.find((d) => d.id === chosen) : undefined;
  if (pick) return { ok: true, signOut: pick.id };
  return { ok: false, devices: current };
}
