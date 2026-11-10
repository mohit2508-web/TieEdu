/**
 * Practice bank and access (PRACTICE_MODE_PLAN.md §4–5): topics cover every
 * problem, the free core is ~40 easy problems, and the access matrix holds for
 * guests, free users, pack owners and members.
 */
import { BANK, COMPANY_SETS, DSA_TOPICS, FREE_CORE } from '../src/lib/practice/bank';
import { accessChecker, progressFor, statusOf } from '../src/lib/practice/access';
import { seedCompanyProfiles, seedInterviewPrep } from '../src/lib/seed3T';

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, note = '') {
  if (cond) { pass++; console.log(`  ok   ${name}`); } else { fail++; console.log(`  FAIL ${name} ${note}`); }
}

check('every problem has a DSA topic from the sheet', BANK.every((p) => DSA_TOPICS.some((t) => t.key === p.topic_key)));
check('every problem is tagged with at least one company', BANK.every((p) => p.companies.length > 0));
check('free core: 1–40 problems, all easy', FREE_CORE.size > 0 && FREE_CORE.size <= 40 && [...FREE_CORE].every((id) => BANK.find((p) => p.id === id)!.difficulty === 'easy'), String(FREE_CORE.size));
const tcs = COMPANY_SETS.find((s) => s.slug === 'tcs-nqt')!;
check('TCS set covers all 65 problems once, in 6 levels', tcs.levels.length === 6 && new Set(tcs.levels.flatMap((l) => l.ids)).size === 65);

const db: any = { companies: [], skills: [], topics: [], questions: [], assessments: [], attempts: [], users: [{ id: 'u1', role: 'student' }, { id: 'u2', role: 'student' }, { id: 'adm', role: 'admin' }], unlocks: [], code_submissions: [] };
seedCompanyProfiles(db, false, ['tcs-nqt']);
seedInterviewPrep(db);
const company = db.companies[0];

const locked = BANK.find((p) => !FREE_CORE.has(p.id) && !tcs.free_ids.includes(p.id))!;
const core = BANK.find((p) => FREE_CORE.has(p.id) && !tcs.free_ids.includes(p.id))!;
const preview = BANK.find((p) => tcs.free_ids.includes(p.id))!;

const guest = accessChecker(db, undefined);
check('guest: free core is open', guest(core).open && guest(core).reason === 'free');
check('guest: company free problem is open', guest(preview).open);
check('guest: other problems are locked, naming the pack', !guest(locked).open && guest(locked).company?.slug === 'tcs-nqt');

const free = accessChecker(db, 'u1');
check('signed-in without a pack: locked', !free(locked).open && free(locked).reason === 'locked');

db.unlocks.push({ user_id: 'u1', company_id: company.id, status: 'active' });
const owner = accessChecker(db, 'u1');
check('pack owner: open, reason pack', owner(locked).open && owner(locked).reason === 'pack');
check('another student is still locked', !accessChecker(db, 'u2')(locked).open);
check('admin: open', accessChecker(db, 'adm')(locked).open);

db.code_submissions.push(
  { user_id: 'u2', problem_id: core.id, verdict: 'wrong_answer', passed: 3, total: 10, at: '2026-11-10T10:00:00Z' },
  { user_id: 'u2', problem_id: core.id, verdict: 'accepted', passed: 10, total: 10, at: '2026-11-10T11:00:00Z' },
  { user_id: 'u2', problem_id: preview.id, verdict: 'runtime_error', passed: 0, total: 9, at: '2026-11-10T12:00:00Z' },
);
const prog = progressFor(db, 'u2');
check('progress: solved after an accepted submission', statusOf(prog.get(core.id)) === 'solved' && prog.get(core.id)!.submissions === 2 && prog.get(core.id)!.best_passed === 10);
check('progress: attempted when nothing passed yet', statusOf(prog.get(preview.id)) === 'attempted');
check('progress: untouched problems are todo', statusOf(prog.get(locked.id)) === 'todo');
check('progress is per student', progressFor(db, 'u1').size === 0);

console.log(`\npractice: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
