import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

/**
 * Project Pulse — data, access rules and views (PROJECT_PULSE_PLAN.md §2, §7).
 *
 * Everything lives under `db.pulse` in the JSON store; source files of the latest
 * sync live beside it in data/pulse/<submission>.json so the main store stays small.
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

export type Verdict = 'met' | 'partial' | 'missing';
export interface Requirement { id: string; title: string; detail: string; hints: string[] }
export interface TestCase { id: string; name: string; input: string; expected: string; req_id: string | null }
export interface SourceFile { path: string; code: string }
export interface ReqResult { verdict: Verdict; reason: string; evidence: { file: string; from: number; to: number } | null }
export interface TestResult { pass: boolean; got: string }
export interface Commit { sha: string; at: string; pushed: string; message: string; add: number; del: number }
export interface Flag { kind: string; text: string; withId?: string; score?: number }

export interface Snapshot {
  head_sha: string;
  synced_at: string;
  compiles: boolean | null;
  workflow_ok: boolean;
  reqs: Record<string, ReqResult>;
  review_sha: string;
  review_source: 'ai' | 'hints';
  tests: Record<string, TestResult>;
  commits: Commit[];
  flags: Flag[];
  file_count: number;
}

export const MAX_COMMITS_KEPT = 100;
// Beside the store file: a test that points DB_FILE at a scratch store keeps its repo cache there too.
const DATA_DIR = process.env.DB_FILE
  ? path.join(path.dirname(path.resolve(process.env.DB_FILE)), `${path.basename(process.env.DB_FILE, '.json')}-pulse`)
  : path.join(__dirname, '../../../data/pulse');

export const pulseOf = (db: any) => {
  if (!db.pulse) db.pulse = {};
  const p = db.pulse;
  for (const k of ['teachers', 'classes', 'roster', 'tasks', 'subs']) if (!Array.isArray(p[k])) p[k] = [];
  if (!p.similarity) p.similarity = {};
  if (!p.settings) p.settings = {};
  if (!Array.isArray(p.alerts)) p.alerts = [];
  return p as {
    teachers: any[]; classes: any[]; roster: any[]; tasks: any[]; subs: any[];
    similarity: Record<string, { a: string; b: string; score: number }[]>; settings: any;
    alerts: { task_id: string; roster_id: string; text: string; at: string }[];
  };
};

export const newId = (prefix: string) => `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
export const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex');
const iso = () => new Date().toISOString();
const clean = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);
const email = (v: unknown) => clean(v, 200).toLowerCase();
const validEmail = (e: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);

// ---------------------------------------------------------------------------
// Files on disk
// ---------------------------------------------------------------------------
export interface FileCache { files: (SourceFile & { sha: string })[]; stats: Record<string, { add: number; del: number }> }
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
export const appointTeacher = (db: any, admin: U, rawEmail: string) => {
  const e = email(rawEmail);
  const user = (db.users || []).find((x: any) => String(x.email || '').toLowerCase() === e);
  if (!user) throw new PulseError(404, 'No TieEdu account with that email. Ask them to sign up first.');
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
  return { user_id: t.user_id, name: u.name || '—', email: u.email || '—', granted_at: t.granted_at,
    classes: pulseOf(db).classes.filter((c) => c.owner_id === t.user_id && !c.archived_at).length };
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
export const addCoTeacher = (db: any, cls: any, u: U, rawEmail: string) => {
  if (cls.owner_id !== u.id && !isAdmin(u)) throw new PulseError(403, 'Only the class owner can add co-teachers.');
  const e = email(rawEmail);
  const user = (db.users || []).find((x: any) => String(x.email || '').toLowerCase() === e);
  if (!user || !isTeacher(db, user)) throw new PulseError(400, 'That person is not an appointed teacher.');
  if (!cls.co_teachers.includes(user.id) && user.id !== cls.owner_id) cls.co_teachers.push(user.id);
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
// Tasks
// ---------------------------------------------------------------------------
const lines = (v: unknown, max: number) => String(v ?? '').replace(/\r\n/g, '\n').slice(0, max);

export const normaliseTask = (body: any, prev: any = {}) => {
  const reqs = (Array.isArray(body?.requirements) ? body.requirements : prev.requirements || []).slice(0, 20)
    .map((r: any, i: number) => ({ id: `R${i + 1}`, title: clean(r?.title, 120), detail: clean(r?.detail, 600),
      hints: (Array.isArray(r?.hints) ? r.hints : String(r?.hints || '').split(',')).map((h: any) => clean(h, 80)).filter(Boolean).slice(0, 12) }))
    .filter((r: any) => r.title);
  const tests = (Array.isArray(body?.tests) ? body.tests : prev.tests || []).slice(0, 30)
    .map((t: any, i: number) => ({ id: `T${i + 1}`, name: clean(t?.name, 120), input: lines(t?.input, 4000), expected: lines(t?.expected, 4000),
      req_id: reqs.some((r: any) => r.id === t?.req_id) ? t.req_id : null }))
    .filter((t: any) => t.name && t.expected.trim());
  const starter = (Array.isArray(body?.starter) ? body.starter : prev.starter || []).slice(0, 10)
    .map((f: any) => ({ path: clean(f?.path, 120), code: lines(f?.code, 50000) })).filter((f: any) => f.path);
  const date = (v: any, fallback: string) => { const d = new Date(v); return Number.isNaN(d.getTime()) ? fallback : d.toISOString(); };
  const w = body?.weights || prev.weights || {};
  const weights = { tests: Number(w.tests ?? 50), reqs: Number(w.reqs ?? 40), activity: Number(w.activity ?? 10) };
  if (!['tests', 'reqs', 'activity'].every((k) => Number.isFinite((weights as any)[k]) && (weights as any)[k] >= 0)) throw new PulseError(400, 'Weights must be numbers.');
  const out = {
    title: clean(body?.title ?? prev.title, 140),
    summary: clean(body?.summary ?? prev.summary, 2000),
    language: 'c',
    assigned_at: date(body?.assigned_at ?? prev.assigned_at, iso()),
    deadline_at: date(body?.deadline_at ?? prev.deadline_at, new Date(Date.now() + 7 * 86400000).toISOString()),
    requirements: reqs, tests, starter, weights,
    published: body?.published !== undefined ? !!body.published : !!prev.published,
  };
  if (!out.title) throw new PulseError(400, 'Give the task a title.');
  if (!out.requirements.length) throw new PulseError(400, 'Add at least one requirement.');
  if (out.deadline_at <= out.assigned_at) throw new PulseError(400, 'The deadline must be after the assigned date.');
  return out;
};

// ---------------------------------------------------------------------------
// Scoring + views (same shape as the frontend's PulseStudent)
// ---------------------------------------------------------------------------
const dayIST = (isoAt: string) => new Date(new Date(isoAt).getTime() + 5.5 * 3600000).toISOString().slice(0, 10);

export const effectiveReqs = (task: any, sub: any): Record<string, ReqResult> => {
  const out: Record<string, ReqResult> = {};
  for (const r of task.requirements) {
    const base: ReqResult = sub?.snap?.reqs?.[r.id] ?? { verdict: 'missing', reason: sub ? 'Not checked yet.' : 'No repo linked yet.', evidence: null };
    const o = sub?.req_overrides?.[r.id];
    out[r.id] = o ? { ...base, verdict: o.verdict, reason: `Set by teacher: ${o.reason || base.reason}` } : base;
  }
  return out;
};

/** Ownership: the repo carries the student's PULSE.txt code, or a teacher confirmed it. */
export const isVerified = (sub: any) => !!sub && (!!sub.verified || !!sub.verified_by_teacher);

export const scoreFor = (task: any, sub: any, reqs: Record<string, ReqResult>) => {
  if (sub?.override?.score != null) return sub.override.score;
  if (!isVerified(sub)) return 0;
  const commits: Commit[] = sub?.snap?.commits || [];
  if (!commits.length) return 0;
  const w = task.weights || { tests: 50, reqs: 40, activity: 10 };
  const vals = Object.values(reqs);
  const reqPct = vals.length ? vals.reduce((n, r) => n + (r.verdict === 'met' ? 1 : r.verdict === 'partial' ? 0.5 : 0), 0) / vals.length : 0;
  const tests = Object.values(sub.snap.tests || {}) as TestResult[];
  const testPct = task.tests.length ? tests.filter((t) => t.pass).length / task.tests.length : null;
  const actPct = Math.min(new Set(commits.map((c) => dayIST(c.at))).size / 3, 1);
  const parts = [[w.reqs, reqPct], [w.activity, actPct], ...(testPct == null ? [] : [[w.tests, testPct]])] as [number, number][];
  const total = parts.reduce((n, [wt]) => n + wt, 0) || 1;
  return Math.round((parts.reduce((n, [wt, v]) => n + wt * v, 0) / total) * 100);
};

export const statusFor = (task: any, sub: any, reqs: Record<string, ReqResult>) => {
  if (!sub) return 'noRepo';
  if (!(sub.snap?.commits || []).length) return 'notStarted';
  if (!isVerified(sub)) return 'unverified';
  const allMet = Object.values(reqs).every((r) => r.verdict === 'met');
  const tests = Object.values(sub.snap.tests || {}) as TestResult[];
  const testsOk = !task.tests.length || (tests.length === task.tests.length && tests.every((t) => t.pass));
  return allMet && testsOk ? 'done' : 'progress';
};

const notRunTests = (task: any, got: string) => Object.fromEntries(task.tests.map((t: any) => [t.id, { pass: false, got }]));

export const studentView = (db: any, task: any, row: any, role: 'teacher' | 'student', withFiles = false) => {
  const p = pulseOf(db);
  const sub = p.subs.find((s) => s.task_id === task.id && s.roster_id === row.id);
  const reqs = effectiveReqs(task, sub);
  let flags: Flag[] = [...(sub?.snap?.flags || [])];
  if (sub && !isVerified(sub)) flags.unshift({ kind: 'unverified', text: 'Repo ownership not verified: PULSE.txt code missing, so this work does not count yet' });
  if (role === 'teacher') {
    for (const a of (p.alerts || []).filter((x: any) => x.task_id === task.id && x.roster_id === row.id)) flags.unshift({ kind: 'claimed', text: a.text });
  }
  if (role === 'teacher' && sub) {
    for (const pr of p.similarity[task.id] || []) {
      const other = pr.a === sub.id ? pr.b : pr.b === sub.id ? pr.a : null;
      if (!other) continue;
      const otherRow = p.roster.find((r) => r.id === p.subs.find((s) => s.id === other)?.roster_id);
      if (otherRow) flags.push({ kind: 'similar', text: `${pr.score}% similar to ${otherRow.name}`, withId: otherRow.id, score: pr.score });
    }
  }
  if (role === 'student') flags = flags.filter((f) => f.kind === 'failing' || f.kind === 'inactive' || f.kind === 'unverified');
  const feedback = (sub?.feedback || []) as any[];
  return {
    id: row.id,
    name: row.name,
    roll: row.roll_no || '',
    email: row.email,
    github: sub?.repo ? sub.repo.split('/')[0] : null,
    repo: sub?.repo ?? null,
    verified: isVerified(sub),
    verified_owner: sub?.verified_owner ?? null,
    verify_code: role === 'student' ? sub?.verify_code ?? null : undefined,
    status: statusFor(task, sub, reqs),
    reqs,
    tests: sub?.snap?.tests ?? notRunTests(task, sub ? 'not run yet' : 'no repo linked'),
    compiles: sub?.snap?.compiles ?? false,
    score: scoreFor(task, sub, reqs),
    commits: sub?.snap?.commits ?? [],
    lastActivity: sub?.snap?.commits?.[0]?.at ?? null,
    files: withFiles && sub ? readFiles(sub.id).files.map(({ path: fp, code }) => ({ path: fp, code })) : [],
    flags,
    feedback: feedback.length ? feedback[feedback.length - 1].body : null,
    feedback_list: feedback.map((f) => ({ body: f.body, at: f.at })),
    sync: sub ? { at: sub.last_sync_at, error: sub.sync_error || null, review: sub.snap?.review_source ?? null, workflow_ok: sub.snap?.workflow_ok ?? null } : null,
    override: role === 'teacher' ? sub?.override ?? null : undefined,
    notes: role === 'teacher' ? sub?.notes ?? [] : undefined,
    roster_status: row.status,
  };
};

export const taskView = (task: any, role: 'teacher' | 'student') => ({
  id: task.id,
  class_id: task.class_id,
  title: task.title,
  language: task.language,
  summary: task.summary,
  assignedAt: task.assigned_at,
  deadlineAt: task.deadline_at,
  requirements: task.requirements.map((r: any) => ({ id: r.id, title: r.title, detail: r.detail, ...(role === 'teacher' ? { hints: r.hints } : {}) })),
  tests: task.tests.map((t: any) => ({ id: t.id, name: t.name, input: t.input, expected: t.expected, reqId: t.req_id })),
  starter: task.starter,
  weights: task.weights,
  published: task.published,
});

export const classView = (db: any, cls: any) => {
  const owner = (db.users || []).find((u: any) => u.id === cls.owner_id);
  return { id: cls.id, name: cls.name, subject: cls.subject, teacher: owner?.name || 'Teacher' };
};

export const subFor = (db: any, taskId: string, rosterId: string) =>
  pulseOf(db).subs.find((s) => s.task_id === taskId && s.roster_id === rosterId);

export const linkRepo = (db: any, task: any, row: any, repo: string) => {
  const p = pulseOf(db);
  const taken = p.subs.find((s) => s.task_id === task.id && s.repo.toLowerCase() === repo.toLowerCase() && s.roster_id !== row.id && isVerified(s));
  if (taken) throw new PulseError(409, 'That repo is already verified as another student’s. Link your own repo.');
  let sub = subFor(db, task.id, row.id);
  const owner = repo.split('/')[0].toLowerCase();
  if (sub?.verified_owner && sub.verified_owner.toLowerCase() !== owner) {
    throw new PulseError(409, `Your verified GitHub account is ${sub.verified_owner}. Link a repo from that account, or ask your teacher to reset it.`);
  }
  if (sub && sub.repo.toLowerCase() !== repo.toLowerCase()) { dropFiles(sub.id); sub.snap = null; sub.verified = false; sub.verified_by_teacher = false; }
  if (!sub) {
    sub = { id: newId('sub'), task_id: task.id, roster_id: row.id, verify_code: `PULSE-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      verified: false, feedback: [], notes: [], override: null, req_overrides: {}, snap: null };
    p.subs.push(sub);
  }
  Object.assign(sub, { repo, linked_at: iso(), sync_error: null, last_sync_at: null });
  return sub;
};

export const CSV_HEAD = (task: any) => ['Roll', 'Name', 'Email', 'Repo', 'Status', ...task.requirements.map((r: any) => r.id), 'Tests passed', 'Score', 'Commits', 'Last activity', 'Flags'];
export const csvRow = (task: any, s: any) => [s.roll, s.name, s.email, s.repo ?? '', s.status, ...task.requirements.map((r: any) => s.reqs[r.id].verdict),
  `${Object.values(s.tests).filter((t: any) => t.pass).length}/${task.tests.length}`, s.score, s.commits.length, s.lastActivity ?? '', s.flags.map((f: any) => f.text).join('; ')];
export const toCsv = (rows: unknown[][]) => rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
