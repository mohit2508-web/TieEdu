/**
 * The audit ledger's relational store.
 *
 * The ledger was JSON-only, and the cap was `db.audit.slice(-1000)` in memory.
 * That is a per-process bound, not a bound on the record: each of the several
 * processes this app runs kept its own 1000 rows, the file could hold more than
 * that between writes, and a restart started counting again from whatever was on
 * disk. Nothing ever deleted the oldest rows relationally, because there was no
 * relation to delete them from.
 *
 * So retention is enforced here, in SQL, against a single ordering — and it is
 * done on insert rather than by a periodic sweep, because a sweep cannot bound
 * anything between its runs and this ledger is the one place where "how much did
 * we drop" is a question someone will eventually need answered.
 *
 * Reads are PostgreSQL-first with the same JSON fallback the other stores use.
 * Audit is the one ledger where the fallback is not a performance nicety: if the
 * cluster is unreachable during the only moment an event is recorded, the JSON
 * copy is the entire evidence that it happened.
 */

import { loadDb } from '../data/db';
import { getPool, isDbReachable } from '../db/client';
import { AUDIT_CAP, AuditEntry, AuditRow, pushAudit } from '../lib/audit';

export type AuditSource = 'postgres' | 'json';

/**
 * Record one event.
 *
 * The relational insert happens here and now; the JSON copy is the caller's
 * existing `saveDb()`, which already follows this call at every site. That is
 * worth being precise about, because it is not the same as a symmetric dual-write:
 * a crash between the two leaves the event in PostgreSQL and not in the file.
 * That direction is the safe one — `backfillAuditFromJson` only ever adds, so the
 * entry cannot be lost, whereas the reverse would drop it from the store that now
 * answers every read.
 *
 * The in-memory append happens first and synchronously, so the ordering callers
 * already rely on is unchanged: an audit entry is in the object graph before the
 * `saveDb()` that follows it.
 *
 * Every part of the relational half is inside the try, including the reachability
 * probe. This function must not reject: it is awaited from ~30 route handlers, and
 * Express 4 does not catch a rejected handler promise, so a throw here would
 * surface as an unhandled rejection that kills the request without ever reaching
 * the error handler — after the audited action had already succeeded. Failing to
 * mirror is acceptable; failing the request is not.
 */
export async function appendAudit(db: any, entry: AuditEntry): Promise<AuditRow> {
  const row = pushAudit(db, entry);

  try {
    if (await isDbReachable(3000)) {
      await insertRow(row);
      await enforceCap();
    }
  } catch (e: any) {
    console.warn('[AuditStore] relational write failed, JSON ledger still holds it:', e?.message);
  }
  return row;
}

async function insertRow(row: AuditRow): Promise<void> {
  await getPool().query(
    `INSERT INTO audit (id, at, actor, action, detail, order_id, gateway, target, meta)
     VALUES ($1, $2::timestamptz, $3, $4, $5, $6, $7, $8, $9::jsonb)
     ON CONFLICT (id) DO NOTHING`,
    [row.id, row.at, row.actor, row.action, row.detail, row.order_id, row.gateway, row.target,
     row.meta === null || row.meta === undefined ? null : JSON.stringify(row.meta)]
  );
}

/**
 * Drop everything past the retention window.
 *
 * `at` is the ordering rather than insertion order so that a clock skew or a
 * backfilled row cannot make the newest-by-arrival entry the one that is deleted.
 * Ids are unique, so no two rows compete for the same cut-off.
 */
async function enforceCap(): Promise<void> {
  await getPool().query(
    `DELETE FROM audit
     WHERE id NOT IN (
       SELECT id FROM audit ORDER BY at DESC, id DESC LIMIT $1
     )`,
    [AUDIT_CAP]
  );
}

const fromPg = (r: any): AuditRow => ({
  id: r.id,
  // `at` comes back as a Date from node-postgres. Left alone it would serialise
  // as an ISO string with milliseconds the JSON copy does not have, so the two
  // stores would differ in a diff for no real reason.
  at: r.at instanceof Date ? r.at.toISOString() : String(r.at),
  actor: r.actor,
  action: r.action,
  detail: r.detail,
  order_id: r.order_id ?? null,
  gateway: r.gateway ?? null,
  target: r.target ?? null,
  meta: r.meta ?? null,
});

/**
 * The audit window, newest first.
 *
 * `limit` bounds the read; retention is `AUDIT_CAP`. They are separate because an
 * admin screen asking for 60 rows should not be handed a thousand.
 */
export async function listAudit(limit = 60): Promise<{ entries: AuditRow[]; source: AuditSource; total: number }> {
  if (await isDbReachable(3000)) {
    try {
      const rows = await getPool().query(
        `SELECT * FROM audit ORDER BY at DESC, id DESC LIMIT $1`,
        [limit]
      );
      // Empty is not the same as "there is nothing to report". Falling back only
      // on an error meant that any gap between the two stores — a window where an
      // event was recorded while the cluster was unreachable, or a deploy whose
      // backfill had not run yet — was answered by showing an admin an empty
      // audit trail rather than the events that actually happened. A retention
      // query that can report zero without checking is not answering the question
      // an auditor is asking.
      if (rows.rows.length) {
        const total = await getPool().query(`SELECT COUNT(*)::int AS c FROM audit`);
        return { entries: rows.rows.map(fromPg), source: 'postgres', total: toCount(total.rows[0]?.c) };
      }
    } catch (e: any) {
      console.warn('[AuditStore] relational read failed, falling back to JSON:', e?.message);
    }
  }

  const all = ((loadDb().audit || []) as AuditRow[])
    .slice()
    .sort((a, b) => String(b.at).localeCompare(String(a.at)));
  return { entries: all.slice(0, limit), source: 'json', total: all.length };
}

/**
 * Copy JSON-only rows into PostgreSQL.
 *
 * Add-only, deliberately. It is tempting to also delete relational rows the file
 * no longer has, to keep the two in step — but for this ledger that is backwards.
 * Absence in a single-file mirror is weak evidence: a fresh deploy has an empty
 * `db.json`, a failed `saveDb` leaves one behind, and neither means the events did
 * not happen. Deleting on that signal would turn a routine deploy into the loss of
 * the entire audit trail.
 *
 * Retention is `enforceCap` and nothing else. Anything newer than the window is
 * copied in; anything older than it is dropped by the cap, in SQL, against the
 * authoritative ordering.
 *
 * Runs at boot only, so it is bounded by the retention window rather than by
 * however long the process has been up.
 */
export async function backfillAuditFromJson(): Promise<{ copied: number }> {
  if (!(await isDbReachable(3000))) return { copied: 0 };

  const local = ((loadDb().audit || []) as AuditRow[]).slice();
  let copied = 0;
  try {
    for (const row of local) {
      const before = await getPool().query('SELECT 1 FROM audit WHERE id = $1', [row.id]);
      if (before.rows.length) continue;
      await insertRow(row);
      copied += 1;
    }
    await enforceCap();
  } catch (e: any) {
    console.warn('[AuditStore] backfill failed:', e?.message);
  }

  return { copied };
}

/**
 * CockroachDB hands back `INT` aggregates as strings. Without this, `total` reads
 * as `"60"` and any comparison against a number silently fails — the same class
 * of bug that made every device counter wrong.
 */
function toCount(v: any): number {
  const n = typeof v === 'string' ? parseInt(v, 10) : v;
  return Number.isFinite(n) ? n : 0;
}