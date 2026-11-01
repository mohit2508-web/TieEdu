/**
 * Account tokens (reset / verify) and onboarding validation —
 * PROFESSIONAL_PLATFORM_PLAN §1.2–1.3.
 */
import { consumeAccountToken, issueAccountToken } from '../src/lib/accountTokens';
import { normaliseIndianMobile, OnboardingError, parseOnboarding } from '../src/lib/onboarding';

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, note = '') {
  if (cond) { pass++; console.log(`  ok   ${name}`); } else { fail++; console.log(`  FAIL ${name} ${note}`); }
}
const throws = (fn: () => unknown) => { try { fn(); return false; } catch (e) { return e instanceof OnboardingError; } };

const t0 = new Date('2026-11-01T10:00:00Z');
const db: any = {};

const reset = issueAccountToken(db, 'u1', 'reset', t0);
check('only a hash is stored', !JSON.stringify(db).includes(reset));
check('a wrong kind does not consume it', consumeAccountToken(db, reset, 'verify', t0) === null);
check('valid token returns the user', consumeAccountToken(db, reset, 'reset', t0) === 'u1');
check('a token works only once', consumeAccountToken(db, reset, 'reset', t0) === null);

const late = issueAccountToken(db, 'u1', 'reset', t0);
check('reset expires after 30 minutes', consumeAccountToken(db, late, 'reset', new Date(t0.getTime() + 31 * 60_000)) === null);

const a = issueAccountToken(db, 'u2', 'verify', t0);
const b = issueAccountToken(db, 'u2', 'verify', t0);
check('a newer token voids the older one', consumeAccountToken(db, a, 'verify', t0) === null);
check('the newer token still works', consumeAccountToken(db, b, 'verify', t0) === 'u2');
check('garbage is rejected', consumeAccountToken(db, 'short', 'verify', t0) === null);

check('mobile: plain 10 digits', normaliseIndianMobile('98765 43210') === '+919876543210');
check('mobile: +91 prefix', normaliseIndianMobile('+91-9876543210') === '+919876543210');
check('mobile: leading 0', normaliseIndianMobile('09876543210') === '+919876543210');
check('mobile: landline-like rejected', normaliseIndianMobile('1234567890') === null);

const ok = parseOnboarding({ grad_year: 2028, branch: 'cse', interests: ['dsa', 'nope', 'dsa'], notify: { email: true, push: false, whatsapp: true }, whatsapp_number: '9876543210' }, t0);
check('year kept', ok.grad_year === 2028);
check('unknown and duplicate interests dropped', JSON.stringify(ok.interests) === '["dsa"]');
check('whatsapp number normalised, unverified', ok.whatsapp?.number === '+919876543210' && ok.whatsapp.verified === false);
check('same number keeps verification', parseOnboarding({ notify: { whatsapp: true }, whatsapp_number: '9876543210' }, t0, { number: '+919876543210', verified: true }).whatsapp?.verified === true);
check('whatsapp off clears the number', parseOnboarding({ notify: { whatsapp: false } }, t0).whatsapp === null);
check('bad year rejected', throws(() => parseOnboarding({ grad_year: 1999 }, t0)));
check('bad branch rejected', throws(() => parseOnboarding({ branch: 'arts' }, t0)));
check('whatsapp on without a number rejected', throws(() => parseOnboarding({ notify: { whatsapp: true } }, t0)));

console.log(`\naccount-flows: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
