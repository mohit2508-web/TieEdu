/**
 * Opportunities, nudges and the monthly top 10 (lib/opportunities.ts, lib/streakNudges.ts,
 * admin monthly-top): unlocks at their streak, applied once; free claims through the store;
 * the 9 PM push plan; top-10 payouts.
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
  const file = path.join(os.tmpdir(), `opps-${process.pid}.json`);
  process.env.DB_FILE = file;
  delete process.env.DATABASE_URL;
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'opps-test-secret-0123456789abcdef01234';
  const C = await import('../src/lib/coins');
  const O = await import('../src/lib/opportunities');
  const S = await import('../src/lib/store');
  const N = await import('../src/lib/streakNudges');
  const { addDays } = await import('../src/lib/streak');

  const old = new Date(Date.now() - 400 * 86_400_000).toISOString();
  const db: any = { companies: [], users: [{ id: 'u', role: 'student', email: 'u@x.com', email_verified: true, created_at: old, talent: { visible: true, handle: 'ab12' } }] };
  const start = '2025-01-01';
  const all: any[] = [];
  const dayAt = (i: number) => new Date(`${addDays(start, i)}T06:00:00Z`);
  for (let i = 0; i < 30; i++) all.push(...C.recordStudyDay(db, 'u', dayAt(i)).gains);
  const notes = all.map((g) => g.note);
  check('30 days unlocks the free repair (60 coins) and drive priority', notes.includes('Unlocked: A free Streak Repair') && notes.includes('Unlocked: Priority seat in mock drives') && db.users[0].mock_drive_priority === true);
  check('the free repair is paid once as coins', all.filter((g) => g.rule === 'opportunity' && g.coins === 60).length === 1);
  for (let i = 30; i < 100; i++) C.recordStudyDay(db, 'u', dayAt(i));
  check('60 days: Streak Star for recruiters', db.users[0].streak_star === true);
  check('100 days: 30 days of membership', db.users[0].membership?.tier === 'member' && db.users[0].membership.source === 'streak-100');
  const v100 = O.opportunityView(db, 'u', 100);
  check('the view shows unlocked and locked opportunities', v100.find((o) => o.key === 'opp-100-membership')!.state === 'unlocked' && v100.find((o) => o.key === 'opp-200-kit')!.state === 'locked' && v100.find((o) => o.key === 'opp-200-kit')!.progress === 100);
  check('unlocks are recorded once each', O.unlocksOf(db).filter((u) => u.user_id === 'u').length === 4);

  // Claim the kit at 200 days.
  for (let i = 100; i < 200; i++) C.recordStudyDay(db, 'u', dayAt(i));
  S.updateItem(db, 'kit', { stock: { one: 1 } });
  const addr = { name: 'U', line1: '1 Road', city: 'Pune', state: 'MH', pincode: '411001' };
  let err: any = null;
  try { S.redeem(db, 'u', { item_id: 'kit', claim: 'opp-365-hoodie', phone: '9876543210', address: addr }); } catch (e) { err = e; }
  check('a claim must match its item', err?.status === 400);
  const bal = C.balanceOf(db, 'u');
  const kit = S.redeem(db, 'u', { item_id: 'kit', claim: 'opp-200-kit', phone: '9876543210', address: addr });
  check('the welcome kit claim is free and becomes an order', kit.coins === 0 && kit.status === 'placed' && C.balanceOf(db, 'u') === bal && kit.item_name.includes('streak reward'));
  err = null; try { S.redeem(db, 'u', { item_id: 'kit', claim: 'opp-200-kit', phone: '9876543210', address: addr }); } catch (e) { err = e; }
  check('a claim works once', err?.status === 409 || err?.status === 404);
  S.setOrderStatus(db, kit.id, 'rejected', { id: 'admin', admin: true }, { note: 'Address unclear' });
  check('a rejected claim becomes claimable again', O.opportunityView(db, 'u', 200).find((o) => o.key === 'opp-200-kit')!.state === 'claimable');
  err = null; try { S.redeem(db, 'u', { item_id: 'hoodie', claim: 'opp-365-hoodie', size: 'M', phone: '9876543210', address: addr }); } catch (e) { err = e; }
  check('the hoodie claim waits for 365 days', err?.status === 403 || err?.status === 409);

  // Admin can switch one off / move it.
  const db2: any = { companies: [], users: [{ id: 'v', role: 'student' }], opportunity_rules: { 'opp-30-drive': { on: false }, 'opp-30-repair': { days: 10 } } };
  for (let i = 0; i < 12; i++) C.recordStudyDay(db2, 'v', dayAt(i));
  check('admin threshold and off switch are respected', O.hasUnlock(db2, 'v', 'opp-30-repair') && !O.hasUnlock(db2, 'v', 'opp-30-drive') && !db2.users[0].mock_drive_priority);

  // 9 PM nudge plan.
  const ndb: any = { companies: [], users: [{ id: 'n', role: 'student' }, { id: 'off', role: 'student', streak_nudges_off: true }] };
  const today = new Date();
  const istToday = new Date(today.getTime() + 5.5 * 3_600_000).toISOString().slice(0, 10);
  for (const id of ['n', 'off']) for (const back of [3, 2, 1]) C.recordStudyDay(ndb, id, new Date(`${addDays(istToday, -back)}T06:00:00Z`));
  const at9 = new Date(`${istToday}T15:40:00Z`); // 21:10 IST
  const at8 = new Date(`${istToday}T14:40:00Z`); // 20:10 IST
  check('no nudge outside 9 PM IST', N.planStreakNudges(ndb, at8).length === 0);
  const plan = N.planStreakNudges(ndb, at9);
  check('9 PM: one nudge for a live streak not practised today', plan.length === 1 && plan[0].user_id === 'n' && /3-day streak/.test(plan[0].title), JSON.stringify(plan));
  check('at most one nudge a day', N.planStreakNudges(ndb, new Date(at9.getTime() + 20 * 60_000)).length === 0);

  // Monthly top 10 over HTTP.
  const hdb: any = { companies: [], users: [{ id: 'a', role: 'admin', email: 'a@x.com' }, ...Array.from({ length: 12 }, (_, i) => ({ id: `s${i}`, role: 'student', email: `s${i}@x.com`, name: `S${i}` }))] };
  for (let i = 0; i < 12; i++) C.grant(hdb, `s${i}`, 'daily_problem', `d:${i}`, 10 * (i + 1), 'x', null, new Date('2026-10-15T06:00:00Z'));
  C.grant(hdb, 's0', 'admin', 'gift', 9999, 'gift', null, new Date('2026-10-15T06:00:00Z'));
  fs.writeFileSync(file, JSON.stringify(hdb));
  const express = (await import('express')).default;
  const { adminCoinsRouter } = await import('../src/routes/adminCoins.routes');
  const app = express();
  app.use(express.json());
  app.use('/admin', adminCoinsRouter);
  const server = http.createServer(app);
  await new Promise<void>((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  const post = async (p: string, body: unknown) => { const r = await fetch(base + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); return { status: r.status, body: await r.json() }; };
  const preview = await (await fetch(`${base}/admin/monthly-top?month=2026-10`)).json();
  check('top 10 ranks practice coins only (admin gifts do not count)', preview.top.length === 10 && preview.top[0].user_id === 's11' && preview.top[9].user_id === 's2' && preview.top[0].prize === 500);
  check('the current month cannot be paid yet', (await post('/admin/monthly-top', { month: new Date().toISOString().slice(0, 7) })).status === 400);
  const paid = await post('/admin/monthly-top', { month: '2026-10' });
  const again = await post('/admin/monthly-top', { month: '2026-10' });
  const { loadDb } = await import('../src/data/db');
  const after = loadDb();
  check('payouts go out once each with a badge', paid.body.top.every((t: any) => t.paid) && again.status === 200 && C.balanceOf(after, 's11') === 120 + 500 && (after.user_badges || []).some((b: any) => b.user_id === 's11' && b.badge_key === 'top10-2026-10'));
  const opps = await (await fetch(`${base}/admin/opportunities`)).json();
  check('admin lists opportunities with counts', opps.opportunities.length === 6 && opps.opportunities[0].unlocked === 0);

  server.close();
  fs.rmSync(file, { force: true });
  console.log(`\nopportunities: ${pass} passed, ${fail} failed`);
  if (fail) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
