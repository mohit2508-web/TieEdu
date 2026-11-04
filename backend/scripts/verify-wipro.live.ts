/**
 * End-to-end check of the free Wipro iOS program (WIPRO_IOS_3T_PLAN.md) on a
 * scratch copy of db.json: a brand-new student, no pack, gets the calendar
 * plan, every lesson, the M1 milestone test (unlimited) and the answer review.
 * Run: npx ts-node --transpile-only scripts/verify-wipro.live.ts
 */
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(__dirname, '..', 'data');
const SCRATCH = path.join(DATA_DIR, `db.wiprolive-${process.pid}.json`);
const SLUG = 'wipro-ios-swift';
const M1 = 'wipro-ios-full-course-mock-m1';

fs.copyFileSync(path.join(DATA_DIR, 'db.json'), SCRATCH);
process.env.JWT_SECRET = 'wipro-live-secret';
process.env.PORT = '5481';
process.env.EMAIL_DISABLED = '1';
process.env.DB_FILE = SCRATCH;
process.env.DATABASE_URL = '';

let pass = 0;
let fail = 0;
const check = (name: string, ok: boolean, detail = '') => {
  if (ok) pass++; else fail++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name}${ok || !detail ? '' : `\n       ${detail}`}`);
};
const BASE = 'http://127.0.0.1:5481/api';
const req = async (p: string, o: { method?: string; token?: string; body?: any } = {}) => {
  const r = await fetch(BASE + p, {
    method: o.method || 'GET',
    headers: { 'Content-Type': 'application/json', ...(o.token ? { Authorization: `Bearer ${o.token}` } : {}) },
    ...(o.body ? { body: JSON.stringify(o.body) } : {}),
  });
  return { status: r.status, body: (await r.json().catch(() => null)) as any };
};
const okStart = (n: number | undefined) => n === 200 || n === 201;
/** Right answers come from the scratch store (the API never sends them); read it once per attempt. */
function answerKey(): (questionId: string) => string {
  const db = JSON.parse(fs.readFileSync(SCRATCH, 'utf-8'));
  const byId = new Map<string, any>((db.questions || []).map((q: any) => [q.id, q]));
  return (id) => String((byId.get(id)?.options || []).findIndex((o: any) => o.isCorrect));
}

async function take(token: string, slug: string, right: boolean) {
  const s = await req(`/skill-test/assessments/${slug}/start`, { method: 'POST', token });
  if (!okStart(s.status)) return { start: s.status, error: s.body?.error } as any;
  const a = s.body.attempt;
  await new Promise((r) => setTimeout(r, 1500)); // let the store flush the attempt
  const correctFor = answerKey();
  const answers = a.questions.map((q: any) => ({ questionId: q.id, selectedOptions: [right ? correctFor(q.id) : String((Number(correctFor(q.id)) + 1) % 4)] }));
  const sub = await req(`/skill-test/attempts/${a.id}/submit`, { method: 'POST', token, body: { answers } });
  return { start: s.status, submit: sub.status, score: sub.body?.attempt?.score, id: a.id, questions: a.questions };
}

async function main() {
  require('../src/server');
  await new Promise((r) => setTimeout(r, 2500));

  console.log('\n[1] a new student picks Wipro iOS');
  const su = await req('/auth/signup', { method: 'POST', body: { name: 'iOS Trainee', email: `ios-${Date.now()}@example.test`, password: 'Trainee@12345' } });
  const tok = su.body?.accessToken;
  check('signed up', !!tok, JSON.stringify(su.body)?.slice(0, 200));
  const set = await req('/prep/target', { method: 'POST', token: tok, body: { slug: SLUG } });
  check('Wipro iOS can be picked as the target', set.status === 200, JSON.stringify(set.body));
  const t = await req('/prep/target', { token: tok });
  check('header target counts to the next milestone', t.body?.slug === SLUG && typeof t.body.days_left === 'number', JSON.stringify(t.body));

  console.log('\n[2] plan, free, labels');
  let p = await req(`/prep/${SLUG}`, { token: tok });
  check('plan 200, owned (free), 45 calendar days', p.status === 200 && p.body.owned === true && p.body.free === true && p.body.plan.length === 17, `${p.status} ${p.body?.owned} ${p.body?.free} ${p.body?.plan?.length}`);
  check('next milestone named with its date', !!p.body.next_milestone?.name && p.body.test_date === p.body.next_milestone.date, JSON.stringify(p.body.next_milestone));
  check('labels say milestone tests', p.body.labels?.section_tests === 'Milestone tests');
  check('M1 section has its test', p.body.sections.find((s: any) => s.key === 'm1')?.test_slug === M1);
  check('20 M1 lessons', p.body.lessons.filter((l: any) => l.section === 'm1').length === 20);
  check('today has something to do', p.body.today.items.length > 0, JSON.stringify(p.body.today));

  console.log('\n[3] every lesson opens, with docs and practice');
  let bad = 0;
  for (const l of p.body.lessons) {
    const r = await req(`/prep/${SLUG}/lesson/${l.id}`, { token: tok });
    if (r.status !== 200 || !r.body.lesson?.doc?.url || (r.body.lesson?.practice || []).length < 3 || !r.body.lesson?.task) { bad++; console.log('    ', l.title, r.status); }
  }
  check('all lessons open (no 402), doc link, task, 3+ practice', bad === 0, `${bad} bad`);
  const comp = await req(`/companies/${SLUG}`, { token: tok });
  check('company page: unlocked for everyone', comp.status === 200 && comp.body?.is_unlocked === true, `${comp.status} ${comp.body?.is_unlocked}`);
  const list = await req('/companies');
  const rows = Array.isArray(list.body) ? list.body : list.body?.companies || list.body?.data || [];
  check('listed publicly', rows.some((c: any) => c.slug === SLUG));

  console.log('\n[4] M1 milestone test: unlimited, code shown, review after');
  const a1 = await take(tok, M1, false);
  check('M1 test starts with 40 questions', okStart(a1.start) && a1.questions?.length === 40, JSON.stringify({ s: a1.start, n: a1.questions?.length, e: a1.error }));
  check('code questions carry the code flag', a1.questions?.some((q: any) => q.code === true));
  check('the API never sends the answers', !JSON.stringify(a1.questions || []).includes('isCorrect'));
  check('all-wrong attempt scores 0', a1.submit === 200 && a1.score === 0, JSON.stringify({ sub: a1.submit, score: a1.score }));
  const rv = await req(`/skill-test/attempts/${a1.id}/result`, { token: tok });
  const review = rv.body?.review || [];
  check('result has a 40-question review', review.length === 40, String(review.length));
  check('review: right answer, your pick and explanation on each', review.every((r: any) => r.correct >= 0 && r.correct < 4 && r.selected !== null && r.selected !== r.correct && r.explanation.length > 10));
  const a3 = await take(tok, M1, false);
  const a2 = await take(tok, M1, true);
  check('retakes are free and unlimited', okStart(a2.start) && okStart(a3.start), JSON.stringify([a2.start, a3.start, a2.error, a3.error]));
  check('all-right attempt scores 100', a2.score === 100, String(a2.score));
  const q1 = new Set((a1.questions || []).map((q: any) => q.id));
  const overlap = (a2.questions || []).filter((q: any) => q1.has(q.id)).length;
  check('a retake draws a different set (fresh questions)', overlap < 40, `${overlap}/40 repeated`);

  console.log('\n[5] track');
  p = await req(`/prep/${SLUG}`, { token: tok });
  const m1 = p.body.sections.find((s: any) => s.key === 'm1');
  check('M1 score and history tracked', m1.attempts === 3 && m1.score === 100 && m1.trend.join() === '0,0,100', JSON.stringify(m1));
  check('attempt list has the 3 tests', p.body.attempts.length === 3);
  check('readiness moves with the tests', p.body.readiness.test > 0, JSON.stringify(p.body.readiness));
  check('fix list points at M1', p.body.fix.section === 'm1');

  console.log(`\nwipro live: ${pass} passed, ${fail} failed`);
  try { fs.unlinkSync(SCRATCH); } catch { /* ignore */ }
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error(e); try { fs.unlinkSync(SCRATCH); } catch { /* ignore */ } process.exit(1); });
