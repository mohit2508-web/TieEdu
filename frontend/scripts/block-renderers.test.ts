/**
 * Renderer coverage for the block vocabulary.
 *
 * The backend smoke check proves the *seeded* data only uses types the renderer
 * draws. That is a floor, not a guarantee: a new type can be added to the union
 * and an editor can offer it before any lesson uses it, and the smoke check
 * would still pass because no seeded block carries it yet. This suite closes
 * that gap from the frontend side — it reads the union, the renderer's `case`
 * list and the course editor's type list, and fails the moment they disagree.
 *
 * This is the frontend half of the bug that shipped `steps` and `video_link`:
 * an author could add a block that rendered as nothing.
 */
import * as fs from 'fs';
import * as path from 'path';

let pass = 0;
let fail = 0;
function eq(name: string, actual: unknown, expected: unknown) {
  if (Object.is(actual, expected)) {
    pass += 1;
  } else {
    fail += 1;
    console.log(`FAIL ${name}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
  }
}

function findRoot(): string {
  let dir = __dirname;
  for (let i = 0; i < 8; i += 1) {
    if (fs.existsSync(path.join(dir, 'package.json'))) return dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  throw new Error('could not locate frontend root from ' + __dirname);
}

const root = findRoot();
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8');

/** The member strings of `export type BlockType = 'a' | 'b' | ...;`. */
function unionMembers(source: string, typeName: string): string[] {
  // Strip line comments first: a `;` inside one would otherwise be mistaken for
  // the terminator and silently truncate the member list.
  const stripped = source
    .split('\n')
    .map((line) => line.replace(/\/\/.*$/, ''))
    .join('\n');
  const start = stripped.indexOf(`export type ${typeName} =`);
  if (start === -1) throw new Error(`no \`export type ${typeName}\` in source`);
  const end = stripped.indexOf(';', start);
  const block = stripped.slice(start, end === -1 ? undefined : end);
  return [...block.matchAll(/'([a-z0-9_]+)'/g)].map((m) => m[1]);
}

const typesSrc = read('src/types/index.ts');
const rendererSrc = read('src/components/blocks/ContentBlockRenderer.tsx');
const editorSrc = read('src/components/admin/course/AdminLessonEditor.tsx');

const union = unionMembers(typesSrc, 'BlockType');
const rendererCases = new Set([...rendererSrc.matchAll(/case '([a-z0-9_]+)':/g)].map((m) => m[1]));

eq('the union is non-empty', union.length > 0, true);
eq('the union has no duplicates', new Set(union).size, union.length);

// Every type the union declares must have a `case` that draws it.
const unrendered = union.filter((t) => !rendererCases.has(t));
eq('every BlockType has a renderer case', unrendered.join(', '), '');

// The reverse: a case for a type the union does not declare is dead code (or a
// typo) and would quietly accept a block the API would reject.
const unknownCases = [...rendererCases].filter((t) => !union.includes(t));
eq('no renderer case is outside the union', unknownCases.join(', '), '');

// The course editor can only offer types the renderer knows, or an admin can
// author a block that shows as nothing.
const editorValues = [...editorSrc.matchAll(/\{\s*value:\s*'([a-z0-9_]+)'/g)].map((m) => m[1]);
const unrenderableEditorValues = editorValues.filter((t) => !union.includes(t));
eq('the course editor offers only renderable block types', unrenderableEditorValues.join(', '), '');

// The 9-block lesson standard must be authorable.
for (const standard of ['objective', 'worked_example', 'try_it', 'mistakes', 'exam_angle', 'summary']) {
  eq(`the editor offers the "${standard}" block`, editorValues.includes(standard), true);
}

console.log(`\nblock-renderers: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
