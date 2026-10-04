/**
 * Reminder eligibility, and the two trigger gates that decide when a student is
 * interrupted at all.
 *
 * `buildReminderPlan` is pure on purpose. Whether someone gets a weekly nudge is
 * a policy with several interacting conditions, and a policy that can only be
 * observed by starting a timer, seeding a ledger and reading a log is a policy
 * nobody will dare change. So the rules are tested directly, and the wiring
 * around them is asserted at source level.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const read = (p: string) => fs.readFileSync(path.join(__dirname, '..', p), 'utf-8');
const reminders = read('src/lib/reminders.ts');
const notifyLib = read('src/lib/notify.ts');
const adminRoutes = read('src/routes/admin.routes.ts');
const courseAdmin = read('src/routes/courseAdmin.routes.ts');
const migrate = read('src/db/migrate.ts');
const routes = read('src/routes/notifications.routes.ts');

/*
 * Lazy require for the same reason as the broadcast suite: DB_FILE has to be set
 * before `data/db` captures its path at import time.
 */
const scratch = path.join(os.tmpdir(), `tieedu-reminders-${process.pid}.json`);
fs.writeFileSync(scratch, JSON.stringify({ users: [], courses: {}, course_progress: {} }));
process.env.DB_FILE = scratch;

const { buildReminderPlan, reminderWindowKey, REMINDER_CADENCE_DAYS, REMINDER_GRACE_DAYS } =
  require('../src/lib/reminders');

test.after(() => {
  try { fs.unlinkSync(scratch); } catch { /* ignore */ }
});

const DAY = 86400000;
const NOW = Date.UTC(2026, 0, 15, 12, 0, 0);

/** A course with `lessonCount` lessons, all completed unless told otherwise. */
const course = (id: string, lessonCount: number, over: Partial<any> = {}) => ({
  id,
  title: `Course ${id}`,
  slug: id,
  published: true,
  modules: [
    {
      id: `m-${id}`,
      lessons: Array.from({ length: lessonCount }, (_, i) => ({ id: `l-${id}-${i}`, title: `L${i}` })),
    },
  ],
  ...over,
});

/**
 * Courses are keyed by id in the ledger (`db.courses[id]`), not held as a list.
 * Getting that wrong makes every eligibility test pass for the wrong reason:
 * nothing matches, so nothing is planned, and "not planned" was the assertion.
 */
const ledger = (courses: any[], progress: any) => ({
  courses: Object.fromEntries(courses.map((c) => [c.id, c])),
  course_progress: progress,
});

/* ---------------------------------------------------------------- eligibility */

test('a student partway through a live course is due a reminder', () => {
  const db = ledger(
    [{ ...course('c1', 10) }],
    { u1: { c1: { enrolled_at: new Date(NOW - 30 * DAY).toISOString(), completed_at: null, completed_lesson_ids: ['l-c1-0', 'l-c1-1'] } } }
  );
  const plan = buildReminderPlan(db, ['u1'], NOW);
  assert.equal(plan.length, 1);
  assert.equal(plan[0].remaining, 8);
  assert.equal(plan[0].total, 10);
  assert.equal(plan[0].courseTitle, 'Course c1');
});

test('someone who finished the course is never nudged about it', () => {
  const db = ledger(
    [{ ...course('c1', 4) }],
    { u1: { c1: { enrolled_at: new Date(NOW - 90 * DAY).toISOString(), completed_at: new Date(NOW).toISOString(), completed_lesson_ids: ['a', 'b', 'c', 'd'] } } }
  );
  assert.deepEqual(buildReminderPlan(db, ['u1'], NOW), []);
});

test('every lesson done but completion not yet stamped is still not a reminder', () => {
  // completed_at is set asynchronously by the progress engine. A learner who has
  // actually opened every lesson has nothing left to be told, and the gap between
  // the last lesson and the stamp should not produce a pointless nudge.
  const db = ledger(
    [{ ...course('c1', 3) }],
    { u1: { c1: { enrolled_at: new Date(NOW - 30 * DAY).toISOString(), completed_at: null, completed_lesson_ids: ['l-c1-0', 'l-c1-1', 'l-c1-2'] } } }
  );
  assert.deepEqual(buildReminderPlan(db, ['u1'], NOW), []);
});

test('a brand-new enrolment is left alone', () => {
  const db = ledger(
    [{ ...course('c1', 10) }],
    { u1: { c1: { enrolled_at: new Date(NOW - REMINDER_GRACE_DAYS * DAY + 3600000).toISOString(), completed_at: null, completed_lesson_ids: [] } } }
  );
  assert.deepEqual(buildReminderPlan(db, ['u1'], NOW), [], 'someone who signed up this morning has not done anything wrong');
});

test('an unparseable enrolment date does not become a permanent exemption', () => {
  const db = ledger(
    [{ ...course('c1', 10) }],
    { u1: { c1: { enrolled_at: 'not-a-date', completed_at: null, completed_lesson_ids: [] } } }
  );
  assert.equal(buildReminderPlan(db, ['u1'], NOW).length, 1);
});

test('a draft course is never the subject of a student reminder', () => {
  const db = ledger(
    [{ ...course('c1', 10, { published: false }) }],
    { u1: { c1: { enrolled_at: new Date(NOW - 30 * DAY).toISOString(), completed_at: null, completed_lesson_ids: [] } } }
  );
  assert.deepEqual(buildReminderPlan(db, ['u1'], NOW), []);
});

test('a course with no lessons has nothing to remind anyone about', () => {
  const db = ledger(
    [{ ...course('empty', 0) }],
    { u1: { empty: { enrolled_at: new Date(NOW - 30 * DAY).toISOString(), completed_at: null, completed_lesson_ids: [] } } }
  );
  assert.deepEqual(buildReminderPlan(db, ['u1'], NOW), []);
});

test('an unsubscribed student is never in the plan, however unfinished their course', () => {
  const db = ledger(
    [{ ...course('c1', 10) }],
    { u1: { c1: { enrolled_at: new Date(NOW - 30 * DAY).toISOString(), completed_at: null, completed_lesson_ids: [] } } }
  );
  assert.deepEqual(buildReminderPlan(db, [], NOW), []);
  assert.deepEqual(buildReminderPlan(db, ['someone-else'], NOW), []);
});

test('progress for a deleted course is ignored rather than crashing the pass', () => {
  const db = ledger(
    [],
    { u1: { vanished: { enrolled_at: new Date(NOW - 30 * DAY).toISOString(), completed_at: null, completed_lesson_ids: [] } } }
  );
  assert.deepEqual(buildReminderPlan(db, ['u1'], NOW), []);
});

test('an empty ledger plans nothing instead of throwing', () => {
  assert.deepEqual(buildReminderPlan({}, ['u1'], NOW), []);
  assert.deepEqual(buildReminderPlan({ courses: {}, course_progress: {} }, ['u1'], NOW), []);
});

/* -------------------------------------------------------------------- cadence */

test('the cadence bucket is stable inside a window and moves between windows', () => {
  assert.equal(reminderWindowKey(NOW), reminderWindowKey(NOW + 6 * DAY));
  assert.notEqual(reminderWindowKey(NOW), reminderWindowKey(NOW + REMINDER_CADENCE_DAYS * DAY));
});

test('two students due on the same course get their own reminder', () => {
  const state = { enrolled_at: new Date(NOW - 30 * DAY).toISOString(), completed_at: null, completed_lesson_ids: [] };
  const db = ledger([{ ...course('c1', 10) }], { u1: { c1: { ...state } }, u2: { c1: { ...state } } });
  const plan = buildReminderPlan(db, ['u1', 'u2'], NOW);
  assert.equal(plan.length, 2);
  assert.deepEqual(plan.map((p: any) => p.userId), ['u1', 'u2']);
});

/* --------------------------------------------------------------- send-once */

test('the once-a-window claim is one atomic statement, not a read then a write', () => {
  const claim = reminders.slice(reminders.indexOf('export const claimReminderWindow'));
  const body = claim.slice(0, claim.indexOf('};'));
  assert.ok(body.includes('ON CONFLICT (user_id, course_id, window_key) DO NOTHING'), 'a read-then-write would let two replicas both send');
  assert.ok(body.includes('RETURNING'), 'the claim must report whether this process won');
  assert.ok(!body.includes('SELECT'), 'there must be no pre-check; the constraint is the check');
});

test('the migration gives that claim a primary key to conflict on', () => {
  assert.ok(migrate.includes('ensureNotificationRemindersTable'));
  const table = migrate.slice(migrate.indexOf('CREATE TABLE IF NOT EXISTS notification_reminders'));
  assert.ok(table.includes('PRIMARY KEY (user_id, course_id, window_key)'));
  assert.ok(migrate.includes('await ensureNotificationRemindersTable();'), 'the table must actually be created on boot');
});

test('a failed send releases its claim instead of eating a whole week', () => {
  assert.ok(reminders.includes('releaseReminderWindow'), 'a provider outage must not cost the student their next reminder');
  const loop = reminders.slice(reminders.indexOf('for (const plan of plans)'));
  assert.ok(loop.includes('await claimReminderWindow'), 'claim before send, to avoid duplicates');
  assert.ok(loop.indexOf('claimReminderWindow') < loop.indexOf('notifyEvent'));
  assert.ok(loop.includes('releaseReminderWindow'));
});

test('the loop cannot overlap itself and double-send within one process', () => {
  assert.ok(/if \(running\) return;/.test(reminders), 'a slow pass must not start a second one');
});

test('the scheduler holds no reference that could keep a process alive', () => {
  assert.ok(reminders.includes('unref'), 'an un-unref\'d interval would hang tests and shutdowns');
});

test('the scheduler is started from the notification subsystem, and only once', () => {
  assert.ok(routes.includes('startReminderScheduler()'), 'a mounted router is the reliable place to arm it');
  assert.ok(reminders.includes('if (started) return;'), 'importing the module twice must not arm two loops');
});

/* -------------------------------------------------------------- trigger gates */

test('a company edit that changes nothing sends nothing', () => {
  assert.ok(adminRoutes.includes('const added = changed.filter'), 'the gate is newly added content');
  assert.ok(adminRoutes.includes('if (added.length)'));
  const handler = adminRoutes.slice(adminRoutes.indexOf('const submitted = Object.keys(body)'));
  assert.ok(handler.includes('!sameValue(current[k], next[k])'), 'keys arriving is not the same as values changing');
});

test('a lesson-create notifies only students in that course', () => {
  const block = courseAdmin.slice(courseAdmin.indexOf("post('/modules/:moduleId/lessons'"), courseAdmin.indexOf("put('/lessons/:lessonId'"));
  assert.ok(block.includes("type: 'module.added'"));
  assert.ok(block.includes("{ kind: 'course', courseId: found.course.id }"), 'every student is not the audience for a new lesson');
  assert.ok(block.includes('if (found.course.published)'), 'a draft course edit is preparation, not news');
  assert.ok(block.includes('setImmediate'), 'delivery must not sit on the admin response');
});

test('editing a lesson does not notify', () => {
  // The typo-fix case, on the course side. Same argument as the company vault:
  // a channel that fires on every save is one students learn to swipe away.
  const edit = courseAdmin.slice(courseAdmin.indexOf("put('/lessons/:lessonId'"), courseAdmin.indexOf("'/lessons/:lessonId/reorder'") + 40);
  assert.ok(!edit.includes('notifyEvent'), 'a lesson edit is not new material');
});

test('every declared event has a template, including the reminder', () => {
  const declared = (notifyLib.match(/'([a-z_]+\.[a-z_]+)':/g) || []).map((s) => s.replace(/[':]/g, ''));
  const templated = notifyLib.slice(notifyLib.indexOf('const TEMPLATES'), notifyLib.indexOf('export const buildCopy'));
  for (const name of declared) {
    assert.ok(templated.includes(name), `event "${name}" has no template`);
  }
  assert.ok(declared.includes('course.incomplete'));
});

test('the reminder copy is about finishing, and survives a lock screen', () => {
  const templated = notifyLib.slice(notifyLib.indexOf('const TEMPLATES'), notifyLib.indexOf('export const buildCopy'));
  assert.ok(templated.includes("e.remaining === 1"), 'one lesson left must not read "1 lessons left"');
  assert.ok(templated.includes('lessons left to finish this'));
});
