// ============================================================================
// "From your college" on Today (lib/collegePulse): a number only when at
// least PULSE_MIN students are in it; otherwise a line with no number.
// ============================================================================

import { collegePulse, PULSE_MIN } from '../src/lib/collegePulse';

let pass = 0;
let fail = 0;
function check(name: string, actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) pass++;
  else {
    fail++;
    console.log(`FAIL ${name}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
  }
}

const NOW = new Date('2026-10-28T08:00:00Z'); // 28 Oct in India
const streak = (id: string, days: string[]) => ({ user_id: id, current: 1, best: 1, last_day: days[days.length - 1] || null, freezes_used: [], frozen_days: [], days });
const roster = (n: number) => Array.from({ length: n }, (_, i) => `u${i}`);
const db = (todayN: number, weekOnlyN: number) => ({
  user_streaks: [
    ...roster(todayN).map((id) => streak(id, ['2026-10-28'])),
    ...Array.from({ length: weekOnlyN }, (_, i) => streak(`w${i}`, ['2026-10-24'])),
    streak('outsider', ['2026-10-28']),
    streak('old', ['2026-10-01']),
  ],
});
const ids = (todayN: number, weekOnlyN: number) => [...roster(todayN), ...Array.from({ length: weekOnlyN }, (_, i) => `w${i}`), 'old'];

check('today shown at the floor', collegePulse(db(PULSE_MIN, 0), 'GLA', ids(PULSE_MIN, 0), NOW), { college: 'GLA', kind: 'today', count: PULSE_MIN, text: `${PULSE_MIN} students from GLA practised today.` });
check('below the floor today → this week', collegePulse(db(4, 8), 'GLA', ids(4, 8), NOW).text, '12 students from GLA practised this week.');
check('both below → no number at all', collegePulse(db(3, 3), 'GLA', ids(3, 3), NOW), { college: 'GLA', kind: 'none', count: null, text: 'Practise with your batchmates from GLA.' });
check('other colleges never counted', collegePulse(db(PULSE_MIN - 1, 0), 'GLA', ids(PULSE_MIN - 1, 0), NOW).kind, 'none');
check('a month-old practice day is not this week', collegePulse({ user_streaks: roster(20).map((id) => streak(id, ['2026-10-01'])) }, 'GLA', roster(20), NOW).kind, 'none');
check('empty college', collegePulse({}, 'GLA', [], NOW).count, null);

console.log(`college-pulse: ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
