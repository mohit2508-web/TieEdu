/*
 * Multipart uploads must not carry a JSON Content-Type.
 *
 * The course-cover upload failed with "No file uploaded" because it went
 * through `apiFetch`, which set `Content-Type: application/json` on every
 * request. A manually-set Content-Type stops the browser from adding the
 * `multipart/form-data` boundary, so multer could not parse the body and
 * `req.file` stayed undefined. Every other uploader in the app already works
 * around this by hand — `dropsApi` says so in its own comment — which is
 * evidence the invariant needs to live in `apiFetch` itself, not in each
 * caller's memory.
 *
 * These are source assertions, not a behavioural test: the runner compiles
 * without the DOM lib, so there is no `fetch` or `FormData` to drive. The
 * backend smoke covers the wire end-to-end (upload -> serve -> clear); these
 * checks stop the header logic from being quietly reverted.
 */
import * as fs from 'fs';
import * as path from 'path';

// Walk up to the frontend root. The suite is compiled into `.test-build/`, so
// `__dirname` is two levels below the sources and a `__dirname/..` read would
// look for the file inside the build output.
function findRoot(): string {
  let dir = __dirname;
  for (let i = 0; i < 8; i += 1) {
    if (fs.existsSync(path.join(dir, 'package.json'))) return dir;
    dir = path.dirname(dir);
  }
  throw new Error('could not find the frontend root');
}
const ROOT = findRoot();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
let pass = 0;
let fail = 0;
const ok = (cond: boolean, msg: string) => {
  if (cond) {
    pass += 1;
    console.log(`  ok   ${msg}`);
  } else {
    fail += 1;
    console.log(`  FAIL ${msg}`);
  }
};

const api = read('src/lib/api.ts');
const courses = read('src/lib/coursesApi.ts');

ok(
  /instanceof FormData/.test(api),
  'apiFetch must detect FormData bodies'
);
ok(
  /\.\.\.\(isFormData \? \{\} : \{ 'Content-Type': 'application\/json' \}\)/.test(api),
  'apiFetch must skip the JSON Content-Type for a FormData body so the browser can set the multipart boundary'
);
ok(
  /authHeaders\(\)/.test(api),
  'a FormData request still needs the Authorization header'
);
ok(
  /append\('file'/.test(courses),
  "the cover upload must use the 'file' field multer's .single('file') expects"
);
ok(
  !/headers:\s*\{[^}]*Content-Type[^}]*\}[\s\S]{0,200}body:\s*form/.test(courses),
  'the cover upload must not hand-set a Content-Type next to its FormData body'
);

console.log(`\nmultipart: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
