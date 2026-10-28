import { Router, Request, Response } from 'express';
import { loadDb, saveDb } from '../data/db';
import { rateLimit } from '../middleware/auth';
import {
  aiStatus, aiUsedToday, checkAnswer, claudeGrader, deleteSession, gradeAnswer, InterviewError, mySessions,
  recordAnswer, sessionView, sessionsOf, startSession, type Grader,
} from '../lib/mockInterview';

/**
 * AI mock interview (lib/mockInterview). AI grading is off until an admin
 * enables it and ANTHROPIC_API_KEY is set; the rubric grades otherwise.
 *   GET    /api/mock-interview                 { ai: { enabled, daily_limit } } (public)
 *   GET    /api/mock-interview/sessions        my sessions + AI used today (signed in)
 *   POST   /api/mock-interview/sessions        { kind, company_slug? } (signed in)
 *   POST   /api/mock-interview/sessions/:id/answers  { question_id, text } (signed in)
 *   DELETE /api/mock-interview/sessions/:id
 */
export const mockInterviewRouter = Router();

let grader: Grader | null = null;
const getGrader = () => (grader ??= claudeGrader());

const fail = (res: Response, err: any) => {
  if (err instanceof InterviewError) return res.status(err.status).json({ error: err.message });
  throw err;
};

mockInterviewRouter.get('/', (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'public, max-age=60');
  res.json({ ai: aiStatus(loadDb()) });
});

mockInterviewRouter.get('/sessions', (req: Request, res: Response) => {
  if (!req.userId) return res.status(401).json({ error: 'Sign in first.' });
  const db = loadDb();
  res.setHeader('Cache-Control', 'private, no-store');
  res.json({ ai: aiStatus(db), ai_used_today: aiUsedToday(db, req.userId), sessions: mySessions(db, req.userId) });
});

mockInterviewRouter.post('/sessions', rateLimit(10), (req: Request, res: Response) => {
  if (!req.userId) return res.status(401).json({ error: 'Sign in first.' });
  const db = loadDb();
  try {
    const s = startSession(db, req.userId, req.body);
    saveDb(db);
    res.status(201).json({ session: sessionView(db, s) });
  } catch (err) {
    fail(res, err);
  }
});

mockInterviewRouter.post('/sessions/:id/answers', rateLimit(15), async (req: Request, res: Response) => {
  if (!req.userId) return res.status(401).json({ error: 'Sign in first.' });
  const userId = req.userId;
  const id = String(req.params.id);
  try {
    // Validate and read the limits, then grade with no db held across the await.
    const before = loadDb();
    const { question, text, company } = checkAnswer(before, userId, id, req.body);
    const ai = aiStatus(before);
    const feedback = await gradeAnswer(question, text, company, {
      ai,
      usedToday: aiUsedToday(before, userId),
      grader: ai.enabled ? getGrader() : undefined,
    });
    const db = loadDb();
    recordAnswer(db, userId, id, question.id, text, feedback);
    saveDb(db);
    const s = sessionsOf(db).find((x) => x.id === id)!;
    res.status(201).json({ session: sessionView(db, s), ai_used_today: aiUsedToday(db, userId) });
  } catch (err: any) {
    // Express 4 does not catch a rejected async handler, so answer here.
    if (err instanceof InterviewError) return res.status(err.status).json({ error: err.message });
    console.error('[mock-interview]', err?.message || err);
    res.status(500).json({ error: 'Your answer could not be saved. Try again.' });
  }
});

mockInterviewRouter.delete('/sessions/:id', (req: Request, res: Response) => {
  if (!req.userId) return res.status(401).json({ error: 'Sign in first.' });
  const db = loadDb();
  if (!deleteSession(db, req.userId, String(req.params.id))) return res.status(404).json({ error: 'Not found.' });
  saveDb(db);
  res.status(204).end();
});
