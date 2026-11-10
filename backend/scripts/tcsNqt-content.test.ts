/**
 * TCS NQT with content: fills the empty slots with dummy content BEFORE the
 * seeders load (they read the arrays at import), then checks that the mock,
 * the coding section, the modules, the page and the prep plan switch on.
 */
/* eslint-disable @typescript-eslint/no-var-requires */
import { TCS_NQT_BANK } from '../src/data/companyTests/tcsNqt';
import { TCS_NQT_CODING } from '../src/data/companyTests/tcsNqtCoding';
import { TCS_NQT_LESSONS } from '../src/data/interviewPrep/tcsNqtLessons';
import { TCS_NQT_TECHNICAL, TCS_NQT_MANAGERIAL, TCS_NQT_HR } from '../src/data/interviewPrep/tcsNqt';

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, note = '') {
  if (cond) { pass++; console.log(`  ok   ${name}`); } else { fail++; console.log(`  FAIL ${name} ${note}`); }
}

for (const topic of ['numerical', 'verbal', 'reasoning', 'advanced']) {
  for (let i = 1; i <= 30; i++) {
    TCS_NQT_BANK.push({ source: 'Test fixture', topic, difficulty: 'medium', question: `${topic} question ${i}?`, options: ['A', 'B', 'C', 'D'], correct: i % 4, explanation: 'Because.', code: false });
  }
}
const FIRST = TCS_NQT_CODING[0];
TCS_NQT_LESSONS.push(['Numerical', 'Percentages', ['Rule'], 'Example', 'Trap'], ['Coding', 'Two pointers', ['Rule'], 'Example', 'Trap']);
TCS_NQT_TECHNICAL.push(['What is OOP?', 'easy', 'high', ['Classes'], 'Answer', 'Follow-up']);
TCS_NQT_MANAGERIAL.push(['Tell me about a conflict.', 'medium', 'high', ['STAR'], 'Answer', 'Follow-up']);
TCS_NQT_HR.push(['Are you open to relocation?', 'easy', 'high', ['Yes'], 'Answer', 'Follow-up']);

const { seedCompanyProfiles, seedInterviewPrep, seedCompanyTest, seedSectionalTests } = require('../src/lib/seed3T');
const { PREP_COMPANIES, buildPrep } = require('../src/lib/prep');
const { derivePageContent } = require('../src/lib/companyPageDerive');
const { availableTopics, buildGuide } = require('../src/lib/companyGuide');

const db: any = { companies: [], skills: [], topics: [], questions: [], assessments: [], attempts: [] };
seedCompanyProfiles(db, false, ['tcs-nqt']);
const c = db.companies[0];

check('full mock built (80 MCQs)', seedCompanyTest(db, 'tcs-nqt') === 120);
const mock = db.skills.find((s: any) => s.slug === 'tcs-nqt-full-mock');
const asm = db.assessments.find((a: any) => a.skillId === mock.id);
check('mock: 190 minutes with coding', asm.durationMinutes === 190 && mock.avgCompletionTime === 190 && mock.has_coding === true);
check('mock: 4 MCQ sections in the paper order', asm.sections.map((s: any) => s.count).join(',') === '20,25,20,15');
check('mock: coding section with the whole pool', asm.coding.count === 2 && asm.coding.minutes === 90 && asm.coding.problems.length === TCS_NQT_CODING.length);
check('mock: no hints, solutions or tests reach the test page', !/"(solutions|hints|approach|tests)"/.test(JSON.stringify(asm.coding)));
check('mock: solution link opens the Train item', asm.coding.problems[0].solution_href === `/company/tcs-nqt?m=mod-prep-tcs-nqt-coding&q=mod-prep-tcs-nqt-coding-${FIRST.id}`);
check('4 sectional tests', seedSectionalTests(db, 'tcs-nqt') === 4);
const hash = mock.bank_hash;
const oldTitle = FIRST.title;
FIRST.title = oldTitle + ' (edited)';
seedCompanyTest(db, 'tcs-nqt', true);
check('an edited coding problem reaches a live database', mock.bank_hash !== hash && asm.coding.problems[0].title === oldTitle + ' (edited)');
FIRST.title = oldTitle;

check('5 modules', seedInterviewPrep(db) === 5 && c.modules.length === 5);
const coding = c.modules.find((m: any) => m.id === 'mod-prep-tcs-nqt-coding');
check('coding module: pack-gated, outside the price ladder', coding.pack_gated === true && coding.is_premium === false);
check('coding items keep their problem id', coding.items[0].id === `mod-prep-tcs-nqt-coding-${FIRST.id}`);
const md = coding.items[0].blocks[0].payload.text as string;
check('coding item: title line first, then samples and solutions', md.split('\n')[0].startsWith(`**${FIRST.title}**`) && md.includes(`](/practice/problem/${FIRST.id}?company=tcs-nqt)`) && md.includes('**Sample 2**') && md.includes('**Solution · C++**') && md.includes('```python') && !md.includes('"sample"'));
check('3 paid interview modules (pack = ₹219 on the ladder)', c.modules.filter((m: any) => m.is_premium).length === 3);
const lessons = c.modules.find((m: any) => m.id === 'mod-prep-tcs-nqt-oa');
check('coding lessons get no aptitude practice questions', lessons.items[1].lesson.practice.length === 0 && lessons.items[0].lesson.practice.length >= 3);

const page = derivePageContent(db, c);
const st = page.sections.find((s: any) => s.type === 'rounds_route').data.stations as any[];
check('Part A station: the full mock', st[0].test_href === '/practice/test/tcs-nqt-full-mock');
check('Part B station: coding module and the mock', st[1].module_ids.includes('mod-prep-tcs-nqt-coding') && st[1].test_href === '/practice/test/tcs-nqt-full-mock', JSON.stringify(st[1].module_ids));
check('Managerial station has its module', st[3].module_ids.includes('mod-prep-tcs-nqt-managerial'));
check('HR station has only the HR module', st[4].module_ids.join() === 'mod-prep-tcs-nqt-hr', JSON.stringify(st[4].module_ids));

check('prep plan registered', !!PREP_COMPANIES['tcs-nqt']);
check('prep-plan guide page appears', availableTopics(c).includes('prep-plan'));
check('prep-plan guide shows "2 problems" for coding', JSON.stringify(buildGuide(c, 'prep-plan')).includes('2 problems'));

// Coding self-marks feed the coding section score (solved 100, partly 50).
db.attempts.push({ id: 'att1', userId: 'u1', assessmentId: asm.id, status: 'submitted', submittedAt: new Date().toISOString(), score: 70, topicPerformance: [], coding_self: [{ id: 'tcs-c-001', status: 'solved' }, { id: 'tcs-c-002', status: 'partial' }] });
const prep = buildPrep(db, 'u1', 'tcs-nqt', true);
const cs = prep.sections.find((s: any) => s.key === 'coding');
check('coding score from self-marks', cs.score === 75, JSON.stringify(cs));
check('coding lessons count toward coding', cs.lessons_total === 1);
check('no empty "coding test" step in the plan', !prep.plan.some((d: any) => d.items.some((it: any) => it.kind === 'sectional' && !it.ref)));
check('mock step names the coding round', prep.plan.some((d: any) => d.items.some((it: any) => it.kind === 'mock' && /80 Qs \+ coding/.test(it.title))));

console.log(`\ntcs-nqt content: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
