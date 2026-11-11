import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { loadDb, safeSaveDb } from '../data/db';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { RUN_LANGS, type RunLang, runCode, runSuite, runnerConfigured, allowRun, MAX_CODE_BYTES, normalizeOutput } from '../lib/codeRunner';
import { BANK, BANK_BY_ID, COMPANY_SETS, DSA_TOPICS, SET_BY_SLUG, type BankProblem } from '../lib/practice/bank';
import { accessChecker, accessFor, progressFor, statusOf } from '../lib/practice/access';
import { recordSetProgress, recordSolve, recordStudyDay, type CoinGain } from '../lib/coins';
import { dailyProblem } from '../lib/practice/daily';
import { istDate } from '../lib/streak';

/**
 * The code runner API (PRACTICE_MODE_PLAN.md §6) for the IDE and the tests.
 *   GET  /api/code/problems                 every problem with the student's status (legacy list)
 *   GET  /api/code/problem/:id              statement, samples, hints; approach + solutions when open;
 *                                           ?company= or ?topic= decides prev/next and the problem list
 *   GET  /api/code/submissions/:id          the student's own submissions (latest 20, with code)
 *   POST /api/code/run                      run on test cases [{input, expected?}] (≤ 8), or one custom input
 *   POST /api/code/submit                   all tests (samples + hidden); saved as a submission
 * Access (lib/practice/access.ts): free core and company free problems are open;
 * the rest need a pack that covers the problem, or membership. Inside a test
 * attempt, the attempt's own problems can be run and submitted, but approach
 * and solutions stay hidden.
 */
export const codeRouter = Router();

const STARTER: Record<RunLang, string> = {
  c: '#include <stdio.h>\n\nint main(void) {\n    // Read input with scanf, print the answer with printf.\n    return 0;\n}\n',
  cpp: '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    // Read input with cin, print the answer with cout.\n    return 0;\n}\n',
  java: 'import java.util.*;\nimport java.io.*;\n\npublic class Main {\n    public static void main(String[] args) throws IOException {\n        // Read input, print the answer. The class must be named Main.\n    }\n}\n',
  python: 'import sys\n\ndef main():\n    data = sys.stdin.read().split()\n    # Read input from data, print the answer.\n\nmain()\n',
};

/** The student's in-progress test attempt that contains this problem, if any. */
function testAttempt(db: any, userId: string, attemptId: unknown, problemId: string) {
  if (!attemptId) return null;
  const a = (db.attempts || []).find((x: any) => x.id === String(attemptId));
  if (!a || a.userId !== userId || a.status !== 'in_progress') return null;
  const asm = (db.assessments || []).find((x: any) => x.id === a.assessmentId);
  return (asm?.coding?.problems || []).some((p: any) => p.id === problemId) ? a : null;
}

const lang = (v: unknown): RunLang | null => (RUN_LANGS.includes(String(v) as RunLang) ? (String(v) as RunLang) : null);

/** The list a problem belongs to (company set or DSA topic), for prev/next and the problem drawer. */
function contextList(q: any, p: BankProblem): { kind: 'company' | 'topic'; key: string; name: string; ids: string[] } {
  const set = q.company ? SET_BY_SLUG.get(String(q.company)) : null;
  if (set) return { kind: 'company', key: set.slug, name: set.name, ids: set.levels.flatMap((l) => l.ids) };
  const tk = q.topic ? String(q.topic) : p.topic_key;
  const t = DSA_TOPICS.find((x) => x.key === tk) || DSA_TOPICS.find((x) => x.key === p.topic_key)!;
  return { kind: 'topic', key: t.key, name: t.name, ids: BANK.filter((x) => x.topic_key === t.key).map((x) => x.id) };
}

codeRouter.get('/problems', optionalAuth, (req: Request, res: Response) => {
  const db = loadDb();
  const access = accessChecker(db, req.userId);
  const prog = progressFor(db, req.userId);
  res.json({
    runner: runnerConfigured(),
    problems: BANK.map((p) => {
      const pr = prog.get(p.id);
      return {
        id: p.id, title: p.title, level: p.level, difficulty: p.difficulty, topic: p.topic, kind: p.kind,
        free: access(p).reason === 'free', best: pr ? { verdict: pr.solved ? 'accepted' : 'attempted', passed: pr.best_passed, total: pr.total, at: pr.last_at, solved: pr.solved } : null,
      };
    }),
  });
});

codeRouter.get('/problem/:id', optionalAuth, (req: Request, res: Response) => {
  const p = BANK_BY_ID.get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Problem not found' });
  const db = loadDb();
  const inTest = req.userId ? !!testAttempt(db, req.userId, req.query.attempt, p.id) : false;
  const access = accessChecker(db, req.userId);
  const a = access(p);
  const open = !inTest && a.open;
  const prog = progressFor(db, req.userId);
  const ctx = contextList(req.query, p);
  const i = ctx.ids.indexOf(p.id);
  const topic = DSA_TOPICS.find((t) => t.key === p.topic_key);
  res.json({
    problem: {
      id: p.id, title: p.title, level: p.level, difficulty: p.difficulty, topic: p.topic, topic_key: p.topic_key, topic_name: topic?.name || '',
      kind: p.kind, source: p.source, companies: p.companies.map((c) => ({ ...c, name: SET_BY_SLUG.get(c.slug)?.name || c.slug })),
      statement: p.statement, input_format: p.input_format, output_format: p.output_format, constraints: p.constraints,
      samples: p.samples, hints: inTest ? [] : p.hints, tests_total: (p.tests || []).length,
      // The approach and solutions come from GET /problem/:id/solution, which records the view (no solve coins after it).
    },
    access: inTest ? { open: true, reason: 'test', company: a.company } : a,
    locked: !a.open && !inTest, in_mock: inTest, runner: runnerConfigured(), languages: RUN_LANGS, starter: STARTER,
    status: statusOf(prog.get(p.id)),
    best: (() => { const pr = prog.get(p.id); return pr ? { verdict: pr.solved ? 'accepted' : 'attempted', passed: pr.best_passed, total: pr.total, at: pr.last_at, solved: pr.solved } : null; })(),
    company: a.company?.slug || p.companies[0]?.slug || '',
    context: inTest ? null : {
      kind: ctx.kind, key: ctx.key, name: ctx.name,
      items: ctx.ids.map((id) => { const x = BANK_BY_ID.get(id)!; return { id, title: x.title, difficulty: x.difficulty, status: statusOf(prog.get(id)), open: access(x).open }; }),
    },
    prev: !inTest && i > 0 ? ctx.ids[i - 1] : null, next: !inTest && i >= 0 && i < ctx.ids.length - 1 ? ctx.ids[i + 1] : null,
  });
});

/** The approach and solutions. Opening them before solving means no TiE Coins for solving it later (TIE_COINS_STORE_PLAN.md §3, E4). */
codeRouter.get('/problem/:id/solution', optionalAuth, (req: Request, res: Response) => {
  const p = BANK_BY_ID.get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Problem not found' });
  const db = loadDb();
  if (!accessChecker(db, req.userId)(p).open) return res.status(403).json({ error: 'The solution is in the company pack', code: 'pack_required' });
  let forfeits = false;
  if (req.userId && !progressFor(db, req.userId).get(p.id)?.solved) {
    db.solution_views = Array.isArray(db.solution_views) ? db.solution_views : [];
    if (!db.solution_views.some((v: any) => v.user_id === req.userId && v.problem_id === p.id)) {
      db.solution_views.push({ user_id: req.userId, problem_id: p.id, at: new Date().toISOString() });
      safeSaveDb(db);
    }
    forfeits = true;
  }
  res.json({ approach: p.approach, complexity: p.complexity, solutions: p.solutions, forfeits_coins: forfeits });
});

codeRouter.get('/submissions/:id', requireAuth, (req: Request, res: Response) => {
  const db = loadDb();
  const list = (db.code_submissions || []).filter((s: any) => s.user_id === req.userId && s.problem_id === req.params.id)
    .slice(-20).reverse().map((s: any) => ({ id: s.id, verdict: s.verdict, passed: s.passed, total: s.total, language: s.language, at: s.at, in_test: !!s.attempt_id, code: s.code }));
  res.json({ submissions: list });
});

function guard(req: Request, res: Response): { p: BankProblem | null; l: RunLang; code: string; db: any; attempt: any } | null {
  const l = lang(req.body?.language);
  const code = typeof req.body?.code === 'string' ? req.body.code : '';
  if (!l) { res.status(400).json({ error: 'Choose C, C++, Java or Python' }); return null; }
  if (!code.trim()) { res.status(400).json({ error: 'Write some code first' }); return null; }
  if (Buffer.byteLength(code, 'utf8') > MAX_CODE_BYTES) { res.status(413).json({ error: 'Code is larger than 64 KB' }); return null; }
  if (!runnerConfigured()) { res.status(503).json({ error: 'The code runner is not available right now', code: 'runner_off' }); return null; }
  if (!allowRun(req.userId!)) { res.status(429).json({ error: 'Too many runs. Wait a minute and try again.' }); return null; }
  const db = loadDb();
  const id = req.body?.problem_id ? String(req.body.problem_id) : '';
  const p = id ? BANK_BY_ID.get(id) || null : null;
  if (id && !p) { res.status(404).json({ error: 'Problem not found' }); return null; }
  const attempt = p ? testAttempt(db, req.userId!, req.body?.attempt_id, p.id) : null;
  if (p && !attempt && !accessFor(db, req.userId, p.id).open) {
    const a = accessFor(db, req.userId, p.id);
    res.status(402).json({ error: `This problem is in the ${a.company?.name || 'company'} pack`, code: 'pack_required', company: a.company });
    return null;
  }
  return { p, l, code, db, attempt };
}

const MAX_CASES = 8;

codeRouter.post('/run', requireAuth, async (req: Request, res: Response) => {
  const g = guard(req, res);
  if (!g) return;
  // A practice run is a study day (streak + daily check-in coin); a run inside a test is not.
  if (!g.attempt) {
    const before = (g.db.user_streaks || []).find((s: any) => s.user_id === req.userId)?.last_day;
    const { streak, gains } = recordStudyDay(g.db, req.userId!);
    if (gains.length || streak.last_day !== before) safeSaveDb(g.db);
  }
  // Test cases from the console (samples, edited or added); expected output is optional.
  if (Array.isArray(req.body?.cases)) {
    const cases = req.body.cases.slice(0, MAX_CASES).map((c: any) => ({ input: String(c?.input ?? '').slice(0, 64 * 1024), expected: c?.expected == null ? null : String(c.expected) }));
    if (!cases.length) return res.status(400).json({ error: 'Add a test case first' });
    const out: any[] = [];
    for (const c of cases) {
      const r = await runCode(g.l, g.code, c.input);
      if (r.status === 'compile_error') return res.json({ mode: 'cases', verdict: 'compile_error', compile_error: r.stderr, cases: [] });
      if (r.status === 'system_error') return res.status(503).json({ error: 'The code runner did not respond. Try again.', code: 'runner_down' });
      const actual = normalizeOutput(r.stdout);
      out.push({ status: r.status, ms: r.ms, stdout: actual.slice(0, 8000), stderr: r.stderr.slice(0, 4000), expected: c.expected == null ? null : normalizeOutput(c.expected), passed: c.expected == null ? null : r.status === 'ok' && actual === normalizeOutput(c.expected) });
    }
    const checked = out.filter((c) => c.passed !== null);
    const verdict = out.some((c) => c.status === 'time_limit') ? 'time_limit' : out.some((c) => c.status === 'runtime_error') ? 'runtime_error'
      : checked.length && checked.every((c) => c.passed) ? 'accepted' : checked.length ? 'wrong_answer' : 'ran';
    return res.json({ mode: 'cases', verdict, cases: out });
  }
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
  const t0 = Date.now();
  const r = await runSuite(g.l, g.code, g.p.tests || []);
  if (r.verdict === 'system_error') return res.status(503).json({ error: 'The code runner did not respond. Your code was not graded; try again.', code: 'runner_down', detail: r.compile_error });
  const db = loadDb();
  db.code_submissions = Array.isArray(db.code_submissions) ? db.code_submissions : [];
  const sub = {
    id: `csub-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`, user_id: req.userId, problem_id: g.p.id, language: g.l,
    verdict: r.verdict, passed: r.passed, total: r.total, attempt_id: g.attempt ? g.attempt.id : null, source: g.attempt ? 'test' : 'practice',
    ms_total: Date.now() - t0, at: new Date().toISOString(), code: g.code,
  };
  // Practice (not a test): a study day, and coins for a first Accepted (lib/coins).
  const coins: CoinGain[] = [];
  if (!g.attempt) {
    const firstAccept = r.verdict === 'accepted' && !db.code_submissions.some((s: any) => s.user_id === req.userId && s.problem_id === g.p!.id && s.verdict === 'accepted');
    coins.push(...recordStudyDay(db, req.userId!).gains);
    if (firstAccept) {
      const seen = (db.solution_views || []).some((v: any) => v.user_id === req.userId && v.problem_id === g.p!.id);
      coins.push(...recordSolve(db, req.userId!, g.p, { daily: dailyProblem(istDate(), db)?.id === g.p.id, solutionSeen: seen }));
    }
    db.code_submissions.push(sub);
    if (firstAccept) {
      const solved = new Set([...progressFor(db, req.userId).entries()].filter(([, v]) => v.solved).map(([k]) => k));
      coins.push(...recordSetProgress(db, req.userId!, COMPANY_SETS, solved, g.p.id));
    }
  } else {
    db.code_submissions.push(sub);
  }
  // Keep each student's latest 300 submissions.
  const mine = db.code_submissions.filter((s: any) => s.user_id === req.userId);
  if (mine.length > 300) {
    const drop = new Set(mine.slice(0, mine.length - 300).map((s: any) => s.id));
    db.code_submissions = db.code_submissions.filter((s: any) => !drop.has(s.id));
  }
  safeSaveDb(db);
  const pr = progressFor(db, req.userId).get(g.p.id);
  res.json({ submission_id: sub.id, ...r, coins, best: pr ? { verdict: pr.solved ? 'accepted' : 'attempted', passed: pr.best_passed, total: pr.total, at: pr.last_at, solved: pr.solved } : null });
});

/**
 * Test coding marks from graded submissions (best per problem in this attempt):
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
    return { id, status, passed: top?.passed || 0, total: top?.total || (BANK_BY_ID.get(id)?.tests || []).length, language: top?.language || '' };
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
