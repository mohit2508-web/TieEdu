import { Router, Request, Response } from 'express';
import { loadDb, saveDb } from '../data/db';
import { requireAdmin, requireAuth } from '../middleware/auth';

export const unlockRouter = Router();

// GET /api/unlocks/:userId — List unlocked company ids for a user (own or admin)
unlockRouter.get('/:userId', requireAuth, (req: Request, res: Response) => {
  if (req.userId !== req.params.userId && req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'You can only view your own unlocks' });
  }
  const db = loadDb();
  const records = (db.unlocks || []).filter(
    (u: any) => u.user_id === req.params.userId && (u.status === 'active' || !u.status)
  );
  res.json({
    status: 'success',
    user_id: req.params.userId,
    unlocked_company_ids: records.map((u: any) => u.company_id),
    unlocks: records
  });
});

// POST /api/unlocks — Grant/refresh an unlock (admin-only manual grant)
unlockRouter.post('/', requireAdmin, (req: Request, res: Response) => {
  const db = loadDb();
  const { user_id, company_id, category } = req.body;
  if (!user_id || !company_id) {
    return res.status(400).json({ error: 'user_id and company_id are required' });
  }

  if (!db.users.some((u: any) => u.id === user_id)) {
    return res.status(404).json({ error: 'User not found' });
  }
  if (!db.companies.some((c: any) => c.id === company_id)) {
    return res.status(404).json({ error: 'Company not found' });
  }

  if (!db.unlocks) db.unlocks = [];
  const existing = db.unlocks.find(
    (u: any) => u.user_id === user_id && u.company_id === company_id
  );

  if (existing) {
    existing.status = 'active';
    existing.unlocked_at = new Date().toISOString();
  } else {
    db.unlocks.push({
      id: `unlock-${Date.now()}`,
      user_id,
      company_id,
      category: category || 'single_company',
      status: 'active',
      unlocked_at: new Date().toISOString()
    });
  }

  const company = db.companies.find((c: any) => c.id === company_id);
  if (company) company.unlock_count = (company.unlock_count || 0) + 1;

  saveDb(db);
  res.status(201).json({ status: 'success', message: 'Vault unlocked', company_id });
});

// DELETE /api/unlocks — Revoke an unlock (admin-only)
unlockRouter.delete('/', requireAdmin, (req: Request, res: Response) => {
  const db = loadDb();
  const { user_id, company_id } = req.body;
  db.unlocks = (db.unlocks || []).filter(
    (u: any) => !(u.user_id === user_id && u.company_id === company_id)
  );
  saveDb(db);
  res.json({ status: 'success', message: 'Unlock revoked' });
});