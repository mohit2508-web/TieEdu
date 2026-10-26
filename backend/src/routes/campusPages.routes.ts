import { Router, Request, Response } from 'express';
import { loadDb } from '../data/db';
import { getPool } from '../db/client';
import { isConnectionFailure } from '../lib/bridge/core';
import { buildCampusAggregate, campusSettings } from '../lib/campusPage';

/**
 * Public: GET /api/campus-pages/:slug — a college's campus page, only if its
 * placement officer turned it on. Aggregates only (lib/campusPage).
 */
export const campusPagesRouter = Router();

campusPagesRouter.get('/:slug', async (req: Request, res: Response) => {
  try {
    const c = await getPool().query(
      `SELECT college_id, slug, name, short_name, theme_color, logo_url
         FROM placement_college WHERE slug = $1 AND status = 'active'`,
      [String(req.params.slug || '').toLowerCase()]
    );
    const college = c.rows?.[0];
    const db = loadDb();
    if (!college || !campusSettings(db, college.college_id).enabled) {
      return res.status(404).json({ error: 'No campus page at this address.' });
    }
    const r = await getPool().query(
      `SELECT DISTINCT ON (user_id) user_id, roll_no, branch, batch
         FROM student_profile WHERE college_id = $1 ORDER BY user_id, updated_at DESC`,
      [college.college_id]
    );
    const roster = (r.rows || []).map((row: any) => ({ user_id: String(row.user_id), roll_no: String(row.roll_no), branch: row.branch ?? null, batch: row.batch ?? null }));
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.json({
      college: { name: college.name, short_name: college.short_name, slug: college.slug, theme_color: college.theme_color, logo_url: college.logo_url },
      intro: campusSettings(db, college.college_id).intro,
      aggregate: buildCampusAggregate(db, roster),
    });
  } catch (err: any) {
    // Always answer: Express 4 does not catch a rejected async handler, so a
    // re-throw here left the request open forever (and the page SSR with it).
    const notConfigured = /DATABASE_URL is not set/.test(String(err?.message || ''));
    if (isConnectionFailure(err) || notConfigured) {
      return res.status(503).json({ error: 'Campus pages are temporarily unavailable.' });
    }
    console.error('[campus-pages]', err?.message || err);
    return res.status(500).json({ error: 'Could not load this campus page.' });
  }
});
