import { Router, Request, Response } from 'express';
import { loadDb, safeSaveDb } from '../data/db';
import { requireAuth } from '../middleware/auth';
import { ownedModuleIdsFor, unlockedCompanyIds } from '../payments/orders';
import { buildPrep, progressOf, touchActivity, PREP_COMPANIES } from '../lib/prep';

/**
 * "My <company> prep" (INFOSYS_SE_PREP_PLAN.md): the plan, readiness and fix
 * list for the signed-in student. Everyone gets the plan shape; the full hub
 * (all lessons, sectional tests) is for pack owners.
 */
export const prepRouter = Router();

export function ownsCompanyPack(db: any, userId: string, slug: string): boolean {
  const company = (db.companies || []).find((c: any) => c.slug === slug);
  if (!company) return false;
  const user = (db.users || []).find((u: any) => u.id === userId);
  if (user?.role === 'admin') return true;
  if (unlockedCompanyIds(db, userId).includes(company.id)) return true;
  const premium = (company.modules || []).filter((m: any) => m.is_premium).map((m: any) => m.id);
  const owned = ownedModuleIdsFor(db, userId);
  return premium.length > 0 && premium.every((id: string) => owned.includes(id));
}

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
