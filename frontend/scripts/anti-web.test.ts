/**
 * Phase 8 - the anti-web sweep, as a regression net.
 *
 * MOBILE_APP_UI_PLAN.md §8 lists six things to delete and one to review. Each
 * check below encodes one of them, because every one of these is a property that
 * decays silently: someone adds a `window.confirm` to a new admin screen, or a
 * form is written with `text-sm` on a new page, and nothing fails. The value of
 * this file is not that it found something today - it is that it will notice the
 * next time.
 *
 * The "web tell" checks are deliberately scoped to the student-facing path.
 * `/admin` is a desktop-only, keyboard-driven surface; holding it to a phone
 * standard would generate churn with no user behind it. `admin` is excluded by
 * filename and by directory rather than by a list of paths, so a new admin
 * component is covered automatically instead of being forgotten.
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
function eq(actual: unknown, expected: unknown, note: string) {
  if (actual !== expected) throw new Error(`${note}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

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
const SRC = path.join(ROOT, 'src');

/**
 * Every source file, minus the admin surfaces.
 *
 * `editor/` and `admin/` are authoring tools: keyboard-driven, wide-screen, and
 * not in front of a student on a phone. `BlockEditorModal` alone has ~20 inputs
 * and putting it behind the same bar as a login form would mean the check
 * measures itself rather than the product.
 */
function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'admin' || entry.name === 'editor') continue;
      walk(full, out);
    } else if (/\.tsx?$/.test(entry.name)) {
      // Filename filter, and it has to cover `editor` as well as `admin`. The
      // rule above already names `BlockEditorModal` as authoring-only, but that
      // file lives in `components/modals/`, not in `editor/`, so an
      // admin-only filename filter let it through and the stated policy was not
      // the enforced one.
      if (/admin|editor/i.test(entry.name)) continue;
      out.push(full);
    }
  }
  return out;
}
const FILES = walk(SRC);
const read = (f: string) => fs.readFileSync(f, 'utf8');
const rel = (f: string) => path.relative(ROOT, f).replace(/\\/g, '/');

/*
  Blank out comments while preserving line numbering, so a check that reports
  `file:line` still points at the right place.

  This is not optional tidiness. Several of the fixes in this file are explained
  in comments that quote the exact markup they removed — `cursor-pointer` on a
  `<div onClick>`, `opacity-0 group-hover:opacity-100` — and a scanner that reads
  the comments reports the fix as a live offender. That already happened once:
  the `cursor-pointer` check failed on its own explanatory comment.
*/
function stripComments(src: string): string {
  let out = '';
  let i = 0;
  const blank = (chunk: string) => chunk.replace(/[^\n]/g, ' ');
  while (i < src.length) {
    const two = src.slice(i, i + 2);
    if (two === '/*') {
      const end = src.indexOf('*/', i + 2);
      const stop = end === -1 ? src.length : end + 2;
      out += blank(src.slice(i, stop));
      i = stop;
    } else if (two === '//') {
      let end = src.indexOf('\n', i);
      if (end === -1) end = src.length;
      out += blank(src.slice(i, end));
      i = end;
    } else {
      out += src[i];
      i += 1;
    }
  }
  return out;
}

/** Every `<input`/`<textarea`/`<select` opening tag in the student path. */
function fieldTags(): { file: string; tag: string }[] {
  const out: { file: string; tag: string }[] = [];
  for (const f of FILES) {
    const src = read(f);
    for (const m of src.matchAll(/<(input|textarea|select)\b[^>]*>/g)) {
      out.push({ file: rel(f), tag: m[0] });
    }
  }
  return out;
}

// ------------------------------------------------- no native dialogs (§8) ----

check('no window.alert / confirm / prompt on a student-facing page', () => {
  const offenders: string[] = [];
  for (const f of FILES) {
    const src = read(f);
    if (/\bwindow\.(alert|confirm|prompt)\s*\(/.test(src)) offenders.push(rel(f));
    /* A bare `confirm(` is the same call - `confirm` resolves to the global. */
    if (/(?<![.\w])(alert|confirm|prompt)\s*\(/.test(src)) offenders.push(rel(f) + ' (bare call)');
  }
  eq(offenders.join(', '), '', 'these still use a native dialog');
});

check('the study-plan reset is confirmed in a sheet, not a dialog', () => {
  const src = read(path.join(SRC, 'pages', 'study-plan.tsx'));
  ok(/<Sheet/.test(src), 'the destructive action must use the shared sheet');
  ok(/confirmReset/.test(src), 'and be gated behind a confirmation state');
  ok(
    /data-sheet-autofocus/.test(src),
    'focus lands on the action rather than the scrim, so a stray Enter cannot dismiss it'
  );
});

// ------------------------------------------------------ no print (§8) -------

check('no window.print anywhere in the app', () => {
  const offenders = FILES.filter((f) => /window\.print/.test(read(f))).map(rel);
  eq(offenders.join(', '), '', 'window.print renders the browser chrome, not the app');
});

// --------------------------------------------- hover scoping (§8) ----------

check('hover styling is scoped to devices that have a pointer', () => {
  const css = read(path.join(ROOT, 'src', 'styles', 'globals.css'));
  ok(
    /@media \(hover: none\)/.test(css),
    'Phase 8 requires the :hover rules neutralised on touch - iOS latches :hover on tap'
  );
  ok(
    !/@media \(pointer: coarse\)\s*\{[^}]*:hover/.test(css),
    'keying hover on pointer:coarse would strip hover from touch laptops that have a mouse'
  );
});

check('every Tailwind hover: variant is gated behind (hover: hover)', () => {
  // The globals.css checks above only cover hand-written CSS. They said nothing
  // about the 349 `hover:` variants in `src/`, and by default Tailwind emits
  // them ungated, so all of them were live on touch: an iOS tap latches
  // `:hover` until the next tap elsewhere, leaving a card in its hover colour
  // with the finger already lifted, and a `hover:scale` card visibly raised.
  const tw = require(path.join(ROOT, 'tailwind.config.js'));
  ok(
    tw.future && tw.future.hoverOnlyWhenSupported === true,
    'tailwind.config.js must set future.hoverOnlyWhenSupported, or `hover:` compiles ungated'
  );
  ok(
    tw.future && tw.future.hoverOnlyWhenSupported !== 'media-hover-none',
    'hoverOnlyWhenSupported must be the boolean `true`: the "media-hover-none" variant gates on devices that cannot hover at all, which is stricter than wanted and strips hover from a touch laptop driving a trackpad'
  );

  // Nothing in `src/` may rely on hover to *convey* information - a control that
  // only appears on hover never reaches a touch user at all, which is a Phase 8
  // violation ("no :hover-only information") independent of the gating above.
  //
  // Matched on the *reveal* half of the pair, not the hiding half: the lightbox
  // affordance in `ContentBlockRenderer` was `opacity-0 group-hover:opacity-100`,
  // and a check written as `hover:opacity-0` misses it outright, because the class
  // that reveals it is the `opacity-100` one. That is how this shipped.
  //
  // A reveal is allowed to be purely decorative - a hover glow, a hairline - so
  // each exemption has to be listed with a reason, the same rule the plain-`<img>`
  // suppressions in `image-policy.test.ts` follow. An unlisted one fails.
  const DECORATIVE_HOVER_REVEAL: Record<string, string> = {
    'src/components/company/CompanyCard.tsx':
      'opacity-0 group-hover:opacity-10 on a 3px gradient hairline along the card top. Purely decorative; the card is fully labelled and actionable without it, and it is the only affordance hint on a touch surface that already has a press state.',
  };
  const REVEAL_ON_HOVER = /(?:^|\s)(?:group|peer|sm|md|lg|xl|dark):hover:(opacity-\d+|invisible|visible|block|flex|grid)\b/g;
  for (const file of FILES) {
    const text = read(file);
    for (const m of text.matchAll(REVEAL_ON_HOVER)) {
      // The rule only bites when something is hidden until hover, so require a
      // paired zero-opacity state on the same element.
      const line = text.slice(0, m.index).split('\n').length;
      const element = text.split('\n')[line - 1] || '';
      if (!/(^|\s)opacity-0\b/.test(element)) continue;
      const key = rel(file).replace(/\\/g, '/');
      const reason = DECORATIVE_HOVER_REVEAL[key];
      if (!reason) {
        throw new Error(
          `${key}:${line} reveals content only on hover (${m[0].trim()}) with no written exemption. ` +
            'Content that appears on hover is invisible to every touch user - make it always visible, or list it in DECORATIVE_HOVER_REVEAL with a reason.'
        );
      }
      ok(true, `${key}:${line} hover-only reveal is exempt and documented - ${reason.slice(0, 60)}...`);
    }
  }
});

check('every student-facing overlay is the Sheet primitive, not a hand-rolled one', () => {
  // The two overlays this replaces were not found by reading the plan - they were
  // found because the Sheet conversion count was checked, not because anything
  // failed. A hand-rolled `fixed inset-0` overlay has no `role="dialog"`, no
  // focus trap, no Escape and no scroll lock, and nothing in the suite notices,
  // because a suite that only counts `<Sheet` calls is satisfied by having some.
  //
  // Scoped the same way as the rest of this file: authoring surfaces excluded.
  const ALLOWED_FIXED = /(Sheet|RouteTransition|sw\.js)/;
  for (const file of FILES) {
    const rel_ = rel(file);
    if (/(^|\/)(admin|editor)\//i.test(rel_) || /admin/i.test(rel_.split('/').pop() || '')) continue;
    const text = read(file);
    for (const m of text.matchAll(/className="[^"]*fixed inset-0[^"]*"/g)) {
      // A scrim with no panel is fine (a dimmer); a panel is the problem.
      const after = text.slice(m.index, m.index + 400);
      const hasPanel = /role="dialog"|aria-modal|<Sheet/.test(after);
      if (hasPanel) continue;
      throw new Error(
        `${rel_} paints a fixed overlay that is not the Sheet primitive. ` +
          'It needs role="dialog", a focus trap, Escape and a scroll lock - or use <Sheet>.'
      );
    }
  }
  ok(ALLOWED_FIXED.test('Sheet'), 'the Sheet primitive is the sanctioned overlay');
});

check('the compiled stylesheet has no ungated hover utility', () => {
  // The config check above only asserts an intent. This asserts the output, which
  // is the thing that actually ships: a build that ignores the flag looks
  // identical from the source side, and grepping the bundle for `hover:hover`
  // cannot separate gated from ungated, because ungated rules just sit in a
  // sibling block.
  //
  // Opt-in via VERIFY_BUILD=1, because it reads a build artefact. Leaving it on
  // would make the suite depend on a *fresh* build: the check reads `.next`, and
  // a stale build predating the flag fails it for a reason that has nothing to
  // do with the current source. (It did exactly that, on a `.next` left over from
  // before the flag was set.) So the suite stays build-independent and the
  // post-build step opts in.
  if (process.env.VERIFY_BUILD !== '1') return;
  const distDir = process.env.NEXT_DIST_DIR || '.next';
  const cssDir = path.join(ROOT, distDir, 'static', 'css');
  if (!fs.existsSync(cssDir)) {
    throw new Error(`VERIFY_BUILD=1 but there is no stylesheet at ${rel(cssDir)}; run a build first`);
  }
  // Uses postcss (already present as a Next dependency) rather than regex
  // counting, because a hand-rolled brace walker gets this wrong: the `}` that
  // closes a leaf rule inside a gated block is indistinguishable from the `}`
  // that closes the block, so a naive scan reports the whole block as ungated.
  const postcss = require(require.resolve('postcss', { paths: [ROOT] }));
  let gated = 0;
  const ungated: string[] = [];
  // postcss is resolved at runtime (it ships with Next rather than being a
  // declared dependency), so its types are not in the program here.
  type Rule = { selector: string; parent?: { type: string; params: string } | null };
  for (const name of fs.readdirSync(cssDir).filter((f) => f.endsWith('.css'))) {
    const root = postcss.parse(fs.readFileSync(path.join(cssDir, name), 'utf8')) as {
      walkRules: (cb: (rule: Rule) => void) => void;
    };
    root.walkRules((rule: Rule) => {
      const isGated =
        rule.parent?.type === 'atrule' && /hover:\s*hover/.test(rule.parent.params);
      for (const m of rule.selector.matchAll(/\.((?:group-)?hover\\:[^\s,>+~]+)/g)) {
        if (isGated) gated += 1;
        else ungated.push(m[1]);
      }
    });
  }
  ok(gated > 0, `expected the build to gate hover utilities, found none gated (distDir=${distDir})`);
  eq(
    [...new Set(ungated)].join(', '),
    '',
    'these hover utilities reached the stylesheet without a (hover:hover) gate, so they are live on touch'
  );
});

/*
  Exactly one viewport tag per page, and it must carry `viewport-fit=cover`.

  This page shipped two of them for a while: Next's Pages Router seeds every head
  with `defaultHead()` (`next/dist/shared/lib/head.js`), which pushes
  `<meta name="viewport" content="width=device-width">`, and the tag in
  `_document.tsx` was a *second* one because `next/document`'s `<Head>` does not
  dedupe. Which one a browser honours is not specified anywhere, so the
  notch handling was a coin flip — and the losing side is silent, since a page
  without `viewport-fit=cover` still renders perfectly and simply reports
  `env(safe-area-inset-*)` as `0px`, so nothing looks broken.

  The assertion is on the count, not on which tag wins, precisely because that is
  the part that cannot be determined from the source. One tag removes the
  question. Checking the emitted HTML is the only way to see the duplicate at
  all: a regex over `_document.tsx` cannot see the tag Next adds.
*/
check('the emitted head has exactly one viewport tag and it opts into viewport-fit=cover', () => {
  if (process.env.VERIFY_BUILD !== '1') return;
  const distDir = process.env.NEXT_DIST_DIR || '.next';
  const pagesDir = path.join(ROOT, distDir, 'server', 'pages');
  if (!fs.existsSync(pagesDir)) {
    throw new Error(`VERIFY_BUILD=1 but there are no built pages at ${rel(pagesDir)}; run a build first`);
  }
  const html = (function collect(dir: string): string[] {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const full = path.join(dir, e.name);
      return e.isDirectory() ? collect(full) : full.endsWith('.html') ? [full] : [];
    });
  })(pagesDir);
  ok(html.length > 0, `expected prerendered pages under ${rel(pagesDir)}, found none`);

  for (const file of html) {
    const tags = [...fs.readFileSync(file, 'utf8').matchAll(/<meta[^>]*\bname="viewport"[^>]*>/g)].map(
      (m) => m[0]
    );
    eq(
      tags.length,
      1,
      `${rel(file)} emits ${tags.length} viewport tags (${tags.join(' ')}); a second one makes ` +
        'which of them the browser honours undefined, and dropping viewport-fit=cover silently zeroes the safe-area insets'
    );
    ok(
      /viewport-fit=cover/.test(tags[0]),
      `${rel(file)} has a viewport tag without viewport-fit=cover, so the safe-area insets will read 0px: ${tags[0]}`
    );
  }
  ok(true, `all ${html.length} prerendered pages emit exactly one viewport tag with viewport-fit=cover`);
});

check('cursor-pointer is only on elements that are not already clickable', () => {
  // `cursor-pointer` is a *lie detector* in reverse: it claims an element is
  // clickable. On a real `<button>` it is redundant, because every UA already
  // paints a pointer. On a `<label for>` or a `<summary>` it is correct and
  // load-bearing, because neither is natively clickable — the label forwards to
  // its control, and stripping the class leaves text that looks like a heading.
  //
  // The failure this guards is a control that only *looks* interactive: a
  // `<div onClick>` or a click handler on a `<span>`, where the class is
  // covering up the absence of a real button. Keyboard users never reach it and
  // the affordance is a lie. The fix is to make it a `<button>`, not to delete
  // the class — deleting it hides the bug rather than removing it.
  const offenders: string[] = [];

  for (const file of FILES) {
    const text = stripComments(read(file));
    for (const m of text.matchAll(/cursor-pointer/g)) {
      /*
        The enclosing tag is the nearest `<` followed by a letter before the
        match, NOT "the text back to the previous `>`". A JSX attribute list
        contains `=>` in every event handler, so a `>`-delimited scan stops
        inside the attribute and reports nothing — which is how this check
        passed on an injected `<div onClick={() => undefined} cursor-pointer>`.
        A raw `<` cannot occur inside a JSX tag, so looking back for it is
        unambiguous.
      */
      const before = text.slice(0, m.index);
      const open = before.lastIndexOf('<');
      const tagMatch = /<([a-zA-Z][\w.]*)/.exec(before.slice(open));
      if (!tagMatch) continue; // a class named in prose, not a tag
      const tag = tagMatch[1];

      // A `<label>` pointing at a control, and `<summary>` inside `<details>`,
      // are the two cases where the class is doing honest work.
      if (tag === 'label' || tag === 'summary') continue;
      if (tag === 'input') continue; // UA already paints a pointer on a checkbox

      const line = text.slice(0, m.index).split('\n').length;
      offenders.push(`${rel(file)}:${line} <${tag}> is styled clickable but is not a button`);
    }
  }

  eq(
    offenders.join('; '),
    '',
    'these elements claim to be clickable without being a button - make them <button>, otherwise the ' +
      'class is hiding an unreachable control rather than adding affordance'
  );
  ok(true, 'no element uses cursor-pointer to fake interactivity');
});

check('the touch input floor is present and is not a blanket pointer:coarse rule', () => {
  const css = read(path.join(ROOT, 'src', 'styles', 'globals.css'));
  ok(
    /@media \(pointer: coarse\)[\s\S]{0,400}font-size: 16px !important/.test(css),
    'the 16px floor stops iOS zooming the viewport on focus'
  );
  // Checkboxes and radios have no text box to zoom; a blanket floor would resize
  // their boxes and break every custom checkbox in the app.
  ok(
    /input:not\(\[type='checkbox'\]\):not\(\[type='radio'\]\)/.test(css),
    'checkbox and radio must be excluded from the floor'
  );
});

// ------------------------------------------- keyboard attributes (§7) -----

check('a typed field asks the OS for the right keyboard', () => {
  // Precisely what the plan asks for, and no more. `inputMode` on a free-text
  // comment is meaningless - the default keyboard is the right one - so the
  // check is keyed to the fields whose *type* implies a keyboard, rather than
  // demanding an attribute everywhere.
  //
  // `type="date"` is deliberately absent from this table. A native date input
  // already opens a wheel picker on iOS, and `inputMode` on one is either
  // ignored or - on some engines - suppresses the picker in favour of a keypad.
  const RULES: [RegExp, string][] = [
    [/type="email"/, 'email'],
    [/type="tel"/, 'tel'],
    [/type="url"/, 'url'],
    [/type="number"/, 'numeric'],
  ];
  const offenders: string[] = [];
  for (const f of FILES) {
    for (const m of read(f).matchAll(/<(?:input|select|textarea)\b[^>]*>/g)) {
      const tag = m[0];
      for (const [typeRe, mode] of RULES) {
        if (!typeRe.test(tag)) continue;
        if (!new RegExp(`inputMode="${mode}"`).test(tag)) {
          offenders.push(`${rel(f)}: ${typeRe.source} without inputMode="${mode}"`);
        }
      }
    }
  }
  eq(offenders.join('\n      '), '', 'these get the default keyboard instead of the right one');
});

check('no field asks for a keyboard that contradicts its type', () => {
  // `type="email"` with `inputMode="numeric"` is a worse bug than a missing
  // attribute: the student literally cannot type the "@".
  const offenders: string[] = [];
  for (const f of FILES) {
    for (const m of read(f).matchAll(/<input\b[^>]*>/g)) {
      const tag = m[0];
      const type = /type="(\w+)"/.exec(tag)?.[1];
      const mode = /inputMode="(\w+)"/.exec(tag)?.[1];
      if (!type || !mode) continue;
      const expected: Record<string, string> = { email: 'email', tel: 'tel', url: 'url', number: 'numeric' };
      if (expected[type] && expected[type] !== mode) {
        offenders.push(`${rel(f)}: type="${type}" with inputMode="${mode}"`);
      }
    }
  }
  eq(offenders.join('\n      '), '', 'a contradictory inputMode makes the field unusable');
});

check('identity fields declare what they are, so autofill works', () => {
  // The plan calls out `AuthRequiredModal` specifically: with only
  // `type="email"` there is no Keychain fill and no SMS one-time-code offer.
  const offenders: string[] = [];
  for (const f of FILES) {
    for (const m of read(f).matchAll(/<input\b[^>]*>/g)) {
      const tag = m[0];
      const type = /type="(\w+)"/.exec(tag)?.[1];
      if (type !== 'email' && type !== 'tel' && type !== 'password') continue;
      if (!/autoComplete=/.test(tag)) offenders.push(`${rel(f)}: type="${type}" with no autoComplete`);
    }
  }
  eq(offenders.join('\n      '), '', 'these cannot be autofilled or saved to a keychain');
});

check('typed fields declare an autocomplete, including an explicit "off"', () => {
  // Free text - a comment, an essay, a search - correctly has no autocomplete,
  // because there is nothing for a keychain to remember. A *typed* field has to
  // declare one, and `off` is a declaration: it is what stops a coupon code
  // from being remembered as an email address.
  //
  // `date` is excluded for the same reason `inputMode` is: the native picker is
  // the autocomplete, and the value is never stored by a keychain.
  const offenders: string[] = [];
  for (const f of FILES) {
    for (const m of read(f).matchAll(/<input\b[^>]*>/g)) {
      const tag = m[0];
      const type = /type="(\w+)"/.exec(tag)?.[1];
      if (['checkbox', 'radio', 'hidden', 'search', 'date'].includes(type ?? '')) continue;
      if (!['email', 'tel', 'password', 'url'].includes(type ?? '')) continue;
      if (!/autoComplete=/.test(tag)) offenders.push(`${rel(f)}: type="${type}" has no autoComplete`);
    }
  }
  eq(offenders.join('\n      '), '', 'a typed field is missing autoComplete');
});

check('password fields declare which password they are', () => {
  const offenders: string[] = [];
  for (const f of FILES) {
    for (const m of read(f).matchAll(/<input[^>]*type="password"[^>]*>/g)) {
      // Both forms count: a literal `autoComplete="new-password"`, and the
      // expression form the auth sheet uses, where the attribute is a ternary on
      // which tab is open. Reading only the literal produced a false failure
      // against the one field in the app that had already got this right.
      const literal = /autoComplete="(current|new)-password"/.test(m[0]);
      const expression = /autoComplete=\{[^}]*'(current|new)-password'/.test(m[0]);
      if (!literal && !expression) {
        offenders.push(`${rel(f)}: ${m[0].slice(0, 70).replace(/\s+/g, ' ')}`);
      }
    }
  }
  eq(offenders.join('\n      '), '', 'a password manager cannot classify these');
});

// ------------------------------------------- touch targets (§8, §0.2) -------

check('the mobile bottom bars are pinned and clear the home indicator', () => {
  for (const f of ['src/components/company/ReaderActionBar.tsx', 'src/components/courses/CourseMobileActionBar.tsx']) {
    const src = read(path.join(ROOT, f));
    ok(/fixed inset-x-0 bottom-0/.test(src), `${f} must be pinned to the bottom edge`);
    ok(/var\(--safe-bottom\)/.test(src), `${f} must respect the home indicator`);
  }
  /* The bar is deliberately breakpoint-agnostic - it is a presentational
     container, and each caller decides whether it duplicates a desktop control.
     That belongs at the call site, so that is what is checked. */
  for (const f of ['src/components/courses/CoursePreviewShell.tsx', 'src/pages/courses/[slug].tsx']) {
    const src = read(path.join(ROOT, f));
    ok(/<CourseMobileActionBar/.test(src), `${f} must use the shared bar`);
    ok(/md:hidden/.test(src), `${f} must hide the bar from md up`);
  }
});

check('search appears once in the phone UI, not twice', () => {
  const home = read(path.join(ROOT, 'src/pages/index.tsx'));
  // The tab bar's slots are data, not markup, so the config is where the mobile
  // search affordance is declared.
  const nav = read(path.join(ROOT, 'src/lib/navConfig.ts'));
  const actions = nav.match(/MOBILE_TAB_ACTIONS[^=]*=\s*\[([^\]]*)\]/);
  ok(actions, 'MOBILE_TAB_ACTIONS must be a literal this test can read');
  ok(/'search'/.test(actions![1]), 'the tab bar must offer search on a phone');
  ok(/'cart'/.test(actions![1]), 'the tab bar must offer cart on a phone');

  // The top bar must not also offer search below `lg`, or the phone has two.
  // The `!` is required for this to actually work - see the cascade check below.
  const header = read(path.join(ROOT, 'src/components/layout/Header.tsx'));
  ok(
    /className="nav-search !hidden lg:flex"/.test(header),
    'the header search field must be hidden below lg'
  );

  // The drawer is the nav below md, so search has to be reachable there too.
  const drawer = read(path.join(ROOT, 'src/components/layout/MobileNavDrawer.tsx'));
  ok(/'search'/.test(drawer), 'the drawer must still reach search on mobile');

  // The hero field filters the company grid and has no mobile counterpart, so it
  // is hidden below md rather than removed: the state stays wired and the desktop
  // layout is unchanged.
  const hero = home.match(/<div className="[^"]*max-w-xl relative pt-2[^"]*">[\s\S]{0,2000}?<\/div>/);
  ok(hero, 'the hero search wrapper must still exist');
  ok(
    /hidden md:block/.test(hero![0]),
    'the hero search must be hidden below md so it does not double up with anything'
  );
  ok(/value=\{searchQuery\}/.test(home), 'the grid filter must stay wired to the query');
});

check('a signed-out phone can reach both auth routes', () => {
  /*
   * Regression guard. Sign in and Sign up were once `md:inline-flex` on the
   * theory that the drawer covered small screens - but the drawer only offered
   * "Sign in", so the effect was that `/signup` had no link at all below `md`.
   *
   * The header now carries a single "Sign in" button; "Sign up" lives in the
   * drawer, which is reachable from every phone width via the hamburger.
   */
  ok(fs.existsSync(path.join(ROOT, 'src/pages/signup.tsx')), '/signup page must exist');
  ok(fs.existsSync(path.join(ROOT, 'src/pages/login.tsx')), '/login page must exist');

  const menu = read(path.join(ROOT, 'src/components/layout/AccountMenu.tsx'));
  ok(/href="\/login"/.test(menu), 'the header must offer a sign-in link');
  // One button only: the phone header row has no room for a pair.
  ok(
    !/href="\/signup"/.test(menu),
    'the header must not carry a sign-up link as well - the phone row cannot fit both'
  );

  const drawer = read(path.join(ROOT, 'src/components/layout/MobileNavDrawer.tsx'));
  ok(/href="\/login"/.test(drawer), 'the drawer must offer sign in');
  ok(/href="\/signup"/.test(drawer), 'the drawer must offer sign up');

  // The bell is part of the agreed header inventory (logo, bell, leaderboard,
  // profile/sign-in), so it must not be gated behind auth.
  const header = read(path.join(ROOT, 'src/components/layout/Header.tsx'));
  ok(
    /<NotificationBell \/>/.test(header) && !/user && <NotificationBell/.test(header),
    'the notification bell belongs in the header whether or not anyone is signed in'
  );
});

check('the phone header carries exactly the agreed inventory', () => {
  /*
   * Top bar: logo, bell, leaderboard, profile (or Sign in).
   * Bottom bar: vault, courses, study plan, cart, search.
   *
   * Search and cart belong to the bottom bar on a phone, so they must be absent
   * from the top bar there - and `!` is load-bearing, because `.nav-search` and
   * `.icon-btn` are unlayered and beat a bare `hidden`. See the cascade check.
   */
  const header = read(path.join(ROOT, 'src/components/layout/Header.tsx'));
  ok(/nav-search !hidden lg:flex/.test(header), 'top-bar search must be mobile-hidden');
  ok(/icon-btn !hidden lg:inline-flex/.test(header), 'top-bar cart must be mobile-hidden');
  ok(/<NotificationBell \/>/.test(header), 'the bell belongs in the top bar');
  ok(/chip chip--icon/.test(header), 'the leaderboard icon belongs in the top bar');

  /*
   * Bottom bar: three standing slots plus the action slots.
   *
   * `MOBILE_TABS` is derived (`ALL_NAV_ITEMS.filter(i => i.tab)`), so the ids
   * cannot be read off it as a literal. What matters is what the bar actually
   * renders, which is `MOBILE_TABS.slice(0, 3)` then every `MOBILE_TAB_ACTIONS`
   * entry - so the count is checked by counting, and the action list by parsing
   * the one literal in the file.
   */
  const nav = read(path.join(ROOT, 'src/lib/navConfig.ts'));
  const actions = nav.match(/MOBILE_TAB_ACTIONS[^=]*=\s*\[([^\]]*)\]/);
  ok(actions, 'MOBILE_TAB_ACTIONS must be a literal this test can read');
  for (const id of ['search', 'cart']) {
    ok(new RegExp(`'${id}'`).test(actions![1]), `the tab bar must offer ${id} on a phone`);
  }
  ok(
    (actions![1].match(/'/g) ?? []).length === 4,
    'the action list must be exactly search + cart - nothing else fits five slots in 320px'
  );

  // The three standing slots, in order, come from the derived tab list.
  const bar = read(path.join(ROOT, 'src/components/layout/MobileTabBar.tsx'));
  ok(/MOBILE_TABS\.slice\(0,\s*3\)/.test(bar), 'the bar must render the first three tab slots');
  ok(/MOBILE_TAB_ACTIONS\.map/.test(bar), 'the bar must render every action slot');
  ok(
    /slots\.map/.test(bar) && /MOBILE_TAB_ACTIONS\.map/.test(bar),
    'both slot kinds must be rendered, or one of them is invisible'
  );
});

check('a custom chrome class cannot silently beat `hidden`', () => {
  /*
   * The regression: `.icon-btn` and `.nav-search` are unlayered rules that set
   * `display`, and this stylesheet has no `@layer`, so they sit later in the
   * built CSS than Tailwind's `.hidden` and win at equal specificity. Every
   * `className="icon-btn hidden lg:inline-flex"` in the app was therefore
   * permanently visible on a phone - the search field and the cart icon both sat
   * next to the logo, which is exactly what they were written to avoid.
   *
   * Class-name order in the markup changes nothing, because CSS source order is
   * what decides. So this checks the rule, not the intent: any custom class that
   * sets `display` must be paired with `!hidden`, never a bare `hidden`.
   *
   * The proper fix is to move these chrome classes into `@layer components` and
   * let the cascade order do it. That is a whole-file change to `globals.css`
   * with a blast radius far larger than the two call sites broken here, so the
   * call sites carry `!` for now and this test stops it spreading.
   */
  // Comments are stripped first: this file's own prose about the cascade names
  // `@layer components` and `!hidden` by string, and a raw match would read the
  // explanation of the rule as a violation of it.
  const css = stripComments(read(path.join(ROOT, 'src/styles/globals.css')));
  ok(
    !/@layer\s+(components|utilities)/.test(css),
    'globals.css is assumed to be unlayered here; if it gains @layer, revisit this test'
  );

  // Custom classes that set `display`, from the stylesheet's own definitions.
  const displaySetters = new Set<string>();
  for (const m of css.matchAll(/\.([a-z][\w-]*)\s*\{[^}]*\bdisplay\s*:/g)) {
    displaySetters.add(m[1]);
  }
  ok(displaySetters.size > 0, 'the stylesheet should define some display-setting classes');

  const files: string[] = [];
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.tsx$/.test(e.name)) files.push(p);
    }
  };
  walk(path.join(ROOT, 'src'));

  const offenders: string[] = [];
  for (const f of files) {
    const src = read(f);
    for (const m of src.matchAll(/className="([^"]*)"/g)) {
      const tokens = m[1].split(/\s+/).filter(Boolean);
      // A bare `hidden` token, i.e. not a responsive variant like `md:hidden`.
      if (!tokens.includes('hidden')) continue;
      const clashing = tokens.filter((t) => displaySetters.has(t));
      if (clashing.length) offenders.push(`${path.relative(ROOT, f)}: ${m[1]}`);
    }
  }
  ok(
    offenders.length === 0,
    `these classNames pair a display-setting custom class with a bare \`hidden\`, which the cascade ignores - use !hidden:\n        ${offenders.join('\n        ')}`
  );

  // And the two call sites that were broken, pinned explicitly.
  const header = read(path.join(ROOT, 'src/components/layout/Header.tsx'));
  ok(/nav-search !hidden lg:flex/.test(header), 'the header search field needs !hidden');
  ok(/icon-btn !hidden lg:inline-flex/.test(header), 'the header cart needs !hidden');
});

check('the phone header carries the logo, bell, account and a bare leaderboard icon', () => {
  const header = read(path.join(ROOT, 'src/components/layout/Header.tsx'));
  const nav = read(path.join(ROOT, 'src/lib/navConfig.ts'));

  // No search field and no cart in a phone header. Both are desktop-only, and
  // both need `!` to stay that way - see the cascade check below.
  ok(/nav-search !hidden lg:flex/.test(header), 'the search field must stay desktop-only');
  ok(/icon-btn !hidden lg:inline-flex/.test(header), 'the cart must stay desktop-only');

  // The leaderboard was `hidden xl:inline-flex`, i.e. absent from every phone.
  // It is now an icon everywhere and only grows its label at `xl`.
  // Scoped to `className="..."` on purpose: the prose above the button explains
  // the old class by name, and a bare substring match would read that comment as
  // the code and pass forever.
  ok(
    !/className="[^"]*\bhidden xl:inline-flex/.test(header),
    'no header control may be hidden until xl any more'
  );
  ok(/chip chip--icon/.test(header), 'the leaderboard must use the icon-sized chip');
  const lb = header.match(/<button[\s\S]{0,300}?aria-label="Leaderboard"[\s\S]{0,300}?<\/button>/);
  ok(lb, 'the leaderboard button must exist');
  ok(
    /<span className="hidden font-bold xl:inline">Leaderboard<\/span>/.test(lb![0]),
    'the leaderboard label must only appear at xl, so a phone shows the icon alone'
  );
  ok(
    /\.chip--icon/.test(read(path.join(ROOT, 'src/styles/globals.css'))),
    '.chip--icon must exist, or the icon-only pill sits 25px tall next to 40px buttons'
  );

  // Identity and notifications stay, and the hamburger stays: it is the only way
  // to the primary nav below `md`, where `<nav>` is hidden.
  ok(/<NotificationBell/.test(header), 'the bell must be in the header');
  ok(/<AccountMenu/.test(header), 'the account control must be in the header');
  ok(/<MobileMenuButton/.test(header), 'the drawer button must survive - it is the mobile nav');
  ok(/hidden items-center gap-0\.5 md:flex/.test(header), 'primary nav links stay desktop-only');

  // One surface per action: the leaderboard moved into the header, so it must not
  // also be in the drawer the header's hamburger opens.
  const drawer = read(path.join(ROOT, 'src/components/layout/MobileNavDrawer.tsx'));
  const quick = drawer.match(/\(\[([^\]]*)\] as const\)\.map/);
  ok(quick, 'the drawer quick-action list must be readable');
  ok(!/leaderboard/.test(quick![1]), 'the leaderboard must not be in the drawer as well');
  ok(/'search'/.test(quick![1]), 'search must still be reachable from the drawer');
  ok(!/^export const MOBILE_TAB_ACTIONS[^\n]*'leaderboard'/m.test(nav), 'the tab bar must not duplicate the icon');
});

check('the admin console shows who is signed in and their notifications', () => {
  const admin = read(path.join(ROOT, 'src/components/admin/AdminCmsView.tsx'));
  const account = read(path.join(ROOT, 'src/components/layout/AccountMenu.tsx'));

  // `/admin/*` is excluded from the whole shell, so the CMS header is the only
  // chrome there. Without these two it offered a breadcrumb and a sync button,
  // which on a phone left no way to see who was signed in.
  ok(/<NotificationBell/.test(admin), 'the admin topbar needs the notification bell');
  ok(/<AccountMenu/.test(admin), 'the admin topbar needs the account control');

  // The shared component is the point: a second copy of this dropdown would be a
  // second thing to forget to update.
  const header = read(path.join(ROOT, 'src/components/layout/Header.tsx'));
  ok(/<AccountMenu/.test(header), 'the site header must use the same account control');
  ok(!/role="menu"/.test(header), 'the account menu markup must live in the shared component only');
  ok(/role="menu"/.test(account), 'the shared component must own the menu');

  // A search field in CMS chrome is the thing that was just removed elsewhere.
  ok(!/aria-label="Search vaults"/.test(admin), 'the admin chrome must not carry a search field');
});

check('the reader and lesson bars reserve space for themselves', () => {
  // A `fixed` bar with no matching spacer hides the last thing on the page.
  // Both arbitrary and unitless forms are in use: `h-[76px]` in the reader and
  // `h-28` in the lesson player. An earlier version of this check got the unit
  // group wrong - `px?` is a literal "p" with an optional "x", not an optional
  // "px" - so it matched the bracketed value and silently missed the unitless
  // one, reporting a missing spacer where the code was correct.
  const SPACER = /h-\[?\d+(?:px)?\]? md:hidden/;
  const reader = read(path.join(ROOT, 'src/components/company/CompanyModuleReader.tsx'));
  ok(SPACER.test(reader), 'the reader must pad for its action bar');
  const player = read(path.join(ROOT, 'src/components/courses/LessonPlayer.tsx'));
  ok(SPACER.test(player), 'the lesson player must pad for its next-lesson bar');
  const course = read(path.join(ROOT, 'src/pages/courses/[slug].tsx'));
  ok(/pb-40/.test(course), 'the course page must pad for the mobile bar');
});

// --------------------------------------- video inline playback (Phase 4) ----

check('embedded video asks the platform to stay inline', () => {
  const api = read(path.join(ROOT, '..', 'backend', 'src', 'lib', 'courses.ts'));
  ok(
    /playsinline=1/.test(api),
    'without this iOS tears the embed out of the page and takes over the screen'
  );
  const renderer = read(path.join(ROOT, 'src/components/blocks/ContentBlockRenderer.tsx'));
  ok(
    /<video[\s\S]{0,300}?playsInline/.test(renderer),
    'a bare <video> needs the attribute, not the URL param'
  );
  ok(
    /<video[\s\S]{0,300}?preload="metadata"/.test(renderer),
    'the default preload=auto downloads the whole file before a phone can play it'
  );
});

// --------------------------------------- stacked tables need their labels ----

check('the stacked table CSS is fed by the markdown transform', () => {
  const css = read(path.join(ROOT, 'src', 'styles', 'globals.css'));
  ok(/content: attr\(data-label\)/.test(css), 'a stacked cell must print its column header');
  const md = read(path.join(ROOT, 'src/components/blocks/MarkdownContent.tsx'));
  ok(/rehypeLabelTables|labelAllTables/.test(md), 'the transform must actually be wired in');
});

if (fail > 0) {
  console.error(`\nanti-web: ${pass} passed, ${fail} failed`);
  process.exit(1);
}
console.log(`anti-web: ${pass} passed, ${fail} failed`);
