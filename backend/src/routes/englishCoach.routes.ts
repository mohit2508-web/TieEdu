import { Router, Request, Response } from 'express';
import { loadDb, saveDb } from '../data/db';
import { rateLimit } from '../middleware/auth';
import {
  aiStatus, aiUsedToday, attemptView, checkAttempt, claudeCoach, coachAttempt, CoachError, deleteAttempt, myAttempts,
  progress, promptList, recordAttempt, type Coach,
} from '../lib/englishCoach';

/**
 * English confidence coach (lib/englishCoach). AI coaching is off until an
 * admin enables it and ANTHROPIC_API_KEY is set; the pattern coach runs otherwise.
 *   GET    /api/english-coach                 { prompts, ai } (public)
 *   GET    /api/english-coach/attempts        my attempts + progress + AI used today (signed in)
 *   POST   /api/english-coach/attempts        { prompt_id, text, mode, seconds? } (signed in)
 *   DELETE /api/english-coach/attempts/:id
 */
export const englishCoachRouter = Router();

let coach: Coach | null = null;
const getCoach = () => (coach ??= claudeCoach());

englishCoachRouter.get('/', (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'public, max-age=60');
  res.json({ prompts: promptList(), ai: aiStatus(loadDb()) });
});

englishCoachRouter.get('/attempts', (req: Request, res: Response) => {
  if (!req.userId) return res.status(401).json({ error: 'Sign in first.' });
  const db = loadDb();
  res.setHeader('Cache-Control', 'private, no-store');
  res.json({ ai: aiStatus(db), ai_used_today: aiUsedToday(db, req.userId), progress: progress(db, req.userId), attempts: myAttempts(db, req.userId) });
});

englishCoachRouter.post('/attempts', rateLimit(15), async (req: Request, res: Response) => {
  if (!req.userId) return res.status(401).json({ error: 'Sign in first.' });
  const userId = req.userId;
  try {
    // Coach with no db held across the await, then record against a fresh load.
    const input = checkAttempt(req.body);
    const before = loadDb();
    const ai = aiStatus(before);
    const feedback = await coachAttempt(input.prompt, input.text, input.seconds, {
      ai,
      usedToday: aiUsedToday(before, userId),
      coach: ai.enabled ? getCoach() : undefined,
    });
    const db = loadDb();
    const a = recordAttempt(db, userId, input, feedback);
    saveDb(db);
    res.status(201).json({ attempt: attemptView(a), progress: progress(db, userId), ai_used_today: aiUsedToday(db, userId) });
  } catch (err: any) {
    // Express 4 does not catch a rejected async handler, so answer here.
    if (err instanceof CoachError) return res.status(err.status).json({ error: err.message });
    console.error('[english-coach]', err?.message || err);
    res.status(500).json({ error: 'Your practice could not be saved. Try again.' });
  }
});

englishCoachRouter.delete('/attempts/:id', (req: Request, res: Response) => {
  if (!req.userId) return res.status(401).json({ error: 'Sign in first.' });
  const db = loadDb();
  if (!deleteAttempt(db, req.userId, String(req.params.id))) return res.status(404).json({ error: 'Not found.' });
  saveDb(db);
  res.status(204).end();
});
