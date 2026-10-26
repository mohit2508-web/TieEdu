import { Router, Request, Response } from 'express';
import { loadDb, saveDb } from '../data/db';
import { buildToday } from '../lib/today';
import { calendarFor } from '../lib/prepPlan';
import { addNote, deleteMyNote, intelFor, IntelError } from '../lib/campusIntel';
import { playerCollegeIds, isConnectionFailure } from '../lib/bridge/core';
import { createDebrief, debriefView, deleteDebrief, myDebriefs, DebriefError, DEBRIEF_REASONS, REASON_LABEL, ROUNDS } from '../lib/debrief';
import { buildPassport, handleError, passportOf, suggestHandle } from '../lib/passport';
import { buildParentView, newParentToken } from '../lib/parentView';
import { rateLimit } from '../middleware/auth';

/**
 * The signed-in student's own surfaces (UI_REDESIGN_PLAN_V2 Phase 3).
 *
 * Mounted at /api/me next to the drive profile router; the paths here do not
 * overlap with its `/`, `/resumes`, `/notifications` and `/settings`.
 */
export const meRouter = Router();

/** GET /api/me/today — the Today screen in one request (lib/today). */
/**
 * GET /api/me/calendar — every upcoming company test date (set on each company
 * page) with a countdown, and a day-by-day plan to the soonest (lib/prepPlan).
 */
meRouter.get('/calendar', (req: Request, res: Response) => {
  const db = loadDb();
  res.setHeader('Cache-Control', 'private, no-store');
  res.json(calendarFor(db, req.user!.id));
});

/**
 * Rejection debriefs (lib/debrief). The note is private to its author; peer
 * numbers appear only above a k-anonymity floor.
 *   GET    /api/me/debriefs        my debriefs + the form's options
 *   POST   /api/me/debriefs        { company_slug, round, reasons[], note }
 *   DELETE /api/me/debriefs/:id
 */
meRouter.get('/debriefs', (req: Request, res: Response) => {
  const db = loadDb();
  res.setHeader('Cache-Control', 'private, no-store');
  res.json({
    debriefs: myDebriefs(db, req.user!.id),
    options: { reasons: DEBRIEF_REASONS.map((id) => ({ id, label: REASON_LABEL[id] })), rounds: ROUNDS },
  });
});

meRouter.post('/debriefs', rateLimit(20), (req: Request, res: Response) => {
  const db = loadDb();
  try {
    const d = createDebrief(db, req.user!.id, req.body);
    saveDb(db);
    res.status(201).json({ debrief: debriefView(db, d) });
  } catch (err: any) {
    if (err instanceof DebriefError) return res.status(err.status).json({ error: err.message });
    throw err;
  }
});

meRouter.delete('/debriefs/:id', (req: Request, res: Response) => {
  const db = loadDb();
  if (!deleteDebrief(db, req.user!.id, String(req.params.id))) return res.status(404).json({ error: 'Not found.' });
  saveDb(db);
  res.status(204).end();
});

/**
 * Campus intel (lib/campusIntel): my college's placement history for a
 * company and its approved senior notes. College membership comes from the
 * placement database; when that is unreachable the card simply does not show.
 */
const collegeUnavailable = (res: Response, err: any) => {
  const notConfigured = /DATABASE_URL is not set/.test(String(err?.message || ''));
  if (isConnectionFailure(err) || notConfigured) return res.status(503).json({ error: 'College data is temporarily unavailable.' });
  console.error('[campus-intel]', err?.message || err);
  return res.status(500).json({ error: 'Could not load your college’s notes.' });
};

meRouter.get('/campus-intel/:slug', async (req: Request, res: Response) => {
  try {
    const colleges = await playerCollegeIds(req.user!.id);
    res.setHeader('Cache-Control', 'private, no-store');
    res.json(intelFor(loadDb(), req.user!.id, colleges, String(req.params.slug)));
  } catch (err) {
    collegeUnavailable(res, err);
  }
});

meRouter.post('/campus-notes', rateLimit(10), async (req: Request, res: Response) => {
  let colleges: string[];
  try {
    colleges = await playerCollegeIds(req.user!.id);
  } catch (err) {
    return collegeUnavailable(res, err);
  }
  const db = loadDb();
  try {
    const note = addNote(db, req.user!.id, colleges, req.body);
    saveDb(db);
    res.status(201).json({ id: note.id, status: note.status });
  } catch (err: any) {
    if (err instanceof IntelError) return res.status(err.status).json({ error: err.message });
    throw err;
  }
});

meRouter.delete('/campus-notes/:id', (req: Request, res: Response) => {
  const db = loadDb();
  if (!deleteMyNote(db, req.user!.id, String(req.params.id))) return res.status(404).json({ error: 'Not found.' });
  saveDb(db);
  res.status(204).end();
});

meRouter.get('/today', (req: Request, res: Response) => {
  const db = loadDb();
  res.setHeader('Cache-Control', 'private, no-store');
  res.json(buildToday(db, req.user!.id));
});

/**
 * PUT /api/me/year { grad_year } — the year the student graduates.
 *
 * Asked once (§6.5: "at signup, not as a popup") and editable from Today. A
 * graduation year rather than "year of study" because it does not go stale:
 * the stage is recomputed from it every academic year.
 */
meRouter.put('/year', (req: Request, res: Response) => {
  const year = Number(req.body?.grad_year);
  const thisYear = new Date().getUTCFullYear();
  if (!Number.isInteger(year) || year < thisYear - 6 || year > thisYear + 6) {
    return res.status(400).json({ error: `Graduation year must be between ${thisYear - 6} and ${thisYear + 6}.` });
  }
  const db = loadDb();
  const user = (db.users || []).find((u: any) => u.id === req.user!.id);
  if (!user) return res.status(404).json({ error: 'Account not found.' });
  user.grad_year = year;
  saveDb(db);
  res.json(buildToday(db, user.id));
});

/**
 * GET /api/me/passport — the student's passport settings, a handle suggestion
 * and a preview of exactly what the public page would show.
 */
meRouter.get('/passport', (req: Request, res: Response) => {
  const db = loadDb();
  const user = (db.users || []).find((u: any) => u.id === req.user!.id);
  if (!user) return res.status(404).json({ error: 'Account not found.' });
  const settings = passportOf(user);
  res.setHeader('Cache-Control', 'private, no-store');
  res.json({
    settings,
    suggestion: settings.handle || suggestHandle(db, user),
    preview: buildPassport(db, { ...user, passport: { handle: settings.handle || suggestHandle(db, user) } }),
  });
});

/**
 * PUT /api/me/passport { public, handle } — turn the public page on or off.
 * Turning it off keeps the handle reserved for this student but the URL 404s.
 */
meRouter.put('/passport', (req: Request, res: Response) => {
  const db = loadDb();
  const user = (db.users || []).find((u: any) => u.id === req.user!.id);
  if (!user) return res.status(404).json({ error: 'Account not found.' });
  const makePublic = req.body?.public === true;
  const handle = String(req.body?.handle ?? user.passport?.handle ?? '').trim().toLowerCase();
  if (makePublic || handle !== (user.passport?.handle || '')) {
    const err = handleError(db, user.id, handle);
    if (err) return res.status(400).json({ error: err });
  }
  user.passport = { public: makePublic, handle: handle || null };
  saveDb(db);
  res.json({ settings: passportOf(user), suggestion: user.passport.handle, preview: buildPassport(db, user) });
});

/** Public, no auth: GET /api/passport/:handle. 404 unless the student opted in. */
export const passportRouter = Router();
passportRouter.get('/:handle', (req: Request, res: Response) => {
  const handle = String(req.params.handle || '').toLowerCase();
  const db = loadDb();
  const user = (db.users || []).find((u: any) => u.passport?.handle === handle && u.passport?.public === true);
  if (!user) return res.status(404).json({ error: 'No public passport at this address.' });
  res.setHeader('Cache-Control', 'public, max-age=60');
  res.json(buildPassport(db, user));
});

/**
 * Parent link (lib/parentView). GET shows whether one exists; POST creates or
 * replaces it (the old link stops working); DELETE turns it off.
 */
meRouter.get('/parent-link', (req: Request, res: Response) => {
  const user = (loadDb().users || []).find((u: any) => u.id === req.user!.id);
  res.setHeader('Cache-Control', 'private, no-store');
  res.json({ link: user?.parent_link || null });
});

meRouter.post('/parent-link', (req: Request, res: Response) => {
  const db = loadDb();
  const user = (db.users || []).find((u: any) => u.id === req.user!.id);
  if (!user) return res.status(404).json({ error: 'Account not found.' });
  user.parent_link = { token: newParentToken(), created_at: new Date().toISOString() };
  saveDb(db);
  res.status(201).json({ link: user.parent_link });
});

meRouter.delete('/parent-link', (req: Request, res: Response) => {
  const db = loadDb();
  const user = (db.users || []).find((u: any) => u.id === req.user!.id);
  if (!user) return res.status(404).json({ error: 'Account not found.' });
  user.parent_link = null;
  saveDb(db);
  res.json({ link: null });
});

/** Public, no auth: GET /api/parent/:token. The token is the capability. */
export const parentRouter = Router();
parentRouter.get('/:token', rateLimit(30), (req: Request, res: Response) => {
  const token = String(req.params.token || '');
  if (token.length < 20) return res.status(404).json({ error: 'This link is not active.' });
  const db = loadDb();
  const user = (db.users || []).find((u: any) => u.parent_link?.token === token);
  if (!user) return res.status(404).json({ error: 'This link is not active.' });
  res.setHeader('Cache-Control', 'private, no-store');
  res.json(buildParentView(db, user));
});
