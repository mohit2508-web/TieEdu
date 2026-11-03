// ============================================================================
// Project Pulse, end to end over HTTP on a scratch store: admin appoints a
// teacher → class → invite → student joins by token → task with tests →
// student links a public GitHub repo (octocat/Hello-World) → teacher dashboard,
// detail, CSV; plus every access refusal. Run: npx ts-node --transpile-only scripts/pulse.live.ts
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
  const tok = (id: string) => signAccessToken({ id, role: users.find((u) => u.id === id)!.role });
  const api = async (who: string | null, method: string, p: string, body?: unknown) => {
    const res = await fetch(base + p, { method, headers: { 'Content-Type': 'application/json', ...(who ? { Authorization: `Bearer ${tok(who)}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const text = await res.text();
    let json: any = null; try { json = JSON.parse(text); } catch { json = text; }
    return { status: res.status, json };
  };

  check('signed-out /me is 401', (await api(null, 'GET', '/me')).status === 401);
  check('non-teacher cannot create class', (await api('u_teach', 'POST', '/classes', { name: 'X' })).status === 403);
  check('non-admin cannot appoint', (await api('u_teach', 'POST', '/admin/teachers', { email: 'teach@pulse.test' })).status === 403);
  check('admin appoints', (await api('u_admin', 'POST', '/admin/teachers', { email: 'teach@pulse.test' })).status === 201);
  await api('u_admin', 'POST', '/admin/teachers', { email: 'teach2@pulse.test' });

  const cls = (await api('u_teach', 'POST', '/classes', { name: 'CSE 2A', subject: 'C' })).json;
  check('class created', !!cls.id, cls);
  check('other teacher cannot see it', (await api('u_teach2', 'GET', `/classes/${cls.id}`)).status === 404);

  const inv = await api('u_teach', 'POST', `/classes/${cls.id}/roster`, { entries: [{ email: 'asha@pulse.test', name: 'Asha', roll_no: '101' }] });
  check('invite returns a link', inv.json.invited === 1 && inv.json.links?.[0]?.link?.includes('token='), inv.json);
  const token = decodeURIComponent(inv.json.links[0].link.split('token=')[1]);
  check('wrong account cannot use the invite', (await api('u_other', 'POST', '/join', { token })).status === 403);
  check('student joins with the invite', (await api('u_stu', 'POST', '/join', { token })).json.status === 'active');

  const task = (await api('u_teach', 'POST', `/classes/${cls.id}/tasks`, {
    title: 'Hello', summary: 'Say hello', assigned_at: '2010-01-01T00:00:00Z', deadline_at: '2030-01-01T00:00:00Z', published: false,
    requirements: [{ title: 'README', hints: ['Hello'] }], tests: [{ name: 'prints hello', input: '', expected: 'Hello' }],
  })).json;
  check('task created', !!task.id, task);
  check('draft hidden from student', (await api('u_stu', 'GET', `/student/tasks/${task.id}`)).status === 404);
  await api('u_teach', 'PUT', `/tasks/${task.id}`, { published: true });
  const mine = await api('u_stu', 'GET', `/student/tasks/${task.id}`);
  check('student sees own task, noRepo', mine.status === 200 && mine.json.student.status === 'noRepo', mine.json);
  check('student view has no teacher fields', mine.json.student.notes === undefined && mine.json.student.override === undefined);
  check('student view hides hints', mine.json.task.requirements[0].hints === undefined);
  check('outsider cannot see the task', (await api('u_other', 'GET', `/student/tasks/${task.id}`)).status === 404);
  check('student cannot open teacher dashboard', (await api('u_stu', 'GET', `/tasks/${task.id}/dashboard`)).status === 404);

  check('bad repo URL refused', (await api('u_stu', 'POST', `/student/tasks/${task.id}/repo`, { url: 'not a repo' })).status === 400);
  const linked = await api('u_stu', 'POST', `/student/tasks/${task.id}/repo`, { url: 'https://github.com/octocat/Hello-World' });
  check('repo linked', linked.status === 200 && linked.json.student.repo === 'octocat/Hello-World', linked.json);
  console.log('   github sync:', linked.json.error ? `error: ${linked.json.error}` : `ok, ${linked.json.student.commits.length} commits, status ${linked.json.student.status}`);
  check('recheck is rate-limited to once per 10 min', (await api('u_stu', 'POST', `/student/tasks/${task.id}/recheck`)).status === 200
    && (await api('u_stu', 'POST', `/student/tasks/${task.id}/recheck`)).status === 429);

  const dash = await api('u_teach', 'GET', `/tasks/${task.id}/dashboard`);
  check('dashboard lists the student', dash.status === 200 && dash.json.students.length === 1, dash.json);
  const rid = dash.json.students[0].id;
  check('other teacher refused dashboard', (await api('u_teach2', 'GET', `/tasks/${task.id}/dashboard`)).status === 404);
  check('unverified link scores 0', dash.json.students[0].score === 0 && (dash.json.students[0].status === 'unverified' || (!!linked.json.error && dash.json.students[0].status === 'notStarted')), dash.json.students[0]);
  check('student cannot verify via teacher route', (await api('u_stu', 'POST', `/tasks/${task.id}/students/${rid}/verify`, { verified: true })).status === 404);
  check('teacher verifies in person', (await api('u_teach', 'POST', `/tasks/${task.id}/students/${rid}/verify`, { verified: true })).status === 200);
  check('verified work now counts', (await api('u_teach', 'GET', `/tasks/${task.id}/dashboard`)).json.students[0].status !== 'unverified');
  const detail = await api('u_teach', 'GET', `/tasks/${task.id}/students/${rid}`);
  check('detail has files when synced', detail.status === 200 && Array.isArray(detail.json.student.files), detail.json);
  console.log('   files read:', detail.json.student.files.map((f: any) => f.path).join(', ') || '(none)');
  check('feedback saved', (await api('u_teach', 'POST', `/tasks/${task.id}/students/${rid}/feedback`, { body: 'Nice' })).status === 200);
  check('student sees feedback', (await api('u_stu', 'GET', `/student/tasks/${task.id}`)).json.student.feedback === 'Nice');
  check('override needs a reason', (await api('u_teach', 'POST', `/tasks/${task.id}/students/${rid}/override`, { score: 90 })).status === 400);
  await api('u_teach', 'POST', `/tasks/${task.id}/students/${rid}/override`, { score: 90, reason: 'viva' });
  check('override applies', (await api('u_teach', 'GET', `/tasks/${task.id}/dashboard`)).json.students[0].score === 90);
  const csv = await api('u_teach', 'GET', `/tasks/${task.id}/export.csv`);
  check('CSV export', csv.status === 200 && String(csv.json).includes('Asha'));

  const tests = await api(null, 'GET', `/autograde/tests?repo=octocat/hello-world`);
  check('autograder gets tests for a linked repo', tests.status === 200 && tests.json.tests[0].id === 'T1', tests.json);
  check('unlinked repo gets 404', (await api(null, 'GET', '/autograde/tests?repo=nobody/none')).status === 404);
  const wf = await fetch(`${base}/autograde/workflow.yml`).then((r) => r.text());
  check('workflow file served', wf.includes('pulse-autograde') && wf.includes('PULSE_API: http://localhost:5099'));
  check('grader served', (await fetch(`${base}/autograde/grader.js`).then((r) => r.text())).includes('gcc'));

  const made = await api('u_admin', 'POST', '/admin/teachers', { email: 'fresh@pulse.test', name: 'Fresh Teacher' });
  check('admin creates a new teacher login with a 7-day link', made.status === 201 && made.json.created === true && String(made.json.link).includes('/reset-password?token='), made.json);
  check('teacher cannot create teacher logins', (await api('u_teach', 'POST', '/admin/teachers', { email: 'x@pulse.test', name: 'X Y' })).status === 403);
  const co = await api('u_teach', 'POST', `/classes/${cls.id}/co-teachers`, { email: 'co@pulse.test', name: 'Co Teacher' });
  check('co-teacher without a login becomes an admin request', co.json.result === 'requested' && co.json.co_requests.length === 1, co.json);
  check('teacher cannot approve requests', (await api('u_teach', 'GET', '/admin/co-requests')).status === 403);
  const reqs = await api('u_admin', 'GET', '/admin/co-requests');
  const ok = await api('u_admin', 'POST', `/admin/co-requests/${reqs.json.requests[0].id}`, { approve: true });
  check('admin approves: login created and added to class', ok.json.created === true && (await api('u_teach', 'GET', `/classes/${cls.id}`)).json.co_teachers.length === 1, ok.json);
  check('existing teacher added as co-teacher at once', (await api('u_teach', 'POST', `/classes/${cls.id}/co-teachers`, { email: 'teach2@pulse.test', name: 'Prof U' })).json.result === 'added');
  check('co-teacher can now open the class', (await api('u_teach2', 'GET', `/classes/${cls.id}`)).status === 200);
  await api('u_teach', 'DELETE', `/roster/${rid}`);
  check('removed student loses access at once', (await api('u_stu', 'GET', `/student/tasks/${task.id}`)).status === 404);

  console.log(`pulse live: ${pass} passed, ${fail} failed`);
  httpServer.close();
  try { fs.unlinkSync(scratch); } catch { /* */ }
  fs.rmSync(scratch.replace(/\.json$/, '-pulse'), { recursive: true, force: true });
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
