import { Router, Request, Response } from 'express';
import { loadDb, saveDb } from '../data/db';
import { rateLimit } from '../middleware/auth';
import { sendPushToUser } from '../lib/push';
import { GroupError, groupView, joinGroup, leaveGroup, markInboxSeen, myGroups, sendNudge, updateMembership } from '../lib/studyGroups';

/**
 * Company study groups (lib/studyGroups). Opt-in; only members see members.
 *   GET    /api/study-groups               my groups, suggestions, nudge inbox (signed in)
 *   POST   /api/study-groups/inbox/seen    mark my nudges read (signed in)
 *   GET    /api/study-groups/:slug         one group (members: full; others: a count)
 *   POST   /api/study-groups/:slug/join    { name_mode?, share_test_date?, nudges_ok? }
 *   PUT    /api/study-groups/:slug/me      update my settings
 *   DELETE /api/study-groups/:slug/me      leave
 *   POST   /api/study-groups/:slug/nudges  { to: handle, kind }
 */
export const studyGroupsRouter = Router();

const fail = (res: Response, err: any) => {
  if (err instanceof GroupError) return res.status(err.status).json({ error: err.message });
  throw err;
};
const signedIn = (req: Request, res: Response) => {
  if (req.userId) return true;
  res.status(401).json({ error: 'Sign in first.' });
  return false;
};

studyGroupsRouter.get('/', (req: Request, res: Response) => {
  if (!signedIn(req, res)) return;
  res.setHeader('Cache-Control', 'private, no-store');
  res.json(myGroups(loadDb(), req.userId!));
});

studyGroupsRouter.post('/inbox/seen', (req: Request, res: Response) => {
  if (!signedIn(req, res)) return;
  const db = loadDb();
  if (markInboxSeen(db, req.userId!) > 0) saveDb(db);
  res.status(204).end();
});

studyGroupsRouter.get('/:slug', (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'private, no-store');
  try {
    res.json(groupView(loadDb(), req.userId || null, String(req.params.slug)));
  } catch (err) {
    fail(res, err);
  }
});

studyGroupsRouter.post('/:slug/join', rateLimit(20), (req: Request, res: Response) => {
  if (!signedIn(req, res)) return;
  const db = loadDb();
  try {
    joinGroup(db, req.userId!, String(req.params.slug), req.body);
    saveDb(db);
    res.status(201).json(groupView(db, req.userId!, String(req.params.slug)));
  } catch (err) {
    fail(res, err);
  }
});

studyGroupsRouter.put('/:slug/me', (req: Request, res: Response) => {
  if (!signedIn(req, res)) return;
  const db = loadDb();
  try {
    updateMembership(db, req.userId!, String(req.params.slug), req.body);
    saveDb(db);
    res.json(groupView(db, req.userId!, String(req.params.slug)));
  } catch (err) {
    fail(res, err);
  }
});

studyGroupsRouter.delete('/:slug/me', (req: Request, res: Response) => {
  if (!signedIn(req, res)) return;
  const db = loadDb();
  try {
    if (!leaveGroup(db, req.userId!, String(req.params.slug))) return res.status(404).json({ error: 'You are not in this group.' });
    saveDb(db);
    res.status(204).end();
  } catch (err) {
    fail(res, err);
  }
});

studyGroupsRouter.post('/:slug/nudges', rateLimit(20), (req: Request, res: Response) => {
  if (!signedIn(req, res)) return;
  const db = loadDb();
  try {
    const { push } = sendNudge(db, req.userId!, String(req.params.slug), req.body);
    saveDb(db);
    // A push is a bonus on top of the in-app inbox; its failure never fails the nudge.
    sendPushToUser(push.userId, { title: push.title, body: push.body, url: push.url }).catch((e) => console.error('[study-groups] push failed', e?.message || e));
    res.status(201).json(groupView(db, req.userId!, String(req.params.slug)));
  } catch (err) {
    fail(res, err);
  }
});
