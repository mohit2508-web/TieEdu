// ============================================================================
// Today screen + study streak (UI_REDESIGN_PLAN_V2 §6.1, §6.4).
//
// The streak must forgive one missed day per week and no more; the Today view
// must be computed only from the student's own records and pick one next step
// in a fixed priority order.
// ============================================================================

import { addDays, isoWeek, streakView, touchStreak } from '../src/lib/streak';
import { buildToday, stageFor, yearLabel } from '../src/lib/today';

let pass = 0;
let fail = 0;
function check(name: string, actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) pass++;
  else {
    fail++;
    console.log(`FAIL ${name}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
  }
}

// Noon IST on a given date, so the IST day is unambiguous.
const at = (day: string) => new Date(`${day}T06:30:00Z`);

// --- ISO weeks ---------------------------------------------------------------
check('isoWeek: a Monday', isoWeek('2026-10-26'), '2026-W44');
check('isoWeek: the Sunday before belongs to the previous week', isoWeek('2026-10-25'), '2026-W43');
check('isoWeek: 1 Jan 2027 (Friday) is in 2026-W53', isoWeek('2027-01-01'), '2026-W53');
check('isoWeek: 4 Jan 2027 starts 2027-W01', isoWeek('2027-01-04'), '2027-W01');

// --- streak ------------------------------------------------------------------
{
  const db: any = { users: [{ id: 'u1', name: 'Asha Rao' }] };
  touchStreak(db, 'u1', at('2026-10-19')); // Mon
  touchStreak(db, 'u1', at('2026-10-19')); // same day: no double count
  check('same day counts once', db.user_streaks[0].current, 1);
  touchStreak(db, 'u1', at('2026-10-20'));
  check('consecutive day extends', db.user_streaks[0].current, 2);
  check('user.streak mirrors the count for the header', db.users[0].streak, 2);
  // miss Wed 21st, come back Thu 22nd: the week's freeze covers it
  check('a missed day is shown as protected before the student returns', streakView(db, 'u1', at('2026-10-22')).protected_by_freeze, true);
  check('…and the live count is kept', streakView(db, 'u1', at('2026-10-22')).current, 2);
  touchStreak(db, 'u1', at('2026-10-22'));
  check('freeze covers one missed day', db.user_streaks[0].current, 3);
  check('the frozen day is recorded for the calendar', db.user_streaks[0].frozen_days, ['2026-10-21']);
  // miss Fri 23rd in the same week: no second freeze
  touchStreak(db, 'u1', at('2026-10-24'));
  check('a second missed day in the same week resets', db.user_streaks[0].current, 1);
  check('best is kept', db.user_streaks[0].best, 3);
  // next week has a fresh freeze: miss Tue 27th, back Wed 28th
  touchStreak(db, 'u1', at('2026-10-25'));
  touchStreak(db, 'u1', at('2026-10-26'));
  touchStreak(db, 'u1', at('2026-10-28'));
  check('a new week brings a new freeze (24th=1, 25th=2, 26th=3, 27th frozen, 28th=4)', db.user_streaks[0].current, 4);
  // two missed days in a row are never covered
  touchStreak(db, 'u1', at('2026-10-31'));
  check('two missed days in a row reset', db.user_streaks[0].current, 1);
  const v = streakView(db, 'u1', at('2026-11-03'));
  check('a broken streak reads as 0, not a stale number', v.current, 0);
  check('the calendar covers the last seven days', v.week.length, 7);
  check('the calendar ends today', v.week[6].day, '2026-11-03');
}

// --- stage from graduation year -----------------------------------------------
const oct = at('2026-10-26');
check('graduating 2027 in Oct 2026 is final year', stageFor(2027, oct), 'placement');
check('graduating 2028 is the internship year', stageFor(2028, oct), 'internship');
check('graduating 2030 is foundation', stageFor(2030, oct), 'foundation');
check('already graduated still looks for a job', stageFor(2025, oct), 'placement');
check('no year, no stage', stageFor(null, oct), null);
check('in May 2027 the 2027 batch is still final year', stageFor(2027, at('2027-05-10')), 'placement');
check('in July 2027 the 2028 batch becomes final year', stageFor(2028, at('2027-07-10')), 'placement');
check('year label: final year', yearLabel(2027, oct), 'Final year');
check('year label: 3rd year', yearLabel(2028, oct), '3rd year');
check('year label: 1st year', yearLabel(2030, oct), '1st year');

// --- Today -------------------------------------------------------------------
const course = {
  id: 'c1', slug: 'py', title: 'Python', published: true,
  modules: [{ id: 'm1', sort_order: 1, lessons: [{ id: 'l1', title: 'Intro', sort_order: 1 }, { id: 'l2', title: 'Loops', sort_order: 2 }] }],
};
const base = () => ({
  users: [{ id: 'u1', name: 'Asha Rao' }],
  courses: [course],
  skills: [{ id: 's1', slug: 'dsa', name: 'DSA', status: 'active' }],
  attempts: [] as any[],
  companies: [],
  xp_ledger: [] as any[],
});
{
  const db: any = base();
  const t = buildToday(db, 'u1', oct);
  check('first name only', t.first_name, 'Asha');
  check('without a year, the next step asks for it', t.next_step.kind, 'set_year');
  check('without a year, the route starts at the year', t.route.map((s) => s.state), ['current', 'next', 'next', 'next']);
  check('nothing to resume yet', t.continue, null);
  check('no activity, no recap', t.recap, null);
}
{
  const db: any = base();
  db.users[0].grad_year = 2027;
  db.course_progress = { u1: { c1: { user_id: 'u1', course_id: 'c1', completed_lesson_ids: ['l1'], updated_at: '2026-10-25T10:00:00Z' } } };
  const t = buildToday(db, 'u1', oct);
  check('an unfinished course is the next step', t.next_step.kind, 'continue_course');
  check('…pointing at the next lesson', t.next_step.href, '/courses/py?lesson=l2');
  check('resume shows real progress', t.continue && t.continue.detail, '1 of 2 lessons');
  check('exactly one current station', t.route.filter((s) => s.state === 'current').length, 1);
}
{
  const db: any = base();
  db.users[0].grad_year = 2027;
  const t = buildToday(db, 'u1', oct);
  check('no course and no tests: take the first test', t.next_step.kind, 'first_test');
}
{
  const db: any = base();
  db.users[0].grad_year = 2027;
  db.attempts = [
    { userId: 'u1', skillId: 's1', status: 'submitted', percentage: 40, submittedAt: `${addDays('2026-10-26', -5)}T08:00:00Z` },
    { userId: 'u1', skillId: 's1', status: 'submitted', percentage: 70, submittedAt: `${addDays('2026-10-26', -2)}T08:00:00Z` },
  ];
  db.xp_ledger = [{ user_id: 'u1', reason: 'lesson_complete', xp: 10, created_at: `${addDays('2026-10-26', -3)}T08:00:00Z` }];
  const t = buildToday(db, 'u1', oct);
  check('recap counts last week’s tests', t.recap && t.recap.tests, 2);
  check('recap finds the biggest improvement', t.recap && t.recap.best_improvement, { skill: 'DSA', from: 40, to: 70 });
  check('recap counts lessons from the ledger', t.recap && t.recap.lessons, 1);
  check('this week counts the same tests', t.this_week.tests, 2);
}

console.log(`\ntoday: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);

// --- weekly recap push (planning only; nothing is sent) ----------------------
import { isRecapWindow, planWeeklyRecaps } from '../src/lib/recapPush';
{
  // Sunday 1 Nov 2026, 19:00 IST = 13:30 UTC; Saturday same time is outside.
  const sunEvening = new Date('2026-11-01T13:30:00Z');
  check('recap window: Sunday evening', isRecapWindow(sunEvening), true);
  check('recap window: Sunday morning is too early', isRecapWindow(new Date('2026-11-01T03:30:00Z')), false);
  check('recap window: Saturday evening is not Sunday', isRecapWindow(new Date('2026-10-31T13:30:00Z')), false);

  const db: any = {
    users: [
      { id: 'u1', name: 'Asha', grad_year: 2027 },
      { id: 'u2', name: 'Idle', grad_year: 2027 },
      { id: 'a1', name: 'Admin', role: 'admin' },
    ],
    courses: [], companies: [], skills: [{ id: 's1', slug: 'dsa', name: 'DSA', status: 'active' }],
    attempts: [
      { userId: 'u1', skillId: 's1', status: 'submitted', percentage: 40, submittedAt: '2026-10-27T08:00:00Z' },
      { userId: 'u1', skillId: 's1', status: 'submitted', percentage: 75, submittedAt: '2026-10-30T08:00:00Z' },
    ],
    xp_ledger: [],
  };
  const plan = planWeeklyRecaps(db, sunEvening);
  check('only students who did something get a recap', plan.map((p) => p.user_id), ['u1']);
  check('the recap says what improved', plan[0].body.includes('DSA: 40% → 75%'), true);
  db.recap_pushes = { u1: plan[0].week };
  check('at most once per week', planWeeklyRecaps(db, sunEvening).length, 0);
  check('nothing outside the window', planWeeklyRecaps({ ...db, recap_pushes: {} }, new Date('2026-10-31T13:30:00Z')).length, 0);
}
console.log(`\ntoday+recap: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
