import { Router, Request, Response } from 'express';
import { loadDb, saveDb } from '../data/db';
import { rateLimit } from '../middleware/auth';
import { adminQueue, deleteMyOffer, moderateOffer, myOffers, OfferError, publicWall, submitOffer } from '../lib/offerWall';

/**
 * Offer wall (lib/offerWall).
 *   GET    /api/offers                 approved stories (public)
 *   GET    /api/offers/mine            my submissions          (signed in)
 *   POST   /api/offers                 submit a story          (signed in)
 *   DELETE /api/offers/mine/:id        withdraw my story       (signed in)
 *   GET    /api/admin/offers           moderation queue        (admin)
 *   PUT    /api/admin/offers/:id       { status?, verified? }  (admin)
 */
export const offersRouter = Router();
export const offersAdminRouter = Router();

const offerError = (res: Response, err: any) => {
  if (err instanceof OfferError) return res.status(err.status).json({ error: err.message });
  throw err;
};

offersRouter.get('/', (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'public, max-age=60');
  res.json(publicWall(loadDb(), { company: typeof req.query.company === 'string' ? req.query.company : undefined }));
});

offersRouter.get('/mine', (req: Request, res: Response) => {
  if (!req.userId) return res.status(401).json({ error: 'Sign in to see your stories.' });
  res.setHeader('Cache-Control', 'private, no-store');
  res.json({ items: myOffers(loadDb(), req.userId) });
});

offersRouter.post('/', rateLimit(5), (req: Request, res: Response) => {
  if (!req.userId) return res.status(401).json({ error: 'Sign in to share your story.' });
  const db = loadDb();
  try {
    const o = submitOffer(db, req.userId, req.body);
    saveDb(db);
    res.status(201).json({ id: o.id, status: o.status });
  } catch (err) {
    offerError(res, err);
  }
});

offersRouter.delete('/mine/:id', (req: Request, res: Response) => {
  if (!req.userId) return res.status(401).json({ error: 'Sign in first.' });
  const db = loadDb();
  if (!deleteMyOffer(db, req.userId, String(req.params.id))) return res.status(404).json({ error: 'Not found.' });
  saveDb(db);
  res.status(204).end();
});

offersAdminRouter.get('/', (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'private, no-store');
  res.json({ items: adminQueue(loadDb()) });
});

offersAdminRouter.put('/:id', (req: Request, res: Response) => {
  const db = loadDb();
  try {
    const o = moderateOffer(db, String(req.params.id), req.body);
    saveDb(db);
    res.json({ id: o.id, status: o.status, verified: o.verified });
  } catch (err) {
    offerError(res, err);
  }
});
