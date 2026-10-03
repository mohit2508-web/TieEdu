/**
 * The platform audit ledger — one writer, one row shape, one cap.
 *
 * This function used to live in `payments/orders.ts` and was called from
 * checkout, webhooks, admin and study-plan routes. It was not, however, the only
 * thing writing to `db.audit`: the course editor kept a private `audit()` helper
 * with its own id format and its own retention cap, and the device admin routes
 * pushed rows by hand with a third shape and no cap at all.
 *
 * Three shapes in one ledger is not a cosmetic problem. It means an audit entry
 * cannot be relied on to have an actor, so "who did this" has to be answered by
 * reading whichever branch produced the row, and it means the retention bound is
 * only enforced on the paths that happen to remember to enforce it — a
 * deployment whose only audit activity was device actions grew without limit.
 *
 * So this is the single entry point. It mutates the in-memory `db` object and
 * nothing else; callers are expected to call it BEFORE `saveDb()`, which is why
 * it is not async and does not touch the database itself. The ledger is now also
 * mirrored to PostgreSQL, but the shape and the cap still live here and nowhere
 * else — `store/audit.ts` persists the row this returns rather than re-deriving
 * it, so the two stores cannot disagree about what a row looks like.
 */

export const AUDIT_CAP = 1000;

/**
 * Monotonic within a process, so two events in the same millisecond still get
 * distinct ids. `Date.now()` alone would collide, and an audit ledger whose ids
 * collide is an audit ledger whose entries overwrite each other.
 */
let auditSeq = 0;

export type AuditEntry = {
  actor?: string;
  action: string;
  detail?: string;
  /** Payment correlation. Null for platform events that are not order-scoped. */
  order_id?: string;
  gateway?: string;
  /** What was acted upon — a device id, a serial, a course id. */
  target?: string;
  meta?: any;
};

/** The single row shape the ledger stores, in both stores. */
export type AuditRow = {
  id: string;
  at: string;
  actor: string;
  action: string;
  detail: string;
  order_id: string | null;
  gateway: string | null;
  target: string | null;
  meta: any;
};

/**
 * Append one canonical row to the in-memory ledger and return it.
 *
 * Returns the row so a caller can persist exactly what was recorded. That is the
 * whole seam for the relational move: the shape and the cap are decided here and
 * nowhere else, so the store cannot drift from it by re-deriving the fields.
 *
 * The caller is still expected to `saveDb()` afterwards — this mutates only the
 * in-memory object graph, never the file.
 */
export function pushAudit(db: any, entry: AuditEntry): AuditRow {
  if (!db.audit) db.audit = [];
  auditSeq += 1;
  const row: AuditRow = {
    id: `${entry.order_id ? `${entry.order_id}-` : ''}a${Date.now()}-${auditSeq}`,
    at: new Date().toISOString(),
    actor: entry.actor || 'system',
    action: entry.action,
    detail: entry.detail || '',
    order_id: entry.order_id || null,
    gateway: entry.gateway || null,
    target: entry.target || null,
    meta: entry.meta || null,
  };
  db.audit.push(row);
  if (db.audit.length > AUDIT_CAP) db.audit = db.audit.slice(-AUDIT_CAP);
  return row;
}

/** Test hook: reset the id sequence so ids are predictable within a run. */
export function __resetAuditSeq(): void {
  auditSeq = 0;
}