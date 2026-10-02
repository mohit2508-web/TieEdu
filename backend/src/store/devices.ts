/**
 * M2 — the install registry's storage layer.
 *
 * Before this, every device beacon did `loadDb()` + `saveDb()`, which rewrites
 * the entire multi-megabyte JSON document to record one row. That is the
 * specific write storm this module exists to remove.
 *
 * The contract is deliberately conservative:
 *
 *   - PostgreSQL is the primary READ path when reachable.
 *   - JSON is ALWAYS written as well (dual-write), so a cluster outage or a
 *     rollback never leaves an install unrecorded.
 *   - Every read falls back to JSON, and every write falls back to JSON.
 *
 * JSON is not being retired here. Retiring it means a cutover, and a cutover
 * needs proof that the relational path has been authoritative through real
 * traffic first. Dual-writing costs one extra upsert on a path that is already
 * throttled to once per install per 6 hours, which is cheap; losing an install
 * record is not recoverable.
 */

import { getPool, isDbReachable } from '../db/client';
import { loadDb, saveDb, Device } from '../data/db';

export type DeviceSource = 'postgres' | 'json';

const isReady: { value: boolean } = { value: false };

/**
 * Cached reachability. `isDbReachable()` opens a real connection and costs a
 * round trip, and `listDevices()` is called from admin list views. Probing once
 * per process is enough: the pool reconnects on its own, and a query that fails
 * mid-flight is caught and falls back to JSON like any other error.
 */
export async function ensureRelationalReady(): Promise<boolean> {
  if (isReady.value) return true;
  isReady.value = await isDbReachable(4000);
  return isReady.value;
}

/** Test hook — lets a suite force the JSON path without a live cluster. */
export function _resetReadyCache(): void {
  isReady.value = false;
}

const toIso = (v: unknown): string => {
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'string' && v) return v;
  return new Date().toISOString();
};

/**
 * Coerce a count column to a real number.
 *
 * This is not defensive padding, it is a required fix. The counters are declared
 * `INT`, which CockroachDB stores as `bigint`, and node-postgres returns `int8` as
 * a *string* rather than a number so that large values cannot lose precision in
 * JavaScript. Passing that straight through would make the prompt funnel corrupt
 * itself: `"3" + 1` is `"31"`, so the second install that declined the prompt
 * would report 31 declines, and the accept-rate the dashboard shows would be
 * nonsense that still looks like a plausible number.
 */
const toCount = (v: unknown): number => {
  const n = typeof v === 'string' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) ? n : 0;
};

/**
 * Map a row to the `Device` shape used everywhere else in the app.
 *
 * `first_touch` is JSONB, so the driver hands back a parsed object — but a null
 * JSONB column arrives as `null` and an absent one as `undefined`; both are
 * normalised to null so callers keep testing one thing.
 */
function rowToDevice(row: any): Device {
  return {
    id: row.id,
    user_id: row.user_id ?? null,
    platform: row.platform,
    install_surface: row.install_surface,
    app_version: row.app_version,
    install_kind: row.install_kind ?? null,
    os: row.os ?? null,
    os_version: row.os_version ?? null,
    browser: row.browser ?? null,
    user_agent: row.user_agent ?? null,
    locale: row.locale ?? null,
    timezone: row.timezone ?? null,
    screen: row.screen ?? null,
    ip_hash: row.ip_hash ?? null,
    first_seen_at: toIso(row.first_seen_at),
    last_seen_at: toIso(row.last_seen_at),
    last_active_at: toIso(row.last_active_at),
    is_blocked: row.is_blocked === true,
    pwa_prompt_shown: toCount(row.pwa_prompt_shown),
    pwa_prompt_dismissed: toCount(row.pwa_prompt_dismissed),
    pwa_prompt_accepted: toCount(row.pwa_prompt_accepted),
    first_touch: row.first_touch ?? null,
    telemetry_enabled: row.telemetry_enabled !== false,
  };
}

const UPSERT = `
  INSERT INTO devices (
    id, user_id, platform, install_surface, app_version, install_kind,
    os, os_version, browser, user_agent, locale, timezone, screen, ip_hash,
    first_seen_at, last_seen_at, last_active_at, is_blocked,
    pwa_prompt_shown, pwa_prompt_dismissed, pwa_prompt_accepted,
    first_touch, telemetry_enabled, updated_at
  ) VALUES (
    $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    platform = EXCLUDED.platform,
    install_surface = EXCLUDED.install_surface,
    app_version = EXCLUDED.app_version,
    install_kind = EXCLUDED.install_kind,
    os = EXCLUDED.os,
    os_version = EXCLUDED.os_version,
    browser = EXCLUDED.browser,
    user_agent = EXCLUDED.user_agent,
    locale = EXCLUDED.locale,
    timezone = EXCLUDED.timezone,
    screen = EXCLUDED.screen,
    ip_hash = EXCLUDED.ip_hash,
    last_seen_at = EXCLUDED.last_seen_at,
    last_active_at = EXCLUDED.last_active_at,
    is_blocked = EXCLUDED.is_blocked,
    pwa_prompt_shown = EXCLUDED.pwa_prompt_shown,
    pwa_prompt_dismissed = EXCLUDED.pwa_prompt_dismissed,
    pwa_prompt_accepted = EXCLUDED.pwa_prompt_accepted,
    first_touch = COALESCE(devices.first_touch, EXCLUDED.first_touch),
    telemetry_enabled = EXCLUDED.telemetry_enabled,
    updated_at = NOW()
`;

/**
 * Write one install to PostgreSQL.
 *
 * `first_seen_at` is absent from the DO UPDATE set: install identity and start
 * date are immutable, and a late beacon that arrived out of order must not be
 * able to move them.
 *
 * `first_touch` is `COALESCE(devices.first_touch, EXCLUDED.first_touch)` — the
 * stored value wins whenever one already exists, so attribution can be captured
 * once but never rewritten. (An earlier draft guarded this with a trailing
 * WHERE, which was wrong: that filters the entire DO UPDATE, so a conflicting
 * first_touch would silently discard every other field change on the beacon.)
 */
export async function writeDeviceToPg(d: Device): Promise<boolean> {
  try {
    await getPool().query(UPSERT, [
      d.id, d.user_id, d.platform, d.install_surface, d.app_version, d.install_kind,
      d.os, d.os_version, d.browser, d.user_agent, d.locale, d.timezone, d.screen, d.ip_hash,
      d.first_seen_at, d.last_seen_at, d.last_active_at, d.is_blocked,
      d.pwa_prompt_shown, d.pwa_prompt_dismissed, d.pwa_prompt_accepted,
      d.first_touch ? JSON.stringify(d.first_touch) : null,
      d.telemetry_enabled,
    ]);
    return true;
  } catch (e: any) {
    // Any schema drift, missing table or dead connection lands here. JSON still
    // has the row, so this degrades rather than loses.
    console.warn('[Devices] relational write failed, JSON ledger still holds it:', e?.message);
    return false;
  }
}

/**
 * Persist an install to both stores.
 *
 * Returns where the row is authoritative. JSON is written first and synchronously
 * because it is the store that has never failed; the relational write follows and
 * may be skipped.
 */
export async function saveDevice(d: Device): Promise<DeviceSource> {
  const db = loadDb();
  db.devices = db.devices || [];
  const i = db.devices.findIndex((x: Device) => x.id === d.id);
  if (i >= 0) db.devices[i] = d;
  else db.devices.push(d);
  saveDb(db);

  if (await ensureRelationalReady()) {
    if (await writeDeviceToPg(d)) return 'postgres';
  }
  return 'json';
}

/** Read a single install. PostgreSQL first, JSON as fallback. */
export async function readDevice(id: string): Promise<{ device: Device | null; source: DeviceSource } | null> {
  if (await ensureRelationalReady()) {
    try {
      const res = await getPool().query('SELECT * FROM devices WHERE id = $1', [id]);
      if (res.rows.length > 0) return { device: rowToDevice(res.rows[0]), source: 'postgres' };
      // No row in PostgreSQL. That is not proof the install does not exist: it may
      // have been recorded while the cluster was unreachable, so fall through to
      // JSON before reporting "unknown install".
    } catch (e: any) {
      console.warn('[Devices] relational read failed:', e?.message);
    }
  }
  const db = loadDb();
  const found = (db.devices || []).find((d: Device) => d.id === id);
  return found ? { device: found, source: 'json' } : null;
}

/** List installs. PostgreSQL first, JSON as fallback. */
export async function listDevices(): Promise<{ devices: Device[]; source: DeviceSource }> {
  if (await ensureRelationalReady()) {
    try {
      const res = await getPool().query('SELECT * FROM devices ORDER BY last_seen_at DESC');
      return { devices: res.rows.map(rowToDevice), source: 'postgres' };
    } catch (e: any) {
      console.warn('[Devices] relational list failed:', e?.message);
    }
  }
  return { devices: (loadDb().devices || []) as Device[], source: 'json' };
}

/**
 * Remove an install from both stores.
 *
 * Returns false only when the install existed in neither store, which is the
 * honest answer for the admin "not found" case — reporting a delete as successful
 * for an id that was never there is how a repeated cleanup click hides a real
 * bug in whichever code path was supposed to create it.
 */
export async function deleteDevice(id: string): Promise<boolean> {
  const db = loadDb();
  db.devices = db.devices || [];
  const before = db.devices.length;
  db.devices = db.devices.filter((d: Device) => d.id !== id);
  const inJson = db.devices.length !== before;
  if (inJson) saveDb(db);

  let inPg = false;
  if (await ensureRelationalReady()) {
    try {
      const res = await getPool().query('DELETE FROM devices WHERE id = $1 RETURNING id', [id]);
      inPg = res.rows.length > 0;
    } catch (e: any) {
      // The row is already gone from JSON. A stranded relational row is a far
      // smaller problem than a lost install, and the backfill will not recreate
      // it (it only copies forward), so this is logged loudly rather than hidden.
      console.warn('[Devices] relational delete failed for', id, '-', e?.message);
    }
  }

  return inJson || inPg;
}

/**
 * Copy any install that exists in JSON but not yet in PostgreSQL.
 *
 * Runs once at boot. This is what makes the switch safe: installs recorded
 * during a previous outage, or simply before this feature existed, exist only in
 * the JSON ledger, and a relational-primary read that ignored them would report
 * the install count as having silently dropped to zero.
 */
export async function backfillDevicesFromJson(): Promise<{ copied: number; skipped: number }> {
  if (!(await ensureRelationalReady())) return { copied: 0, skipped: 0 };
  const jsonDevices = (loadDb().devices || []) as Device[];
  let copied = 0;
  let skipped = 0;

  for (const d of jsonDevices) {
    try {
      const exists = await getPool().query('SELECT 1 FROM devices WHERE id = $1', [d.id]);
      if (exists.rows.length > 0) {
        skipped += 1;
        continue;
      }
      if (await writeDeviceToPg(d)) copied += 1;
    } catch {
      /* keep going: one bad row must not abort the backfill */
    }
  }

  if (copied > 0) {
    console.log(`📦 [Devices] backfilled ${copied} install(s) from the JSON ledger (${skipped} already present).`);
  }
  return { copied, skipped };
}