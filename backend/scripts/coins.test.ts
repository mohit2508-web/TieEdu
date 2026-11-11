/**
 * TiE Coins (lib/coins.ts, routes/coins.routes.ts): idempotent grants, caps, spends,
 * admin rule overrides, study days + streak milestones, solve coins, the solution
 * view forfeit, month bonuses, set progress, and the /api/coins and /solution endpoints.
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
  const file = path.join(os.tmpdir(), `coins-${process.pid}.json`);
  process.env.DB_FILE = file;
  delete process.env.DATABASE_URL;
  delete process.env.PISTON_API_URL;
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'coins-test-secret-0123456789abcdef0123';
  const C = await import('../src/lib/coins');
  const { BANK, COMPANY_SETS, FREE_CORE } = await import('../src/lib/practice/bank');

  // ---- library
  const db: any = { companies: [], users: [{ id: 'u1', role: 'student', email: 'a@x.com' }, { id: 'u2', role: 'student', email: 'b@x.com' }] };
  const at = (d: string, h = 6) => new Date(`${d}T${String(h).padStart(2, '0')}:00:00Z`);

  const g1 = C.grant(db, 'u1', 'checkin', 'k1', 1, 'x');
  const g2 = C.grant(db, 'u1', 'checkin', 'k1', 1, 'x');
  check('a key pays once', !!g1 && g2 === null && C.balanceOf(db, 'u1') === 1);
  check('user.coins mirrors the ledger', db.users[0].coins === 1);
  check('zero or negative grants are ignored', C.grant(db, 'u1', 'admin', 'k0', 0, 'x') === null && C.grant(db, 'u1', 'admin', 'kneg', -5, 'x') === null);

  db.coin_rules = { checkin: { on: false }, daily_problem: { coins: 15 }, solve: { cap_day: 6 } };
  check('admin can switch a rule off', C.grant(db, 'u1', 'checkin', 'k-off', 1, 'x') === null);
  check('admin can change an amount', C.ruleOf(db, 'daily_problem').coins === 15);
  const today = new Date();
  const a1 = C.grant(db, 'u2', 'solve', 's1', 5, 'x', null, today);
  const a2 = C.grant(db, 'u2', 'solve', 's2', 5, 'x', null, today);
  const a3 = C.grant(db, 'u2', 'solve', 's3', 5, 'x', null, today);
  check('the daily cap trims and then stops a rule', a1?.coins === 5 && a2?.coins === 1 && a3 === null, JSON.stringify([a1?.coins, a2?.coins, a3]));
  db.coin_rules = {};

  let threw: any = null;
  try { C.spend(db, 'u1', 'buy1', 50, 'x'); } catch (e) { threw = e; }
  check('spending more than the balance fails and changes nothing', threw?.status === 402 && C.balanceOf(db, 'u1') === 1);
  C.grant(db, 'u1', 'admin', 'gift', 100, 'test gift');
  const sp = C.spend(db, 'u1', 'buy2', 60, 'Streak Repair');
  const sp2 = C.spend(db, 'u1', 'buy2', 60, 'Streak Repair');
  check('a spend is idempotent too', sp.id === sp2.id && C.balanceOf(db, 'u1') === 41);

  // Study days and streak milestones: 7 days in a row.
  const sdb: any = { companies: [], users: [{ id: 's', role: 'student' }] };
  let gains: any[] = [];
  for (let i = 0; i < 7; i++) gains = gains.concat(C.recordStudyDay(sdb, 's', at(`2026-11-0${i + 1}`)).gains);
  const again = C.recordStudyDay(sdb, 's', at('2026-11-07', 10)).gains;
  check('one check-in coin per day', gains.filter((g) => g.rule === 'checkin').length === 7 && again.length === 0);
  check('the 7-day milestone pays once', gains.filter((g) => g.rule === 'streak').length === 1 && gains.find((g) => g.rule === 'streak').coins === 20);
  // Break the run, start again: a new 7-day run pays the milestone again.
  for (let i = 0; i < 7; i++) gains = gains.concat(C.recordStudyDay(sdb, 's', at(`2026-11-${12 + i}`)).gains);
  check('a new run can earn the milestone again', gains.filter((g) => g.rule === 'streak').length === 2);

  // Solves.
  const easy = BANK.find((p) => p.difficulty === 'easy')!;
  const pdb: any = { companies: [], users: [{ id: 'p', role: 'student' }] };
  const s1 = C.recordSolve(pdb, 'p', easy, { daily: true, solutionSeen: false }, at('2026-11-05'));
  check('daily problem + first solve both pay', s1.some((g) => g.rule === 'daily_problem' && g.coins === 10) && s1.some((g) => g.rule === 'solve' && g.coins === 2), JSON.stringify(s1));
  const hard = BANK.find((p) => p.difficulty === 'hard') || easy;
  check('no solve coins after viewing the solution', C.recordSolve(pdb, 'p', hard, { daily: false, solutionSeen: true }).length === 0);
  // 25 daily problems in a month.
  const mdb: any = { companies: [], users: [{ id: 'm', role: 'student' }] };
  let mg: any[] = [];
  for (let d = 1; d <= 30; d++) mg = mg.concat(C.recordSolve(mdb, 'm', easy, { daily: true, solutionSeen: true }, at(`2026-11-${String(d).padStart(2, '0')}`)));
  check('25 daily problems in a month pays once', mg.filter((g) => g.rule === 'month_25').length === 1);
  check('every daily problem in the month pays the perfect bonus', mg.filter((g) => g.rule === 'month_perfect').length === 1);

  // Set progress.
  const tcs = COMPANY_SETS.find((s) => s.slug === 'tcs-nqt')!;
  const lvl1 = new Set(tcs.levels[0].ids);
  const sg = C.recordSetProgress(pdb, 'p', COMPANY_SETS, lvl1, tcs.levels[0].ids[0]);
  check('finishing a level pays, the whole set does not yet', sg.some((g) => g.rule === 'level_done') && !sg.some((g) => g.rule === 'set_done'));

  // ---- HTTP: /api/coins and the solution endpoint
  const daily = await import('../src/lib/practice/daily');
  const { istDate } = await import('../src/lib/streak');
  const hdb: any = { companies: [], skills: [], unlocks: [], code_submissions: [], users: [{ id: 'h1', role: 'student', email: 'h@x.com' }] };
  fs.writeFileSync(file, JSON.stringify(hdb));
  const express = (await import('express')).default;
  const { coinsRouter } = await import('../src/routes/coins.routes');
  const { codeRouter } = await import('../src/routes/code.routes');
  const { signAccessToken } = await import('../src/middleware/auth');
  const app = express();
  app.use(express.json());
  app.use('/coins', coinsRouter);
  app.use('/code', codeRouter);
  const server = http.createServer(app);
  await new Promise<void>((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  const auth = { Authorization: `Bearer ${signAccessToken({ id: 'h1', role: 'student' })}` };
  const get = async (p: string, h: Record<string, string> = {}) => { const r = await fetch(base + p, { headers: h }); return { status: r.status, body: await r.json().catch(() => null) }; };

  const rules = (await get('/coins/rules')).body.rules;
  check('rules list the daily problem and hide switched-off ones', rules.some((r: any) => r.id === 'daily_problem' && r.coins === 10) && !rules.some((r: any) => r.id === 'profile'));
  check('/me needs sign-in', (await get('/coins/me')).status === 401);
  const me = (await get('/coins/me', auth)).body;
  check('/me shows balance, tasks and the next milestone', me.coins === 0 && me.today.length === 3 && me.today.every((t: any) => !t.done) && me.next_milestone?.days === 7, JSON.stringify(me).slice(0, 200));
  const dp = daily.dailyProblem(istDate(), hdb);
  check('the daily task links to today\'s problem', me.today.find((t: any) => t.id === 'daily_problem').href === `/practice/problem/${dp?.id}`);

  const free = BANK.find((p) => FREE_CORE.has(p.id))!;
  const view = (await get(`/code/problem/${free.id}`, auth)).body;
  check('the problem view no longer carries the solution', view.problem && view.problem.solutions === undefined);
  const sol = (await get(`/code/problem/${free.id}/solution`, auth)).body;
  check('the solution endpoint returns it and warns about coins', !!sol.solutions?.python && sol.forfeits_coins === true);
  check('the view is recorded', JSON.parse(fs.readFileSync(file, 'utf8')).solution_views.some((v: any) => v.user_id === 'h1' && v.problem_id === free.id));
  const locked = BANK.find((p) => !FREE_CORE.has(p.id) && p.companies.some((c) => c.slug === 'tcs-nqt'));
  if (locked) check('a locked solution is refused', (await get(`/code/problem/${locked.id}/solution`, auth)).status === 403);

  // "Set as my goal"
  const post = async (p: string, body: unknown) => { const r = await fetch(base + p, { method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); return { status: r.status, body: await r.json().catch(() => null) }; };
  const goal1 = await post('/coins/goal', { item_id: 'tshirt' });
  check('a store item can be the goal', goal1.status === 200 && goal1.body.goal?.item_id === 'tshirt' && goal1.body.goal.coins === 5500);
  check('the goal shows on /me and /summary', (await get('/coins/me', auth)).body.goal?.item_id === 'tshirt' && (await get('/coins/summary', auth)).body.goal?.name === 'TiEEdu T-shirt');
  check('an unknown or switched-off item cannot be the goal', (await post('/coins/goal', { item_id: 'nope' })).status === 400 && (await post('/coins/goal', { item_id: 'hoodie' })).status === 400);
  check('null clears the goal', (await post('/coins/goal', { item_id: null })).body.goal === null);

  server.close();
  fs.rmSync(file, { force: true });
  console.log(`\ncoins: ${pass} passed, ${fail} failed`);
  if (fail) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
