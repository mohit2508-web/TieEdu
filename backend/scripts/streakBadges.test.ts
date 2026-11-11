/**
 * Streak badges and the streak page (lib/streakBadges.ts): milestone badges, the monthly
 * "Daily Coder" badge (repairs count), yearly 50/100/300 days, calendar states, /api/coins/streak.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import http from 'http';

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, note = '') {
  if (cond) { pass++; console.log(`  ok   ${name}`); } else { fail++; console.log(`  FAIL ${name} ${note}`); }
}

async function main() {
  const file = path.join(os.tmpdir(), `streak-badges-${process.pid}.json`);
  process.env.DB_FILE = file;
  delete process.env.DATABASE_URL;
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'streak-badges-test-secret-0123456789abc';
  const C = await import('../src/lib/coins');
  const B = await import('../src/lib/streakBadges');
  const { BANK } = await import('../src/lib/practice/bank');
  const at = (d: string) => new Date(`${d}T06:00:00Z`);
  const easy = BANK.find((p) => p.difficulty === 'easy')!;

  // A full month (Feb 2027, 28 days): every daily problem solved.
  const db: any = { companies: [], users: [{ id: 'u', role: 'student' }] };
  let gains: any[] = [];
  for (let d = 1; d <= 28; d++) {
    const day = `2027-02-${String(d).padStart(2, '0')}`;
    gains = gains.concat(C.recordStudyDay(db, 'u', at(day)).gains, C.recordSolve(db, 'u', easy, { daily: true, solutionSeen: true }, at(day)));
  }
  const badgeNotes = gains.filter((g) => g.rule === 'badge').map((g) => g.note);
  check('the 7-day badge is earned on day 7', badgeNotes.includes('Badge: Consistent Coder'), JSON.stringify(badgeNotes));
  check('the monthly badge comes with the last daily problem of the month', badgeNotes.includes('Badge: February 2027 Daily Coder'));
  check('each badge is earned once', badgeNotes.length === new Set(badgeNotes).size);
  check('no 30-day badge after 28 days', !badgeNotes.includes('Badge: Streak Star'));

  // Repairs count for the monthly badge.
  const rdb: any = { companies: [], users: [{ id: 'r', role: 'student' }] };
  for (let d = 1; d <= 30; d++) {
    if (d === 10) continue;
    const day = `2027-04-${String(d).padStart(2, '0')}`;
    C.recordStudyDay(rdb, 'r', at(day));
    C.recordSolve(rdb, 'r', easy, { daily: true, solutionSeen: true }, at(day));
  }
  check('a missed daily problem blocks the monthly badge', !(rdb.user_badges || []).some((b: any) => b.badge_key === 'month-2027-04'));
  rdb.user_streaks[0].repaired_days = ['2027-04-10'];
  B.checkStreakBadges(rdb, 'r', at('2027-04-30'));
  check('a Streak Repair on that day completes it', (rdb.user_badges || []).some((b: any) => b.badge_key === 'month-2027-04'));

  // Yearly: 50 active days.
  const ydb: any = { companies: [], users: [{ id: 'y', role: 'student' }] };
  for (let i = 0; i < 50; i++) C.recordStudyDay(ydb, 'y', new Date(Date.UTC(2027, 4, 1 + i * 2, 6)));
  check('50 active days in a year earns the 50-days badge', (ydb.user_badges || []).some((b: any) => b.badge_key === 'year-50-2027'));
  check('not the 100-days one', !(ydb.user_badges || []).some((b: any) => b.badge_key === 'year-100-2027'));

  // Calendar states
  const page = B.streakPage(db, 'u', '2027-02', at('2027-03-02'));
  check('calendar: every February day is "solved"', page.days.length === 28 && page.days.every((d) => d.state === 'solved'));
  check('month badge shows earned and 28 / 28', page.month_badge.earned && page.month_badge.done === 28 && page.month_badge.total === 28);
  const march = B.streakPage(db, 'u', '2027-03', at('2027-03-02'));
  check('calendar: missed, today and future days', march.days[0].state === 'missed' && march.days[1].state === 'today' && march.days[2].state === 'future', JSON.stringify(march.days.slice(0, 3)));
  check('badge names read well', B.badgeName('year-100-2027') === '100 days in 2027' && B.badgeName('streak-365') === 'Year of Code');

  // HTTP
  fs.writeFileSync(file, JSON.stringify({ companies: [], users: [{ id: 'h', role: 'student', email: 'h@x.com' }] }));
  const express = (await import('express')).default;
  const { coinsRouter } = await import('../src/routes/coins.routes');
  const { signAccessToken } = await import('../src/middleware/auth');
  const app = express();
  app.use('/coins', coinsRouter);
  const server = http.createServer(app);
  await new Promise<void>((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  const H = { Authorization: `Bearer ${signAccessToken({ id: 'h', role: 'student' })}` };
  check('/streak needs sign-in', (await fetch(`${base}/coins/streak`)).status === 401);
  const s = await (await fetch(`${base}/coins/streak?month=2027-02`, { headers: H })).json();
  check('/streak returns the month, milestones, year badges and repairs', s.month === '2027-02' && s.days.length === 28 && s.milestones.length === 6 && s.year_badges.length === 3 && s.repairs_left === 3);
  const bad = await (await fetch(`${base}/coins/streak?month=nope`, { headers: H })).json();
  check('a bad month falls back to this month', /^\d{4}-\d{2}$/.test(bad.month) && bad.month === bad.today.slice(0, 7));

  server.close();
  fs.rmSync(file, { force: true });
  console.log(`\nstreak badges: ${pass} passed, ${fail} failed`);
  if (fail) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
