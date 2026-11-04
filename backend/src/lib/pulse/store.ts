import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

/**
 * Project Pulse — data, access rules and views (PROJECT_PULSE_PLAN.md §2, §7).
 *
 * Everything lives under `db.pulse` in the JSON store; source files of the latest
 * sync live beside it in data/pulse/<repo>.json so the main store stays small.
 *
 * v2 (§12): each student links ONE repo per class; each task is a folder in it
 * (task-1/, task-2/ …). Requirements are marked only by the teacher — no AI.
 *
 * Access is the whole point, so it is decided here and nowhere else:
 *   admin   — everything; appoints teachers
 *   teacher — only classes they own or co-teach
 *   student — only their own submission, and only for a class they were invited to
 * The views shape data for each role: a student view never carries another
 * student's name, the teacher's private notes, or integrity flags.
 */

export class PulseError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export type Verdict = 'met' | 'partial' | 'missing' | 'unreviewed';
export interface Requirement { id: string; title: string; detail: string }
export interface TestCase { id: string; name: string; input: string; expected: string; req_id: string | null }
export interface SourceFile { path: string; code: string }
export interface ReqResult { verdict: Verdict; reason: string; evidence: { file: string; from: number; to: number } | null }
export interface TestResult { pass: boolean; got: string }
export interface Commit { sha: string; at: string; pushed: string; message: string; add: number; del: number }
export interface Flag { kind: string; text: string; withId?: string; score?: number }

export interface RepoCommit { sha: string; at: string; pushed: string; message: string; add: number; del: number; files: { p: string; a: number; d: number }[] }
export interface RepoSnapshot {
  head_sha: string;
  synced_at: string;
  commits: RepoCommit[];
  statuses: Record<string, { state: string; description: string }>;
  workflow_ok: boolean;
  dirs: string[];
}

export const MAX_COMMITS_KEPT = 400;
// Beside the store file: a test that points DB_FILE at a scratch store keeps its repo cache there too.
const DATA_DIR = process.env.DB_FILE
  ? path.join(path.dirname(path.resolve(process.env.DB_FILE)), `${path.basename(process.env.DB_FILE, '.json')}-pulse`)
  : path.join(__dirname, '../../../data/pulse');

export const pulseOf = (db: any) => {
  if (!db.pulse) db.pulse = {};
  const p = db.pulse;
  for (const k of ['teachers', 'classes', 'roster', 'tasks', 'repos', 'results']) if (!Array.isArray(p[k])) p[k] = [];
  if (!p.similarity) p.similarity = {};
  if (!p.settings) p.settings = {};
  if (!Array.isArray(p.alerts)) p.alerts = [];
  if (!Array.isArray(p.co_requests)) p.co_requests = [];
  if (Array.isArray(p.subs) && !p.migrated_v2) migrateV2(p);
  return p as {
    teachers: any[]; classes: any[]; roster: any[]; tasks: any[]; repos: any[]; results: any[];
    similarity: Record<string, { a: string; b: string; score: number }[]>; settings: any;
    alerts: { class_id: string; roster_id: string; text: string; at: string }[];
    co_requests: { id: string; class_id: string; requested_by: string; name: string; email: string; status: 'pending' | 'approved' | 'rejected'; at: string; decided_at?: string }[];
  };
};

/**
 * v1 → v2, once: one repo per task becomes one repo per student per class; the
 * teacher's marks move to per-task results; every task gets a folder.
 */
function migrateV2(p: any) {
  const counts: Record<string, number> = {};
  for (const t of p.tasks) {
    counts[t.class_id] = (counts[t.class_id] || 0) + 1;
    if (!t.folder) t.folder = `task-${counts[t.class_id]}`;
    if (t.auto_tests === undefined) t.auto_tests = (t.tests || []).length > 0;
    for (const r of t.requirements || []) delete r.hints;
  }
  for (const sub of p.subs) {
    const task = p.tasks.find((t: any) => t.id === sub.task_id);
    if (!task) continue;
    if (!p.repos.some((r: any) => r.class_id === task.class_id && r.roster_id === sub.roster_id)) {
      p.repos.push({ id: sub.id, class_id: task.class_id, roster_id: sub.roster_id, repo: sub.repo, verify_code: sub.verify_code,
        verified: !!sub.verified, verified_by_teacher: !!sub.verified_by_teacher, verified_owner: sub.verified_owner ?? null,
        linked_at: sub.linked_at, last_sync_at: null, sync_error: null, snap: null });
    }
    const reqs: any = {};
    for (const [id, o] of Object.entries(sub.req_overrides || {})) reqs[id] = { verdict: (o as any).verdict, by: (o as any).by, at: (o as any).at, reason: (o as any).reason || '' };
    p.results.push({ task_id: task.id, roster_id: sub.roster_id, reqs, override: sub.override ?? null, feedback: sub.feedback || [], notes: sub.notes || [] });
  }
  p.alerts = [];
  p.similarity = {};
  delete p.subs;
  if (p.settings) delete p.settings.ai_review;
  p.migrated_v2 = true;
}

export const newId = (prefix: string) => `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
export const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex');
const iso = () => new Date().toISOString();
const clean = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);
const email = (v: unknown) => clean(v, 200).toLowerCase();
const validEmail = (e: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);

// ---------------------------------------------------------------------------
// Files on disk
// ---------------------------------------------------------------------------
export interface FileCache { files: (SourceFile & { sha: string })[]; stats: Record<string, { add: number; del: number; files?: { p: string; a: number; d: number }[] }> }
const filePath = (subId: string) => path.join(DATA_DIR, `${subId.replace(/[^\w-]/g, '')}.json`);
export const readFiles = (subId: string): FileCache => {
  try { return JSON.parse(fs.readFileSync(filePath(subId), 'utf8')); } catch { return { files: [], stats: {} }; }
};
export const writeFiles = (subId: string, cache: FileCache) => {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(filePath(subId), JSON.stringify(cache));
};
export const dropFiles = (subId: string) => { try { fs.unlinkSync(filePath(subId)); } catch { /* none */ } };

// ---------------------------------------------------------------------------
// Access
// ---------------------------------------------------------------------------
type U = { id: string; role?: string; email?: string; name?: string };
export const isAdmin = (u: U | undefined) => u?.role === 'admin';
export const isTeacher = (db: any, u: U) => isAdmin(u) || pulseOf(db).teachers.some((t) => t.user_id === u.id && !t.revoked_at);
export const canTeach = (db: any, u: U, cls: any) =>
  isAdmin(u) || (isTeacher(db, u) && (cls.owner_id === u.id || (cls.co_teachers || []).includes(u.id)));

export const teachClass = (db: any, u: U, classId: string) => {
  const cls = pulseOf(db).classes.find((c) => c.id === classId);
  if (!cls || !canTeach(db, u, cls)) throw new PulseError(404, 'Class not found.');
  return cls;
};
export const teachTask = (db: any, u: U, taskId: string) => {
  const task = pulseOf(db).tasks.find((t) => t.id === taskId);
  if (!task) throw new PulseError(404, 'Task not found.');
  return { task, cls: teachClass(db, u, task.class_id) };
};
/** The signed-in student's active roster row in a class, or 404. */
export const studentClass = (db: any, u: U, classId: string) => {
  const p = pulseOf(db);
  const cls = p.classes.find((c) => c.id === classId && !c.archived_at);
  const row = cls && p.roster.find((r) => r.class_id === cls.id && r.user_id === u.id && r.status === 'active');
  if (!cls || !row) throw new PulseError(404, 'Class not found.');
  return { cls, row };
};
/** The signed-in student's own roster row for this task, or 404. Never another student's. */
export const studentTask = (db: any, u: U, taskId: string) => {
  const p = pulseOf(db);
  const task = p.tasks.find((t) => t.id === taskId && t.published);
  const row = task && p.roster.find((r) => r.class_id === task.class_id && r.user_id === u.id && r.status === 'active');
  if (!task || !row) throw new PulseError(404, 'Task not found.');
  return { task, row, cls: p.classes.find((c) => c.id === task.class_id) };
};

// ---------------------------------------------------------------------------
// Admin: teachers
// ---------------------------------------------------------------------------
/**
 * Teachers never register themselves: the admin creates (or appoints) them.
 * A new account has no password; the teacher sets one from the emailed link.
 * Returns `created` so the caller sends the set-password link.
 */
export const createTeacherAccount = (db: any, admin: U, body: { email?: string; name?: string; college?: string }) => {
  const e = email(body?.email);
  if (!validEmail(e)) throw new PulseError(400, 'Enter a valid email.');
  let user = (db.users || []).find((x: any) => String(x.email || '').toLowerCase() === e);
  let created = false;
  if (!user) {
    const name = clean(body?.name, 80);
    if (name.length < 2) throw new PulseError(400, 'Enter the teacher’s name to create their login.');
    user = { id: `user-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`, name, email: e, role: 'user', xp: 0, streak: 0,
      college: clean(body?.college, 120) || undefined, created_at: iso(), created_by: `pulse-admin:${admin.id}` };
    db.users = db.users || [];
    db.users.push(user);
    created = true;
  }
  appointTeacher(db, admin, e);
  return { user, created };
};

export const appointTeacher = (db: any, admin: U, rawEmail: string) => {
  const e = email(rawEmail);
  const user = (db.users || []).find((x: any) => String(x.email || '').toLowerCase() === e);
  if (!user) throw new PulseError(404, 'No TieEdu account with that email.');
  const p = pulseOf(db);
  const row = p.teachers.find((t) => t.user_id === user.id);
  if (row) { row.revoked_at = null; row.granted_by = admin.id; row.granted_at = iso(); }
  else p.teachers.push({ user_id: user.id, granted_by: admin.id, granted_at: iso(), revoked_at: null });
  return user;
};
export const revokeTeacher = (db: any, userId: string) => {
  const row = pulseOf(db).teachers.find((t) => t.user_id === userId);
  if (row) row.revoked_at = iso();
};
export const teacherList = (db: any) => pulseOf(db).teachers.filter((t) => !t.revoked_at).map((t) => {
  const u = (db.users || []).find((x: any) => x.id === t.user_id) || {};
  const live = pulseOf(db).classes.filter((c) => !c.archived_at);
  return { user_id: t.user_id, name: u.name || '—', email: u.email || '—', granted_at: t.granted_at, has_password: !!u.password_hash || !!u.google_id,
    classes: live.filter((c) => c.owner_id === t.user_id).length, co_teaching: live.filter((c) => (c.co_teachers || []).includes(t.user_id)).length };
});

// ---------------------------------------------------------------------------
// Classes, roster, invites
// ---------------------------------------------------------------------------
const joinCode = () => crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 6);

export const createClass = (db: any, u: U, body: any) => {
  if (!isTeacher(db, u)) throw new PulseError(403, 'Only appointed teachers can create classes.');
  const name = clean(body?.name, 80);
  if (!name) throw new PulseError(400, 'Give the class a name.');
  const cls = { id: newId('cls'), name, subject: clean(body?.subject, 80) || 'Programming in C', owner_id: u.id, co_teachers: [],
    join_code: joinCode(), created_at: iso(), archived_at: null };
  pulseOf(db).classes.push(cls);
  return cls;
};
export const updateClass = (cls: any, body: any) => {
  if (body?.name !== undefined) cls.name = clean(body.name, 80) || cls.name;
  if (body?.subject !== undefined) cls.subject = clean(body.subject, 80);
  if (body?.archived !== undefined) cls.archived_at = body.archived ? iso() : null;
  if (body?.new_code) cls.join_code = joinCode();
};
export const addCoTeacher = (db: any, cls: any, u: U, body: { email?: string; name?: string }): 'added' | 'requested' => {
  if (cls.owner_id !== u.id && !isAdmin(u)) throw new PulseError(403, 'Only the class owner can add co-teachers.');
  const e = email(body?.email);
  if (!validEmail(e)) throw new PulseError(400, 'Enter a valid email.');
  const user = (db.users || []).find((x: any) => String(x.email || '').toLowerCase() === e);
  if (user && isTeacher(db, user)) {
    if (user.id === cls.owner_id) throw new PulseError(400, 'That is the class owner.');
    if (!cls.co_teachers.includes(user.id)) cls.co_teachers.push(user.id);
    return 'added';
  }
  const p = pulseOf(db);
  const open = p.co_requests.find((r) => r.class_id === cls.id && r.email === e && r.status === 'pending');
  if (!open) {
    const name = clean(body?.name, 80) || user?.name || '';
    if (name.length < 2) throw new PulseError(400, 'Enter the co-teacher’s name; the admin creates their login.');
    p.co_requests.push({ id: newId('coreq'), class_id: cls.id, requested_by: u.id, name, email: e, status: 'pending', at: iso() });
  }
  return 'requested';
};

export const coRequestList = (db: any, filter?: { class_id?: string }) => {
  const p = pulseOf(db);
  const userName = (id: string) => (db.users || []).find((x: any) => x.id === id)?.name || '—';
  return p.co_requests.filter((r) => r.status === 'pending' && (!filter?.class_id || r.class_id === filter.class_id)).map((r) => ({
    id: r.id, name: r.name, email: r.email, at: r.at, class_id: r.class_id,
    class_name: p.classes.find((c) => c.id === r.class_id)?.name || '—', requested_by: userName(r.requested_by),
  }));
};

/** Admin decides a co-teacher request; approving creates the login and adds them to the class. */
export const decideCoRequest = (db: any, admin: U, id: string, approve: boolean) => {
  const p = pulseOf(db);
  const r = p.co_requests.find((x) => x.id === id && x.status === 'pending');
  if (!r) throw new PulseError(404, 'Request not found.');
  r.status = approve ? 'approved' : 'rejected';
  r.decided_at = iso();
  if (!approve) return { created: false, user: null as any };
  const out = createTeacherAccount(db, admin, { email: r.email, name: r.name });
  const cls = p.classes.find((c) => c.id === r.class_id);
  if (cls && out.user.id !== cls.owner_id && !cls.co_teachers.includes(out.user.id)) cls.co_teachers.push(out.user.id);
  return out;
};

/** Adds invites; returns the new rows with their one-time tokens (to email). */
export const inviteStudents = (db: any, cls: any, entries: any[]) => {
  const p = pulseOf(db);
  const out: { row: any; token: string }[] = [];
  const skipped: string[] = [];
  for (const raw of (Array.isArray(entries) ? entries : []).slice(0, 300)) {
    const e = email(raw?.email);
    if (!validEmail(e)) { if (e) skipped.push(e); continue; }
    let row = p.roster.find((r) => r.class_id === cls.id && r.email === e);
    if (row && row.status !== 'removed') { skipped.push(e); continue; }
    const token = crypto.randomBytes(24).toString('base64url');
    if (!row) {
      row = { id: newId('stu'), class_id: cls.id, email: e, user_id: null, joined_at: null };
      p.roster.push(row);
    }
    Object.assign(row, { name: clean(raw?.name, 80) || e.split('@')[0], roll_no: clean(raw?.roll_no, 30), status: 'invited',
      token_hash: sha256(token), invited_at: iso(), removed_at: null });
    out.push({ row, token });
  }
  return { invited: out, skipped };
};
export const reissueInvite = (row: any) => {
  if (row.status !== 'invited') throw new PulseError(400, 'Only pending invites can be resent.');
  const token = crypto.randomBytes(24).toString('base64url');
  row.token_hash = sha256(token);
  row.invited_at = iso();
  return token;
};
export const rosterRow = (db: any, u: U, rowId: string) => {
  const row = pulseOf(db).roster.find((r) => r.id === rowId);
  if (!row) throw new PulseError(404, 'Student not found.');
  teachClass(db, u, row.class_id);
  return row;
};

/** A student accepts an invite (token, same email) or asks to join by code (teacher approves). */
export const join = (db: any, u: U & { email?: string }, body: any) => {
  const p = pulseOf(db);
  const myEmail = email(u.email);
  if (body?.token) {
    const row = p.roster.find((r) => r.token_hash === sha256(String(body.token)) && r.status === 'invited');
    if (!row) throw new PulseError(404, 'This invite link is not valid any more. Ask your teacher to resend it.');
    if (row.email !== myEmail) throw new PulseError(403, `This invite is for ${row.email}. Sign in with that email to accept it.`);
    Object.assign(row, { user_id: u.id, status: 'active', joined_at: iso(), token_hash: null });
    return { status: 'active', class_id: row.class_id };
  }
  const code = clean(body?.code, 12).toUpperCase();
  const cls = code && p.classes.find((c) => c.join_code === code && !c.archived_at);
  if (!cls) throw new PulseError(404, 'No class with that code.');
  let row = p.roster.find((r) => r.class_id === cls.id && (r.user_id === u.id || r.email === myEmail));
  if (row?.status === 'active') return { status: 'active', class_id: cls.id };
  if (row?.status === 'invited') { Object.assign(row, { user_id: u.id, status: 'active', joined_at: iso(), token_hash: null }); return { status: 'active', class_id: cls.id }; }
  if (!row) { row = { id: newId('stu'), class_id: cls.id, email: myEmail, name: clean(u.name, 80), roll_no: clean(body?.roll_no, 30) }; p.roster.push(row); }
  Object.assign(row, { user_id: u.id, status: 'pending', invited_at: iso(), removed_at: null });
  return { status: 'pending', class_id: cls.id };
};

// ---------------------------------------------------------------------------
// Tasks — each task is a folder (task-1/, task-2/ …) in the student's one class repo
// ---------------------------------------------------------------------------
const lines = (v: unknown, max: number) => String(v ?? '').replace(/\r\n/g, '\n').slice(0, max);
const FOLDER_RE = /^[A-Za-z0-9][\w.-]{0,40}$/;

export const nextFolder = (db: any, classId: string) => {
  const taken = new Set(pulseOf(db).tasks.filter((t) => t.class_id === classId).map((t) => String(t.folder || '').toLowerCase()));
  let n = taken.size + 1;
  while (taken.has(`task-${n}`)) n++;
  return `task-${n}`;
};

export const normaliseTask = (body: any, prev: any = {}, ctx: { db?: any; classId?: string; selfId?: string } = {}) => {
  const reqs = (Array.isArray(body?.requirements) ? body.requirements : prev.requirements || []).slice(0, 20)
    .map((r: any, i: number) => ({ id: `R${i + 1}`, title: clean(r?.title, 120), detail: clean(r?.detail, 600) }))
    .filter((r: any) => r.title);
  const tests = (Array.isArray(body?.tests) ? body.tests : prev.tests || []).slice(0, 30)
    .map((t: any, i: number) => ({ id: `T${i + 1}`, name: clean(t?.name, 120), input: lines(t?.input, 4000), expected: lines(t?.expected, 4000),
      req_id: reqs.some((r: any) => r.id === t?.req_id) ? t.req_id : null }))
    .filter((t: any) => t.name && t.expected.trim());
  const starter = (Array.isArray(body?.starter) ? body.starter : prev.starter || []).slice(0, 10)
    .map((f: any) => ({ path: clean(f?.path, 120), code: lines(f?.code, 50000) })).filter((f: any) => f.path);
  const date = (v: any, fallback: string) => { const d = new Date(v); return Number.isNaN(d.getTime()) ? fallback : d.toISOString(); };
  const w = body?.weights || prev.weights || {};
  const weights = { tests: Number(w.tests ?? 30), reqs: Number(w.reqs ?? 60), activity: Number(w.activity ?? 10) };
  if (!['tests', 'reqs', 'activity'].every((k) => Number.isFinite((weights as any)[k]) && (weights as any)[k] >= 0)) throw new PulseError(400, 'Weights must be numbers.');
  let folder = clean(body?.folder ?? prev.folder, 41);
  if (!folder) folder = ctx.db && ctx.classId ? nextFolder(ctx.db, ctx.classId) : 'task-1';
  if (!FOLDER_RE.test(folder)) throw new PulseError(400, 'Folder name: letters, numbers, - or _ only (like task-3).');
  if (ctx.db && ctx.classId && pulseOf(ctx.db).tasks.some((t) => t.class_id === ctx.classId && t.id !== ctx.selfId && String(t.folder).toLowerCase() === folder.toLowerCase())) {
    throw new PulseError(409, `Another task in this class already uses the folder ${folder}/.`);
  }
  const autoTests = body?.auto_tests !== undefined ? !!body.auto_tests : !!prev.auto_tests;
  const out = {
    title: clean(body?.title ?? prev.title, 140),
    summary: clean(body?.summary ?? prev.summary, 2000),
    // C by default; Swift for iOS lab packs (reviewed by hand, no compile step).
    language: (body?.language ?? prev.language) === 'swift' ? 'swift' : 'c',
    folder,
    auto_tests: autoTests,
    assigned_at: date(body?.assigned_at ?? prev.assigned_at, iso()),
    deadline_at: date(body?.deadline_at ?? prev.deadline_at, new Date(Date.now() + 7 * 86400000).toISOString()),
    requirements: reqs, tests, starter, weights,
    published: body?.published !== undefined ? !!body.published : !!prev.published,
  };
  if (!out.title) throw new PulseError(400, 'Give the task a title.');
  if (!out.requirements.length) throw new PulseError(400, 'Add at least one requirement.');
  if (out.auto_tests && !out.tests.length) throw new PulseError(400, 'Add at least one test case, or switch Auto-run tests off.');
  if (out.deadline_at <= out.assigned_at) throw new PulseError(400, 'The deadline must be after the assigned date.');
  return out;
};

/** A copy of a task for the same or another class: new folder, unpublished, same length of time. */
export const duplicateTask = (db: any, src: any, targetClassId: string, by: string) => {
  const span = new Date(src.deadline_at).getTime() - new Date(src.assigned_at).getTime();
  const start = new Date();
  const copy = {
    id: newId('task'), class_id: targetClassId, created_by: by, created_at: iso(),
    ...normaliseTask({
      ...src, folder: undefined, published: false, title: targetClassId === src.class_id ? `${src.title} (copy)` : src.title,
      assigned_at: start.toISOString(), deadline_at: new Date(start.getTime() + Math.max(span, 86400000)).toISOString(),
    }, {}, { db, classId: targetClassId }),
  };
  pulseOf(db).tasks.push(copy);
  return copy;
};

// ---------------------------------------------------------------------------
// One repo per student per class, and per-task results (teacher's marks)
// ---------------------------------------------------------------------------
export const isVerified = (rec: any) => !!rec && (!!rec.verified || !!rec.verified_by_teacher);
export const repoFor = (db: any, classId: string, rosterId: string) => pulseOf(db).repos.find((r) => r.class_id === classId && r.roster_id === rosterId);
export const resultFor = (db: any, taskId: string, rosterId: string, create = false) => {
  const p = pulseOf(db);
  let res = p.results.find((r) => r.task_id === taskId && r.roster_id === rosterId);
  if (!res && create) {
    res = { task_id: taskId, roster_id: rosterId, reqs: {}, override: null, feedback: [], notes: [] };
    p.results.push(res);
  }
  return res;
};

export const linkClassRepo = (db: any, cls: any, row: any, repo: string) => {
  const p = pulseOf(db);
  const taken = p.repos.find((r) => r.class_id === cls.id && r.repo.toLowerCase() === repo.toLowerCase() && r.roster_id !== row.id && isVerified(r));
  if (taken) throw new PulseError(409, 'That repo is already verified as another student’s. Link your own repo.');
  let rec = repoFor(db, cls.id, row.id);
  const owner = repo.split('/')[0].toLowerCase();
  if (rec?.verified_owner && rec.verified_owner.toLowerCase() !== owner) {
    throw new PulseError(409, `Your verified GitHub account is ${rec.verified_owner}. Link a repo from that account, or ask your teacher to reset it.`);
  }
  if (rec && rec.repo.toLowerCase() !== repo.toLowerCase()) { dropFiles(rec.id); rec.snap = null; rec.verified = false; rec.verified_by_teacher = false; }
  if (!rec) {
    rec = { id: newId('repo'), class_id: cls.id, roster_id: row.id, verify_code: `PULSE-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      verified: false, verified_by_teacher: false, verified_owner: null, snap: null };
    p.repos.push(rec);
  }
  Object.assign(rec, { repo, linked_at: iso(), sync_error: null, last_sync_at: null });
  return rec;
};

// ---------------------------------------------------------------------------
// A task's slice of the repo: its folder's commits, files and tests
// ---------------------------------------------------------------------------
const DAY = 86400000;
const inFolder = (p: string, folder: string) => p.toLowerCase().startsWith(`${folder.toLowerCase()}/`);
const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

export const folderCommits = (task: any, rec: any): Commit[] => (rec?.snap?.commits || [])
  .filter((c: any) => c.at >= task.assigned_at && (c.files || []).some((f: any) => inFolder(f.p, task.folder)))
  .map((c: any) => {
    const mine = c.files.filter((f: any) => inFolder(f.p, task.folder));
    return { sha: c.sha, at: c.at, pushed: c.pushed, message: c.message, add: mine.reduce((n: number, f: any) => n + f.a, 0), del: mine.reduce((n: number, f: any) => n + f.d, 0) };
  });

export const folderFiles = (task: any, cache: FileCache): SourceFile[] =>
  cache.files.filter((f) => inFolder(f.path, task.folder)).map((f) => ({ path: f.path.slice(task.folder.length + 1), code: f.code }));

/** "Found Task3/; rename it to task-3/" — the commonest mistake, named before the teacher has to. */
export const folderHint = (task: any, rec: any) => {
  const dirs: string[] = rec?.snap?.dirs || [];
  if (!rec?.snap || dirs.some((d) => d.toLowerCase() === task.folder.toLowerCase())) return null;
  const near = dirs.find((d) => squash(d) === squash(task.folder));
  return near ? `Folder ${task.folder}/ not found. Found ${near}/; rename it to ${task.folder}/.` : `Folder ${task.folder}/ not found in the repo yet.`;
};

export function testsFor(task: any, rec: any) {
  if (!task.auto_tests) return { tests: {} as Record<string, TestResult>, compiles: null as boolean | null };
  const statuses = rec?.snap?.statuses || {};
  const workflowOk = !!rec?.snap?.workflow_ok;
  const build = statuses[`pulse/${task.folder}/build`];
  const compiles = build ? build.state === 'success' : null;
  const tests: Record<string, TestResult> = {};
  for (const t of task.tests) {
    const s = statuses[`pulse/${task.folder}/${t.id}`];
    tests[t.id] = !rec?.snap ? { pass: false, got: rec ? 'not checked yet' : 'no repo linked' }
      : !workflowOk ? { pass: false, got: 'not trusted: autograder workflow missing or edited' }
      : !s ? { pass: false, got: build ? 'not run' : 'waiting for the autograder (GitHub Actions)' }
      : { pass: s.state === 'success', got: s.description || s.state };
  }
  return { tests, compiles };
}

export function buildFlags(task: any, commits: Commit[], compiles: boolean | null, workflowOk: boolean, now = Date.now()): Flag[] {
  const flags: Flag[] = [];
  const last = commits[0] ? new Date(commits[0].at).getTime() : null;
  if (last && now - last > 5 * DAY && now < new Date(task.deadline_at).getTime()) flags.push({ kind: 'inactive', text: `No commits for ${Math.floor((now - last) / DAY)} days` });
  if (commits.length && compiles === false) flags.push({ kind: 'failing', text: 'Build fails: gcc reports an error' });
  const total = commits.reduce((n, c) => n + c.add, 0);
  const big = commits.reduce((m, c) => (c.add > m.add ? c : m), commits[0] || ({ add: 0, sha: '' } as any));
  if (total >= 60 && big.add / total > 0.8 && commits.length > 0) flags.push({ kind: 'bulk', text: `${Math.round((big.add / total) * 100)}% of the code arrived in one commit (${big.sha})` });
  const back = commits.find((c) => Math.abs(new Date(c.pushed).getTime() - new Date(c.at).getTime()) > DAY);
  if (back) flags.push({ kind: 'backdated', text: `Commit ${back.sha}: author date and commit date differ by ${Math.round(Math.abs(new Date(back.pushed).getTime() - new Date(back.at).getTime()) / DAY)} days` });
  const late = commits.filter((c) => c.pushed > task.deadline_at);
  if (late.length) flags.push({ kind: 'late', text: `${late.length} commit${late.length > 1 ? 's' : ''} after the deadline` });
  if (task.auto_tests && task.tests.length && commits.length && !workflowOk) flags.push({ kind: 'workflow', text: 'Autograder workflow missing or edited, so test results are not trusted' });
  return flags;
}

// ---------------------------------------------------------------------------
// Scoring + views (same shape as the frontend's PulseStudent)
// ---------------------------------------------------------------------------
const dayIST = (isoAt: string) => new Date(new Date(isoAt).getTime() + 5.5 * 3600000).toISOString().slice(0, 10);

/** The teacher's marks; anything not marked yet is "unreviewed". No automatic verdicts. */
export const effectiveReqs = (task: any, result: any): Record<string, ReqResult> => {
  const out: Record<string, ReqResult> = {};
  for (const r of task.requirements) {
    const m = result?.reqs?.[r.id];
    out[r.id] = m ? { verdict: m.verdict, reason: m.reason || 'Marked by the teacher.', evidence: null }
      : { verdict: 'unreviewed', reason: 'Not reviewed by the teacher yet.', evidence: null };
  }
  return out;
};

export const scoreFor = (task: any, rec: any, result: any, reqs: Record<string, ReqResult>, commits: Commit[], tests: Record<string, TestResult>) => {
  if (result?.override?.score != null) return result.override.score;
  if (!isVerified(rec) || !commits.length) return 0;
  const w = task.weights || { tests: 30, reqs: 60, activity: 10 };
  const vals = Object.values(reqs);
  const reqPct = vals.length ? vals.reduce((n, r) => n + (r.verdict === 'met' ? 1 : r.verdict === 'partial' ? 0.5 : 0), 0) / vals.length : 0;
  const testPct = task.auto_tests && task.tests.length ? Object.values(tests).filter((t) => t.pass).length / task.tests.length : null;
  const actPct = Math.min(new Set(commits.map((c) => dayIST(c.at))).size / 3, 1);
  const parts = [[w.reqs, reqPct], [w.activity, actPct], ...(testPct == null ? [] : [[w.tests, testPct]])] as [number, number][];
  const total = parts.reduce((n, [wt]) => n + wt, 0) || 1;
  return Math.round((parts.reduce((n, [wt, v]) => n + wt * v, 0) / total) * 100);
};

export const statusFor = (task: any, rec: any, reqs: Record<string, ReqResult>, commits: Commit[], tests: Record<string, TestResult>) => {
  if (!rec) return 'noRepo';
  if (!commits.length) return 'notStarted';
  if (!isVerified(rec)) return 'unverified';
  const vals = Object.values(reqs);
  const testsOk = !task.auto_tests || !task.tests.length || Object.values(tests).every((t) => t.pass);
  if (vals.every((r) => r.verdict === 'met') && testsOk) return 'done';
  if (vals.every((r) => r.verdict === 'unreviewed')) return 'submitted';
  return 'progress';
};

export const studentView = (db: any, task: any, row: any, role: 'teacher' | 'student', withFiles = false) => {
  const p = pulseOf(db);
  const rec = repoFor(db, task.class_id, row.id);
  const result = resultFor(db, task.id, row.id);
  const reqs = effectiveReqs(task, result);
  const commits = folderCommits(task, rec);
  const { tests, compiles } = testsFor(task, rec);
  let flags: Flag[] = buildFlags(task, commits, compiles, !!rec?.snap?.workflow_ok);
  if (rec && commits.length && !isVerified(rec)) flags.unshift({ kind: 'unverified', text: 'Repo ownership not verified: PULSE.txt code missing, so this work does not count yet' });
  if (role === 'teacher') {
    for (const a of p.alerts.filter((x) => x.class_id === task.class_id && x.roster_id === row.id)) flags.unshift({ kind: 'claimed', text: a.text });
    for (const pr of p.similarity[task.id] || []) {
      const other = pr.a === row.id ? pr.b : pr.b === row.id ? pr.a : null;
      const otherRow = other && p.roster.find((r) => r.id === other);
      if (otherRow) flags.push({ kind: 'similar', text: `${pr.score}% similar to ${otherRow.name}`, withId: otherRow.id, score: pr.score });
    }
  }
  if (role === 'student') flags = flags.filter((f) => f.kind === 'failing' || f.kind === 'inactive' || f.kind === 'unverified');
  const feedback = (result?.feedback || []) as any[];
  return {
    id: row.id,
    name: row.name,
    roll: row.roll_no || '',
    email: row.email,
    github: rec?.repo ? rec.repo.split('/')[0] : null,
    repo: rec?.repo ?? null,
    verified: isVerified(rec),
    verified_owner: rec?.verified_owner ?? null,
    verify_code: role === 'student' ? rec?.verify_code ?? null : undefined,
    folder: task.folder,
    folder_hint: commits.length ? null : folderHint(task, rec),
    status: statusFor(task, rec, reqs, commits, tests),
    reviewed: Object.values(reqs).some((r) => r.verdict !== 'unreviewed'),
    reqs,
    tests,
    compiles: compiles ?? false,
    score: scoreFor(task, rec, result, reqs, commits, tests),
    commits,
    lastActivity: commits[0]?.at ?? null,
    files: withFiles && rec ? folderFiles(task, readFiles(rec.id)) : [],
    flags,
    feedback: feedback.length ? feedback[feedback.length - 1].body : null,
    feedback_list: feedback.map((f) => ({ body: f.body, at: f.at })),
    sync: rec ? { at: rec.last_sync_at, error: rec.sync_error || null, review: null, workflow_ok: rec.snap?.workflow_ok ?? null } : null,
    override: role === 'teacher' ? result?.override ?? null : undefined,
    notes: role === 'teacher' ? result?.notes ?? [] : undefined,
    roster_status: row.status,
  };
};

export const taskView = (task: any) => ({
  id: task.id,
  class_id: task.class_id,
  title: task.title,
  language: task.language,
  summary: task.summary,
  folder: task.folder,
  auto_tests: !!task.auto_tests,
  assignedAt: task.assigned_at,
  deadlineAt: task.deadline_at,
  requirements: task.requirements.map((r: any) => ({ id: r.id, title: r.title, detail: r.detail })),
  tests: task.auto_tests ? task.tests.map((t: any) => ({ id: t.id, name: t.name, input: t.input, expected: t.expected, reqId: t.req_id })) : [],
  all_tests: task.tests.map((t: any) => ({ id: t.id, name: t.name, input: t.input, expected: t.expected, reqId: t.req_id })),
  starter: task.starter,
  weights: task.weights,
  published: task.published,
});

export const classView = (db: any, cls: any) => {
  const owner = (db.users || []).find((u: any) => u.id === cls.owner_id);
  return { id: cls.id, name: cls.name, subject: cls.subject, teacher: owner?.name || 'Teacher', pack: cls.pack || null };
};

/** A teacher's review in one call: verdicts, score override, feedback. */
export const saveReview = (db: any, task: any, row: any, body: any, by: string) => {
  const res = resultFor(db, task.id, row.id, true);
  const at = iso();
  const verdicts = body?.verdicts && typeof body.verdicts === 'object' ? body.verdicts : {};
  for (const [id, v] of Object.entries(verdicts)) {
    if (!task.requirements.some((r: any) => r.id === id)) throw new PulseError(400, `Unknown requirement ${id}.`);
    if (v === null || v === 'unreviewed') delete res.reqs[id];
    else if (v === 'met' || v === 'partial' || v === 'missing') res.reqs[id] = { verdict: v, by, at, reason: clean(body?.reasons?.[id], 300) || '' };
    else throw new PulseError(400, 'Verdict must be met, partial or missing.');
  }
  if (body?.score === null) res.override = null;
  else if (body?.score !== undefined) {
    const score = Number(body.score);
    if (!Number.isInteger(score) || score < 0 || score > 100) throw new PulseError(400, 'Score must be 0–100.');
    res.override = { score, reason: clean(body?.reason, 300) || 'Set in review', by, at };
  }
  const fb = clean(body?.feedback, 2000);
  if (fb) res.feedback.push({ id: newId('fb'), by, body: fb, at });
  return res;
};

export const CSV_HEAD = (task: any) => ['Roll', 'Name', 'Email', 'Repo', 'Status', ...task.requirements.map((r: any) => r.id), ...(task.auto_tests ? ['Tests passed'] : []), 'Score', 'Commits', 'Last activity', 'Flags'];
export const csvRow = (task: any, s: any) => [s.roll, s.name, s.email, s.repo ?? '', s.status, ...task.requirements.map((r: any) => s.reqs[r.id].verdict),
  ...(task.auto_tests ? [`${Object.values(s.tests).filter((t: any) => t.pass).length}/${task.tests.length}`] : []), s.score, s.commits.length, s.lastActivity ?? '', s.flags.map((f: any) => f.text).join('; ')];
export const toCsv = (rows: unknown[][]) => rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
