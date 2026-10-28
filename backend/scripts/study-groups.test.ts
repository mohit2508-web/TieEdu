// ============================================================================
// Company study groups (lib/studyGroups). Opt-in membership, what members and
// non-members can see, activity from the streak record, and the nudge rules:
// preset messages only, per-day limits each way, opt-out, and clean-up on leave.
// ============================================================================

import {
  activityOf, GroupError, groupView, handleFor, inbox, joinGroup, leaveGroup, markInboxSeen, MAX_GROUPS, myGroups,
  NUDGES_RECEIVED_PER_DAY, NUDGES_SENT_PER_DAY, sendNudge, updateMembership,
} from '../src/lib/studyGroups';

let pass = 0;
let fail = 0;
function check(name: string, actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) pass++;
  else {
    fail++;
    console.log(`FAIL ${name}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
  }
}
function rejects(name: string, fn: () => unknown, status?: number) {
  try { fn(); fail++; console.log(`FAIL ${name}: accepted`); } catch (e) {
    check(name, e instanceof GroupError && (status === undefined || (e as GroupError).status === status), true);
  }
}

const NOW = new Date('2026-10-28T08:00:00Z'); // 2026-10-28 in India
const mkDb = (): any => ({
  users: Array.from({ length: 16 }, (_, i) => ({ id: `u${i}`, name: `Student${i} Kumar`, email: `s${i}@x.test` })),
  companies: [
    { id: 'c1', slug: 'acme', name: 'Acme', status: 'published' },
    { id: 'c2', slug: 'draftco', name: 'Draft Co', status: 'draft' },
    ...Array.from({ length: MAX_GROUPS }, (_, i) => ({ id: `x${i}`, slug: `x${i}`, name: `X${i}`, status: 'published' })),
  ],
  user_streaks: [
    { user_id: 'u0', current: 3, best: 5, last_day: '2026-10-28', freezes_used: [], frozen_days: [], days: ['2026-10-26', '2026-10-27', '2026-10-28'] },
    { user_id: 'u1', current: 2, best: 2, last_day: '2026-10-20', freezes_used: [], frozen_days: [], days: ['2026-10-19', '2026-10-20'] },
  ],
  company_prep_profiles: [
    { user_id: 'u0', company_id: 'c1', test_date: '2026-11-10' },
    { user_id: 'u1', company_id: 'c1', test_date: '2026-11-10' },
  ],
});

// --- membership -------------------------------------------------------------------------
{
  const db = mkDb();
  rejects('unpublished company', () => joinGroup(db, 'u0', 'draftco', {}), 404);
  check('suggested from a test date before joining', myGroups(db, 'u0', NOW).suggestions.map((s) => s.company.slug), ['acme']);
  check('nobody is a member until they join', groupView(db, null, 'acme', NOW).summary.members, 0);
  joinGroup(db, 'u0', 'acme', { name_mode: 'initials', share_test_date: true }, NOW);
  joinGroup(db, 'u0', 'acme', { name_mode: 'first_name' }, NOW);
  check('joining twice keeps one membership and its settings', [db.study_group_members.length, db.study_group_members[0].name_mode], [1, 'initials']);
  check('suggestion goes once joined', myGroups(db, 'u0', NOW).suggestions.length, 0);
  check('invalid name mode falls back to first name', joinGroup(db, 'u1', 'acme', { name_mode: 'email' }, NOW).name_mode, 'first_name');
  check('test date is private by default', db.study_group_members[1].share_test_date, false);

  const db2 = mkDb();
  for (let i = 0; i < MAX_GROUPS; i++) joinGroup(db2, 'u5', `x${i}`, {}, NOW);
  rejects('group cap', () => joinGroup(db2, 'u5', 'acme', {}), 400);
}

// --- what is visible ---------------------------------------------------------------------
{
  const db = mkDb();
  joinGroup(db, 'u0', 'acme', { name_mode: 'initials', share_test_date: true }, NOW);
  joinGroup(db, 'u1', 'acme', {}, NOW);
  const outsider: any = groupView(db, 'u9', 'acme', NOW);
  check('non-member sees a count, not members', [outsider.joined, outsider.summary.members, 'members' in outsider], [false, 2, false]);
  check('summary counts who practised today', outsider.summary.practised_today, 1);

  const v: any = groupView(db, 'u1', 'acme', NOW);
  check('member sees members', v.members.length, 2);
  check('me first', v.members[0].me, true);
  const u0 = v.members.find((m: any) => !m.me);
  check('chosen name shown (initials)', u0.name, 'S. K.');
  check('shared test date shown', u0.test_date, '2026-11-10');
  check('unshared test date hidden', v.members[0].test_date, null);
  const json = JSON.stringify(v);
  check('no user ids or emails in the view', /"u\d"|@x\.test/.test(json), false);
  check('handle is opaque', u0.handle, handleFor('u0', 'c1'));
  check('activity: days this week', u0.days_this_week, 3);
  check('activity: live streak', u0.streak, 3);
  check('activity label', u0.last_active, 'Practised today');
  const stale = activityOf(db, 'u1', '2026-10-28');
  check('a lapsed streak shows as 0', [stale.streak, stale.days_this_week], [0, 0]);
  check('new member with no record', activityOf(db, 'u7', '2026-10-28'), { days_this_week: 0, streak: 0, last_active: null, active_today: false });
}

// --- nudges ------------------------------------------------------------------------------
{
  const db = mkDb();
  for (let i = 0; i < 15; i++) joinGroup(db, `u${i}`, 'acme', {}, NOW);
  const h = (u: string) => handleFor(u, 'c1');
  rejects('outsider cannot nudge', () => sendNudge(db, 'u15', 'acme', { to: h('u1'), kind: 'cheer' }, NOW), 403);
  rejects('free text kind refused', () => sendNudge(db, 'u0', 'acme', { to: h('u1'), kind: 'you are useless' }, NOW), 400);
  rejects('cannot nudge self', () => sendNudge(db, 'u0', 'acme', { to: h('u0'), kind: 'cheer' }, NOW), 409);
  rejects('unknown handle', () => sendNudge(db, 'u0', 'acme', { to: 'nope', kind: 'cheer' }, NOW), 404);

  const sent = sendNudge(db, 'u0', 'acme', { to: h('u1'), kind: 'miss_you' }, NOW);
  check('push copy names the sender’s group name and company', sent.push.body, 'Student0 from your Acme group misses you. Ten minutes of practice today?');
  check('push links to the group', sent.push.url, '/study-groups?c=acme');
  rejects('one nudge per person per day', () => sendNudge(db, 'u0', 'acme', { to: h('u1'), kind: 'cheer' }, NOW), 409);
  check('view marks them as already nudged', (groupView(db, 'u0', 'acme', NOW) as any).members.find((m: any) => m.handle === h('u1')).can_nudge, false);
  check('next day it is allowed again', !!sendNudge(db, 'u0', 'acme', { to: h('u1'), kind: 'cheer' }, new Date('2026-10-29T08:00:00Z')), true);

  // Received cap: u2 can get NUDGES_RECEIVED_PER_DAY a day, from anyone.
  for (let i = 3; i < 3 + NUDGES_RECEIVED_PER_DAY; i++) sendNudge(db, `u${i}`, 'acme', { to: h('u2'), kind: 'cheer' }, NOW);
  rejects('received-per-day cap', () => sendNudge(db, 'u9', 'acme', { to: h('u2'), kind: 'cheer' }, NOW), 409);

  // Sent cap: u10 can send NUDGES_SENT_PER_DAY a day.
  const db2 = mkDb();
  for (let i = 0; i < 15; i++) joinGroup(db2, `u${i}`, 'acme', {}, NOW);
  const targets = Array.from({ length: 14 }, (_, i) => `u${i}`).filter((u) => u !== 'u10');
  for (const t of targets.slice(0, NUDGES_SENT_PER_DAY)) sendNudge(db2, 'u10', 'acme', { to: h(t), kind: 'cheer' }, NOW);
  rejects('sent-per-day cap', () => sendNudge(db2, 'u10', 'acme', { to: h(targets[NUDGES_SENT_PER_DAY]), kind: 'cheer' }, NOW), 409);

  // Opt-out.
  updateMembership(db, 'u5', 'acme', { nudges_ok: false });
  rejects('nudges off are respected', () => sendNudge(db, 'u6', 'acme', { to: h('u5'), kind: 'cheer' }, NOW), 409);

  // Inbox.
  const ib = inbox(db, 'u2', NOW);
  check('inbox lists received nudges', [ib.items.length, ib.unread], [NUDGES_RECEIVED_PER_DAY, NUDGES_RECEIVED_PER_DAY]);
  check('inbox text', ib.items[0].text.includes('Acme group'), true);
  markInboxSeen(db, 'u2');
  check('marked seen', inbox(db, 'u2', NOW).unread, 0);
  check('old nudges age out of the inbox', inbox(db, 'u2', new Date('2026-11-20T08:00:00Z')).items.length, 0);

  // Leave.
  check('leave works', leaveGroup(db, 'u2', 'acme'), true);
  check('leaving clears nudges received there', inbox(db, 'u2', NOW).items.length, 0);
  check('left member is gone from the list', (groupView(db, 'u0', 'acme', NOW) as any).members.some((m: any) => m.handle === h('u2')), false);
  rejects('nudging someone who left', () => sendNudge(db, 'u7', 'acme', { to: h('u2'), kind: 'cheer' }, NOW), 404);
  check('leaving twice', leaveGroup(db, 'u2', 'acme'), false);
}

console.log(`study-groups: ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
