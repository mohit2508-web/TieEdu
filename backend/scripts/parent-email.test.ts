// ============================================================================
// Weekly parent email (lib/parentEmail), to the platform owner's rule:
// student allows → parent asks → one confirmation email → nothing weekly
// until confirmed; an unconfirmed address is never mailed again; every
// message can unsubscribe; nothing is sent while the admin switch is off.
// The mailer is a stub — no test sends email.
// ============================================================================

import {
  confirmParentEmail, emailEnabled, markEmailSent, parentEmailStatus, ParentEmailError, planWeeklyEmails, requestParentEmail, stopParentEmail,
  type Mailer,
} from '../src/lib/parentEmail';

let pass = 0;
let fail = 0;
function check(name: string, actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) pass++;
  else {
    fail++;
    console.log(`FAIL ${name}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
  }
}
async function rejects(name: string, fn: () => Promise<unknown>, status?: number) {
  try { await fn(); fail++; console.log(`FAIL ${name}: accepted`); } catch (e) {
    check(name, e instanceof ParentEmailError && (status === undefined || (e as ParentEmailError).status === status), true);
  }
}

const LINK = 'tok_abcdefghijklmnopqrstuvwxyz';
const SUNDAY = new Date('2026-11-01T05:00:00Z');
const SITE = 'https://site.test';

(async () => {
  let store: any = { settings: {}, users: [{ id: 'u1', name: 'Rahul Sharma', parent_link: { token: LINK }, parent_whatsapp_allowed: false }] };
  const load = () => JSON.parse(JSON.stringify(store));
  const save = (db: any) => { store = JSON.parse(JSON.stringify(db)); };
  const sent: any[] = [];
  const mail: Mailer = async (m) => { sent.push(m); return { ok: true, error: null }; };
  const ask = (email: string, extra: any = {}) => requestParentEmail(load, save, LINK, { email, lang: 'en', consent: true, ...extra }, SITE, mail, SUNDAY);

  check('off by default', emailEnabled(store), false);
  check('not offered while off', parentEmailStatus(store, LINK).offered, false);
  await rejects('nothing sent while the admin switch is off', () => ask('mum@family.test'), 503);
  store.settings.parent_email_enabled = true;
  await rejects('student must allow updates first', () => ask('mum@family.test'), 403);
  store.users[0].parent_whatsapp_allowed = true;
  await rejects('consent tick required', () => ask('mum@family.test', { consent: false }), 400);
  await rejects('valid email required', () => ask('not-an-email'), 400);
  check('no email sent by any refusal', sent.length, 0);

  const st = await ask('Mum@Family.test');
  check('one confirmation sent, address lower-cased', [sent.length, sent[0].to], [1, 'mum@family.test']);
  check('confirmation carries confirm and unsubscribe links', /parent-email\/confirm\?t=/.test(sent[0].text) && /parent-email\/stop\?t=/.test(sent[0].text), true);
  check('status shows masked, unconfirmed', st.subscribed, { email: 'mu•@family.test', lang: 'en', confirmed: false });
  check('no weekly email before confirming', planWeeklyEmails(store, SITE, SUNDAY).length, 0);
  await rejects('an unconfirmed address is never mailed again', () => ask('mum@family.test'), 409);
  check('still only one email', sent.length, 1);

  const token = /confirm\?t=([\w-]+)/.exec(sent[0].text)![1];
  const db1 = load();
  check('confirm works', confirmParentEmail(db1, token, SUNDAY).confirmed, true);
  save(db1);
  const plan = planWeeklyEmails(store, SITE, SUNDAY);
  check('confirmed → weekly email planned', [plan.length, plan[0].to], [1, 'mum@family.test']);
  check('weekly email has the summary, page link and unsubscribe', [/This week|No practice/.test(plan[0].text), plan[0].text.includes(`/parent/${LINK}`), plan[0].text.includes('/parent-email/stop?t=')], [true, true, true]);
  const db2 = load(); markEmailSent(db2, plan[0]); save(db2);
  check('once a week', planWeeklyEmails(store, SITE, SUNDAY).length, 0);
  check('again next week', planWeeklyEmails(store, SITE, new Date(SUNDAY.getTime() + 7 * 86_400_000)).length, 1);
  store.users[0].parent_whatsapp_allowed = false;
  check('student switching off stops the weekly email', planWeeklyEmails(store, SITE, new Date(SUNDAY.getTime() + 7 * 86_400_000)).length, 0);
  store.users[0].parent_whatsapp_allowed = true;

  const db3 = load();
  check('unsubscribe', stopParentEmail(db3, token).stopped, true);
  save(db3);
  check('unsubscribed: nothing planned', planWeeklyEmails(store, SITE, new Date(SUNDAY.getTime() + 14 * 86_400_000)).length, 0);
  check('old unsubscribe link still answers', stopParentEmail(load(), token).stopped, true);
  check('a used token cannot confirm', (() => { try { confirmParentEmail(load(), token); return false; } catch { return true; } })(), true);

  // A different address after unsubscribing gets its own single confirmation.
  await ask('dad@family.test', { lang: 'hi' });
  check('new address, new single confirmation, in Hindi', [sent.length, sent[1].to, /पुष्टि करें/.test(sent[1].subject)], [2, 'dad@family.test', true]);

  console.log(`parent-email: ${pass} passed, ${fail} failed`);
  if (fail) process.exit(1);
})();
