/**
 * M2 regression tests: the audit ledger has exactly one writer and one shape.
 *
 * The ledger used to have three. `pushAudit` lived in `payments/orders.ts` and
 * was the writer of record for checkout, webhooks, admin and study-plan; the
 * course editor kept a private `audit()` with its own id format and a 500-entry
 * cap; and the device admin routes pushed rows by hand with a third shape and no
 * cap at all. Three shapes in one ledger means "who did this" cannot be answered
 * by reading a row, and it means retention is only enforced on whichever paths
 * remembered to enforce it.
 *
 * Source-level where it can be (no server, no ledger, so it is safe inside the
 * ordinary `npm test` chain), plus unit checks against the writer itself. The
 * HTTP surface is covered by verify-m1-guards.live.ts.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { pushAudit, AUDIT_CAP, __resetAuditSeq } from '../src/lib/audit';

const SRC = path.join(__dirname, '..', 'src');
const WRITER = path.join('lib', 'audit.ts');

/** Every .ts under src, excluding the writer itself. */
function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) sourceFiles(full, acc);
    else if (entry.name.endsWith('.ts')) acc.push(full);
  }
  return acc;
}

test('nothing writes to the audit array except the shared helper', () => {
  // The guard this file exists for. A hand-rolled `db.audit.push(...)` is how the
  // third shape got there in the first place, and it would come back the same
  // way — silently, because each individual row still looks correct.
  const offenders: string[] = [];
  for (const file of sourceFiles(SRC)) {
    if (path.relative(SRC, file) === WRITER) continue;
    const src = fs.readFileSync(file, 'utf8');
    const lines = src.split('\n');
    lines.forEach((line, i) => {
      // db.audit = ... / db.audit.push(...) / db.audit.unshift(...)
      if (/audit\s*(\.push\(|\.unshift\(|\.splice\()/.test(line)) {
        offenders.push(`${path.relative(SRC, file)}:${i + 1}: ${line.trim()}`);
      }
    });
  }
  assert.deepEqual(
    offenders,
    [],
    `audit rows must go through pushAudit:\n${offenders.join('\n')}`
  );
});

test('the course editor no longer keeps a private audit helper', () => {
  const src = fs.readFileSync(path.join(SRC, 'routes', 'courseAdmin.routes.ts'), 'utf8');
  assert.equal(
    /function audit\s*\(/.test(src),
    false,
    'courseAdmin.routes.ts still defines its own audit() helper'
  );
  // Its own cap was 500 against the shared 1000, so a silent second policy.
  assert.equal(/slice\(-500\)/.test(src), false, 'the 500-entry cap should be gone');
});

test('every row has the same keys whichever path wrote it', () => {
  const db: any = { audit: [] };
  // One event of each shape that exists in the codebase: order-scoped payment,
  // target-scoped device action, and a plain platform event.
  pushAudit(db, { action: 'order.paid', order_id: 'ord-1', gateway: 'razorpay' });
  pushAudit(db, { action: 'device.block', actor: 'a@b.c', target: 'dev-1' });
  pushAudit(db, { action: 'course.delete', actor: 'a@b.c' });

  const expected = ['id', 'at', 'actor', 'action', 'detail', 'order_id', 'gateway', 'target', 'meta'];
  for (const row of db.audit) {
    assert.deepEqual(
      Object.keys(row).sort(),
      [...expected].sort(),
      `row written by "${row.action}" has a different shape`
    );
  }
});

test('a row records who acted, and names a target when there is one', () => {
  const db: any = {};
  pushAudit(db, { action: 'device.delete', actor: 'admin@tieedu.in', target: 'install-7' });
  const row = db.audit[0];
  assert.equal(row.actor, 'admin@tieedu.in');
  assert.equal(row.target, 'install-7');
  assert.equal(row.order_id, null, 'a device event has no order');
  assert.equal(row.gateway, null);
  assert.equal(row.meta, null);
});

test('a missing actor reads as system rather than undefined', () => {
  // The course editor used to write no actor field at all, so these rows rendered
  // as blank wherever the ledger was displayed and could not answer "who".
  const db: any = {};
  pushAudit(db, { action: 'webhook.received' });
  assert.equal(db.audit[0].actor, 'system');
});

test('retention is enforced by the writer, so every path is bounded', () => {
  // The device routes used to push directly and therefore never trimmed: a
  // deployment whose only audit traffic was device actions grew without limit.
  const db: any = {};
  for (let i = 0; i < AUDIT_CAP + 250; i++) pushAudit(db, { action: `nudge.${i}` });
  assert.equal(db.audit.length, AUDIT_CAP, 'the ledger must stay bounded');
  assert.equal(
    db.audit[db.audit.length - 1].action,
    `nudge.${AUDIT_CAP + 249}`,
    'the newest entry must survive the trim'
  );
  assert.equal(db.audit[0].action, 'nudge.250', 'the trim must drop the oldest entries');
});

test('ids do not collide when two events land in the same millisecond', () => {
  __resetAuditSeq();
  const db: any = {};
  for (let i = 0; i < 50; i++) pushAudit(db, { action: 'burst' });
  assert.equal(new Set(db.audit.map((r: any) => r.id)).size, 50, 'ids must be unique');

  // Order-scoped ids keep their prefix so the admin ledger can still be searched
  // by order, which is what the ledger view does.
  const scoped: any = {};
  pushAudit(scoped, { action: 'order.paid', order_id: 'ord-9' });
  assert.match(scoped.audit[0].id, /^ord-9-a\d+-\d+$/);
});

test('the writer creates the array when the ledger has none yet', () => {
  // A fresh ledger has `audit: []` from the default template, but callers pass
  // whatever loadDb gave them; the old helper guarded this and it must stay.
  const db: any = {};
  pushAudit(db, { action: 'x' });
  assert.equal(Array.isArray(db.audit), true);
  assert.equal(db.audit.length, 1);
});