import { Router, Request, Response } from 'express';
import { loadDb, saveDb } from '../data/db';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { answerToday, challengeView, ChallengeError, DAILY_XP } from '../lib/dailyChallenge';
import { touchStreak, streakView } from '../lib/streak';
import { awardXp, syncUserXp } from '../lib/xp';

/**
 * The daily 10-minute challenge (lib/dailyChallenge).
 *
 *   GET  /api/daily-challenge          today's three questions; a signed-in
 *                                      student also gets their answers so far
 *   POST /api/daily-challenge/answer   { kind, choice } or { kind: 'hr', rating }
 */
export const dailyChallengeRouter = Router();

dailyChallengeRouter.get('/', optionalAuth, (req: Request, res: Response) => {
  const db = loadDb();
  res.setHeader('Cache-Control', 'private, no-store');
  res.json(challengeView(db, req.userId || null));
});

dailyChallengeRouter.post('/answer', requireAuth, (req: Request, res: Response) => {
  const db = loadDb();
  const userId = req.userId!;
  try {
    const result = answerToday(db, userId, req.body || {});
    let xp = 0;
    if (result.finished) {
      touchStreak(db, userId);
      const award = awardXp(db, {
        userId,
        // One award per student per day, whatever happens on retry.
        key: `daily-challenge:${userId}:${result.day}`,
        reason: 'daily_challenge',
        xp: DAILY_XP.COMPLETE + DAILY_XP.PER_CORRECT * result.correct,
        note: `Daily challenge ${result.day}: ${result.correct} of 2 correct`,
      });
      if (award.awarded) xp = award.event.xp;
      syncUserXp(db, userId);
    }
    saveDb(db);
    res.json({
      item: result.item,
      finished: result.finished,
      xp_awarded: xp,
      streak: result.finished ? streakView(db, userId) : null,
    });
  } catch (err: any) {
    if (err instanceof ChallengeError) return res.status(err.status).json({ error: err.message });
    throw err;
  }
});
