// ============================================================================
// Parent WhatsApp updates (lib/parentWhatsapp, lib/whatsapp). Double consent
// (student switch + parent opt-in), every way it stops, the one-line summary
// in Hindi and English from real numbers only, the weekly plan, and the
// provider request shape. No test sends anything; fetch is stubbed.
// ============================================================================

import {
  adminSummary, buildWeeklyMessage, endOnLinkChange, isSendWindow, markSent, maskPhone, normalisePhone, ParentWaError,
  parentWaStatus, planWeekly, setStudentAllowed, subscribeParent, unsubscribeParent, weeklySummary,
} from '../src/lib/parentWhatsapp';
import { sendTemplate, whatsappConfigured } from '../src/lib/whatsapp';

let pass = 0;
let fail = 0;
function check(name: string, actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) pass++;
  else {
    fail++;
    console.log(`FAIL ${name}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
  }
}
function rejects(name: string, fn: () => unknown, status?: number) {
  try { fn(); fail++; console.log(`FAIL ${name}: accepted`); } catch (e) {
    check(name, e instanceof ParentWaError && (status === undefined || (e as ParentWaError).status === status), true);
  }
}

const TOKEN = 'tok_abcdefghijklmnopqrstuvwxyz';
const SUNDAY = new Date('2026-11-01T05:00:00Z'); // Sunday 10:30 IST
const mkDb = (): any => ({ users: [{ id: 'u1', name: 'Rahul Sharma', email: 'r@x.test', parent_link: { token: TOKEN, created_at: '2026-10-01T00:00:00Z' } }] });
const user = (db: any) => db.users[0];

// --- phone numbers ------------------------------------------------------------------------
{
  check('10 digits', normalisePhone('98765 43210'), '919876543210');
  check('+91 with spaces', normalisePhone('+91 98765-43210'), '919876543210');
  check('leading 0', normalisePhone('09876543210'), '919876543210');
  check('landline-like rejected', normalisePhone('0112345678'), null);
  check('starts with 5 rejected', normalisePhone('5876543210'), null);
  check('masked', maskPhone('919876543210'), '+91 98••••••10');
}

// --- consent ------------------------------------------------------------------------------
{
  const db = mkDb();
  rejects('bad token', () => parentWaStatus(db, 'short'), 404);
  check('off until the student allows it', parentWaStatus(db, TOKEN).allowed, false);
  rejects('parent cannot subscribe before the student allows', () => subscribeParent(db, TOKEN, { phone: '9876543210', consent: true }), 403);
  setStudentAllowed(user(db), true);
  rejects('consent tick required', () => subscribeParent(db, TOKEN, { phone: '9876543210' }), 400);
  rejects('valid number required', () => subscribeParent(db, TOKEN, { phone: '12345', consent: true }), 400);
  const st = subscribeParent(db, TOKEN, { phone: '9876543210', lang: 'hi', consent: true }, SUNDAY);
  check('subscribed, number masked in the response', st.subscribed?.phone, '+91 98••••••10');
  check('the full number never comes back', JSON.stringify(st).includes('9876543210'), false);
  check('unknown language falls back to Hindi', subscribeParent(db, TOKEN, { phone: '9876543210', lang: 'fr', consent: true }).subscribed?.lang, 'hi');

  unsubscribeParent(db, TOKEN);
  check('parent stop link ends it', user(db).parent_whatsapp, null);
  subscribeParent(db, TOKEN, { phone: '9876543210', consent: true });
  setStudentAllowed(user(db), false);
  check('student switching off ends it', user(db).parent_whatsapp, null);
  setStudentAllowed(user(db), true);
  subscribeParent(db, TOKEN, { phone: '9876543210', consent: true });
  endOnLinkChange(user(db));
  check('replacing or turning off the link ends it', user(db).parent_whatsapp, null);
}

// --- the summary ---------------------------------------------------------------------------
{
  const view = (tests: number, lessons: number, streak: number, companies: any[] = []) =>
    ({ first_name: 'Rahul', year: null, streak: { current: streak, best: streak }, weeks: [{ from: '', to: '', tests, lessons }], certificates: [], companies, next_step: '' }) as any;
  const infy = [{ name: 'Infosys', readiness: 62, cleared: 1, rounds: 3 }];
  const hi = weeklySummary(view(4, 6, 5, infy), 'hi', { Infosys: 50 });
  check('Hindi summary', hi.summary, 'इस हफ़्ते Rahul ने 4 टेस्ट और 6 पाठ पूरे किए। लगातार 5 दिन से अभ्यास जारी है। Infosys की तैयारी: 62% (पिछले हफ़्ते से 12% ज़्यादा)।');
  const en = weeklySummary(view(1, 0, 1, infy), 'en', {});
  check('English summary; no change claimed without last week’s number', en.summary, 'This week Rahul completed 1 test. Infosys readiness: 62%.');
  check('nothing done is said plainly', weeklySummary(view(0, 0, 0), 'hi', {}).summary, 'इस हफ़्ते कोई अभ्यास दर्ज नहीं हुआ।');
  check('a fall is reported as a fall', weeklySummary(view(1, 1, 0, infy), 'en', { Infosys: 70 }).summary.includes('down 8% from last week'), true);
  check('readiness remembered for next week', hi.readiness, { Infosys: 62 });
  check('summary is one line (template rule)', /\n/.test(hi.summary), false);
}

// --- the weekly plan ------------------------------------------------------------------------
{
  check('window: Sunday 10:30 IST', isSendWindow(SUNDAY), true);
  check('not Sunday 09:00 IST', isSendWindow(new Date('2026-11-01T03:30:00Z')), false);
  check('not Saturday', isSendWindow(new Date('2026-10-31T06:00:00Z')), false);

  const db = mkDb();
  setStudentAllowed(user(db), true);
  check('no subscriber, nothing planned', planWeekly(db, 'https://site.test', SUNDAY).length, 0);
  subscribeParent(db, TOKEN, { phone: '9876543210', lang: 'en', consent: true }, SUNDAY);
  const plan = planWeekly(db, 'https://site.test/', SUNDAY);
  check('one message planned', plan.length, 1);
  const m = plan[0];
  check('to the parent’s number', m.phone, '919876543210');
  check('links point at the parent page and its stop link', [m.params[2], m.params[3]], [`https://site.test/parent/${TOKEN}`, `https://site.test/parent/${TOKEN}?stop=1`]);
  check('full text fills the template', m.text.startsWith('Hello! Rahul’s week on TieEdu:') && m.text.includes('To stop these messages:'), true);
  check('no email in the message', m.text.includes('r@x.test'), false);
  markSent(db, m);
  check('once a week', planWeekly(db, 'https://site.test', SUNDAY).length, 0);
  check('again next week', planWeekly(db, 'https://site.test', new Date(SUNDAY.getTime() + 7 * 86_400_000)).length, 1);
  user(db).disabled = true;
  check('disabled accounts are skipped', planWeekly(db, 'https://site.test', new Date(SUNDAY.getTime() + 7 * 86_400_000)).length, 0);
  user(db).disabled = false;
  user(db).parent_whatsapp_allowed = false;
  check('no message without the student’s switch, even if data lingers', buildWeeklyMessage(db, user(db), 'https://site.test', SUNDAY), null);
  user(db).parent_whatsapp_allowed = true;

  const a = adminSummary(db, 'https://site.test', false, SUNDAY);
  check('admin: off and not configured by default', [a.enabled, a.configured, a.subscribers], [false, false, 1]);
  check('admin preview hides the number and the private link', [a.preview[0].text.includes('9876543210'), a.preview[0].text.includes(TOKEN), a.preview[0].text.includes('[stop link]')], [false, false, true]);
}

// --- provider -----------------------------------------------------------------------------------
(async () => {
  check('not configured without env', whatsappConfigured({}), false);
  const env = { WHATSAPP_TOKEN: 't', WHATSAPP_PHONE_NUMBER_ID: '123', WHATSAPP_TEMPLATE: 'weekly_update' } as any;
  check('configured with the three values', whatsappConfigured(env), true);
  let calls = 0;
  const none = await sendTemplate('919876543210', 'hi', ['a'], {}, (async () => { calls++; return new Response('{}'); }) as any);
  check('unconfigured send never calls out', [none.ok, calls], [false, 0]);

  let seen: any = null;
  const okFetch = (async (url: string, init: any) => { seen = { url, init }; return new Response(JSON.stringify({ messages: [{ id: 'wamid.1' }] }), { status: 200 }); }) as any;
  const r = await sendTemplate('919876543210', 'hi', ['Rahul', 'summary', 'p', 's'], env, okFetch);
  const body = JSON.parse(seen.init.body);
  check('sent', [r.ok, r.id], [true, 'wamid.1']);
  check('Cloud API endpoint', seen.url, 'https://graph.facebook.com/v21.0/123/messages');
  check('bearer token', seen.init.headers.Authorization, 'Bearer t');
  check('template message', [body.messaging_product, body.type, body.template.name, body.template.language.code], ['whatsapp', 'template', 'weekly_update', 'hi']);
  check('four body parameters', body.template.components[0].parameters.map((p: any) => p.text), ['Rahul', 'summary', 'p', 's']);
  const bad = await sendTemplate('919876543210', 'en', ['a'], env, (async () => new Response(JSON.stringify({ error: { message: 'Template not approved' } }), { status: 400 })) as any);
  check('provider error surfaced', [bad.ok, bad.error], [false, 'Template not approved']);
  const down = await sendTemplate('919876543210', 'en', ['a'], env, (async () => { throw new Error('ECONNRESET'); }) as any);
  check('network error surfaced, not thrown', [down.ok, down.error], [false, 'ECONNRESET']);

  console.log(`parent-whatsapp: ${pass} passed, ${fail} failed`);
  if (fail) process.exit(1);
})();
