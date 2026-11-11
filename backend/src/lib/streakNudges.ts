/**
 * "Your streak ends at midnight" (TIE_COINS_STORE_PLAN.md §6.6): one push at 9 PM IST to a
 * student with a live streak of 2+ days who has not practised today. Only students who turned
 * on push get it, at most once a day, and each can switch it off on the streak page
 * (user.streak_nudges_off). Set STREAK_PUSH=0 to stop the scheduler entirely.
 */
import { loadDb, saveDb } from '../data/db';
import { sendPushToUser } from './push';
import { istDate, streakView } from './streak';
import { balanceOf } from './coins';
import { itemById } from './store';

const HOUR = 21;
let started = false;

export function istHour(now: Date): number {
  return new Date(now.getTime() + 5.5 * 3_600_000).getUTCHours();
}

/** Who gets nudged now, and what it says. Marks them (once a day) before anything is sent. */
export function planStreakNudges(db: any, now = new Date()): Array<{ user_id: string; title: string; body: string; url: string }> {
  if (istHour(now) !== HOUR) return [];
  const today = istDate(now);
  db.streak_nudges = db.streak_nudges && typeof db.streak_nudges === 'object' ? db.streak_nudges : {};
  const out: Array<{ user_id: string; title: string; body: string; url: string }> = [];
  for (const r of db.user_streaks || []) {
    const user = (db.users || []).find((u: any) => u.id === r.user_id);
    if (!user || user.disabled || user.streak_nudges_off || db.streak_nudges[r.user_id] === today) continue;
    const v = streakView(db, r.user_id, now);
    if (v.practised_today || v.current < 2) continue;
    const goal = user.coin_goal ? itemById(db, user.coin_goal) : null;
    const left = goal ? goal.coins - balanceOf(db, r.user_id) : null;
    db.streak_nudges[r.user_id] = today;
    out.push({
      user_id: r.user_id,
      title: `Your ${v.current}-day streak ends at midnight`,
      body: `Solve today's problem (+10 TiE Coins) to keep it.${goal && left != null && left > 0 && left <= 500 ? ` You are ${left} coins from the ${goal.name}.` : ''}`,
      url: '/practice',
    });
  }
  return out;
}

export async function runStreakNudges(now = new Date(), send = sendPushToUser): Promise<{ due: number; sent: number }> {
  const db = loadDb();
  const due = planStreakNudges(db, now);
  if (!due.length) return { due: 0, sent: 0 };
  saveDb(db);
  let sent = 0;
  for (const n of due) {
    const r = await send(n.user_id, { title: n.title, body: n.body, url: n.url }).catch(() => ({ sent: 0 }));
    sent += (r as any)?.sent ? 1 : 0;
  }
  return { due: due.length, sent };
}

export function startStreakNudgeScheduler(): void {
  if (started) return;
  started = true;
  if (process.env.STREAK_PUSH === '0') {
    console.log('[StreakNudge] off (STREAK_PUSH=0)');
    return;
  }
  const tick = () => {
    runStreakNudges()
      .then((r) => { if (r.due) console.log(`[StreakNudge] ${r.due} due, ${r.sent} delivered`); })
      .catch((e) => console.warn('[StreakNudge] pass failed:', e?.message || e));
  };
  setInterval(tick, 15 * 60_000).unref?.();
  console.log('[StreakNudge] 9 PM IST streak reminders armed (every 15 min)');
}
