import { loadDb, safeSaveDb } from '../data/db';
import { profilesOf } from './companyPageStudent';
import { dayDiff, istDate } from './streak';
import { sendPushToUser } from './push';

/**
 * Daily countdown push (TRAIN_TEST_TRACK_PLAN §7): at 9:00 IST, every student
 * with an upcoming test date gets "39 days left for Infosys". Only students
 * who subscribed to push receive anything (sendPushToUser is a no-op without a
 * subscription or VAPID keys). One push per student per day, nearest date only;
 * the day sent is recorded so a restart cannot send it twice.
 */
const SEND_HOUR_IST = 9;
const TICK_MS = 10 * 60 * 1000;

const istHour = (now: Date) => Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' }).format(now));

export async function sendCountdownPushes(now = new Date()): Promise<number> {
  const db: any = loadDb();
  const today = istDate(now);
  if (db.countdown_push_last_day === today) return 0;

  const nearest = new Map<string, { company_id: string; days: number }>();
  for (const p of profilesOf(db)) {
    if (!p.test_date || p.test_date < today) continue;
    const days = dayDiff(today, p.test_date);
    const cur = nearest.get(p.user_id);
    if (!cur || days < cur.days) nearest.set(p.user_id, { company_id: p.company_id, days });
  }

  let sent = 0;
  for (const [userId, { company_id, days }] of nearest) {
    const c = (db.companies || []).find((x: any) => x.id === company_id);
    if (!c) continue;
    const title = days === 0 ? `Today is your ${c.name} test` : `${days} day${days === 1 ? '' : 's'} left for ${c.name}`;
    const body = days === 0 ? 'Revise your weak topics and stay calm. You prepared for this.' : "Open today's plan: one Train task and one Test.";
    try {
      await sendPushToUser(userId, { title, body, url: '/' });
      sent++;
    } catch {
      /* a dead subscription must not stop the rest */
    }
  }

  db.countdown_push_last_day = today;
  safeSaveDb(db);
  return sent;
}

let started = false;

/** Arm the 10-minute check. Idempotent; the timer is unref'd. */
export const startCountdownPushScheduler = (): void => {
  if (started) return;
  started = true;
  let running = false;
  const tick = async () => {
    if (running || istHour(new Date()) < SEND_HOUR_IST) return;
    running = true;
    try {
      const n = await sendCountdownPushes();
      if (n) console.log(`[Countdown] sent ${n} daily push(es).`);
    } catch (e: any) {
      console.warn('[Countdown] push pass failed:', e?.message);
    } finally {
      running = false;
    }
  };
  const timer = setInterval(tick, TICK_MS);
  (timer as any).unref?.();
};
