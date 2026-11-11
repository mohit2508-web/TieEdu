/**
 * Practice polish (PRACTICE_POLISH_PLAN.md §2–3): "did you mean" on the 404 page,
 * error refs, and the app-open splash boot script.
 */
import { editDistance, suggestPath } from '../src/lib/didYouMean';
import { newErrorRef } from '../src/lib/clientErrors';
import { SPLASH_BOOT, SPLASH_CSS, SPLASH_MOUNT } from '../src/lib/splash';

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

console.log(`\npolish: ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
