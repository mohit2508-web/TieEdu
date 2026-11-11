/**
 * Company sets v2 (PRACTICE_POLISH_PLAN.md §6) over HTTP on a scratch store:
 * difficulty mix, continue, target pinned, solve rates from 20 tries, coming soon + notify.
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
  const file = path.join(os.tmpdir(), `practice-sets-${process.pid}.json`);
  process.env.DB_FILE = file;
  delete process.env.PISTON_API_URL;
  delete process.env.DATABASE_URL;
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'practice-sets-test-secret-0123456789abcdef';
  const { seedCompanyProfiles, seedInterviewPrep } = await import('../src/lib/seed3T');
  const { COMPANY_SETS, BANK_BY_ID } = await import('../src/lib/practice/bank');
  const { PREP_COMPANIES } = await import('../src/lib/prep');

  const db: any = { companies: [], skills: [], topics: [], questions: [], assessments: [], attempts: [], unlocks: [], prep_progress: [], code_submissions: [],
    users: [{ id: 'u1', name: 'Asha', email: 'asha@example.com', role: 'student', target_company: 'tcs-nqt' }] };
  seedCompanyProfiles(db, false, Object.keys(PREP_COMPANIES).concat('tcs-nqt'));
  seedInterviewPrep(db);
  const tcs = COMPANY_SETS.find((s) => s.slug === 'tcs-nqt')!;
  const [first, second] = tcs.levels[0].ids;
  const now = new Date().toISOString();
  db.code_submissions.push({ id: 's1', user_id: 'u1', problem_id: first, verdict: 'accepted', passed: 5, total: 5, language: 'cpp', at: now, code: '' });
  db.code_submissions.push({ id: 's2', user_id: 'u1', problem_id: second, verdict: 'wrong_answer', passed: 1, total: 5, language: 'cpp', at: now, code: '' });
  // 25 students tried `first`; 10 solved it → 40%. 5 tried `second` → below the threshold, no rate.
  for (let i = 0; i < 25; i++) db.code_submissions.push({ id: `x${i}`, user_id: `x${i}`, problem_id: first, verdict: i < 10 ? 'accepted' : 'wrong_answer', passed: 0, total: 5, language: 'cpp', at: now, code: '' });
  for (let i = 0; i < 5; i++) db.code_submissions.push({ id: `y${i}`, user_id: `y${i}`, problem_id: second, verdict: 'accepted', passed: 5, total: 5, language: 'cpp', at: now, code: '' });
  db.prep_progress.push({ user_id: 'u1', company_slug: 'tcs-nqt', lessons_done: [], readiness_log: [{ date: '2026-11-10', score: 64 }] });
  fs.writeFileSync(file, JSON.stringify(db));

  const express = (await import('express')).default;
  const { practiceRouter } = await import('../src/routes/practice.routes');
  const { signAccessToken } = await import('../src/middleware/auth');
  const tokens: Record<string, string> = { u1: signAccessToken({ id: 'u1', role: 'student' }) };
  const app = express();
  app.use(express.json());
  app.use('/p', practiceRouter);
  const server = http.createServer(app);
  await new Promise<void>((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${(server.address() as any).port}/p`;
  const call = async (p: string, user?: string, body?: unknown) => {
    const r = await fetch(base + p, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${tokens[user]}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
    return { status: r.status, body: await r.json().catch(() => null) };
  };

  const list = (await call('/companies', 'u1')).body;
  const t = list.companies.find((c: any) => c.slug === 'tcs-nqt');
  check('cards carry a difficulty mix that adds up', t.mix.easy + t.mix.medium + t.mix.hard === t.total, JSON.stringify(t.mix));
  check('reported count is within the set', t.reported > 0 && t.reported <= t.total);
  check('continue: the last unsolved problem worked on', t.continue?.id === second && t.continue.started === true, JSON.stringify(t.continue));
  check('the target company is pinned first and flagged', list.companies[0].slug === 'tcs-nqt' && t.target === true);
  check('readiness comes from the latest log entry', t.readiness === 64);
  check('levels count is on the card', t.levels === tcs.levels.length);
  const guest = (await call('/companies')).body.companies.find((c: any) => c.slug === 'tcs-nqt');
  check('a guest gets "start with" the first open problem', guest.continue?.id === first && guest.continue.started === false && guest.target === false, JSON.stringify(guest.continue));

  const soon = list.coming_soon as any[];
  check('coming soon lists prep companies without a coding set', soon.length > 0 && soon.every((c) => !COMPANY_SETS.some((s) => s.slug === c.slug)), JSON.stringify(soon.map((c) => c.slug)));
  const pick = soon[0].slug;
  check('notify needs sign-in', (await call('/notify', undefined, { slug: pick })).status === 401);
  check('notify on is saved', (await call('/notify', 'u1', { slug: pick, on: true })).body?.notify === true && (await call('/companies', 'u1')).body.coming_soon.find((c: any) => c.slug === pick).notify === true);
  await call('/notify', 'u1', { slug: pick, on: false });
  check('notify off removes it', (await call('/companies', 'u1')).body.coming_soon.find((c: any) => c.slug === pick).notify === false);
  check('notify rejects a company that already has a set', (await call('/notify', 'u1', { slug: 'tcs-nqt' })).status === 400);

  const page = (await call('/companies/tcs-nqt', 'u1')).body;
  const rows = page.levels.flatMap((l: any) => l.problems);
  check('solve rate shows from 20 tries (25 tried, 11 solved incl. u1 → 42%)', rows.find((r: any) => r.id === first).solve_rate === Math.round((11 / 26) * 100), String(rows.find((r: any) => r.id === first).solve_rate));
  check('no solve rate under 20 tries', rows.find((r: any) => r.id === second).solve_rate === null);
  check('each level names its recommended next problem', page.levels[0].recommended === second, page.levels[0].recommended);
  check('insights on the company page', page.insights.continue?.id === second && page.insights.mix.easy >= 1);
  check('the problem exists in the bank', !!BANK_BY_ID.get(first));

  server.close();
  fs.rmSync(file, { force: true });
  console.log(`\npractice sets: ${pass} passed, ${fail} failed`);
  if (fail) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
