// ============================================================================
// Study-time reminders (lib/studyReminders), to the platform owner's rules:
// one a day at the usual hour, skipped if already practised, never 22:00–08:00
// IST, the student can turn them off, and they pause after 7 ignored in a row.
// ============================================================================

import { applyAutoPause, markReminded, MAX_IGNORED, planReminders, reminderSettings, setReminders, usualHour } from '../src/lib/studyReminders';

let pass = 0;
let fail = 0;
function check(name: string, actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) pass++;
  else {
    fail++;
    console.log(`FAIL ${name}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
  }
}

/** An India-time instant on 2026-10-<day>. */
const ist = (day: number, hour: number, min = 10) => new Date(Date.UTC(2026, 9, day, hour, min) - 5.5 * 3_600_000);
const ev = (user_id: string, d: Date) => ({ user_id, xp: 10, reason: 'lesson_complete', created_at: d.toISOString() });
const mkDb = () => ({
  users: [{ id: 'priya', name: 'Priya' }, { id: 'new', name: 'New' }, { id: 'owl', name: 'Night Owl' }],
  // Priya studies around 19:00 on four days; once at 07:00.
  xp_ledger: [ev('priya', ist(20, 19)), ev('priya', ist(21, 19)), ev('priya', ist(22, 19, 40)), ev('priya', ist(24, 19)), ev('priya', ist(23, 7)),
    ev('new', ist(26, 18)),
    ev('owl', ist(20, 23)), ev('owl', ist(21, 23)), ev('owl', ist(22, 23))] as any[],
  user_streaks: [] as any[],
});

{
  const db = mkDb();
  const now = ist(28, 19, 5);
  check('usual hour from the last 14 days', usualHour(db, 'priya', now), 19);
  check('too little history → no usual hour', usualHour(db, 'new', now), null);
  check('late-night studying never becomes a reminder hour', usualHour(db, 'owl', now), null);
  const plan = planReminders(db, now);
  check('reminded at the usual hour', plan.map((p) => p.user_id), ['priya']);
  check('not at another hour', planReminders(db, ist(28, 18)).length, 0);
  check('never in quiet hours', planReminders(db, ist(28, 23)).length + planReminders(db, ist(28, 7)).length, 0);
  markReminded(db, plan[0]);
  check('at most one a day', planReminders(db, ist(28, 19, 40)).length, 0);
  db.xp_ledger.push(ev('priya', ist(29, 9)));
  check('skipped when already practised today', planReminders(db, ist(29, 19, 5)).length, 0);
  setReminders(db, 'priya', false);
  check('student can turn them off', [planReminders(db, ist(30, 19, 5)).length, reminderSettings(db, 'priya', ist(30, 19)).on], [0, false]);
  check('turning back on', setReminders(db, 'priya', true).on, true);
}

// Auto-pause after MAX_IGNORED ignored in a row.
{
  const db: any = mkDb();
  // Keep a 19:00 habit in the 14-day window, and ignore every reminder.
  db.xp_ledger = [];
  for (let i = 0; i < 6; i++) db.xp_ledger.push(ev('priya', new Date(Date.UTC(2026, 9, 1 + i, 13, 40))));
  let sent = 0;
  for (let day = 8; day < 8 + MAX_IGNORED + 3; day++) {
    // Keep the 19:00 habit inside the 14-day window, but never on the reminder day itself.
    db.xp_ledger.push(ev('priya', new Date(Date.UTC(2026, 9, day - 7, 13, 40))));
    applyAutoPause(db, new Date(Date.UTC(2026, 9, day, 2, 0)));
    const p = planReminders(db, new Date(Date.UTC(2026, 9, day, 13, 35)));
    if (p.length) { markReminded(db, p[0]); sent++; }
  }
  check(`stops after ${MAX_IGNORED} ignored in a row`, sent, MAX_IGNORED);
  check('shown as paused', reminderSettings(db, 'priya').paused, true);
  setReminders(db, 'priya', true);
  check('turning on again clears the pause', reminderSettings(db, 'priya').on, true);
}

console.log(`study-reminders: ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
