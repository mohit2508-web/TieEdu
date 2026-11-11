/**
 * Admin → TiE Coins and practice access (routes/adminCoins.routes.ts) over HTTP on a scratch store:
 * rule edits change new grants, adjustments need a reason and cannot overdraw, stats add up,
 * per-problem free / pack / hidden overrides reach every student surface, daily overrides.
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
  const file = path.join(os.tmpdir(), `admin-coins-${process.pid}.json`);
  process.env.DB_FILE = file;
  delete process.env.DATABASE_URL;
  delete process.env.PISTON_API_URL;
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'admin-coins-test-secret-0123456789abcdef';
  const { BANK, FREE_CORE } = await import('../src/lib/practice/bank');
  const db: any = { companies: [], skills: [], unlocks: [], code_submissions: [], users: [
    { id: 'a1', role: 'admin', email: 'admin@x.com', name: 'Admin' },
    { id: 's1', role: 'student', email: 'asha@x.com', name: 'Asha' },
  ] };
  fs.writeFileSync(file, JSON.stringify(db));

  const express = (await import('express')).default;
  const { adminCoinsRouter } = await import('../src/routes/adminCoins.routes');
  const { codeRouter } = await import('../src/routes/code.routes');
  const { practiceRouter } = await import('../src/routes/practice.routes');
  const { signAccessToken } = await import('../src/middleware/auth');
  const C = await import('../src/lib/coins');
  const A = await import('../src/lib/practice/access');
  const { dailyProblem } = await import('../src/lib/practice/daily');
  const { loadDb } = await import('../src/data/db');
  const app = express();
  app.use(express.json());
  app.use('/admin', adminCoinsRouter);
  app.use('/code', codeRouter);
  app.use('/practice', practiceRouter);
  const server = http.createServer(app);
  await new Promise<void>((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  const tok = { s1: signAccessToken({ id: 's1', role: 'student' }), a1: signAccessToken({ id: 'a1', role: 'admin' }) } as Record<string, string>;
  const call = async (p: string, method = 'GET', body?: unknown, as?: string) => {
    const r = await fetch(base + p, { method, headers: { 'Content-Type': 'application/json', ...(as ? { Authorization: `Bearer ${tok[as]}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
    return { status: r.status, body: await r.json().catch(() => null) };
  };

  // Rules
  const put = await call('/admin/rules/daily_problem', 'PUT', { coins: 15 });
  check('a rule amount can be changed', put.body.rule.coins === 15 && C.ruleOf(loadDb(), 'daily_problem').coins === 15);
  await call('/admin/rules/checkin', 'PUT', { on: false });
  check('a rule can be switched off', C.ruleOf(loadDb(), 'checkin').on === false);
  await call('/admin/rules/streak', 'PUT', { milestones: { 3: 5, 10: 40 } });
  check('streak milestones can be redefined', JSON.stringify(C.ruleOf(loadDb(), 'streak').milestones) === JSON.stringify({ 3: 5, 10: 40 }));
  await call('/admin/rules/daily_problem', 'PUT', { reset: true });
  check('reset goes back to the default', C.ruleOf(loadDb(), 'daily_problem').coins === 10);
  check('an unknown rule is refused', (await call('/admin/rules/nope', 'PUT', { coins: 1 })).status === 404);

  // Adjustments
  check('an adjustment needs a reason', (await call('/admin/adjust', 'POST', { user_id: 's1', coins: 100, note: '' })).status === 400);
  const g = await call('/admin/adjust', 'POST', { user_id: 's1', coins: 300, note: 'Won the November contest' });
  check('grant with a reason', g.status === 200 && g.body.coins === 300);
  check('a deduction cannot overdraw', (await call('/admin/adjust', 'POST', { user_id: 's1', coins: -1000, note: 'Abuse' })).status === 402);
  const d = await call('/admin/adjust', 'POST', { user_id: 's1', coins: -50, note: 'Duplicate account coins' });
  check('deduct with a reason', d.body.coins === 250);
  const det = (await call('/admin/students/s1')).body;
  check('the student ledger shows both rows with notes', det.ledger.length === 2 && det.ledger[0].note.includes('Duplicate') && det.student.coins === 250);
  const list = (await call('/admin/students?q=asha')).body;
  check('students can be searched', list.students.length === 1 && list.students[0].coins === 250);
  const st = (await call('/admin/stats')).body;
  check('stats: issued, spent, outstanding and ₹ liability', st.totals.issued === 300 && st.totals.spent === 50 && st.totals.outstanding === 250 && st.totals.liability_inr === 25, JSON.stringify(st.totals));

  // Practice access overrides
  const free = BANK.find((p) => FREE_CORE.has(p.id))!;
  const locked = BANK.find((p) => !FREE_CORE.has(p.id) && p.companies.some((c) => c.slug === 'tcs-nqt'))!;
  await call(`/admin/practice/${locked.id}`, 'PUT', { access: 'free' });
  check('"free" opens a pack problem for a student', A.accessFor(loadDb(), 's1', locked.id).open === true);
  await call(`/admin/practice/${free.id}`, 'PUT', { access: 'pack' });
  check('"pack" locks a free-core problem', A.accessFor(loadDb(), 's1', free.id).open === false);
  await call(`/admin/practice/${free.id}`, 'PUT', { access: 'hidden' });
  check('"hidden" is gone from the bank and sets', !A.visibleBank(loadDb()).some((p) => p.id === free.id) && !A.visibleSets(loadDb()).some((s) => s.levels.some((l) => l.ids.includes(free.id))));
  check('"hidden" 404s for students, opens for admins', (await call(`/code/problem/${free.id}`, 'GET', undefined, 's1')).status === 404 && (await call(`/code/problem/${free.id}`, 'GET', undefined, 'a1')).status === 200);
  const sheet = (await call('/practice/dsa', 'GET', undefined, 's1')).body;
  check('"hidden" is off the DSA sheet', !sheet.topics.some((t: any) => t.problems.some((p: any) => p.id === free.id)));
  const snap = loadDb();
  check('"hidden" never becomes the daily problem', Array.from({ length: 60 }, (_, i) => dailyProblem(`2027-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`, snap)?.id).every((id) => id !== free.id));
  await call(`/admin/practice/${free.id}`, 'PUT', { access: 'default' });
  check('"default" removes the override', A.accessFor(loadDb(), 's1', free.id).open === true && (await call('/admin/practice')).body.problems.find((p: any) => p.id === free.id).override === 'default');
  check('a bad access value is refused', (await call(`/admin/practice/${free.id}`, 'PUT', { access: 'maybe' })).status === 400);

  // Daily override
  const day = '2027-02-14';
  const ov = await call('/admin/daily', 'PUT', { date: day, problem_id: locked.id });
  check('the daily problem can be set for a date', ov.body.id === locked.id && dailyProblem(day, loadDb())?.id === locked.id);
  const sched = (await call('/admin/daily')).body;
  check('the next 14 days are listed', sched.schedule.length === 14);
  await call('/admin/daily', 'PUT', { date: day, problem_id: null });
  check('clearing it goes back to the automatic pick', dailyProblem(day, loadDb())?.id !== undefined && !(loadDb() as any).daily_overrides?.[day]);

  server.close();
  fs.rmSync(file, { force: true });
  console.log(`\nadmin coins: ${pass} passed, ${fail} failed`);
  if (fail) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
