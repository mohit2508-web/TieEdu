/**
 * The messaging rulebook (lib/messaging `decide`) — PROFESSIONAL_PLATFORM_PLAN §4.
 */
import { decide, isQuietHours, topicPrefs, type MessageEvent, type MessageLogRow } from '../src/lib/messaging';

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, note = '') {
  if (cond) { pass++; console.log(`  ok   ${name}`); } else { fail++; console.log(`  FAIL ${name} ${note}`); }
}

// 2026-11-01 06:30 UTC = 12:00 IST (not quiet). 18:00 UTC = 23:30 IST (quiet).
const noon = new Date('2026-11-01T06:30:00Z');
const night = new Date('2026-11-01T18:00:00Z');

const user = (extra: any = {}) => ({ id: 'u1', email: 'a@b.in', email_verified: true, notify: { email: true, push: true, whatsapp: false }, ...extra });
const ev = (extra: Partial<MessageEvent> = {}): MessageEvent => ({ type: 'x', topic: 'offers', transactional: false, title: 't', body: 'b', url: '/', ...extra });
const sent = (channel: 'email' | 'push' | 'whatsapp', hoursAgo: number, extra: Partial<MessageLogRow> = {}): MessageLogRow => ({
  id: Math.random().toString(36), user_id: 'u1', type: 'x', topic: 'offers', channel, status: 'sent', transactional: false,
  at: new Date(noon.getTime() - hoursAgo * 3_600_000).toISOString(), ...extra,
});

const receipt = ev({ topic: 'purchases', transactional: true });

check('quiet hours: 23:30 IST', isQuietHours(night));
check('quiet hours: 12:00 IST is not', !isQuietHours(noon));

// Required transactional email ignores every opt-out.
check('receipt emails even with email channel off', decide('email', receipt, user({ notify: { email: false, push: false, whatsapp: false } }), [], noon).send);
check('receipt emails even if topic email set off', decide('email', receipt, user({ notify_topics: { purchases: { email: false } } }), [], noon).send);
check('required topic email cannot be turned off in prefs', topicPrefs(user({ notify_topics: { account: { email: false } } })).account.email === true);

// Marketing rules.
check('marketing needs a verified email', decide('email', ev(), user({ email_verified: false }), [], noon).reason === 'email_unverified');
check('marketing respects channel off', decide('email', ev(), user({ notify: { email: false, push: true, whatsapp: false } }), [], noon).reason === 'channel_off');
check('marketing respects topic off', decide('email', ev(), user({ notify_topics: { offers: { email: false } } }), [], noon).reason === 'topic_off');
check('marketing: 1 per day', decide('email', ev(), user(), [sent('email', 3)], noon).reason === 'cap_day');
check('marketing: 3 per week', decide('email', ev(), user(), [sent('email', 30), sent('email', 60), sent('email', 90)], noon).reason === 'cap_week');
check('transactional mail does not count toward the cap', decide('email', ev(), user(), [sent('email', 3, { transactional: true })], noon).send);
check('a free marketing slot sends', decide('email', ev(), user(), [sent('email', 30)], noon).send);

// Push.
check('push: quiet hours hold non-transactional', decide('push', ev({ topic: 'results' }), user(), [], night).reason === 'quiet_hours');
check('push: transactional ignores quiet hours', decide('push', receipt, user(), [], night).send);
check('push: 2 per day cap', decide('push', ev({ topic: 'results' }), user(), [sent('push', 1), sent('push', 2)], noon).reason === 'cap_day');
check('push: offers default off', decide('push', ev(), user(), [], noon).reason === 'topic_off');

// Dedupe.
check('same dedupe key within 24h is skipped', decide('email', ev({ transactional: true, topic: 'results', dedupe: 'k' }), user(), [sent('email', 2, { dedupe: 'k' })], noon).reason === 'duplicate');
check('same dedupe key after 24h is allowed', decide('email', ev({ transactional: true, topic: 'results', dedupe: 'k' }), user(), [sent('email', 30, { dedupe: 'k' })], noon).send);

// WhatsApp.
const wa = user({ notify: { email: true, push: true, whatsapp: true }, whatsapp: { number: '+919876543210', verified: false } });
check('whatsapp: unverified number never sends', decide('whatsapp', receipt, wa, [], noon).reason === 'number_unverified');
check('whatsapp: waits for templates (phase 6)', decide('whatsapp', receipt, { ...wa, whatsapp: { number: '+919876543210', verified: true } }, [], noon).reason === 'whatsapp_not_ready');
check('whatsapp: sends when everything is ready', decide('whatsapp', receipt, { ...wa, whatsapp: { number: '+919876543210', verified: true } }, [], noon, { whatsappReady: true }).send);

console.log(`\nmessaging: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
