import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { subscribePush, unsubscribePush, testPush } from '../lib/push';

export const notificationsRouter = Router();

notificationsRouter.post('/subscribe', requireAuth, subscribePush);
notificationsRouter.post('/unsubscribe', requireAuth, unsubscribePush);
notificationsRouter.post('/test', requireAuth, testPush);
