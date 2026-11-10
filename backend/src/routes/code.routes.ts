import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { loadDb, safeSaveDb } from '../data/db';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { isMember } from '../lib/festival';
import { ownsCompanyPack } from './prep.routes';
import { TCS_NQT_CODING, type CodingProblem } from '../data/companyTests/tcsNqtCoding';
import { RUN_LANGS, type RunLang, runCode, runSuite, runnerConfigured, allowRun, MAX_CODE_BYTES, normalizeOutput } from '../lib/codeRunner';

/**
 * Code practice and the mock's coding section (TCS NQT Part B).
 *   GET  /api/code/problems            the ladder, with the student's best result per problem
 *   GET  /api/code/problem/:id         statement, samples, hints; approach and solutions when unlocked
 *   POST /api/code/run                 custom input, or every sample when no input is given
 *   POST /api/code/submit              all tests (samples + hidden); saved as a submission
 * Access: the first problems of the module are free; the rest need the TCS pack
 * (or TieEdu membership). Inside a mock attempt the attempt's own problems can
 * be run and submitted, but approach and solutions stay hidden.
 */
export const codeRouter = Router();

const COMPANY = 'tcs-nqt';
const MODULE = 'mod-prep-tcs-nqt-coding';
const BY_ID = new Map(TCS_NQT_CODING.map((p) => [p.id, p]));

const STARTER: Record<RunLang, string> = {
  c: '#include <stdio.h>\n\nint main(void) {\n    // Read input with scanf, print the answer with printf.\n    return 0;\n}\n',
  cpp: '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    // Read input with cin, print the answer with cout.\n    return 0;\n}\n',
  java: 'import java.util.*;\nimport java.io.*;\n\npublic class Main {\n    public static void main(String[] args) throws IOException {\n        // Read input, print the answer. The class must be named Main.\n    }\n}\n',
  python: 'import sys\n\ndef main():\n    data = sys.stdin.read().split()\n    # Read input from data, print the answer.\n\nmain()\n',
};

function moduleItem(db: any, id: string) {
  const company = (db.companies || []).find((c: any) => c.slug === COMPANY);
  const mod = (company?.modules || []).find((m: any) => m.id === MODULE);
  return (mod?.items || []).find((it: any) => it.id === `${MODULE}-${id}`) || null;
}

function unlocked(db: any, userId: string | undefined, id: string): boolean {
  const item = moduleItem(db, id);
  if (item?.is_free_preview) return true;
  if (!userId) return false;
  return ownsCompanyPack(db, userId, COMPANY) || isMember(db, userId);
}

/** The student's in-progress mock attempt that contains this problem, if any. */
function mockAttempt(db: any, userId: string, attemptId: unknown, problemId: string) {
  if (!attemptId) return null;
  const a = (db.attempts || []).find((x: any) => x.id === String(attemptId));
  if (!a || a.userId !== userId || a.status !== 'in_progress') return null;
  const asm = (db.assessments || []).find((x: any) => x.id === a.assessmentId);
  return (asm?.coding?.problems || []).some((p: any) => p.id === problemId) ? a : null;
}

const lang = (v: unknown): RunLang | null => (RUN_LANGS.includes(String(v) as RunLang) ? (String(v) as RunLang) : null);

function best(db: any, userId: string | undefined, id: string) {
  if (!userId) return null;
  const subs = (db.code_submissions || []).filter((s: any) => s.user_id === userId && s.problem_id === id);
  if (!subs.length) return null;
  const top = subs.reduce((b: any, s: any) => (s.passed / s.total > b.passed / b.total ? s : b));
  return { verdict: top.verdict, passed: top.passed, total: top.total, at: top.at, solved: subs.some((s: any) => s.verdict === 'accepted') };
}

codeRouter.get('/problems', optionalAuth, (req: Request, res: Response) => {
  const db = loadDb();
  res.json({
    runner: runnerConfigured(),
    problems: TCS_NQT_CODING.map((p) => ({
      id: p.id, title: p.title, level: p.level, difficulty: p.difficulty, topic: p.topic, kind: p.kind,
      free: !!moduleItem(db, p.id)?.is_free_preview, best: best(db, req.userId, p.id),
    })),
  });
});

function view(p: CodingProblem, open: boolean) {
  return {
    id: p.id, title: p.title, level: p.level, difficulty: p.difficulty, topic: p.topic, kind: p.kind, source: p.source,
    statement: p.statement, input_format: p.input_format, output_format: p.output_format, constraints: p.constraints,
    samples: p.samples, hints: p.hints, tests_total: (p.tests || []).length,
    ...(open ? { approach: p.approach, complexity: p.complexity, solutions: p.solutions } : {}),
  };
}

codeRouter.get('/problem/:id', optionalAuth, (req: Request, res: Response) => {
  const p = BY_ID.get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Problem not found' });
  const db = loadDb();
  const inMock = req.userId ? !!mockAttempt(db, req.userId, req.query.attempt, p.id) : false;
  const open = !inMock && unlocked(db, req.userId, p.id);
  const ids = TCS_NQT_CODING.map((x) => x.id);
  const i = ids.indexOf(p.id);
  res.json({
    problem: view(p, open), locked: !open && !inMock, in_mock: inMock, runner: runnerConfigured(), languages: RUN_LANGS, starter: STARTER,
    best: best(db, req.userId, p.id), company: COMPANY,
    prev: i > 0 ? ids[i - 1] : null, next: i < ids.length - 1 ? ids[i + 1] : null,
  });
});

function guard(req: Request, res: Response): { p: CodingProblem | null; l: RunLang; code: string; db: any; mock: any } | null {
  const l = lang(req.body?.language);
  const code = typeof req.body?.code === 'string' ? req.body.code : '';
  if (!l) { res.status(400).json({ error: 'Choose C, C++, Java or Python' }); return null; }
  if (!code.trim()) { res.status(400).json({ error: 'Write some code first' }); return null; }
  if (Buffer.byteLength(code, 'utf8') > MAX_CODE_BYTES) { res.status(413).json({ error: 'Code is larger than 64 KB' }); return null; }
  if (!runnerConfigured()) { res.status(503).json({ error: 'The code runner is not available right now', code: 'runner_off' }); return null; }
  if (!allowRun(req.userId!)) { res.status(429).json({ error: 'Too many runs. Wait a minute and try again.' }); return null; }
  const db = loadDb();
  const id = req.body?.problem_id ? String(req.body.problem_id) : '';
  const p = id ? BY_ID.get(id) || null : null;
  if (id && !p) { res.status(404).json({ error: 'Problem not found' }); return null; }
  const mock = p ? mockAttempt(db, req.userId!, req.body?.attempt_id, p.id) : null;
  if (p && !mock && !unlocked(db, req.userId, p.id)) { res.status(402).json({ error: 'This problem is in the TCS NQT pack', code: 'pack_required' }); return null; }
  return { p, l, code, db, mock };
}

codeRouter.post('/run', requireAuth, async (req: Request, res: Response) => {
  const g = guard(req, res);
  if (!g) return;
  const custom = typeof req.body?.input === 'string' ? req.body.input : null;
  if (custom !== null || !g.p) {
    const r = await runCode(g.l, g.code, String(custom ?? '').slice(0, 64 * 1024));
    return res.json({ mode: 'custom', status: r.status, stdout: normalizeOutput(r.stdout), stderr: r.stderr, ms: r.ms });
  }
  const samples = (g.p.tests || []).filter((t) => t.sample);
  const r = await runSuite(g.l, g.code, samples);
  res.json({ mode: 'samples', ...r });
});

codeRouter.post('/submit', requireAuth, async (req: Request, res: Response) => {
  const g = guard(req, res);
  if (!g) return;
  if (!g.p) return res.status(400).json({ error: 'Which problem?' });
  const r = await runSuite(g.l, g.code, g.p.tests || []);
  if (r.verdict === 'system_error') return res.status(503).json({ error: 'The code runner did not respond. Your code was not graded; try again.', code: 'runner_down', detail: r.compile_error });
  const db = loadDb();
  db.code_submissions = Array.isArray(db.code_submissions) ? db.code_submissions : [];
  const sub = {
    id: `csub-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`, user_id: req.userId, problem_id: g.p.id, language: g.l,
    verdict: r.verdict, passed: r.passed, total: r.total, attempt_id: g.mock ? g.mock.id : null, at: new Date().toISOString(),
    code: g.code,
  };
  db.code_submissions.push(sub);
  // Keep each student's latest 300 submissions.
  const mine = db.code_submissions.filter((s: any) => s.user_id === req.userId);
  if (mine.length > 300) {
    const drop = new Set(mine.slice(0, mine.length - 300).map((s: any) => s.id));
    db.code_submissions = db.code_submissions.filter((s: any) => !drop.has(s.id));
  }
  safeSaveDb(db);
  res.json({ submission_id: sub.id, ...r, best: best(db, req.userId, g.p.id) });
});

/**
 * Mock coding marks from graded submissions (best per problem in this attempt):
 * all tests passed = solved, some = partial, none or no submission = not.
 */
export function codingResultFor(db: any, attempt: any): Array<{ id: string; status: 'solved' | 'partial' | 'not'; passed: number; total: number; language: string }> | null {
  const asm = (db.assessments || []).find((x: any) => x.id === attempt.assessmentId);
  const coding = asm?.coding;
  if (!coding?.problems?.length) return null;
  const subs = (db.code_submissions || []).filter((s: any) => s.attempt_id === attempt.id);
  if (!subs.length) return null;
  return pickCodingIds(coding.problems.map((p: any) => p.id), coding.count, attempt.id).map((id) => {
    const top = subs.filter((s: any) => s.problem_id === id).reduce((b: any, s: any) => (!b || s.passed > b.passed ? s : b), null);
    const status = !top || top.passed === 0 ? 'not' : top.passed === top.total ? 'solved' : 'partial';
    return { id, status, passed: top?.passed || 0, total: top?.total || (BY_ID.get(id)?.tests || []).length, language: top?.language || '' };
  });
}

/** The attempt's coding problems: the same deterministic draw the test page makes (components/skill-test/Sectional.tsx pickProblems). */
export function pickCodingIds(ids: string[], count: number, attemptId: string): string[] {
  let seed = [...attemptId].reduce((n, c) => (Math.imul(n, 31) + c.charCodeAt(0)) >>> 0, 7);
  const pool = [...ids];
  const out: string[] = [];
  while (out.length < count && pool.length) {
    seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
    out.push(pool.splice(seed % pool.length, 1)[0]);
  }
  return out;
}
