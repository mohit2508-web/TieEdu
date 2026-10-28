// ============================================================================
// College leaderboard (lib/collegeBoard): opt-in only, chosen name, weekly
// points resetting Monday (India time), this college only, ties share a rank.
// ============================================================================

import { collegeBoard, setBoardChoice, weekStart } from '../src/lib/collegeBoard';

let pass = 0;
let fail = 0;
function check(name: string, actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) pass++;
  else {
    fail++;
    console.log(`FAIL ${name}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
  }
}

const WED = new Date('2026-10-28T08:00:00Z'); // Wednesday in India
const xp = (user_id: string, n: number, at: string) => ({ user_id, xp: n, created_at: at, reason: 'lesson_complete' });
const db: any = {
  users: [
    { id: 'asha', name: 'Asha Verma' }, { id: 'ravi', name: 'Ravi Kumar' }, { id: 'meena', name: 'Meena Iyer' },
    { id: 'kabir', name: 'Kabir Shah' }, { id: 'other', name: 'Other College' },
  ],
  xp_ledger: [
    xp('asha', 50, '2026-10-27T05:00:00Z'), xp('asha', 20, '2026-10-28T05:00:00Z'),
    xp('ravi', 70, '2026-10-26T01:00:00Z'), // Monday 06:30 IST: counts
    xp('ravi', 500, '2026-10-25T17:00:00Z'), // Sunday 22:30 IST: last week
    xp('meena', 30, '2026-10-27T05:00:00Z'),
    xp('kabir', 90, '2026-10-27T05:00:00Z'),
    xp('other', 999, '2026-10-27T05:00:00Z'),
  ],
};
const roster = ['asha', 'ravi', 'meena', 'kabir'];

check('week starts Monday, India time', [weekStart(WED), weekStart(new Date('2026-10-25T17:00:00Z')), weekStart(new Date('2026-10-25T19:00:00Z'))], ['2026-10-26', '2026-10-19', '2026-10-26']);
check('nobody listed before opting in', collegeBoard(db, 'GLA', roster, 'asha', WED).entries, []);
check('viewer still sees own points and where they would place on the visible board', collegeBoard(db, 'GLA', roster, 'asha', WED).me, { on: false, name_mode: 'first_name', points: 70, rank: 1 });

setBoardChoice(db, 'asha', { on: true });
setBoardChoice(db, 'ravi', { on: true, name_mode: 'initials' });
setBoardChoice(db, 'meena', { on: true });
setBoardChoice(db, 'other', { on: true });
const b = collegeBoard(db, 'GLA', roster, 'meena', WED);
check('opted-in only, chosen names, ties share a rank', b.entries, [
  { rank: 1, name: 'Asha', points: 70, me: false },
  { rank: 1, name: 'R. K.', points: 70, me: false },
  { rank: 3, name: 'Meena', points: 30, me: true },
]);
check('not-opted-in Kabir never appears, though top scorer', JSON.stringify(b).includes('Kabir'), false);
check('other colleges never appear', JSON.stringify(b).includes('Other'), false);
check('last week’s points do not count', b.entries.find((e) => e.name === 'R. K.')!.points, 70);
setBoardChoice(db, 'asha', { on: false });
check('opting out removes at once', collegeBoard(db, 'GLA', roster, 'meena', WED).entries.map((e) => e.name), ['R. K.', 'Meena']);
check('next week everyone starts at zero', collegeBoard(db, 'GLA', roster, 'meena', new Date('2026-11-02T08:00:00Z')).entries, []);

console.log(`college-board: ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
