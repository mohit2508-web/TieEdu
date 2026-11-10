/**
 * TCS NQT (owner's 2027 guide, 2026-11-10): profile, page and guide now; the
 * content slots stay off while empty. The content run (tcsNqt-content.test.ts)
 * checks that they switch on once filled.
 */
import { seedCompanyProfiles, seedInterviewPrep, seedMissing3T, seedCompanyTest, seedSectionalTests } from '../src/lib/seed3T';
import { availableTopics, buildGuide } from '../src/lib/companyGuide';
import { derivePageContent } from '../src/lib/companyPageDerive';
import { PREP_COMPANIES } from '../src/lib/prep';

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, note = '') {
  if (cond) { pass++; console.log(`  ok   ${name}`); } else { fail++; console.log(`  FAIL ${name} ${note}`); }
}

const db: any = { companies: [], skills: [], topics: [], questions: [], assessments: [] };
seedCompanyProfiles(db, false, ['tcs-nqt']);
const c = db.companies.find((x: any) => x.slug === 'tcs-nqt');
check('profile seeded and published', c?.status === 'published');
check('5 rounds: Part A, Part B, technical, managerial, HR', c.rounds_pipeline.map((r: any) => r.round_type).join(',') === 'OA,Coding,Technical,Managerial,HR');
check('pattern stamped with the guide date', c.rounds_pipeline[0].pattern_checked_at === '2026-11-10' && c.metric_sources.rounds.verified_at === '2026-11-10');
check('pay is an estimate: never stamped verified', !c.metric_sources.ctc && c.ctc_min === 3.3 && c.ctc_max === 11.5);
check('registration is on NextStep', c.careers_link === 'https://nextstep.tcs.com');
check('5 test parts, 190 minutes', c.profile.oa_pattern.length === 5 && c.profile.oa_pattern.reduce((n: number, x: any) => n + x.minutes, 0) === 190);
check('5 apply steps from the guide', c.profile.apply_steps.length === 5 && /NextStep/.test(c.profile.apply_steps[0].title));
check('3 page notes (two NQTs, timeline, 90-day plan)', c.profile.page_notes.length === 3);

const topics = availableTopics(c);
for (const t of ['exam-pattern', 'syllabus', 'interview-questions', 'hr-interview', 'hiring-process', 'salary-eligibility']) {
  check(`guide page: ${t}`, topics.includes(t as any));
}
check('no prep-plan page before content', !topics.includes('prep-plan'));
const ex = buildGuide(c, 'exam-pattern')!;
check('exam pattern: total 190 minutes', /about 190 minutes/.test(JSON.stringify(ex.sections[1])), JSON.stringify(ex.sections[1]));
check('exam pattern lists the coding part', ex.sections[0].table!.rows.some((r) => /Advanced Coding/.test(r[0]) && r[1] === '2 problems'));
const syl = buildGuide(c, 'syllabus')!;
check('syllabus has the coding topics', JSON.stringify(syl).includes('sliding window'));

const page = derivePageContent(db, c);
const types = page.sections.map((s) => s.type);
const elig = page.sections.find((s) => s.type === 'eligibility_apply')!;
check('page: apply steps are the guide\'s', (elig.data.steps as any[]).length === 5 && /^https:\/\/nextstep\.tcs\.com\/?$/.test((elig.data.steps as any[])[0].link_href), JSON.stringify(elig.data.steps));
check('page: eligibility last confirmed on the guide date', elig.data.last_confirmed === '2026-11-10');
check('page: 3 text blocks from the guide', types.filter((t) => t === 'rich_text').length === 3);
const faq = page.sections.find((s) => s.type === 'faq')!;
check('page: FAQ has the guide\'s questions', (faq.data.items as any[]).some((x) => /negative marking/i.test(x.q)));
const roles = page.sections.find((s) => s.type === 'role_compare')!;
check('page: Ninja / Digital / Prime, not stamped verified', (roles.data.roles as any[]).length === 3 && (roles.data.roles as any[]).every((r) => r.stamp === 'being_verified'));
const stats = page.sections.find((s) => s.type === 'stat_strip')!;
check('page: package stat says being verified', (stats.data.stats as any[]).find((s) => s.label === 'Package')?.stamp === 'being_verified');

// Content slots stay off while empty.
check('no prep plan registered yet', !PREP_COMPANIES['tcs-nqt']);
check('no half-empty mock', seedCompanyTest(db, 'tcs-nqt') === 0 && !db.skills.length);
check('no empty sectional tests', seedSectionalTests(db, 'tcs-nqt') === 0);
check('only the filled coding module is added (the rest stay off while empty)', seedInterviewPrep(db) === 1 && c.modules.map((m: any) => m.id).join() === 'mod-prep-tcs-nqt-coding');

// A live database: the old profile is rewritten once, modules kept, admin edits after that stay.
const live: any = { companies: [{ id: 'comp-3', slug: 'tcs-nqt', status: 'published', name: 'TCS — NQT', careers_link: 'https://www.tcsion.com/hub/national-qualifier-test/', modules: [{ id: 'keep' }] }], skills: [], topics: [], questions: [], assessments: [], company_focus_applied: 'x', company_focus_v2: 'x', company_mphasis_v1: 'x', feed_v3_seeded: 'x', feed_v3_1: 'x' };
seedMissing3T(live);
const t = live.companies.find((x: any) => x.slug === 'tcs-nqt');
check('old profile refreshed', t.careers_link === 'https://nextstep.tcs.com' && t.profile.apply_steps.length === 5);
check('its modules are kept', t.modules.some((m: any) => m.id === 'keep'));
t.tagline = 'Admin edit';
seedMissing3T(live);
check('refresh runs only once (admin edits stay)', t.tagline === 'Admin edit');

// Others unchanged.
const idb: any = { companies: [], skills: [], topics: [], questions: [], assessments: [] };
seedCompanyProfiles(idb, false, ['infosys-systems-engineer', 'accenture']);
seedInterviewPrep(idb);
const inf = idb.companies.find((x: any) => x.slug === 'infosys-systems-engineer');
check('Infosys keeps its 3 prep modules', inf.modules.length === 3);
check('Infosys CTC still stamped verified', !!inf.metric_sources.ctc);
check('Infosys mock still builds, with no coding section', seedCompanyTest(idb, 'infosys-se') > 0 && idb.assessments[0].coding === null && idb.assessments[0].durationMinutes === 100);
const acc = idb.companies.find((x: any) => x.slug === 'accenture');
const accSteps = derivePageContent(idb, acc).sections.find((s) => s.type === 'eligibility_apply')!.data.steps as any[];
check('Accenture keeps the generic 4 apply steps', accSteps.length === 4 && accSteps[0].title === 'Register');

console.log(`\ntcs-nqt: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
