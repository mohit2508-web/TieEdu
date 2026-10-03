/**
 * M2 — the authority table's storage layer.
 *
 * The whole point of this module is a function that costs nothing:
 * `resolveAuthority` runs inside `requireAuth`, which means the staff list is
 * needed on every authenticated admin request. When it came from `loadDb()`
 * that was a 3.13MB read plus JSON.parse — measured at ~24ms per call, and
 * `requireAuth` and `requireAdmin` each take their own — to reach two rows.
 *
 * So the auth path reads a warm in-memory cache synchronously. PostgreSQL is the
 * source it is warmed from and is kept in step by dual-write; the JSON ledger
 * remains written first and always, because it is the store that has never
 * failed, and a suspension must not be lost because a cluster was unreachable.
 *
 * Invalidation is explicit on every write plus a short TTL as a safety net, so a
 * row edited directly through SQL cannot stay authorised indefinitely. Staff
 * changes are rare (there is no CRUD surface yet — rows are written at boot),
 * which is why a cache here is safe where caching the user table would not be.
 */

import { getPool, isDbReachable } from '../db/client';
import { loadDb, saveDb, Staff } from '../data/db';

let cached: Staff[] | null = null;
let cachedAt = 0;
let refreshing = false;
let generation = 0;

/**
 * 30 seconds. Long enough that a request burst costs one read rather than one
 * per request; short enough that a suspension applied out of band still takes
 * effect before an operator can reasonably be asked to wait for it.
 */
const TTL_MS = 30_000;

const isStaffRow = (s: any): s is Staff =>
  !!s && typeof s.id === 'string' && typeof s.user_id === 'string' && typeof s.role === 'string';

/**
 * The auth path. Synchronous and, when warm, does no I/O at all.
 *
 * Expiry deliberately does *not* re-read the JSON ledger here. It did, and that
 * quietly reinstated the cost this module exists to remove: once every 30 seconds
 * one unlucky admin request paid the full 3.13MB parse again, so the average
 * request was free and the tail was not.
 *
 * Instead the stale list is served and the relational read is scheduled for the
 * background. That is what makes the TTL a real safety net instead of a comment:
 * a grant edited directly through SQL is picked up by the first request after the
 * window, and the caller that happened to arrive at that moment is not the one
 * that pays for it.
 *
 * A cold cache still falls back to the JSON ledger rather than returning an empty
 * list. Returning [] on a cold cache would deny every admin for one request — the
 * failure mode of a permission cache is always worse than the slowness it avoids.
 */
export function getStaffSync(): Staff[] {
  if (cached && Date.now() - cachedAt < TTL_MS) return cached;

  if (cached) {
    scheduleRefresh();
    return cached;
  }

  const fromJson = ((loadDb().staff || []) as any[]).filter(isStaffRow);
  cached = fromJson;
  cachedAt = Date.now();
  scheduleRefresh();
  return fromJson;
}

/**
 * Re-read PostgreSQL off the request path.
 *
 * The `setTimeout` is load-bearing, not decoration. `warmStaffCache` opens with a
 * synchronous `loadDb()`, and an async function runs synchronously up to its first
 * `await` — so calling it directly from `getStaffSync` put the 3.13MB parse back on
 * the request stack, just on the first request after the window rather than on
 * every one. Deferring to the next tick is what actually makes it background work.
 *
 * `refreshing` is set synchronously for the opposite reason: every request arriving
 * inside the window must join the one read already in flight rather than each
 * starting their own.
 */
function scheduleRefresh(): void {
  if (refreshing) return;
  refreshing = true;
  const gen = generation;
  setTimeout(() => {
    void warmStaffCache(gen)
      .catch(() => undefined)
      .finally(() => {
        refreshing = false;
      });
  }, 0);
}

export function invalidateStaffCache(): void {
  cached = null;
  cachedAt = 0;
  generation += 1;
}

/**
 * Admin-facing reads. Delegates to the warm-up merge rather than trusting an
 * empty PostgreSQL result: `[]` is truthy, so caching a reachable-but-unseeded
 * table would blank the auth cache too and deny every admin for the TTL. One
 * code path decides what "the current grants are" — that is the point of it.
 */
export async function listStaff(): Promise<Staff[]> {
  await warmStaffCache();
  return cached ?? [];
}

/**
 * Read every grant from PostgreSQL, or null when it cannot be the authority.
 *
 * Null rather than an empty array: "no database" and "no staff" are different
 * answers, and handing back [] would make a reachable cluster that simply has
 * no rows look identical to an unreachable one. Callers fall back to JSON.
 */
async function readStaffFromPg(): Promise<Staff[] | null> {
  if (!(await isDbReachable(3000))) return null;
  try {
    const res = await getPool().query('SELECT * FROM staff ORDER BY created_at');
    return res.rows.map((r: any) => ({
      id: r.id,
      user_id: r.user_id,
      role: r.role,
      permissions: Array.isArray(r.permissions) ? r.permissions : [],
      status: r.status === 'suspended' ? 'suspended' : 'active',
      created_by: r.created_by ?? null,
      created_at: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
    }));
  } catch (e: any) {
    console.warn('[Staff] relational read failed:', e?.message);
    return null;
  }
}

async function writeStaffToPg(s: Staff): Promise<boolean> {
  try {
    await getPool().query(
      `INSERT INTO staff (id, user_id, role, permissions, status, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, NOW())
       ON CONFLICT (id) DO UPDATE SET
         role = EXCLUDED.role,
         permissions = EXCLUDED.permissions,
         status = EXCLUDED.status,
         updated_at = NOW()`,
      [
        s.id, s.user_id, s.role, JSON.stringify(s.permissions || []),
        s.status || 'active', s.created_by ?? null, s.created_at,
      ]
    );
    return true;
  } catch (e: any) {
    console.warn('[Staff] relational write failed, JSON ledger still holds it:', e?.message);
    return false;
  }
}

/**
 * Persist one grant to both stores and drop the cache so the next request sees it.
 *
 * `user_id` and `created_at` are excluded from the update: re-pointing a grant at
 * a different account, or backdating when it was granted, are both things a later
 * edit should not be able to do silently.
 */
export async function saveStaff(s: Staff): Promise<'postgres' | 'json'> {
  const db = loadDb();
  db.staff = db.staff || [];
  const i = db.staff.findIndex((x: Staff) => x.id === s.id);
  if (i >= 0) db.staff[i] = s;
  else db.staff.push(s);
  saveDb(db);

  let source: 'postgres' | 'json' = 'json';
  if (await isDbReachable(3000)) {
    if (await writeStaffToPg(s)) source = 'postgres';
  }

  invalidateStaffCache();
  return source;
}

/**
 * Boot warm-up: make the authority cache ready before the first request arrives.
 *
 * Without this the very first request after a restart pays a full `loadDb()`,
 * and a burst arriving during startup would each pay it separately — the exact
 * cost this module exists to remove, just moved to a worse moment.
 *
 * The merge matters more than it looks. `ensureSeedData()` writes the bootstrap
 * grant to JSON before `runMigrations()` has created this table, and an existing
 * deployment already has its grants in JSON only. Taking PostgreSQL as the sole
 * authority on the first boot would read an empty table, cache `[]`, and give
 * every admin no permissions — locking the deployment out of its own admin panel
 * the moment this shipped.
 *
 * So: a grant present in either store is honoured, PostgreSQL wins on conflict,
 * and anything JSON has but PostgreSQL lacks is copied over. That also makes a
 * partially failed backfill self-healing on the next boot rather than permanent.
 *
 * The one behaviour this cannot support is a delete that only reaches JSON: the
 * next boot would re-import it. There is no staff delete path yet (rows are
 * written at boot only), and whoever adds one must write through `saveStaff`'s
 * sibling and remove from both stores.
 *
 * `expectedGeneration` is passed by the background refresh. A write that lands
 * while the read is in flight bumps the generation, and a refresh that started
 * before it must not publish its result — otherwise the next request would serve
 * grants from before the write, silently undoing a suspension. The check is made
 * twice: once before anything is written back, so a stale read cannot overwrite
 * a newer row, and again before the cache is published.
 */
export async function warmStaffCache(expectedGeneration?: number): Promise<{ source: 'postgres' | 'json'; count: number; backfilled: number }> {
  const fromJson = ((loadDb().staff || []) as any[]).filter(isStaffRow);

  const pg = await readStaffFromPg();
  const superseded = expectedGeneration !== undefined && expectedGeneration !== generation;

  if (!pg) {
    if (!superseded) {
      cached = fromJson;
      cachedAt = Date.now();
    }
    return { source: 'json', count: fromJson.length, backfilled: 0 };
  }

  if (superseded) return { source: 'postgres', count: 0, backfilled: 0 };

  const byId = new Map<string, Staff>(pg.map((s) => [s.id, s]));
  let backfilled = 0;
  for (const s of fromJson) {
    if (byId.has(s.id)) continue; // PostgreSQL already has it and wins.
    byId.set(s.id, s);
    if (await writeStaffToPg(s)) backfilled += 1;
  }

  if (expectedGeneration !== undefined && expectedGeneration !== generation) {
    return { source: 'postgres', count: 0, backfilled };
  }

  cached = Array.from(byId.values());
  cachedAt = Date.now();
  return { source: 'postgres', count: cached.length, backfilled };
}

/** Test hook. */
export function _resetStaffCache(): void {
  invalidateStaffCache();
}

/**
 * Test hook. Ages the cache past its TTL while keeping the list in place, which
 * is what the passage of time does and `invalidateStaffCache()` does not.
 *
 * Without this there is no way to test the expiry path: the only way to reach it
 * is to wait 30 seconds, and the only shortcut available drops the cached list
 * along with the timestamp, so the request being measured finds a cold cache and
 * learns nothing about the expired-but-populated case.
 */
export function expireStaffCacheForTest(): void {
  cachedAt = 0;
}