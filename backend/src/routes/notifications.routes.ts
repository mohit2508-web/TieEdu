import { Router } from 'express';
import { requireAuth, requireAdmin, requirePermission } from '../middleware/auth';
import { subscribePush, unsubscribePush, testPush } from '../lib/push';

export const notificationsRouter = Router();

notificationsRouter.post('/subscribe', requireAuth, subscribePush);
notificationsRouter.post('/unsubscribe', requireAuth, unsubscribePush);
// requireAdmin resolves req.authority, which requirePermission then reads. With
// only requireAuth mounted here, req.authority was undefined and testPush's own
// guard refused every caller — staff included — so the button on the account page
// could never work. Mount the permission the same way every admin route does.
notificationsRouter.post('/test', requireAdmin, requirePermission('broadcasts.send'), testPush);
