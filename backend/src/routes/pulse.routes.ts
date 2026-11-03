import { Router, Request, Response, NextFunction } from 'express';
import { loadDb, saveDb } from '../data/db';
import { requireAuth, rateLimit } from '../middleware/auth';
import { pushAudit } from '../lib/audit';
import { sendDriveEmail } from '../lib/driveEmail';
import {
  PulseError, pulseOf, isAdmin, isTeacher, canTeach, teachClass, teachTask, studentTask, appointTeacher, revokeTeacher, teacherList,
  createClass, updateClass, addCoTeacher, inviteStudents, reissueInvite, rosterRow, join, normaliseTask, studentView, taskView, classView,
  subFor, linkRepo, newId, CSV_HEAD, csvRow, toCsv, dropFiles,
} from '../lib/pulse/store';
import { parseRepo, workflowYaml, GRADER_JS } from '../lib/pulse/github';
import { syncSubmission, syncTask, releaseOthers } from '../lib/pulse/sync';
import { aiEnabled } from '../lib/pulse/review';

/**
 * Project Pulse API (PROJECT_PULSE_PLAN.md §8). Everything is signed-in except
 * the three autograder endpoints a student's GitHub Action calls. Access is
 * checked by lib/pulse/store on every request: teachers see only their classes,
 * students only their own submission.
 */
export const pulseRouter = Router();

type H = (req: Request, res: Response) => unknown | Promise<unknown>;
const h = (fn: H) => async (req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Cache-Control', 'private, no-store');
  try { await fn(req, res); } catch (err) {
    if (err instanceof PulseError) return res.status(err.status).json({ error: err.message });
    next(err);
  }
};
const u = (req: Request) => req.user as any;
const actor = (req: Request) => `user:${req.userId}`;
const site = () => (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '');
const apiBase = (req: Request) => (process.env.PULSE_API_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');

const sendInvite = (cls: any, row: any, token: string, teacher: any) => sendDriveEmail({
  to: row.email,
  subject: `${teacher?.name || 'Your teacher'} invited you to ${cls.name} on Project Pulse`,
  body: `Hi ${row.name},\n\nYou have been added to ${cls.name} (${cls.subject}) on TieEdu Project Pulse. Your teacher will see the progress of your coding tasks from your GitHub repo.\n\nOpen the link and sign in with this email (${row.email}) to join.`,
  driveName: 'Project Pulse',
  url: `/project-pulse/join?token=${encodeURIComponent(token)}`,
  ctaLabel: 'Join the class',
  note: 'Only you and your teachers can see your work. The link works once.',
});

// ---------------------------------------------------------------------------
// Public: autograder (called from the student's GitHub Action)
// ---------------------------------------------------------------------------
pulseRouter.get('/autograde/grader.js', (_req, res) => { res.type('application/javascript').send(GRADER_JS); });
pulseRouter.get('/autograde/workflow.yml', (req, res) => { res.type('text/yaml').attachment('pulse-autograde.yml').send(workflowYaml(apiBase(req))); });

pulseRouter.get('/autograde/tests', rateLimit(60), h((req, res) => {
  const repo = parseRepo(String(req.query.repo || ''))?.toLowerCase();
  const p = pulseOf(loadDb());
  const sub = repo && p.subs.find((s) => s.repo.toLowerCase() === repo);
  const task = sub && p.tasks.find((t) => t.id === sub.task_id);
  if (!task) throw new PulseError(404, 'Not linked.');
  res.json({ tests: task.tests.map((t: any) => ({ id: t.id, input: t.input, expected: t.expected })) });
}));

pulseRouter.post('/autograde/ping', rateLimit(30), h((req, res) => {
  const repo = parseRepo(String(req.body?.repo || ''))?.toLowerCase();
  const subs = repo ? pulseOf(loadDb()).subs.filter((s) => s.repo.toLowerCase() === repo) : [];
  // Wait a little: GitHub can take a few seconds to show the statuses just posted.
  for (const s of subs) setTimeout(() => { syncSubmission(s.id).catch(() => {}); }, 8000);
  res.status(202).json({ queued: subs.length });
}));

// ---------------------------------------------------------------------------
// Everything below needs a signed-in user
// ---------------------------------------------------------------------------
pulseRouter.use(requireAuth);

pulseRouter.get('/me', h((req, res) => {
  const db = loadDb();
  const p = pulseOf(db);
  const me = u(req);
  const teaching = isTeacher(db, me) ? p.classes.filter((c) => !c.archived_at && canTeach(db, me, c)).map((c) => ({
    ...classView(db, c), role: c.owner_id === me.id ? 'owner' : isAdmin(me) && c.owner_id !== me.id && !(c.co_teachers || []).includes(me.id) ? 'admin' : 'co',
    students: p.roster.filter((r) => r.class_id === c.id && r.status === 'active').length,
    pending: p.roster.filter((r) => r.class_id === c.id && r.status === 'pending').length,
    tasks: p.tasks.filter((t) => t.class_id === c.id).length,
  })) : [];
  const studying = p.roster.filter((r) => r.user_id === me.id && r.status === 'active').flatMap((r) => {
    const cls = p.classes.find((c) => c.id === r.class_id);
    if (!cls || cls.archived_at) return [];
    return p.tasks.filter((t) => t.class_id === cls.id && t.published).map((t) => {
      const v = studentView(db, t, r, 'student');
      return { task_id: t.id, title: t.title, class: classView(db, cls), deadline_at: t.deadline_at, assigned_at: t.assigned_at, status: v.status, score: v.score, repo: v.repo };
    });
  });
  const pendingJoins = p.roster.filter((r) => r.user_id === me.id && r.status === 'pending').map((r) => p.classes.find((c) => c.id === r.class_id)?.name).filter(Boolean);
  res.json({ is_admin: isAdmin(me), is_teacher: isTeacher(db, me), classes: teaching, tasks: studying, pending_joins: pendingJoins, ai_review: aiEnabled(db) });
}));

pulseRouter.post('/join', rateLimit(20), h((req, res) => {
  const db = loadDb();
  const out = join(db, u(req), req.body);
  saveDb(db);
  res.json(out);
}));

// ---- Admin -----------------------------------------------------------------
const adminOnly = (req: Request) => { if (!isAdmin(u(req))) throw new PulseError(403, 'Admins only.'); };

pulseRouter.get('/admin/teachers', h((req, res) => {
  adminOnly(req);
  const db = loadDb();
  res.json({ teachers: teacherList(db), ai_review: db.pulse?.settings?.ai_review === true, ai_key: !!process.env.ANTHROPIC_API_KEY, github_token: !!process.env.PULSE_GITHUB_TOKEN });
}));
pulseRouter.post('/admin/teachers', h((req, res) => {
  adminOnly(req);
  const db = loadDb();
  const user = appointTeacher(db, u(req), req.body?.email);
  pushAudit(db, { actor: actor(req), action: 'pulse.teacher_appointed', target: user.id });
  saveDb(db);
  res.status(201).json({ teachers: teacherList(db) });
}));
pulseRouter.delete('/admin/teachers/:userId', h((req, res) => {
  adminOnly(req);
  const db = loadDb();
  revokeTeacher(db, String(req.params.userId));
  pushAudit(db, { actor: actor(req), action: 'pulse.teacher_revoked', target: String(req.params.userId) });
  saveDb(db);
  res.json({ teachers: teacherList(db) });
}));
pulseRouter.put('/admin/settings', h((req, res) => {
  adminOnly(req);
  const db = loadDb();
  pulseOf(db).settings.ai_review = req.body?.ai_review === true;
  saveDb(db);
  res.json({ ai_review: pulseOf(db).settings.ai_review });
}));

// ---- Classes & roster --------------------------------------------------------
const classDetail = (db: any, me: any, cls: any) => {
  const p = pulseOf(db);
  const name = (id: string) => (db.users || []).find((x: any) => x.id === id)?.name || '—';
  return {
    ...classView(db, cls), join_code: cls.join_code, archived: !!cls.archived_at, is_owner: cls.owner_id === me.id || isAdmin(me),
    co_teachers: (cls.co_teachers || []).map((id: string) => ({ id, name: name(id) })),
    roster: p.roster.filter((r) => r.class_id === cls.id && r.status !== 'removed').map((r) => ({
      id: r.id, name: r.name, email: r.email, roll_no: r.roll_no, status: r.status, invited_at: r.invited_at, joined_at: r.joined_at,
    })),
    tasks: p.tasks.filter((t) => t.class_id === cls.id).map((t) => ({
      id: t.id, title: t.title, assigned_at: t.assigned_at, deadline_at: t.deadline_at, published: t.published,
      linked: p.subs.filter((s) => s.task_id === t.id).length,
      done: p.roster.filter((r) => r.class_id === cls.id && r.status === 'active' && studentView(db, t, r, 'teacher').status === 'done').length,
    })),
  };
};

pulseRouter.post('/classes', h((req, res) => {
  const db = loadDb();
  const cls = createClass(db, u(req), req.body);
  saveDb(db);
  res.status(201).json(classDetail(db, u(req), cls));
}));
pulseRouter.get('/classes/:id', h((req, res) => {
  const db = loadDb();
  res.json(classDetail(db, u(req), teachClass(db, u(req), String(req.params.id))));
}));
pulseRouter.patch('/classes/:id', h((req, res) => {
  const db = loadDb();
  const cls = teachClass(db, u(req), String(req.params.id));
  updateClass(cls, req.body);
  saveDb(db);
  res.json(classDetail(db, u(req), cls));
}));
pulseRouter.post('/classes/:id/co-teachers', h((req, res) => {
  const db = loadDb();
  const cls = teachClass(db, u(req), String(req.params.id));
  addCoTeacher(db, cls, u(req), req.body?.email);
  saveDb(db);
  res.json(classDetail(db, u(req), cls));
}));
pulseRouter.post('/classes/:id/roster', rateLimit(10), h(async (req, res) => {
  const db = loadDb();
  const cls = teachClass(db, u(req), String(req.params.id));
  const { invited, skipped } = inviteStudents(db, cls, req.body?.entries);
  pushAudit(db, { actor: actor(req), action: 'pulse.students_invited', target: cls.id, detail: `${invited.length} invited` });
  saveDb(db);
  // Emails after the save; a mail failure never undoes an invite.
  let emailed = 0;
  for (const { row, token } of invited) if (await sendInvite(cls, row, token, u(req))) emailed++;
  const links = invited.map(({ row, token }) => ({ email: row.email, link: `${site()}/project-pulse/join?token=${encodeURIComponent(token)}` }));
  res.json({ ...classDetail(db, u(req), cls), invited: invited.length, emailed, skipped, links });
}));
pulseRouter.post('/roster/:id/resend', rateLimit(20), h(async (req, res) => {
  const db = loadDb();
  const row = rosterRow(db, u(req), String(req.params.id));
  const token = reissueInvite(row);
  saveDb(db);
  const cls = pulseOf(db).classes.find((c) => c.id === row.class_id);
  const emailed = await sendInvite(cls, row, token, u(req));
  res.json({ emailed, link: `${site()}/project-pulse/join?token=${encodeURIComponent(token)}` });
}));
pulseRouter.post('/roster/:id/approve', h((req, res) => {
  const db = loadDb();
  const row = rosterRow(db, u(req), String(req.params.id));
  if (row.status !== 'pending') throw new PulseError(400, 'Nothing to approve.');
  row.status = 'active';
  row.joined_at = new Date().toISOString();
  saveDb(db);
  res.json({ ok: true });
}));
pulseRouter.patch('/roster/:id', h((req, res) => {
  const db = loadDb();
  const row = rosterRow(db, u(req), String(req.params.id));
  if (req.body?.name) row.name = String(req.body.name).trim().slice(0, 80);
  if (req.body?.roll_no !== undefined) row.roll_no = String(req.body.roll_no).trim().slice(0, 30);
  saveDb(db);
  res.json({ ok: true });
}));
pulseRouter.delete('/roster/:id', h((req, res) => {
  const db = loadDb();
  const row = rosterRow(db, u(req), String(req.params.id));
  Object.assign(row, { status: 'removed', removed_at: new Date().toISOString(), token_hash: null });
  pushAudit(db, { actor: actor(req), action: 'pulse.student_removed', target: row.id });
  saveDb(db);
  res.json({ ok: true });
}));

// ---- Tasks -------------------------------------------------------------------
pulseRouter.post('/classes/:id/tasks', h((req, res) => {
  const db = loadDb();
  const cls = teachClass(db, u(req), String(req.params.id));
  const task = { id: newId('task'), class_id: cls.id, created_by: req.userId, created_at: new Date().toISOString(), ...normaliseTask(req.body) };
  pulseOf(db).tasks.push(task);
  saveDb(db);
  res.status(201).json(taskView(task, 'teacher'));
}));
pulseRouter.get('/tasks/:id', h((req, res) => {
  const { task } = teachTask(loadDb(), u(req), String(req.params.id));
  res.json(taskView(task, 'teacher'));
}));
pulseRouter.put('/tasks/:id', h((req, res) => {
  const db = loadDb();
  const { task } = teachTask(db, u(req), String(req.params.id));
  const changedReqs = JSON.stringify(task.requirements) !== JSON.stringify(normaliseTask(req.body, task).requirements);
  Object.assign(task, normaliseTask(req.body, task), { updated_at: new Date().toISOString() });
  // New requirements invalidate cached reviews.
  if (changedReqs) for (const s of pulseOf(db).subs) if (s.task_id === task.id && s.snap) s.snap.review_sha = '';
  saveDb(db);
  res.json(taskView(task, 'teacher'));
}));
pulseRouter.delete('/tasks/:id', h((req, res) => {
  const db = loadDb();
  const { task } = teachTask(db, u(req), String(req.params.id));
  const p = pulseOf(db);
  p.subs.filter((s) => s.task_id === task.id).forEach((s) => dropFiles(s.id));
  p.subs = p.subs.filter((s) => s.task_id !== task.id);
  p.tasks = p.tasks.filter((t) => t.id !== task.id);
  delete p.similarity[task.id];
  pushAudit(db, { actor: actor(req), action: 'pulse.task_deleted', target: task.id });
  saveDb(db);
  res.json({ ok: true });
}));

const rosterOf = (db: any, cls: any) => pulseOf(db).roster.filter((r) => r.class_id === cls.id && r.status === 'active');

pulseRouter.get('/tasks/:id/dashboard', h((req, res) => {
  const db = loadDb();
  const { task, cls } = teachTask(db, u(req), String(req.params.id));
  const students = rosterOf(db, cls).map((r) => studentView(db, task, r, 'teacher'));
  const lastSync = pulseOf(db).subs.filter((s) => s.task_id === task.id).map((s) => s.last_sync_at).filter(Boolean).sort().pop() ?? null;
  res.json({ cls: classView(db, cls), task: taskView(task, 'teacher'), students, now: new Date().toISOString(), last_sync: lastSync });
}));

pulseRouter.get('/tasks/:id/export.csv', h((req, res) => {
  const db = loadDb();
  const { task, cls } = teachTask(db, u(req), String(req.params.id));
  const rows = rosterOf(db, cls).map((r) => csvRow(task, studentView(db, task, r, 'teacher')));
  res.type('text/csv').attachment(`pulse-${task.id}.csv`).send(toCsv([CSV_HEAD(task), ...rows]));
}));

pulseRouter.post('/tasks/:id/sync', rateLimit(6), h(async (req, res) => {
  const { task } = teachTask(loadDb(), u(req), String(req.params.id));
  const n = await syncTask(task.id, req.body?.force === true);
  res.json({ synced: n });
}));

pulseRouter.get('/tasks/:id/students/:rid', h((req, res) => {
  const db = loadDb();
  const { task, cls } = teachTask(db, u(req), String(req.params.id));
  const list = rosterOf(db, cls);
  const i = list.findIndex((r) => r.id === String(req.params.rid));
  if (i < 0) throw new PulseError(404, 'Student not found.');
  const student = studentView(db, task, list[i], 'teacher', true);
  pushAudit(db, { actor: actor(req), action: 'pulse.code_viewed', target: list[i].id, detail: task.id });
  saveDb(db);
  res.json({
    cls: classView(db, cls), task: taskView(task, 'teacher'), student, now: new Date().toISOString(),
    prev: list[(i - 1 + list.length) % list.length].id, next: list[(i + 1) % list.length].id,
  });
}));

const teacherSub = (db: any, req: Request) => {
  const { task } = teachTask(db, u(req), String(req.params.id));
  const sub = subFor(db, task.id, String(req.params.rid));
  if (!sub) throw new PulseError(400, 'This student has not linked a repo yet.');
  return { task, sub };
};

pulseRouter.post('/tasks/:id/students/:rid/sync', rateLimit(20), h(async (req, res) => {
  const { sub } = teacherSub(loadDb(), req);
  await syncSubmission(sub.id, { force: req.body?.force === true });
  res.json({ ok: true });
}));
pulseRouter.post('/tasks/:id/students/:rid/verify', h((req, res) => {
  const db = loadDb();
  const { sub } = teacherSub(db, req);
  const on = req.body?.verified === true;
  sub.verified_by_teacher = on;
  if (req.body?.reset_owner === true) sub.verified_owner = null;
  if (on) releaseOthers(pulseOf(db), sub);
  pushAudit(db, { actor: actor(req), action: on ? 'pulse.repo_verified_by_teacher' : 'pulse.repo_unverified_by_teacher', target: sub.id, detail: sub.repo });
  saveDb(db);
  res.json({ ok: true });
}));
pulseRouter.post('/tasks/:id/students/:rid/feedback', h((req, res) => {
  const db = loadDb();
  const { sub } = teacherSub(db, req);
  const body = String(req.body?.body || '').trim().slice(0, 2000);
  if (!body) throw new PulseError(400, 'Write some feedback first.');
  sub.feedback.push({ id: newId('fb'), by: req.userId, body, at: new Date().toISOString() });
  saveDb(db);
  res.json({ ok: true });
}));
pulseRouter.post('/tasks/:id/students/:rid/note', h((req, res) => {
  const db = loadDb();
  const { sub } = teacherSub(db, req);
  const body = String(req.body?.body || '').trim().slice(0, 2000);
  if (!body) throw new PulseError(400, 'Write a note first.');
  sub.notes = [...(sub.notes || []), { id: newId('nt'), by: req.userId, body, at: new Date().toISOString() }];
  saveDb(db);
  res.json({ ok: true });
}));
pulseRouter.post('/tasks/:id/students/:rid/override', h((req, res) => {
  const db = loadDb();
  const { task, sub } = teacherSub(db, req);
  const reason = String(req.body?.reason || '').trim().slice(0, 300);
  if (req.body?.req_id) {
    const v = req.body.verdict;
    if (!task.requirements.some((r: any) => r.id === req.body.req_id)) throw new PulseError(400, 'Unknown requirement.');
    if (v === null) delete sub.req_overrides[req.body.req_id];
    else if (['met', 'partial', 'missing'].includes(v)) sub.req_overrides[req.body.req_id] = { verdict: v, reason, by: req.userId, at: new Date().toISOString() };
    else throw new PulseError(400, 'Verdict must be met, partial or missing.');
  } else if (req.body?.score === null) {
    sub.override = null;
  } else {
    const score = Number(req.body?.score);
    if (!Number.isInteger(score) || score < 0 || score > 100) throw new PulseError(400, 'Score must be 0–100.');
    if (!reason) throw new PulseError(400, 'Give a reason; it is kept in the log.');
    sub.override = { score, reason, by: req.userId, at: new Date().toISOString() };
  }
  pushAudit(db, { actor: actor(req), action: 'pulse.override', target: sub.id, detail: reason, meta: req.body });
  saveDb(db);
  res.json({ ok: true });
}));

// ---- Student -----------------------------------------------------------------
pulseRouter.get('/student/tasks/:id', h((req, res) => {
  const db = loadDb();
  const { task, row, cls } = studentTask(db, u(req), String(req.params.id));
  res.json({ cls: classView(db, cls), task: taskView(task, 'student'), student: studentView(db, task, row, 'student'), now: new Date().toISOString() });
}));
pulseRouter.post('/student/tasks/:id/repo', rateLimit(10), h(async (req, res) => {
  const db = loadDb();
  const { task, row } = studentTask(db, u(req), String(req.params.id));
  const repo = parseRepo(String(req.body?.url || ''));
  if (!repo) throw new PulseError(400, 'Paste the full repo link, like https://github.com/your-name/c-task-3');
  const sub = linkRepo(db, task, row, repo);
  saveDb(db);
  await syncSubmission(sub.id);
  const fresh = loadDb();
  res.json({ student: studentView(fresh, task, row, 'student'), error: subFor(fresh, task.id, row.id)?.sync_error ?? null });
}));
pulseRouter.post('/student/tasks/:id/recheck', rateLimit(10), h(async (req, res) => {
  const db = loadDb();
  const { task, row } = studentTask(db, u(req), String(req.params.id));
  const sub = subFor(db, task.id, row.id);
  if (!sub) throw new PulseError(400, 'Link your repo first.');
  const last = sub.last_recheck_at ? Date.now() - new Date(sub.last_recheck_at).getTime() : Infinity;
  if (last < 10 * 60000) throw new PulseError(429, `You can re-check again in ${Math.ceil((10 * 60000 - last) / 60000)} min.`);
  sub.last_recheck_at = new Date().toISOString();
  saveDb(db);
  await syncSubmission(sub.id);
  res.json({ student: studentView(loadDb(), task, row, 'student') });
}));
