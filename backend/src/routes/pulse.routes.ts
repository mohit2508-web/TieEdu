import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { loadDb, saveDb } from '../data/db';
import { requireAuth, rateLimit } from '../middleware/auth';
import { pushAudit } from '../lib/audit';
import { sendDriveEmail } from '../lib/driveEmail';
import { issueAccountToken } from '../lib/accountTokens';
import {
  PulseError, pulseOf, isAdmin, isTeacher, canTeach, teachClass, teachTask, studentTask, studentClass, revokeTeacher, teacherList,
  createClass, updateClass, addCoTeacher, inviteStudents, reissueInvite, rosterRow, join, normaliseTask, duplicateTask, studentView, taskView, classView,
  repoFor, resultFor, linkClassRepo, saveReview, newId, CSV_HEAD, csvRow, toCsv, createTeacherAccount, coRequestList, decideCoRequest, isVerified,
} from '../lib/pulse/store';
import { parseRepo, workflowYaml, GRADER_JS } from '../lib/pulse/github';
import { syncRepo, syncTask, releaseOthers } from '../lib/pulse/sync';
import { TEMPLATES, templateInput } from '../lib/pulse/templates';
import { PACKS, addPack } from '../lib/pulse/packs';

/**
 * Project Pulse API (PROJECT_PULSE_PLAN.md §8, §12). Everything is signed-in except
 * the autograder endpoints a student's GitHub Action calls. Access is checked by
 * lib/pulse/store on every request: teachers see only their classes, students
 * only their own work. No AI anywhere: requirements are marked by the teacher.
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
const checkPassword = (pw: unknown) => {
  const s = String(pw ?? '');
  if (s.length < 8) throw new PulseError(400, 'Password must be at least 8 characters.');
  if (s.length > 128) throw new PulseError(400, 'Password is too long.');
  return s;
};

const sendInvite = (cls: any, row: any, token: string, teacher: any) => sendDriveEmail({
  to: row.email,
  subject: `${teacher?.name || 'Your teacher'} invited you to ${cls.name} on Project Pulse`,
  body: `Hi ${row.name},\n\nYou have been added to ${cls.name} (${cls.subject}) on TiEEdu Project Pulse. You will link one GitHub repo for the whole class, and put each task in its own folder.\n\nOpen the link and sign in with this email (${row.email}) to join.\n\nOr go to ${site() || 'tieedu.in'}/project-pulse/join and enter the class code: ${cls.join_code}`,
  driveName: 'Project Pulse',
  url: `/project-pulse/join?token=${encodeURIComponent(token)}`,
  ctaLabel: 'Join the class',
  note: 'Only you and your teachers can see your work. The link works once.',
});

/** A new teacher's welcome: a 7-day link to set their password (the normal reset page). */
const WELCOME_TTL_MIN = 7 * 24 * 60;
const sendTeacherWelcome = (db: any, user: any) => {
  const token = issueAccountToken(db, user.id, 'reset', new Date(), WELCOME_TTL_MIN);
  const link = `${site()}/reset-password?token=${encodeURIComponent(token)}`;
  const mail = sendDriveEmail({
    to: user.email,
    subject: 'Your TiEEdu Project Pulse teacher login',
    body: `Hi ${user.name},\n\nTiEEdu has created your teacher login for Project Pulse (${user.email}). Set your password with the link below; it works once and expires in 7 days.\n\nThen sign in and open Project Pulse → Teacher portal to create your classes.`,
    driveName: 'Project Pulse',
    url: `/reset-password?token=${encodeURIComponent(token)}`,
    ctaLabel: 'Set my password',
    note: 'Only TiEEdu admins can create teacher logins. If you did not expect this, ignore it.',
  });
  return { link, mail };
};

const classTasks = (db: any, classId: string) => pulseOf(db).tasks.filter((t) => t.class_id === classId);
const repoInfo = (db: any, cls: any, row: any) => {
  const rec = repoFor(db, cls.id, row.id);
  return {
    repo: rec?.repo ?? null, verified: isVerified(rec), verify_code: rec?.verify_code ?? null,
    synced_at: rec?.last_sync_at ?? null, error: rec?.sync_error ?? null, workflow_ok: rec?.snap?.workflow_ok ?? null,
    workflow_needed: classTasks(db, cls.id).some((t) => t.published && t.auto_tests),
  };
};

// ---------------------------------------------------------------------------
// Public: autograder (called from the student's GitHub Action)
// ---------------------------------------------------------------------------
pulseRouter.get('/autograde/grader.js', (_req, res) => { res.type('application/javascript').send(GRADER_JS); });
pulseRouter.get('/autograde/workflow.yml', (req, res) => { res.type('text/yaml').attachment('pulse-autograde.yml').send(workflowYaml(apiBase(req))); });

pulseRouter.get('/autograde/tests', rateLimit(60), h((req, res) => {
  const repo = parseRepo(String(req.query.repo || ''))?.toLowerCase();
  const p = pulseOf(loadDb());
  const classes = new Set(p.repos.filter((r) => repo && r.repo.toLowerCase() === repo).map((r) => r.class_id));
  if (!classes.size) throw new PulseError(404, 'Not linked.');
  const tasks = p.tasks.filter((t) => classes.has(t.class_id) && t.published && t.auto_tests && t.tests.length)
    .map((t) => ({ folder: t.folder, tests: t.tests.map((x: any) => ({ id: x.id, input: x.input, expected: x.expected })) }));
  res.json({ tasks });
}));

pulseRouter.post('/autograde/ping', rateLimit(30), h((req, res) => {
  const repo = parseRepo(String(req.body?.repo || ''))?.toLowerCase();
  const recs = repo ? pulseOf(loadDb()).repos.filter((r) => r.repo.toLowerCase() === repo) : [];
  // Wait a little: GitHub can take a few seconds to show the statuses just posted.
  for (const r of recs) setTimeout(() => { syncRepo(r.id).catch(() => {}); }, 8000);
  res.status(202).json({ queued: recs.length });
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
    ...classView(db, c), role: c.owner_id === me.id ? 'owner' : (c.co_teachers || []).includes(me.id) ? 'co' : 'admin',
    students: p.roster.filter((r) => r.class_id === c.id && r.status === 'active').length,
    pending: p.roster.filter((r) => r.class_id === c.id && r.status === 'pending').length,
    tasks: classTasks(db, c.id).length,
  })) : [];
  const rows = p.roster.filter((r) => r.user_id === me.id && r.status === 'active');
  const joined = rows.map((r) => ({ row: r, cls: p.classes.find((c) => c.id === r.class_id) })).filter((x) => x.cls && !x.cls.archived_at);
  const studying = joined.flatMap(({ row, cls }) => classTasks(db, cls.id).filter((t) => t.published).map((t) => {
    const v = studentView(db, t, row, 'student');
    return { task_id: t.id, title: t.title, folder: t.folder, class: classView(db, cls), deadline_at: t.deadline_at, assigned_at: t.assigned_at, status: v.status, score: v.score, repo: v.repo };
  }));
  const studentClasses = joined.map(({ row, cls }) => ({ class: classView(db, cls), ...repoInfo(db, cls, row) }));
  const pendingJoins = p.roster.filter((r) => r.user_id === me.id && r.status === 'pending').map((r) => p.classes.find((c) => c.id === r.class_id)?.name).filter(Boolean);
  res.json({ is_admin: isAdmin(me), is_teacher: isTeacher(db, me), classes: teaching, tasks: studying, student_classes: studentClasses, pending_joins: pendingJoins });
}));

pulseRouter.post('/join', rateLimit(20), h((req, res) => {
  const db = loadDb();
  const out = join(db, u(req), req.body);
  saveDb(db);
  res.json(out);
}));

/** The teacher's own one-click feedback lines. */
pulseRouter.get('/me/comments', h((req, res) => {
  res.json({ comments: pulseOf(loadDb()).settings[`comments:${req.userId}`] || [] });
}));
pulseRouter.put('/me/comments', h((req, res) => {
  const db = loadDb();
  if (!isTeacher(db, u(req))) throw new PulseError(403, 'Teachers only.');
  const list = (Array.isArray(req.body?.comments) ? req.body.comments : []).map((c: any) => String(c).trim().slice(0, 200)).filter(Boolean).slice(0, 30);
  pulseOf(db).settings[`comments:${req.userId}`] = list;
  saveDb(db);
  res.json({ comments: list });
}));

// ---- Admin -----------------------------------------------------------------
const adminOnly = (req: Request) => { if (!isAdmin(u(req))) throw new PulseError(403, 'Admins only.'); };

pulseRouter.get('/admin/teachers', h((req, res) => {
  adminOnly(req);
  const db = loadDb();
  res.json({ teachers: teacherList(db), co_requests: coRequestList(db), github_token: !!process.env.PULSE_GITHUB_TOKEN });
}));
pulseRouter.post('/admin/teachers', h(async (req, res) => {
  adminOnly(req);
  const db = loadDb();
  // An admin-set password applies only to a login created here, never to someone's existing account.
  const password = req.body?.password ? checkPassword(req.body.password) : null;
  const { user, created } = createTeacherAccount(db, u(req), req.body);
  if (created && password) { user.password_hash = bcrypt.hashSync(password, 12); user.email_verified = true; }
  pushAudit(db, { actor: actor(req), action: created ? 'pulse.teacher_created' : 'pulse.teacher_appointed', target: user.id, detail: created && password ? 'password set by admin' : '' });
  const welcome = created && !password ? sendTeacherWelcome(db, user) : null;
  saveDb(db);
  const emailed = welcome ? await welcome.mail : false;
  res.status(201).json({ teachers: teacherList(db), created, password_set: created && !!password, emailed, link: welcome?.link ?? null });
}));
pulseRouter.post('/admin/teachers/:userId/login-link', h(async (req, res) => {
  adminOnly(req);
  const db = loadDb();
  const user = (db.users || []).find((x: any) => x.id === String(req.params.userId));
  if (!user || !teacherList(db).some((t) => t.user_id === user.id)) throw new PulseError(404, 'Teacher not found.');
  const welcome = sendTeacherWelcome(db, user);
  saveDb(db);
  res.json({ emailed: await welcome.mail, link: welcome.link });
}));
pulseRouter.post('/admin/teachers/:userId/password', h((req, res) => {
  adminOnly(req);
  const db = loadDb();
  const user = (db.users || []).find((x: any) => x.id === String(req.params.userId));
  if (!user || !teacherList(db).some((t) => t.user_id === user.id)) throw new PulseError(404, 'Teacher not found.');
  if (user.role === 'admin') throw new PulseError(403, 'Admin passwords are not changed here.');
  user.password_hash = bcrypt.hashSync(checkPassword(req.body?.password), 12);
  user.email_verified = true;
  pushAudit(db, { actor: actor(req), action: 'pulse.teacher_password_set', target: user.id });
  saveDb(db);
  res.json({ teachers: teacherList(db) });
}));
pulseRouter.delete('/admin/teachers/:userId', h((req, res) => {
  adminOnly(req);
  const db = loadDb();
  revokeTeacher(db, String(req.params.userId));
  pushAudit(db, { actor: actor(req), action: 'pulse.teacher_revoked', target: String(req.params.userId) });
  saveDb(db);
  res.json({ teachers: teacherList(db) });
}));
pulseRouter.get('/admin/co-requests', h((req, res) => {
  adminOnly(req);
  res.json({ requests: coRequestList(loadDb()) });
}));
pulseRouter.post('/admin/co-requests/:id', h(async (req, res) => {
  adminOnly(req);
  const db = loadDb();
  const approve = req.body?.approve === true;
  const { user, created } = decideCoRequest(db, u(req), String(req.params.id), approve);
  pushAudit(db, { actor: actor(req), action: approve ? 'pulse.co_teacher_approved' : 'pulse.co_teacher_rejected', target: String(req.params.id) });
  const welcome = created ? sendTeacherWelcome(db, user) : null;
  saveDb(db);
  const emailed = welcome ? await welcome.mail : false;
  res.json({ requests: coRequestList(db), teachers: teacherList(db), created, emailed, link: welcome?.link ?? null });
}));

// ---- Classes & roster --------------------------------------------------------
const classDetail = (db: any, me: any, cls: any) => {
  const p = pulseOf(db);
  const name = (id: string) => (db.users || []).find((x: any) => x.id === id)?.name || '—';
  const active = p.roster.filter((r) => r.class_id === cls.id && r.status === 'active');
  return {
    ...classView(db, cls), join_code: cls.join_code, archived: !!cls.archived_at, is_owner: cls.owner_id === me.id || isAdmin(me),
    co_teachers: (cls.co_teachers || []).map((id: string) => ({ id, name: name(id) })),
    co_requests: coRequestList(db, { class_id: cls.id }),
    roster: p.roster.filter((r) => r.class_id === cls.id && r.status !== 'removed').map((r) => {
      const rec = repoFor(db, cls.id, r.id);
      return { id: r.id, name: r.name, email: r.email, roll_no: r.roll_no, status: r.status, invited_at: r.invited_at, joined_at: r.joined_at,
        repo: rec?.repo ?? null, verified: isVerified(rec) };
    }),
    repos_linked: p.repos.filter((r) => r.class_id === cls.id).length,
    tasks: classTasks(db, cls.id).map((t) => {
      const views = active.map((r) => studentView(db, t, r, 'teacher'));
      return { id: t.id, title: t.title, folder: t.folder, auto_tests: !!t.auto_tests, assigned_at: t.assigned_at, deadline_at: t.deadline_at, published: t.published,
        started: views.filter((v) => v.commits.length).length, reviewed: views.filter((v) => v.reviewed).length, done: views.filter((v) => v.status === 'done').length };
    }),
  };
};

pulseRouter.post('/classes', h((req, res) => {
  const db = loadDb();
  const pack = req.body?.pack ? PACKS[String(req.body.pack)] : null;
  const cls = createClass(db, u(req), { ...req.body, subject: req.body?.subject || pack?.subject });
  // Optional ready-made labs (for example the Wipro iOS pack), published straight away.
  if (pack) addPack(db, cls, String(req.body.pack), req.userId!);
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
  const result = addCoTeacher(db, cls, u(req), req.body);
  saveDb(db);
  res.json({ ...classDetail(db, u(req), cls), result });
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
/** Ready-made lab packs a teacher can add to a class in one go. */
pulseRouter.get('/packs', h((_req, res) => {
  res.json({ packs: Object.entries(PACKS).map(([id, p]) => ({ id, title: p.title, subject: p.subject, count: p.labs.length })) });
}));
pulseRouter.post('/classes/:id/packs/:pack', h((req, res) => {
  const db = loadDb();
  const cls = teachClass(db, u(req), String(req.params.id));
  const added = addPack(db, cls, String(req.params.pack), req.userId!);
  saveDb(db);
  res.json({ added, class: classDetail(db, u(req), cls) });
}));
pulseRouter.get('/templates', h((_req, res) => {
  res.json({ templates: TEMPLATES.map((t) => ({ id: t.id, title: t.title, level: t.level, summary: t.summary, input: templateInput(t) })) });
}));
/** Every task across the classes this teacher teaches — the source list for "copy a task". */
pulseRouter.get('/teacher/tasks', h((req, res) => {
  const db = loadDb();
  const p = pulseOf(db);
  const mine = p.classes.filter((c) => canTeach(db, u(req), c));
  res.json({ tasks: p.tasks.filter((t) => mine.some((c) => c.id === t.class_id)).map((t) => ({
    id: t.id, title: t.title, class_id: t.class_id, class_name: mine.find((c) => c.id === t.class_id)?.name || '', created_at: t.created_at,
  })) });
}));
pulseRouter.post('/classes/:id/tasks', h((req, res) => {
  const db = loadDb();
  const cls = teachClass(db, u(req), String(req.params.id));
  const task = { id: newId('task'), class_id: cls.id, created_by: req.userId, created_at: new Date().toISOString(), ...normaliseTask(req.body, {}, { db, classId: cls.id }) };
  pulseOf(db).tasks.push(task);
  saveDb(db);
  res.status(201).json(taskView(task));
}));
pulseRouter.post('/tasks/:id/duplicate', h((req, res) => {
  const db = loadDb();
  const { task } = teachTask(db, u(req), String(req.params.id));
  const target = teachClass(db, u(req), String(req.body?.class_id || task.class_id));
  const copy = duplicateTask(db, task, target.id, req.userId!);
  saveDb(db);
  res.status(201).json(taskView(copy));
}));
pulseRouter.get('/tasks/:id', h((req, res) => {
  const { task } = teachTask(loadDb(), u(req), String(req.params.id));
  res.json(taskView(task));
}));
pulseRouter.put('/tasks/:id', h((req, res) => {
  const db = loadDb();
  const { task } = teachTask(db, u(req), String(req.params.id));
  Object.assign(task, normaliseTask(req.body, task, { db, classId: task.class_id, selfId: task.id }), { updated_at: new Date().toISOString() });
  saveDb(db);
  res.json(taskView(task));
}));
pulseRouter.delete('/tasks/:id', h((req, res) => {
  const db = loadDb();
  const { task } = teachTask(db, u(req), String(req.params.id));
  const p = pulseOf(db);
  p.results = p.results.filter((r) => r.task_id !== task.id);
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
  const lastSync = pulseOf(db).repos.filter((r) => r.class_id === cls.id).map((r) => r.last_sync_at).filter(Boolean).sort().pop() ?? null;
  res.json({ cls: classView(db, cls), task: taskView(task), students, now: new Date().toISOString(), last_sync: lastSync });
}));

pulseRouter.get('/tasks/:id/export.csv', h((req, res) => {
  const db = loadDb();
  const { task, cls } = teachTask(db, u(req), String(req.params.id));
  const rows = rosterOf(db, cls).map((r) => csvRow(task, studentView(db, task, r, 'teacher')));
  res.type('text/csv').attachment(`pulse-${task.folder}.csv`).send(toCsv([CSV_HEAD(task), ...rows]));
}));

pulseRouter.post('/tasks/:id/sync', rateLimit(6), h(async (req, res) => {
  const { task } = teachTask(loadDb(), u(req), String(req.params.id));
  res.json({ synced: await syncTask(task.id) });
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
    cls: classView(db, cls), task: taskView(task), student, now: new Date().toISOString(),
    prev: list[(i - 1 + list.length) % list.length].id, next: list[(i + 1) % list.length].id, position: i + 1, total: list.length,
  });
}));

const teacherRow = (db: any, req: Request) => {
  const { task, cls } = teachTask(db, u(req), String(req.params.id));
  const row = rosterOf(db, cls).find((r) => r.id === String(req.params.rid));
  if (!row) throw new PulseError(404, 'Student not found.');
  return { task, cls, row, rec: repoFor(db, cls.id, row.id) };
};

pulseRouter.post('/tasks/:id/students/:rid/sync', rateLimit(20), h(async (req, res) => {
  const { rec } = teacherRow(loadDb(), req);
  if (!rec) throw new PulseError(400, 'This student has not linked a repo yet.');
  await syncRepo(rec.id);
  res.json({ ok: true });
}));
pulseRouter.post('/tasks/:id/students/:rid/verify', h((req, res) => {
  const db = loadDb();
  const { rec } = teacherRow(db, req);
  if (!rec) throw new PulseError(400, 'This student has not linked a repo yet.');
  const on = req.body?.verified === true;
  rec.verified_by_teacher = on;
  if (req.body?.reset_owner === true) rec.verified_owner = null;
  if (on) releaseOthers(pulseOf(db), rec);
  pushAudit(db, { actor: actor(req), action: on ? 'pulse.repo_verified_by_teacher' : 'pulse.repo_unverified_by_teacher', target: rec.id, detail: rec.repo });
  saveDb(db);
  res.json({ ok: true });
}));
/** One call per student in Review mode: verdicts, score, feedback. */
pulseRouter.post('/tasks/:id/students/:rid/review', h((req, res) => {
  const db = loadDb();
  const { task, row } = teacherRow(db, req);
  saveReview(db, task, row, req.body, req.userId!);
  pushAudit(db, { actor: actor(req), action: 'pulse.reviewed', target: row.id, detail: task.id });
  saveDb(db);
  res.json({ student: studentView(db, task, row, 'teacher') });
}));
pulseRouter.post('/tasks/:id/students/:rid/feedback', h((req, res) => {
  const db = loadDb();
  const { task, row } = teacherRow(db, req);
  const body = String(req.body?.body || '').trim().slice(0, 2000);
  if (!body) throw new PulseError(400, 'Write some feedback first.');
  resultFor(db, task.id, row.id, true).feedback.push({ id: newId('fb'), by: req.userId, body, at: new Date().toISOString() });
  saveDb(db);
  res.json({ ok: true });
}));
pulseRouter.post('/tasks/:id/students/:rid/note', h((req, res) => {
  const db = loadDb();
  const { task, row } = teacherRow(db, req);
  const body = String(req.body?.body || '').trim().slice(0, 2000);
  if (!body) throw new PulseError(400, 'Write a note first.');
  resultFor(db, task.id, row.id, true).notes.push({ id: newId('nt'), by: req.userId, body, at: new Date().toISOString() });
  saveDb(db);
  res.json({ ok: true });
}));
pulseRouter.post('/tasks/:id/students/:rid/override', h((req, res) => {
  const db = loadDb();
  const { task, row } = teacherRow(db, req);
  const reason = String(req.body?.reason || '').trim().slice(0, 300);
  if (req.body?.req_id) {
    saveReview(db, task, row, { verdicts: { [req.body.req_id]: req.body.verdict ?? null }, reasons: { [req.body.req_id]: reason } }, req.userId!);
  } else if (req.body?.score === null) {
    saveReview(db, task, row, { score: null }, req.userId!);
  } else {
    if (!reason) throw new PulseError(400, 'Give a reason; it is kept in the log.');
    saveReview(db, task, row, { score: req.body?.score, reason }, req.userId!);
  }
  pushAudit(db, { actor: actor(req), action: 'pulse.override', target: row.id, detail: reason, meta: req.body });
  saveDb(db);
  res.json({ ok: true });
}));

// ---- Student -----------------------------------------------------------------
pulseRouter.get('/student/tasks/:id', h((req, res) => {
  const db = loadDb();
  const { task, row, cls } = studentTask(db, u(req), String(req.params.id));
  res.json({ cls: classView(db, cls), task: taskView(task), student: studentView(db, task, row, 'student'), repo: repoInfo(db, cls, row), now: new Date().toISOString() });
}));
pulseRouter.post('/student/classes/:id/repo', rateLimit(10), h(async (req, res) => {
  const db = loadDb();
  const { cls, row } = studentClass(db, u(req), String(req.params.id));
  const repo = parseRepo(String(req.body?.url || ''));
  if (!repo) throw new PulseError(400, 'Paste the full repo link, like https://github.com/your-name/c-lab-2026');
  const rec = linkClassRepo(db, cls, row, repo);
  saveDb(db);
  await syncRepo(rec.id);
  res.json({ repo: repoInfo(loadDb(), cls, row) });
}));
pulseRouter.post('/student/classes/:id/recheck', rateLimit(10), h(async (req, res) => {
  const db = loadDb();
  const { cls, row } = studentClass(db, u(req), String(req.params.id));
  const rec = repoFor(db, cls.id, row.id);
  if (!rec) throw new PulseError(400, 'Link your repo first.');
  const last = rec.last_recheck_at ? Date.now() - new Date(rec.last_recheck_at).getTime() : Infinity;
  if (last < 5 * 60000) throw new PulseError(429, `You can re-check again in ${Math.ceil((5 * 60000 - last) / 60000)} min.`);
  rec.last_recheck_at = new Date().toISOString();
  saveDb(db);
  await syncRepo(rec.id);
  res.json({ repo: repoInfo(loadDb(), cls, row) });
}));
