import { Router, Request, Response } from 'express';
import { loadDb, saveDb } from '../data/db';
import { optionalAuth } from '../middleware/auth';

export const commentsRouter = Router();

interface CommentItem {
  id: string;
  item_id: string;
  user_id?: string;
  user_name: string;
  user_avatar?: string;
  text: string;
  created_at: string; // ISO timestamp — formatted on the client
  is_pinned?: boolean;
  upvotes: number;
}

function dbComments(db: any): CommentItem[] {
  if (!Array.isArray(db.comments)) db.comments = [];
  return db.comments;
}

// GET /api/comments/:itemId — real persisted comments for this item, newest first
commentsRouter.get('/:itemId', (req: Request, res: Response) => {
  const db = loadDb();
  const itemId = req.params.itemId;
  const filtered = dbComments(db)
    .filter(c => c.item_id === itemId)
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  res.json(filtered);
});

// POST /api/comments — authenticated identity preferred; never fabricate authors
commentsRouter.post('/', optionalAuth, (req: Request, res: Response) => {
  const db = loadDb();
  const { item_id, text } = req.body;
  const body = (text || '').toString().trim();
  if (!item_id || !body) {
    return res.status(400).json({ error: 'item_id and text are required' });
  }
  if (body.length > 4000) {
    return res.status(400).json({ error: 'Comment is too long (max 4000 characters)' });
  }

  const user = req.user;
  const newComment: CommentItem = {
    id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    item_id,
    user_id: user?.id,
    user_name: (user?.name || 'TieEdu Student'),
    user_avatar: user?.avatar || undefined,
    text: body,
    created_at: new Date().toISOString(),
    is_pinned: false,
    upvotes: 0,
  };

  const list = dbComments(db);
  list.unshift(newComment);
  saveDb(db);
  res.json({ success: true, comment: newComment });
});

// POST /api/comments/:id/upvote — persists the increment
commentsRouter.post('/:id/upvote', (req: Request, res: Response) => {
  const db = loadDb();
  const comment = dbComments(db).find(c => c.id === req.params.id);
  if (!comment) return res.status(404).json({ error: 'Comment not found' });
  comment.upvotes += 1;
  saveDb(db);
  res.json({ success: true, comment });
});