import { Router, Request, Response } from 'express';
import { loadDb, saveDb } from '../data/db';
import { optionalAuth } from '../middleware/auth';

export const progressRouter = Router();

interface UserProgress {
  solved_item_ids: string[];
  bookmarked_item_ids: string[];
}

const EMPTY: UserProgress = { solved_item_ids: [], bookmarked_item_ids: [] };

// GET /api/progress/:userId — only the account owner (or an admin) can read their progress.
progressRouter.get('/:userId', optionalAuth, (req: Request, res: Response) => {
  const userId = req.params.userId;
  const canRead = req.user?.id === userId || req.user?.role === 'admin';
  if (!canRead) return res.status(403).json({ error: 'You can only view your own progress' });

  const db = loadDb();
  const progress: UserProgress = db.progress?.[userId] || EMPTY;
  res.json(progress);
});

// POST /api/progress/toggle-solve — identity comes from the Bearer token, never from the body.
progressRouter.post('/toggle-solve', optionalAuth, (req: Request, res: Response) => {
  const { itemId } = req.body;
  if (!itemId) return res.status(400).json({ error: 'itemId required' });
  if (!req.userId) return res.status(401).json({ error: 'Sign in to track solved questions' });

  const db = loadDb();
  if (!db.progress) db.progress = {};
  const progress = db.progress[req.userId] || { ...EMPTY };

  const solved = progress.solved_item_ids;
  const index = solved.indexOf(itemId);
  if (index > -1) solved.splice(index, 1);
  else solved.push(itemId);

  db.progress[req.userId] = progress;
  saveDb(db);
  res.json({ success: true, progress });
});

// POST /api/progress/toggle-bookmark — identity from token only.
progressRouter.post('/toggle-bookmark', optionalAuth, (req: Request, res: Response) => {
  const { itemId } = req.body;
  if (!itemId) return res.status(400).json({ error: 'itemId required' });
  if (!req.userId) return res.status(401).json({ error: 'Sign in to bookmark questions' });

  const db = loadDb();
  if (!db.progress) db.progress = {};
  const progress = db.progress[req.userId] || { ...EMPTY };

  const bookmarks = progress.bookmarked_item_ids;
  const index = bookmarks.indexOf(itemId);
  if (index > -1) bookmarks.splice(index, 1);
  else bookmarks.push(itemId);

  db.progress[req.userId] = progress;
  saveDb(db);
  res.json({ success: true, progress });
});