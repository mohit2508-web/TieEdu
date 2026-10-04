import { Router } from 'express';
import type { Request, Response } from 'express';
import { requireAuth, requireAdmin, requirePermission } from '../middleware/auth';
import { can } from '../lib/rbac';
import { subscribePush, unsubscribePush, testPush, mySubscriptions, VAPID_PUBLIC_KEY, sendPushToUsers } from '../lib/push';
import { buildCopy, resolveAudience, type NotifyAudience } from '../lib/notify';
import { startReminderScheduler } from '../lib/reminders';
import { loadDb, saveDb } from '../data/db';
import { appendAudit } from '../store/audit';

export const notificationsRouter = Router();

/*
 * Armed here rather than in server.ts because this router *is* the notification
 * subsystem's entry point, and it is mounted unconditionally. A background loop
 * is part of that subsystem, so it belongs with it; putting the call in server.ts
 * would only move one line somewhere with no better reason. `startReminderScheduler`
 * is idempotent and unrefs its timers, so importing this module in a test or a
 * script does not start a loop or hold the process open.
 */
startReminderScheduler();

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

/**
 * Staff-initiated notification to students.
 *
 * Separate from `/test` on purpose. The test button only ever notifies the
 * caller's own devices, which made it impossible to reach a student at all: the
 * only caller of `sendPushToUser` was the self-test, so subscribing 10,000
 * students would have delivered nothing to any of them.
 */
notificationsRouter.post(
  '/broadcast',
  requireAdmin,
  requirePermission('broadcasts.send'),
  async (req: Request, res: Response) => {
    // Re-checked in the body rather than only by the route guard. `testPush` does
    // the same, and for the same reason: the guard depends on `req.authority`,
    // which only exists if `requireAdmin` ran, and that coupling is worth being
    // explicit about at the point of sending to real accounts.
    if (!req.authority || !can(req.authority, 'broadcasts.send')) {
      return res.status(403).json({
        error: 'You do not have permission to send notifications',
        required_permission: 'broadcasts.send',
      });
    }

    const { audience, title, body, url, confirm } = req.body || {};

    /*
     * Confirmation is a server-side requirement, not just a UI nicety.
     *
     * The UI asks the admin to retype the title before this is reachable, but a
     * confirmation that only exists in the client is not a confirmation at all —
     * a retried request or a hand-written call sends to every student just as
     * easily. So the server refuses without it.
     */
    if (confirm !== true) {
      return res.status(400).json({
        error: 'Broadcast not sent: confirmation is required.',
        code: 'confirmation_required',
      });
    }

    const text = typeof title === 'string' ? title.trim() : '';
    const detail = typeof body === 'string' ? body.trim() : '';
    if (!text) return res.status(400).json({ error: 'A title is required.' });
    if (text.length > 80) return res.status(400).json({ error: 'Title must be 80 characters or fewer.' });
    if (!detail) return res.status(400).json({ error: 'A message body is required.' });
    if (detail.length > 200) return res.status(400).json({ error: 'Message must be 200 characters or fewer.' });

    const target: NotifyAudience =
      audience?.kind === 'course'
        ? { kind: 'course', courseId: String(audience.courseId || '') }
        : audience?.kind === 'users'
          ? { kind: 'users', userIds: Array.isArray(audience.userIds) ? audience.userIds : [] }
          : { kind: 'all_students' };

    /*
     * Everyone is a separate capability from "somebody".
     *
     * `broadcasts.send` is held by the default admin role, so without this a
     * routine permission would be enough to message the entire student body —
     * irreversibly, to phones we do not control. `danger.broadcast.all` exists
     * for exactly this and is granted only to super_admin.
     */
    if (target.kind === 'all_students' && (!req.authority || !can(req.authority, 'danger.broadcast.all'))) {
      return res.status(403).json({
        error: 'Sending to every student requires the danger.broadcast.all permission.',
        required_permission: 'danger.broadcast.all',
      });
    }

    if (target.kind === 'course' && !target.courseId) {
      return res.status(400).json({ error: 'A course id is required for a course audience.' });
    }
    if (target.kind === 'users' && !target.userIds.length) {
      return res.status(400).json({ error: 'Select at least one student.' });
    }

    // Relative paths only. An absolute or protocol-relative URL in a stored
    // broadcast would turn a portal notification into a link off-site.
    const link = typeof url === 'string' && url.startsWith('/') ? url : '/';

    const userIds = resolveAudience(target);
    if (!userIds.length) {
      return res.status(400).json({ error: 'That audience has no students to notify.' });
    }

    const copy = buildCopy({ type: 'vault.updated', title: text, detail, slug: undefined });
    const result = await sendPushToUsers(userIds, {
      title: copy.title,
      body: copy.body,
      url: link,
    });

    // Audit before save, like every other admin route: appendAudit only mutates
    // the in-memory graph, so saving first would drop the trail of who told the
    // entire student body something.
    const db = loadDb();
    await appendAudit(db, {
      action: 'notification.broadcast',
      actor: req.user?.email || 'system',
      detail: `Sent "${text}" to ${target.kind === 'all_students' ? 'all students' : target.kind === 'course' ? `course ${target.courseId}` : `${userIds.length} student(s)`}`,
      target: target.kind === 'course' ? target.courseId : undefined,
      meta: {
        audience: target.kind,
        requested_users: target.kind === 'users' ? target.userIds.length : undefined,
        resolved_users: userIds.length,
        sent: result.sent,
        failed: result.failed,
      },
    });
    saveDb(db);

    res.json({
      ok: true,
      resolved_users: userIds.length,
      endpoints: result.endpoints,
      recipients: result.recipients,
      sent: result.sent,
      failed: result.failed,
      skipped: userIds.length - result.recipients,
    });
  }
);
