/**
 * Broadcast delivery: audience resolution and message copy.
 *
 * These are the two pieces that decide who gets interrupted and what they read,
 * so they are tested behaviourally against a scratch ledger rather than by
 * reading source. Everything that needs a live provider or an HTTP server is
 * asserted at source level further down.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const read = (p: string) => fs.readFileSync(path.join(__dirname, '..', p), 'utf-8');
const routes = read('src/routes/notifications.routes.ts');
const notifyLib = read('src/lib/notify.ts');
const store = read('src/store/push.ts');
const courseAdmin = read('src/routes/courseAdmin.routes.ts');
const adminRoutes = read('src/routes/admin.routes.ts');
const view = read('../frontend/src/components/admin/AdminCmsView.tsx');
const tab = read('../frontend/src/components/admin/BroadcastTab.tsx');
const api = read('../frontend/src/lib/api.ts');

/* ------------------------------------------------------------------ fixture */

const scratch = path.join(os.tmpdir(), `tieedu-broadcast-${process.pid}.json`);
fs.writeFileSync(
  scratch,
  JSON.stringify({
    users: [
      { id: 'u-student-1', role: 'user', disabled: false },
      { id: 'u-student-2', role: 'user', disabled: false },
      { id: 'u-disabled', role: 'user', disabled: true },
      { id: 'u-admin', role: 'admin', disabled: false },
      { id: 'u-ghost', role: 'user', disabled: false },
    ],
    course_progress: {
      'u-student-1': { 'course-a': { completed_at: null } },
      'u-student-2': { 'course-b': { completed_at: null } },
      'u-disabled': { 'course-a': { completed_at: null } },
      'u-admin': { 'course-a': { completed_at: null } },
    },
  })
);
process.env.DB_FILE = scratch;

/*
 * Required lazily rather than imported at the top. `DB_FILE` has to be set before
 * `data/db` resolves its path, and the module caches that path at import time, so
 * an ESM top-level import would race the fixture setup.
 */
const notifyOnce = () => {
  const m = require('../src/lib/notify') as typeof import('../src/lib/notify');
  return { buildCopy: m.buildCopy, resolveAudience: m.resolveAudience };
};
const { buildCopy, resolveAudience } = notifyOnce();

test.after(() => {
  try { fs.unlinkSync(scratch); } catch { /* ignore */ }
});

/* ------------------------------------------------------------------ audience */

test('every-student reaches students only, never staff or disabled accounts', () => {
  const ids = resolveAudience({ kind: 'all_students' });
  assert.deepEqual(ids.sort(), ['u-ghost', 'u-student-1', 'u-student-2']);
  assert.ok(!ids.includes('u-admin'), 'an admin must not be swept into a student blast');
  assert.ok(!ids.includes('u-disabled'), 'a disabled account must not be notified');
});

test('a crafted user id cannot pull a disabled account or an admin into the blast', () => {
  const ids = resolveAudience({
    kind: 'users',
    userIds: ['u-student-1', 'u-disabled', 'u-admin', 'made-up-id'],
  });
  assert.deepEqual(ids, ['u-student-1']);
});

test('course audience is enrolment-based, not everyone who owns the course', () => {
  const ids = resolveAudience({ kind: 'course', courseId: 'course-a' });
  assert.deepEqual(ids.sort(), ['u-student-1']);
});

test('an unknown course resolves to nobody rather than to everyone', () => {
  assert.deepEqual(resolveAudience({ kind: 'course', courseId: 'does-not-exist' }), []);
});

/* ---------------------------------------------------------------------- copy */

test('copy is truncated to what a lock screen actually shows', () => {
  // The course title lands in the body, which is the field that can grow, so the
  // cap that matters there is the body's. The title is fixed copy for this event.
  const copy = buildCopy({ type: 'course.published', title: 'x'.repeat(400), courseId: 'c', slug: 'abc' });
  assert.ok(copy.title.length <= 80, `title was ${copy.title.length}`);
  assert.ok(copy.body.length <= 200, `body was ${copy.body.length}`);
});

test('an absolute url cannot ride along in a notification link', () => {
  // The slug is stored content, and `/companies/` + it still starts with a slash
  // while carrying a whole second URL inside a path segment. Starting-with-`/`
  // is not a sufficient check.
  const evil = buildCopy({
    type: 'vault.updated',
    title: 'Vault',
    detail: 'hi',
    slug: 'https://evil.example/steal',
  });
  assert.ok(evil.url.startsWith('/'), `url was ${evil.url}`);
  assert.ok(!evil.url.includes('evil.example'), `url was ${evil.url}`);
  assert.equal(buildCopy({ type: 'vault.updated', title: 'v', detail: 'd', slug: undefined }).url, '/companies');
});

test('every declared event has a template', () => {
  const declared = (notifyLib.match(/'([a-z_]+\.[a-z_]+)':/g) || []).map((s) => s.replace(/[':]/g, ''));
  const templated = notifyLib.slice(notifyLib.indexOf('const TEMPLATES'), notifyLib.indexOf('export const buildCopy'));
  for (const name of declared) {
    assert.ok(templated.includes(name), `event "${name}" has no template, so it would throw at send time`);
  }
});

/* --------------------------------------------------------------------- route */

test('the broadcast route is gated behind the permission, not just admin login', () => {
  const mount = routes.slice(routes.indexOf("'/broadcast'"), routes.indexOf("'/broadcast'") + 220);
  assert.ok(mount.includes("requireAdmin"), 'broadcast must require admin');
  assert.ok(mount.includes("requirePermission('broadcasts.send')"), 'broadcast must require broadcasts.send');
});

test('reaching every student needs danger.broadcast.all, which the default admin role lacks', () => {
  assert.ok(
    routes.includes("can(req.authority, 'danger.broadcast.all')"),
    'a routine messaging permission must not be enough to message every student'
  );
  const rbac = read('src/lib/rbac.ts');
  // The default admin grant is every permission minus danger.*; if that ever
  // changes, the separation this route relies on quietly disappears.
  assert.ok(
    /admin:\s*ALL_PERMISSIONS\.filter\(\(p\)\s*=>\s*!p\.startsWith\('danger\.'\)\)/.test(rbac),
    'admin role must still exclude danger.* from its default grant'
  );
});

test('confirmation is enforced by the server, not only by the form', () => {
  assert.ok(
    routes.includes('confirm !== true') && routes.includes('confirmation_required'),
    'a broadcast reachable by a retried request must require explicit confirmation'
  );
});

test('message length is bounded server-side', () => {
  assert.ok(routes.includes('Title must be 80 characters or fewer'));
  assert.ok(routes.includes('Message must be 200 characters or fewer'));
});

test('a broadcast is written to the audit ledger before the ledger is saved', () => {
  // Sliced from the route mount: the action name appears *inside* the audit call,
  // so starting there would slice away the very call being asserted.
  const handler = routes.slice(routes.indexOf("'/broadcast'"));
  const auditAt = handler.indexOf('await appendAudit(');
  const saveAt = handler.indexOf('saveDb(db)');
  assert.ok(auditAt > -1, 'a send to real accounts must leave a trail');
  assert.ok(saveAt > -1);
  assert.ok(auditAt < saveAt, 'appendAudit only mutates memory, so saving first would drop the row');
  assert.ok(handler.includes("action: 'notification.broadcast'"));
});

test('the broadcast route reuses the shared send path instead of a private one', () => {
  assert.ok(routes.includes('sendPushToUsers'), 'broadcast must go through the bulk sender');
  const lib = read('src/lib/push.ts');
  assert.ok(lib.includes('export async function sendPushToUsers'));
});

/* -------------------------------------------------------------------- store */

test('bulk lookup exists, so a broadcast is not an N+1 over the json ledger', () => {
  assert.ok(store.includes('export async function listSubscriptionsForUsers'));
  const bulk = store.slice(store.indexOf('export async function listSubscriptionsForUsers'));
  assert.ok(
    bulk.includes('ANY($1::text[])'),
    'the bulk read must be one statement; a loop would re-parse the whole db.json per student'
  );
});

/* ------------------------------------------------------------------ triggers */

test('publishing a course notifies students, creating the draft does not', () => {
  assert.ok(courseAdmin.includes('notifyEvent'), 'course publish should notify');
  const publishBlock = courseAdmin.slice(courseAdmin.indexOf('course.published = publishing'));
  assert.ok(publishBlock.includes("type: 'course.published'"));
  assert.ok(publishBlock.includes('if (publishing)'), 'a draft is invisible to students, so it must not notify');
  // Creating a course must not notify, or every draft would announce itself.
  const createBlock = courseAdmin.slice(courseAdmin.indexOf("action: 'course.create'"), courseAdmin.indexOf("action: 'course.create'") + 200);
  assert.ok(!createBlock.includes('notifyEvent'), 'creating a draft course must not notify students');
});

test('a company vault update notifies only when material was actually added', () => {
  // Gates on `added` (blank -> filled), not `changed`. The admin form PUTs every
  // editorial field on each save, so keying off "a field arrived" would notify on
  // every save, and keying off "a value differs" would still notify for a typo fix.
  // The reminders suite covers these rules in detail; this pins the wiring.
  assert.ok(adminRoutes.includes("type: 'vault.updated'"));
  assert.ok(adminRoutes.includes('if (added.length)'), 'an edit is not an addition');
});

test('a notification can never fail the admin action that caused it', () => {
  assert.ok(courseAdmin.includes('setImmediate'), 'delivery must not block the response');
  assert.ok(notifyLib.includes('Never throws'), 'notifyEvent must swallow provider failures');
  assert.ok(/catch \(e: any\)/.test(notifyLib));
});

/* ----------------------------------------------------------------- frontend */

test('the broadcast tab is registered and rendered', () => {
  assert.ok(view.includes("'broadcast'"), 'TabId must include broadcast');
  assert.ok(view.includes("id: 'broadcast'"), 'the nav entry must exist');
  assert.ok(view.includes("<BroadcastTab />"), 'the tab must actually render');
});

test('the form makes the admin retype the title, and the client sends confirm', () => {
  assert.ok(tab.includes('typedTitle.trim() === title.trim()'), 'confirmation must match the title exactly');
  assert.ok(tab.includes('confirm: true'));
});

test('a send that reached nobody is reported as a failure, not a success', () => {
  assert.ok(tab.includes('Nobody received this'), 'zero reach must not read as delivered');
  assert.ok(api.includes('sendBroadcastApi'));
});
