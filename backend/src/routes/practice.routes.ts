import { Router, Request, Response } from 'express';
import { loadDb, safeSaveDb } from '../data/db';
import { optionalAuth, requireAuth } from '../middleware/auth';
import { packPrice } from '../lib/pricing';
import { runnerConfigured } from '../lib/codeRunner';
import { BANK, BANK_BY_ID, COMPANY_SETS, DSA_TOPICS, FREE_CORE, SET_BY_SLUG, type BankProblem } from '../lib/practice/bank';
import { istDate } from '../lib/streak';
import { dailyProblem } from '../lib/practice/daily';
import { accessChecker, progressFor, statusOf, visibleBank, visibleSet, visibleSets, type ProblemProgress } from '../lib/practice/access';
import { ownsCompanyPack } from './prep.routes';
import { buildPrep, PREP_COMPANIES } from '../lib/prep';

/**
 * The Practice hub (PRACTICE_MODE_PLAN.md §3): home, DSA sheet, company sets.
 * Everything a list needs comes in one call: rows carry status and access, so
 * locked items are shown (with their pack) instead of hidden.
 */
export const practiceRouter = Router();

function rowOf(p: BankProblem, access: ReturnType<typeof accessChecker>, prog: Map<string, ProblemProgress>) {
  const a = access(p);
  return {
    id: p.id, title: p.title, difficulty: p.difficulty, topic_key: p.topic_key, kind: p.kind,
    companies: p.companies.map((c) => ({ slug: c.slug, name: SET_BY_SLUG.get(c.slug)?.name || c.slug, kind: c.kind })),
    status: statusOf(prog.get(p.id)), open: a.open, lock_company: a.open ? null : a.company,
  };
}

const counts = (ids: string[], prog: Map<string, ProblemProgress>) => ({
  total: ids.length, solved: ids.filter((id) => prog.get(id)?.solved).length, attempted: ids.filter((id) => prog.get(id) && !prog.get(id)!.solved).length,
});

function companyMeta(db: any, slug: string, userId?: string) {
  const c = (db.companies || []).find((x: any) => x.slug === slug);
  const premium = (c?.modules || []).filter((m: any) => m.is_premium).length;
  return {
    slug, name: SET_BY_SLUG.get(slug)?.name || c?.name || slug, logo_url: c?.logo_url || '', tagline: c?.tagline || '',
    owned: !!userId && ownsCompanyPack(db, userId, slug), price: c?.is_free ? 0 : packPrice(premium), free_program: !!c?.is_free,
    // A thin band of the company's own colour on its cards (owner decision L5); neutral when unset.
    brand_color: /^#[0-9a-f]{6}$/i.test(String(c?.brand_color || '')) ? String(c.brand_color) : null,
  };
}

/** Company sets v2 (PRACTICE_POLISH_PLAN.md §6): what a card needs to say what to do next. */
function setInsights(db: any, set: { slug: string; levels: Array<{ name: string; ids: string[] }> }, prog: Map<string, ProblemProgress>, access: ReturnType<typeof accessChecker>, userId?: string) {
  const ids = set.levels.flatMap((l) => l.ids);
  const probs = ids.map((id) => BANK_BY_ID.get(id)!).filter(Boolean);
  const mix = { easy: 0, medium: 0, hard: 0 } as Record<'easy' | 'medium' | 'hard', number>;
  for (const p of probs) mix[p.difficulty as 'easy' | 'medium' | 'hard'] = (mix[p.difficulty as 'easy' | 'medium' | 'hard'] || 0) + 1;
  const reported = probs.filter((p) => p.companies.some((c) => c.slug === set.slug && c.kind === 'reported')).length;
  // Continue: the problem last worked on in this set if unsolved, else the first open unsolved one in order.
  const lastSub = userId ? [...(db.code_submissions || [])].reverse().find((x: any) => x.user_id === userId && ids.includes(x.problem_id)) : null;
  const levelOf = (id: string) => set.levels.find((l) => l.ids.includes(id))?.name || '';
  let next: BankProblem | undefined = lastSub && !prog.get(lastSub.problem_id)?.solved ? BANK_BY_ID.get(lastSub.problem_id) : undefined;
  if (!next) next = probs.find((p) => !prog.get(p.id)?.solved && access(p).open);
  const started = ids.some((id) => prog.get(id));
  const pp = userId ? (db.prep_progress || []).find((x: any) => x.user_id === userId && x.company_slug === set.slug) : null;
  const log = Array.isArray(pp?.readiness_log) ? pp.readiness_log : [];
  return {
    mix, reported,
    continue: next ? { id: next.id, title: next.title, level: levelOf(next.id), started } : null,
    readiness: log.length ? Number(log[log.length - 1].score) || 0 : null,
  };
}

/** "Solved by X% of students": among students who tried a problem, the share who solved it. Shown from 20 tries (owner decision L4). */
export const SOLVE_RATE_MIN = 20;
function solveRates(db: any, ids: Set<string>): Map<string, number> {
  const tried = new Map<string, Set<string>>();
  const solved = new Map<string, Set<string>>();
  for (const x of db.code_submissions || []) {
    if (!ids.has(x.problem_id) || !x.user_id) continue;
    if (!tried.has(x.problem_id)) tried.set(x.problem_id, new Set());
    tried.get(x.problem_id)!.add(x.user_id);
    if (x.verdict === 'accepted') {
      if (!solved.has(x.problem_id)) solved.set(x.problem_id, new Set());
      solved.get(x.problem_id)!.add(x.user_id);
    }
  }
  const out = new Map<string, number>();
  for (const [id, who] of tried) if (who.size >= SOLVE_RATE_MIN) out.set(id, Math.round(((solved.get(id)?.size || 0) / who.size) * 100));
  return out;
}

/** Companies with a prep plan but no coding set yet: shown as "coming soon" with a notify toggle. */
function comingSoon(db: any, userId?: string) {
  const want = new Set((db.practice_notify || []).filter((x: any) => x.user_id === userId).map((x: any) => x.slug));
  return Object.keys(PREP_COMPANIES).filter((slug) => !SET_BY_SLUG.has(slug)).map((slug) => {
    const c = (db.companies || []).find((x: any) => x.slug === slug);
    return { slug, name: c?.name || slug, logo_url: c?.logo_url || '', notify: want.has(slug) };
  }).filter((c) => c.name);
}

/** Company tests (full mocks and sectional tests) with the student's attempts. */
function testsOf(db: any, slug: string, userId?: string) {
  const skills = (db.skills || []).filter((s: any) => s.company_slug === slug && s.status === 'active');
  return skills.map((s: any) => {
    const asm = (db.assessments || []).find((a: any) => a.skillId === s.id && a.isDefault);
    const mine = userId && asm ? (db.attempts || []).filter((a: any) => a.userId === userId && a.assessmentId === asm.id && a.status === 'submitted') : [];
    return {
      slug: s.slug, name: s.name, kind: s.prep_role === 'sectional' ? 'sectional' : 'full', questions: Number(s.totalQuestions) || 0,
      minutes: Number(s.avgCompletionTime) || 0, coding: !!s.has_coding, attempts: mine.length,
      best: mine.length ? Math.max(...mine.map((a: any) => Number(a.score) || 0)) : null,
      last: mine.length ? { id: mine[mine.length - 1].id, score: Number(mine[mine.length - 1].score) || 0 } : null,
    };
  }).sort((a: any, b: any) => (a.kind === b.kind ? 0 : a.kind === 'full' ? -1 : 1));
}

export { dailyProblem };
function dailyOf(db: any, userId?: string) {
  const today = istDate();
  const p = dailyProblem(today, db);
  if (!p) return null;
  const solvers = new Set<string>();
  for (const x of db.code_submissions || []) {
    if (x.problem_id === p.id && x.verdict === 'accepted' && x.user_id && istDate(new Date(x.at)) === today) solvers.add(x.user_id);
  }
  return {
    date: today, id: p.id, title: p.title, difficulty: p.difficulty,
    topic: DSA_TOPICS.find((t) => t.key === p.topic_key)?.name || '',
    solved_today: solvers.size, mine: !!userId && solvers.has(userId),
  };
}

practiceRouter.get('/home', optionalAuth, (req: Request, res: Response) => {
  const db = loadDb();
  const prog = progressFor(db, req.userId);
  const last = [...(db.code_submissions || [])].reverse().find((s: any) => s.user_id === req.userId && BANK_BY_ID.has(s.problem_id));
  const lastP = last ? BANK_BY_ID.get(last.problem_id)! : null;
  const days = new Set((db.code_submissions || []).filter((s: any) => s.user_id === req.userId).map((s: any) => String(s.at).slice(0, 10)));
  const access = accessChecker(db, req.userId);
  // Next: the first unsolved open problem in study order.
  const bank = visibleBank(db);
  const next = bank.slice().sort((a, b) => DSA_TOPICS.findIndex((t) => t.key === a.topic_key) - DSA_TOPICS.findIndex((t) => t.key === b.topic_key))
    .find((p) => !prog.get(p.id)?.solved && access(p).open);
  res.json({
    runner: runnerConfigured(),
    daily: dailyOf(db, req.userId),
    totals: { ...counts(bank.map((p) => p.id), prog), active_days: days.size },
    continue: lastP ? { id: lastP.id, title: lastP.title, status: statusOf(prog.get(lastP.id)) } : null,
    next: next ? { id: next.id, title: next.title, topic: DSA_TOPICS.find((t) => t.key === next.topic_key)?.name || '' } : null,
    activity: [...days].sort().slice(-84),
    topics: DSA_TOPICS.map((t) => ({ key: t.key, name: t.name, ...counts(bank.filter((p) => p.topic_key === t.key).map((p) => p.id), prog) })).filter((t) => t.total),
    companies: visibleSets(db).map((s) => ({ ...companyMeta(db, s.slug, req.userId), ...counts(s.levels.flatMap((l) => l.ids), prog), tests: testsOf(db, s.slug).length })),
  });
});

practiceRouter.get('/dsa', optionalAuth, (req: Request, res: Response) => {
  const db = loadDb();
  const prog = progressFor(db, req.userId);
  const access = accessChecker(db, req.userId);
  res.json({
    topics: DSA_TOPICS.map((t) => {
      const list = visibleBank(db).filter((p) => p.topic_key === t.key);
      return { key: t.key, name: t.name, blurb: t.blurb, ...counts(list.map((p) => p.id), prog), problems: list.map((p) => rowOf(p, access, prog)) };
    }).filter((t) => t.total),
    companies: COMPANY_SETS.map((s) => ({ slug: s.slug, name: s.name })),
  });
});

/** Every company test (full mocks first), grouped by company, with the student's attempts. */
practiceRouter.get('/tests', optionalAuth, (req: Request, res: Response) => {
  const db = loadDb();
  const slugs = [...new Set((db.skills || []).filter((s: any) => s.company_slug && s.status === 'active').map((s: any) => s.company_slug))] as string[];
  res.json({
    companies: slugs.map((slug) => ({ ...companyMeta(db, slug, req.userId), tests: testsOf(db, slug, req.userId) })).filter((c) => c.tests.length)
      .sort((a, b) => Number(SET_BY_SLUG.has(b.slug)) - Number(SET_BY_SLUG.has(a.slug)) || a.name.localeCompare(b.name)),
  });
});

/**
 * A company test's report (PRACTICE_MODE_PLAN.md §7): score, sections against the
 * previous attempt, the coding section per problem, the attempt history, what to
 * fix next (weakest sections → their sectional test and lessons) and readiness.
 */
practiceRouter.get('/test-result/:attemptId', requireAuth, (req: Request, res: Response) => {
  const db = loadDb();
  const a = (db.attempts || []).find((x: any) => x.id === req.params.attemptId);
  if (!a) return res.status(404).json({ error: 'Result not found' });
  if (a.userId !== req.userId) return res.status(403).json({ error: 'Not your attempt' });
  if (a.status !== 'submitted') return res.status(409).json({ error: 'This test is not submitted yet' });
  const asm = (db.assessments || []).find((x: any) => x.id === a.assessmentId);
  const skill = (db.skills || []).find((s: any) => s.id === a.skillId || s.id === asm?.skillId);
  const slug = skill?.company_slug || '';
  const topics = (db.topics || []).filter((t: any) => t.skillId === skill?.id);
  const clean = (n: string) => String(n || '').replace(/\s*\(.*\)\s*$/, '');
  const history = (db.attempts || []).filter((x: any) => x.userId === req.userId && x.assessmentId === a.assessmentId && x.status === 'submitted')
    .sort((x: any, y: any) => String(x.submittedAt).localeCompare(String(y.submittedAt)));
  const idx = history.findIndex((x: any) => x.id === a.id);
  const prev = idx > 0 ? history[idx - 1] : null;
  const pctOf = (att: any, topicId: string) => (att?.topicPerformance || []).find((t: any) => t.topicId === topicId)?.percentage ?? null;
  const sectional = (db.skills || []).filter((s: any) => s.company_slug === slug && s.prep_role === 'sectional' && s.status === 'active');
  const sections = (a.topicPerformance || []).map((tp: any) => {
    const key = topics.find((t: any) => t.id === tp.topicId)?.slug || '';
    return {
      key, name: clean(tp.topicName), correct: tp.correct, total: tp.total, pct: tp.percentage,
      prev_pct: prev ? pctOf(prev, tp.topicId) : null, practice_test: sectional.find((s: any) => s.section_key === key)?.slug || null,
    };
  });
  const coding = (Array.isArray(a.coding_result) ? a.coding_result : Array.isArray(a.coding_self) ? a.coding_self : []).map((c: any) => ({
    id: c.id, title: BANK_BY_ID.get(c.id)?.title || c.id, status: c.status, passed: c.passed ?? null, total: c.total ?? null,
    language: c.language || '', graded: Array.isArray(a.coding_result),
  }));
  // Fresh readiness (the plan logs one value a day, so the previous value is "before this test").
  const prep = slug && PREP_COMPANIES[slug] ? buildPrep(db, req.userId!, slug, ownsCompanyPack(db, req.userId!, slug)) : null;
  const ms = (x: any) => Math.max(0, new Date(x.submittedAt).getTime() - new Date(x.startedAt).getTime());
  res.json({
    test: { slug: skill?.slug || '', name: skill?.name || 'Company test', company: slug ? companyMeta(db, slug, req.userId) : null, kind: skill?.prep_role === 'sectional' ? 'sectional' : 'full' },
    attempt: {
      id: a.id, score: Number(a.score) || 0, correct: a.correctAnswers || 0, incorrect: a.incorrectAnswers || 0, unanswered: a.unanswered || 0,
      total: (a.correctAnswers || 0) + (a.incorrectAnswers || 0) + (a.unanswered || 0), minutes: Math.round(ms(a) / 60000), submitted_at: a.submittedAt,
      number: idx + 1, prev_score: prev ? Number(prev.score) || 0 : null,
    },
    sections, coding,
    history: history.slice(-10).map((x: any) => ({ id: x.id, score: Number(x.score) || 0, at: x.submittedAt })),
    fix: [...sections].filter((s) => s.total > 0).sort((x, y) => x.pct - y.pct).slice(0, 2).filter((s) => s.pct < 80),
    readiness: prep ? { now: prep.readiness.score, before: prep.readiness.previous, band: prep.readiness.band } : null,
    prep: !!(slug && (db.companies || []).find((c: any) => c.slug === slug)),
  });
});

practiceRouter.get('/companies', optionalAuth, (req: Request, res: Response) => {
  const db = loadDb();
  const prog = progressFor(db, req.userId);
  const access = accessChecker(db, req.userId);
  const target = req.userId ? (db.users || []).find((u: any) => u.id === req.userId)?.target_company || null : null;
  const companies = visibleSets(db).map((s) => {
    const ids = s.levels.flatMap((l) => l.ids);
    const tests = testsOf(db, s.slug, req.userId);
    const bests = tests.map((t: any) => t.best).filter((b: any) => b != null) as number[];
    return {
      ...companyMeta(db, s.slug, req.userId), ...counts(ids, prog), locked: ids.filter((id) => !access(BANK_BY_ID.get(id)).open).length,
      tests: tests.length, best_mock: bests.length ? Math.max(...bests) : null, levels: s.levels.length, target: s.slug === target,
      ...setInsights(db, s, prog, access, req.userId),
    };
  });
  // The student's target company first.
  companies.sort((a, b) => Number(b.target) - Number(a.target));
  res.json({ companies, coming_soon: comingSoon(db, req.userId) });
});

/** "Notify me" on a coming-soon company: kept as a list admins can read; one row per student and company. */
practiceRouter.post('/notify', requireAuth, (req: Request, res: Response) => {
  const slug = String(req.body?.slug || '');
  if (!PREP_COMPANIES[slug] || SET_BY_SLUG.has(slug)) return res.status(400).json({ error: 'Unknown company' });
  const on = req.body?.on !== false;
  const db: any = loadDb();
  db.practice_notify = (Array.isArray(db.practice_notify) ? db.practice_notify : []).filter((x: any) => !(x.user_id === req.userId && x.slug === slug));
  if (on) db.practice_notify.push({ user_id: req.userId, slug, at: new Date().toISOString() });
  safeSaveDb(db);
  res.json({ slug, notify: on });
});

practiceRouter.get('/companies/:slug', optionalAuth, (req: Request, res: Response) => {
  const set = visibleSet(loadDb(), req.params.slug);
  if (!set) return res.status(404).json({ error: 'No practice set for this company yet' });
  const db = loadDb();
  const prog = progressFor(db, req.userId);
  const access = accessChecker(db, req.userId);
  const ids = set.levels.flatMap((l) => l.ids);
  const rates = solveRates(db, new Set(ids));
  res.json({
    company: companyMeta(db, set.slug, req.userId),
    progress: { ...counts(ids, prog), locked: ids.filter((id) => !access(BANK_BY_ID.get(id)).open).length },
    insights: setInsights(db, set, prog, access, req.userId),
    levels: set.levels.map((l) => {
      const rec = l.ids.find((id) => !prog.get(id)?.solved && access(BANK_BY_ID.get(id)).open) || null;
      return {
        name: l.name, blurb: l.blurb, ...counts(l.ids, prog), recommended: rec,
        locked: l.ids.filter((id) => !access(BANK_BY_ID.get(id)).open).length,
        problems: l.ids.map((id) => ({ ...rowOf(BANK_BY_ID.get(id)!, access, prog), solve_rate: rates.get(id) ?? null })),
      };
    }),
    tests: testsOf(db, set.slug, req.userId),
    prep: !!(db.companies || []).find((c: any) => c.slug === set.slug),
  });
});
