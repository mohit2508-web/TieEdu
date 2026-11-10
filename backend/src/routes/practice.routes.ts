import { Router, Request, Response } from 'express';
import { loadDb } from '../data/db';
import { optionalAuth, requireAuth } from '../middleware/auth';
import { packPrice } from '../lib/pricing';
import { runnerConfigured } from '../lib/codeRunner';
import { BANK, BANK_BY_ID, COMPANY_SETS, DSA_TOPICS, SET_BY_SLUG, type BankProblem } from '../lib/practice/bank';
import { accessChecker, progressFor, statusOf, type ProblemProgress } from '../lib/practice/access';
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
  };
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

practiceRouter.get('/home', optionalAuth, (req: Request, res: Response) => {
  const db = loadDb();
  const prog = progressFor(db, req.userId);
  const last = [...(db.code_submissions || [])].reverse().find((s: any) => s.user_id === req.userId && BANK_BY_ID.has(s.problem_id));
  const lastP = last ? BANK_BY_ID.get(last.problem_id)! : null;
  const days = new Set((db.code_submissions || []).filter((s: any) => s.user_id === req.userId).map((s: any) => String(s.at).slice(0, 10)));
  const access = accessChecker(db, req.userId);
  // Next: the first unsolved open problem in study order.
  const next = BANK.slice().sort((a, b) => DSA_TOPICS.findIndex((t) => t.key === a.topic_key) - DSA_TOPICS.findIndex((t) => t.key === b.topic_key))
    .find((p) => !prog.get(p.id)?.solved && access(p).open);
  res.json({
    runner: runnerConfigured(),
    totals: { ...counts(BANK.map((p) => p.id), prog), active_days: days.size },
    continue: lastP ? { id: lastP.id, title: lastP.title, status: statusOf(prog.get(lastP.id)) } : null,
    next: next ? { id: next.id, title: next.title, topic: DSA_TOPICS.find((t) => t.key === next.topic_key)?.name || '' } : null,
    activity: [...days].sort().slice(-84),
    topics: DSA_TOPICS.map((t) => ({ key: t.key, name: t.name, ...counts(BANK.filter((p) => p.topic_key === t.key).map((p) => p.id), prog) })).filter((t) => t.total),
    companies: COMPANY_SETS.map((s) => ({ ...companyMeta(db, s.slug, req.userId), ...counts(s.levels.flatMap((l) => l.ids), prog), tests: testsOf(db, s.slug).length })),
  });
});

practiceRouter.get('/dsa', optionalAuth, (req: Request, res: Response) => {
  const db = loadDb();
  const prog = progressFor(db, req.userId);
  const access = accessChecker(db, req.userId);
  res.json({
    topics: DSA_TOPICS.map((t) => {
      const list = BANK.filter((p) => p.topic_key === t.key);
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
  res.json({
    companies: COMPANY_SETS.map((s) => {
      const ids = s.levels.flatMap((l) => l.ids);
      return { ...companyMeta(db, s.slug, req.userId), ...counts(ids, prog), locked: ids.filter((id) => !access(BANK_BY_ID.get(id)).open).length, tests: testsOf(db, s.slug, req.userId).length };
    }),
  });
});

practiceRouter.get('/companies/:slug', optionalAuth, (req: Request, res: Response) => {
  const set = SET_BY_SLUG.get(req.params.slug);
  if (!set) return res.status(404).json({ error: 'No practice set for this company yet' });
  const db = loadDb();
  const prog = progressFor(db, req.userId);
  const access = accessChecker(db, req.userId);
  const ids = set.levels.flatMap((l) => l.ids);
  res.json({
    company: companyMeta(db, set.slug, req.userId),
    progress: { ...counts(ids, prog), locked: ids.filter((id) => !access(BANK_BY_ID.get(id)).open).length },
    levels: set.levels.map((l) => ({ name: l.name, blurb: l.blurb, ...counts(l.ids, prog), problems: l.ids.map((id) => rowOf(BANK_BY_ID.get(id)!, access, prog)) })),
    tests: testsOf(db, set.slug, req.userId),
    prep: !!(db.companies || []).find((c: any) => c.slug === set.slug),
  });
});
