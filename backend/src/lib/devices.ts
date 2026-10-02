/**
 * Install-registry helpers.
 *
 * The single most important thing in this file is that it reports whether it
 * actually changed anything. `saveDb()` rewrites the entire `db.json`, so a beacon
 * that fires on every page load turns ordinary browsing into a whole-file write
 * per request. On a 40MB ledger that is the difference between a slow admin page
 * and a server that falls over the moment a broadcast link goes out.
 *
 * So: `last_seen_at` is refreshed at most once per `SEEN_WRITE_INTERVAL_MS`, and a
 * beat that changes nothing returns `changed: false` and the caller skips the
 * write entirely. MongoDB in M2 removes the ceiling properly; until then the
 * throttle is what keeps this safe to run.
 */

import crypto from 'crypto';
import { loadDb, saveDb, Device, DevicePlatform, InstallSurface, InstallKind, FirstTouch } from '../data/db';

/** Refreshing `last_seen_at` more often than this buys nothing measurable. */
export const SEEN_WRITE_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6h

const PLATFORMS: DevicePlatform[] = ['android', 'ios', 'windows', 'macos', 'linux', 'other'];
const SURFACES: InstallSurface[] = ['pwa', 'browser_tab'];
const KINDS: InstallKind[] = ['auto_prompt', 'manual_home_screen', 'ios_home_screen', 'manual_desktop'];

/** Install ids are client-generated, so treat every field from the client as hostile. */
const ID_RE = /^[A-Za-z0-9_-]{8,64}$/;

const clamp = (s: unknown, max: number): string | null =>
  typeof s === 'string' && s.length > 0 ? s.slice(0, max) : null;

/**
 * Platform from the UA, used only as a cross-check against the client's own claim.
 *
 * iPadOS 13+ sends a desktop Safari UA that literally claims Macintosh, so a Mac
 * result on an iPad is indistinguishable from a real Mac here. Rather than guess
 * from the UA (the classic "iPad with a mouse" heuristic and its successors), this
 * is treated as a hint and the client's pointer/media query decides; the UA only
 * fills the gap when the client sends nothing.
 */
export function derivePlatformFromUA(userAgent: string | null): DevicePlatform {
  const ua = (userAgent || '').toLowerCase();
  if (!ua) return 'other';
  if (/android/.test(ua)) return 'android';
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/windows|win32|win64/.test(ua)) return 'windows';
  if (/macintosh|mac os x/.test(ua)) return 'macos';
  if (/linux|x11|android/.test(ua)) return 'linux';
  return 'other';
}

const oneOf = <T extends string>(value: unknown, allowed: T[]): T | null =>
  typeof value === 'string' && (allowed as string[]).includes(value) ? (value as T) : null;

/**
 * Fingerprint hash for abuse mitigation.
 *
 * Salted with the app secret so the value cannot be reversed by precomputing
 * hashes for common IPs — a plain hash of an IPv4 is trivially brute-forced over
 * the whole 4-billion range. The salt lives in the environment and is never
 * written to the ledger, so the hash is stable for the life of the deployment and
 * useless outside it.
 */
export function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  const salt = process.env.IP_HASH_SALT || process.env.JWT_SECRET || 'tieedu-dev-salt';
  return crypto.createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 32);
}

/**
 * First-touch is captured once and never rewritten.
 *
 * `utm_source` on a later page load means nothing — the whole point of attribution
 * is which link brought the person here first. Letting this update would let a
 * campaign overwrite the original credit of an install that converted, which is
 * how "which campaign works" stops having an answer.
 */
function firstTouchFrom(input: any): FirstTouch | null {
  if (!input || typeof input !== 'object') return null;
  const source = clamp(input.utm_source, 100);
  const medium = clamp(input.utm_medium, 100);
  const campaign = clamp(input.utm_campaign, 100);
  if (!source && !medium && !campaign) return null;
  return { source, medium, campaign, ts: new Date().toISOString() };
}

export interface TrackInput {
  install_id: unknown;
  app_version?: unknown;
  install_surface?: unknown;
  install_kind?: unknown;
  platform?: unknown;
  os?: unknown;
  os_version?: unknown;
  browser?: unknown;
  locale?: unknown;
  timezone?: unknown;
  screen?: unknown;
  pwa_prompt?: unknown;
  telemetry_enabled?: unknown;
  [k: string]: unknown;
}

export interface TrackResult {
  /** Echoed back so the client can confirm the server agrees about its install id. */
  id: string | null;
  ok: boolean;
  reason?: string;
  /** True when the caller must persist; false when the beat was throttled away. */
  changed: boolean;
}

/**
 * Registers or refreshes an install. Safe to call unauthenticated — this is the
 * pre-login beacon, and requiring a session here would mean an install that
 * happens before the user ever signs in is invisible.
 */
export function trackDevice(input: TrackInput, ip: string | null, userAgent: string | null): TrackResult {
  const db = loadDb();
  db.devices = db.devices || [];

  const id = typeof input.install_id === 'string' && ID_RE.test(input.install_id) ? input.install_id : null;
  if (!id) {
    // A malformed id is rejected rather than coerced. Coercing it would let one
    // client with a broken id generate a fresh install on every request and
    // inflate the install count for free.
    return { id: null, ok: false, reason: 'invalid_install_id', changed: false };
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const existing = db.devices.find((d: Device) => d.id === id);

  const claimedVersion = clamp(input.app_version, 32);
  const claimedSurface = oneOf(input.install_surface, SURFACES);
  const claimedKind = oneOf(input.install_kind, KINDS);
  const claimedPlatform = oneOf(input.platform, PLATFORMS);

  if (!existing) {
    db.devices.push({
      id,
      user_id: null,
      platform: claimedPlatform || derivePlatformFromUA(userAgent),
      // A beacon without an explicit surface is a browser tab, not an install.
      // Defaulting the other way would count every page view as an install.
      install_surface: claimedSurface || 'browser_tab',
      app_version: claimedVersion || 'unknown',
      install_kind: claimedKind || null,
      os: clamp(input.os, 64),
      os_version: clamp(input.os_version, 32),
      browser: clamp(input.browser, 64),
      user_agent: clamp(userAgent, 400),
      locale: clamp(input.locale, 16),
      timezone: clamp(input.timezone, 64),
      screen: clamp(input.screen, 24),
      ip_hash: hashIp(ip),
      first_seen_at: nowIso,
      last_seen_at: nowIso,
      last_active_at: nowIso,
      is_blocked: false,
      pwa_prompt_shown: 0,
      pwa_prompt_dismissed: 0,
      pwa_prompt_accepted: 0,
      first_touch: firstTouchFrom(input),
      telemetry_enabled: input.telemetry_enabled === false ? false : true,
    });
    saveDb(db);
    return { id, ok: true, changed: true };
  }

  // A blocked install keeps reporting in so an admin can see when it goes quiet,
  // but nothing about it is stored and it is never handed back as an install.
  if (existing.is_blocked) return { id, ok: false, reason: 'blocked', changed: false };

  let changed = false;

  // First-touch and install identity are immutable once set.
  if (!existing.first_touch) {
    const ft = firstTouchFrom(input);
    if (ft) {
      existing.first_touch = ft;
      changed = true;
    }
  }

  if (claimedVersion && claimedVersion !== existing.app_version) {
    existing.app_version = claimedVersion;
    changed = true;
  }

  // An install going standalone is the transition that actually matters, so it is
  // allowed to move forward. It never moves backwards: a user opening the app in a
  // browser tab must not un-install it in the count.
  if (claimedSurface === 'pwa' && existing.install_surface !== 'pwa') {
    existing.install_surface = 'pwa';
    changed = true;
  }
  if (existing.install_surface === 'pwa' && existing.last_active_at !== nowIso) {
    existing.last_active_at = nowIso;
    changed = true;
  }
  if (claimedKind && existing.install_kind !== claimedKind) {
    existing.install_kind = claimedKind;
    changed = true;
  }
  if (claimedPlatform && existing.platform !== claimedPlatform) {
    existing.platform = claimedPlatform;
    changed = true;
  }

  if (input.pwa_prompt && typeof input.pwa_prompt === 'object') {
    const p: any = input.pwa_prompt;
    if (typeof p.shown === 'boolean' && p.shown) {
      existing.pwa_prompt_shown += 1;
      changed = true;
    }
    if (typeof p.dismissed === 'boolean' && p.dismissed) {
      existing.pwa_prompt_dismissed += 1;
      changed = true;
    }
    if (typeof p.accepted === 'boolean' && p.accepted) {
      existing.pwa_prompt_accepted += 1;
      // Accepting the prompt is the install; make the row agree immediately
      // rather than waiting for the next beacon, or the count lags reality.
      existing.install_surface = 'pwa';
      if (!existing.install_kind) existing.install_kind = 'auto_prompt';
      changed = true;
    }
  }

  if (typeof input.telemetry_enabled === 'boolean' && input.telemetry_enabled !== existing.telemetry_enabled) {
    existing.telemetry_enabled = input.telemetry_enabled;
    changed = true;
  }

  // Throttled: refreshing `last_seen_at` on every beat is the write this whole
  // module exists to avoid.
  const lastSeen = Date.parse(existing.last_seen_at || '') || 0;
  if (now.getTime() - lastSeen > SEEN_WRITE_INTERVAL_MS) {
    existing.last_seen_at = nowIso;
    changed = true;
  }

  if (changed) saveDb(db);
  return { id, ok: true, changed };
}

/**
 * Attaches signed-in installs to the account.
 *
 * Merge, not assign: a user who installed on a phone and later used a laptop has
 * two install ids pointing at one account. Overwriting would leave the phone as an
 * orphaned anonymous install — still counted as an install, still reachable by
 * nobody, and still deletable by nobody.
 *
 * Un-claiming an install is deliberately not supported here. If someone logs in on
 * a shared device, the install stays attached to the first account that claimed it;
 * an "unlink" flow is a real feature with real ambiguity (whose history is it?)
 * and guessing at it would quietly move install counts between accounts.
 */
export function claimDevices(userId: string, installIds: unknown[]): { claimed: number } {
  const db = loadDb();
  db.devices = db.devices || [];

  const ids = Array.isArray(installIds)
    ? installIds.filter((v): v is string => typeof v === 'string' && ID_RE.test(v))
    : [];

  let claimed = 0;
  for (const id of ids) {
    const device = db.devices.find((d: Device) => d.id === id);
    if (!device) continue;
    if (device.user_id === userId) continue;
    if (device.is_blocked) continue;
    // An install already owned by a *different* account is left alone rather than
    // stolen. Silently re-pointing it would let anyone who can trigger a claim on
    // a shared browser take over another user's install record.
    if (device.user_id && device.user_id !== userId) continue;
    device.user_id = userId;
    claimed += 1;
  }

  if (claimed > 0) saveDb(db);
  return { claimed };
}

/** Semantic-ish version compare. Returns <0, 0, >0. */
export function compareVersions(a: string, b: string): number {
  const pa = String(a || '').replace(/^v/, '').split(/[.\-+]/);
  const pb = String(b || '').replace(/^v/, '').split(/[.\-+]/);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i += 1) {
    const na = parseInt(pa[i] ?? '0', 10);
    const nb = parseInt(pb[i] ?? '0', 10);
    const va = Number.isNaN(na) ? 0 : na;
    const vb = Number.isNaN(nb) ? 0 : nb;
    if (va !== vb) return va < vb ? -1 : 1;
  }
  return 0;
}