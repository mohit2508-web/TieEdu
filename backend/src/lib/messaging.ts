import { loadDb, saveDb } from '../data/db';
import { sendDriveEmail } from './driveEmail';
import { sendPushToUser } from './push';

/**
 * One rulebook for every message we send a student (PROFESSIONAL_PLATFORM_PLAN §4).
 *
 * Features describe WHAT happened (`sendToUser(userId, event)`); this module
 * decides WHERE it goes and WHETHER it goes:
 *   1. channels — from the event's topic and the student's settings;
 *   2. transactional vs marketing — receipts, password and certificates always
 *      email; anything promotional needs opt-in and a verified email;
 *   3. caps — marketing email ≤1/day and ≤3/week; push ≤2/day (non-transactional);
 *   4. quiet hours — no non-transactional push 22:00–08:00 IST;
 *   5. dedupe — the same `dedupe` key goes out once per 24h;
 *   6. a log row for every decision, sent or skipped, so the admin can see why.
 *
 * In-app messages are not sent from here: the bell derives them from real
 * orders, reports and XP (frontend lib/notifications), so they cannot drift.
 *
 * CALL IT AFTER YOUR OWN saveDb(). The store reads and writes the whole file,
 * so a message queued before the caller saves would be overwritten by it.
 */
export type Topic = 'account' | 'purchases' | 'learning' | 'results' | 'drives' | 'company' | 'offers' | 'digest';
export type Channel = 'email' | 'push' | 'whatsapp';

export const TOPICS: { id: Topic; label: string; description: string; required?: boolean; defaults: Record<Channel, boolean> }[] = [
  { id: 'account', label: 'Account & security', description: 'Password resets, email confirmation, sign-ins.', required: true, defaults: { email: true, push: false, whatsapp: false } },
  { id: 'purchases', label: 'Payments & receipts', description: 'Receipts and payment problems.', required: true, defaults: { email: true, push: true, whatsapp: true } },
  { id: 'learning', label: 'Learning', description: 'Course reminders, streaks and certificates.', defaults: { email: true, push: true, whatsapp: false } },
  { id: 'results', label: 'Tests & results', description: 'Skill test, company test and mock interview results.', defaults: { email: true, push: true, whatsapp: true } },
  { id: 'drives', label: 'Mock drives', description: 'Registration, slots, test links and results.', defaults: { email: true, push: true, whatsapp: true } },
  { id: 'company', label: 'Your target company', description: 'New questions, drives and changes for companies you prepare for.', defaults: { email: true, push: true, whatsapp: false } },
  { id: 'offers', label: 'Offers & recommendations', description: 'Courses and packs picked for you, and discounts.', defaults: { email: true, push: false, whatsapp: false } },
  { id: 'digest', label: 'Weekly summary', description: 'A Sunday email with your progress and next steps.', defaults: { email: true, push: false, whatsapp: false } },
];

export interface MessageEvent {
  /** Machine name, e.g. `order.paid`. */
  type: string;
  topic: Topic;
  /** True for messages the student needs regardless of marketing choices. */
  transactional: boolean;
  title: string;
  /** Plain text; blank lines separate paragraphs in email. */
  body: string;
  /** Site path for the button / push tap. */
  url: string;
  ctaLabel?: string;
  /** Short push text; defaults to the first line of body. */
  pushBody?: string;
  /** Same key within 24h is sent once. */
  dedupe?: string;
}

export interface MessageLogRow {
  id: string;
  user_id: string;
  type: string;
  topic: Topic;
  channel: Channel;
  status: 'sent' | 'skipped';
  reason?: string;
  transactional: boolean;
  dedupe?: string;
  at: string;
}

type Prefs = Record<Topic, Record<Channel, boolean>>;

/** Effective per-topic settings: defaults, then the student's own choices. */
export function topicPrefs(user: any): Prefs {
  const saved = (user?.notify_topics || {}) as Partial<Record<Topic, Partial<Record<Channel, boolean>>>>;
  const out = {} as Prefs;
  for (const t of TOPICS) {
    const s = saved[t.id] || {};
    out[t.id] = {
      // Required topics always email — a receipt you cannot turn off is the point.
      email: t.required ? true : s.email ?? t.defaults.email,
      push: s.push ?? t.defaults.push,
      whatsapp: s.whatsapp ?? t.defaults.whatsapp,
    };
  }
  return out;
}

/** IST hour 0–23. */
const istHour = (d: Date) => Math.floor(((d.getUTCHours() * 60 + d.getUTCMinutes() + 330) % 1440) / 60);
export const isQuietHours = (d: Date) => {
  const h = istHour(d);
  return h >= 22 || h < 8;
};

/**
 * Pure decision for one channel — exported for tests. `log` is this user's
 * recent log rows.
 */
export function decide(
  channel: Channel,
  ev: MessageEvent,
  user: any,
  log: MessageLogRow[],
  now: Date,
  env: { whatsappReady: boolean } = { whatsappReady: false }
): { send: boolean; reason?: string } {
  const prefs = topicPrefs(user)[ev.topic];
  const global = user?.notify || { email: true, push: true, whatsapp: false };
  const since = (ms: number) => log.filter((r) => r.status === 'sent' && r.channel === channel && now.getTime() - Date.parse(r.at) < ms);

  if (ev.dedupe && log.some((r) => r.dedupe === ev.dedupe && r.channel === channel && r.status === 'sent' && now.getTime() - Date.parse(r.at) < 86_400_000)) {
    return { send: false, reason: 'duplicate' };
  }

  if (channel === 'email') {
    if (!user?.email) return { send: false, reason: 'no_email' };
    if (ev.transactional && TOPICS.find((t) => t.id === ev.topic)?.required) return { send: true };
    if (!prefs.email) return { send: false, reason: 'topic_off' };
    if (ev.transactional) return { send: true };
    if (global.email === false) return { send: false, reason: 'channel_off' };
    if (!user.email_verified) return { send: false, reason: 'email_unverified' };
    const marketing = since(7 * 86_400_000).filter((r) => !r.transactional);
    if (marketing.filter((r) => now.getTime() - Date.parse(r.at) < 86_400_000).length >= 1) return { send: false, reason: 'cap_day' };
    if (marketing.length >= 3) return { send: false, reason: 'cap_week' };
    return { send: true };
  }

  if (channel === 'push') {
    if (global.push === false) return { send: false, reason: 'channel_off' };
    if (!prefs.push) return { send: false, reason: 'topic_off' };
    if (ev.transactional) return { send: true };
    if (isQuietHours(now)) return { send: false, reason: 'quiet_hours' };
    if (since(86_400_000).filter((r) => !r.transactional).length >= 2) return { send: false, reason: 'cap_day' };
    return { send: true };
  }

  // WhatsApp: opt-in, a confirmed number, and approved templates (Phase 6).
  if (!global.whatsapp || !user?.whatsapp?.number) return { send: false, reason: 'channel_off' };
  if (!prefs.whatsapp) return { send: false, reason: 'topic_off' };
  if (!user.whatsapp.verified) return { send: false, reason: 'number_unverified' };
  if (!env.whatsappReady) return { send: false, reason: 'whatsapp_not_ready' };
  if (!ev.transactional && since(7 * 86_400_000).filter((r) => !r.transactional).length >= 1) return { send: false, reason: 'cap_week' };
  return { send: true };
}

const LOG_LIMIT = 20_000;

/**
 * Decide and send. Never throws: a message is never worth failing the request
 * that caused it.
 */
export async function sendToUser(userId: string, ev: MessageEvent, now = new Date()): Promise<Record<Channel, boolean>> {
  const result: Record<Channel, boolean> = { email: false, push: false, whatsapp: false };
  try {
    const db = loadDb() as any;
    const user = (db.users || []).find((u: any) => u.id === userId);
    if (!user || user.disabled) return result;

    db.message_log = Array.isArray(db.message_log) ? db.message_log : [];
    const mine: MessageLogRow[] = db.message_log.filter((r: MessageLogRow) => r.user_id === userId && now.getTime() - Date.parse(r.at) < 8 * 86_400_000);

    const rows: MessageLogRow[] = [];
    for (const channel of ['email', 'push', 'whatsapp'] as Channel[]) {
      const d = decide(channel, ev, user, mine, now);
      result[channel] = d.send;
      rows.push({
        id: `msg-${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
        user_id: userId,
        type: ev.type,
        topic: ev.topic,
        channel,
        status: d.send ? 'sent' : 'skipped',
        ...(d.reason ? { reason: d.reason } : {}),
        transactional: ev.transactional,
        ...(ev.dedupe ? { dedupe: ev.dedupe } : {}),
        at: now.toISOString(),
      });
    }
    db.message_log.push(...rows);
    if (db.message_log.length > LOG_LIMIT) db.message_log = db.message_log.slice(-LOG_LIMIT);
    saveDb(db);

    // Our save is done; each sender does its own load/save from here.
    if (result.email) {
      void sendDriveEmail({
        to: user.email,
        subject: ev.title,
        body: ev.body,
        driveName: 'TiEEdu',
        url: ev.url,
        ctaLabel: ev.ctaLabel || 'Open TiEEdu',
        note: ev.transactional && TOPICS.find((t) => t.id === ev.topic)?.required
          ? 'TiEEdu · You get this because of activity on your account.'
          : 'TiEEdu · Choose what we send in Account › Notifications (tieedu.in/account/notifications).',
      });
    }
    if (result.push) {
      await sendPushToUser(userId, {
        title: ev.title,
        body: ev.pushBody || ev.body.split('\n')[0].slice(0, 140),
        url: ev.url,
      }).catch(() => undefined);
    }
  } catch (err) {
    console.error('[messaging] send failed', (err as Error)?.message);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Event builders — one place for the wording of each message.
// ---------------------------------------------------------------------------

const rupees = (paisa: number | undefined) => `₹${Math.round((paisa || 0) / 100).toLocaleString('en-IN')}`;

export const events = {
  newSignIn(device: string): MessageEvent {
    const when = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
    return {
      type: 'account.new_sign_in',
      topic: 'account',
      transactional: true,
      title: `New sign-in to TiEEdu on ${device}`,
      body: `Your TiEEdu account was just signed in on ${device} (${when} IST).\n\nIf this was you, there is nothing to do.\n\nIf it was not you, reset your password now — that signs out every device — and then check Your devices in your account.`,
      pushBody: `New sign-in on ${device}`,
      url: '/account/devices',
      ctaLabel: 'Review my devices',
    };
  },

  welcome(name: string): MessageEvent {
    return {
      type: 'account.welcome',
      topic: 'account',
      transactional: true,
      title: 'Welcome to TiEEdu',
      body: `Glad you are here, ${String(name || '').split(/\s+/)[0] || 'there'}.\n\nStart with your Today page: it shows the one next step for your year — a lesson, a test or your target company's weakest round.`,
      url: '/',
      ctaLabel: 'Open my Today page',
      dedupe: 'welcome',
    };
  },

  orderPaid(order: any): MessageEvent {
    const items = (order.items || []).map((it: any) => `• ${it.name || it.slug || 'Item'}`).join('\n');
    const hasCourse = (order.items || []).some((it: any) => it.kind === 'course');
    return {
      type: 'order.paid',
      topic: 'purchases',
      transactional: true,
      title: `Payment received — ${rupees(order.amount_paisa)}`,
      body: `Thanks! Your payment of ${rupees(order.amount_paisa)} is confirmed and everything is unlocked.\n\n${items}\n\nOrder: ${order.id}${order.razorpay_payment_id ? `\nPayment id: ${order.razorpay_payment_id}` : ''}\n\nNeed a refund? You can ask within 7 days — see tieedu.in/refund-policy.`,
      pushBody: `${rupees(order.amount_paisa)} received. Your purchase is unlocked.`,
      url: hasCourse ? '/my-courses' : '/account',
      ctaLabel: hasCourse ? 'Start learning' : 'Open my purchases',
      dedupe: `order:${order.id}`,
    };
  },

  courseCertificate(c: { serial: string; course_title: string }): MessageEvent {
    return {
      type: 'certificate.course',
      topic: 'learning',
      transactional: true,
      title: `Your certificate for ${c.course_title}`,
      body: `Congratulations on finishing ${c.course_title}!\n\nYour certificate is ready. Its serial is ${c.serial}, and anyone — a recruiter, your college — can check it on TiEEdu without an account.\n\nAdd it to your LinkedIn and resume.`,
      pushBody: `Certificate ready: ${c.course_title}`,
      url: `/verify/${encodeURIComponent(c.serial)}`,
      ctaLabel: 'View my certificate',
      dedupe: `cert:${c.serial}`,
    };
  },

  skillTestResult(r: { attemptId: string; skillName: string; score: number; passed: boolean; certificateId?: string | null; weakTopics: string[] }): MessageEvent {
    const weak = r.weakTopics.slice(0, 3);
    return {
      type: 'result.skill_test',
      topic: 'results',
      // A direct answer to something the student just did, so not marketing:
      // no caps or verification gate, but the Tests & results switch applies.
      transactional: true,
      title: `${r.skillName}: you scored ${r.score}%`,
      body:
        `${r.passed ? 'Well done' : 'Good effort'} — you scored ${r.score}% in the ${r.skillName} skill test.` +
        (r.certificateId ? `\n\nYou earned a certificate. Share it from your skill passport.` : '') +
        (weak.length ? `\n\nWork on next: ${weak.join(', ')}. Retake the test when you are ready.` : ''),
      pushBody: `${r.skillName}: ${r.score}%${r.certificateId ? ' · certificate earned' : ''}`,
      url: r.certificateId ? '/skill-test/my-certificates' : '/skill-test',
      ctaLabel: r.certificateId ? 'See my certificate' : 'See my result',
      dedupe: `attempt:${r.attemptId}`,
    };
  },
};
