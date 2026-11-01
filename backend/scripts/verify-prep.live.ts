/**
 * End-to-end check of the Infosys SE Train · Test · Track flow (INFOSYS_SE_3T_UX_PLAN §7)
 * against a scratch copy of db.json: a free student and a pack owner.
 * Run: npx ts-node --transpile-only scripts/verify-prep.live.ts
 */
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const DATA_DIR = path.join(__dirname, '..', 'data');
const SCRATCH = path.join(DATA_DIR, `db.preplive-${process.pid}.json`);
const SLUG = 'infosys-systems-engineer';
const OWNER = { email: 'prep-owner@example.test', password: 'Owner@12345' };

fs.copyFileSync(path.join(DATA_DIR, 'db.json'), SCRATCH);
{
  const db = JSON.parse(fs.readFileSync(SCRATCH, 'utf-8'));
  const company = db.companies.find((c: any) => c.slug === SLUG);
  db.users.push({ id: 'prep-owner', name: 'Owner', email: OWNER.email, role: 'student', password_hash: bcrypt.hashSync(OWNER.password, 4), xp: 0, streak: 0 });
  db.unlocks = db.unlocks || [];
  if (company) db.unlocks.push({ id: 'unlock-prep-owner', user_id: 'prep-owner', company_id: company.id, status: 'active', unlocked_at: new Date().toISOString() });
  fs.writeFileSync(SCRATCH, JSON.stringify(db));
}
process.env.JWT_SECRET = 'prep-live-secret';
process.env.PORT = '5479';
process.env.DB_FILE = SCRATCH;
process.env.DATABASE_URL = '';

let pass = 0;
let fail = 0;
const check = (name: string, ok: boolean, detail = '') => {
  if (ok) pass++; else fail++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name}${ok || !detail ? '' : `\n       ${detail}`}`);
};
const BASE = 'http://127.0.0.1:5479/api';
const req = async (p: string, o: { method?: string; token?: string; body?: any } = {}) => {
  const r = await fetch(BASE + p, {
    method: o.method || 'GET',
    headers: { 'Content-Type': 'application/json', ...(o.token ? { Authorization: `Bearer ${o.token}` } : {}) },
    ...(o.body ? { body: JSON.stringify(o.body) } : {}),
  });
  return { status: r.status, body: (await r.json().catch(() => null)) as any };
};
const inDays = (n: number) => new Date(Date.now() + 5.5 * 3600000 + n * 86400000).toISOString().slice(0, 10);
const okStart = (n: number | undefined) => n === 200 || n === 201;

async function takeTest(token: string, testSlug: string, right: boolean) {
  const s = await req(`/skill-test/assessments/${testSlug}/start`, { method: 'POST', token });
  if (!okStart(s.status)) return { start: s.status, submit: 0, error: s.body?.error };
  const a = s.body.attempt;
  const answers = a.questions.map((q: any) => ({ questionId: q.id, selectedOptions: [right ? String(q.__correct ?? 0) : '9'] }));
  const sub = await req(`/skill-test/attempts/${a.id}/submit`, { method: 'POST', token, body: { answers } });
  return { start: s.status, submit: sub.status, score: sub.body?.attempt?.score, id: a.id };
}

/** Right answers come from the scratch store (the API never sends them). */
function correctFor(questionId: string): string {
  const db = JSON.parse(fs.readFileSync(SCRATCH, 'utf-8'));
  const q = (db.questions || []).find((x: any) => x.id === questionId);
  const opts = q?.options || [];
  const i = opts.findIndex((o: any) => o.isCorrect || o.is_correct);
  return String(i >= 0 ? i : q?.correctAnswer ?? q?.correct ?? 0);
}

async function takeRight(token: string, testSlug: string) {
  const s = await req(`/skill-test/assessments/${testSlug}/start`, { method: 'POST', token });
  if (!okStart(s.status)) return { start: s.status, submit: 0 };
  const a = s.body.attempt;
  await new Promise((r) => setTimeout(r, 1200)); // let the store flush the attempt
  const answers = a.questions.map((q: any) => ({ questionId: q.id, selectedOptions: [correctFor(q.id)] }));
  const sub = await req(`/skill-test/attempts/${a.id}/submit`, { method: 'POST', token, body: { answers } });
  return { start: s.status, submit: sub.status, score: sub.body?.attempt?.score };
}

async function main() {
  require('../src/server');
  await new Promise((r) => setTimeout(r, 2000));

  console.log('\n[1] new student picks a target company');
  const su = await req('/auth/signup', { method: 'POST', body: { name: 'Free Student', email: `free-${Date.now()}@example.test`, password: 'Free@12345' } });
  const free = su.body?.accessToken;
  check('signed up', !!free, JSON.stringify(su.body));
  let t = await req('/prep/target', { token: free });
  check('no target yet, not asked: the sheet shows', t.body?.slug === null && t.body?.asked === false, JSON.stringify(t.body));
  await req('/prep/target', { method: 'POST', token: free, body: { slug: SLUG, test_date: inDays(30) } });
  t = await req('/prep/target', { token: free });
  check('target saved with 30 days left', t.body?.slug === SLUG && t.body?.days_left === 30, JSON.stringify(t.body));
  const bad = await req('/prep/target', { method: 'POST', token: free, body: { slug: 'tcs-nqt' } });
  check('companies without a plan are refused', bad.status === 400);

  console.log('\n[2] free student: plan, lessons, demo test');
  let p = await req(`/prep/${SLUG}`, { token: free });
  check('plan built, not owned, 30 days', p.status === 200 && p.body.owned === false && p.body.plan.length === 30 && p.body.days_left === 30, `${p.status} ${p.body?.plan?.length} ${p.body?.days_left}`);
  check('days left identical on header target and plan', p.body.days_left === t.body.days_left);
  const freeLesson = p.body.lessons.find((l: any) => l.free);
  const lockedLesson = p.body.lessons.find((l: any) => !l.free);
  check('6 free lessons (first of each section)', p.body.lessons.filter((l: any) => l.free).length === 6, String(p.body.lessons.filter((l: any) => l.free).length));
  const fl = await req(`/prep/${SLUG}/lesson/${freeLesson.id}`, { token: free });
  check('free lesson: rules, 3 examples, 3-5 practice Qs', fl.status === 200 && fl.body.lesson?.rules?.length > 0 && fl.body.lesson?.examples?.length === 3 && fl.body.lesson?.practice?.length >= 3, `${fl.status} ${JSON.stringify(fl.body?.lesson)?.slice(0, 200)}`);
  const ll = await req(`/prep/${SLUG}/lesson/${lockedLesson.id}`, { token: free });
  check('locked lesson: 402 pack_required, no content', ll.status === 402 && ll.body.error === 'pack_required' && !ll.body.lesson);
  const comp = await req(`/companies/${SLUG}`, { token: free });
  const oa = (comp.body?.modules || comp.body?.company?.modules || []).find((m: any) => m.id === 'mod-prep-infosys-se-oa');
  const leaked = (oa?.items || []).filter((i: any) => !i.is_free_preview && i.lesson?.practice);
  check('company API does not leak locked lessons', !!oa && leaked.length === 0, `module ${!!oa}, leaked ${leaked.length}`);
  check('company is not unlocked for the free student', comp.body?.is_unlocked === false);
  const all = await req('/companies');
  const list = Array.isArray(all.body) ? all.body : all.body?.companies || all.body?.data || [];
  check('Infosys SE is in the public company list', list.some((c: any) => c.slug === SLUG), list.map((c: any) => c.slug).join(' '));

  const mockSlug = p.body.full_mock.slug;
  const demo = await takeTest(free, mockSlug, false);
  check('free demo mock starts and submits', okStart(demo.start) && demo.submit === 200, JSON.stringify(demo));
  const again = await takeTest(free, mockSlug, false);
  check('second mock needs the pack (402)', again.start === 402, JSON.stringify(again));
  const sec = await takeTest(free, p.body.sections[0].test_slug, true);
  check('section test needs the pack (402)', sec.start === 402, JSON.stringify(sec));
  p = await req(`/prep/${SLUG}`, { token: free });
  check('demo attempt tracked', p.body.full_mock.attempts === 1 && p.body.attempts.length === 1, JSON.stringify(p.body.full_mock));
  check('every section has a score after the demo', p.body.sections.every((s: any) => s.score !== null), JSON.stringify(p.body.sections.map((s: any) => s.score)));
  check('fix list names a weak section with lessons', !!p.body.fix.name && p.body.fix.lessons.length > 0, JSON.stringify(p.body.fix));

  console.log('\n[3] pack owner: everything unlocked, retest raises readiness');
  const lo = await req('/auth/login', { method: 'POST', body: OWNER });
  const own = lo.body?.accessToken;
  check('owner logged in', !!own, JSON.stringify(lo.body)?.slice(0, 200));
  await req('/prep/target', { method: 'POST', token: own, body: { slug: SLUG } });
  p = await req(`/prep/${SLUG}`, { token: own });
  check('owned plan, 50-day default', p.body.owned === true && p.body.plan.length === 50, `${p.body.owned} ${p.body.plan?.length}`);
  const ol = await req(`/prep/${SLUG}/lesson/${lockedLesson.id}`, { token: own });
  check('owner opens any lesson', ol.status === 200 && ol.body.lesson?.practice?.length > 0);
  const oc = await req(`/companies/${SLUG}`, { token: own });
  check('company unlocked for the owner (page sends them to the plan)', oc.body?.is_unlocked === true);
  const sKey = p.body.sections[0].test_slug;
  const s1 = await takeTest(own, sKey, false);
  const before = (await req(`/prep/${SLUG}`, { token: own })).body;
  const s2 = await takeRight(own, sKey);
  const after = (await req(`/prep/${SLUG}`, { token: own })).body;
  check('section test retakes allowed', okStart(s1.start) && okStart(s2.start), JSON.stringify([s1, s2]));
  check('both section attempts in the trend', after.sections[0].trend.length === 2, JSON.stringify(after.sections[0]));
  check('readiness went up after the better retest', after.readiness.score > before.readiness.score, `${before.readiness.score} → ${after.readiness.score} (scores ${JSON.stringify(after.sections[0].trend)})`);
  check('result screen gets "was → now"', after.readiness.previous !== undefined);
  await req(`/prep/${SLUG}/lesson`, { method: 'POST', token: own, body: { item_id: lockedLesson.id } });
  const afterLesson = (await req(`/prep/${SLUG}`, { token: own })).body;
  check('finished lesson is ticked and counts in readiness', afterLesson.lessons.find((l: any) => l.id === lockedLesson.id).done && afterLesson.readiness.lessons > 0);
  const m1 = await takeTest(own, mockSlug, false);
  const m2 = await takeTest(own, mockSlug, false);
  check('owner takes unlimited mocks', okStart(m1.start) && okStart(m2.start), JSON.stringify([m1, m2]));
}

main().catch((e) => { fail++; console.error(e); }).finally(() => {
  try { fs.unlinkSync(SCRATCH); } catch { /* best effort */ }
  console.log(`\nprep-live: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
});
