/**
 * Practice polish (PRACTICE_POLISH_PLAN.md §2–3): "did you mean" on the 404 page,
 * error refs, and the app-open splash boot script.
 */
import { editDistance, suggestPath } from '../src/lib/didYouMean';
import { newErrorRef } from '../src/lib/clientErrors';
import { SPLASH_BOOT, SPLASH_CSS, SPLASH_MOUNT } from '../src/lib/splash';
import { firstDiff } from '../src/lib/outputDiff';
import { milestoneFor } from '../src/lib/milestones';
import { DEFAULT_SETTINGS, flipTheme, normaliseSettings, pickTheme, resolveTheme } from '../src/components/ide/ideSettings';
import { readFileSync } from 'fs';
import { join } from 'path';

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, note = '') {
  if (cond) { pass++; console.log(`  ok   ${name}`); } else { fail++; console.log(`  FAIL ${name} ${note}`); }
}

check('edit distance basics', editDistance('problm', 'problem') === 1 && editDistance('', 'abc') === 3 && editDistance('same', 'same') === 0);
check('typo in a static segment is fixed, slug kept', suggestPath('/practice/problm/tcs-a06') === '/practice/problem/tcs-a06', String(suggestPath('/practice/problm/tcs-a06')));
check('top-level typo', suggestPath('/praktice') === '/practice', String(suggestPath('/praktice')));
check('two-level typo', suggestPath('/practice/companis') === '/practice/companies', String(suggestPath('/practice/companies')));
check('query string ignored', suggestPath('/cources?x=1') === '/courses', String(suggestPath('/cources?x=1')));
check('nothing close → null', suggestPath('/zzzzzzzz') === null);
check('an exact route is not "corrected"', suggestPath('/practice') === null);
check('home → null', suggestPath('/') === null);

const refs = new Set(Array.from({ length: 200 }, () => newErrorRef()));
check('error refs look like ERR-XXXXXX and do not repeat', [...refs].every((r) => /^ERR-[A-Z2-9]{6}$/.test(r)) && refs.size === 200);

check('splash boot only runs for installed apps', /display-mode: standalone/.test(SPLASH_BOOT) && /source=pwa/.test(SPLASH_BOOT));
check('splash shows once per launch (sessionStorage)', /sessionStorage\.getItem\('tie_splash'\)/.test(SPLASH_BOOT));
check('splash has a hard stop', /setTimeout\(window\.__tieSplashHide,\d+\)/.test(SPLASH_MOUNT));
check('splash is hidden unless switched on', SPLASH_CSS.startsWith('#tie-splash{display:none}'));
check('splash boot is valid JS', (() => { try { new Function(SPLASH_BOOT); new Function(SPLASH_MOUNT); return true; } catch { return false; } })());

// IDE themes (§5.1)
check('old saved "dark" becomes One Dark, "light" Warm Paper', normaliseSettings({ theme: 'dark' }).theme === 'one-dark' && normaliseSettings({ theme: 'light' }).theme === 'warm');
check('junk settings fall back to defaults', JSON.stringify(normaliseSettings({ theme: 'neon', fontSize: 99, tabSize: 3 })) === JSON.stringify({ ...DEFAULT_SETTINGS, fontSize: 22 }));
check('auto follows the site', resolveTheme(DEFAULT_SETTINGS, false) === 'warm' && resolveTheme(DEFAULT_SETTINGS, true) === 'one-dark');
const dracula = pickTheme(DEFAULT_SETTINGS, 'dracula');
const flipped = flipTheme(dracula, false);
check('the switch flips light/dark and comes back to the last pick', flipped.theme === 'warm' && flipTheme(flipped, false).theme === 'dracula');

// Diff view (§5.2)
check('identical outputs (modulo trailing spaces/lines) → no diff', firstDiff('1 2 3  \n\n', '1 2 3') === null);
const d = firstDiff('10 20\n31', '10 20\n30');
check('first difference: line and column', !!d && d.line === 2 && d.col === 2 && d.got.startsWith('1') && d.want.startsWith('0'), JSON.stringify(d));
check('a missing line is named', firstDiff('a', 'a\nb')?.got === '(missing line)');

// The IDE's own theme scope must match globals.css (regenerate with: node scripts/gen-ide-scope.mjs)
const css = readFileSync(join(process.cwd(), 'src/styles/globals.css'), 'utf8');
const scope = readFileSync(join(process.cwd(), 'src/styles/ide-scope.css'), 'utf8');
const darkAt = css.search(/^:root\[data-theme='dark'\]\s*\{/m);
const darkBlock = css.slice(darkAt, css.indexOf('\n}', darkAt));
const pairs = [...darkBlock.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/(--rgb-[a-z0-9-]+)\s*:\s*([^;]+);/g)].map((m) => `${m[1]}: ${m[2].trim()};`);
const darkScope = scope.slice(scope.indexOf('.ide-scope.ide-dark'), scope.indexOf('.ide-scope.ide-light'));
const missing = pairs.filter((x) => !darkScope.includes(x));
check('ide-scope.css carries every dark token from globals.css', pairs.length > 20 && missing.length === 0, `${pairs.length} tokens; missing ${missing.slice(0, 3).join(' ')}`);

// Milestones (§7): only at 1, every 10th, and all
check('milestones: first, every 10th, all, and quiet otherwise', !!milestoneFor(1, 65) && !!milestoneFor(20, 65) && /all 65/.test(milestoneFor(65, 65) || '') && milestoneFor(7, 65) === null && milestoneFor(0, 65) === null);

console.log(`\npolish: ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
