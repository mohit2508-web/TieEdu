import { Router, Request, Response } from 'express';
import { loadDb, saveDb } from '../data/db';
import { rateLimit } from '../middleware/auth';
import { adminClaims, claimableCompanies, ClaimError, fileClaim, guaranteeSettings, myClaims, reviewClaim } from '../lib/accuracyGuarantee';

/**
 * Accuracy guarantee (lib/accuracyGuarantee). Off until an admin enables it.
 *   GET  /api/guarantee                 { enabled, amount, window_days } (public)
 *   GET  /api/guarantee/mine            my claims + companies I can claim for (signed in)
 *   POST /api/guarantee/claims          file a claim (signed in)
 *   GET  /api/admin/guarantee/claims    review queue (admin)
 *   PUT  /api/admin/guarantee/claims/:id  { status?, admin_note? } (admin)
 */
export const guaranteeRouter = Router();
export const guaranteeAdminRouter = Router();

guaranteeRouter.get('/', (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'public, max-age=60');
  res.json(guaranteeSettings(loadDb()));
});

guaranteeRouter.get('/mine', (req: Request, res: Response) => {
  if (!req.userId) return res.status(401).json({ error: 'Sign in first.' });
  const db = loadDb();
  res.setHeader('Cache-Control', 'private, no-store');
  res.json({ settings: guaranteeSettings(db), claims: myClaims(db, req.userId), claimable: claimableCompanies(db, req.userId) });
});

guaranteeRouter.post('/claims', rateLimit(5), (req: Request, res: Response) => {
  if (!req.userId) return res.status(401).json({ error: 'Sign in first.' });
  const db = loadDb();
  try {
    const c = fileClaim(db, req.userId, req.body);
    saveDb(db);
    res.status(201).json({ id: c.id, status: c.status, amount: c.amount });
  } catch (err: any) {
    if (err instanceof ClaimError) return res.status(err.status).json({ error: err.message });
    throw err;
  }
});

guaranteeAdminRouter.get('/claims', (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'private, no-store');
  res.json({ settings: guaranteeSettings(loadDb()), items: adminClaims(loadDb()) });
});

guaranteeAdminRouter.put('/claims/:id', (req: Request, res: Response) => {
  const db = loadDb();
  try {
    const c = reviewClaim(db, String(req.params.id), req.body);
    saveDb(db);
    res.json({ id: c.id, status: c.status, admin_note: c.admin_note });
  } catch (err: any) {
    if (err instanceof ClaimError) return res.status(err.status).json({ error: err.message });
    throw err;
  }
});
