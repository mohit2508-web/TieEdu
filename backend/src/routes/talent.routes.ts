import { Router, Request, Response } from 'express';
import { loadDb, saveDb } from '../data/db';
import { rateLimit } from '../middleware/auth';
import { sendPushToUser } from '../lib/push';
import {
  adminRecruiters, applyAsRecruiter, decideInterest, recruiterView, reviewRecruiter, searchCandidates, sendInterest,
  setTalentProfile, studentTalentView, TalentError, withdrawInterest,
} from '../lib/talentSearch';

/**
 * Recruiter skill search (lib/talentSearch). Off until an admin enables it.
 * Student:   GET/PUT /api/talent/me, POST /api/talent/requests/:id { accept }
 * Recruiter: GET /api/talent/recruiter, POST /api/talent/recruiter/apply,
 *            GET /api/talent/search, POST /api/talent/interest,
 *            POST /api/talent/interest/:id/withdraw
 * Admin:     GET /api/admin/recruiters, PUT /api/admin/recruiters/:id
 */
export const talentRouter = Router();
export const talentAdminRouter = Router();

talentRouter.use((req: Request, res: Response, next) => {
  if (!req.userId) return res.status(401).json({ error: 'Sign in first.' });
  res.setHeader('Cache-Control', 'private, no-store');
  next();
});

const handle = (res: Response, fn: () => unknown, status = 200) => {
  try {
    res.status(status).json(fn());
  } catch (err: any) {
    if (err instanceof TalentError) return res.status(err.status).json({ error: err.message });
    throw err;
  }
};
const write = (res: Response, fn: (db: any) => unknown, status = 200) => {
  const db = loadDb();
  handle(res, () => {
    const out = fn(db);
    saveDb(db);
    return out;
  }, status);
};

// --- student -----------------------------------------------------------------------------
talentRouter.get('/me', (req: Request, res: Response) => handle(res, () => studentTalentView(loadDb(), req.userId!)));
talentRouter.put('/me', rateLimit(20), (req: Request, res: Response) =>
  write(res, (db) => { setTalentProfile(db, req.userId!, req.body); return studentTalentView(db, req.userId!); }));
talentRouter.post('/requests/:id', rateLimit(30), (req: Request, res: Response) =>
  write(res, (db) => { decideInterest(db, req.userId!, String(req.params.id), req.body?.accept === true); return studentTalentView(db, req.userId!); }));

// --- recruiter ---------------------------------------------------------------------------
talentRouter.get('/recruiter', (req: Request, res: Response) => handle(res, () => recruiterView(loadDb(), req.userId!)));
talentRouter.post('/recruiter/apply', rateLimit(5), (req: Request, res: Response) =>
  write(res, (db) => { applyAsRecruiter(db, req.userId!, req.body); return recruiterView(db, req.userId!); }, 201));
talentRouter.get('/search', rateLimit(60), (req: Request, res: Response) =>
  handle(res, () => {
    const db = loadDb();
    return { results: searchCandidates(db, req.userId!, req.query), skills: (db.skills || []).map((s: any) => ({ slug: s.slug, name: s.name })).sort((a: any, b: any) => a.name.localeCompare(b.name)) };
  }));
talentRouter.post('/interest', rateLimit(20), (req: Request, res: Response) => {
  const db = loadDb();
  handle(res, () => {
    const { push } = sendInterest(db, req.userId!, req.body);
    saveDb(db);
    // Best effort, after saving: the request is in the student's list either way.
    sendPushToUser(push.userId, { title: push.title, body: push.body, url: push.url }).catch((e) => console.error('[talent] push failed', e?.message || e));
    return recruiterView(db, req.userId!);
  }, 201);
});
talentRouter.post('/interest/:id/withdraw', (req: Request, res: Response) =>
  write(res, (db) => { withdrawInterest(db, req.userId!, String(req.params.id)); return recruiterView(db, req.userId!); }));

// --- admin -------------------------------------------------------------------------------
talentAdminRouter.get('/', (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'private, no-store');
  res.json(adminRecruiters(loadDb()));
});
talentAdminRouter.put('/:id', (req: Request, res: Response) =>
  write(res, (db) => { reviewRecruiter(db, req.userId!, String(req.params.id), req.body); return adminRecruiters(db); }));
