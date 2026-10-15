// ============================================================================
// Assessment / reward config validator.
//
// The exam bank, capstone project and perks live on the course definition. A
// malformed bank is invisible until a learner sits the exam and an unmarkable
// attempt appears, and a Premium course that promises a project it does not
// carry makes the certificate gate unenforceable. These cases pin the exact
// failures the validator must catch before any of that reaches a student.
// ============================================================================

import { validateCourseAssessment, validateCourseModules, MIN_EXAM_BANK } from './course-validate';
import type { CourseModule, ExamQuestion } from '../src/data/db';

let pass = 0;
let fail = 0;

function check(name: string, actual: unknown, expected: unknown) {
  if (actual === expected) {
    pass++;
  } else {
    fail++;
    console.log(`FAIL ${name}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
  }
}

function checkTrue(name: string, cond: boolean) {
  check(name, cond, true);
}

function q(over: Partial<ExamQuestion> = {}): ExamQuestion {
  return {
    id: 'q1',
    prompt: 'What is 2 + 2?',
    options: ['3', '4', '5', '6'],
    correct_index: 1,
    explanation: 'Four.',
    difficulty: 'easy',
    ...over,
  };
}

/** A compliant bank: MIN_EXAM_BANK questions covering all three difficulties. */
function goodBank(): ExamQuestion[] {
  const diffs: ExamQuestion['difficulty'][] = ['easy', 'medium', 'hard'];
  return Array.from({ length: MIN_EXAM_BANK }, (_, i) =>
    q({ id: `q${i + 1}`, difficulty: diffs[i % diffs.length] })
  );
}

function goodExam(over: Record<string, unknown> = {}) {
  return {
    question_count: 20,
    duration_minutes: 30,
    passing_percent: 60,
    retake_cooldown_hours: 24,
    distinction_percent: 85,
    bank: goodBank(),
    ...over,
  } as any;
}

// ---- happy path ------------------------------------------------------------

check('a course with no assessment config validates clean', validateCourseAssessment('[x]', {}).length, 0);

const clean = validateCourseAssessment('[x]', {
  branch: 'cse',
  bucket: 'B',
  certificate_tier: 'professional',
  exam: goodExam(),
  perks: [{ key: 'certificate', label: 'Verified certificate' }],
});
check('a fully configured course validates clean', clean.length, 0);

// ---- exam bank -------------------------------------------------------------

const short = validateCourseAssessment('[x]', { exam: goodExam({ bank: goodBank().slice(0, 5) }) });
checkTrue('a bank below the minimum is reported', short.some((e) => e.includes(`at least ${MIN_EXAM_BANK}`)));

const badKey = validateCourseAssessment('[x]', {
  exam: goodExam({ bank: [q({ correct_index: 9 }), ...goodBank().slice(1)] }),
});
checkTrue('an out-of-range correct_index is reported', badKey.some((e) => e.includes('correct_index')));

const oneOption = validateCourseAssessment('[x]', {
  exam: goodExam({ bank: [q({ options: ['only'] }), ...goodBank().slice(1)] }),
});
checkTrue('a question with under two options is reported', oneOption.some((e) => e.includes('at least 2 options')));

const noDiff = validateCourseAssessment('[x]', {
  exam: goodExam({ bank: goodBank().map((x) => ({ ...x, difficulty: 'easy' as const })) }),
});
checkTrue('a bank missing the difficulty mix is reported', noDiff.some((e) => e.includes('bank is tagged')));

const dupIds = validateCourseAssessment('[x]', {
  exam: goodExam({ bank: goodBank().map((x) => ({ ...x, id: 'same' })) }),
});
checkTrue('duplicate bank ids are reported', dupIds.some((e) => e.includes('duplicate id')));

const tooMany = validateCourseAssessment('[x]', { exam: goodExam({ question_count: 999 }) });
checkTrue('question_count above the bank is reported', tooMany.some((e) => e.includes('question_count')));

const distinctionBelow = validateCourseAssessment('[x]', {
  exam: goodExam({ passing_percent: 70, distinction_percent: 60 }),
});
checkTrue('Distinction below the pass mark is reported', distinctionBelow.some((e) => e.includes('Distinction')));

// ---- certificate gating ----------------------------------------------------

const premiumNoProject = validateCourseAssessment('[x]', { certificate_tier: 'premium', exam: goodExam() });
checkTrue('a Premium certificate without a required project is reported', premiumNoProject.some((e) => e.includes('project')));

const premiumProject = validateCourseAssessment('[x]', {
  certificate_tier: 'premium',
  exam: goodExam(),
  project: { title: 'Capstone', brief: 'Build a thing.', required_for_certificate: true },
});
check('a Premium course with a required project validates clean', premiumProject.length, 0);

// ---- perks / exam-prep / dimensions ----------------------------------------

const dupPerks = validateCourseAssessment('[x]', {
  perks: [{ key: 'certificate', label: 'A' }, { key: 'certificate', label: 'B' }],
});
checkTrue('a duplicate perk key is reported', dupPerks.some((e) => e.includes('duplicate key')));

const badBranch = validateCourseAssessment('[x]', { branch: 'nonsense' });
checkTrue('an unknown branch is reported', badBranch.some((e) => e.includes('unknown branch')));

const badPrep = validateCourseAssessment('[x]', { exam_prep: { units: [{ title: '', questions: [] }] } });
checkTrue('an exam-prep unit with no title is reported', badPrep.some((e) => e.includes('exam_prep unit 1')));

// ---- module tests ----------------------------------------------------------
// The end-of-module test is validated by `validateCourseModules`, not
// `validateCourseAssessment` — it lives on the module, not the course.

function validModule(over: Partial<CourseModule> = {}): CourseModule {
  return {
    id: 'm1',
    course_id: 'c1',
    title: 'Module one',
    summary: '',
    sort_order: 1,
    lessons: [
      {
        id: 'l1',
        module_id: 'm1',
        title: 'Lesson one',
        summary: '',
        sort_order: 1,
        duration_minutes: 10,
        xp_reward: 25,
        blocks: [
          { id: 'b1', block_type: 'markdown', block_order: 1, payload: { text: 'Hello world, some prose.' } },
        ],
        video: null,
        quiz: null,
      } as any,
    ],
    ...over,
  } as CourseModule;
}

function goodTestBank(): ExamQuestion[] {
  return [
    { id: 't1', prompt: 'One?', options: ['a', 'b'], correct_index: 1, explanation: 'b', difficulty: 'easy' },
    { id: 't2', prompt: 'Two?', options: ['a', 'b'], correct_index: 0, explanation: 'a', difficulty: 'medium' },
    { id: 't3', prompt: 'Three?', options: ['a', 'b'], correct_index: 1, explanation: 'b', difficulty: 'hard' },
  ] as ExamQuestion[];
}

const noTest = validateCourseModules('[x]', [validModule()]);
check('a module with no test validates clean', noTest.filter((e) => e.includes('test')).length, 0);

const goodTest = validateCourseModules('[x]', [
  validModule({ test: { question_count: 2, passing_percent: 60, retake_cooldown_hours: 0, bank: goodTestBank() } }),
]);
check('a well-formed module test validates clean', goodTest.filter((e) => e.includes('test')).length, 0);

const emptyTestBank = validateCourseModules('[x]', [
  validModule({ test: { question_count: 1, passing_percent: 60, retake_cooldown_hours: 0, bank: [] } }),
]);
checkTrue('an empty module-test bank is reported', emptyTestBank.some((e) => e.includes('no questions in bank')));

const oversizedDraw = validateCourseModules('[x]', [
  validModule({ test: { question_count: 10, passing_percent: 60, retake_cooldown_hours: 0, bank: goodTestBank() } }),
]);
checkTrue('a draw larger than the module-test bank is reported', oversizedDraw.some((e) => e.includes('exceeds bank')));

const badTestKey = validateCourseModules('[x]', [
  validModule({
    test: { question_count: 1, passing_percent: 60, retake_cooldown_hours: 0, bank: [q({ correct_index: 9 }) as ExamQuestion] },
  }),
]);
checkTrue('an out-of-range key in a module test is reported', badTestKey.some((e) => e.includes('correct_index')));

const dupTestIds = validateCourseModules('[x]', [
  validModule({
    test: {
      question_count: 1,
      passing_percent: 60,
      retake_cooldown_hours: 0,
      bank: goodTestBank().map((x) => ({ ...x, id: 'same' })),
    },
  }),
]);
checkTrue('duplicate module-test question ids are reported', dupTestIds.some((e) => e.includes('duplicate question id')));

const badTestPass = validateCourseModules('[x]', [
  validModule({ test: { question_count: 1, passing_percent: 0, retake_cooldown_hours: 0, bank: goodTestBank() } }),
]);
checkTrue('a module-test pass mark outside 1..100 is reported', badTestPass.some((e) => e.includes('passing_percent')));

console.log(`\nassessment-validate: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
