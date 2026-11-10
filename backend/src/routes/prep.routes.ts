import { Router, Request, Response } from 'express';
import { loadDb, safeSaveDb } from '../data/db';
import { requireAuth } from '../middleware/auth';
import { ownedModuleIdsFor, unlockedCompanyIds } from '../payments/orders';
import { isMember } from '../lib/festival';
import { buildPrep, progressOf, touchActivity, PREP_COMPANIES } from '../lib/prep';
import { packPrice } from '../lib/pricing';

/**
 * "My <company> prep" (INFOSYS_SE_PREP_PLAN.md): the plan, readiness and fix
 * list for the signed-in student. Everyone gets the plan shape; the full hub
 * (all lessons, sectional tests) is for pack owners.
 */
export const prepRouter = Router();

export function ownsCompanyPack(db: any, userId: string, slug: string): boolean {
  const company = (db.companies || []).find((c: any) => c.slug === slug);
  if (!company) return false;
  if (company.is_free) return true; // free program: everything open
  const user = (db.users || []).find((u: any) => u.id === userId);
  if (user?.role === 'admin') return true;
  if (unlockedCompanyIds(db, userId).includes(company.id)) return true;
  const premium = (company.modules || []).filter((m: any) => m.is_premium).map((m: any) => m.id);
  const owned = ownedModuleIdsFor(db, userId);
  return premium.length > 0 && premium.every((id: string) => owned.includes(id));
}

/**
 * The student's target company (INFOSYS_SE_3T_UX_PLAN §1): one value read by
 * the header chip, the Today screen and the company page, so every screen shows
 * the same company and the same days left.
 */
prepRouter.get('/target', requireAuth, (req: Request, res: Response) => {
  const db = loadDb();
  const user = (db.users || []).find((u: any) => u.id === req.userId);
  const slug = user?.target_company && PREP_COMPANIES[user.target_company] ? user.target_company : null;
  if (!slug) return res.json({ slug: null, asked: !!user?.target_company_asked });
  const company = (db.companies || []).find((c: any) => c.slug === slug);
  const data = buildPrep(db, req.userId!, slug, ownsCompanyPack(db, req.userId!, slug));
  res.json({ slug, name: company?.name || slug, owned: data?.owned || false, test_date: data?.test_date, days_left: data?.days_left, readiness: data?.readiness.score ?? 0, asked: true });
});

/**
 * Companies with a live prep plan, for the target picker and the buy sheet:
 * name, one-line summary, pack price (the real checkout ladder) and what the
 * pack holds. A company appears here only once its content is in.
 */
prepRouter.get('/companies', (_req: Request, res: Response) => {
  const db = loadDb();
  const out = Object.entries(PREP_COMPANIES).flatMap(([slug, cfg]) => {
    const company = (db.companies || []).find((c: any) => c.slug === slug && c.status === 'published');
    if (!company) return [];
    const modules: any[] = company.modules || [];
    const premium = modules.filter((m) => m.is_premium);
    const skills = (db.skills || []).filter((s: any) => s.company_slug === slug && s.status === 'active');
    const mock = skills.find((s: any) => s.prep_role !== 'sectional');
    const lessons = (modules.find((m) => m.id === cfg.lessonModule)?.items || []).length;
    const gated = modules.filter((m) => m.pack_gated && m.id !== cfg.lessonModule && (m.items || []).length);
    const pack = cfg.pack || [
      lessons ? `${lessons} topic lessons with worked examples and practice questions` : '',
      ...gated.map((m) => `${String(m.title).replace(/:.*/, '')}: ${(m.items || []).length} items with full solutions`),
      `${skills.filter((s: any) => s.prep_role === 'sectional').length} section tests, unlimited retakes`,
      mock ? `Unlimited full mocks: ${mock.totalQuestions} questions${mock.has_coding ? ' plus the coding round' : ''}, real pattern` : '',
      'Day-by-day plan to your test date, readiness score and weak-area fix list',
      ...premium.map((m) => `${String(m.title).replace(/:.*/, '')}: ${(m.items || []).length} questions with model answers`),
    ].filter(Boolean);
    return [{
      slug, name: cfg.target?.name || company.name, meta: cfg.target?.meta || '', free: !!company.is_free,
      price: company.is_free ? 0 : packPrice(premium.length), pack,
    }];
  });
  res.json({ companies: out });
});

prepRouter.post('/target', requireAuth, (req: Request, res: Response) => {
  const db = loadDb();
  const user = (db.users || []).find((u: any) => u.id === req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const slug = req.body?.slug ? String(req.body.slug) : null;
  if (slug && !PREP_COMPANIES[slug]) return res.status(400).json({ error: 'That company has no prep plan yet' });
  user.target_company = slug;
  user.target_company_asked = true;
  const date = String(req.body?.test_date || '');
  if (slug && /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date))) progressOf(db, user.id, slug).test_date = date;
  safeSaveDb(db);
  res.json({ ok: true, slug });
});

/** One lesson for the reader, with previous/next. Locked lessons answer 402 so the page shows the pack sheet. */
prepRouter.get('/:slug/lesson/:id', requireAuth, (req: Request, res: Response) => {
  const db = loadDb();
  const slug = req.params.slug;
  const cfg = PREP_COMPANIES[slug];
  const company = (db.companies || []).find((c: any) => c.slug === slug);
  const mod = cfg && (company?.modules || []).find((m: any) => m.id === cfg.lessonModule);
  const items = (mod?.items || []).filter((it: any) => it.status !== 'draft');
  const at = items.findIndex((it: any) => it.id === req.params.id);
  if (at < 0) return res.status(404).json({ error: 'Lesson not found' });
  const it = items[at];
  // TiEEdu members (Diwali 2026 offer) read every lesson; tests stay pack-only.
  const owned = ownsCompanyPack(db, req.userId!, slug) || isMember(db, req.userId);
  const nav = (x: any) => (x ? { id: x.id, title: String(x.question_text || '') } : null);
  const base = { id: it.id, title: String(it.question_text || ''), index: at + 1, total: items.length, prev: nav(items[at - 1]), next: nav(items[at + 1]), owned, free: !!it.is_free_preview };
  if (!owned && !it.is_free_preview) return res.status(402).json({ ...base, error: 'pack_required' });
  const p = progressOf(db, req.userId!, slug);
  res.json({ ...base, done: p.lessons_done.includes(it.id), lesson: it.lesson || null, markdown: it.blocks?.[0]?.payload?.text || '' });
});

prepRouter.get('/:slug', requireAuth, (req: Request, res: Response) => {
  const db = loadDb();
  const slug = req.params.slug;
  if (!PREP_COMPANIES[slug]) return res.status(404).json({ error: 'No prep plan for this company yet' });
  const data = buildPrep(db, req.userId!, slug, ownsCompanyPack(db, req.userId!, slug));
  if (!data) return res.status(404).json({ error: 'Company not found' });
  touchActivity(progressOf(db, req.userId!, slug));
  safeSaveDb(db);
  res.json(data);
});

prepRouter.post('/:slug/lesson', requireAuth, (req: Request, res: Response) => {
  const db = loadDb();
  const slug = req.params.slug;
  if (!PREP_COMPANIES[slug]) return res.status(404).json({ error: 'Unknown company' });
  const itemId = String(req.body?.item_id || '');
  if (!/^[\w-]{1,80}$/.test(itemId)) return res.status(400).json({ error: 'Invalid lesson' });
  const p = progressOf(db, req.userId!, slug);
  p.lessons_done = req.body?.done === false ? p.lessons_done.filter((x: string) => x !== itemId) : Array.from(new Set([...p.lessons_done, itemId]));
  touchActivity(p);
  safeSaveDb(db);
  res.json({ ok: true, lessons_done: p.lessons_done.length });
});

prepRouter.post('/:slug/date', requireAuth, (req: Request, res: Response) => {
  const db = loadDb();
  const slug = req.params.slug;
  if (!PREP_COMPANIES[slug]) return res.status(404).json({ error: 'Unknown company' });
  const date = String(req.body?.test_date || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) return res.status(400).json({ error: 'Use a date like 2026-12-15' });
  const p = progressOf(db, req.userId!, slug);
  p.test_date = date;
  safeSaveDb(db);
  res.json({ ok: true, test_date: date });
});
