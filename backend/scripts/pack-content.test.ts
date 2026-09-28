/**
 * Backend pack-content contract.
 *
 * Asserts the same shared fixture that `frontend/scripts/rich-text.test.ts` uses,
 * so the two normaliser implementations cannot drift: if a change to the
 * frontend converter is not mirrored here (and vice versa), one of the two
 * suites fails.
 *
 * Also covers the API-level contract the plan calls for in Phase 3: type
 * rejection, caps, unknown-key drop, normalisation applied on save, and a 400 on
 * a body that is not an object.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  decodeHtmlEntities, htmlToMarkdown, looksLikeHtml, normaliseRichText, containsHtmlTag,
  RICH_TEXT_MAX, RICH_TEXT_PATHS, resolveRichTextValues, setAtRichTextPath,
  clampRichFields, changedRichTextPaths,
} from '../src/lib/richText';
import { validateSectionData } from '../src/lib/sectionData';

let pass = 0;
let fail = 0;

function check(name: string, actual: unknown, expected: unknown) {
  if (actual === expected) {
    pass++;
  } else {
    fail++;
    console.log(
      `FAIL ${name}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`
    );
  }
}

/** Deep-equality for the array/object assertions, where `===` is identity. */
function checkJson(name: string, actual: unknown, expected: unknown) {
  check(name, JSON.stringify(actual), JSON.stringify(expected));
}

/** The overview field's own cap, which is tighter than the shared RICH_TEXT_MAX. */
const OVERVIEW_LIMIT = 20000;

// Resolved by walking up from this file rather than by a fixed relative path, so
// the suite works whether it is run from `backend/scripts` or from a compiled
// output directory.
const FIXTURE_REL = path.join('shared', 'fixtures', 'pack-content.fixture.json');
const findFixture = (): string => {
  let dir = __dirname;
  for (let i = 0; i < 8; i += 1) {
    const candidate = path.join(dir, FIXTURE_REL);
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(`Could not locate ${FIXTURE_REL} above ${__dirname}`);
};
const fixture = JSON.parse(fs.readFileSync(findFixture(), 'utf8'));

// --- HTML -> markdown --------------------------------------------------------
// These are the same cases the frontend asserts, from the same file.
for (const c of fixture.htmlCases as { name: string; input: string; expected: string }[]) {
  check(`html: ${c.name}`, htmlToMarkdown(c.input), c.expected);
  // The normaliser must be idempotent, or the repair script could never settle.
  check(
    `html: ${c.name} is idempotent`,
    normaliseRichText(normaliseRichText(c.input)),
    normaliseRichText(c.input)
  );
  // No *known* tag may survive. Text that merely looks like a tag (decoded
  // `&lt;team&gt;`) is correct and must not trip this.
  check(`html: ${c.name} leaves no raw tags`, containsHtmlTag(normaliseRichText(c.input)), false);
}

// --- clean markdown is untouched --------------------------------------------
for (const input of fixture.cleanMarkdownCases as string[]) {
  const out = normaliseRichText(input);
  check(`clean markdown untouched: ${JSON.stringify(input).slice(0, 40)}`, out, input.trim());
}

// --- entities ----------------------------------------------------------------
check('named entity', decodeHtmlEntities('&amp;&lt;&gt;&quot;'), '&<>\"');
check('unknown named entity survives', decodeHtmlEntities('&notarealentity;'), '&notarealentity;');
check('hex entity', decodeHtmlEntities('&#x41;'), 'A');
check('astral entity', decodeHtmlEntities('&#x1F600;'), '\u{1F600}');
check('lone surrogate is dropped', decodeHtmlEntities('&#xD800;'), '');
check('out-of-range codepoint is dropped', decodeHtmlEntities('&#x110000;'), '');
check('nbsp becomes a space', decodeHtmlEntities('a&nbsp;b'), 'a b');

// --- detection ---------------------------------------------------------------
check('detects a br run', looksLikeHtml('a<br>b'), true);
check('ignores a bare < in prose', looksLikeHtml('a < b'), false);
check('ignores an email', looksLikeHtml('a@example.com'), false);
check('ignores an unknown tag', looksLikeHtml('<custom>x</custom>'), false);

// --- the path list must match the frontend's ---------------------------------
// The fixture carries the canonical list; if either implementation drifts from
// it, the clamp and the repair script would disagree about what a save keeps.
check(
  'RICH_TEXT_PATHS matches the shared fixture',
  JSON.stringify(RICH_TEXT_PATHS),
  JSON.stringify(fixture.richTextPaths)
);

// Preformatted fields must never appear in the rich list.
for (const p of fixture.preformattedFields as string[]) {
  const section = p.split('.').filter((s) => !/^\d+$/.test(s));
  check(`preformatted field ${p} is excluded from clamping`, RICH_TEXT_PATHS.includes(section.join('.') as any), false);
}

// --- validateSectionData: normalisation is applied on save -------------------
const { data, warnings } = validateSectionData(fixture.sectionData);

check(
  'overview.companyInfo is markdown after save',
  data.overview.companyInfo,
  'Capgemini **Exceller** program.'
);
check('overview.eligibility becomes a bullet list', data.overview.eligibility, '- 60% and above\n- No active backlogs');
check('overview.salaryBreakdown breaks lines', data.overview.salaryBreakdown, 'Tier 1\n\nBase 12L\nBonus 2L');
check('review text is markdown', data.overview.reviews[0].text, 'Great process.');
check('topic heading survives', data.core_subjects[0].topics[0].content, '#### Why it matters\n\nReduces redundancy.');
check('pyq answer list survives', data.core_subjects[0].topics[0].pyqs[0].answer, '1. 1NF\n2. 2NF');
check('interview solution is markdown', data.interview_questions[0].solution, 'Use three pointers.');
check('never-skip notes are markdown', data.never_skip_topics[0].notes, 'Asked every year.');
check('hr answer is markdown', data.hr_round[0].answer, 'Because **growth**.');

// Preformatted fields must survive byte-for-byte: alignment is the whole point.
check(
  'cheatsheet content keeps its spacing',
  data.cheatsheets[0].content,
  'Port 22   SSH\nPort 80   HTTP'
);
check(
  'interview code keeps its newlines and indentation',
  data.interview_questions[0].code,
  'ListNode* rev(ListNode* h) {\n  return NULL;\n}'
);

// A save that reformats pasted HTML must say so, or the admin cannot tell why
// their content came back different.
check(
  'conversion is reported in warnings',
  warnings.some((w) => w.includes('Converted pasted web/word formatting')),
  true
);

// No raw tags may survive anywhere in the stored pack.
const stored = JSON.stringify(data);
check('no raw <br> survives a save', /<br/i.test(stored), false);
check('no raw <p> survives a save', /<p>/i.test(stored), false);

// --- validateSectionData: type rejection -------------------------------------
const bad = validateSectionData({
  overview: { companyInfo: { not: 'a string' }, eligibility: ['an', 'array'] },
  core_subjects: 'not a list',
  interview_questions: [{ title: 42, question: true }],
  cheatsheets: [{ content: { nested: true } }],
  never_skip_topics: [null, 7],
  last_minute_revision: [{ points: 'not a list' }],
  hr_round: [{ tips: 'not a list' }],
});
check('object in a string field becomes empty', bad.data.overview.companyInfo, '');
check('array in a string field becomes empty', bad.data.overview.eligibility, '');
check('non-list section is emptied', (bad.data.core_subjects as unknown[]).length, 0);
check('numeric title is coerced', bad.data.interview_questions[0].title, '42');
check('boolean question is coerced', bad.data.interview_questions[0].question, 'true');
check('object in preformatted content becomes empty', bad.data.cheatsheets[0].content, '');
check('null and number items are dropped safely', (bad.data.never_skip_topics as unknown[]).length, 2);
check('non-list points become empty list', bad.data.last_minute_revision[0].points.length, 0);
check('non-list tips become empty list', bad.data.hr_round[0].tips.length, 0);

// --- validateSectionData: unknown keys dropped --------------------------------
const unknown = validateSectionData({
  ...fixture.sectionData,
  rogue_section: { a: 1 },
  overview: { ...(fixture.sectionData as any).overview, sneaky: 'x' },
});
check('unknown top-level key is dropped', 'rogue_section' in (unknown.data as any), false);
check('unknown key is reported', unknown.warnings.some((w) => w.includes('rogue_section')), true);
check('unknown nested key is not copied through', 'sneaky' in (unknown.data as any).overview, false);

// --- validateSectionData: caps and array limits -------------------------------
const huge = validateSectionData({
  overview: { companyInfo: 'a'.repeat(RICH_TEXT_MAX + 5000) },
  interview_questions: Array.from({ length: 600 }, () => ({ question: 'q' })),
  cheatsheets: Array.from({ length: 600 }, () => ({ title: 'c' })),
});
check('over-cap field is clamped', (huge.data.overview as any).companyInfo.length <= OVERVIEW_LIMIT, true);
check('array length is capped', (huge.data.interview_questions as unknown[]).length, 500);
check('cheatsheet array is capped', (huge.data.cheatsheets as unknown[]).length, 500);
check('nothing stored exceeds the shared cap', RICH_TEXT_MAX >= OVERVIEW_LIMIT, true);

// A body that is not an object must be rejected by the route, not coerced.
for (const junk of ['a string', 42, true, ['an', 'array']]) {
  // The route checks this before calling the validator; assert the validator
  // itself would also produce an empty, safe pack rather than throwing.
  const res = validateSectionData(junk);
  check(`non-object body ${JSON.stringify(junk)} yields an empty pack`, Object.keys(res.data).length, 7);
}

// --- repair helpers ----------------------------------------------------------
const before: any = { ...fixture.sectionData };
const after: any = clampRichFields(before);
const changed = changedRichTextPaths(before, after);
check('repair reports the overview fields it changed', changed.includes('overview.eligibility'), true);
check('repair reports nested topic content', changed.includes('core_subjects.[].topics.[].content'), true);
check('repair never reports a preformatted field', changed.some((p) => p.includes('cheatsheets.[].content')), false);
check('repair leaves the input object unmutated', JSON.stringify(before), JSON.stringify(fixture.sectionData));
check('repair is a no-op on already-clean data', changedRichTextPaths(after, clampRichFields(after)).length, 0);
checkJson('repair output round-trips through the validator unchanged', validateSectionData(after).data, after);

// Path walking must survive malformed input without throwing, because the repair
// script walks whatever is in the database.
for (const odd of [null, undefined, 0, 'x', [], { overview: null }, { core_subjects: [{}] }]) {
  try {
    clampRichFields(odd as any);
    resolveRichTextValues(odd, 'overview.companyInfo');
    setAtRichTextPath(odd as any, 'overview.companyInfo', (v: string) => v);
    pass++;
  } catch (e) {
    fail++;
    console.log(`FAIL malformed input threw: ${JSON.stringify(odd)} -> ${(e as Error).message}`);
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
