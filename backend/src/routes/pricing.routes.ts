import { Router, Request, Response } from 'express';
import { loadDb } from '../data/db';
import { optionalAuth } from '../middleware/auth';
import { buildPricingCatalog } from '../lib/pricing';
import { ownedModuleIdsFor, unlockedCompanyIds } from '../payments/orders';

export const pricingRouter = Router();

/**
 * GET /api/pricing/catalog — the ONLY pricing the frontend is allowed to display.
 *
 * Public (no auth required) so the marketing pricing page can render before signup.
 * Every number comes from lib/pricing.ts, the same module checkout charges from, so a
 * price shown on a card is by construction the price the gateway will be asked for.
 *
 * Per-user ownership (Bearer token optional) only switches rows to their real
 * "remaining modules" price — it can never change the ladder itself.
 */
pricingRouter.get('/catalog', optionalAuth, (req: Request, res: Response) => {
  const db = loadDb();
  const userId = req.userId || '';
  const isAdmin = req.user?.role === 'admin';

  const owned = userId ? ownedModuleIdsFor(db, userId) : [];
  const unlocked = userId ? unlockedCompanyIds(db, userId) : [];

  res.json(buildPricingCatalog(db.companies || [], owned, unlocked, isAdmin));
});
