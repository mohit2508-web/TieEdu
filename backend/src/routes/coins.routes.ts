import { Router, Request, Response } from 'express';
import { loadDb, safeSaveDb } from '../data/db';
import { optionalAuth, requireAuth } from '../middleware/auth';
import { balanceOf, recentCoins, rulesOf, todayTasks } from '../lib/coins';
import { istDate, streakView } from '../lib/streak';
import { dailyProblem } from '../lib/practice/daily';
import { itemById } from '../lib/store';

/**
 * TiE Coins (TIE_COINS_STORE_PLAN.md).
 *   GET /api/coins/rules   the "How to earn" table (public)
 *   GET /api/coins/me      balance, streak, today's tasks, next milestone, recent rows
 */
export const coinsRouter = Router();

coinsRouter.get('/rules', (_req: Request, res: Response) => {
  const db = loadDb();
  res.json({ rules: rulesOf(db).filter((r) => r.on).map((r) => ({ id: r.id, label: r.label, coins: r.coins, by_difficulty: r.by_difficulty || null, milestones: r.milestones || null, cap_day: r.cap_day || null })) });
});

coinsRouter.get('/me', requireAuth, (req: Request, res: Response) => {
  const db = loadDb();
  const userId = req.userId!;
  res.setHeader('Cache-Control', 'private, no-store');
  const streak = streakView(db, userId);
  const ms = rulesOf(db).find((r) => r.id === 'streak');
  const next = ms?.on && ms.milestones
    ? Object.entries(ms.milestones).map(([d, c]) => ({ days: Number(d), coins: c })).sort((a, b) => a.days - b.days).find((m) => m.days > streak.current) || null
    : null;
  res.json({
    coins: balanceOf(db, userId),
    streak: { current: streak.current, best: streak.best, practised_today: streak.practised_today, protected_by_freeze: streak.protected_by_freeze, week: streak.week },
    next_milestone: next,
    today: todayTasks(db, userId, dailyProblem(istDate(), db)?.id || null),
    recent: recentCoins(db, userId, 20),
    goal: goalOf(db, userId),
  });
});

/** The store item a student is saving for ("Set as my goal"), shown as a progress bar across the site. */
function goalOf(db: any, userId: string) {
  const user = (db.users || []).find((u: any) => u.id === userId);
  const item = user?.coin_goal ? itemById(db, user.coin_goal) : null;
  return item && item.active ? { item_id: item.id, name: item.name, coins: item.coins, art: item.art, image: item.image || null } : null;
}

coinsRouter.post('/goal', requireAuth, (req: Request, res: Response) => {
  const db = loadDb();
  const user = (db.users || []).find((u: any) => u.id === req.userId);
  if (!user) return res.status(404).json({ error: 'Account not found' });
  const id = req.body?.item_id == null ? null : String(req.body.item_id);
  if (id && !itemById(db, id)?.active) return res.status(400).json({ error: 'That item is not in the store' });
  user.coin_goal = id;
  safeSaveDb(db);
  res.json({ goal: goalOf(db, req.userId!), coins: balanceOf(db, req.userId!) });
});

/** Signed-out visitors still see the earning table; this keeps one call for the header. */
coinsRouter.get('/summary', optionalAuth, (req: Request, res: Response) => {
  const db = loadDb();
  if (!req.userId) return res.json({ signed_in: false });
  const s = streakView(db, req.userId);
  res.setHeader('Cache-Control', 'private, no-store');
  res.json({ signed_in: true, coins: balanceOf(db, req.userId), streak: s.current, practised_today: s.practised_today, goal: goalOf(db, req.userId) });
});
