/**
 * Runs the study-time reminders (lib/studyReminders) every 15 minutes.
 * OFF unless STUDY_REMINDER_PUSH=1 — see the note in lib/studyReminders.
 */
import { loadDb, saveDb } from '../data/db';
import { sendPushToUser } from './push';
import { applyAutoPause, markReminded, planReminders } from './studyReminders';

let started = false;

export async function runStudyReminders(now = new Date(), send = sendPushToUser): Promise<{ due: number; sent: number }> {
  const db = loadDb();
  const paused = applyAutoPause(db, now);
  const due = planReminders(db, now);
  if (!due.length && !paused) return { due: 0, sent: 0 };
  // Mark before sending, so a crash mid-pass never sends a second reminder today.
  for (const r of due) markReminded(db, r);
  saveDb(db);
  let sent = 0;
  for (const r of due) {
    const res = await send(r.user_id, { title: r.title, body: r.body, url: r.url }).catch(() => ({ sent: 0 }));
    sent += (res as any)?.sent ? 1 : 0;
  }
  return { due: due.length, sent };
}

export function startStudyReminderScheduler(): void {
  if (started) return;
  started = true;
  if (process.env.STUDY_REMINDER_PUSH !== '1') {
    console.log('[StudyRemind] study-time reminders are off (set STUDY_REMINDER_PUSH=1 to enable)');
    return;
  }
  const tick = () => {
    runStudyReminders()
      .then((r) => { if (r.due) console.log(`[StudyRemind] ${r.due} due, ${r.sent} delivered`); })
      .catch((e) => console.warn('[StudyRemind] pass failed:', e?.message || e));
  };
  setInterval(tick, 15 * 60_000).unref?.();
}
