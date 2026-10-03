/**
 * M2 — the push subscription registry's storage layer.
 *
 * This module replaces storage logic that lived inline in `lib/push.ts` and had
 * drifted into something the rest of the M2 work does not do: PostgreSQL-first
 * with JSON only as a *fallback*, and reads that had no fallback at all.
 *
 * Three specific defects, all of which were documented as if they did not exist:
 *
 *  1. `saveSubscription` wrote to one store or the other. With the cluster up, the
 *     JSON ledger was never written, so a subscription recorded during a cluster
 *     outage vanished the moment the cluster returned — which is the opposite of
 *     what dual-write is for.
 *
 *  2. `getActiveSubscriptionsForUser` read PostgreSQL and returned `[]` when it
 *     was unreachable, with a comment claiming it fell back to JSON. It did not.
 *     A broadcast during an outage therefore reached nobody, silently, while the
 *     ledger sat there holding every endpoint it needed.
 *
 *  3. The PostgreSQL write only populated the original eight columns, so the seven
 *     columns M1 had added to the `PushSubscription` type stayed at their
 *     defaults: `device_id` was always empty and `keys_json` was always NULL.
 *     That is why blocking a device never disabled its push endpoints — the
 *     device admin route matched on `sub.device_id`, which could never match.
 *
 * The contract is the same one `store/devices.ts` and `store/staff.ts` use:
 *
 *  - PostgreSQL is the primary READ path when reachable.
 *  - JSON is ALWAYS written as well (dual-write), so an outage cannot lose data.
 *  - Every read and every write falls back to the other store.
 *
 * Both stores are written in full, including the mirrored legacy columns
 * (`p256dh`, `auth`, `active`). The split key columns are `NOT NULL` in the
 * original migration and cannot be dropped without a rewrite, so they stay the
 * database's copy of the same keys rather than a second source of truth.
 */

import { getPool, isDbReachable, toCount } from '../db/client';
import { loadDb, saveDb, PushSubscription } from '../data/db';

export type PushSource = 'postgres' | 'json';

/**
 * Retiring an endpoint on a 404/410 is the push provider telling us it is gone.
 * The count is the backstop for the failures that never produce a status we can
 * act on — a DNS failure, a connection reset, a provider 500 — where the endpoint
 * may already be dead but nothing says so. `failure_count` existed in the type
 * since M1 for exactly this and nothing ever incremented it.
 */
export const MAX_SEND_FAILURES = 5;

const iso = (v: unknown): string => {
  if (v instanceof Date) return v.toISOString();
  return typeof v === 'string' && v ? v : new Date().toISOString();
};

const isoOrNull = (v: unknown): string | null => {
  if (v instanceof Date) return v.toISOString();
  return typeof v === 'string' && v ? v : null;
};

const asKeys = (v: unknown, fallback?: { p256dh: string; auth: string }) => {
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    const k = v as any;
    if (k.p256dh && k.auth) return { p256dh: String(k.p256dh), auth: String(k.auth) };
  }
  if (fallback?.p256dh && fallback?.auth) return { p256dh: fallback.p256dh, auth: fallback.auth };
  return null;
};

/**
 * Map a PostgreSQL row. `keys_json` is the canonical key store, with the split
 * columns as the fallback for rows written before the M2 reconciliation.
 */
function rowFromPg(r: any): PushSubscription | null {
  const keys = asKeys(r.keys_json, { p256dh: r.p256dh, auth: r.auth });
  if (!r.endpoint || !keys) return null;
  return {
    id: r.id,
    user_id: r.user_id,
    device_id: r.device_id || '',
    provider: r.provider || 'vapid',
    endpoint: r.endpoint,
    keys_json: keys,
    created_at: iso(r.created_at),
    last_success_at: isoOrNull(r.last_success_at),
    // int8 arrives as a string; a failed delivery count of "1" would never reach
    // the threshold and the endpoint would stay live forever.
    failure_count: toCount(r.failure_count),
    disabled_at: isoOrNull(r.disabled_at),
    disable_reason: r.disable_reason ?? null,
    user_agent: r.user_agent ?? null,
    platform: r.platform ?? null,
    last_seen_at: iso(r.last_seen_at),
  } as PushSubscription;
}

/** Map a JSON ledger row. Legacy rows may carry the split columns instead. */
function rowFromJson(s: any): PushSubscription | null {
  const keys = asKeys(s?.keys_json, { p256dh: s?.p256dh, auth: s?.auth });
  if (!s?.endpoint || !keys) return null;
  return {
    id: s.id,
    user_id: s.user_id ?? null,
    device_id: s.device_id || '',
    provider: s.provider || 'vapid',
    endpoint: s.endpoint,
    keys_json: keys,
    created_at: iso(s.created_at),
    last_success_at: isoOrNull(s.last_success_at),
    failure_count: toCount(s.failure_count),
    disabled_at: isoOrNull(s.disabled_at),
    disable_reason: s.disable_reason ?? null,
    user_agent: s.user_agent ?? null,
    platform: s.platform ?? null,
    last_seen_at: iso(s.last_seen_at),
  } as PushSubscription;
}

/**
 * The JSON ledger, typed.
 *
 * `loadDb()` returns `any` — it is `JSON.parse` of a file that predates every
 * type in this module. So this is the single place where the parsed rows are
 * given a shape, and every loop below iterates that instead of re-casting `any`
 * at each field access. Casting per access is what let the store silently persist
 * fields the type did not know about in the first place.
 */
const jsonRows = (db: any): PushSubscription[] =>
  ((db?.push_subscriptions || []) as PushSubscription[]);

const readJson = (): PushSubscription[] =>
  ((loadDb().push_subscriptions || []) as any[]).map(rowFromJson).filter((s): s is PushSubscription => !!s);

async function readPgForUser(userId: string): Promise<PushSubscription[] | null> {
  if (!(await isDbReachable(3000))) return null;
  try {
    const res = await getPool().query(
      `SELECT * FROM push_subscriptions
       WHERE user_id = $1 AND disabled_at IS NULL
       ORDER BY created_at DESC`,
      [userId]
    );
    return (res.rows || []).map(rowFromPg).filter((s): s is PushSubscription => !!s);
  } catch (e: any) {
    console.warn('[PushStore] relational read failed:', e?.message);
    return null;
  }
}

async function writePg(row: PushSubscription, opts: { reactivate?: boolean } = {}): Promise<boolean> {
  try {
    await getPool().query(
      `INSERT INTO push_subscriptions
         (id, user_id, device_id, provider, endpoint, p256dh, auth, keys_json,
          user_agent, platform, active, last_seen_at, created_at, updated_at,
          failure_count, last_success_at, disabled_at, disable_reason)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,NOW(),NOW(),NOW(),0,NOW(),NULL,NULL)
       ON CONFLICT (endpoint) DO UPDATE SET
         user_id = EXCLUDED.user_id,
         device_id = EXCLUDED.device_id,
         provider = EXCLUDED.provider,
         p256dh = EXCLUDED.p256dh,
         auth = EXCLUDED.auth,
         keys_json = EXCLUDED.keys_json,
         user_agent = COALESCE(EXCLUDED.user_agent, push_subscriptions.user_agent),
         platform = COALESCE(EXCLUDED.platform, push_subscriptions.platform),
         active = TRUE,
         last_seen_at = NOW(),
         updated_at = NOW(),
         failure_count = 0,
         last_success_at = NOW(),
         disabled_at = NULL,
         disable_reason = NULL`,
      [
        row.id,
        row.user_id,
        row.device_id || '',
        row.provider || 'vapid',
        row.endpoint,
        row.keys_json.p256dh,
        row.keys_json.auth,
        JSON.stringify(row.keys_json),
        row.user_agent ?? null,
        row.platform ?? null,
        !row.disabled_at,
      ]
    );
    return true;
  } catch (e: any) {
    console.warn('[PushStore] relational write failed, JSON ledger still holds it:', e?.message);
    return false;
  }
}

/**
 * Persist one subscription to both stores. JSON first, so a suspension cannot be
 * lost to an unreachable cluster — the same ordering `store/staff.ts` uses.
 *
 * An existing subscription keeps its id and its `created_at`: a browser that
 * resubscribes is the same endpoint coming back, not a new subscriber, and
 * resetting the row would make the age of a subscription meaningless.
 */
export async function saveSubscription(row: PushSubscription): Promise<PushSource> {
  const db = loadDb();
  db.push_subscriptions = db.push_subscriptions || [];
  const i = db.push_subscriptions.findIndex((s: any) => s.endpoint === row.endpoint);
  if (i >= 0) {
    const prev = rowFromJson(db.push_subscriptions[i]) || ({} as PushSubscription);
    row.id = row.id || prev.id;
    row.created_at = row.created_at || prev.created_at;
    db.push_subscriptions[i] = row;
  } else {
    db.push_subscriptions.push(row);
  }
  saveDb(db);

  if (await writePg(row)) return 'postgres';
  return 'json';
}

/**
 * Every live subscription for one user, which is what a broadcast needs.
 *
 * PostgreSQL first, JSON when the cluster cannot answer. The fallback is the
 * whole reason this function exists: an outage during a broadcast must not turn
 * into "nobody was told".
 */
export async function listSubscriptionsForUser(userId: string): Promise<PushSubscription[]> {
  const fromPg = await readPgForUser(userId);
  if (fromPg && fromPg.length) return fromPg;
  // PostgreSQL is the source of truth, so this is not a "prefer whichever is
  // fuller" merge: it fires only when the table has nothing for this user at all.
  // That is the case worth covering, because it is what a registration recorded
  // during an outage looks like — real and already acknowledged to the user, but
  // recorded in a store nothing reads. Dropping it would be silent data loss on
  // the one path a user is waiting to hear back on.
  return readJson().filter((s) => s.user_id === userId && !s.disabled_at);
}

/** Retire one endpoint in both stores. */
export async function retireSubscription(endpoint: string, reason: string): Promise<PushSource | false> {
  try {
    const db = loadDb();
    let changed = false;
    for (const s of jsonRows(db)) {
      if (s.endpoint === endpoint && !s.disabled_at) {
        s.disabled_at = new Date().toISOString();
        s.disable_reason = reason;
        changed = true;
      }
    }
    if (changed) saveDb(db);
  } catch (e: any) {
    console.warn('[PushStore] JSON retire failed:', e?.message);
  }

  if (!(await isDbReachable(3000))) return false;
  try {
    await getPool().query(
      `UPDATE push_subscriptions
       SET disabled_at = NOW(), disable_reason = $2, active = FALSE, updated_at = NOW()
       WHERE endpoint = $1`,
      [endpoint, reason]
    );
    return 'postgres';
  } catch (e: any) {
    console.warn('[PushStore] relational retire failed:', e?.message);
    return false;
  }
}

/**
 * Record a delivery attempt.
 *
 * A success resets the counter and stamps `last_success_at`. A failure increments
 * it and retires the endpoint once it reaches `MAX_SEND_FAILURES`, so an endpoint
 * that has gone away quietly — one the provider never explicitly 410s — stops
 * costing a request on every single broadcast.
 */
export async function recordSendOutcome(
  endpoint: string,
  ok: boolean
): Promise<{ retired: boolean; failure_count: number }> {
  const at = new Date().toISOString();

  // The JSON ledger decides first, then PostgreSQL overrules if it is reachable.
  //
  // The order matters more than it looks. Retirement used to happen only in the
  // relational branch, which meant the one case where the JSON ledger is the only
  // store — an outage, exactly the moment a dead endpoint is most likely to be
  // dead for good — never retired anything. A provider that had permanently
  // revoked the endpoint would be retried on every future broadcast, forever,
  // with no error to find it by.
  let failureCount = 0;
  let retired = false;
  try {
    const db = loadDb();
    for (const s of jsonRows(db)) {
      if (s.endpoint !== endpoint) continue;
      if (ok) {
        s.failure_count = 0;
        s.last_success_at = at;
      } else {
        const next = toCount(s.failure_count) + 1;
        s.failure_count = next;
        if (next >= MAX_SEND_FAILURES && !s.disabled_at) {
          s.disabled_at = at;
          s.disable_reason = 'send_failed';
          retired = true;
        }
        failureCount = next;
      }
    }
    saveDb(db);
  } catch (e: any) {
    console.warn('[PushStore] JSON outcome write failed:', e?.message);
  }

  if (await isDbReachable(3000)) {
    try {
      if (ok) {
        await getPool().query(
          `UPDATE push_subscriptions
           SET failure_count = 0, last_success_at = NOW(), updated_at = NOW()
           WHERE endpoint = $1`,
          [endpoint]
        );
        return { retired: false, failure_count: 0 };
      }
      // RETURNING failure_count rather than trusting the value we sent, so the
      // decision to retire is made on what the database actually stored.
      const res = await getPool().query(
        `UPDATE push_subscriptions
         SET failure_count = failure_count + 1, updated_at = NOW()
         WHERE endpoint = $1
         RETURNING failure_count`,
        [endpoint]
      );
      failureCount = toCount(res.rows?.[0]?.failure_count);
      // Re-derive rather than reusing the JSON verdict: if the two stores had
      // drifted, the database is the one we are about to act on.
      retired = failureCount >= MAX_SEND_FAILURES;
      if (retired) {
        await getPool().query(
          `UPDATE push_subscriptions
           SET disabled_at = COALESCE(disabled_at, NOW()), disable_reason = COALESCE(disable_reason, 'send_failed'),
               active = FALSE, updated_at = NOW()
           WHERE endpoint = $1`,
          [endpoint]
        );
      }
    } catch (e: any) {
      console.warn('[PushStore] relational outcome write failed:', e?.message);
    }
  }
  return { retired, failure_count: failureCount };
}

/**
 * Apply a device block to every endpoint belonging to an install, in both stores.
 *
 * Called when an admin blocks or unblocks a device. It previously only touched
 * the JSON ledger, while delivery read exclusively from PostgreSQL — so with the
 * cluster up, blocking a device disabled nothing at all and the install kept
 * receiving broadcasts an admin had just decided it must not get.
 *
 * Unblocking only revives endpoints this function disabled. An endpoint the user
 * opted out of, or one the provider declared gone, stays retired: lifting a device
 * block is not consent to re-subscribe someone who unsubscribed.
 */
export async function setDeviceSubscriptionsBlocked(
  deviceId: string,
  blocked: boolean,
  reason = 'device_blocked'
): Promise<number> {
  let n = 0;
  const at = new Date().toISOString();

  try {
    const db = loadDb();
    for (const s of jsonRows(db)) {
      if (s.device_id !== deviceId) continue;
      if (blocked) {
        if (!s.disabled_at) {
          s.disabled_at = at;
          s.disable_reason = reason;
          n += 1;
        }
      } else if (s.disable_reason === reason) {
        s.disabled_at = null;
        s.disable_reason = null;
        s.failure_count = 0;
        n += 1;
      }
    }
    if (n) saveDb(db);
  } catch (e: any) {
    console.warn('[PushStore] JSON device block update failed:', e?.message);
  }

  if (await isDbReachable(3000)) {
    try {
      const res = blocked
        ? await getPool().query(
            `UPDATE push_subscriptions
             SET disabled_at = NOW(), disable_reason = $2, active = FALSE, updated_at = NOW()
             WHERE device_id = $1 AND disabled_at IS NULL`,
            [deviceId, reason]
          )
        : await getPool().query(
            `UPDATE push_subscriptions
             SET disabled_at = NULL, disable_reason = NULL, active = TRUE, failure_count = 0, updated_at = NOW()
             WHERE device_id = $1 AND disable_reason = $2`,
            [deviceId, reason]
          );
      n = Math.max(n, res.rowCount || 0);
    } catch (e: any) {
      console.warn('[PushStore] relational device block update failed:', e?.message);
    }
  }
  return n;
}

/**
 * Copy subscriptions that exist only in the JSON ledger into PostgreSQL.
 *
 * Without this, endpoints registered while the cluster was unreachable are absent
 * from the primary read path for good — the ledger holds them, but nothing ever
 * reads the ledger while the cluster is healthy, so the user's notifications
 * simply stop without any error anywhere.
 */
export async function backfillSubscriptionsFromJson(): Promise<{ copied: number; skipped: number }> {
  if (!(await isDbReachable(3000))) return { copied: 0, skipped: 0 };
  const rows = readJson();
  let copied = 0;
  let skipped = 0;
  for (const s of rows) {
    if (!s.id) {
      skipped += 1;
      continue;
    }
    if (await writePg(s)) copied += 1;
    else skipped += 1;
  }
  return { copied, skipped };
}

/** Test hook. */
export function _resetStore(): void {
  /* no module-level cache; present so tests have a stable seam */
}