/**
 * Mphasis (owner's OA syllabus, 2026-11-02): profile, guide pages, and the
 * content slots that stay off until the content exists.
 */
import { seedCompanyProfiles, seedInterviewPrep, seedMissing3T, seedCompanyTest, seedSectionalTests } from '../src/lib/seed3T';
import { availableTopics, buildGuide } from '../src/lib/companyGuide';
import { PREP_COMPANIES } from '../src/lib/prep';
import { MPHASIS_BANK } from '../src/data/companyTests/mphasis';

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, note = '') {
  if (cond) { pass++; console.log(`  ok   ${name}`); } else { fail++; console.log(`  FAIL ${name} ${note}`); }
}

const db: any = { companies: [], skills: [], topics: [], questions: [], assessments: [] };
seedCompanyProfiles(db, false, ['mphasis-freshers']);
const c = db.companies.find((x: any) => x.slug === 'mphasis-freshers');
check('profile seeded and published', c?.status === 'published');
check('4 rounds: OA, coding, technical, HR', c.rounds_pipeline.map((r: any) => r.round_type).join(',') === 'OA,Coding,Technical,HR');
check('pattern stamped with its own date', c.rounds_pipeline[0].pattern_checked_at === '2026-11-02');
check('CTC is not stamped verified (still one third-party source)', !c.metric_sources.ctc && !!c.metric_sources.rounds);
check('6 test parts incl. SVAR', c.profile.oa_pattern.length === 6 && /SVAR/.test(c.profile.oa_pattern[5].section));

const topics = availableTopics(c);
for (const t of ['exam-pattern', 'syllabus', 'interview-questions', 'hr-interview', 'hiring-process', 'salary-eligibility']) {
  check(`guide page: ${t}`, topics.includes(t as any));
}
check('no prep-plan page before content', !topics.includes('prep-plan'));

const ex = buildGuide(c, 'exam-pattern')!;
const table = ex.sections[0].table!;
check('exam table has time and difficulty columns', table.head.join('|') === 'Section|Questions|Time|Difficulty');
check('quant row from the document', table.rows[0].join('|') === 'Quantitative Aptitude|20–25|35 min|Medium');
check('total time excludes the optional coding part', /about 135 minutes/.test(JSON.stringify(ex.sections[1])), JSON.stringify(ex.sections[1]));
const syl = buildGuide(c, 'syllabus')!;
check('syllabus lists all 6 parts', syl.sections.length >= 6 && syl.sections[0].heading === 'Quantitative Aptitude');
check('syllabus has the PDF subtopics', JSON.stringify(syl).includes('remainder theorem'));

// Content slots stay off while empty.
check('bank is empty for now', MPHASIS_BANK.length === 0);
check('no prep plan registered yet', !PREP_COMPANIES['mphasis-freshers']);
check('no half-empty mock is created', seedCompanyTest(db, 'mphasis') === 0 && !db.skills.length);
check('no empty sectional tests', seedSectionalTests(db, 'mphasis') === 0);
check('no empty interview modules', seedInterviewPrep(db) === 0 && (c.modules || []).length === 0);

// A live database with an old Mphasis draft gets the new profile once.
const live: any = { companies: [{ id: 'comp-9', slug: 'mphasis-freshers', status: 'draft', name: 'old', modules: [{ id: 'keep' }] }], skills: [], topics: [], questions: [], assessments: [], company_focus_applied: 'x', company_focus_v2: 'x', feed_v3_seeded: 'x', feed_v3_1: 'x' };
seedMissing3T(live);
const m = live.companies.find((x: any) => x.slug === 'mphasis-freshers');
check('old draft is refreshed and published', m.status === 'published' && m.name.startsWith('Mphasis'));
check('its modules are kept', m.modules.length === 1 && m.modules[0].id === 'keep');
m.name = 'Admin edit';
seedMissing3T(live);
check('refresh runs only once (admin edits stay)', m.name === 'Admin edit');

// Infosys is unchanged.
const idb: any = { companies: [], skills: [], topics: [], questions: [], assessments: [] };
seedCompanyProfiles(idb, false, ['infosys-systems-engineer']);
seedInterviewPrep(idb);
const inf = idb.companies[0];
check('Infosys keeps its 3 prep modules', inf.modules.length === 3);
check('Infosys lessons still get practice questions', inf.modules[0].items.some((it: any) => it.lesson?.practice?.length >= 3));
check('Infosys mock still builds', seedCompanyTest(idb, 'infosys-se') > 0);

console.log(`\nmphasis: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
