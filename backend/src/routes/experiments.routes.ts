import { Router, Request, Response } from 'express';
import { loadDb, saveDb } from '../data/db';
import { rateLimit } from '../middleware/auth';
import { publicExperiments, recordEvent, results, setStatus } from '../lib/experiments';

/**
 * A/B experiments (lib/experiments).
 *   GET  /api/experiments           running experiments and their variants (public)
 *   POST /api/experiments/events    { experiment, variant, event, vid } (public; once per visitor)
 *   GET  /api/admin/experiments     results
 *   PUT  /api/admin/experiments/:id { status: running | stopped | off }
 */
export const experimentsRouter = Router();
export const experimentsAdminRouter = Router();

experimentsRouter.get('/', (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'public, max-age=60');
  res.json({ experiments: publicExperiments(loadDb()) });
});

experimentsRouter.post('/events', rateLimit(60), (req: Request, res: Response) => {
  const db = loadDb();
  // Only a counted event writes; repeats and invalid events cost nothing.
  if (recordEvent(db, req.body)) saveDb(db);
  res.status(204).end();
});

experimentsAdminRouter.get('/', (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'private, no-store');
  res.json({ experiments: results(loadDb()) });
});

experimentsAdminRouter.put('/:id', (req: Request, res: Response) => {
  const db = loadDb();
  try {
    setStatus(db, String(req.params.id), req.body?.status);
    saveDb(db);
    res.json({ experiments: results(db) });
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'That did not work.' });
  }
});
