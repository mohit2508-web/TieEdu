import webpush from 'web-push';
import { loadDb, saveDb } from '../data/db';
import { can } from './rbac';
import {
  saveSubscription,
  listSubscriptionsForUser,
  retireSubscription,
  recordSendOutcome,
} from '../store/push';
import type { Request, Response } from 'express';

/**
 * The VAPID public key, exported for `GET /api/notifications/config`.
 *
 * It is public by design — it is handed to every browser that subscribes — so
 * serving it needs no auth and no permission check. The client used to read it
 * from a build-time constant instead, which meant a stale bundle could never
 * enable push no matter how many times the server was fixed.
 */
export const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@tieedu.app';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  } catch (e) {
    console.warn('[Push] Failed to set VAPID details', e);
  }
}

export interface PushSubscriptionPayload {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
  platform?: string;
}

/**
 * Same rule the install registry uses. A subscription that names an install is
 * only linked when that install actually exists, so a client cannot claim
 * ownership of someone else's device by sending a guessed id.
 */
const INSTALL_ID_RE = /^[A-Za-z0-9_-]{8,64}$/;

function newSubscriptionId(): string {
  return `push-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function sendPushToUser(userId: string, payload: { title: string; body: string; url?: string; badge?: string; icon?: string }) {
  const subs = await listSubscriptionsForUser(userId);
  if (!subs.length) return { sent: 0, failed: 0 };
  const data = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || '/',
    icon: payload.icon || '/icon-192.png',
    badge: payload.badge || '/icon-192.png',
  });
  let sent = 0;
  let failed = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: s.keys_json } as any,
        data
      );
      sent++;
      await recordSendOutcome(s.endpoint, true);
    } catch (e: any) {
      failed++;
      // The provider telling us the endpoint is gone is conclusive: retire it now
      // rather than making every future broadcast retry it.
      if (e?.statusCode === 410 || e?.statusCode === 404) {
        await retireSubscription(s.endpoint, 'push_gone');
      } else {
        // Otherwise count it. A DNS failure or a provider 500 can mean the
        // endpoint is already dead without anything saying so, and without the
        // count it would be retried on every broadcast forever.
        await recordSendOutcome(s.endpoint, false);
      }
    }
  }
  return { sent, failed };
}

/**
 * Store one subscription in both stores.
 *
 * The JSON ledger is written first and unconditionally. That ordering is the
 * contract from `store/devices.ts` and `store/staff.ts`: the ledger is the store
 * that has never failed, so it is the one that must never be skipped when the
 * cluster happens to be up.
 *
 * Returns where the row also reached the database, or false when neither store
 * took it — which is what lets the route answer honestly instead of replying
 * `{ ok: true }` to a save that went nowhere.
 */
async function storeSubscription(
  userId: string,
  sub: PushSubscriptionPayload,
  deviceId: string
): Promise<'postgres' | 'json' | false> {
  const now = new Date().toISOString();
  try {
    const source = await saveSubscription({
      id: newSubscriptionId(),
      user_id: userId,
      device_id: deviceId,
      provider: 'vapid',
      endpoint: sub.endpoint,
      keys_json: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
      created_at: now,
      last_success_at: null,
      failure_count: 0,
      disabled_at: null,
      disable_reason: null,
      user_agent: sub.userAgent || null,
      platform: sub.platform || null,
      last_seen_at: now,
    } as any);
    return source;
  } catch (e: any) {
    console.warn('[Push] could not store subscription in either store', e?.message);
    return false;
  }
}

export const subscribePush = async (req: any, res: Response) => {
  if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });
  const sub: PushSubscriptionPayload = req.body?.subscription;
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
    return res.status(400).json({ error: 'Invalid subscription' });
  }

  // The client sends its install id so a subscription belongs to a device. This
  // used to be left empty with the reasoning that "a push endpoint is already a
  // per-device identifier" — true of the endpoint, but the device admin screen
  // works in install ids, and blocking an install matches on `device_id`. With
  // no id stored, blocking a device disabled none of its endpoints.
  const rawDeviceId = req.body?.install_id;
  let deviceId = '';
  if (typeof rawDeviceId === 'string' && INSTALL_ID_RE.test(rawDeviceId)) {
    const { readDevice } = await import('../store/devices');
    const found = await readDevice(rawDeviceId);
    // Only link an install that exists. Trusting the client's id would let any
    // caller attach endpoints to another device's row.
    deviceId = found?.device ? rawDeviceId : '';
  }

  const stored = await storeSubscription(req.user.id, sub, deviceId);

  // Previously this replied `{ ok: true }` unconditionally, even when the save
  // went nowhere because PostgreSQL was unreachable. The client then flipped its
  // toggle to "on" and every later broadcast silently failed — the user had no
  // way to tell that pressing the button had done nothing.
  //
  // Saying "not stored" is the honest answer. A 503 also invites the client to
  // retry, which is the right behaviour for a temporary outage.
  if (!stored) {
    return res.status(503).json({
      ok: false,
      error: 'Could not store the subscription. Please try again.',
    });
  }

  res.json({ ok: true, stored_in: stored, device_linked: !!deviceId });
};

export const unsubscribePush = async (req: Request, res: Response) => {
  const endpoint = (req.body as any)?.endpoint;
  if (!endpoint) return res.status(400).json({ error: 'endpoint required' });
  const retired = await retireSubscription(endpoint, 'user_opted_out');

  res.json({ ok: true, stored_in: retired });
};

/**
 * The caller's own subscriptions, for the admin panel's notification tab.
 *
 * Scoped to `req.user.id` and no id parameter, deliberately: there is no way to
 * ask this route about somebody else's endpoints, so it cannot be turned into a
 * "does this admin have a device registered" oracle for other users. `keys_json`
 * is dropped before the response — the p256dh/auth pair is a delivery credential
 * and an admin UI has no use for it, so there is no reason to send it.
 */
export const mySubscriptions = async (req: Request, res: Response) => {
  if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });
  const rows = await listSubscriptionsForUser(req.user.id);

  res.json({
    count: rows.length,
    source: 'subscribed',
    subscriptions: rows.map((s) => ({
      id: s.id,
      device_id: s.device_id,
      provider: s.provider,
      // The endpoint encodes a per-browser secret in its path, so it is shown
      // truncated. Enough to recognise which browser a row belongs to, not enough
      // to push to it.
      endpoint_hint: `${s.endpoint.slice(0, 44)}...`,
      created_at: s.created_at,
      last_success_at: s.last_success_at,
      last_seen_at: s.last_seen_at || null,
      failure_count: s.failure_count,
      blocked: !!s.disabled_at,
      disable_reason: s.disable_reason || null,
      user_agent: s.user_agent || null,
      platform: s.platform || null,
    })),
  });
};

/**
 * Sends a test push to the caller.
 *
 * `requirePermission('broadcasts.send')` rather than a plain session check: this
 * sends a real notification through the real push provider, which costs money
 * per message and produces a banner on a user's device. Left at `requireAuth`,
 * any logged-in student could spam every device they can reach. Reusing the
 * broadcast permission also means a future "no staff may send notifications"
 * decision covers this route without a second edit.
 */
export const testPush = async (req: any, res: Response) => {
  if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });
  if (!req.authority || !can(req.authority, 'broadcasts.send')) {
    return res.status(403).json({
      error: 'You do not have permission to send notifications',
      required_permission: 'broadcasts.send',
    });
  }
  const r = await sendPushToUser(req.user.id, { title: 'TieEdu', body: 'Test notification' });
  res.json(r);
};
