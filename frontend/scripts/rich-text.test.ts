import * as fs from 'fs';
import * as path from 'path';
import {
  decodeHtmlEntities, htmlToMarkdown, looksLikeHtml, containsHtmlTag, normalizePastedText,
  pipeTextToMarkdownTable, clampRichText, clampRichFields, overLimitRichTextPaths,
  RICH_TEXT_MAX, RICH_TEXT_PATHS,
} from '../src/lib/richText';

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

function same(name: string, input: string) {
  const out = normalizePastedText(input);
  if (out === input.trim()) {
    pass++;
  } else {
    fail++;
    console.log(`FAIL ${name} (expected unchanged)\n  input:  ${JSON.stringify(input)}\n  actual: ${JSON.stringify(out)}`);
  }
}

// --- Shared fixture ----------------------------------------------------------
// The same file is asserted by backend/scripts/pack-content.test.ts. If the two
// normaliser implementations ever diverge, one of the two suites goes red.
//
// Resolved by walking up from this file rather than by a fixed relative path:
// the test runner compiles the suite into `.test-build` and executes it from
// there, so `__dirname` is not the source directory.
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

for (const c of fixture.htmlCases as { name: string; input: string; expected: string }[]) {
  check(`html: ${c.name}`, htmlToMarkdown(c.input), c.expected);
  check(`html: ${c.name} leaves no raw tags`, containsHtmlTag(htmlToMarkdown(c.input)), false);
}
for (const input of fixture.cleanMarkdownCases as string[]) {
  same(`clean markdown untouched: ${JSON.stringify(input).slice(0, 36)}`, input);
}
check(
  'RICH_TEXT_PATHS matches the shared fixture',
  JSON.stringify(RICH_TEXT_PATHS),
  JSON.stringify(fixture.richTextPaths)
);

// --- HTML detection -----------------------------------------------------------
// A markdown or plain-text paste must never be treated as HTML, or pasting
// between two fields would rewrite the author's markdown.
same('markdown paste is left alone', '### Heading\n- a\n**b** `c`');
same('comparison in prose is not html', 'if a < b and c > d then win');
check('detects a p tag', String(looksLikeHtml('<p>hi</p>')), 'true');
check('detects a br tag', String(looksLikeHtml('a<br>b')), 'true');
check('ignores a bare angle bracket', String(looksLikeHtml('a < b')), 'false');
check('ignores an unknown tag', String(looksLikeHtml('<marquee>x</marquee>')), 'false');

// --- HTML to markdown ---------------------------------------------------------
check('bold and italic', htmlToMarkdown('<p>Use <b>ACID</b> and <i>indexes</i>.</p>'), 'Use **ACID** and *indexes*.');
check('strikethrough', htmlToMarkdown('<p><s>old</s> new</p>'), '~~old~~ new');
check('headings', htmlToMarkdown('<h2>Eligibility</h2><h3>CGPA</h3>'), '## Eligibility\n\n### CGPA');
check('unordered list', htmlToMarkdown('<ul><li>Base: 12L</li><li>Bonus: 2L</li></ul>'), '- Base: 12L\n- Bonus: 2L');
// Every item was "1." before: the list was rewritten one <li> at a time, so the
// converter had no way to count. The shared fixture pins the correct numbering.
check('ordered list', htmlToMarkdown('<ol><li>Read</li><li>Write</li></ol>'), '1. Read\n2. Write');
check('ordered list of three', htmlToMarkdown('<ol><li>a</li><li>b</li><li>c</li></ol>'), '1. a\n2. b\n3. c');
check('link', htmlToMarkdown('<a href="https://leetcode.com">LeetCode</a>'), '[LeetCode](https://leetcode.com)');
check('inline code', htmlToMarkdown('<p>Run <code>npm test</code>.</p>'), 'Run `npm test`.');
check('blockquote', htmlToMarkdown('<blockquote>Consistency wins.</blockquote>'), '> Consistency wins.');
check('horizontal rule', htmlToMarkdown('a<hr>b'), 'a\n\n---\n\nb');
check('line breaks', htmlToMarkdown('one<br><br>two'), 'one\n\ntwo');
check('nested bold in list item', htmlToMarkdown('<ul><li><b>ACID</b> properties</li></ul>'), '- **ACID** properties');

// Tables matter most here: the CTC breakdown is a table once formatted.
check(
  'table becomes a gfm table',
  htmlToMarkdown('<table><tr><th>Component</th><th>Amount</th></tr><tr><td>Base</td><td>12L</td></tr><tr><td>Bonus</td><td>2L</td></tr></table>'),
  '| Component | Amount |\n| --- | --- |\n| Base | 12L |\n| Bonus | 2L |'
);
check('table without a header row', htmlToMarkdown('<table><tr><td>Base</td><td>12L</td></tr><tr><td>Bonus</td><td>2L</td></tr></table>'),
  '| Base | 12L |\n| --- | --- |\n| Bonus | 2L |');

// A code fence must survive intact, including its inner newlines and indentation.
check(
  'code block keeps its language and body',
  htmlToMarkdown('<pre><code class="language-python">def f():\n    return 1</code></pre>'),
  '```python\ndef f():\n    return 1\n```'
);

// Pasting must never smuggle markup through into stored markdown.
check('script content is dropped', htmlToMarkdown('<p>Safe</p><script>alert(1)</script>'), 'Safe');
check('style content is dropped', htmlToMarkdown('<style>p{color:red}</style><p>Safe</p>'), 'Safe');
check('presentation attributes are stripped', htmlToMarkdown('<b style="font-weight:normal">Hi</b>'), '**Hi**');
check('span and div wrappers are unwrapped', htmlToMarkdown('<span style="color:#000">A</span><div>B</div>'), 'A\n\nB');
// An unclosed tag must not leave either the tag or a dangling unmatched marker
// behind. Unwrapping to plain text is preferred over emitting a stray "**".
check('unclosed tags do not leak markup', htmlToMarkdown('<p>trailing <b>bold'), 'trailing bold');
check('unclosed tag drops the marker, not the words', htmlToMarkdown('<p>keep <i>these words'), 'keep these words');

// --- entities -----------------------------------------------------------------
check('named entities', decodeHtmlEntities('&amp; &ndash; &hellip;'), '& – …');
check('decimal entity', decodeHtmlEntities('&#8377;100'), '₹100');
check('hex entity', decodeHtmlEntities('&#x20B9;'), '₹');
check('nbsp becomes a space', decodeHtmlEntities('a&nbsp;b'), 'a b');
check('unknown entity is left alone', decodeHtmlEntities('&notarealentity;'), '&notarealentity;');

// --- pipe text to markdown table ---------------------------------------------
const toTable = pipeTextToMarkdownTable;

check(
  'pipes on one line become rows',
  toTable('SDE-1 Base: 12L - 22L | Fixed Bonus: 2L | Stocks: 4L - 8L'),
  '| Component | Amount |\n| --- | --- |\n| SDE-1 Base | 12L - 22L |\n| Fixed Bonus | 2L |\n| Stocks | 4L - 8L |'
);
check(
  'one fact per line becomes rows',
  toTable('Base: 12L - 22L\nStocks: 4L - 8L\nBonus: 2L'),
  '| Component | Amount |\n| --- | --- |\n| Base | 12L - 22L |\n| Stocks | 4L - 8L |\n| Bonus | 2L |'
);
check(
  'only the first colon splits, so ranges survive',
  toTable('CTC: 12: 30 | Bonus: 2L'),
  '| Component | Amount |\n| --- | --- |\n| CTC | 12: 30 |\n| Bonus | 2L |'
);
check(
  'a prose preamble is preserved above the table',
  toTable('Typical package:\nBase: 12L - 22L | Bonus: 2L'),
  'Typical package:\n\n| Component | Amount |\n| --- | --- |\n| Base | 12L - 22L |\n| Bonus | 2L |'
);

// The button is safe to press repeatedly, and must never mangle prose or a URL.
const untouched: Array<[string, string]> = [
  ['already a table', '| Component | Amount |\n| --- | --- |\n| Base | 12L |'],
  ['a url in prose', 'See https://example.com for details'],
  ['a url among facts', 'Base: 12L | See https://x.com for info'],
  ['a mailto link', 'Base: 12L | mailto: someone'],
  ['a single fact', 'Bonus: 2L per year'],
  ['stray text on a fact line', 'Base: 12L | and then some notes'],
  ['prose after the facts', 'Base: 12L | Bonus: 2L\nSome trailing remark here'],
  ['no colon at all', 'Just a sentence about the company.'],
  ['empty input', ''],
];
for (const [name, input] of untouched) {
  if (toTable(input) === input.trim() || toTable(input) === input) {
    pass++;
  } else {
    fail++;
    console.log(`FAIL table leaves ${name} alone\n  input:  ${JSON.stringify(input)}\n  actual: ${JSON.stringify(toTable(input))}`);
  }
}

// The migrated database must survive the button unchanged.
check('migrated table is idempotent', toTable('| Component | Amount |\n| --- | --- |\n| Base | 12L |'), '| Component | Amount |\n| --- | --- |\n| Base | 12L |');

// --- Cap and per-field clamping ---------------------------------------------
// A field over the cap must be caught, not silently truncated by the backend, and
// the preformatted fields must never be touched.

check('clamp leaves a short field alone', clampRichText('short', RICH_TEXT_MAX), 'short');
check('clamp leaves an exactly-at-cap field alone', clampRichText('a'.repeat(RICH_TEXT_MAX), RICH_TEXT_MAX), 'a'.repeat(RICH_TEXT_MAX));
check('clamp cuts an over-cap field', clampRichText('a'.repeat(RICH_TEXT_MAX + 500), RICH_TEXT_MAX).length, RICH_TEXT_MAX);
check('clamp never exceeds the cap', clampRichText('x'.repeat(RICH_TEXT_MAX * 2), RICH_TEXT_MAX).length <= RICH_TEXT_MAX, true);

// A cut mid-fence would render the rest of the field as inline code, so the clamp
// backs up to a line break when one is reasonably close to the limit.
const longWithBreaks = `${'a'.repeat(RICH_TEXT_MAX - 40)}\n${'b'.repeat(200)}`;
const clamped = clampRichText(longWithBreaks, RICH_TEXT_MAX);
check('clamp trims to a line boundary', clamped.endsWith('\n'), false);
check('clamp stays at or under the cap', clamped.length <= RICH_TEXT_MAX, true);

const section: any = {
  overview: {
    companyInfo: 'a'.repeat(RICH_TEXT_MAX + 10),
    eligibility: 'short',
    salaryBreakdown: '',
    reviews: [{ name: 'R', role: 'SDE', rating: 5, text: 'b'.repeat(RICH_TEXT_MAX + 10) }],
  },
  core_subjects: [{ subject: 'DBMS', topics: [{ title: 'T', content: 'c'.repeat(RICH_TEXT_MAX + 10), pyqs: [{ question: 'q', answer: 'ok' }] }] }],
  interview_questions: [{ category: 'Technical', title: 'T', question: 'q', solution: 's', code: 'int main(){}' }],
  cheatsheets: [{ title: 'C', summary: 'sum', content: 'z'.repeat(RICH_TEXT_MAX + 10) }],
  never_skip_topics: [],
  last_minute_revision: [],
  hr_round: [],
};

const over = overLimitRichTextPaths(section);
check('over-limit overview.companyInfo is reported', over.includes('overview.companyInfo'), true);
check('over-limit review text is reported', over.includes('overview.reviews.[].text'), true);
check('over-limit topic content is reported', over.includes('core_subjects.[].topics.[].content'), true);
check('preformatted cheatsheet content is NOT reported', over.includes('cheatsheets.[].summary'), false);
check('short fields are not reported', over.includes('overview.eligibility'), false);
check('no preformatted field is ever reported', over.some((p) => p.endsWith('.content') && p.startsWith('cheatsheets')), false);

const frozen = JSON.stringify(section);
const out: any = clampRichFields(section);
check('clampRichFields caps overview.companyInfo', out.overview.companyInfo.length, RICH_TEXT_MAX);
check('clampRichFields caps review text', out.overview.reviews[0].text.length, RICH_TEXT_MAX);
check('clampRichFields caps nested topic content', out.core_subjects[0].topics[0].content.length, RICH_TEXT_MAX);
check('clampRichFields leaves short fields alone', out.overview.eligibility, 'short');
check('clampRichFields leaves code alone', out.interview_questions[0].code, 'int main(){}');
check('clampRichFields never touches preformatted cheatsheet content', out.cheatsheets[0].content.length, RICH_TEXT_MAX + 10);
check('clampRichFields does not mutate its input', JSON.stringify(section), frozen);
check('clamped section reports nothing over limit', overLimitRichTextPaths(out).length, 0);
check('clampRichFields is idempotent', JSON.stringify(clampRichFields(out)), JSON.stringify(out));

// A section_data with missing/odd shapes must not throw, because the admin can
// legitimately have an empty pack open.
for (const odd of [{}, { overview: null }, { core_subjects: [] }, { hr_round: [{ answer: 5 }] }]) {
  try {
    clampRichFields(odd as any);
    overLimitRichTextPaths(odd);
    pass++;
  } catch (e) {
    fail++;
    console.log(`FAIL malformed section_data threw: ${JSON.stringify(odd)} -> ${(e as Error).message}`);
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
