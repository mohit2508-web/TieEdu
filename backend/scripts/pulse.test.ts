// ============================================================================
// Project Pulse v2 (lib/pulse). Access rules first — a student of one class can
// never read another class, or another student — then admin-made teachers,
// invites, one repo per class with a folder per task, ownership, the teacher's
// review (no AI), status and scoring, the autograder's per-folder statuses,
// copy detection, flags and the v1 → v2 migration. No test touches GitHub.
// ============================================================================

import {
  PulseError, pulseOf, appointTeacher, createClass, inviteStudents, join, normaliseTask, teachClass, teachTask, studentTask, studentClass,
  studentView, linkClassRepo, repoFor, saveReview, duplicateTask, folderHint, newId, createTeacherAccount, addCoTeacher, decideCoRequest,
  coRequestList, isTeacher, nextFolder,
} from '../src/lib/pulse/store';
import { similarPairs, tokens } from '../src/lib/pulse/similarity';
import { buildFlags, testsFor, releaseOthers } from '../src/lib/pulse/sync';
import { parseRepo, workflowIntact, workflowYaml } from '../src/lib/pulse/github';
import { TEMPLATES, templateInput } from '../src/lib/pulse/templates';

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
status('invite token needs the same email', () => join(db, s2, { token: invited[0].token }), 403);
check('invite accepted with the right email', join(db, s1, { token: invited[0].token }).status, 'active');
status('a used token does not work twice', () => join(db, s1, { token: invited[0].token }), 404);
check('join code leaves an uninvited student pending', join(db, outsider, { code: classA.join_code }).status, 'pending');
join(db, s2, { token: invited[1].token });
status('pending student cannot open the class', () => studentClass(db, outsider, classA.id), 404);

// --- tasks: folders, optional tests, no hints -----------------------------
const body = {
  title: 'Records', summary: 'x', assigned_at: '2026-10-01T00:00:00Z', deadline_at: '2026-10-20T00:00:00Z', published: true,
  requirements: [{ title: 'Struct', hints: 'ignored' }, { title: 'Files' }], tests: [{ name: 'list', input: '1\n', expected: 'Asha', req_id: 'R1' }],
};
const taskA: any = { id: newId('task'), class_id: classA.id, ...normaliseTask(body, {}, { db, classId: classA.id }) };
pulseOf(db).tasks.push(taskA);
check('first task gets folder task-1, tests off by default', [taskA.folder, taskA.auto_tests], ['task-1', false]);
check('requirements carry no hints', taskA.requirements, [{ id: 'R1', title: 'Struct', detail: '' }, { id: 'R2', title: 'Files', detail: '' }]);
check('the next folder is task-2', nextFolder(db, classA.id), 'task-2');
status('a folder used by another task is refused', () => normaliseTask({ ...body, folder: 'TASK-1' }, {}, { db, classId: classA.id }), 409);
status('a bad folder name is refused', () => normaliseTask({ ...body, folder: '../x' }, {}, { db, classId: classA.id }), 400);
status('auto tests need at least one test', () => normaliseTask({ ...body, tests: [], auto_tests: true }, {}, { db, classId: classA.id }), 400);
status('deadline before assigned is refused', () => normaliseTask({ ...body, deadline_at: '2026-09-01T00:00:00Z' }), 400);

check('invited student can open the task', studentTask(db, s1, taskA.id).row.email, 'asha@x.in');
status('pending student cannot open the task', () => studentTask(db, outsider, taskA.id), 404);
status('teacher of another class cannot open the task', () => teachTask(db, t2, taskA.id), 404);
taskA.published = false;
status('unpublished task is hidden from students', () => studentTask(db, s1, taskA.id), 404);
taskA.published = true;

const copy = duplicateTask(db, taskA, classA.id, 't1');
check('duplicate: new folder, unpublished, same length', [copy.folder, copy.published, new Date(copy.deadline_at).getTime() - new Date(copy.assigned_at).getTime()], ['task-2', false, 19 * 86400000]);
check('duplicate into another class starts at task-1', duplicateTask(db, taskA, classB.id, 't2').folder, 'task-1');
check('every template is a valid task', TEMPLATES.every((t) => !!normaliseTask(templateInput(t))), true);

// --- one repo per class ---------------------------------------------------
const rowAsha = studentTask(db, s1, taskA.id).row;
const rowRavi = studentTask(db, s2, taskA.id).row;
check('no repo → noRepo', studentView(db, taskA, rowAsha, 'student').status, 'noRepo');
const rec = linkClassRepo(db, classA, rowAsha, 'asha/c-lab');
check('linked, no snapshot → notStarted', studentView(db, taskA, rowAsha, 'teacher').status, 'notStarted');

const commit = (at: string, paths: string[], add = 10) => ({ sha: at.slice(5, 10), at, pushed: at, message: 'm', add, del: 0, files: paths.map((p) => ({ p, a: add, d: 0 })) });
rec.snap = {
  head_sha: 'h', synced_at: '2026-10-06T00:00:00Z', workflow_ok: true, dirs: ['task-1', 'Task2'],
  commits: [
    commit('2026-10-05T10:00:00Z', ['task-1/main.c']),
    commit('2026-10-04T10:00:00Z', ['Task2/main.c']),
    commit('2026-10-03T10:00:00Z', ['task-1/records.h', 'README.md']),
    commit('2026-09-20T10:00:00Z', ['task-1/old.c']),
  ],
  statuses: { 'pulse/task-1/build': { state: 'success', description: '' }, 'pulse/task-1/T1': { state: 'failure', description: 'missing: Asha' } },
};
let v = studentView(db, taskA, rowAsha, 'teacher');
check('only commits touching task-1/ after assigned count', v.commits.map((c: any) => c.sha), ['10-05', '10-03']);
check('folder lines only', v.commits[1].add, 10);
check('not verified yet → unverified, score 0, flagged', [v.status, v.score, v.flags[0].kind], ['unverified', 0, 'unverified']);
check('folder hint finds the near-miss folder', folderHint(copy, rec), 'Folder task-2/ not found. Found Task2/; rename it to task-2/.');
check('no hint when the folder exists', folderHint(taskA, rec), null);

rec.verified = true;
v = studentView(db, taskA, rowAsha, 'teacher');
check('verified, nothing marked → submitted', [v.status, v.reviewed, v.reqs.R1.verdict], ['submitted', false, 'unreviewed']);
check('tests are ignored while auto tests are off', v.tests, {});

// --- teacher review (no AI) --------------------------------------------------
saveReview(db, taskA, rowAsha, { verdicts: { R1: 'met', R2: 'partial' }, feedback: 'Close the file.' }, 't1');
v = studentView(db, taskA, rowAsha, 'teacher');
// reqs 60·0.75 + activity 10·(2/3) over 70 = 73.8 → 74
check('marked → in progress, weighted score', [v.status, v.score, v.feedback], ['progress', 74, 'Close the file.']);
status('unknown requirement refused', () => saveReview(db, taskA, rowAsha, { verdicts: { R9: 'met' } }, 't1'), 400);
status('bad verdict refused', () => saveReview(db, taskA, rowAsha, { verdicts: { R1: 'great' } }, 't1'), 400);
saveReview(db, taskA, rowAsha, { verdicts: { R2: 'met' } }, 't1');
check('everything ticked → done', studentView(db, taskA, rowAsha, 'teacher').status, 'done');
saveReview(db, taskA, rowAsha, { score: 80, reason: 'viva' }, 't1');
check('score override wins', studentView(db, taskA, rowAsha, 'teacher').score, 80);
saveReview(db, taskA, rowAsha, { score: null, verdicts: { R2: null } }, 't1');
check('clearing marks and override', [studentView(db, taskA, rowAsha, 'teacher').reqs.R2.verdict, studentView(db, taskA, rowAsha, 'teacher').status], ['unreviewed', 'progress']);

// --- optional autograder, per folder ----------------------------------------
taskA.auto_tests = true;
check('per-folder statuses map to tests', testsFor(taskA, rec), { tests: { T1: { pass: false, got: 'missing: Asha' } }, compiles: true });
check('a failing test keeps the task from done', (saveReview(db, taskA, rowAsha, { verdicts: { R2: 'met' } }, 't1'), studentView(db, taskA, rowAsha, 'teacher').status), 'progress');
rec.snap.workflow_ok = false;
check('edited workflow → untrusted', testsFor(taskA, rec).tests.T1.pass, false);
rec.snap.workflow_ok = true;
taskA.auto_tests = false;

// --- student view privacy ------------------------------------------------
const sv = studentView(db, taskA, rowAsha, 'student');
check('student view has no teacher fields', [sv.override, sv.notes], [undefined, undefined]);
check('student sees their verify code and folder', [typeof sv.verify_code, sv.folder], ['string', 'task-1']);

// --- ownership ------------------------------------------------------------
rec.verified = false;
const recRavi = linkClassRepo(db, classA, rowRavi, 'ASHA/c-lab');
check('an unverified link does not block the owner', !!recRavi, true);
rec.verified = true;
rec.verified_owner = 'asha';
releaseOthers(pulseOf(db), rec);
check('owner verifying unlinks the other student', repoFor(db, classA.id, rowRavi.id), undefined);
check('teacher is told', studentView(db, taskA, rowRavi, 'teacher').flags[0].kind, 'claimed');
check('the alert is hidden from that student', studentView(db, taskA, rowRavi, 'student').flags.length, 0);
status('a verified repo cannot be linked by anyone else', () => linkClassRepo(db, classA, rowRavi, 'asha/c-lab'), 409);
status('a verified student cannot switch account', () => linkClassRepo(db, classA, rowAsha, 'ravi/c-lab'), 409);
check('same account, new repo is fine', linkClassRepo(db, classA, rowAsha, 'asha/c-lab-2').repo, 'asha/c-lab-2');

// --- admin-made teachers & co-teachers -------------------------------------
status('teacher login needs a name when the account is new', () => createTeacherAccount(db, admin, { email: 'new@x.in' }), 400);
const made = createTeacherAccount(db, admin, { email: 'New.Teacher@x.in', name: 'New Teacher' });
check('admin creates a passwordless teacher login', [made.created, made.user.email, made.user.password_hash, isTeacher(db, made.user)], [true, 'new.teacher@x.in', undefined, true]);
check('existing teacher is added as co-teacher at once', addCoTeacher(db, classA, t1, { email: 'teach2@x.in' }), 'added');
check('anyone else becomes a request for the admin', addCoTeacher(db, classA, t1, { email: 'co@x.in', name: 'Co Teacher' }), 'requested');
status('only the owner adds co-teachers', () => addCoTeacher(db, classA, t2, { email: 'x@x.in', name: 'X Y' }), 403);
const approved = decideCoRequest(db, admin, coRequestList(db)[0].id, true);
check('approval creates the login and adds them to the class', [approved.created, classA.co_teachers.includes(approved.user.id)], [true, true]);

// --- similarity, flags, workflow, repo URLs --------------------------------------
const prog = `#include <stdio.h>\nint add(int a[], int n){ int s = 0; for (int i = 0; i < n; i++) { s += a[i]; if (s > 100) printf("big %d", s); } return s; }\nint main(void){ int x[5] = {1,2,3,4,5}; int t = add(x, 5); while (t > 0) { t--; printf("%d", t); } return 0; }`;
const renamed = prog.replace(/\bs\b/g, 'total').replace(/\badd\b/g, 'sum_all').replace(/\bt\b/g, 'k');
check('renaming identifiers does not change tokens', tokens(prog).join(' ') === tokens(renamed).join(' '), true);
check('renamed copy is flagged', similarPairs([{ id: 'a', code: prog }, { id: 'b', code: renamed }], '').map((p) => p.score), [100]);
check('starter code is not a match', similarPairs([{ id: 'a', code: prog }, { id: 'b', code: prog }], prog).length, 0);
const now = new Date('2026-10-12T00:00:00Z').getTime();
check('inactive, failing, bulk flags', buildFlags(taskA, [commit('2026-10-03T00:00:00Z', [], 300), commit('2026-10-02T00:00:00Z', [], 5)], false, true, now).map((f) => f.kind), ['inactive', 'failing', 'bulk']);
check('late + backdated', buildFlags(taskA, [{ ...commit('2026-10-21T00:00:00Z', []), at: '2026-10-10T00:00:00Z' }], true, true, now).map((f) => f.kind), ['backdated', 'late']);
check('our workflow is intact on any host', workflowIntact(workflowYaml('https://api.example.in')), true);
check('an edited workflow is not', workflowIntact(workflowYaml('x').replace('node /tmp/pulse-grader.js', 'echo pass')), false);
check('repo URLs parse', [parseRepo('https://github.com/asha/c-lab.git'), parseRepo('asha/c-lab'), parseRepo('https://gitlab.com/a/b')], ['asha/c-lab', 'asha/c-lab', null]);

// --- v1 → v2 migration --------------------------------------------------------
const old: any = { users: [], pulse: {
  teachers: [], classes: [{ id: 'c1' }], roster: [{ id: 'r1', class_id: 'c1' }],
  tasks: [{ id: 'k1', class_id: 'c1', tests: [{ id: 'T1' }], requirements: [{ id: 'R1', hints: ['x'] }] }, { id: 'k2', class_id: 'c1', tests: [], requirements: [] }],
  subs: [{ id: 'sub1', task_id: 'k1', roster_id: 'r1', repo: 'a/b', verify_code: 'PULSE-1', verified: true, req_overrides: { R1: { verdict: 'met' } }, feedback: [{ body: 'ok' }], notes: [], override: null }],
} };
const mp = pulseOf(old);
check('migration: folders, tests flag, hints dropped', mp.tasks.map((t: any) => [t.folder, t.auto_tests, t.requirements[0]?.hints]), [['task-1', true, undefined], ['task-2', false, undefined]]);
check('migration: one class repo, marks moved', [mp.repos.length, mp.repos[0].repo, mp.results[0].reqs.R1.verdict, mp.results[0].feedback[0].body, 'subs' in mp], [1, 'a/b', 'met', 'ok', false]);

console.log(`pulse: ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
