/*
 * Image delivery policy.
 *
 * Two things here are worth a test because both fail silently.
 *
 * 1. `isApiAssetUrl` decides whether an image may be handed to `next/image`.
 *    Getting it wrong in the permissive direction returns **400** from the
 *    optimizer, which is a broken hero on the page that sells the course — and
 *    it only shows up for the courses that happen to have an external URL, so
 *    the seeded set looks perfectly healthy. The predicate compares parsed
 *    `URL.origin` values rather than doing a prefix test, precisely because the
 *    prefix version accepts `http://localhost:5000.evil.test`. That case is
 *    asserted here.
 *
 * 2. A `@next/next/no-img-element` disable with no stated reason. Several
 *    existed before this work: a bare `eslint-disable-next-line` reads as
 *    "reviewed and accepted", so a later reader cannot tell a deliberate
 *    decision from an oversight, and the lint count alone hides the difference.
 *    Requiring a reason on every suppression keeps each plain `<img>` a
 *    statement about *why* rather than a silent opt-out.
 *
 * 3. A `sizes` width the configured srcset cannot serve. See the last block.
 */
import * as fs from 'fs';
import * as path from 'path';
import { isApiAssetUrl, apiAssetUrl } from '@/lib/assetUrl';

function findRoot(): string {
  let dir = __dirname;
  for (let i = 0; i < 8; i += 1) {
    if (fs.existsSync(path.join(dir, 'package.json'))) return dir;
    dir = path.dirname(dir);
  }
  throw new Error('could not find the frontend root');
}

const ROOT = findRoot();

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

// --- isApiAssetUrl -----------------------------------------------------------

ok(isApiAssetUrl('http://localhost:5000/api/posters/file/x.png'), 'an API asset is optimizable');
ok(isApiAssetUrl('http://localhost:5000/anything/at/all.png'), 'the path is irrelevant - only the origin decides');

ok(!isApiAssetUrl(''), 'empty string is not optimizable');
ok(!isApiAssetUrl('/api/posters/file/x.png'), 'a server-relative path is not optimizable (resolve it first)');
ok(!isApiAssetUrl('data:image/png;base64,AAAA'), 'a data URL is not optimizable');
ok(!isApiAssetUrl('blob:http://localhost:5000/abc'), 'a blob URL is not optimizable');

// The prefix-test trap. `startsWith(API_ORIGIN)` is true for all three of these.
ok(!isApiAssetUrl('http://localhost:5000.evil.test/x.png'), 'a suffix-attack host is rejected (not localhost:5000)');
ok(!isApiAssetUrl('http://localhost:50000/x.png'), 'a longer port is rejected');
ok(!isApiAssetUrl('http://localhost:5001/x.png'), 'a different port is rejected');
ok(!isApiAssetUrl('https://localhost:5000/x.png'), 'a different scheme is rejected');
ok(!isApiAssetUrl('https://cdn.example.com/x.png'), 'an unrelated host is rejected');

// A resolved relative path must be recognised, or every cover would silently
// take the plain-`img` branch and the migration would do nothing.
const resolved = apiAssetUrl('/api/courses/abc/thumb/thumb-1-abcd1234.jpg');
ok(resolved.startsWith('http://localhost:5000/'), 'apiAssetUrl resolves a relative path to the API origin');
ok(isApiAssetUrl(resolved), 'a resolved API asset passes the optimizable check');
ok(!isApiAssetUrl(apiAssetUrl('https://cdn.example.com/x.png')), 'an already-absolute external URL stays external');

// --- suppressions must carry a reason ---------------------------------------

const sourceFiles: string[] = [];
const walk = (dir: string) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.tsx?$/.test(entry.name)) sourceFiles.push(full);
  }
};
walk(path.join(ROOT, 'src'));

const DISABLE = /@next\/next\/no-img-element/;
const suppressions: { file: string; line: number; text: string }[] = [];
for (const file of sourceFiles) {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((text, i) => {
    if (DISABLE.test(text)) suppressions.push({ file: path.relative(ROOT, file), line: i + 1, text: text.trim() });
  });
}

ok(suppressions.length > 0, 'the plain-`<img>` sites are still present and accounted for');
for (const s of suppressions) {
  ok(
    s.text.includes('--') && s.text.split('--')[1].trim().length > 10,
    `${s.file}:${s.line} states a reason for the suppression`
  );
}

// Every plain `<img>` must be either suppressed with a reason or genuinely gone,
// so a new one cannot be added without a decision.
//
// The scan has to know which `<img` occurrences are real JSX, because this
// codebase documents its image decisions in prose that mentions `<img>` — and
// several of those mentions are the whole justification for the decision.
//
// The first attempt stripped block comments with a regex and split the result
// into lines. That is wrong in a quiet way: deleting a multi-line comment
// deletes its newlines, so every line after it is renumbered and the "is there a
// disable above this?" lookback checks the wrong lines — it reported real
// elements as unaccounted and stayed silent about others. So instead: mark, per
// character, whether it is inside a block comment, and leave the text alone.
const commentMask = (lines: string[]): boolean[][] => {
  let depth = 0;
  return lines.map((line) => {
    const mask = new Array<boolean>(line.length + 1).fill(false);
    let j = 0;
    while (j < line.length) {
      mask[j] = depth > 0;
      if (depth === 0 && line[j] === '/' && line[j + 1] === '*') {
        depth += 1;
        mask[j + 1] = true;
        j += 2;
        continue;
      }
      if (depth > 0 && line[j] === '*' && line[j + 1] === '/') {
        depth -= 1;
        mask[j + 1] = depth > 0;
        j += 2;
        continue;
      }
      j += 1;
    }
    mask[line.length] = depth > 0;
    return mask;
  });
};

const unsuppressed: string[] = [];
for (const file of sourceFiles) {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  const masks = commentMask(lines);
  lines.forEach((text, i) => {
    const at = text.indexOf('<img');
    if (at === -1) return;
    if (masks[i][at]) return; // mentioned inside a comment
    // Look back a couple of lines for the disable that covers this element.
    const window = lines.slice(Math.max(0, i - 3), i).join('\n');
    if (!DISABLE.test(window)) unsuppressed.push(`${path.relative(ROOT, file)}:${i + 1}`);
  });
}
ok(unsuppressed.length === 0, `every <img> is either migrated or justified (unaccounted: ${unsuppressed.join(', ') || 'none'})`);

// --- CourseCover: the origin guard and a stated width -----------------------

const courseUi = fs.readFileSync(path.join(ROOT, 'src', 'components', 'courses', 'CourseUi.tsx'), 'utf8');
ok(/isApiAssetUrl\(src\)/.test(courseUi), 'CourseCover gates next/image behind isApiAssetUrl');
ok(/sizes\?: string/.test(courseUi), 'CourseCover accepts an explicit `sizes`');
ok(!/loading=\{priority \? 'eager' : 'lazy'\}[\s\S]{0,400}next\/image/.test(courseUi), 'the LCP path is not a lazy plain <img>');

for (const [name, rel] of [
  ['course card', 'src/components/courses/CourseUi.tsx'],
  ['preview shell', 'src/components/courses/CoursePreviewShell.tsx'],
  ['course page', 'src/pages/courses/[slug].tsx'],
] as [string, string][]) {
  const text = fs.readFileSync(path.join(ROOT, ...rel.split('/')), 'utf8');
  const uses = text.match(/<CourseCover[\s\S]*?\/>/g) || [];
  ok(uses.length > 0, `${name} renders CourseCover`);
  ok(
    uses.every((u) => /\bsizes=/.test(u)),
    `${name} states a width for every CourseCover (a wrong \`sizes\` is a real bandwidth cost)`
  );
}

// --- the srcset must be able to serve the widths `sizes` asks for ------------
//
// A srcset is only generated for the widths in `images.deviceSizes` and
// `images.imageSizes`, so a `sizes` value that no configured width can satisfy is
// not a rounding error: the browser skips to the next size up and downloads a
// bigger file. On the course hero that was not theoretical -- a 1272px slot
// pulled the 1920px file, a 1.5x overshoot on the LCP element. Neither `next
// build` nor `tsc` nor a passing lint run reports it; it is only visible by
// reading the emitted srcset against the configured widths.
//
// Both lists participate: Next offers `imageSizes` for fixed-width images and the
// `deviceSizes` for `sizes`/`fill` images, so the candidate set is the union.
const configSrc = fs.readFileSync(path.join(ROOT, 'next.config.mjs'), 'utf8');
const readNumberList = (key: string): number[] => {
  const m = new RegExp(`${key}:\\s*\\[([^\\]]*)\\]`).exec(configSrc);
  return m
    ? m[1]
        .split(',')
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !Number.isNaN(n))
    : [];
};
const servable = [...new Set([...readNumberList('deviceSizes'), ...readNumberList('imageSizes')])].sort((a, b) => a - b);
ok(servable.length > 0, 'deviceSizes and imageSizes are parseable from next.config.mjs');

// Pull the literal widths out of a `sizes` value. Two things are not widths and
// must not be read as such: a media-query breakpoint, and a `calc()`/viewport
// term whose value depends on the window.
const literalWidths = (sizes: string): number[] => {
  const out: number[] = [];
  for (const branch of sizes.split(',')) {
    const cleaned = branch.replace(/\([^)]*\)/g, ' ');
    if (/calc\(|\d\s*vw|\d\s*vh|%/.test(cleaned)) continue;
    const m = cleaned.match(/(\d+)px/);
    if (m) out.push(parseInt(m[1], 10));
  }
  return out;
};

// A large slot must be served tightly, because that is where the wasted bytes
// cost real time. A small one only has to be within a fixed slack, since 1.5x of
// 168px is a difference nobody can feel.
const maxWaste = (wanted: number) => (wanted >= 256 ? wanted * 0.15 : 48);

for (const file of sourceFiles) {
  const text = fs.readFileSync(file, 'utf8');
  for (const m of text.matchAll(/\bsizes="([^"]+)"/g)) {
    for (const wanted of literalWidths(m[1])) {
      const nearest = servable.filter((d) => d >= wanted)[0];
      ok(
        nearest !== undefined && nearest - wanted <= maxWaste(wanted),
        `${path.relative(ROOT, file)}: sizes asks for ${wanted}px, srcset serves ${nearest ?? 'nothing'} (waste ${nearest === undefined ? 'n/a' : nearest - wanted}px, budget ${Math.round(maxWaste(wanted))}px)`
      );
    }
  }
}

// Pin the exact width of the course hero. The assertion above only proves a
// `sizes` attribute exists, and a real bug lived there: the cover is the *second*
// child of `sm:grid-cols-[1fr_240px]`, so it gets the 240px track, but it was
// declared as a 1272px `1fr` column -- plausible arithmetic, wrong child, and a
// 5.3x overstatement that had already passed this suite, lint and the build.
const slugPage = fs.readFileSync(path.join(ROOT, 'src', 'pages', 'courses', '[slug].tsx'), 'utf8');
const heroUses = (slugPage.match(/<CourseCover[\s\S]*?\/>/g) || []).filter((u) => /priority/.test(u));
ok(heroUses.length === 2, 'the course page renders both hero covers (desktop and mobile)');
ok(
  heroUses.some((u) => /sizes="240px"/.test(u)),
  'the desktop hero is pinned to its 240px grid track, not the 1fr column'
);
ok(
  heroUses.some((u) => /sizes="calc\(100vw - 32px\)"/.test(u)),
  'the mobile hero is the full-width box it renders as'
);

// A srcset is the union of `deviceSizes` and `imageSizes` for every image that
// declares `sizes`, so each configured width is also a URL of HTML in each of
// those tags. Adding a width "just in case" is therefore paid for by every image
// on the page: adding 240/168/112/80/44/40 cost 13.29KB across the five covers on
// the course page, of which only 168 was actually needed.
const candidateCount = servable.length;
ok(
  candidateCount <= 16,
  `the srcset offers ${candidateCount} widths, within the 16 that costs ~10.5KB across the course page's five covers (a width nobody needs is paid for by every image)`
);

console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode = fail === 0 ? 0 : 1;
