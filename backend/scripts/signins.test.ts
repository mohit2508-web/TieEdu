/**
 * Sign-in limit (lib/signins) — EMAIL_LIFECYCLE_AND_DEVICES_PLAN §4.
 */
import { activeSignIns, checkSignInLimit, deviceNameFromUA, MAX_SIGNINS } from '../src/lib/signins';

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, note = '') {
  if (cond) { pass++; console.log(`  ok   ${name}`); } else { fail++; console.log(`  FAIL ${name} ${note}`); }
}

const UA = {
  chromeWin: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
  safariIphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  edge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 Edg/130.0',
  androidChrome: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36',
};
check('Chrome on Windows', deviceNameFromUA(UA.chromeWin) === 'Chrome on Windows');
check('Safari on iPhone', deviceNameFromUA(UA.safariIphone) === 'Safari on iPhone');
check('Edge is not mistaken for Chrome', deviceNameFromUA(UA.edge) === 'Edge on Windows');
check('Chrome on Android', deviceNameFromUA(UA.androidChrome) === 'Chrome on Android');
check('installed app', deviceNameFromUA(UA.androidChrome, true) === 'TieEdu app on Android');
check('no user agent', deviceNameFromUA('') === 'Unknown device');

const now = Date.parse('2026-11-02T10:00:00Z');
const iso = (minAgo: number) => new Date(now - minAgo * 60000).toISOString();
const future = new Date(now + 86400000 * 10).toISOString();
const sess = (id: string, family: string, minAgo: number, extra: any = {}) => ({
  id, user_id: 'u1', token_hash: id, created_at: iso(minAgo), expires_at: future, family, device_name: extra.device || 'Chrome on Windows', ...extra,
});

// One sign-in that rotated (old row in grace) + a second device = 2, not 3.
const sessions: any[] = [
  sess('a1', 'A', 60, { rotated_at: iso(1), signed_in_at: iso(600) }),
  sess('a2', 'A', 1, { signed_in_at: iso(600) }),
  sess('b1', 'B', 30, { device: 'Safari on iPhone' }),
  sess('x', 'X', 5, { user_id: 'someone-else' }),
  sess('old', 'O', 9000, { expires_at: iso(1) }),
];
const live = activeSignIns(sessions, 'u1', now);
check('a rotated sign-in counts once', live.length === 2, JSON.stringify(live.map((d) => d.id)));
check('newest activity first', live[0].id === 'A');
check('sign-in start comes from signed_in_at', live[0].signed_in_at === iso(600));
check('expired and other users ignored', !live.some((d) => d.id === 'O' || d.id === 'X'));

check(`under ${MAX_SIGNINS}: allowed`, checkSignInLimit('user', live.slice(0, 1), undefined).ok === true);
const blocked = checkSignInLimit('user', live, undefined);
check(`at ${MAX_SIGNINS}: refused with the device list`, blocked.ok === false && (blocked as any).devices.length === 2);
const chosen = checkSignInLimit('user', live, 'B');
check('choosing a device to sign out lets the login through', chosen.ok === true && (chosen as any).signOut === 'B');
check('choosing a device that is not theirs does not', checkSignInLimit('user', live, 'X').ok === false);
check('admins are exempt', checkSignInLimit('admin', live, undefined).ok === true);

console.log(`\nsignins: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
