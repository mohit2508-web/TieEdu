/**
 * Wipro iOS Developer Training (WIPRO_IOS_3T_PLAN.md): content quality guards,
 * free access, milestone tests, the calendar plan and live-database refresh.
 */
import { seedCompanyProfiles, seedInterviewPrep, seedMissing3T, seedCompanyTest, seedSectionalTests } from '../src/lib/seed3T';
import { buildPrep, PREP_COMPANIES } from '../src/lib/prep';
import { ownsCompanyPack } from '../src/routes/prep.routes';
import { addPack } from '../src/lib/pulse/packs';
import { LABS } from '../src/data/wiproIOS/labs';
import { WIPRO_IOS_BANK, WIPRO_IOS_LESSONS_RICH, WIPRO_IOS_SLUG, TOPICS, MODULES, curriculumDays } from '../src/data/wiproIOS';

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, note = '') {
  if (cond) { pass++; console.log(`  ok   ${name}`); } else { fail++; console.log(`  FAIL ${name} ${note}`); }
}

// ---- content quality
const titles = new Set(TOPICS.map(([, t]) => t));
check('42 topics on the sheet', TOPICS.length === 42, String(TOPICS.length));
check('every topic module has dates', TOPICS.every(([m]) => !!MODULES[m]));
for (const l of WIPRO_IOS_LESSONS_RICH) {
  const qs = WIPRO_IOS_BANK.filter((q) => q.lesson === l.title);
  const ok = titles.has(l.title) && /^https:\/\//.test(l.doc[1]) && l.rules.length >= 4 && l.examples.length >= 2 && !!l.trap && !!l.task && !!l.what && qs.length >= 3;
  check(`lesson complete: ${l.title}`, ok, `qs=${qs.length}`);
  check(`lesson milestone matches its module: ${l.title}`, MODULES[l.module].m === l.m && TOPICS.some(([m, t]) => m === l.module && t === l.title));
}
const seen = new Set<string>();
let bad = 0;
for (const q of WIPRO_IOS_BANK) {
  const key = q.question.trim();
  const opts = new Set(q.options.map((o) => o.trim()));
  const kindOk = q.kind === 'fill' ? (q.answers || []).length > 0 && (q.answers || []).every((x) => x.trim())
    : q.kind === 'order' ? (q.items || []).length >= 3 && new Set(q.items).size === (q.items || []).length
      : q.options.length === 4 && opts.size === 4 && q.correct >= 0 && q.correct <= 3;
  if (seen.has(key) || !kindOk || q.explanation.length < 20 || !WIPRO_IOS_LESSONS_RICH.some((l) => l.title === q.lesson)) {
    bad++; console.log('    bad question:', q.question.slice(0, 70));
  }
  seen.add(key);
}
check('every question: unique, valid for its kind (4-option MCQ / typed answers / 3+ order items), explained, tagged to a lesson', bad === 0, `${bad} bad`);
const m1 = WIPRO_IOS_BANK.filter((q) => q.topic === 'm1' && (q.kind || 'mcq') === 'mcq');
// Guess papers (owner, 2026-11-04) and hands-on questions.
check('guess papers: Part 1 (41) + Part 2 so far (69) are in, each with a memory trick', WIPRO_IOS_BANK.filter((q) => q.trick && (q.kind || 'mcq') === 'mcq').length === 110);
for (const m of ['m1', 'm2', 'm3', 'm4', 'final'] as const) {
  const t = WIPRO_IOS_BANK.filter((q) => q.topic === m);
  check(`${m}: typed and drag-order questions, not only MCQs`, t.filter((q) => q.kind === 'fill').length >= 4 && t.some((q) => q.kind === 'order'));
}
{
  // Grading the new kinds (backend lib/answerKinds.ts).
  const { typedRight, orderRight, shownOrder, normAnswer } = require('../src/lib/answerKinds');
  check('typed answers ignore case, spaces, quotes and a trailing ;', typedRight(['guard'], ' Guard ') && typedRight(['[20, 40]'], '[20,40]') && typedRight(['Int?'], 'int?;') && !typedRight(['weak'], 'unowned') && !typedRight(['x'], ''));
  check('typed: ?? and ! are kept', normAnswer('??') === '??' && normAnswer('!') === '!');
  check('order: only the exact order is right', orderRight(3, ['0', '1', '2']) && !orderRight(3, ['1', '0', '2']) && !orderRight(3, ['0', '1']));
  const s1 = shownOrder('att-1:q-1', 5);
  check('order: shuffle is stable per attempt and never already solved', JSON.stringify(s1) === JSON.stringify(shownOrder('att-1:q-1', 5)) && !s1.every((v: number, i: number) => v === i) && new Set(s1).size === 5
    && [2, 3, 4, 6].every((n) => [...Array(30)].every((_, k) => !shownOrder(`s${k}`, n).every((v: number, i: number) => v === i))));
}
check('M1 bank holds at least 100 questions', m1.length >= 100, String(m1.length));
const mix = (d: string) => m1.filter((q) => q.difficulty === d).length / m1.length;
check('M1 difficulty mix has real depth (≥10% advanced, ≥35% intermediate)', mix('advanced') >= 0.1 && mix('intermediate') >= 0.35, `adv ${mix('advanced').toFixed(2)} int ${mix('intermediate').toFixed(2)}`);
check('M1 has plenty of code-output questions (≥35%)', m1.filter((q) => q.code).length / m1.length >= 0.35);
const answerSpread = [0, 1, 2, 3].map((i) => m1.filter((q) => q.correct === i).length);
check('answers are not all in one position (lesson practice is not shuffled)', Math.max(...answerSpread) / m1.length < 0.7, answerSpread.join('/'));
check('Swift string interpolation survived escaping', WIPRO_IOS_BANK.some((q) => q.question.includes('\\(name)')) && !WIPRO_IOS_BANK.some((q) => /"Hi \(name\)"/.test(q.question)));

// ---- curriculum calendar
const days = curriculumDays();
const allLessons = days.flatMap((d) => d.lessons);
check('calendar places every topic exactly once', allLessons.length === 42 && new Set(allLessons).size === 42);
check('M1 test day is 7 Nov; final is 15 Nov', days.find((d) => d.milestone === 'm1')?.date === '2026-11-07' && days.find((d) => d.milestone === 'final')?.date === '2026-11-15');
check('every lesson is scheduled on or before 14 Nov', days.filter((d) => d.lessons.length).every((d) => d.date <= '2026-11-14'));
check('no day has more than 4 lessons', days.every((d) => d.lessons.length <= 4), days.map((d) => d.lessons.length).join(','));

// ---- seeding
const db: any = { companies: [], skills: [], topics: [], questions: [], assessments: [], attempts: [], users: [{ id: 'u1', role: 'student' }] };
seedCompanyProfiles(db, false, [WIPRO_IOS_SLUG]);
const c = db.companies.find((x: any) => x.slug === WIPRO_IOS_SLUG);
check('profile published and free', c?.status === 'published' && c.is_free === true);
check('5 milestone rounds', c.rounds_pipeline.length === 5 && c.rounds_pipeline[0].question_count === 40);
check('no CTC shown for a training track', c.ctc_min === null && c.ctc_max === null);
check('Wipro Elite NTH is untouched (separate program)', !db.companies.some((x: any) => x.slug === 'wipro-elite-nth'));

seedInterviewPrep(db);
const mod = c.modules.find((m: any) => m.id === 'mod-prep-wipro-ios-lessons');
check('lesson module is free: not premium, not pack-gated', mod && mod.is_premium === false && mod.pack_gated === false);
check('every lesson item is readable', mod.items.every((it: any) => it.is_free_preview));
check('reader gets doc link, task and practice', mod.items.every((it: any) => it.lesson?.doc?.url && it.lesson?.task && it.lesson.practice.length >= 3));
check('practice comes from the lesson’s own questions', mod.items.every((it: any) => it.lesson.practice.every((p: any) => WIPRO_IOS_BANK.find((q) => q.question === p.question)?.lesson === it.lesson.title)));

check('full course mock builds: 60 Qs / 75 min', seedCompanyTest(db, 'wipro-ios') > 0 && db.skills.find((s: any) => s.slug === 'wipro-ios-full-course-mock')?.totalQuestions === 60);
seedSectionalTests(db, 'wipro-ios');
const m1Test = db.skills.find((s: any) => s.slug === 'wipro-ios-full-course-mock-m1');
check('M1 milestone test exists: 40 Qs, 50 min', m1Test && m1Test.totalQuestions === 40 && m1Test.avgCompletionTime === 50 && m1Test.name === 'Wipro iOS · Milestone 1 · Swift foundations');
check('M1 test holds the whole M1 bank (MCQ, typed and order)', db.questions.filter((q: any) => q.skillId === m1Test.id && q.status === 'approved').length === WIPRO_IOS_BANK.filter((q) => q.topic === 'm1').length);
check('M1 test stores typed and order questions with their own types', ['fill_blank', 'ordering'].every((t) => db.questions.some((q: any) => q.skillId === m1Test.id && q.type === t)));
check('code questions keep their code flag', db.questions.some((q: any) => q.skillId === m1Test.id && q.code === true));
check('no empty milestone tests', !db.skills.some((s: any) => s.slug === 'wipro-ios-full-course-mock-m2') || WIPRO_IOS_BANK.filter((q) => q.topic === 'm2').length >= 25);

// ---- free access
check('every student owns the program (no pack)', ownsCompanyPack(db, 'u1', WIPRO_IOS_SLUG) === true);

// ---- prep view
check('prep plan registered', !!PREP_COMPANIES[WIPRO_IOS_SLUG]);
const view: any = buildPrep(db, 'u1', WIPRO_IOS_SLUG, true);
check('plan covers 30 Oct → 15 Nov', view.plan[0].date === '2026-10-30' && view.plan[view.plan.length - 1].date === '2026-11-15' && view.plan.length === 17);
check('7 Nov is the M1 test day', view.plan.find((d: any) => d.date === '2026-11-07').items.some((i: any) => i.kind === 'sectional' && i.ref === 'wipro-ios-full-course-mock-m1'));
check('15 Nov has the full course mock', view.plan.find((d: any) => d.date === '2026-11-15').items.some((i: any) => i.kind === 'mock'));
check('5–6 Nov have an M1 practice mock', ['2026-11-05', '2026-11-06'].every((d) => view.plan.find((x: any) => x.date === d).items.some((i: any) => /Practice: Milestone 1/.test(i.title))));
check('future topics show as coming, not broken links', view.plan.flatMap((d: any) => d.items).filter((i: any) => i.kind === 'lesson' && !i.ref).every((i: any) => i.soon));
check('countdown points at a milestone date', ['2026-11-07', '2026-11-10', '2026-11-12', '2026-11-14', '2026-11-15'].includes(view.test_date));
check('free flag and labels reach the screen', view.free === true && view.labels.section_tests === 'Milestone tests');
check('lesson sections map to milestones', view.lessons.every((l: any) => ['m1', 'm2', 'm3', 'm4', 'final'].includes(l.section)));
check('all 42 lessons written, nothing left as coming', view.lessons.length === 42 && !view.plan.flatMap((d: any) => d.items).some((i: any) => i.soon), String(view.lessons.length));
for (const k of ['m2', 'm3', 'm4', 'final']) check(`${k} milestone test exists`, db.skills.some((s: any) => s.slug === `wipro-ios-full-course-mock-${k}`));
const today = new Date(Date.now() + 5.5 * 3600000).toISOString().slice(0, 10);
if (today > '2026-11-02' && today < '2026-11-15') check('today lists catch-up lessons when behind', view.today.items.some((i: any) => /^Catch up:/.test(i.title)));

// ---- live database: refresh once, then pick up bank changes without losing attempts
const live: any = { companies: [], skills: [], topics: [], questions: [], assessments: [], company_focus_applied: 'x', company_focus_v2: 'x', company_mphasis_v1: 'x', feed_v2_seeded: 'x' };
seedMissing3T(live);
const lc = live.companies.find((x: any) => x.slug === WIPRO_IOS_SLUG);
check('server start creates the program', lc?.status === 'published');
const lt = live.skills.find((s: any) => s.slug === 'wipro-ios-full-course-mock-m1');
check('server start creates the M1 test', !!lt);
const ids = live.questions.filter((q: any) => q.skillId === lt.id).map((q: any) => q.id).sort().join();
seedMissing3T(live);
check('restart keeps the same question ids', live.questions.filter((q: any) => q.skillId === lt.id).map((q: any) => q.id).sort().join() === ids);
lt.bank_hash = 'old';
const firstQ = live.questions.find((q: any) => q.skillId === lt.id);
firstQ.question = 'a question that was removed from the bank';
firstQ.id = 'qst-old-removed';
seedMissing3T(live);
check('changed bank is picked up on start', lt.bank_hash !== 'old');
check('removed question is retired, not deleted', live.questions.find((q: any) => q.id === 'qst-old-removed')?.status === 'retired');
lc.modules.find((m: any) => m.id === 'mod-prep-wipro-ios-lessons').content_hash = 'old';
seedMissing3T(live);
check('changed lessons are picked up on start', lc.modules.find((m: any) => m.id === 'mod-prep-wipro-ios-lessons').content_hash !== 'old');

// ---- Project Pulse lab pack + the Lab tab
check('33 labs and assessments, each with tasks and a due date by 15 Nov', LABS.length === 33 && LABS.every((l) => l.tasks.length >= 4 && l.due <= '2026-11-15' && !!l.submit));
const pdb: any = { companies: [], skills: [], topics: [], questions: [], assessments: [], attempts: [], users: [{ id: 's1', role: 'student' }] };
seedCompanyProfiles(pdb, false, [WIPRO_IOS_SLUG]);
seedInterviewPrep(pdb);
pdb.pulse = { teachers: [], classes: [{ id: 'cls1', name: 'iOS batch A', owner_id: 't1', co_teachers: [] }], roster: [{ id: 'r1', class_id: 'cls1', user_id: 's1', name: 'Asha', email: 'a@x.in', status: 'active' }], tasks: [], repos: [], results: [] };
check('pack adds all 33 labs to the class', addPack(pdb, pdb.pulse.classes[0], 'wipro-ios', 't1') === 33);
check('adding again adds nothing (idempotent)', addPack(pdb, pdb.pulse.classes[0], 'wipro-ios', 't1') === 0);
const t1 = pdb.pulse.tasks[0];
check('lab task: Swift, published, folder lab-1a, hand-reviewed, one requirement per handbook task', t1.language === 'swift' && t1.published && t1.folder === 'lab-1a' && !t1.auto_tests && t1.requirements.length === LABS[0].tasks.length);
check('deadlines end 23:59 IST on the due date', pdb.pulse.tasks.every((t: any) => t.deadline_at.endsWith('T18:29:00.000Z') && t.deadline_at > t.assigned_at));
const pv: any = buildPrep(pdb, 's1', WIPRO_IOS_SLUG, true);
check('Lab tab: 33 labs with the Pulse class', pv.lab.items.length === 33 && pv.lab.pulse_class?.name === 'iOS batch A');
check('Lab tab: student status from Pulse (no repo yet)', pv.lab.items.every((l: any) => l.pulse?.status === 'noRepo'));
const outsider: any = buildPrep(pdb, 'nobody', WIPRO_IOS_SLUG, true);
check('students outside Pulse still see every brief', outsider.lab.items.length === 33 && outsider.lab.pulse_class === null && outsider.lab.items.every((l: any) => l.pulse === null));

// ---- Infosys unchanged
const idb: any = { companies: [], skills: [], topics: [], questions: [], assessments: [] };
seedCompanyProfiles(idb, false, ['infosys-systems-engineer']);
seedInterviewPrep(idb);
const inf = idb.companies[0];
check('Infosys lessons stay pack-gated', inf.modules[0].pack_gated === true && inf.modules[0].items.filter((i: any) => i.is_free_preview).length < inf.modules[0].items.length);
check('Infosys keeps numbered lesson ids', inf.modules[0].items[0].id === 'mod-prep-infosys-se-oa-1');
check('Infosys is not free', !inf.is_free);

console.log(`\nwipro-ios: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
