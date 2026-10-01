/**
 * Perceived-speed tests — Phase 6, MOBILE_APP_UI_PLAN.md §9.
 *
 * Skeletons, reduced motion, and empty states. These are static assertions
 * because the alternative is a component test with no DOM, and because every
 * failure mode here is a *missing* piece — a reverted class, a deleted
 * `aria-hidden`, a skeleton that stopped matching the layout it stands in for —
 * rather than a behaviour with edge cases.
 */
import * as fs from 'fs';
import * as path from 'path';

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
function ok(value: unknown, note: string) {
  if (!value) throw new Error(note);
}

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

/**
 * The source with its comments removed.
 *
 * The two checks below look for strings like "Loading Vault..." and for the
 * absence of a `loading` flag, and both of those words appear in the comments
 * that explain *why* they were removed. Asserting on raw source therefore meant
 * a test that failed for the wrong reason, and a "fix" would have been to delete
 * the explanation - which is backwards. A test should read the code.
 *
 * `//` is only treated as a comment when it is not preceded by a colon, so a
 * protocol-relative or `https://` string survives.
 */
const code = (rel: string): string =>
  read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');

check('the loading text is gone from the two pages the plan named', () => {
  // The plan named the vault and the course detail specifically, because they
  // are the two a student sees most. "Loading vault..." and "Loading course…"
  // were the entire loading state for both.
  const vault = read('src/pages/company/[slug].tsx');
  ok(!/Loading vault/.test(vault), 'the vault still renders a loading line');
  ok(/<VaultSkeleton/.test(vault), 'and does not render the skeleton');

  const course = read('src/pages/courses/[slug].tsx');
  ok(!/Loading course/.test(course), 'the course page still renders a loading line');
  ok(/<CourseDetailSkeleton/.test(course), 'and does not render the skeleton');
});

check('a skeleton is announced once, and its blocks are not', () => {
  /*
   * A skeleton is a picture of content, not content. A screen reader that
   * announced every block would say "graphic" forty times — strictly worse than
   * the sentence it replaced. The role and the label live on the skeleton root;
   * `aria-hidden` lives on the individual blocks.
   */
  for (const [file, name] of [
    ['src/components/company/VaultSkeleton.tsx', 'VaultSkeleton'],
    ['src/components/courses/CourseUi.tsx', 'CourseDetailSkeleton'],
  ] as const) {
    const src = read(file);
    ok(/role="status"/.test(src), `${name} must carry role="status" so the wait is announced once`);
    ok(/aria-live="polite"/.test(src), `${name} must not interrupt with aria-live="assertive"`);
    ok(/aria-label="Loading/.test(src), `${name} must say what is loading`);
  }
  const primitive = read('src/components/common/Skeleton.tsx');
  ok(/aria-hidden="true"/.test(primitive), 'the block primitive must be aria-hidden');
});

check('the skeletons use the grid of the pages they stand in for', () => {
  /*
   * A skeleton whose breakpoints do not match the real page reflows the moment
   * the content lands. That is worse than the spinner it replaced, because now
   * the page moves twice.
   */
  const vault = read('src/components/company/VaultSkeleton.tsx');
  const vaultPage = read('src/pages/company/[slug].tsx');
  /* Compared as a set of breakpoints, not as a literal class string: the two
     files list `gap-4` in different positions, and class *order* does not affect
     the layout. Comparing strings here would fail on a cosmetic reorder and,
     worse, would pass if the breakpoints drifted apart but the text still lined
     up by accident. */
  const breakpoints = (src: string) =>
    (src.match(/(?:^|["\s])(grid-cols-\d|md:grid-cols-\d|xl:grid-cols-\d|sm:grid-cols-\d|lg:grid-cols-\d)/g) ?? [])
      .map((c) => c.trim())
      .sort()
      .join(' ');
  const skeletonCols = breakpoints(vault);
  ok(skeletonCols.includes('md:grid-cols-2') && skeletonCols.includes('xl:grid-cols-3'), 'the vault skeleton lost its three-column grid');
  ok(breakpoints(vaultPage) === skeletonCols, `grid breakpoints differ: page ${breakpoints(vaultPage)} vs skeleton ${skeletonCols}`);

  const course = read('src/components/courses/CourseUi.tsx');
  ok(/aspect-\[4\/3\]/.test(course), 'the desktop course cover is 4:3 on the real page');
  ok(/aspect-\[16\/9\]/.test(course), 'and 16:9 on mobile — two covers, two shapes');
  const page = read('src/pages/courses/[slug].tsx');
  ok(/aspect-\[4\/3\]/.test(page), 'the real course page must still use 4:3 beside the copy');
  ok(/aspect-\[16\/9\]/.test(page), 'and 16:9 above it on mobile');
});

check('skeletons do not animate for students who asked them not to', () => {
  // An indefinitely pulsing block is the textbook case of the repetitive motion
  // `prefers-reduced-motion` exists for, and Phase 6 put skeletons on the two
  // most-visited pages. Without this the sweep made that page worse for exactly
  // the students it was meant to help.
  const css = read('src/styles/globals.css');
  const block = /@media \(prefers-reduced-motion: reduce\)[\s\S]*?animate-pulse/.test(css);
  ok(block, 'animate-pulse is not neutralised under prefers-reduced-motion');
});

check('an empty state is an icon, one line and one action', () => {
  const src = read('src/components/common/EmptyState.tsx');
  ok(/icon: React\.ComponentType/.test(src), 'an empty state must take an icon');
  ok(/title: string;/.test(src), 'and its copy as a string, so it cannot grow into a paragraph');
  ok(!/title: React\.ReactNode/.test(src), 'ReactNode copy is how these become a wall of text');
  ok(/action\?/.test(src), 'and it must accept the one action');
  ok(/min-h-\[44px\]/.test(src), 'the action is a thumb target, not a small link');
});

check('the discussion empty state was actually adopted', () => {
  /*
   * The point of a shared empty state is that it gets used. This one was a
   * dashed box with a sentence in it, on a page students read to find out
   * whether anyone else hit the same wall.
   */
  const src = read('src/components/company/QuestionDiscussion.tsx');
  ok(/<EmptyState/.test(src), 'the discussion thread still has no EmptyState');
  ok(/composerRef\.current\?\.focus\(\)/.test(src), 'and its action must do something, not just be styled');
  ok(/No discussions yet/.test(src) === false, 'the old bare empty box is still there too');
});

check('a textarea that can be typed into is not 12px', () => {
  // iOS zooms the page on focus for any input under 16px, and the zoom is the
  // tell. The comment composer was `text-xs` — 12px — on mobile.
  const src = read('src/components/company/QuestionDiscussion.tsx');
  const textarea = /<textarea[\s\S]{0,600}?\/>/.exec(src)?.[0] ?? '';
  ok(/text-base/.test(textarea), 'the composer needs a 16px floor on mobile');
  ok(!/text-xs/.test(textarea), 'and must not fall back to 12px');
});

check('a comment avatar is lazy and dimensioned', () => {
  const src = read('src/components/company/QuestionDiscussion.tsx');
  /* Matched to the closing `/>` of the img itself, with a generous window: the
     tag now carries a comment explaining why it is lazy, and a narrow window
     silently matched a *different* `<img>` and reported a pass for the wrong
     element. */
  const img = /<img\b[\s\S]*?\/>/.exec(src)?.[0] ?? '';
  ok(img.length > 0, 'no comment avatar <img> was found to check');
  ok(/loading="lazy"/.test(img), 'a long thread should not queue every avatar up front');
  ok(/width=\{32\}/.test(img) && /height=\{32\}/.test(img), 'and the box must be fixed, not sized by the image');
});

check('bookmark and solve are already optimistic', () => {
  /*
   * Phase 6 lists these, and they were already done: the reader state is
   * device-local `localStorage`, so `persist` writes it synchronously in the same
   * tick as the tap. There is no request to be optimistic about, which is the
   * honest reason this is a passing test rather than new code.
   *
   * Asserted so a future "let's put this on the server" change is a deliberate
   * decision: the moment it becomes a fetch, this has to become real optimistic
   * state with a rollback, and this test is where it will be noticed.
   */
  const reader = read('src/components/company/CompanyModuleReader.tsx');
  ok(/setReaderState\(next\)/.test(reader), 'state must update in the same tick as the tap');
  ok(/writeState\(companySlug, module\.id, next\)/.test(reader), 'and be persisted immediately, not in an effect');
  ok(
    /setReaderState\(next\);[\s\S]{0,80}?writeState/.test(reader),
    'the write must not be deferred past a render'
  );
});

check('the route loader is a bar, not a spinner with a caption', () => {
  /*
   * Found by the browser probe, not by reading the file. `TieEduLoader` is
   * mounted once in `_app`, so whatever it renders appears on *every* client-side
   * navigation - and it was rendering a corner spinner card captioned
   * "Loading Vault...". Opening a course therefore announced a vault, on a
   * card that sat over page content in the bottom-right, which on a phone is
   * under the thumb.
   */
  const src = code('src/components/common/TieEduLoader.tsx');
  ok(!/Loading Vault/.test(src), 'the loader still claims to load a Vault on every route');
  ok(!/animate-spin/.test(src), 'the global route loader still spins');
  ok(!/lucide-react/.test(src), 'its spinner icon should be gone with the card');
  ok(!/bottom-\d/.test(src), 'nothing should float over the content near the thumb');
  // The bar itself is the affordance that stays: it is the only global signal
  // that a route change is happening, and a top bar is the app pattern.
  ok(/fixed top-0/.test(src), 'the thin top progress bar is the part that should remain');
});

check('the vault skeleton is keyed on missing data, not a loading flag', () => {
  /*
   * The vault page had a `loading` state that was set four times and never read,
   * and one of those four was the *company list* request rather than the vault.
   * The list usually resolves first, so anything gated on that flag would have
   * torn the skeleton down while the vault was still in flight - which is the
   * blank-page flash Phase 6 exists to remove.
   */
  const src = code('src/pages/company/[slug].tsx');
  ok(!/\bsetLoading\b/.test(src), 'the dead loading flag is back');
  ok(!/useState\(!initialCompany\)/.test(src), 'and with it the premature first-render value');
  // A generous window on purpose: the gate and the skeleton are separated by the
  // wrapper element's own classes, so a tight window fails whenever that markup
  // is reformatted, which is a false alarm about loading behaviour.
  ok(/if \(!company\)[\s\S]{0,400}?<VaultSkeleton\s*\/>/.test(src),
    'the skeleton must be gated on the absence of data, which has no race');
  // The list fetch must not reach the vault's loading state at all.
  const listEffect = /fetchCompanies\(\)[\s\S]{0,200}/.exec(src)?.[0] ?? '';
  ok(!/setLoading/.test(listEffect), 'the company list must not drive the vault loading state');
});

console.log(`\nperceived-speed: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
