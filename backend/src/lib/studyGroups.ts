/**
 * Company study groups (C3). Students preparing for the same company see each
 * other's practice and nudge each other.
 *
 * Privacy and safety rules:
 *  - Opt-in. Joining is what makes a student visible; nobody is added because
 *    of a test date or a purchase. Suggestions are shown only to the student.
 *  - Members appear under a name they choose (first name or initials) and an
 *    opaque per-group handle, never a user id, email or college. A test date is
 *    shown only if the member chose to share it.
 *  - Only members see the member list; anyone else sees a count.
 *  - Nudges are preset messages, never free text, so there is nothing to
 *    harass with and nothing to moderate. One nudge per sender per recipient
 *    per India day, at most NUDGES_SENT_PER_DAY sent and NUDGES_RECEIVED_PER_DAY
 *    received a day, and any member can switch nudges off.
 *  - Leaving removes the membership and the nudges received in that group.
 */
import crypto from 'crypto';
import { addDays, dayDiff, istDate, streaksOf } from './streak';
import { profilesOf } from './companyPageStudent';
import { displayName } from './offerWall';

export const GROUP_NAME_MODES = ['first_name', 'initials'] as const;
export type GroupNameMode = (typeof GROUP_NAME_MODES)[number];
export const MAX_GROUPS = 10;
export const MEMBERS_SHOWN = 50;
export const NUDGES_SENT_PER_DAY = 10;
export const NUDGES_RECEIVED_PER_DAY = 3;
export const INBOX_DAYS = 14;

export const NUDGE_KINDS = ['miss_you', 'practise_together', 'cheer'] as const;
export type NudgeKind = (typeof NUDGE_KINDS)[number];
/** Preset copy. `{name}` is the sender's group name, `{company}` the company. */
export const NUDGE_COPY: Record<NudgeKind, { label: string; text: string }> = {
  miss_you: { label: 'We miss you', text: '{name} from your {company} group misses you. Ten minutes of practice today?' },
  practise_together: { label: 'Practise together', text: '{name} is practising for {company} today. Join in?' },
  cheer: { label: 'Well done', text: '{name} from your {company} group says: great work this week, keep going!' },
};

export interface Membership {
  user_id: string;
  company_id: string;
  name_mode: GroupNameMode;
  share_test_date: boolean;
  nudges_ok: boolean;
  joined_at: string;
}
export interface Nudge {
  id: string;
  company_id: string;
  from_user: string;
  to_user: string;
  /** The sender's group name when sent, so the inbox needs no lookup. */
  from_name: string;
  kind: NudgeKind;
  day: string;
  created_at: string;
  seen: boolean;
}

export class GroupError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function membersOf(db: any): Membership[] {
  if (!Array.isArray(db.study_group_members)) db.study_group_members = [];
  return db.study_group_members;
}
export function nudgesOf(db: any): Nudge[] {
  if (!Array.isArray(db.study_nudges)) db.study_nudges = [];
  return db.study_nudges;
}

const companyBySlug = (db: any, slug: string) => {
  const c = (db.companies || []).find((x: any) => x.slug === slug && x.status === 'published');
  if (!c) throw new GroupError(404, 'That company was not found.');
  return c;
};
const membership = (db: any, userId: string, companyId: string) => membersOf(db).find((m) => m.user_id === userId && m.company_id === companyId) || null;
const groupMembers = (db: any, companyId: string) => membersOf(db).filter((m) => m.company_id === companyId);

/** A stable handle for a member inside one group; not reversible to the user id without the database. */
export const handleFor = (userId: string, companyId: string) => crypto.createHash('sha256').update(`${companyId}:${userId}`).digest('hex').slice(0, 12);

const nameOf = (db: any, m: Membership) => displayName((db.users || []).find((u: any) => u.id === m.user_id)?.name || '', m.name_mode);

// --- membership ----------------------------------------------------------------------

export function joinGroup(db: any, userId: string, slug: string, input: any, now = new Date()): Membership {
  const c = companyBySlug(db, slug);
  const existing = membership(db, userId, c.id);
  if (existing) return existing;
  if (membersOf(db).filter((m) => m.user_id === userId).length >= MAX_GROUPS) throw new GroupError(400, `You can be in up to ${MAX_GROUPS} groups. Leave one to join another.`);
  const m: Membership = {
    user_id: userId,
    company_id: c.id,
    name_mode: (GROUP_NAME_MODES as readonly string[]).includes(input?.name_mode) ? input.name_mode : 'first_name',
    share_test_date: input?.share_test_date === true,
    nudges_ok: input?.nudges_ok !== false,
    joined_at: now.toISOString(),
  };
  membersOf(db).push(m);
  return m;
}

export function updateMembership(db: any, userId: string, slug: string, input: any): Membership {
  const c = companyBySlug(db, slug);
  const m = membership(db, userId, c.id);
  if (!m) throw new GroupError(404, 'You are not in this group.');
  if ((GROUP_NAME_MODES as readonly string[]).includes(input?.name_mode)) m.name_mode = input.name_mode;
  if (typeof input?.share_test_date === 'boolean') m.share_test_date = input.share_test_date;
  if (typeof input?.nudges_ok === 'boolean') m.nudges_ok = input.nudges_ok;
  return m;
}

export function leaveGroup(db: any, userId: string, slug: string): boolean {
  const c = companyBySlug(db, slug);
  const list = membersOf(db);
  const i = list.findIndex((m) => m.user_id === userId && m.company_id === c.id);
  if (i === -1) return false;
  list.splice(i, 1);
  db.study_nudges = nudgesOf(db).filter((n) => !(n.company_id === c.id && n.to_user === userId));
  return true;
}

// --- activity -------------------------------------------------------------------------

export interface Activity { days_this_week: number; streak: number; last_active: string | null; active_today: boolean }

/** Practice days in the last 7 India days, the live streak, and the last active day. */
export function activityOf(db: any, userId: string, today: string): Activity {
  const s = streaksOf(db).find((x) => x.user_id === userId);
  const days = new Set(s?.days || []);
  const since = addDays(today, -6);
  const days_this_week = [...days].filter((d) => d >= since && d <= today).length;
  const last = s?.last_day || null;
  const live = last !== null && dayDiff(last, today) <= 1;
  return { days_this_week, streak: live ? s!.current : 0, last_active: last, active_today: last === today };
}

const lastActiveLabel = (last: string | null, today: string) => {
  if (!last) return 'Not started yet';
  const d = dayDiff(last, today);
  if (d <= 0) return 'Practised today';
  if (d === 1) return 'Practised yesterday';
  if (d <= 7) return `Practised ${d} days ago`;
  return 'Not practised this week';
};

const testDateOf = (db: any, userId: string, companyId: string, today: string) => {
  const p = profilesOf(db).find((x) => x.user_id === userId && x.company_id === companyId);
  return p?.test_date && p.test_date >= today ? p.test_date : null;
};

// --- nudges ---------------------------------------------------------------------------

const sentToday = (db: any, from: string, today: string) => nudgesOf(db).filter((n) => n.from_user === from && n.day === today);
const receivedToday = (db: any, to: string, today: string) => nudgesOf(db).filter((n) => n.to_user === to && n.day === today);

/** Why this member cannot be nudged right now, or null if they can. */
function nudgeBlock(db: any, from: Membership, to: Membership, today: string): string | null {
  if (from.user_id === to.user_id) return 'You cannot nudge yourself.';
  if (!to.nudges_ok) return 'They have nudges turned off.';
  if (sentToday(db, from.user_id, today).some((n) => n.to_user === to.user_id)) return 'You already nudged them today.';
  if (sentToday(db, from.user_id, today).length >= NUDGES_SENT_PER_DAY) return `You have sent ${NUDGES_SENT_PER_DAY} nudges today. Send more tomorrow.`;
  if (receivedToday(db, to.user_id, today).length >= NUDGES_RECEIVED_PER_DAY) return 'They have had enough nudges for today.';
  return null;
}

export interface SentNudge { nudge: Nudge; push: { userId: string; title: string; body: string; url: string } }

export function sendNudge(db: any, userId: string, slug: string, input: any, now = new Date()): SentNudge {
  const c = companyBySlug(db, slug);
  const from = membership(db, userId, c.id);
  if (!from) throw new GroupError(403, 'Join the group to nudge its members.');
  const kind = String(input?.kind || '') as NudgeKind;
  if (!(NUDGE_KINDS as readonly string[]).includes(kind)) throw new GroupError(400, 'Choose a nudge.');
  const to = groupMembers(db, c.id).find((m) => handleFor(m.user_id, c.id) === String(input?.to || ''));
  if (!to) throw new GroupError(404, 'That member is no longer in the group.');
  const today = istDate(now);
  const block = nudgeBlock(db, from, to, today);
  if (block) throw new GroupError(409, block);
  const fromName = nameOf(db, from);
  const n: Nudge = { id: `ndg-${crypto.randomBytes(6).toString('hex')}`, company_id: c.id, from_user: userId, to_user: to.user_id, from_name: fromName, kind, day: today, created_at: now.toISOString(), seen: false };
  nudgesOf(db).push(n);
  // Old nudges are only an inbox; drop them once they age out.
  const cutoff = addDays(today, -INBOX_DAYS);
  db.study_nudges = nudgesOf(db).filter((x) => x.day >= cutoff);
  const body = NUDGE_COPY[kind].text.replace('{name}', fromName).replace('{company}', c.name);
  return { nudge: n, push: { userId: to.user_id, title: `A nudge from your ${c.name} group`, body, url: `/study-groups?c=${encodeURIComponent(c.slug)}` } };
}

export function inbox(db: any, userId: string, now = new Date()) {
  const cutoff = addDays(istDate(now), -INBOX_DAYS);
  const companies = new Map<string, any>((db.companies || []).map((c: any) => [c.id, c]));
  const items = nudgesOf(db)
    .filter((n) => n.to_user === userId && n.day >= cutoff)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((n) => {
      const c = companies.get(n.company_id);
      return { id: n.id, text: NUDGE_COPY[n.kind].text.replace('{name}', n.from_name).replace('{company}', c?.name || 'your'), company: c ? { name: c.name, slug: c.slug } : null, created_at: n.created_at, seen: n.seen };
    });
  return { items, unread: items.filter((i) => !i.seen).length };
}

export function markInboxSeen(db: any, userId: string): number {
  let n = 0;
  for (const x of nudgesOf(db)) if (x.to_user === userId && !x.seen) { x.seen = true; n++; }
  return n;
}

// --- views ----------------------------------------------------------------------------

/** One group. Members see the member list; everyone else sees the count and how to join. */
export function groupView(db: any, userId: string | null, slug: string, now = new Date()) {
  const c = companyBySlug(db, slug);
  const today = istDate(now);
  const all = groupMembers(db, c.id);
  const me = userId ? membership(db, userId, c.id) : null;
  const acts = new Map(all.map((m) => [m.user_id, activityOf(db, m.user_id, today)]));
  const summary = {
    members: all.length,
    practised_today: all.filter((m) => acts.get(m.user_id)!.active_today).length,
    days_this_week: all.reduce((n, m) => n + acts.get(m.user_id)!.days_this_week, 0),
  };
  const company = { name: c.name, slug: c.slug };
  if (!me) return { company, joined: false as const, summary, my_test_date: userId ? testDateOf(db, userId, c.id, today) : null };

  const members = all
    .map((m) => {
      const a = acts.get(m.user_id)!;
      const block = m.user_id === me.user_id ? null : nudgeBlock(db, me, m, today);
      return {
        handle: handleFor(m.user_id, c.id),
        name: nameOf(db, m),
        me: m.user_id === me.user_id,
        days_this_week: a.days_this_week,
        streak: a.streak,
        last_active: lastActiveLabel(a.last_active, today),
        active_today: a.active_today,
        test_date: m.share_test_date ? testDateOf(db, m.user_id, c.id, today) : null,
        can_nudge: m.user_id !== me.user_id && block === null,
        nudge_note: m.user_id === me.user_id ? null : block,
      };
    })
    // Most practice first, so the list rewards showing up; ties by name for a stable order.
    .sort((a, b) => Number(b.me) - Number(a.me) || b.days_this_week - a.days_this_week || b.streak - a.streak || a.name.localeCompare(b.name));
  return {
    company,
    joined: true as const,
    summary,
    settings: { name_mode: me.name_mode, share_test_date: me.share_test_date, nudges_ok: me.nudges_ok },
    members: members.slice(0, MEMBERS_SHOWN),
    hidden_members: Math.max(0, members.length - MEMBERS_SHOWN),
    nudge_kinds: NUDGE_KINDS.map((k) => ({ id: k, label: NUDGE_COPY[k].label })),
  };
}

/** My groups, and companies I am preparing for (a test date set) but have not joined. */
export function myGroups(db: any, userId: string, now = new Date()) {
  const today = istDate(now);
  const companies = new Map<string, any>((db.companies || []).map((c: any) => [c.id, c]));
  const mine = membersOf(db).filter((m) => m.user_id === userId);
  const joined = new Set(mine.map((m) => m.company_id));
  const count = (cid: string) => groupMembers(db, cid).length;
  const groups = mine
    .map((m) => companies.get(m.company_id))
    .filter((c) => c && c.status === 'published')
    .map((c) => {
      const others = groupMembers(db, c.id).filter((m) => m.user_id !== userId);
      return { company: { name: c.name, slug: c.slug }, members: count(c.id), practised_today: others.filter((m) => activityOf(db, m.user_id, today).active_today).length };
    });
  const suggestions = profilesOf(db)
    .filter((p) => p.user_id === userId && p.test_date && p.test_date >= today && !joined.has(p.company_id))
    .map((p) => companies.get(p.company_id))
    .filter((c) => c && c.status === 'published')
    .map((c) => ({ company: { name: c.name, slug: c.slug }, members: count(c.id) }));
  return { groups, suggestions, inbox: inbox(db, userId, now) };
}
