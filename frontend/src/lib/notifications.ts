// ============================================================================
// NOTIFICATIONS
//
// Derived, not stored. There is no `notifications` collection in the backend
// and this pass does not add one, because every notification worth showing is
// already a fact the API returns somewhere:
//
//   GET /auth/me      -> orders[] with a real `status`
//   GET /reports/mine -> the student's own reports with a real `status`
//   GET /courses/xp   -> the append-only XP ledger
//
// Deriving means the bell can only ever say something true. A stored
// notification table can drift out of sync with the order it describes; these
// cannot — if the order is not `awaiting_verification` any more, the
// notification stops existing, because there is nothing left to be true about.
//
// The cost is read state. Without a server-side `read_at`, "seen" is a
// localStorage cursor, so read state is per-device rather than per-account.
// That is the honest trade for not adding a table, and it is the first thing
// to revisit if notification volume grows.
// ============================================================================

export type NotificationTone = 'info' | 'success' | 'warning' | 'error';

export interface AppNotification {
  /** Stable across refetches so read-cursor comparison is meaningful. */
  id: string;
  tone: NotificationTone;
  title: string;
  body: string;
  href: string;
  /** ISO date string, as the server wrote it. Used for ordering. */
  created_at: string;
}

/** Only the fields the bell actually reads. Narrower is deliberate. */
export interface NotificationOrder {
  id: string;
  amount: number | null;
  status: string;
  created_at: string;
  items?: { name: string; kind: string }[];
}

export interface NotificationReport {
  id: string;
  company_name?: string;
  status: 'pending_review' | 'published' | 'rejected';
  created_at: string;
}

export interface NotificationXpEntry {
  id: string;
  xp: number;
  reason: string;
  course_title: string | null;
  lesson_title?: string | null;
  note?: string;
  created_at: string;
}

export interface NotificationSources {
  orders?: NotificationOrder[] | null;
  reports?: NotificationReport[] | null;
  xp?: NotificationXpEntry[] | null;
}

export const READ_CURSOR_KEY = 'tieedu_notifications_v1';

/**
 * Order status literals, as written by the server:
 *   checkout.routes.ts:328,368  'created'                 (awaiting payment)
 *   checkout.routes.ts:397      'awaiting_verification'
 *   lib/orders.ts:30            'paid'
 *   admin.routes.ts:846         'rejected'
 *   webhooks.routes.ts:55       'failed'
 *
 * An unrecognised status produces NO notification. Guessing at a state the
 * server never described is how a bell ends up lying.
 */
const ORDER_NOTICES: Record<string, { tone: NotificationTone; title: (o: NotificationOrder) => string }> = {
  awaiting_verification: {
    tone: 'warning',
    title: () => 'Payment awaiting verification',
  },
  paid: { tone: 'success', title: () => 'Vault unlocked' },
  rejected: { tone: 'error', title: () => 'Payment could not be verified' },
  failed: { tone: 'error', title: () => 'Payment failed' },
};

const rupees = (amount: number | null): string =>
  amount === null || amount === undefined ? '' : `₹${amount.toLocaleString('en-IN')}`;

const itemSummary = (order: NotificationOrder): string => {
  const names = (order.items || []).map((i) => i.name).filter(Boolean);
  if (names.length === 0) return rupees(order.amount);
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} + ${names[1]}`;
  return `${names[0]} + ${names.length - 1} more`;
};

const orderBody = (order: NotificationOrder): string => {
  const summary = itemSummary(order);
  const amount = rupees(order.amount);
  if (order.status === 'paid') return amount ? `${summary} · ${amount}` : summary;
  if (order.status === 'awaiting_verification') {
    return `We are checking ${amount || 'your payment'}${summary ? ` for ${summary}` : ''}. It unlocks automatically once verified.`;
  }
  return `${summary}${amount ? ` · ${amount}` : ''} — check your account page for details.`;
};

const REPORT_NOTICES: Record<string, { tone: NotificationTone; title: (r: NotificationReport) => string; body: (r: NotificationReport) => string }> = {
  pending_review: {
    tone: 'info',
    title: (r) => `Your ${r.company_name || 'interview'} report is under moderation`,
    body: () => 'An admin reviews every report before it goes live. You get +50 XP once it is published.',
  },
  published: {
    tone: 'success',
    title: (r) => `Report published — ${r.company_name || 'your interview'}`,
    body: () => 'It is now visible on the company vault. +50 XP has been added to your total.',
  },
  rejected: {
    tone: 'error',
    title: (r) => `Report not approved — ${r.company_name || 'interview'}`,
    body: () => 'Open your account to see what needs more detail, then resubmit.',
  },
};

const companyHref = (report: NotificationReport): string => {
  const slug = (report as NotificationReport & { company_slug?: string }).company_slug;
  return slug ? `/company/${slug}` : '/account';
};

/**
 * XP copy per ledger `reason`, matching the strings in
 * `backend/src/lib/courses.ts` and the reward sites in `courses.routes.ts`.
 * A reason with no entry here falls back to the ledger's own `note`, so an
 * award the backend adds later still reads sensibly instead of blank.
 */
const XP_REASONS: Record<string, string> = {
  lesson_complete: 'Lesson complete',
  quiz_pass: 'Quiz passed',
  course_complete: 'Course complete',
  feedback_reward: 'Interview report published',
  review: 'Report approved by moderation',
};

const xpBody = (entry: NotificationXpEntry): string => {
  if (entry.note) return entry.note;
  const reason = XP_REASONS[entry.reason];
  const where = entry.lesson_title || entry.course_title;
  if (reason && where) return `${reason} — ${where}`;
  if (reason) return reason;
  return entry.course_title || 'Course progress reward';
};

/**
 * Every notification the signed-in student currently has grounds to see,
 * newest first. Deterministic and total: a missing or malformed source yields
 * an empty list, never a throw and never an invented item.
 */
export const deriveNotifications = (sources: NotificationSources): AppNotification[] => {
  const out: AppNotification[] = [];

  for (const order of sources.orders || []) {
    const notice = ORDER_NOTICES[order.status];
    if (!notice) continue;
    out.push({
      id: `order:${order.id}`,
      tone: notice.tone,
      title: notice.title(order),
      body: orderBody(order),
      href: '/account',
      created_at: order.created_at || '',
    });
  }

  for (const report of sources.reports || []) {
    const notice = REPORT_NOTICES[report.status];
    if (!notice) continue;
    out.push({
      id: `report:${report.id}`,
      tone: notice.tone,
      title: notice.title(report),
      body: notice.body(report),
      href: companyHref(report),
      created_at: report.created_at || '',
    });
  }

  // Negative ledger entries are XP reversals, not rewards. Showing "-30 XP" in
  // a success-toned row would be a lie about what happened.
  for (const entry of sources.xp || []) {
    if (!entry || entry.xp <= 0) continue;
    out.push({
      id: `xp:${entry.id}`,
      tone: 'success',
      title: `You earned ${entry.xp} XP`,
      body: xpBody(entry),
      href: '/my-courses',
      created_at: entry.created_at || '',
    });
  }

  // `created_at` is a plain date string (`YYYY-MM-DD`) for reports and an ISO
  // timestamp for orders, so lexical order is only correct within a format.
  // Sorting by the string is therefore only a display nicety — the read cursor
  // compares exact strings, never `<`/`>`, so ordering cannot affect it.
  return out.sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0));
};

/**
 * Read state as a cursor: the newest `created_at` the student has seen.
 *
 * A cursor rather than a set of ids because a notification that arrives *after*
 * they last looked must be unread, and a set would have to be updated for
 * anything it missed. Comparison is exact string equality against the item's
 * own `created_at`, so two notifications sharing a date are both read or both
 * unread — a visible imprecision, and the honest one, without a per-item table.
 */
export interface ReadState {
  cursor: string | null;
  seen: number;
}

export const emptyReadState: ReadState = { cursor: null, seen: 0 };

export const readStorageKey = (userId: string | null | undefined): string =>
  userId ? `${READ_CURSOR_KEY}:${userId}` : READ_CURSOR_KEY;

export const parseReadState = (raw: string | null): ReadState => {
  if (!raw) return emptyReadState;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return emptyReadState;
    const cursor = typeof parsed.cursor === 'string' ? parsed.cursor : null;
    const seen = typeof parsed.seen === 'number' && Number.isFinite(parsed.seen) ? parsed.seen : 0;
    return { cursor, seen };
  } catch {
    return emptyReadState;
  }
};

export const isUnread = (notification: AppNotification, state: ReadState): boolean => {
  if (!state.cursor) return true;
  return notification.created_at > state.cursor;
};

export const unreadCount = (notifications: AppNotification[], state: ReadState): number =>
  notifications.reduce((n, item) => (isUnread(item, state) ? n + 1 : n), 0);

export const nextReadState = (notifications: AppNotification[], previous: ReadState): ReadState => {
  const newest = notifications.reduce<string>(
    (max, item) => (item.created_at > max ? item.created_at : max),
    previous.cursor || ''
  );
  return { cursor: newest || previous.cursor, seen: previous.seen + notifications.length };
};

/** Anything above 9 renders as "9+" so the badge never changes width. */
export const formatBadgeCount = (count: number): string => (count > 9 ? '9+' : String(count));
