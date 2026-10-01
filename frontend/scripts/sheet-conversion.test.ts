/**
 * Phase 2 — MOBILE_APP_UI_PLAN.md §6. Overlay conversion invariants.
 *
 * The rule this suite enforces is one line in the plan:
 *
 *   "Below `md` there are no `items-center` modals."
 *
 * That is easy to satisfy by accident and easy to break by accident. Adding a
 * new dialog with `fixed inset-0 flex items-center` is the single most natural
 * thing to write, it looks correct on a desktop preview, and nothing fails. So
 * the check is here rather than in review.
 *
 * The other assertions cover the parts of the sheet contract that are invisible
 * until they are missing: a scroll lock, an Escape key, and focus that comes
 * back where it was. Three of the seven overlays had none of the three.
 */
import * as fs from 'fs';
import * as path from 'path';

function findRoot(): string {
  let dir = __dirname;
  for (let i = 0; i < 8; i += 1) {
    if (fs.existsSync(path.join(dir, 'package.json'))) return dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  throw new Error('could not locate package root from ' + __dirname);
}

const ROOT = findRoot();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/**
 * Comments are stripped before matching. A comment that explains *why* a modal
 * is a sheet must not be able to satisfy the assertion that it is one — the first
 * draft of this suite matched the phrase in a comment and passed against an
 * unconverted dialog.
 */
function normalize(src: string): string {
  return src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^\s*\/\/.*$/gm, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const sheet = normalize(read('src/components/common/Sheet.tsx'));

/** Every overlay the plan lists in §6, and where it now lives. */
const OVERLAYS: { name: string; file: string }[] = [
  { name: 'CartModal', file: 'src/components/checkout/CartModal.tsx' },
  { name: 'SearchModal', file: 'src/components/modals/SearchModal.tsx' },
  { name: 'LeaderboardModal', file: 'src/components/modals/LeaderboardModal.tsx' },
  { name: 'AuthRequiredModal', file: 'src/components/modals/AuthRequiredModal.tsx' },
  { name: 'SubmitReportModal', file: 'src/components/modals/SubmitReportModal.tsx' },
  { name: 'FeedbackAdModal', file: 'src/components/modals/FeedbackAdModal.tsx' },
  { name: 'MobileNavDrawer', file: 'src/components/layout/MobileNavDrawer.tsx' },
];

const sources: Record<string, string> = {};
for (const { file } of OVERLAYS) sources[file] = normalize(read(file));

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
function eq(actual: unknown, expected: unknown, note: string) {
  if (actual !== expected) {
    throw new Error(`${note}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

check('no overlay centres itself below md', () => {
  const offenders: string[] = [];
  for (const { name, file } of OVERLAYS) {
    const src = sources[file];
    // A centred overlay is the container that centres AND is fixed to the
    // viewport. `items-center` on an inline flex row inside a page is fine.
    if (/fixed[^"']{0,120}items-center/.test(src)) offenders.push(name);
  }
  eq(offenders.join(', '), '', 'these still use a centred fixed overlay below md');
});

check('no overlay hand-rolls its own fixed backdrop any more', () => {
  const offenders: string[] = [];
  for (const { name, file } of OVERLAYS) {
    // Each of the seven used to carry its own `fixed inset-0` scrim. Seven
    // scrims means seven slightly different dim values and blur radii.
    if (/fixed inset-0[^"']*bg-black/.test(sources[file])) offenders.push(name);
  }
  eq(offenders.join(', '), '', 'these still paint their own scrim');
});

check('every overlay routes through the Sheet primitive', () => {
  // Search is the documented exception: §6 asks for a full-screen search *page*
  // on mobile, not a sheet, so it owns its own layout deliberately.
  for (const { name, file } of OVERLAYS) {
    if (name === 'SearchModal') continue;
    ok(
      /<Sheet[\s>]/.test(sources[file]),
      `${name} does not render <Sheet>; a new bottom sheet must use the primitive, not a copy of it`
    );
  }
  ok(
    /<Results[\s>]/.test(sources['src/components/modals/SearchModal.tsx']),
    'SearchModal should share one result list between its mobile and desktop layouts'
  );
});

check('the primitive keeps the desktop dialog it replaced', () => {
  // §2 makes desktop a non-goal. If `md:` ever leaves the overlay, every one of
  // these conversions silently becomes a desktop redesign.
  ok(/md:items-center/.test(sheet), 'Sheet must still centre at md and up');
  ok(/md:max-w-\[32rem\]/.test(sheet), 'Sheet must keep its desktop max width');
});

check('the primitive locks scroll, traps Tab and restores focus', () => {
  ok(/lockBodyScroll\(\)/.test(sheet), 'Sheet must lock body scroll while open');
  ok(/event\.key !== 'Tab'/.test(sheet), 'Sheet must contain Tab inside the dialog');
  ok(
    /restoreFocusRef\.current\?\.focus/.test(sheet),
    'Sheet must put focus back where it was on close'
  );
});

check('the primitive dismisses by drag, with a reachable fallback', () => {
  ok(/DISMISS_DISTANCE/.test(sheet), 'Sheet must support drag-to-dismiss');
  ok(/aria-label=\{`Close \$\{title\}`\}/.test(sheet), 'Sheet needs a labelled close control');
  ok(
    /role="dialog"/.test(sheet) && /aria-modal="true"/.test(sheet),
    'a sheet is a real modal and must say so'
  );
});

check('overlays in the shell stack leave Escape and the scroll lock to it', () => {
  // `ShellContext` closes the *topmost* overlay on Escape. A second listener on
  // a sheet inside that stack would close this one and the one underneath it in
  // the same keypress.
  for (const file of [
    'src/components/checkout/CartModal.tsx',
    'src/components/modals/LeaderboardModal.tsx',
    'src/components/layout/MobileNavDrawer.tsx',
  ]) {
    ok(/closeOnEscape=\{false\}/.test(sources[file]), `${file} must not add a second Escape handler`);
    ok(/blocksScroll=\{false\}/.test(sources[file]), `${file} must not double-lock the body scroll`);
  }
});

check('prop-driven modals get Escape and the scroll lock from the primitive', () => {
  // These three are not in the `ShellContext` stack, so before the conversion
  // they had neither: the page scrolled behind the modal and Escape did nothing.
  for (const file of [
    'src/components/modals/AuthRequiredModal.tsx',
    'src/components/modals/SubmitReportModal.tsx',
    'src/components/modals/FeedbackAdModal.tsx',
  ]) {
    const src = sources[file];
    ok(!/closeOnEscape=\{false\}/.test(src), `${file} should keep the primitive's Escape handler`);
    ok(!/blocksScroll=\{false\}/.test(src), `${file} should keep the primitive's scroll lock`);
  }

  // Only the two that can actually fail. The feedback sheet is a promo with two
  // actions and no server round-trip, so there is no error to announce — asking
  // it for a live region would be cargo-culting.
  for (const file of [
    'src/components/modals/AuthRequiredModal.tsx',
    'src/components/modals/SubmitReportModal.tsx',
  ]) {
    ok(/role="alert"/.test(sources[file]), `${file} should announce form errors`);
  }
});

check('blocksScroll is overridden only by the overlays that own the lock', () => {
  // A blanket rule, because the failure it catches is quiet: a standalone sheet
  // that copies `blocksScroll={false}` from a shell overlay looks correct and
  // leaves the page scrolling underneath an open sheet, because nothing else in
  // the tree is holding the lock. The study-plan reset sheet had exactly this,
  // copied from the cart.
  const OWNERS = new Set([
    'src/components/checkout/CartModal.tsx',
    'src/components/modals/LeaderboardModal.tsx',
    'src/components/layout/MobileNavDrawer.tsx',
    'src/components/modals/SearchModal.tsx',
  ]);
  const offenders: string[] = [];
  for (const file of Object.keys(sources)) {
    if (!/blocksScroll=\{false\}/.test(sources[file])) continue;
    if (OWNERS.has(file)) continue;
    offenders.push(file);
  }
  eq(
    offenders.join(', '),
    '',
    'these opt out of the scroll lock without owning it'
  );
});

check('an irreversible confirmation focuses the safe action, not the destructive one', () => {
  // The reset sheet is opened by a button, and a phone with a Bluetooth keyboard
  // has a hardware Enter. If focus lands on "clear my plan", the same keystroke
  // that dismissed the sheet can confirm the deletion, and the action is
  // irreversible.
  //
  // The trigger is the sheet's own statement that the action cannot be undone,
  // not a red button. Colour was tried first and produced three false
  // positives - a login form, a report form and a cart all submit in red
  // without being destructive - which is the argument for keying the check off
  // the word that actually means "irreversible".
  const IRREVERSIBLE = /cannot be undone|can'?t be undone|cannot be reversed|no way to undo/i;
  const offenders: string[] = [];
  for (const file of Object.keys(sources)) {
    const src = sources[file];
    if (!/<Sheet\b/.test(src) || !IRREVERSIBLE.test(src)) continue;
    const focused = /<button[^>]*data-sheet-autofocus[^>]*>/.exec(src)?.[0] ?? '';
    if (!focused) {
      offenders.push(`${file}: an irreversible action, and no action takes focus`);
    } else if (/Clear|Delete|Remove|Wipe|Start over/i.test(focused)) {
      offenders.push(`${file}: focus is on the destructive action - one stray Enter would run it`);
    }
  }
  eq(offenders.join('\n      '), '', 'irreversible sheets must not autofocus their own confirm');
});

check('each overlay keeps the stacking order it had before', () => {
  // Search sat above the drawer, which sat above everything else. Losing that
  // puts the drawer behind a search overlay opened from inside it. Search is not
  // a Sheet, so it carries its z-index in a class rather than a prop.
  ok(
    /z-\[80\]/.test(sources['src/components/modals/SearchModal.tsx']),
    'search must stay on top'
  );
  ok(/zIndex=\{70\}/.test(sources['src/components/layout/MobileNavDrawer.tsx']), 'drawer must stay above the cart');
});

check('the drawer is mobile-only, backdrop included', () => {
  const src = sources['src/components/layout/MobileNavDrawer.tsx'];
  ok(/hideOnDesktop/.test(src), 'the drawer must pass hideOnDesktop');
  ok(
    /hideOnDesktop && 'md:hidden'/.test(sheet),
    'hideOnDesktop must hide the backdrop too, or desktop clicks land on an invisible scrim'
  );
  ok(/shadow-none/.test(src), '§6 asks for the drawer to drop its shadow');
});

check('no form control in a converted sheet can trigger an iOS zoom', () => {
  // Anything under 16px makes Safari focus-zoom the page, and the zoom persists
  // after blur. The overlays that gained a full-screen sheet are the ones at
  // risk, so they must set the font at 16px and drop back to 14px at md.
  for (const file of [
    'src/components/modals/AuthRequiredModal.tsx',
    'src/components/modals/SubmitReportModal.tsx',
  ]) {
    ok(
      /text-base md:text-(sm|\[14px\])/.test(sources[file]),
      `${file} must set inputs to 16px below md and step back down above it`
    );
    ok(/autoComplete=/.test(sources[file]), `${file} must set autocomplete for password managers`);
  }
});

check('pinned actions sit outside the scrolling area', () => {
  // `form=` on a button outside the <form> is how the footer submits without
  // nesting the whole panel in another element.
  for (const file of [
    'src/components/modals/AuthRequiredModal.tsx',
    'src/components/modals/SubmitReportModal.tsx',
  ]) {
    const src = sources[file];
    ok(/form=\{FORM_ID\}/.test(src), `${file} must submit via form= from its pinned footer`);
    ok(/id=\{FORM_ID\}/.test(src), `${file} must give the form a matching id`);
  }
});

if (fail > 0) {
  console.error(`\nsheet-conversion: ${pass} passed, ${fail} failed`);
  process.exit(1);
}
console.log(`sheet-conversion: ${pass} passed, ${fail} failed`);
