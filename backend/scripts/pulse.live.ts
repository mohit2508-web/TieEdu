// ============================================================================
// Project Pulse v2, end to end over HTTP on a scratch store: admin creates
// teachers → class → invite → student joins → task (folder task-1, no tests) →
// student links ONE class repo (octocat/Hello-World) → teacher dashboard, review,
// CSV, duplicate, templates; plus every access refusal. Never touches PostgreSQL.
// Run: npx ts-node --transpile-only scripts/pulse.live.ts
// ============================================================================
import fs from 'fs';
import os from 'os';
import path from 'path';

const scratch = path.join(os.tmpdir(), `pulse-live-${Date.now()}.json`);
process.env.DB_FILE = scratch;
process.env.PORT = '5099';
process.env.PULSE_SYNC = '0';
// Never reach the real cluster from a test: boot backfills (staff, audit, devices) would copy scratch rows into it.
process.env.DATABASE_URL = '';
process.env.ENABLE_PG_REPLICA = '0';
process.env.EMAIL_DISABLED = '1';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'pulse-live-test-secret-0123456789abcdef';
const users = [
  { id: 'u_admin', name: 'Admin', email: 'admin@pulse.test', role: 'admin', created_at: new Date().toISOString() },
  { id: 'u_teach', name: 'Prof T', email: 'teach@pulse.test', role: 'user', created_at: new Date().toISOString() },
  { id: 'u_teach2', name: 'Prof U', email: 'teach2@pulse.test', role: 'user', created_at: new Date().toISOString() },
  { id: 'u_stu', name: 'Asha', email: 'asha@pulse.test', role: 'user', created_at: new Date().toISOString() },
  { id: 'u_other', name: 'Other', email: 'other@pulse.test', role: 'user', created_at: new Date().toISOString() },
];
fs.writeFileSync(scratch, JSON.stringify({ users }));

let pass = 0, fail = 0;
const check = (name: string, ok: boolean, info?: unknown) => { if (ok) pass++; else { fail++; console.log(`FAIL ${name}`, info ?? ''); } };

(async () => {
  const { signAccessToken } = await import('../src/middleware/auth');
  const { httpServer } = await import('../src/server');
  await new Promise((r) => setTimeout(r, 1500));
  const base = 'http://localhost:5099/api/pulse';
  const tok = (id: string) => signAccessToken({ id, role: users.find((u) => u.id === id)?.role || 'user' });
  const api = async (who: string | null, method: string, p: string, body?: unknown) => {
    const res = await fetch(base + p, { method, headers: { 'Content-Type': 'application/json', ...(who ? { Authorization: `Bearer ${tok(who)}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const text = await res.text();
    let json: any = null; try { json = JSON.parse(text); } catch { json = text; }
    return { status: res.status, json };
  };
  const loginAs = (email: string, password: string) => fetch('http://localhost:5099/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) }).then((r) => r.status);

  // Admin & teachers
  check('signed-out /me is 401', (await api(null, 'GET', '/me')).status === 401);
  check('non-teacher cannot create class', (await api('u_teach', 'POST', '/classes', { name: 'X' })).status === 403);
  check('non-admin cannot appoint', (await api('u_teach', 'POST', '/admin/teachers', { email: 'teach@pulse.test' })).status === 403);
  check('admin appoints existing accounts', (await api('u_admin', 'POST', '/admin/teachers', { email: 'teach@pulse.test' })).status === 201);
  await api('u_admin', 'POST', '/admin/teachers', { email: 'teach2@pulse.test' });
  const withPw = await api('u_admin', 'POST', '/admin/teachers', { email: 'pw@pulse.test', name: 'PW Teacher', password: 'Teacher@123' });
  check('admin creates a teacher with a password', withPw.json.created && withPw.json.password_set, withPw.json);
  check('that teacher logs in', (await loginAs('pw@pulse.test', 'Teacher@123')) === 200);
  const fresh = await api('u_admin', 'POST', '/admin/teachers', { email: 'fresh@pulse.test', name: 'Fresh Teacher' });
  check('without a password: 7-day set-password link', String(fresh.json.link).includes('/reset-password?token='), fresh.json);
  const freshId = fresh.json.teachers.find((t: any) => t.email === 'fresh@pulse.test').user_id;
  check('teacher cannot set passwords', (await api('u_teach', 'POST', `/admin/teachers/${freshId}/password`, { password: 'Another@123' })).status === 403);
  await api('u_admin', 'POST', `/admin/teachers/${freshId}/password`, { password: 'Another@123' });
  check('admin-set password works', (await loginAs('fresh@pulse.test', 'Another@123')) === 200);
  check('AI settings are gone', (await api('u_admin', 'PUT', '/admin/settings', { ai_review: true })).status === 404);

  // Class & students
  const cls = (await api('u_teach', 'POST', '/classes', { name: 'CSE 2A', subject: 'C' })).json;
  check('class created', !!cls.id, cls);
  check('other teacher cannot see it', (await api('u_teach2', 'GET', `/classes/${cls.id}`)).status === 404);
  const inv = await api('u_teach', 'POST', `/classes/${cls.id}/roster`, { entries: [{ email: 'asha@pulse.test', name: 'Asha', roll_no: '101' }] });
  const token = decodeURIComponent(inv.json.links[0].link.split('token=')[1]);
  check('wrong account cannot use the invite', (await api('u_other', 'POST', '/join', { token })).status === 403);
  check('student joins', (await api('u_stu', 'POST', '/join', { token })).json.status === 'active');

  // Templates & task
  const tpl = await api('u_teach', 'GET', '/templates');
  check('templates listed', tpl.json.templates.length >= 5, tpl.json);
  const task = (await api('u_teach', 'POST', `/classes/${cls.id}/tasks`, {
    ...tpl.json.templates[0].input, assigned_at: '2010-01-01T00:00:00Z', deadline_at: '2030-01-01T00:00:00Z', published: false,
  })).json;
  check('task gets folder task-1, tests off', task.folder === 'task-1' && task.auto_tests === false, task);
  check('draft hidden from student', (await api('u_stu', 'GET', `/student/tasks/${task.id}`)).status === 404);
  await api('u_teach', 'PUT', `/tasks/${task.id}`, { published: true });
  const mine = await api('u_stu', 'GET', `/student/tasks/${task.id}`);
  check('student sees own task, noRepo, folder named', mine.status === 200 && mine.json.student.status === 'noRepo' && mine.json.student.folder === 'task-1', mine.json);
  check('student view has no teacher fields', mine.json.student.notes === undefined && mine.json.student.override === undefined);
  check('outsider cannot see the task', (await api('u_other', 'GET', `/student/tasks/${task.id}`)).status === 404);
  check('student cannot open the dashboard', (await api('u_stu', 'GET', `/tasks/${task.id}/dashboard`)).status === 404);
  check('outsider cannot link a repo to the class', (await api('u_other', 'POST', `/student/classes/${cls.id}/repo`, { url: 'a/b' })).status === 404);

  // One repo for the class
  check('bad repo URL refused', (await api('u_stu', 'POST', `/student/classes/${cls.id}/repo`, { url: 'not a repo' })).status === 400);
  const linked = await api('u_stu', 'POST', `/student/classes/${cls.id}/repo`, { url: 'https://github.com/octocat/Hello-World' });
  check('repo linked once for the class', linked.status === 200 && linked.json.repo.repo === 'octocat/Hello-World' && typeof linked.json.repo.verify_code === 'string', linked.json);
  console.log('   github sync:', linked.json.repo.error ? `error: ${linked.json.repo.error}` : `ok at ${linked.json.repo.synced_at}`);
  const after = await api('u_stu', 'GET', `/student/tasks/${task.id}`);
  check('no task-1/ folder → not started, with a hint', after.json.student.status === 'notStarted' && (linked.json.repo.error || String(after.json.student.folder_hint).includes('task-1/')), after.json.student);
  check('recheck is rate-limited', (await api('u_stu', 'POST', `/student/classes/${cls.id}/recheck`)).status === 200
    && (await api('u_stu', 'POST', `/student/classes/${cls.id}/recheck`)).status === 429);
  const me = await api('u_stu', 'GET', '/me');
  check('/me lists the class repo and the task', me.json.student_classes[0].repo === 'octocat/Hello-World' && me.json.tasks[0].folder === 'task-1', me.json);

  // Teacher side
  const dash = await api('u_teach', 'GET', `/tasks/${task.id}/dashboard`);
  check('dashboard lists the student', dash.status === 200 && dash.json.students.length === 1, dash.json);
  const rid = dash.json.students[0].id;
  check('other teacher refused dashboard', (await api('u_teach2', 'GET', `/tasks/${task.id}/dashboard`)).status === 404);
  const detail = await api('u_teach', 'GET', `/tasks/${task.id}/students/${rid}`);
  check('detail has position and files list', detail.status === 200 && detail.json.position === 1 && Array.isArray(detail.json.student.files), detail.json);
  const rev = await api('u_teach', 'POST', `/tasks/${task.id}/students/${rid}/review`, { verdicts: { R1: 'met', R2: 'partial' }, feedback: 'Good start' });
  check('review saved in one call', rev.status === 200 && rev.json.student.reqs.R1.verdict === 'met' && rev.json.student.reviewed === true, rev.json);
  check('student sees marks and feedback', (await api('u_stu', 'GET', `/student/tasks/${task.id}`)).json.student.feedback === 'Good start');
  check('student cannot review', (await api('u_stu', 'POST', `/tasks/${task.id}/students/${rid}/review`, { verdicts: { R1: 'met' } })).status === 404);
  check('override needs a reason', (await api('u_teach', 'POST', `/tasks/${task.id}/students/${rid}/override`, { score: 90 })).status === 400);
  await api('u_teach', 'POST', `/tasks/${task.id}/students/${rid}/override`, { score: 90, reason: 'viva' });
  check('override applies', (await api('u_teach', 'GET', `/tasks/${task.id}/dashboard`)).json.students[0].score === 90);
  check('teacher verifies in person', (await api('u_teach', 'POST', `/tasks/${task.id}/students/${rid}/verify`, { verified: true })).status === 200);
  const csv = await api('u_teach', 'GET', `/tasks/${task.id}/export.csv`);
  check('CSV export', csv.status === 200 && String(csv.json).includes('Asha'));
  const dup = await api('u_teach', 'POST', `/tasks/${task.id}/duplicate`, {});
  check('duplicate gets task-2 and is a draft', dup.status === 201 && dup.json.folder === 'task-2' && dup.json.published === false, dup.json);
  check('other teacher cannot duplicate into their class', (await api('u_teach2', 'POST', `/tasks/${task.id}/duplicate`, {})).status === 404);
  check('saved comments', (await api('u_teach', 'PUT', '/me/comments', { comments: ['Check fopen for NULL'] })).json.comments[0] === 'Check fopen for NULL');
  check('students cannot save comments', (await api('u_stu', 'PUT', '/me/comments', { comments: ['x'] })).status === 403);

  // Autograder endpoints
  check('no auto-test tasks → empty list', (await api(null, 'GET', '/autograde/tests?repo=octocat/hello-world')).json.tasks.length === 0);
  await api('u_teach', 'PUT', `/tasks/${task.id}`, { auto_tests: true });
  const tests = await api(null, 'GET', '/autograde/tests?repo=octocat/hello-world');
  check('auto tests on → folder and tests served', tests.json.tasks[0]?.folder === 'task-1' && tests.json.tasks[0].tests.length > 0, tests.json);
  check('unlinked repo gets 404', (await api(null, 'GET', '/autograde/tests?repo=nobody/none')).status === 404);
  const wf = await fetch(`${base}/autograde/workflow.yml`).then((r) => r.text());
  check('workflow file served', wf.includes('pulse-autograde'));
  check('grader handles folders', (await fetch(`${base}/autograde/grader.js`).then((r) => r.text())).includes('task.folder'));

  // Co-teachers
  const co = await api('u_teach', 'POST', `/classes/${cls.id}/co-teachers`, { email: 'co@pulse.test', name: 'Co Teacher' });
  check('co-teacher without a login becomes an admin request', co.json.result === 'requested', co.json);
  const reqs = await api('u_admin', 'GET', '/admin/co-requests');
  const ok = await api('u_admin', 'POST', `/admin/co-requests/${reqs.json.requests[0].id}`, { approve: true });
  check('admin approves: login created', ok.json.created === true, ok.json);
  check('existing teacher added at once', (await api('u_teach', 'POST', `/classes/${cls.id}/co-teachers`, { email: 'teach2@pulse.test', name: 'Prof U' })).json.result === 'added');
  check('co-teacher can now open the class', (await api('u_teach2', 'GET', `/classes/${cls.id}`)).status === 200);

  await api('u_teach', 'DELETE', `/roster/${rid}`);
  check('removed student loses access at once', (await api('u_stu', 'GET', `/student/tasks/${task.id}`)).status === 404);

  console.log(`pulse live: ${pass} passed, ${fail} failed`);
  httpServer.close();
  try { fs.unlinkSync(scratch); } catch { /* */ }
  fs.rmSync(scratch.replace(/\.json$/, '-pulse'), { recursive: true, force: true });
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
