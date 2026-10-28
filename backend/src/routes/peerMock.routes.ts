import { Router, Request, Response } from 'express';
import { loadDb, saveDb } from '../data/db';
import { rateLimit } from '../middleware/auth';
import { cancelSession, createSession, deleteNote, getSession, joinByCode, mySessions, PeerError, rubric, sessionView, submitRatings } from '../lib/peerMock';

/**
 * Peer mock interviews (lib/peerMock). Pairing by code only. All signed in.
 *   GET    /api/peer-mock                    rubric + my sessions
 *   POST   /api/peer-mock                    { kind } → a session with a code (interviewer)
 *   POST   /api/peer-mock/join               { code } (candidate)
 *   GET    /api/peer-mock/:id                one session (polled while waiting)
 *   POST   /api/peer-mock/:id/ratings        { ratings, note } (interviewer)
 *   POST   /api/peer-mock/:id/cancel
 *   DELETE /api/peer-mock/:id/note           (candidate)
 */
export const peerMockRouter = Router();

peerMockRouter.use((req: Request, res: Response, next) => {
  if (!req.userId) return res.status(401).json({ error: 'Sign in first.' });
  res.setHeader('Cache-Control', 'private, no-store');
  next();
});

const handle = (res: Response, fn: () => unknown, status = 200) => {
  try {
    res.status(status).json(fn());
  } catch (err: any) {
    if (err instanceof PeerError) return res.status(err.status).json({ error: err.message });
    throw err;
  }
};

peerMockRouter.get('/', (req: Request, res: Response) => {
  res.json({ rubric: rubric(), sessions: mySessions(loadDb(), req.userId!) });
});

peerMockRouter.post('/', rateLimit(10), (req: Request, res: Response) => {
  const db = loadDb();
  handle(res, () => {
    const s = createSession(db, req.userId!, req.body);
    saveDb(db);
    return { session: sessionView(db, req.userId!, s) };
  }, 201);
});

// Few attempts a minute, so codes cannot be guessed by brute force.
peerMockRouter.post('/join', rateLimit(8), (req: Request, res: Response) => {
  const db = loadDb();
  handle(res, () => {
    const s = joinByCode(db, req.userId!, req.body?.code);
    saveDb(db);
    return { session: sessionView(db, req.userId!, s) };
  });
});

peerMockRouter.get('/:id', (req: Request, res: Response) => {
  handle(res, () => ({ session: getSession(loadDb(), req.userId!, String(req.params.id)) }));
});

peerMockRouter.post('/:id/ratings', rateLimit(10), (req: Request, res: Response) => {
  const db = loadDb();
  handle(res, () => {
    const s = submitRatings(db, req.userId!, String(req.params.id), req.body);
    saveDb(db);
    return { session: sessionView(db, req.userId!, s) };
  });
});

peerMockRouter.post('/:id/cancel', (req: Request, res: Response) => {
  const db = loadDb();
  handle(res, () => {
    const s = cancelSession(db, req.userId!, String(req.params.id));
    saveDb(db);
    return { session: sessionView(db, req.userId!, s) };
  });
});

peerMockRouter.delete('/:id/note', (req: Request, res: Response) => {
  const db = loadDb();
  handle(res, () => {
    const s = deleteNote(db, req.userId!, String(req.params.id));
    saveDb(db);
    return { session: sessionView(db, req.userId!, s) };
  });
});
