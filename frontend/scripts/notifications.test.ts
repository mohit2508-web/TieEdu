/**
 * Notification derivation tests.
 *
 * The bell is the one piece of chrome that asserts facts about a transaction
 * ("we are checking your payment", "your report is published"). A bell that
 * over-claims is worse than no bell: a student who dismisses an
 * "awaiting verification" notice and never comes back has lost access to a
 * vault they already paid for.
 *
 * So the properties guarded here are mostly negative — an unknown order
 * status must produce nothing, a pending order must not read as paid, XP
 * reversals must not read as rewards, and malformed payloads must not throw.
 *
 * This suite imports the real `src/lib/notifications` module (the runner
 * rewrites the `@/*` alias after compiling), so the code under test is the
 * code that ships.
 */
import {
  deriveNotifications,
  emptyReadState,
  formatBadgeCount,
  isUnread,
  nextReadState,
  parseReadState,
  readStorageKey,
  unreadCount,
  type AppNotification,
  type NotificationOrder,
} from '../src/lib/notifications';

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
function eq(actual: unknown, expected: unknown, note = '') {
  if (actual !== expected) {
    throw new Error(`expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}${note ? ` — ${note}` : ''}`);
  }
}
/** Structural comparison, for the object-valued results (read state). */
function same(actual: unknown, expected: unknown, note = '') {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) throw new Error(`expected ${b}, got ${a}${note ? ` — ${note}` : ''}`);
}
function ok(value: unknown, note: string) {
  if (!value) throw new Error(`expected truthy${note ? ` — ${note}` : ''}`);
}
const order = (over: Partial<NotificationOrder> = {}): NotificationOrder => ({
  id: 'o1',
  amount: 999,
  status: 'awaiting_verification',
  created_at: '2026-03-02T10:00:00.000Z',
  items: [{ name: 'Razorpay', kind: 'company' }],
  ...over,
});

// ---------------------------------------------------------------------------
// Orders — only statuses the server actually writes produce a notification
// ---------------------------------------------------------------------------

check('an awaiting_verification order is a warning, not a confirmation', () => {
  const [n] = deriveNotifications({ orders: [order()] });
  eq(n.tone, 'warning');
  ok(!/unlocked/i.test(n.title), 'must not claim the vault is open');
  ok(/checking/i.test(n.body), 'must say the check is still in progress');
});

check('a paid order is the only one that says unlocked', () => {
  const [n] = deriveNotifications({ orders: [order({ status: 'paid' })] });
  eq(n.tone, 'success');
  ok(/unlocked/i.test(n.title), n.title);
});

check('an unknown order status produces no notification at all', () => {
  // Inventing a tone for a state the server never described is how a bell
  // ends up lying.
  eq(deriveNotifications({ orders: [order({ status: 'pending_review' })] }).length, 0);
  eq(deriveNotifications({ orders: [order({ status: 'Created' })] }).length, 0);
  eq(deriveNotifications({ orders: [order({ status: '' })] }).length, 0);
});

check('a pre-payment order is silent', () => {
  // 'created' means the checkout row exists but no money moved. Nothing to say.
  eq(deriveNotifications({ orders: [order({ status: 'created' })] }).length, 0);
});

check('rejected and failed orders are errors', () => {
  eq(deriveNotifications({ orders: [order({ status: 'rejected' })] })[0].tone, 'error');
  eq(deriveNotifications({ orders: [order({ status: 'failed' })] })[0].tone, 'error');
});

check('order ids are namespaced so an order and a report cannot collide', () => {
  const [a] = deriveNotifications({ orders: [order({ id: 'shared' })] });
  const [b] = deriveNotifications({ reports: [{ id: 'shared', status: 'published', created_at: '2026-03-01' }] });
  ok(a.id !== b.id, `${a.id} === ${b.id}`);
});

check('order body summarises up to three lines then stops counting', () => {
  const many = deriveNotifications({
    orders: [
      order({
        status: 'paid',
        amount: 0,
        items: [
          { name: 'A', kind: 'company' },
          { name: 'B', kind: 'company' },
          { name: 'C', kind: 'company' },
          { name: 'D', kind: 'company' },
        ],
      }),
    ],
  })[0];
  ok(/A \+ 3 more/.test(many.body), many.body);
});

check('a zero-amount order does not print a rupee zero', () => {
  const [n] = deriveNotifications({ orders: [order({ amount: null })] });
  ok(!/₹0/.test(n.body), n.body);
});

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

check('each report status maps to its own tone', () => {
  const tone = (status: 'pending_review' | 'published' | 'rejected') =>
    deriveNotifications({ reports: [{ id: 'r1', status, created_at: '2026-03-01' }] })[0].tone;
  eq(tone('pending_review'), 'info');
  eq(tone('published'), 'success');
  eq(tone('rejected'), 'error');
});

check('a report links to its company vault when the slug is known', () => {
  const [n] = deriveNotifications({
    reports: [{ id: 'r1', company_name: 'Razorpay', company_slug: 'razorpay', status: 'published', created_at: '2026-03-01' } as any],
  });
  eq(n.href, '/company/razorpay');
});

check('a report with no slug falls back to the account page', () => {
  const [n] = deriveNotifications({ reports: [{ id: 'r1', status: 'published', created_at: '2026-03-01' }] });
  eq(n.href, '/account');
});

check('the company name is used when present and omitted when not', () => {
  const named = deriveNotifications({ reports: [{ id: 'r1', company_name: 'Razorpay', status: 'published', created_at: '2026-03-01' }] })[0];
  const anon = deriveNotifications({ reports: [{ id: 'r1', status: 'published', created_at: '2026-03-01' }] })[0];
  ok(/Razorpay/.test(named.title), named.title);
  ok(/your interview/.test(anon.title), anon.title);
});

// ---------------------------------------------------------------------------
// XP
// ---------------------------------------------------------------------------

check('a positive XP entry is a success notification', () => {
  const [n] = deriveNotifications({ xp: [{ id: 'x1', xp: 50, reason: 'feedback_reward', course_title: 'Python', created_at: '2026-03-01' }] });
  eq(n.tone, 'success');
  ok(/\+?50 XP/.test(n.title), n.title);
  eq(n.href, '/my-courses');
});

check('a negative XP entry is never a reward', () => {
  // Reversals are real: awardAndCommit writes negative rows when an award is
  // taken back, and /courses/xp reports them as `reversed_xp`.
  eq(deriveNotifications({ xp: [{ id: 'x1', xp: -50, reason: 'feedback_reward', course_title: null, created_at: '2026-03-01' }] }).length, 0);
  eq(deriveNotifications({ xp: [{ id: 'x1', xp: 0, reason: 'lesson_complete', course_title: null, created_at: '2026-03-01' }] }).length, 0);
});

check('the ledger reason decides the copy, and the course supplies the where', () => {
  const one = deriveNotifications({ xp: [{ id: 'x1', xp: 10, reason: 'course_complete', course_title: 'C Fundamentals', created_at: '2026-03-01' }] })[0];
  eq(one.body, 'Course complete — C Fundamentals');
  const two = deriveNotifications({ xp: [{ id: 'x2', xp: 10, reason: 'quiz_pass', course_title: null, created_at: '2026-03-01' }] })[0];
  eq(two.body, 'Quiz passed');
});

check('a lesson title beats the course title when both are present', () => {
  const [n] = deriveNotifications({
    xp: [{ id: 'x1', xp: 10, reason: 'lesson_complete', course_title: 'C Fundamentals', lesson_title: 'Pointers in C', created_at: '2026-03-01' }],
  });
  ok(/Pointers in C/.test(n.body), n.body);
});

check('an XP entry with no title falls back to the note, then to generic copy', () => {
  const noted = deriveNotifications({ xp: [{ id: 'x1', xp: 10, reason: 'review', course_title: null, note: 'Report published', created_at: '2026-03-01' }] })[0];
  eq(noted.body, 'Report published');
  const bare = deriveNotifications({ xp: [{ id: 'x1', xp: 10, reason: 'something_new', course_title: null, created_at: '2026-03-01' }] })[0];
  eq(bare.body, 'Course progress reward');
  const untitled = deriveNotifications({ xp: [{ id: 'x1', xp: 10, reason: 'something_new', course_title: 'Python', created_at: '2026-03-01' }] })[0];
  eq(untitled.body, 'Python');
});

// ---------------------------------------------------------------------------
// Malformed input — a bell must never take the header down
// ---------------------------------------------------------------------------

check('missing sources derive an empty list without throwing', () => {
  eq(deriveNotifications({}).length, 0);
  eq(deriveNotifications({ orders: null, reports: undefined, xp: null }).length, 0);
});

check('a record with no date still renders rather than dropping out', () => {
  // A missing created_at must not delete the notification: the student still
  // needs to know their payment is still being checked.
  const [n] = deriveNotifications({ orders: [order({ created_at: '' })] });
  eq(n.id, 'order:o1');
  eq(n.created_at, '');
});

// ---------------------------------------------------------------------------
// Read cursor
// ---------------------------------------------------------------------------

const mk = (id: string, created_at: string): AppNotification => ({
  id,
  tone: 'info',
  title: id,
  body: '',
  href: '/account',
  created_at,
});

check('everything is unread before anything has been read', () => {
  const items = [mk('a', '2026-03-01'), mk('b', '2026-03-02')];
  eq(unreadCount(items, emptyReadState), 2);
});

check('anything newer than the cursor is unread, older is read', () => {
  const state = { cursor: '2026-03-02', seen: 2 };
  const items = [mk('a', '2026-03-01'), mk('b', '2026-03-02'), mk('c', '2026-03-03')];
  eq(unreadCount(items, state), 1);
  eq(isUnread(items[0], state), false);
  eq(isUnread(items[2], state), true);
});

check('marking as read advances the cursor to the newest item', () => {
  const items = [mk('a', '2026-03-01'), mk('b', '2026-03-09')];
  const state = nextReadState(items, emptyReadState);
  eq(state.cursor, '2026-03-09');
  eq(unreadCount(items, state), 0);
});

check('marking an empty list as read leaves the cursor alone', () => {
  same(nextReadState([], emptyReadState), emptyReadState, 'nothing new to read');
  const prior = { cursor: '2026-03-09', seen: 4 };
  same(nextReadState([], prior), prior, 'an existing cursor must survive');
});

check('a read cursor never moves backwards on refetch', () => {
  // Dropping the cursor would re-alert every notification on a stale payload.
  const prior = { cursor: '2026-03-09', seen: 4 };
  const state = nextReadState([mk('a', '2026-03-01')], prior);
  eq(state.cursor, '2026-03-09');
  eq(state.seen, 5);
});

check('read state is per-account, so logging out and back in does not leak', () => {
  ok(readStorageKey('u1') !== readStorageKey('u2'), 'two accounts must not share a cursor');
  ok(readStorageKey('u1') !== readStorageKey(null), 'signed-out must not share with signed-in');
});

check('a corrupt read cursor reads as nothing-read rather than crashing', () => {
  same(parseReadState(null), emptyReadState, 'absent');
  same(parseReadState('not json'), emptyReadState, 'garbage');
  same(parseReadState('[]'), emptyReadState, 'wrong shape');
  same(parseReadState('{"cursor":7,"seen":"x"}'), emptyReadState, 'wrong field types');
});

check('a partially valid read cursor keeps the part that is usable', () => {
  same(parseReadState('{"cursor":"2026-03-02","seen":"x"}'), { cursor: '2026-03-02', seen: 0 }, 'cursor is still usable');
});

check('the badge caps at 9+ so it never changes width', () => {
  eq(formatBadgeCount(0), '0');
  eq(formatBadgeCount(9), '9');
  eq(formatBadgeCount(10), '9+');
  eq(formatBadgeCount(1400), '9+');
});

console.log(`\nnotifications: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
