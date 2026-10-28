import { Router, Request, Response } from 'express';
import { loadDb } from '../data/db';

/**
 * GET /api/public/stats — the honest numbers the landing page shows
 * (UI_REDESIGN_PLAN_V3 §13 "Data for honest numbers").
 *
 * Aggregates only, never a list. The student count is floored to the hundred
 * and withheld below 100, so the page says "Join 2,400 students" rather than a
 * number that drifts with every signup, and shows nothing while it would be
 * embarrassingly small. `latest_company` is the most recently checked public
 * company page, for the "just updated" card.
 */
export const publicStatsRouter = Router();

export function publicStats(db: any) {
  const students = (db.users || []).filter((u: any) => u.role !== 'admin').length;
  const companies = (db.companies || []).filter((c: any) => c.status !== 'draft');
  const rounds = companies.reduce((n: number, c: any) => n + (Array.isArray(c.rounds_pipeline) ? c.rounds_pipeline.length : 0), 0);
  const offerStories = (db.offer_stories || []).filter((o: any) => o.status === 'approved').length;

  const latest = companies
    .filter((c: any) => c.fact_checked_at)
    .sort((a: any, b: any) => String(b.fact_checked_at).localeCompare(String(a.fact_checked_at)))[0];

  return {
    students: students >= 100 ? Math.floor(students / 100) * 100 : null,
    companies: companies.length,
    rounds,
    offer_stories: offerStories,
    latest_company: latest
      ? {
          name: latest.name,
          slug: latest.slug,
          rounds: Array.isArray(latest.rounds_pipeline) ? latest.rounds_pipeline.length : 0,
          checked_at: latest.fact_checked_at,
        }
      : null,
  };
}

publicStatsRouter.get('/stats', (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.json(publicStats(loadDb()));
});
