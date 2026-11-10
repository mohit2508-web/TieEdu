/**
 * Admin → Coding practice API (routes/adminPractice.routes.ts) over HTTP, on a
 * scratch store (DB_FILE), never the real db.json.
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
  const file = path.join(os.tmpdir(), `admin-practice-${process.pid}.json`);
  process.env.DB_FILE = file;
  delete process.env.PISTON_API_URL;
  delete process.env.DATABASE_URL;
  const { seedCompanyProfiles, seedInterviewPrep } = await import('../src/lib/seed3T');
  const { BANK } = await import('../src/lib/practice/bank');

  const db: any = { companies: [], skills: [], topics: [], questions: [], assessments: [], attempts: [], unlocks: [], prep_progress: [], code_submissions: [],
    users: [
      { id: 'u1', name: 'Asha', email: 'asha@example.com', role: 'student', college: 'ABC College', target_company: 'tcs-nqt' },
      { id: 'u2', name: 'Ravi', email: 'ravi@example.com', role: 'student', target_company: 'tcs-nqt' },
      { id: 'u3', name: 'Neha', email: 'neha@example.com', role: 'student' },
      { id: 'u4', name: 'Kiran', email: 'kiran@example.com', role: 'student', target_company: 'tcs-nqt' },
    ] };
  seedCompanyProfiles(db, false, ['tcs-nqt']);
  seedInterviewPrep(db);
  db.unlocks.push({ user_id: 'u1', company_id: db.companies[0].id, status: 'active' });
  const [p1, p2, broken] = BANK;
  const now = Date.now();
  const at = (minAgo: number) => new Date(now - minAgo * 60000).toISOString();
  db.code_submissions.push(
    { id: 's1', user_id: 'u1', problem_id: p1.id, verdict: 'wrong_answer', passed: 2, total: 10, language: 'python', at: at(30), code: 'print(1)', ms_total: 900 },
    { id: 's2', user_id: 'u1', problem_id: p1.id, verdict: 'accepted', passed: 10, total: 10, language: 'python', at: at(20), code: 'print(2)', ms_total: 1100 },
    { id: 's3', user_id: 'u2', problem_id: p2.id, verdict: 'runtime_error', passed: 0, total: 9, language: 'cpp', at: at(10), code: 'int main(){}' },
  );
  for (let i = 0; i < 10; i++) db.code_submissions.push({ id: `b${i}`, user_id: `x${i}`, problem_id: broken.id, verdict: 'wrong_answer', passed: 1, total: 10, language: 'java', at: at(5), code: '' });
  db.prep_progress.push({ user_id: 'u1', company_slug: 'tcs-nqt', lessons_done: ['a', 'b'], readiness_log: [{ date: '2026-11-09', score: 55 }, { date: '2026-11-10', score: 72 }], activity_days: ['2026-11-10'] });
  fs.writeFileSync(file, JSON.stringify(db));

  const express = (await import('express')).default;
  const { adminPracticeRouter } = await import('../src/routes/adminPractice.routes');
  const app = express();
  app.use('/a', adminPracticeRouter);
  const server = http.createServer(app);
  await new Promise<void>((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${(server.address() as any).port}/a`;
  const get = async (p: string) => { const r = await fetch(base + p); return { status: r.status, type: r.headers.get('content-type') || '', body: r.headers.get('content-type')?.includes('json') ? await r.json() : await r.text() }; };

  const ov = (await get('/overview?days=7')).body;
  check('overview: totals count submissions and students', ov.totals.submissions === 13 && ov.totals.accepted === 1 && ov.totals.solvers === 1 && ov.totals.students === 12, JSON.stringify(ov.totals));
  check('overview: one row per day', ov.series.length === 7 && ov.series[6].submissions === 13);
  check('overview: runner shows not configured', ov.runner.configured === false && ov.runner.up === null);

  const st = (await get('/students')).body;
  const asha = st.rows.find((r: any) => r.id === 'u1');
  check('students: Asha solved 1, 2 submissions, readiness 72', asha && asha.solved === 1 && asha.submissions === 2 && asha.readiness === 72, JSON.stringify(asha));
  check('students: a student who only set a target is listed', st.rows.some((r: any) => r.id === 'u4' && r.submissions === 0));
check('students: no target and no activity → not listed', !st.rows.some((r: any) => r.id === 'u3'));
  check('students: search by college', (await get('/students?q=abc')).body.rows.map((r: any) => r.id).join() === 'u1');
  const csvRes = await get('/students?format=csv');
  check('students CSV: header + rows', csvRes.type.includes('text/csv') && String(csvRes.body).split('\n')[0].startsWith('id,name,email') && String(csvRes.body).includes('asha@example.com'));

  const tl = (await get('/students/u1')).body;
  check('timeline: newest submission first, with title', tl.submissions[0].id === 's2' && tl.submissions[0].title === p1.title && tl.prep[0].lessons_done === 2);
  check('timeline: no code in the list (opened one at a time)', tl.submissions.every((s: any) => s.code === undefined));
  check('submission: admin can read the code', (await get('/submission/s1')).body.code === 'print(1)');
  check('unknown student: 404', (await get('/students/nobody')).status === 404);

  const pr = (await get('/problems')).body.rows;
  const r1 = pr.find((r: any) => r.id === p1.id);
  check('problems: acceptance and tries to solve', r1.acceptance === 50 && r1.avg_tries === 2 && r1.solvers === 1, JSON.stringify(r1));
  check('problems: 10 students and no solver is flagged', /nobody solves/.test(pr.find((r: any) => r.id === broken.id).flag));
  check('problems: untouched problems have no rate', pr.find((r: any) => r.submissions === 0).acceptance === null);

  const fu = (await get('/companies')).body.rows.find((r: any) => r.slug === 'tcs-nqt');
  check('funnel: targeted 3, practised 3, bought 1, ready 1', fu.targeted === 3 && fu.practised_coding >= 2 && fu.bought_pack === 1 && fu.ready_70 === 1, JSON.stringify(fu));
  const cov = (await get('/coverage')).body.rows.find((r: any) => r.slug === 'tcs-nqt');
  check('coverage: 65 coding problems split by topic', cov.coding_total === 65 && cov.coding_by_topic.reduce((n: number, t: any) => n + t.count, 0) === 65);

  server.close();
  fs.rmSync(file, { force: true });
  console.log(`\nadmin practice: ${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
