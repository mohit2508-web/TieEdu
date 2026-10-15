import { COURSE_BRANCHES } from '../data/db';

// ============================================================================
// COUPON HELPERS — expiry, exhaustion and offer→course scope.
//
// A coupon is deliberately a dumb row: code, discount, limits, and an optional
// scope. Every decision about what a coupon *means* lives here, so the public
// offers feed, the validator and order creation cannot drift apart. The one
// rule that matters: a scoped coupon discounts only the lines it targets. A
// cart with none of those lines gets no discount rather than a cart-wide one,
// because the admin who scoped "GenAI ₹799 → ₹599" did not author a site-wide
// sale.
// ============================================================================

/** ISO timestamp in the past (or unparseable) counts as expired. Absent means no expiry. */
export function isCouponExpired(coupon: any, nowMs = Date.now()): boolean {
  const raw = coupon?.expires_at;
  if (raw === undefined || raw === null || raw === '') return false;
  const t = new Date(String(raw)).getTime();
  if (!Number.isFinite(t)) return false;
  return t < nowMs;
}

/** A coupon with max_uses > 0 that has been used up. 0 means unlimited. */
export function isCouponExhausted(coupon: any): boolean {
  const max = Number(coupon?.max_uses) || 0;
  if (max <= 0) return false;
  return (Number(coupon?.uses) || 0) >= max;
}

/** Remaining redemptions, or null for unlimited. Never negative. */
export function couponRemaining(coupon: any): number | null {
  const max = Number(coupon?.max_uses) || 0;
  if (max <= 0) return null;
  return Math.max(0, max - (Number(coupon?.uses) || 0));
}

/** Normalised scope: course ids (lowercased) and an optional branch key. */
export function couponScopeOf(coupon: any): { courseIds: string[]; branch: string | null } {
  const ids = Array.isArray(coupon?.applies_to_course_ids)
    ? coupon.applies_to_course_ids.map((v: unknown) => String(v ?? '').trim().toLowerCase()).filter(Boolean)
    : [];
  const rawBranch = String(coupon?.applies_to_branch ?? '').trim().toLowerCase();
  const branch = (COURSE_BRANCHES as readonly string[]).includes(rawBranch) ? rawBranch : null;
  return { courseIds: Array.from(new Set(ids)), branch };
}

/**
 * Whether a scoped coupon touches a cart, given the cart's course ids and
 * their branches. An unscoped coupon always matches — scope only narrows.
 */
export function couponScopeMatches(
  coupon: any,
  cartCourseIds: string[],
  cartCourseBranches: string[]
): boolean {
  const { courseIds, branch } = couponScopeOf(coupon);
  if (courseIds.length === 0 && !branch) return true;
  const haveIds = new Set((cartCourseIds || []).map((v) => String(v ?? '').trim().toLowerCase()).filter(Boolean));
  const haveBranches = new Set((cartCourseBranches || []).map((v) => String(v ?? '').trim().toLowerCase()).filter(Boolean));
  if (courseIds.some((id) => haveIds.has(id))) return true;
  if (branch && haveBranches.has(branch)) return true;
  return false;
}

/**
 * The subtotal a coupon may discount: the whole subtotal for an unscoped
 * coupon, or only the eligible course lines for a scoped one. Lines carry
 * `{ price, course_id, branch }`; anything without a price contributes zero.
 */
export function couponEligibleSubtotal(
  coupon: any,
  lines: { price?: number; course_id?: string; branch?: string }[]
): number {
  const { courseIds, branch } = couponScopeOf(coupon);
  let total = 0;
  for (const line of lines || []) {
    const price = Math.max(0, Number(line?.price) || 0);
    if (price <= 0) continue;
    if (courseIds.length === 0 && !branch) {
      total += price;
      continue;
    }
    const id = String(line?.course_id ?? '').trim().toLowerCase();
    const br = String(line?.branch ?? '').trim().toLowerCase();
    if ((id && courseIds.includes(id)) || (branch !== null && br === branch)) total += price;
  }
  return total;
}

/** A coupon the public offers feed may show: active, unexpired, unexhausted, not a reward code. */
export function isPublicOffer(coupon: any, isRewardCode: (code: string) => boolean): boolean {
  if (!coupon || coupon.is_active !== true) return false;
  if (isRewardCode(String(coupon.code || ''))) return false;
  if (isCouponExpired(coupon)) return false;
  if (isCouponExhausted(coupon)) return false;
  return true;
}

/**
 * The public offer shape: everything a landing strip needs to render a real
 * offer — code, label, discount, remaining uses, real expiry, scope — plus the
 * resolved target courses (slug + title) so every offer deep-links somewhere
 * that actually exists. Nothing secret: uses counts are already implied by
 * "remaining", and reward codes never reach this function.
 */
export function publicOfferFor(db: any, coupon: any) {
  const { courseIds, branch } = couponScopeOf(coupon);
  const courses = (db.courses || [])
    .filter((c: any) => courseIds.includes(String(c.id || '').toLowerCase()))
    .map((c: any) => ({ id: c.id, slug: c.slug, title: c.title, price_inr: c.price_inr, is_free: c.is_free === true }))
    .filter((c: any) => c.slug);
  return {
    id: coupon.id,
    code: coupon.code,
    label: coupon.label || coupon.code,
    discount_percent: Number(coupon.discount_percent) || 0,
    discount_flat: Number(coupon.discount_flat) || 0,
    max_uses: Number(coupon.max_uses) || 0,
    uses: Number(coupon.uses) || 0,
    remaining: couponRemaining(coupon),
    expires_at: coupon.expires_at || null,
    applies_to_course_ids: courseIds,
    applies_to_branch: branch,
    courses,
  };
}

/**
 * Sanitise admin input for the scope fields. Unknown course ids are dropped —
 * an offer scoped to a course that does not exist would deep-link nowhere —
 * and an unknown branch is cleared rather than stored.
 */
export function normaliseCouponScope(db: any, input: any): { applies_to_course_ids: string[]; applies_to_branch: string | null } {
  const rawIds: unknown[] = Array.isArray(input?.applies_to_course_ids)
    ? input.applies_to_course_ids
    : typeof input?.applies_to_course_ids === 'string'
      ? input.applies_to_course_ids.split(',')
      : [];
  const known = new Set((db.courses || []).map((c: any) => String(c.id || '')));
  const ids = Array.from(
    new Set(rawIds.map((v: unknown) => String(v ?? '').trim()).filter((v: string) => v && known.has(v)))
  );
  const rawBranch = String(input?.applies_to_branch ?? '').trim().toLowerCase();
  const branch = (COURSE_BRANCHES as readonly string[]).includes(rawBranch) ? rawBranch : null;
  return { applies_to_course_ids: ids, applies_to_branch: branch };
}

/** Sanitise admin input for expiry: a valid ISO timestamp, or null to clear. */
export function normaliseCouponExpiry(input: unknown): string | null {
  if (input === undefined || input === null || input === '') return null;
  const t = new Date(String(input)).getTime();
  if (!Number.isFinite(t)) return null;
  return new Date(t).toISOString();
}

/**
 * The live offer a catalogue card may overlay for this course, or null.
 *
 * A badge is only ever the truth about a real, currently-redeemable coupon —
 * active, unexpired, unexhausted, not a reward code — scoped to this course
 * (by id or branch). Free courses never wear one, and an admin can take the
 * badge off a specific course with `offer_badge_enabled: false`. When several
 * coupons qualify, the one with the larger effective discount wins so the
 * badge never understates the deal.
 */
export function activeOfferBadgeFor(
  db: any,
  course: any,
  isRewardCode: (code: string) => boolean
): { label: string; code: string; discount_percent: number; discount_flat: number; badge: string } | null {
  if (!course || course.is_free === true) return null;
  if (course.offer_badge_enabled === false) return null;
  const courseId = String(course.id || '').toLowerCase();
  const branch = String(course.branch || '').toLowerCase();
  const price = Math.max(0, Number(course.price_inr) || 0);

  let best: any = null;
  let bestValue = 0;
  for (const coupon of db?.coupons || []) {
    if (!isPublicOffer(coupon, isRewardCode)) continue;
    const scope = couponScopeOf(coupon);
    const targeted =
      scope.courseIds.includes(courseId) ||
      (scope.branch !== null && scope.branch === branch);
    if (!targeted) continue;

    const percent = Math.max(0, Number(coupon.discount_percent) || 0);
    const flat = Math.max(0, Number(coupon.discount_flat) || 0);
    const effective = percent > 0 ? (price * percent) / 100 : flat;
    if (effective <= 0 || effective <= bestValue) continue;
    best = coupon;
    bestValue = effective;
  }
  if (!best) return null;

  const percent = Math.max(0, Number(best.discount_percent) || 0);
  const flat = Math.max(0, Number(best.discount_flat) || 0);
  const badge = percent > 0 ? `${percent}% OFF` : flat > 0 ? `\u20B9${flat} OFF` : '';
  if (!badge) return null;
  return {
    label: best.label || best.code,
    code: best.code,
    discount_percent: percent,
    discount_flat: flat,
    badge,
  };
}
