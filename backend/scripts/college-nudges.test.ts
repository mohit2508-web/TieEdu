// ============================================================================
// TPO one-click nudges (lib/collegeNudges), to the platform owner's rules:
// officer drafts → Head approves (Head's own go straight out), presets plus a
// short clean line, at most PER_STUDENT_PER_WEEK per student per week,
// students can opt out and the college sees only a count. Plus the role
// matrix that encodes "only the Head approves".
// ============================================================================

import {
  audienceOf, collegeNudgeList, draftNudge, LINE_MAX, markStudentSeen, NudgeError, PER_STUDENT_PER_WEEK, rejectNudge, sendNow,
  setStudentOptOut, studentInbox, withdrawNudge, type Actor,
} from '../src/lib/collegeNudges';
import { PLACEMENT_ROLE_PERMISSIONS } from '../src/placement/permissions';
import type { BatchReadiness } from '../src/lib/batchReadiness';

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
    check(name, e instanceof NudgeError && (status === undefined || (e as NudgeError).status === status), true);
  }
}

const T0 = new Date('2026-10-28T06:00:00Z');
const later = (days: number) => new Date(T0.getTime() + days * 86_400_000);
const student = (id: string, segment: any, branch = 'CSE', batch = '2027') =>
  ({ user_id: id, label: id, roll_no: id, branch, batch, readiness: {}, average: null, tests: 0, lessons: 0, last_active: null, segment });
const batch: BatchReadiness = {
  generated_at: T0.toISOString(),
  companies: [],
  students: [student('s1', 'at_risk'), student('s2', 'at_risk'), student('s3', 'not_started'), student('s4', 'ready'), student('s5', 'at_risk', 'ECE')],
  segments: { not_started: 1, at_risk: 3, in_progress: 0, ready: 1 },
};
const mkDb = (): any => ({
  users: [{ id: 'off1', name: 'Officer One' }, { id: 'head1', name: 'Head One' }, ...['s1', 's2', 's3', 's4', 's5'].map((id) => ({ id, name: id }))],
  companies: [{ id: 'c1', slug: 'infosys', name: 'Infosys', status: 'published' }],
});
const officer: Actor = { userId: 'off1', collegeId: 'col1', collegeName: 'GLA University', canApprove: false };
const head: Actor = { userId: 'head1', collegeId: 'col1', collegeName: 'GLA University', canApprove: true };
const atRiskCse = { preset: 'come_back', audience: { segments: ['at_risk'], branch: 'CSE' } };

// --- the role matrix ------------------------------------------------------------------------
{
  const has = (role: keyof typeof PLACEMENT_ROLE_PERMISSIONS, p: string) => PLACEMENT_ROLE_PERMISSIONS[role].includes(p);
  check('officer drafts', has('tpo_officer', 'placement.nudges.write'), true);
  check('officer cannot approve', has('tpo_officer', 'placement.nudges.approve'), false);
  check('head approves', has('tpo_head', 'placement.nudges.approve'), true);
  check('management cannot nudge', [has('management', 'placement.nudges.write'), has('management', 'placement.nudges.approve')], [false, false]);
  check('trainers cannot nudge', has('master_trainer', 'placement.nudges.write'), false);
  check('reports: management, head, data officer', [has('management', 'placement.reports.read'), has('tpo_head', 'placement.reports.read'), has('data_officer', 'placement.reports.read'), has('tpo_officer', 'placement.reports.read')], [true, true, true, false]);
}

// --- drafting ---------------------------------------------------------------------------------
{
  const db = mkDb();
  rejects('preset required', () => draftNudge(db, officer, { ...atRiskCse, preset: 'anything' }, batch, T0), 400);
  rejects('audience required', () => draftNudge(db, officer, { preset: 'come_back', audience: { segments: [] } }, batch, T0), 400);
  rejects('company preset needs a company', () => draftNudge(db, officer, { ...atRiskCse, preset: 'test_soon' }, batch, T0), 400);
  rejects('line length', () => draftNudge(db, officer, { ...atRiskCse, line: 'x'.repeat(LINE_MAX + 1) }, batch, T0), 400);
  rejects('no links', () => draftNudge(db, officer, { ...atRiskCse, line: 'see www.example.com' }, batch, T0), 400);
  rejects('no phone numbers', () => draftNudge(db, officer, { ...atRiskCse, line: 'call 9876543210' }, batch, T0), 400);
  rejects('no email addresses', () => draftNudge(db, officer, { ...atRiskCse, line: 'mail tpo@college.edu' }, batch, T0), 400);
  rejects('empty audience', () => draftNudge(db, officer, { preset: 'come_back', audience: { segments: ['in_progress'] } }, batch, T0), 400);
  check('audience filters by segment and branch', audienceOf(batch, { segments: ['at_risk'], branch: 'CSE', batch: null }), ['s1', 's2']);

  const n = draftNudge(db, officer, { ...atRiskCse, line: '  Mock drive on Friday   in Lab 3. ' }, batch, T0);
  check('officer draft waits', [n.status, n.preview_count], ['pending', 2]);
  check('line tidied', n.line, 'Mock drive on Friday in Lab 3.');
  check('nothing delivered yet', studentInbox(db, 's1', T0).items.length, 0);
  rejects('officer cannot send', () => sendNow(db, officer, n.id, batch, T0), 403);
  rejects('officer cannot reject', () => rejectNudge(db, officer, n.id, 'no', T0), 403);
  rejects('another college cannot touch it', () => sendNow(db, { ...head, collegeId: 'col2' }, n.id, batch, T0), 404);

  const { nudge, pushes } = sendNow(db, head, n.id, batch, T0);
  check('head approval sends', [nudge.status, nudge.sent], ['sent', { delivered: 2, opted_out: 0, capped: 0 }]);
  check('push per recipient', pushes.map((p) => p.userId), ['s1', 's2']);
  check('push title names the college', pushes[0].title, 'GLA University placement cell');
  rejects('cannot send twice', () => sendNow(db, head, n.id, batch, T0), 409);
  const inbox = studentInbox(db, 's1', T0);
  check('student inbox text', inbox.items[0].text, 'GLA University placement cell: We noticed you have not practised for a while. Ten minutes today keeps you on track. Mock drive on Friday in Lab 3.');
  check('unread', inbox.unread, 1);
  markStudentSeen(db, 's1');
  check('seen', studentInbox(db, 's1', T0).unread, 0);
  check('ECE student not included', studentInbox(db, 's5', T0).items.length, 0);

  const t = draftNudge(db, officer, { preset: 'test_soon', company_slug: 'infosys', audience: { segments: ['ready'] } }, batch, T0);
  sendNow(db, head, t.id, batch, T0);
  check('company preset links to the company', studentInbox(db, 's4', T0).items[0].href, '/company/infosys');
}

// --- head drafts, reject, withdraw ---------------------------------------------------------------
{
  const db = mkDb();
  const r = draftNudge(db, officer, atRiskCse, batch, T0);
  rejectNudge(db, head, r.id, 'Wait until after mid-terms', T0);
  check('rejected with reason, nothing sent', [db.college_nudges[0].status, db.college_nudges[0].reject_reason, studentInbox(db, 's1', T0).items.length], ['rejected', 'Wait until after mid-terms', 0]);
  const w = draftNudge(db, officer, atRiskCse, batch, T0);
  rejects('only the drafter withdraws', () => withdrawNudge(db, { ...officer, userId: 'off2' }, w.id, T0), 403);
  check('drafter withdraws', withdrawNudge(db, officer, w.id, T0).status, 'withdrawn');
}

// --- weekly cap and opt-out --------------------------------------------------------------------------
{
  const db = mkDb();
  const send = (when: Date) => { const n = draftNudge(db, head, { preset: 'start_now', audience: { segments: ['at_risk', 'not_started'] } }, batch, when); return sendNow(db, head, n.id, batch, when).nudge.sent; };
  setStudentOptOut(db, 's3', true);
  check('opted-out student skipped and counted', send(T0), { delivered: 3, opted_out: 1, capped: 0 });
  for (let i = 1; i < PER_STUDENT_PER_WEEK; i++) send(later(i));
  check(`after ${PER_STUDENT_PER_WEEK} in a week, the rest are capped`, send(later(PER_STUDENT_PER_WEEK)), { delivered: 0, opted_out: 1, capped: 3 });
  check('a rolling week later they can be reached again', send(later(8)).delivered, 3);
  check('opted-out student’s inbox stays empty', studentInbox(db, 's3', later(8)).items.length, 0);

  const list = collegeNudgeList(db, 'col1', 'head1', batch);
  check('college sees how many opted out', list.opted_out, 1);
  check('…but never who', JSON.stringify(list).includes('s3'), false);
  check('segment counts for the picker', list.segments.map((s) => s.students), [1, 3, 0, 1]);
  check('branches for the picker', list.branches, ['CSE', 'ECE']);
  setStudentOptOut(db, 's3', false);
  check('opting back in', studentInbox(db, 's3', later(8)).off, false);
  check('inbox ages out after 30 days', studentInbox(db, 's1', later(40)).items.length, 0);
}

console.log(`college-nudges: ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
