import webpush from 'web-push';
import { loadDb, saveDb } from '../data/db';
import { getPool, isDbReachable } from '../db/client';
import { can } from './rbac';
import type { Request, Response } from 'express';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
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

async function saveSubscriptionToPg(userId: string, sub: PushSubscriptionPayload) {
  const reached = await isDbReachable(3000);
  if (!reached) return false;
  try {
    await getPool().query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent, platform, active, last_seen_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE, NOW(), NOW())
       ON CONFLICT (endpoint)
       DO UPDATE SET
         user_id = EXCLUDED.user_id,
         p256dh = EXCLUDED.p256dh,
         auth = EXCLUDED.auth,
         user_agent = COALESCE(EXCLUDED.user_agent, push_subscriptions.user_agent),
         platform = COALESCE(EXCLUDED.platform, push_subscriptions.platform),
         active = TRUE,
         last_seen_at = NOW(),
         updated_at = NOW()`,
      [userId, sub.endpoint, sub.keys.p256dh, sub.keys.auth, sub.userAgent || null, sub.platform || null]
    );
    return true;
  } catch (e) {
    console.warn('[Push] PG save subscription failed', e);
    return false;
  }
}

async function deactivateSubscription(endpoint: string) {
  const reached = await isDbReachable(3000);
  if (!reached) return false;
  try {
    await getPool().query(
      `UPDATE push_subscriptions SET active = FALSE, updated_at = NOW(), last_seen_at = NOW() WHERE endpoint = $1`,
      [endpoint]
    );
    return true;
  } catch (e) {
    return false;
  }
}

async function getActiveSubscriptionsForUser(userId: string): Promise<PushSubscriptionPayload[]> {
  const reached = await isDbReachable(3000);
  if (!reached) return [];
  try {
    const res = await getPool().query(
      `SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1 AND active = TRUE`,
      [userId]
    );
    return (res.rows || []).map((r: any) => ({
      endpoint: r.endpoint,
      keys: { p256dh: r.p256dh, auth: r.auth },
    }));
  } catch (e) {
    return [];
  }
}

export async function sendPushToUser(userId: string, payload: { title: string; body: string; url?: string; badge?: string; icon?: string }) {
  const subs = await getActiveSubscriptionsForUser(userId);
  if (!subs.length) return { sent: 0, failed: 0 };
  const data = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || '/',
    icon: payload.icon || '/icon-192.png',
    badge: payload.badge || '/icon-192.png',
  });
  let sent = 0, failed = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification(s as any, data);
      sent++;
    } catch (e: any) {
      failed++;
      if (e?.statusCode === 410 || e?.statusCode === 404) {
        await deactivateSubscription(s.endpoint);
      }
    }
  }
  return { sent, failed };
}

/**
 * Store one subscription, preferring PostgreSQL and falling back to the JSON
 * ledger. Returns where it landed, or false if neither store took it.
 *
 * The fallback is the important part. `DATABASE_URL` fails closed by design (M0),
 * so the common dev setup has no cluster — and a push feature that only works
 * when Postgres happens to be up is a feature nobody can test locally. It is
 * also how a cluster outage during a broadcast turns into "nobody got told"
 * instead of "delivery retried when the database came back".
 *
 * Reads still prefer the database and fall back to JSON, so a subscription
 * created without Postgres keeps working after one is added.
 */
async function saveSubscription(userId: string, sub: PushSubscriptionPayload): Promise<'postgres' | 'json' | false> {
  if (await saveSubscriptionToPg(userId, sub)) return 'postgres';
  try {
    const db = loadDb();
    db.push_subscriptions = db.push_subscriptions || [];
    const now = new Date().toISOString();
    const existing = db.push_subscriptions.find((s: any) => s.endpoint === sub.endpoint);
    if (existing) {
      existing.user_id = userId;
      existing.keys_json = { p256dh: sub.keys.p256dh, auth: sub.keys.auth };
      existing.disabled_at = null;
      existing.disable_reason = null;
      existing.failure_count = 0;
    } else {
      db.push_subscriptions.push({
        id: `push-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        user_id: userId,
        // No device_id: the client subscribe call has no install id, and it does
        // not need one — a push endpoint is already a per-device identifier.
        device_id: '',
        provider: 'vapid',
        endpoint: sub.endpoint,
        keys_json: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
        created_at: now,
        last_success_at: null,
        failure_count: 0,
        disabled_at: null,
        disable_reason: null,
      });
    }
    saveDb(db);
    return 'json';
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

  const stored = await saveSubscription(req.user.id, sub);

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

  res.json({ ok: true, stored_in: stored });
};

export const unsubscribePush = async (req: Request, res: Response) => {
  const endpoint = (req.body as any)?.endpoint;
  if (!endpoint) return res.status(400).json({ error: 'endpoint required' });
  const disabled = await deactivateSubscription(endpoint);

  // Also retire it in the JSON ledger, or a subscription created while Postgres
  // was down stays live after the user opted out.
  try {
    const db = loadDb();
    let changed = false;
    for (const s of db.push_subscriptions || []) {
      if ((s as any).endpoint === endpoint && !s.disabled_at) {
        s.disabled_at = new Date().toISOString();
        s.disable_reason = 'user_opted_out';
        changed = true;
      }
    }
    if (changed) saveDb(db);
  } catch { /* best effort; the database is the authority when present */ }

  res.json({ ok: true, disabled_in_db: disabled });
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
