import { validateSectionData } from '../src/lib/sectionData';

let pass = 0;
let fail = 0;

function check(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    pass++;
  } else {
    fail++;
    console.log(`FAIL ${name}\n  expected: ${e}\n  actual:   ${a}`);
  }
}

function ok(name: string, condition: boolean) {
  if (condition) {
    pass++;
  } else {
    fail++;
    console.log(`FAIL ${name}`);
  }
}

// --- a well-formed pack survives unchanged ------------------------------------
const good = {
  overview: {
    companyInfo: 'Leading product company.',
    eligibility: 'B.Tech with 60%.',
    salaryBreakdown: '| Component | Amount |\n| --- | --- |\n| Base | 12L |',
    reviews: [{ name: 'Rahul', role: 'SDE-1', rating: 4, text: 'Good process.' }],
  },
  core_subjects: [
    {
      subject: 'DBMS',
      topics: [
        {
          title: 'Normalisation',
          content: 'Explain 3NF.',
          pyqs: [{ year: 2023, question: 'What is 3NF?', answer: 'No transitive dependency.', frequency: 'High' }],
        },
      ],
    },
  ],
  interview_questions: [
    { category: 'Coding', title: 'Two Sum', question: 'Given array...', solution: 'Hash map.', code: 'def f(): pass', language: 'python' },
  ],
  cheatsheets: [{ title: 'Ports', summary: 'Common ports', content: '22  SSH\n80  HTTP' }],
  never_skip_topics: [{ topic: 'B Trees', priority: 'High', notes: 'Asked every time.' }],
  last_minute_revision: [{ title: 'Day 1', points: ['Revise graphs', 'Solve 5 PYQs'] }],
  hr_round: [{ question: 'Why us?', answer: 'Because...', tips: ['Be specific', 'Name the product'] }],
};
{
  const { data, warnings } = validateSectionData(good);
  check('a valid pack is preserved exactly', data, good);
  check('a valid pack produces no warnings', warnings, []);
}

// --- non-objects must not become "[object Object]" ---------------------------
{
  const { data } = validateSectionData({
    overview: { companyInfo: { evil: true }, eligibility: ['a'], salaryBreakdown: null },
  });
  const ov = data.overview as any;
  check('object value becomes empty string', ov.companyInfo, '');
  check('array value becomes empty string', ov.eligibility, '');
  check('null value becomes empty string', ov.salaryBreakdown, '');
}

{
  const { data } = validateSectionData('just a string');
  const ov = data.overview as any;
  check('a bare string body yields empty strings', ov.companyInfo, '');
  check('a bare string body still returns all 7 sections', Object.keys(data).length, 7);
}

{
  const { data } = validateSectionData({ core_subjects: 'not a list', interview_questions: 42 });
  check('a non-list core_subjects becomes an empty list', data.core_subjects, []);
  check('a numeric interview_questions becomes an empty list', data.interview_questions, []);
}

// --- unknown keys are dropped ------------------------------------------------
{
  const { data, warnings } = validateSectionData({ overview: { companyInfo: 'x', secret: 'y' }, hackerKey: 1 });
  ok('unknown top-level key is not stored', !('hackerKey' in data));
  ok('unknown overview key is not stored', !('secret' in (data.overview as any)));
  ok('unknown top-level key is reported', warnings.some((w) => w.includes('hackerKey')));
}

// --- prototype pollution must not survive -----------------------------------
{
  const { data } = validateSectionData(JSON.parse('{"__proto__": {"polluted": true}, "overview": {"companyInfo": "x"}}'));
  // `in` also matches the prototype chain, so check own keys specifically.
  ok('__proto__ key is not an own key of the result', !Object.prototype.hasOwnProperty.call(data, '__proto__'));
  ok('Object.prototype is untouched', ({} as any).polluted === undefined);
}

// --- enums are clamped to allowed values -------------------------------------
{
  const { data } = validateSectionData({
    interview_questions: [{ category: 'Not A Category', title: 't', question: 'q', solution: 's' }],
    never_skip_topics: [{ topic: 't', priority: 'Whenever', notes: 'n' }],
    core_subjects: [{ subject: 'S', topics: [{ title: 't', content: 'c', pyqs: [{ year: 2020, question: 'q', answer: 'a', frequency: 'Sideways' }] }] }],
  });
  check('bad question category falls back', (data.interview_questions as any[])[0].category, 'Technical');
  check('bad priority falls back', (data.never_skip_topics as any[])[0].priority, 'High');
  check('bad frequency falls back', (data.core_subjects as any[])[0].topics[0].pyqs[0].frequency, 'Medium');
}

{
  const { data } = validateSectionData({ overview: { reviews: [{ name: 'n', role: 'r', rating: 99, text: 't' }] } });
  check('rating is clamped to 5', (data.overview as any).reviews[0].rating, 5);
}
{
  const { data } = validateSectionData({ overview: { reviews: [{ name: 'n', role: 'r', rating: -4, text: 't' }] } });
  check('rating is clamped to 1', (data.overview as any).reviews[0].rating, 1);
}
{
  const { data } = validateSectionData({ overview: { reviews: [{ name: 'n', role: 'r', rating: 'not a number', text: 't' }] } });
  check('non-numeric rating falls back', (data.overview as any).reviews[0].rating, 5);
}

// --- size caps ---------------------------------------------------------------
{
  const { data } = validateSectionData({ overview: { companyInfo: 'x'.repeat(50000) } });
  ok('long text is truncated', (data.overview as any).companyInfo.length <= 20000);
}
{
  const many = Array.from({ length: 900 }, (_, i) => ({ category: 'Technical', title: `t${i}`, question: 'q', solution: 's' }));
  const { data } = validateSectionData({ interview_questions: many });
  check('item count is capped', (data.interview_questions as any[]).length, 500);
}
{
  const points = Array.from({ length: 400 }, (_, i) => `point ${i}`);
  const { data } = validateSectionData({ last_minute_revision: [{ title: 'T', points }] });
  check('points are capped', (data.last_minute_revision as any[])[0].points.length, 100);
}
{
  const { data } = validateSectionData({ hr_round: [{ question: 'q', answer: 'a', tips: ['  ', 'real tip', 42] }] });
  check('blank points are dropped and numbers kept as text', (data.hr_round as any[])[0].tips, ['real tip', '42']);
}

// --- control characters and line endings --------------------------------------
{
  const { data } = validateSectionData({ overview: { companyInfo: 'a\r\nb\rc\u0000d\te' } });
  check('CRLF and lone CR become LF, C0 removed, tab kept', (data.overview as any).companyInfo, 'a\nb\ncd\te');
}

// --- cheatsheet alignment must survive byte for byte -------------------------
{
  const aligned = 'ALGO      TIME\nBinary    O(n)\nMerge     O(n log n)';
  const { data } = validateSectionData({ cheatsheets: [{ title: 't', summary: 's', content: aligned }] });
  check('preformatted cheatsheet alignment is preserved', (data.cheatsheets as any[])[0].content, aligned);
}

// --- idempotency: validating our own output changes nothing -------------------
{
  const once = validateSectionData(good).data;
  const twice = validateSectionData(once);
  check('validating an already-valid pack is a no-op', twice.data, once);
  check('re-validating produces no warnings', twice.warnings, []);
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
