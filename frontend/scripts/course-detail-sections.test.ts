/**
 * Tests for the long-form course-page sections.
 *
 * The one property that matters most here is also the easiest to lose: a section
 * with no data must render NOTHING. The alternative - an empty heading, a dash, or
 * a placeholder bullet - makes the page look broken and, worse, can read as a
 * real claim about the course. So these tests pin "absent in, absent out" as
 * hard as they pin the formatting.
 *
 * `proseParagraphs` and `bulletRows` are imported from `lib/courseProse`, a plain
 * module with no React, because the runner compiles suites under stricter
 * settings than the app uses and a suite cannot pull in a `.tsx` component
 * without failing on unrelated files.
 */
import { bulletRows, proseParagraphs } from '../src/lib/courseProse';

let pass = 0;
let fail = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    pass += 1;
  } catch (err: any) {
    fail += 1;
    console.error(`FAIL  ${name}\n      ${err?.message}`);
  }
}
function eq(actual: unknown, expected: unknown, note = '') {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) throw new Error(`expected ${b}, got ${a}${note ? ` - ${note}` : ''}`);
}

// --- the empty cases ---------------------------------------------------------
// These are the ones that decide whether an unwritten section leaves a trace.

check('no prose produces no paragraphs', () => {
  eq(proseParagraphs(undefined), []);
  eq(proseParagraphs(null), []);
  eq(proseParagraphs(''), []);
});

check('whitespace-only prose produces no paragraphs', () => {
  eq(proseParagraphs('   '), []);
  eq(proseParagraphs('\n\n\n'), []);
  eq(proseParagraphs('\n \n \n'), []);
});

// --- paragraph splitting -----------------------------------------------------

check('a blank line starts a new paragraph', () => {
  eq(proseParagraphs('First.\n\nSecond.'), ['First.', 'Second.']);
});

check('a paragraph break of many newlines is still one break', () => {
  eq(proseParagraphs('First.\n\n\n\n\nSecond.'), ['First.', 'Second.']);
});

check('blank lines with trailing spaces are still breaks', () => {
  eq(proseParagraphs('First.\n   \n  \nSecond.'), ['First.', 'Second.']);
});

check('a single newline is a wrap, not a paragraph break', () => {
  // The author typed a soft wrap in the textarea. Treating it as a break would
  // produce a ragged, unjustified block for a line that reads as one sentence.
  eq(proseParagraphs('one line\ncontinued here'), ['one line continued here']);
});

check('surrounding whitespace is trimmed off each paragraph', () => {
  eq(proseParagraphs('\n\n  First.  \n\n  Second.  \n\n'), ['First.', 'Second.']);
});

check('internal runs of spaces collapse to one', () => {
  eq(proseParagraphs('too    many     spaces'), ['too many spaces']);
});

// --- prose stays text, never markup -----------------------------------------

check('angle brackets survive as literal text', () => {
  // The field is rendered as text nodes, never via dangerouslySetInnerHTML, so
  // the function must not strip or interpret markup. Stripping would silently
  // delete real prose about code; interpreting it would be a stored XSS.
  eq(proseParagraphs('use a <div> here'), ['use a <div> here']);
  eq(proseParagraphs('a <script>alert(1)</script> tag'), ['a <script>alert(1)</script> tag']);
});

check('ampersands and quotes are left exactly as typed', () => {
  eq(proseParagraphs('C & C++ don\'t change'), ["C & C++ don't change"]);
});

// --- realistic shapes --------------------------------------------------------

check('a multi-paragraph essay splits into the right number of paragraphs', () => {
  const essay = 'Para one.\n\nPara two, which is a bit longer and wraps\nonto a second line.\n\nPara three.';
  eq(proseParagraphs(essay), [
    'Para one.',
    'Para two, which is a bit longer and wraps onto a second line.',
    'Para three.',
  ]);
});

check('a heading-like line stays a paragraph rather than becoming a heading', () => {
  // There is no markdown in this field. A line that looks like a heading is still
  // prose, and inventing heading semantics from it would be a guess.
  eq(proseParagraphs('## What you will build'), ['## What you will build']);
});

// --- bullet lists ------------------------------------------------------------
// A stray blank row would render as an empty bullet, which is the same failure as
// an empty heading: the section looks present but says nothing.

check('no bullets produces no rows', () => {
  eq(bulletRows(undefined), []);
  eq(bulletRows(null), []);
  eq(bulletRows([]), []);
});

check('blank bullet rows are dropped rather than rendered', () => {
  eq(bulletRows(['Real bullet', '', '   ', 'Another']), ['Real bullet', 'Another']);
});

check('bullets are trimmed', () => {
  eq(bulletRows(['  spaced  ']), ['spaced']);
});

check('a list of only blanks produces no rows', () => {
  eq(bulletRows(['', '  ', '\n']), []);
});

check('duplicates are kept, because the author may have meant both', () => {
  // De-duplicating would silently drop something the author wrote. Emptying a
  // section is done by clearing the field, not by quietly filtering it.
  eq(bulletRows(['a', 'a']), ['a', 'a']);
});

console.log(`\ncourse-detail-sections: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
