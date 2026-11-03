// ============================================================================
// Project Pulse (lib/pulse). Access rules first — a student of one class can
// never read another class, or another student — then invites, scoring and
// status, the hint reviewer, copy detection, flags, the autograder's status
// mapping and the workflow integrity check. No test touches GitHub or the AI.
// ============================================================================

import {
  PulseError, pulseOf, appointTeacher, createClass, inviteStudents, join, normaliseTask, teachClass, teachTask, studentTask,
  studentView, linkRepo, scoreFor, statusFor, effectiveReqs, newId, subFor,
} from '../src/lib/pulse/store';
import { hintReview } from '../src/lib/pulse/review';
import { similarPairs, tokens } from '../src/lib/pulse/similarity';
import { buildFlags, testsFrom, releaseOthers } from '../src/lib/pulse/sync';
import { parseRepo, workflowIntact, workflowYaml } from '../src/lib/pulse/github';

let pass = 0;
let fail = 0;
function check(name: string, actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) pass++;
  else { fail++; console.log(`FAIL ${name}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`); }
}
function status(name: string, fn: () => unknown, code: number) {
  try { fn(); fail++; console.log(`FAIL ${name}: allowed`); } catch (e) { check(name, e instanceof PulseError ? e.status : String(e), code); }
}

const admin = { id: 'a1', role: 'admin', email: 'admin@x.in', name: 'Admin' };
const t1 = { id: 't1', role: 'user', email: 'teach1@x.in', name: 'T One' };
const t2 = { id: 't2', role: 'user', email: 'teach2@x.in', name: 'T Two' };
const s1 = { id: 's1', role: 'user', email: 'asha@x.in', name: 'Asha' };
const s2 = { id: 's2', role: 'user', email: 'ravi@x.in', name: 'Ravi' };
const outsider = { id: 'o1', role: 'user', email: 'o@x.in', name: 'O' };
const db: any = { users: [admin, t1, t2, s1, s2, outsider] };

// --- teachers ---------------------------------------------------------------
status('non-teacher cannot create a class', () => createClass(db, t1, { name: 'CSE' }), 403);
appointTeacher(db, admin, 'TEACH1@x.in');
appointTeacher(db, admin, 'teach2@x.in');
status('unknown email cannot be appointed', () => appointTeacher(db, admin, 'nobody@x.in'), 404);
const classA = createClass(db, t1, { name: 'CSE 2A', subject: 'C' });
const classB = createClass(db, t2, { name: 'CSE 2B' });
check('owner can open own class', teachClass(db, t1, classA.id).id, classA.id);
status('teacher cannot open another teacher’s class', () => teachClass(db, t2, classA.id), 404);
check('admin can open any class', teachClass(db, admin, classB.id).id, classB.id);

// --- invites ----------------------------------------------------------------
const { invited, skipped } = inviteStudents(db, classA, [{ email: 'asha@x.in', name: 'Asha', roll_no: '101' }, { email: 'bad' }, { email: 'ravi@x.in' }]);
check('two invited, one bad email skipped', [invited.length, skipped], [2, ['bad']]);
check('re-inviting an active-or-invited email is skipped', inviteStudents(db, classA, [{ email: 'asha@x.in' }]).invited.length, 0);
status('invite token needs the same email', () => join(db, s2, { token: invited[0].token }), 403);
check('invite accepted with the right email', join(db, s1, { token: invited[0].token }).status, 'active');
status('a used token does not work twice', () => join(db, s1, { token: invited[0].token }), 404);
check('join code leaves an uninvited student pending', join(db, outsider, { code: classA.join_code }).status, 'pending');
join(db, s2, { token: invited[1].token });

// --- tasks & student access -----------------------------------------------
const body = {
  title: 'Records', summary: 'x', assigned_at: '2026-10-01T00:00:00Z', deadline_at: '2026-10-20T00:00:00Z', published: true,
  requirements: [{ title: 'Struct', hints: 'typedef struct, float marks' }, { title: 'Files', hints: ['fopen', 'fwrite'] }, { title: 'Untitled hints' }],
  tests: [{ name: 'list', input: '1\n', expected: 'Asha' }, { name: 'empty expected', expected: '  ' }],
};
const taskA = { id: newId('task'), class_id: classA.id, ...normaliseTask(body) };
pulseOf(db).tasks.push(taskA);
check('requirements get ids, hints split', taskA.requirements.map((r: any) => [r.id, r.hints]), [['R1', ['typedef struct', 'float marks']], ['R2', ['fopen', 'fwrite']], ['R3', []]]);
check('tests with no expected output are dropped', taskA.tests.map((t: any) => t.id), ['T1']);
status('deadline before assigned is refused', () => normaliseTask({ ...body, deadline_at: '2026-09-01T00:00:00Z' }), 400);
status('task needs a requirement', () => normaliseTask({ ...body, requirements: [] }), 400);

check('invited student can open the task', studentTask(db, s1, taskA.id).row.email, 'asha@x.in');
status('pending student cannot open the task', () => studentTask(db, outsider, taskA.id), 404);
status('teacher of another class cannot open the task', () => teachTask(db, t2, taskA.id), 404);
taskA.published = false;
status('unpublished task is hidden from students', () => studentTask(db, s1, taskA.id), 404);
taskA.published = true;

// --- linking, views, scoring -----------------------------------------------
const rowAsha = studentTask(db, s1, taskA.id).row;
const rowRavi = studentTask(db, s2, taskA.id).row;
check('no repo → noRepo, score 0', [studentView(db, taskA, rowAsha, 'student').status, studentView(db, taskA, rowAsha, 'student').score], ['noRepo', 0]);
const subA = linkRepo(db, taskA, rowAsha, 'asha/c-task');
check('linked but no commits → notStarted', studentView(db, taskA, rowAsha, 'teacher').status, 'notStarted');

// Ownership: an unverified link never blocks the owner and never earns marks.
const subRavi = linkRepo(db, taskA, rowRavi, 'ASHA/c-task');
subRavi.snap = { commits: [{ sha: 'x', at: '2026-10-05T10:00:00Z', pushed: '2026-10-05T10:00:00Z', message: 'm', add: 5, del: 0 }], reqs: {}, tests: {}, flags: [] };
const ravi = studentView(db, taskA, rowRavi, 'teacher');
check('unverified repo → status unverified, score 0, flagged', [ravi.status, ravi.score, ravi.flags[0].kind], ['unverified', 0, 'unverified']);
check('student sees their own unverified flag', studentView(db, taskA, rowRavi, 'student').flags.map((f: any) => f.kind), ['unverified']);
subA.verified = true;
subA.verified_owner = 'asha';
releaseOthers(pulseOf(db), subA);
check('owner verifying unlinks the other student', subFor(db, taskA.id, rowRavi.id), undefined);
check('teacher is told who linked someone else’s repo', studentView(db, taskA, rowRavi, 'teacher').flags[0].kind, 'claimed');
check('the claim alert is hidden from that student', studentView(db, taskA, rowRavi, 'student').flags.length, 0);
status('a verified repo cannot be linked by anyone else', () => linkRepo(db, taskA, rowRavi, 'asha/c-task'), 409);
status('a verified student cannot switch to another account’s repo', () => linkRepo(db, taskA, rowAsha, 'ravi/c-task'), 409);
check('same account, new repo is fine', linkRepo(db, taskA, rowAsha, 'asha/c-task-v2').repo, 'asha/c-task-v2');
linkRepo(db, taskA, rowAsha, 'asha/c-task');
subA.verified = true;

const commit = (at: string, add = 10) => ({ sha: at.slice(5, 10), at, pushed: at, message: 'm', add, del: 0 });
subA.snap = {
  commits: [commit('2026-10-05T10:00:00Z'), commit('2026-10-04T10:00:00Z'), commit('2026-10-03T10:00:00Z')],
  reqs: { R1: { verdict: 'met', reason: '', evidence: null }, R2: { verdict: 'partial', reason: '', evidence: null }, R3: { verdict: 'met', reason: '', evidence: null } },
  tests: { T1: { pass: true, got: 'ok' } }, flags: [{ kind: 'bulk', text: 'b' }, { kind: 'failing', text: 'f' }],
};
let reqs = effectiveReqs(taskA, subA);
// tests 50·1 + reqs 40·(2.5/3) + activity 10·1 = 93.33
check('weighted score', scoreFor(taskA, subA, reqs), 93);
check('one partial → in progress', statusFor(taskA, subA, reqs), 'progress');
subA.req_overrides = { R2: { verdict: 'met', reason: 'checked in lab' } };
reqs = effectiveReqs(taskA, subA);
check('teacher override makes it done', [statusFor(taskA, subA, reqs), scoreFor(taskA, subA, reqs)], ['done', 100]);
subA.override = { score: 72 };
check('score override wins', scoreFor(taskA, subA, reqs), 72);
check('student view hides integrity flags and teacher fields',
  [studentView(db, taskA, rowAsha, 'student').flags.map((f: any) => f.kind), studentView(db, taskA, rowAsha, 'student').override, studentView(db, taskA, rowAsha, 'student').notes],
  [['failing'], undefined, undefined]);
check('teacher view keeps them', studentView(db, taskA, rowAsha, 'teacher').flags.length, 2);

// --- hint reviewer ----------------------------------------------------------
const files = [{ path: 'main.c', code: 'typedef struct {\n  int roll;\n  float marks;\n} S;\nint main(){ FILE *f = fopen("a","w"); }\n' }, { path: 'README.md', code: 'fwrite' }];
const hr = hintReview(taskA.requirements, files);
check('all hints → met, with evidence lines', [hr.R1.verdict, hr.R1.evidence], ['met', { file: 'main.c', from: 1, to: 3 }]);
check('some hints → partial; README does not count', hr.R2.verdict, 'partial');
check('no hints → partial, needs teacher', hr.R3.verdict, 'partial');
check('regex hints work', hintReview([{ id: 'R1', hints: ['/fopen\\s*\\(/'] }], files).R1.verdict, 'met');

// --- similarity -------------------------------------------------------------
const prog = `#include <stdio.h>\nint add(int a[], int n){ int s = 0; for (int i = 0; i < n; i++) { s += a[i]; if (s > 100) printf("big %d", s); } return s; }\nint main(void){ int x[5] = {1,2,3,4,5}; int t = add(x, 5); while (t > 0) { t--; printf("%d", t); } return 0; }`;
const renamed = prog.replace(/\bs\b/g, 'total').replace(/\badd\b/g, 'sum_all').replace(/\bt\b/g, 'k').replace('// x', '');
check('renaming identifiers does not change tokens', tokens(prog).join(' ') === tokens(renamed).join(' '), true);
check('renamed copy is flagged', similarPairs([{ id: 'a', code: prog }, { id: 'b', code: renamed }], '').map((p) => [p.a, p.b, p.score]), [['a', 'b', 100]]);
check('starter code is not a match', similarPairs([{ id: 'a', code: prog }, { id: 'b', code: prog }], prog).length, 0);

// --- flags & autograder mapping ---------------------------------------------
const now = new Date('2026-10-12T00:00:00Z').getTime();
const fl = buildFlags(taskA, [commit('2026-10-03T00:00:00Z', 300), commit('2026-10-02T00:00:00Z', 5)], false, false, now);
check('inactive, failing, bulk and workflow flags', fl.map((f) => f.kind), ['inactive', 'failing', 'bulk', 'workflow']);
const late = buildFlags(taskA, [{ ...commit('2026-10-21T00:00:00Z'), at: '2026-10-10T00:00:00Z' }], true, true, now);
check('late + backdated', late.map((f) => f.kind), ['backdated', 'late']);
check('statuses map to tests', testsFrom(taskA, { 'pulse/build': { state: 'success', description: '' }, 'pulse/T1': { state: 'failure', description: 'missing: Asha' } }, true),
  { tests: { T1: { pass: false, got: 'missing: Asha' } }, compiles: true });
check('edited workflow → untrusted', testsFrom(taskA, { 'pulse/T1': { state: 'success', description: '' } }, false).tests.T1.pass, false);
check('our workflow is intact on any host', workflowIntact(workflowYaml('https://api.example.in')), true);
check('an edited workflow is not', workflowIntact(workflowYaml('x').replace('node /tmp/pulse-grader.js', 'echo pass')), false);
check('repo URLs parse', [parseRepo('https://github.com/asha/c-task.git'), parseRepo('asha/c-task'), parseRepo('https://gitlab.com/a/b')], ['asha/c-task', 'asha/c-task', null]);

console.log(`pulse: ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
