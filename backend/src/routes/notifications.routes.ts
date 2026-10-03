import { Router } from 'express';
import { requireAuth, requireAdmin, requirePermission } from '../middleware/auth';
import { subscribePush, unsubscribePush, testPush, mySubscriptions } from '../lib/push';

export const notificationsRouter = Router();

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
