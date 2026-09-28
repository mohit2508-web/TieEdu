import {
  wrapInline, toggleHeading, toggleBullet, toggleOrdered, toggleTask,
  indentLines, outdentLines, insertTable, insertCodeFence,
} from '../src/components/editor/markdownActions';

let pass = 0;
let fail = 0;

function check(name: string, actual: string, expected: string) {
  if (actual === expected) {
    pass++;
  } else {
    fail++;
    console.log(`FAIL ${name}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
  }
}

const S = (value: string, start = 0, end = start) => ({ value, selectionStart: start, selectionEnd: end });

check('bold wraps selection', wrapInline(S('hello world', 0, 5), '**').value, '**hello** world');
check('bold unwraps', wrapInline(S('**hello** world', 2, 7), '**').value, 'hello world');
check('italic wraps', wrapInline(S('abc', 0, 3), '*').value, '*abc*');
check('bold placeholder when empty', wrapInline(S('', 0, 0), '**', 'bold text').value, '**bold text**');

check('h1 prefixes', toggleHeading(S('Title', 0, 5), 1).value, '# Title');
check('h1 upgrades from h2', toggleHeading(S('## Title', 0, 7), 1).value, '# Title');
check('h1 toggles off', toggleHeading(S('# Title', 0, 7), 1).value, 'Title');
check('h3 on multiline', toggleHeading(S('a\nb', 0, 3), 3).value, '### a\n### b');

check('bullet adds', toggleBullet(S('one\ntwo', 0, 7)).value, '- one\n- two');
check('bullet removes', toggleBullet(S('- one\n- two', 0, 11)).value, 'one\ntwo');
check('bullet replaces existing', toggleBullet(S('# one\n# two', 0, 11)).value, '- one\n- two');

check('ordered numbers', toggleOrdered(S('a\nb\nc', 0, 5)).value, '1. a\n2. b\n3. c');
check('ordered removes', toggleOrdered(S('1. a\n2. b', 0, 9)).value, 'a\nb');

check('task adds', toggleTask(S('revise graphs', 0, 13)).value, '- [ ] revise graphs');
check('task removes', toggleTask(S('- [ ] revise graphs', 0, 19)).value, 'revise graphs');
check('task over bullet', toggleTask(S('- one\n- two', 0, 11)).value, '- [ ] one\n- [ ] two');

check('indent adds two spaces', indentLines(S('a\nb', 0, 3)).value, '  a\n  b');
check('outdent removes', outdentLines(S('    a\n    b', 0, 11)).value, 'a\nb');
check('round trip', outdentLines(indentLines(S('a', 0, 1))).value, 'a');

check(
  'table scaffold',
  insertTable(S('', 0, 0), 2, 2).value,
  '| Header | Header |\n| --- | --- |\n|   |   |\n|   |   |'
);

check('code fence', insertCodeFence(S('', 0, 0), 'python').value, '```python\n// your code here\n```');

const caret = wrapInline(S('one two', 4, 4), '**', 'bold text');
check('caret advances past marker', `${caret.selectionStart}-${caret.selectionEnd}`, '6-15');
check('caret text is placeholder', caret.value.slice(caret.selectionStart, caret.selectionEnd), 'bold text');

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
