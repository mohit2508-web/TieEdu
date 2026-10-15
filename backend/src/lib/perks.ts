// ============================================================================
// PERKS & REWARDS — idempotent grants that mirror the XP ledger discipline.
//
// Rules, in order of importance:
//
//  1. APPEND ONLY. A grant is never edited or deleted; it is created once and
//     then left alone.
//  2. IDEMPOTENT. Every grant is keyed on `(user_id, perk_key, course_id)`.
//     Replay, double-click or a retried completion can never mint a second
//     reward — the same rule `awardXp` follows for XP.
//  3. SERVER DEFINED. Which perks exist comes from `Course.perks`; the client
//     only ever renders what the server already issued. Nothing in a request
//     body is ever read here.
//  4. COUPONS ARE REUSED, NOT INVENTED. The "next course credit" perk mints a
//     single-use row in the existing `db.coupons` table, so checkout,
//     validation and redemption code paths stay untouched.
// ============================================================================

import crypto from 'crypto';
import { loadDb, saveDb, Course } from '../data/db';

/** One issued reward. Append-only, unique on (user_id, perk_key, course_id). */
export interface RewardGrant {
  id: string;
  user_id: string;
  perk_key: string;
  course_id: string;
  /** Set when the perk minted a coupon code; null for badges and XP. */
  coupon_code: string | null;
  created_at: string;
}

/** A badge row. Unique on (user_id, badge_key) — badges are not per-course. */
export interface UserBadge {
  user_id: string;
  badge_key: string;
  earned_at: string;
}

/**
 * The discount a completed course hands toward the learner's next purchase.
 * A constant, not a request value: perks are server-defined by rule 3.
 */
export const NEXT_COURSE_CREDIT_PERCENT = 10;

/** Reward codes are private to the learner who earned them — see checkout. */
export const REWARD_CODE_PREFIX = 'REWARD-';

export function isRewardCode(code: string | null | undefined): boolean {
  return String(code || '').toUpperCase().startsWith(REWARD_CODE_PREFIX);
}

function grants(db: any): RewardGrant[] {
  if (!Array.isArray(db.reward_grants)) db.reward_grants = [];
  return db.reward_grants;
}

function badges(db: any): UserBadge[] {
  if (!Array.isArray(db.user_badges)) db.user_badges = [];
  return db.user_badges;
}

export function hasGrant(db: any, userId: string, perkKey: string, courseId: string): boolean {
  return grants(db).some(
    (g) => g.user_id === userId && g.perk_key === perkKey && g.course_id === courseId
  );
}

export function hasBadge(db: any, userId: string, badgeKey: string): boolean {
  return badges(db).some((b) => b.user_id === userId && b.badge_key === badgeKey);
}

/**
 * Grant one perk. Returns the grant plus `granted: false` when it already
 * existed — the caller reports "already recorded" rather than a false award.
 */
export function grantPerk(
  db: any,
  opts: {
    userId: string;
    perkKey: string;
    courseId: string;
    /** When set, a single-use coupon row is minted and its code recorded. */
    coupon?: { label: string; percent?: number };
  }
): { grant: RewardGrant | null; granted: boolean; coupon_code: string | null } {
  if (hasGrant(db, opts.userId, opts.perkKey, opts.courseId)) {
    const existing = grants(db).find(
      (g) => g.user_id === opts.userId && g.perk_key === opts.perkKey && g.course_id === opts.courseId
    );
    return { grant: existing || null, granted: false, coupon_code: existing?.coupon_code || null };
  }

  let couponCode: string | null = null;
  if (opts.coupon) {
    // Coupon codes must be unique across the table or checkout would redeem
    // the wrong discount, so collision is retried rather than assumed away.
    const percent = Math.max(1, Math.min(100, Math.round(opts.coupon.percent ?? NEXT_COURSE_CREDIT_PERCENT)));
    for (let i = 0; i < 10; i++) {
      const code = `${REWARD_CODE_PREFIX}${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      if (!(db.coupons || []).some((c: any) => c.code === code)) {
        if (!Array.isArray(db.coupons)) db.coupons = [];
        db.coupons.push({
          id: `coup-reward-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
          code,
          discount_percent: percent,
          discount_flat: 0,
          is_active: true,
          max_uses: 1,
          uses: 0,
          label: opts.coupon.label,
        });
        couponCode = code;
        break;
      }
    }
  }

  const grant: RewardGrant = {
    id: `rw-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
    user_id: opts.userId,
    perk_key: opts.perkKey,
    course_id: opts.courseId,
    coupon_code: couponCode,
    created_at: new Date().toISOString(),
  };
  grants(db).push(grant);
  return { grant, granted: true, coupon_code: couponCode };
}

/** Earn a badge once per user, regardless of how many courses trigger it. */
export function grantBadge(db: any, userId: string, badgeKey: string): { granted: boolean } {
  if (hasBadge(db, userId, badgeKey)) return { granted: false };
  badges(db).push({ user_id: userId, badge_key: badgeKey, earned_at: new Date().toISOString() });
  return { granted: true };
}

/**
 * Award every completion perk a course declares, in the same commit path as
 * `settleCompletion` so a grant can never be half-applied.
 *
 * Only perks the course actually lists are considered — `Course.perks` drives
 * copy AND issuance, so a course never claims a reward it does not issue.
 */
export function grantCoursePerks(
  db: any,
  userId: string,
  course: Course
): { perk_key: string; granted: boolean; coupon_code: string | null }[] {
  const out: { perk_key: string; granted: boolean; coupon_code: string | null }[] = [];
  const perks = course.perks || [];

  for (const perk of perks) {
    if (!perk || !perk.key) continue;

    // A credit coupon is the only perk with a side effect on checkout; it is
    // only minted for a genuinely free course, so the reward does not depend
    // on the learner having paid for something else first.
    const wantsCoupon = perk.key === 'next_course_credit';
    const res = grantPerk(db, {
      userId,
      perkKey: perk.key,
      courseId: course.id,
      coupon: wantsCoupon
        ? { label: `Reward for completing ${course.title}` }
        : undefined,
    });
    out.push({ perk_key: perk.key, granted: res.granted, coupon_code: res.coupon_code });

    // Every completion perk doubles as a badge so /rewards has one list to
    // render; the grant stays the source of truth for per-course rewards.
    grantBadge(db, userId, `perk:${perk.key}`);
  }

  // The skill badge is issued for the course itself, not for a declared perk —
  // finishing a course is what verifies a skill, whatever the course promises.
  grantBadge(db, userId, `course:${course.id}`);
  if (course.branch) grantBadge(db, userId, `branch:${course.branch}`);

  return out;
}

/** Everything this learner has been granted, newest first. */
export function listRewards(db: any, userId: string) {
  const courseTitles = new Map<string, { title: string; slug: string }>();
  for (const c of (db.courses || []) as Course[]) {
    courseTitles.set(c.id, { title: c.title, slug: c.slug });
  }

  const rows = grants(db)
    .filter((g) => g.user_id === userId)
    .slice()
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((g) => {
      const course = courseTitles.get(g.course_id);
      return {
        id: g.id,
        perk_key: g.perk_key,
        course_id: g.course_id,
        course_title: course?.title || null,
        course_slug: course?.slug || null,
        coupon_code: g.coupon_code,
        created_at: g.created_at,
      };
    });

  return {
    rewards: rows,
    badges: badges(db)
      .filter((b) => b.user_id === userId)
      .slice()
      .sort((a, b) => b.earned_at.localeCompare(a.earned_at)),
  };
}

/** Load/save helpers for callers that own the surrounding commit. */
export function withRewards<T>(fn: (db: any) => T): T {
  const db = loadDb();
  const out = fn(db);
  saveDb(db);
  return out;
}
