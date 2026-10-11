/**
 * Drive email: the transactional twin of `driveNotify`.
 *
 * In-app rows and push cover students who are on the portal; email covers the
 * ones who are not (and is the paper trail for payments). Same hard rule as
 * `driveNotify` — a mail failure never fails the action that caused it, so
 * every entry point here returns a count and swallows the error.
 */
import { loadDb, saveDb } from '../data/db';
import { queueMessage, dispatchMessage } from './email/send';

export interface DriveEmailInput {
  to: string;
  subject: string;
  body: string;
  /** Shown in the footer; defaults to a generic line. */
  driveName?: string;
  /** Site path for the CTA button (must start with `/`). */
  url?: string;
  ctaLabel?: string;
}

const validEmail = (e: string): boolean => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);

/** Queue + dispatch one drive email. Never throws. Returns true when sent. */
export const sendDriveEmail = async (input: DriveEmailInput): Promise<boolean> => {
  try {
    const to = String(input.to || '').trim().toLowerCase();
    if (!validEmail(to)) return false;
    const subject = String(input.subject || '').trim().slice(0, 150);
    const body = String(input.body || '').trim().slice(0, 4000);
    if (!subject || !body) return false;

    const db = loadDb();
    const message = queueMessage(db, {
      email: to,
      lead_id: '',
      template_id: 'drive-update',
      subject,
      vars: {
        subject,
        body,
        drive_name: String(input.driveName || 'TieEdu').slice(0, 120),
        cta_url: typeof input.url === 'string' && input.url.startsWith('/') ? input.url : '',
        cta_label: String(input.ctaLabel || 'Open your drive page').slice(0, 80),
      },
    });
    saveDb(db);
    const result = await dispatchMessage(message.id);
    return result.ok && result.status === 'sent';
  } catch {
    return false;
  }
};

/** Fire-and-forget fan-out; returns how many recipients were attempted. */
export const sendDriveEmailBulk = (
  recipients: { email: string; subject: string; body: string; url?: string }[],
  defaults: { subject: string; body: string; url?: string; driveName?: string }
): number => {
  const list = recipients.filter((r) => validEmail(String(r.email || ''))).slice(0, 1750);
  for (const r of list) {
    void sendDriveEmail({
      to: r.email,
      subject: r.subject || defaults.subject,
      body: r.body || defaults.body,
      url: r.url || defaults.url,
      driveName: defaults.driveName,
    });
  }
  return list.length;
};
