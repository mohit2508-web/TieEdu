/**
 * Drive event -> in-app notification row (+ best-effort push).
 *
 * `drive_notification` is the table `/api/me/notifications` reads, so every
 * student-affecting drive action lands here. The same two rules as
 * `lib/notify.ts` apply and are the reason this helper exists: a notification
 * may never fail the action that caused it, and the copy lives next to the
 * event instead of being re-invented at each call site.
 */

import { getPool } from '../db/client';
import { sendPushToUsers } from './push';
import { loadDb } from '../data/db';
import { sendDriveEmail } from './driveEmail';

export interface DriveNotifyInput {
  userId: string;
  driveId?: string | null;
  /** Stable event name: 'registered', 'payment_approved', 'slot_booked', 'results', 'admin_update'… */
  kind: string;
  title: string;
  body?: string;
  /** Site path, e.g. `/mock-drive/drives/<id>` — never an external URL. */
  url?: string;
  /** Idempotency token; unique per row so retries cannot double-post. */
  dedupeKey?: string;
}

/**
 * Kinds that also email the student. Deliberately short — one mail per
 * meaningful state change (money, seat, live link), not one per event, or the
 * inbox trains itself to ignore us. Runs only when the in-app row was actually
 * written, so the dedupe key doubles as an email idempotency guard.
 */
const AUTO_EMAIL_KINDS = new Set(['payment_approved', 'payment_rejected', 'slot_booked', 'link_activated']);

const lookupEmail = (userId: string): string => {
  try {
    const u: any = (loadDb().users || []).find((x: any) => x?.id === userId);
    return u?.email || '';
  } catch {
    return '';
  }
};

const safePath = (url?: string): string | undefined => {
  if (typeof url !== 'string' || !url.startsWith('/')) return undefined;
  if (/^[/\\]{2}/.test(url) || /^[/\\]?(https?:)?\/\//i.test(url)) return undefined;
  return url;
};

/** Never throws. Returns true when a row was actually written. */
export const emitDriveNotification = async (input: DriveNotifyInput): Promise<boolean> => {
  try {
    const r = await getPool().query(
      `INSERT INTO drive_notification (drive_id, user_id, kind, channel, status, dedupe_key, payload)
       VALUES ($1, $2, $3, 'in_app', 'sent', $4, $5)
       ON CONFLICT (dedupe_key) DO NOTHING
       RETURNING notification_id`,
      [
        input.driveId ?? null,
        input.userId,
        input.kind,
        input.dedupeKey ?? null,
        JSON.stringify({
          title: String(input.title || input.kind).slice(0, 120),
          body: String(input.body || '').slice(0, 400),
          url: safePath(input.url),
          read: false,
        }),
      ]
    );
    if (r.rowCount) {
      // Fire-and-forget push; in-app already succeeded, a provider outage must
      // not surface anywhere.
      void sendPushToUsers([input.userId], {
        title: String(input.title || input.kind).slice(0, 120),
        body: String(input.body || '').slice(0, 400),
        url: safePath(input.url) || '/',
      }).catch(() => undefined);
      if (AUTO_EMAIL_KINDS.has(input.kind)) {
        void (async () => {
          const to = lookupEmail(input.userId);
          if (!to) return;
          let driveName = 'TieEdu';
          if (input.driveId) {
            try {
              const d = await getPool().query(`SELECT title FROM mock_drive WHERE drive_id=$1`, [input.driveId]);
              if (d.rows[0]?.title) driveName = d.rows[0].title;
            } catch { /* email must never fail the action */ }
          }
          await sendDriveEmail({
            to,
            subject: String(input.title || 'Drive update').slice(0, 150),
            body: String(input.body || ''),
            url: safePath(input.url) || '/',
            driveName,
          });
        })().catch(() => undefined);
      }
      return true;
    }
    return false;
  } catch (e: any) {
    console.warn('[driveNotify] insert failed for', input.kind, e?.message);
    return false;
  }
};

/** Fan-out for a drive's audience. Returns how many rows were written. */
export const emitDriveNotificationBulk = async (
  userIds: string[],
  base: Omit<DriveNotifyInput, 'userId' | 'dedupeKey'> & { dedupePrefix?: string }
): Promise<number> => {
  let written = 0;
  for (const userId of Array.from(new Set(userIds.filter(Boolean)))) {
    const ok = await emitDriveNotification({
      ...base,
      userId,
      dedupeKey: base.dedupePrefix ? `${base.dedupePrefix}:${userId}` : undefined,
    });
    if (ok) written += 1;
  }
  return written;
};
