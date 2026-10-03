import { Router } from 'express';
import { requireAuth, requireAdmin, requirePermission } from '../middleware/auth';
import { subscribePush, unsubscribePush, testPush, mySubscriptions, VAPID_PUBLIC_KEY } from '../lib/push';

export const notificationsRouter = Router();

/*
 * The client's public VAPID key, fetched at runtime instead of read from a
 * build-time constant.
 *
 * Deliberately unauthenticated: this key is handed to every browser that
 * subscribes, so there is nothing secret to protect. It exists because inlining
 * it at build time made a stale bundle permanently unable to enable push — a
 * client cached from an earlier deploy kept reporting "push keys are not
 * configured" against a server that was configured correctly, and the only cure
 * was for every user to clear site data.
 *
 * Returns `{ vapidPublicKey: null }` rather than 404 when unconfigured, so the
 * client can tell "not set up" apart from "wrong address".
 */
notificationsRouter.get('/config', (_req, res) => {
  res.json({ vapidPublicKey: VAPID_PUBLIC_KEY || null });
});

notificationsRouter.post('/subscribe', requireAuth, subscribePush);
notificationsRouter.post('/unsubscribe', requireAuth, unsubscribePush);
// The admin panel's "Notifications" tab needs to show what this admin's own
// browsers registered, and `requireAuth` alone is correct here: this only ever
// returns the caller's own rows, so there is nothing to gate behind a permission.
notificationsRouter.get('/mine', requireAuth, mySubscriptions);
// requireAdmin resolves req.authority, which requirePermission then reads. With
// only requireAuth mounted here, req.authority was undefined and testPush's own
// guard refused every caller — staff included — so the button on the account page
// could never work. Mount the permission the same way every admin route does.
notificationsRouter.post('/test', requireAdmin, requirePermission('broadcasts.send'), testPush);
