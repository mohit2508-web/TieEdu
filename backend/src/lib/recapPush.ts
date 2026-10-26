/**
 * The weekly recap push (UI_REDESIGN_PLAN_V2 §6.4: "Weekly recap (Sunday):
 * what you did, what improved, what's next. In-app plus one push.").
 *
 * The in-app recap is part of Today (lib/today). This sends the one push:
 *  - Sunday, from 18:00 IST — the end of the study week, not a random ping;
 *  - only to students who did something in the last seven days (a recap of
 *    nothing is a nag, not a recap);
 *  - at most once per student per ISO week (`db.recap_pushes`).
 *
 * OFF unless WEEKLY_RECAP_PUSH=1. A development server shares the push
 * subscriptions of real students, so this must be switched on deliberately
 * where it should run, never by default.
 */
import { loadDb, saveDb } from '../data/db';
import { sendPushToUsers } from './push';
import { buildToday } from './today';
import { isoWeek, istDate } from './streak';

export interface PlannedRecap {
  user_id: string;
  week: string;
  title: string;
  body: string;
  url: string;
}

/** Sunday, 18:00 or later, India time. */
export function isRecapWindow(now = new Date()): boolean {
  const ist = new Date(now.getTime() + 5.5 * 3_600_000);
  return ist.getUTCDay() === 0 && ist.getUTCHours() >= 18;
}

/** Who gets a recap this week, and what it says. Pure: nothing is sent or saved. */
export function planWeeklyRecaps(db: any, now = new Date()): PlannedRecap[] {
  if (!isRecapWindow(now)) return [];
  const week = isoWeek(istDate(now));
  const sent: Record<string, string> = db.recap_pushes || {};
  const out: PlannedRecap[] = [];
  for (const user of db.users || []) {
    if (!user?.id || user.role === 'admin' || sent[user.id] === week) continue;
    const today = buildToday(db, user.id, now);
    const r = today.recap;
    if (!r) continue;
    const did = [
      r.lessons ? `${r.lessons} lesson${r.lessons === 1 ? '' : 's'}` : '',
      r.tests ? `${r.tests} test${r.tests === 1 ? '' : 's'}` : '',
      r.certificates ? `${r.certificates} certificate${r.certificates === 1 ? '' : 's'}` : '',
    ].filter(Boolean);
    const improved = r.best_improvement ? ` ${r.best_improvement.skill}: ${r.best_improvement.from}% → ${r.best_improvement.to}%.` : '';
    out.push({
      user_id: user.id,
      week,
      title: 'Your week on TieEdu',
      body: `${did.length ? `${did.join(', ')}.` : `${r.xp} XP earned.`}${improved} Next: ${today.next_step.title}`.slice(0, 180),
      url: '/',
    });
  }
  return out;
}

let started = false;

export function startWeeklyRecapScheduler(): void {
  if (started) return;
  started = true;
  if (process.env.WEEKLY_RECAP_PUSH !== '1') {
    console.log('[Recap] weekly recap push is off (set WEEKLY_RECAP_PUSH=1 to enable)');
    return;
  }
  const tick = async () => {
    try {
      const db = loadDb();
      const due = planWeeklyRecaps(db);
      if (!due.length) return;
      // Mark before sending: a crash mid-send must not resend next tick.
      db.recap_pushes = db.recap_pushes || {};
      for (const r of due) db.recap_pushes[r.user_id] = r.week;
      saveDb(db);
      let delivered = 0;
      for (const r of due) {
        const res = await sendPushToUsers([r.user_id], { title: r.title, body: r.body, url: r.url });
        delivered += res.sent;
      }
      console.log(`[Recap] weekly recaps: ${due.length} due, ${delivered} pushes delivered`);
    } catch (e: any) {
      console.warn('[Recap] weekly recap pass failed:', e?.message);
    }
  };
  setInterval(tick, 30 * 60_000).unref?.();
}
