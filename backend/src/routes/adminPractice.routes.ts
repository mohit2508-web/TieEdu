import { Router, Request, Response } from 'express';
import axios from 'axios';
import { loadDb } from '../data/db';
import { BANK, BANK_BY_ID, COMPANY_SETS, DSA_TOPICS, SET_BY_SLUG } from '../lib/practice/bank';
import { ownsCompanyPack } from './prep.routes';

/**
 * Admin → Coding practice (PRACTICE_MODE_PLAN.md §9). Mounted behind requireAdmin.
 *   GET /overview?days=30   daily activity, totals, runner health
 *   GET /students           one row per practising student (?q, ?company, ?format=csv)
 *   GET /students/:id       a student's timeline: submissions, tests, lessons
 *   GET /submission/:id     one submission's code (owner decision D2: admins may read it)
 *   GET /problems           per-problem stats and broken-problem flags (?format=csv)
 *   GET /companies          funnel per company (?format=csv)
 *   GET /coverage           content per company against what its tests need
 */
export const adminPracticeRouter = Router();

const day = (iso: string) => String(iso || '').slice(0, 10);
const csv = (res: Response, name: string, rows: Array<Record<string, unknown>>) => {
  const cols = rows.length ? Object.keys(rows[0]) : [];
  const cell = (v: unknown) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${name}-${day(new Date().toISOString())}.csv"`);
  res.send([cols.join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\n'));
};

/** Company tests: the skills with a company slug, and the student attempts on them. */
function companyAttempts(db: any) {
  const skills = (db.skills || []).filter((s: any) => s.company_slug);
  const asmSkill = new Map<string, any>();
  for (const a of db.assessments || []) { const s = skills.find((k: any) => k.id === a.skillId); if (s) asmSkill.set(a.id, s); }
  const attempts = (db.attempts || []).filter((a: any) => a.status === 'submitted' && asmSkill.has(a.assessmentId))
    .map((a: any) => ({ ...a, skill: asmSkill.get(a.assessmentId) }));
  return { skills, attempts };
}

const lastReadiness = (db: any, userId: string, slug?: string) => {
  const rows = (db.prep_progress || []).filter((p: any) => p.user_id === userId && (!slug || p.company_slug === slug) && (p.readiness_log || []).length);
  if (!rows.length) return null;
  return Math.max(...rows.map((p: any) => p.readiness_log[p.readiness_log.length - 1].score));
};

adminPracticeRouter.get('/overview', async (req: Request, res: Response) => {
  const db = loadDb();
  const days = Math.min(90, Math.max(7, Number(req.query.days) || 30));
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const subs = (db.code_submissions || []).filter((s: any) => s.at >= since);
  const { attempts } = companyAttempts(db);
  const tests = attempts.filter((a: any) => String(a.submittedAt) >= since);
  const series: Record<string, { day: string; submissions: number; accepted: number; students: Set<string>; tests: number }> = {};
  for (let i = days - 1; i >= 0; i--) { const d = day(new Date(Date.now() - i * 86400000).toISOString()); series[d] = { day: d, submissions: 0, accepted: 0, students: new Set(), tests: 0 }; }
  for (const s of subs) { const r = series[day(s.at)]; if (r) { r.submissions++; if (s.verdict === 'accepted') r.accepted++; r.students.add(s.user_id); } }
  for (const a of tests) { const r = series[day(a.submittedAt)]; if (r) { r.tests++; r.students.add(a.userId); } }

  // Runner health: one quick call to Piston, plus the last 200 graded submissions' timing.
  let runner: { configured: boolean; up: boolean | null; ms: number | null; languages: string[] } = { configured: !!process.env.PISTON_API_URL, up: null, ms: null, languages: [] };
  if (process.env.PISTON_API_URL) {
    const t0 = Date.now();
    try {
      const { data } = await axios.get(`${process.env.PISTON_API_URL.replace(/\/+$/, '')}/runtimes`, { timeout: 4000 });
      runner = { configured: true, up: true, ms: Date.now() - t0, languages: [...new Set((data || []).map((r: any) => r.language))] as string[] };
    } catch { runner = { configured: true, up: false, ms: null, languages: [] }; }
  }
  const recent = (db.code_submissions || []).slice(-200).filter((s: any) => s.ms_total);
  res.json({
    days,
    totals: {
      students: new Set([...subs.map((s: any) => s.user_id), ...tests.map((a: any) => a.userId)]).size,
      submissions: subs.length, accepted: subs.filter((s: any) => s.verdict === 'accepted').length,
      solvers: new Set(subs.filter((s: any) => s.verdict === 'accepted').map((s: any) => s.user_id)).size,
      tests: tests.length, all_time_submissions: (db.code_submissions || []).length,
    },
    series: Object.values(series).map((r) => ({ day: r.day, submissions: r.submissions, accepted: r.accepted, students: r.students.size, tests: r.tests })),
    runner: { ...runner, avg_grade_ms: recent.length ? Math.round(recent.reduce((n: number, s: any) => n + s.ms_total, 0) / recent.length) : null },
  });
});

function studentRows(db: any) {
  const users = new Map((db.users || []).map((u: any) => [u.id, u]));
  const { attempts } = companyAttempts(db);
  const by = new Map<string, any>();
  const row = (id: string) => {
    if (!by.has(id)) {
      const u: any = users.get(id) || {};
      by.set(id, { id, name: u.name || '', email: u.email || '', college: u.college || '', grad_year: u.grad_year ?? '', target: u.target_company || '',
        solved: new Set<string>(), attempted: new Set<string>(), submissions: 0, tests: 0, best_mock: null as number | null, last_active: '' });
    }
    return by.get(id);
  };
  for (const s of db.code_submissions || []) {
    const r = row(s.user_id);
    r.submissions++; r.attempted.add(s.problem_id); if (s.verdict === 'accepted') r.solved.add(s.problem_id);
    if (s.at > r.last_active) r.last_active = s.at;
  }
  for (const a of attempts) {
    const r = row(a.userId);
    r.tests++;
    if (a.skill.prep_role !== 'sectional') r.best_mock = Math.max(r.best_mock ?? 0, Number(a.score) || 0);
    if (String(a.submittedAt) > r.last_active) r.last_active = a.submittedAt;
  }
  // Students who picked a target company but have not practised yet still show (inactive).
  for (const u of db.users || []) if (u.target_company && u.role !== 'admin') row(u.id);
  return [...by.values()].map((r) => ({
    id: r.id, name: r.name, email: r.email, college: r.college, grad_year: r.grad_year, target: r.target,
    solved: r.solved.size, attempted: r.attempted.size, submissions: r.submissions, tests: r.tests, best_mock: r.best_mock,
    readiness: lastReadiness(db, r.id, r.target || undefined), last_active: r.last_active,
  }));
}

adminPracticeRouter.get('/students', (req: Request, res: Response) => {
  const db = loadDb();
  const q = String(req.query.q || '').trim().toLowerCase();
  const company = String(req.query.company || '');
  let rows = studentRows(db);
  if (q) rows = rows.filter((r) => `${r.name} ${r.email} ${r.college}`.toLowerCase().includes(q));
  if (company) rows = rows.filter((r) => r.target === company);
  rows.sort((a, b) => String(b.last_active).localeCompare(String(a.last_active)));
  if (req.query.format === 'csv') return csv(res, 'practice-students', rows);
  const page = Math.max(1, Number(req.query.page) || 1);
  res.json({ total: rows.length, page, rows: rows.slice((page - 1) * 50, page * 50) });
});

adminPracticeRouter.get('/students/:id', (req: Request, res: Response) => {
  const db = loadDb();
  const u = (db.users || []).find((x: any) => x.id === req.params.id);
  if (!u) return res.status(404).json({ error: 'Student not found' });
  const { attempts } = companyAttempts(db);
  const subs = (db.code_submissions || []).filter((s: any) => s.user_id === u.id).slice(-200).reverse()
    .map((s: any) => ({ id: s.id, problem_id: s.problem_id, title: BANK_BY_ID.get(s.problem_id)?.title || s.problem_id, verdict: s.verdict, passed: s.passed, total: s.total, language: s.language, at: s.at, in_test: !!s.attempt_id }));
  const tests = attempts.filter((a: any) => a.userId === u.id).sort((a: any, b: any) => String(b.submittedAt).localeCompare(String(a.submittedAt)))
    .map((a: any) => ({ id: a.id, name: a.skill.name, slug: a.skill.slug, kind: a.skill.prep_role === 'sectional' ? 'sectional' : 'full', score: Number(a.score) || 0, at: a.submittedAt, coding: a.coding_result || a.coding_self || null }));
  const prep = (db.prep_progress || []).filter((p: any) => p.user_id === u.id).map((p: any) => ({
    company: p.company_slug, lessons_done: (p.lessons_done || []).length, test_date: p.test_date,
    readiness: (p.readiness_log || []).length ? p.readiness_log[p.readiness_log.length - 1].score : null, active_days: (p.activity_days || []).length,
  }));
  res.json({
    student: { id: u.id, name: u.name, email: u.email, college: u.college || '', grad_year: u.grad_year ?? null, target: u.target_company || '', created_at: u.created_at },
    submissions: subs, tests, prep,
    topics: DSA_TOPICS.map((t) => {
      const ids = new Set(BANK.filter((p) => p.topic_key === t.key).map((p) => p.id));
      const mine = subs.filter((s: any) => ids.has(s.problem_id));
      return { key: t.key, name: t.name, total: ids.size, solved: new Set(mine.filter((s: any) => s.verdict === 'accepted').map((s: any) => s.problem_id)).size };
    }).filter((t) => t.total),
  });
});

adminPracticeRouter.get('/submission/:id', (req: Request, res: Response) => {
  const db = loadDb();
  const s = (db.code_submissions || []).find((x: any) => x.id === req.params.id);
  if (!s) return res.status(404).json({ error: 'Submission not found' });
  res.json({ id: s.id, problem_id: s.problem_id, title: BANK_BY_ID.get(s.problem_id)?.title || s.problem_id, language: s.language, verdict: s.verdict, passed: s.passed, total: s.total, at: s.at, code: s.code || '' });
});

adminPracticeRouter.get('/problems', (req: Request, res: Response) => {
  const db = loadDb();
  const subs: any[] = db.code_submissions || [];
  const rows = BANK.map((p) => {
    const mine = subs.filter((s) => s.problem_id === p.id);
    const users = new Set(mine.map((s) => s.user_id));
    const solvers = new Set(mine.filter((s) => s.verdict === 'accepted').map((s) => s.user_id));
    // Tries to solve: submissions before (and including) each solver's first accepted one.
    const tries = [...solvers].map((u) => { const list = mine.filter((s) => s.user_id === u); return list.findIndex((s) => s.verdict === 'accepted') + 1; });
    const wrong = mine.filter((s) => s.verdict !== 'accepted').reduce((m: Record<string, number>, s) => { m[s.verdict] = (m[s.verdict] || 0) + 1; return m; }, {});
    const topWrong = Object.entries(wrong).sort((a, b) => b[1] - a[1])[0];
    return {
      id: p.id, title: p.title, topic: DSA_TOPICS.find((t) => t.key === p.topic_key)?.name || p.topic_key, difficulty: p.difficulty,
      companies: p.companies.map((c) => SET_BY_SLUG.get(c.slug)?.name || c.slug).join(' · '),
      students: users.size, solvers: solvers.size, submissions: mine.length,
      acceptance: mine.length ? Math.round((mine.filter((s) => s.verdict === 'accepted').length / mine.length) * 100) : null,
      avg_tries: tries.length ? Math.round((tries.reduce((n, t) => n + t, 0) / tries.length) * 10) / 10 : null,
      common_wrong: topWrong ? `${topWrong[0]} (${topWrong[1]})` : '',
      flag: users.size >= 10 && solvers.size === 0 ? 'nobody solves it — check the tests' : users.size >= 10 && solvers.size / users.size < 0.1 ? 'very low solve rate' : '',
    };
  });
  if (req.query.format === 'csv') return csv(res, 'practice-problems', rows);
  res.json({ rows });
});

function funnel(db: any) {
  const { attempts } = companyAttempts(db);
  const slugs = [...new Set([...COMPANY_SETS.map((s) => s.slug), ...(db.skills || []).filter((s: any) => s.company_slug && s.status === 'active').map((s: any) => s.company_slug)])] as string[];
  return slugs.map((slug) => {
    const company = (db.companies || []).find((c: any) => c.slug === slug);
    const setIds = new Set((SET_BY_SLUG.get(slug)?.levels || []).flatMap((l) => l.ids));
    const targeted = new Set((db.users || []).filter((u: any) => u.target_company === slug).map((u: any) => u.id));
    const practised = new Set((db.code_submissions || []).filter((s: any) => setIds.has(s.problem_id)).map((s: any) => s.user_id));
    const mine = attempts.filter((a: any) => a.skill.company_slug === slug);
    const mocks = mine.filter((a: any) => a.skill.prep_role !== 'sectional');
    const tookMock = new Set(mocks.map((a: any) => a.userId));
    const mockCount = mocks.reduce((m: Map<string, number>, a: any) => m.set(a.userId, (m.get(a.userId) || 0) + 1), new Map<string, number>());
    const everyone = new Set<string>([...targeted, ...practised, ...mine.map((a: any) => a.userId)]);
    const bought = new Set([...everyone].filter((id) => ownsCompanyPack(db, id, slug) && (db.users || []).find((u: any) => u.id === id)?.role !== 'admin'));
    const ready = new Set([...everyone].filter((id) => (lastReadiness(db, id, slug) ?? 0) >= 70));
    return {
      slug, name: SET_BY_SLUG.get(slug)?.name || company?.name || slug,
      targeted: targeted.size, practised_coding: practised.size, took_mock: tookMock.size, bought_pack: bought.size,
      two_plus_mocks: [...mockCount.values()].filter((n) => n >= 2).length, ready_70: ready.size,
    };
  });
}

adminPracticeRouter.get('/companies', (req: Request, res: Response) => {
  const rows = funnel(loadDb());
  if (req.query.format === 'csv') return csv(res, 'practice-companies', rows);
  res.json({ rows });
});

adminPracticeRouter.get('/coverage', (_req: Request, res: Response) => {
  const db = loadDb();
  const slugs = [...new Set([...COMPANY_SETS.map((s) => s.slug), ...(db.skills || []).filter((s: any) => s.company_slug).map((s: any) => s.company_slug)])] as string[];
  res.json({
    rows: slugs.map((slug) => {
      const company = (db.companies || []).find((c: any) => c.slug === slug);
      const setIds = (SET_BY_SLUG.get(slug)?.levels || []).flatMap((l) => l.ids);
      const byTopic = DSA_TOPICS.map((t) => ({ topic: t.name, count: setIds.filter((id) => BANK_BY_ID.get(id)?.topic_key === t.key).length })).filter((t) => t.count);
      const mock = (db.skills || []).find((s: any) => s.company_slug === slug && s.prep_role !== 'sectional');
      const asm = mock ? (db.assessments || []).find((a: any) => a.skillId === mock.id && a.isDefault) : null;
      const sections = (asm?.sections || []).map((sec: any) => {
        const have = (db.questions || []).filter((q: any) => q.topicId === sec.topicId && q.status === 'approved').length;
        return { name: sec.name, needed: sec.count, have, ok: have >= sec.count * 2 };
      });
      const modules = (company?.modules || []).map((m: any) => ({ title: m.title, items: (m.items || []).length }));
      return { slug, name: SET_BY_SLUG.get(slug)?.name || company?.name || slug, coding_total: setIds.length, coding_by_topic: byTopic, mock: mock ? { name: mock.name, sections, coding: asm?.coding?.problems?.length || 0 } : null, modules };
    }),
  });
});
