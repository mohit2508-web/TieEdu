// ============================================================================
// Coupon helpers — expiry, exhaustion, scope and the public offer shape.
//
// A coupon row is dumb storage; these functions are where "20% off GenAI until
// Friday" actually means something. The cases that matter: an expired or
// exhausted code must read as dead everywhere (feed, validator, receipt),
// a scoped coupon must discount only its target lines (never the whole cart
// as a fallback), and the public feed must resolve target courses to slugs
// that exist, because an offer that deep-links nowhere is a fake CTA.
// ============================================================================

import {
  activeOfferBadgeFor,
  couponEligibleSubtotal,
  couponRemaining,
  couponScopeMatches,
  couponScopeOf,
  isCouponExhausted,
  isCouponExpired,
  isPublicOffer,
  normaliseCouponExpiry,
  normaliseCouponScope,
  publicOfferFor,
} from '../src/lib/coupons';

let pass = 0;
let fail = 0;

function check(name: string, actual: unknown, expected: unknown) {
  if (actual === expected) {
    pass++;
  } else {
    fail++;
    console.log(`FAIL ${name}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
  }
}

function checkTrue(name: string, cond: boolean) {
  check(name, cond, true);
}

const FUTURE = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
const PAST = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

function coupon(over: Record<string, unknown> = {}) {
  return {
    id: 'coup-1',
    code: 'SAVE20',
    discount_percent: 20,
    discount_flat: 0,
    is_active: true,
    max_uses: 0,
    uses: 0,
    label: '20% off',
    ...over,
  };
}

// ---- expiry / exhaustion ----------------------------------------------------

checkTrue('a coupon with no expiry never expires', !isCouponExpired(coupon()));
checkTrue('a future expiry is not expired', !isCouponExpired(coupon({ expires_at: FUTURE })));
checkTrue('a past expiry is expired', isCouponExpired(coupon({ expires_at: PAST })));
checkTrue('an empty expiry string means no expiry', !isCouponExpired(coupon({ expires_at: '' })));
checkTrue('a garbage expiry does not kill the coupon', !isCouponExpired(coupon({ expires_at: 'soon-ish' })));

checkTrue('unlimited uses never exhaust', !isCouponExhausted(coupon({ max_uses: 0, uses: 999 })));
checkTrue('a fresh limited coupon is not exhausted', !isCouponExhausted(coupon({ max_uses: 5, uses: 4 })));
checkTrue('a fully-used coupon is exhausted', isCouponExhausted(coupon({ max_uses: 5, uses: 5 })));

check('unlimited remaining reads null', couponRemaining(coupon({ max_uses: 0 })), null);
check('remaining counts down honestly', couponRemaining(coupon({ max_uses: 5, uses: 2 })), 3);
check('remaining never goes negative', couponRemaining(coupon({ max_uses: 5, uses: 9 })), 0);

// ---- scope ------------------------------------------------------------------

check('an unscoped coupon has empty scope', couponScopeOf(coupon()).courseIds.length, 0);
check('an unscoped coupon has no branch', couponScopeOf(coupon()).branch, null);
check(
  'course ids normalise to lowercase deduped',
  JSON.stringify(couponScopeOf(coupon({ applies_to_course_ids: [' C1 ', 'c1', 'C2'] })).courseIds),
  JSON.stringify(['c1', 'c2'])
);
check('a known branch survives', couponScopeOf(coupon({ applies_to_branch: 'CSE' })).branch, 'cse');
check('an unknown branch is cleared', couponScopeOf(coupon({ applies_to_branch: 'hogwarts' })).branch, null);

checkTrue('an unscoped coupon matches any cart', couponScopeMatches(coupon(), ['x'], ['cse']));
checkTrue('an unscoped coupon matches an empty cart', couponScopeMatches(coupon(), [], []));
checkTrue('a course-scoped coupon matches its course', couponScopeMatches(coupon({ applies_to_course_ids: ['c1'] }), ['C1'], []));
checkTrue('a branch-scoped coupon matches the branch', couponScopeMatches(coupon({ applies_to_branch: 'cse' }), ['c9'], ['CSE']));
checkTrue(
  'a scoped coupon misses an unrelated cart',
  !couponScopeMatches(coupon({ applies_to_course_ids: ['c1'], applies_to_branch: 'cse' }), ['c2'], ['ece'])
);

const lines = [
  { price: 799, course_id: 'c1', branch: 'cse' },
  { price: 1299, course_id: 'c2', branch: 'ece' },
];
check('an unscoped coupon sees the whole cart', couponEligibleSubtotal(coupon(), lines), 2098);
check(
  'a course-scoped coupon sees only its line',
  couponEligibleSubtotal(coupon({ applies_to_course_ids: ['c2'] }), lines),
  1299
);
check(
  'a branch-scoped coupon sees only that branch',
  couponEligibleSubtotal(coupon({ applies_to_branch: 'cse' }), lines),
  799
);
check('a scoped coupon with no matching line sees zero', couponEligibleSubtotal(coupon({ applies_to_course_ids: ['c9'] }), lines), 0);
check('a free line contributes nothing', couponEligibleSubtotal(coupon(), [{ price: 0, course_id: 'c3' }]), 0);

// ---- public feed gating -----------------------------------------------------

const notReward = (code: string) => code.startsWith('REWARD-');
checkTrue('a healthy coupon is a public offer', isPublicOffer(coupon(), notReward));
checkTrue('an inactive coupon is hidden', !isPublicOffer(coupon({ is_active: false }), notReward));
checkTrue('an expired coupon is hidden', !isPublicOffer(coupon({ expires_at: PAST }), notReward));
checkTrue('an exhausted coupon is hidden', !isPublicOffer(coupon({ max_uses: 1, uses: 1 }), notReward));
checkTrue('a reward code is never public', !isPublicOffer(coupon({ code: 'REWARD-ABC' }), notReward));

// ---- public offer shape -----------------------------------------------------

const db = {
  courses: [
    { id: 'c1', slug: 'genai', title: 'GenAI', price_inr: 799, is_free: false },
    { id: 'c2', slug: 'python', title: 'Python', price_inr: 0, is_free: true },
  ],
};
const offer = publicOfferFor(db, coupon({ applies_to_course_ids: ['c1', 'ghost'] }));
check('the offer carries the discount', offer.discount_percent, 20);
check('the offer carries remaining uses', offer.remaining, null);
check('ghost course ids resolve to nothing', offer.courses.length, 1);
check('the resolved course carries its slug', offer.courses[0]?.slug, 'genai');
checkTrue('a coupon with no scope resolves no courses', publicOfferFor(db, coupon()).courses.length === 0);

// ---- admin input sanitising -------------------------------------------------

const scoped = normaliseCouponScope(db, { applies_to_course_ids: 'c1, ghost, c2', applies_to_branch: 'ECE' });
check('unknown course ids are dropped on save', JSON.stringify(scoped.applies_to_course_ids), JSON.stringify(['c1', 'c2']));
check('branch input normalises to the stored key', scoped.applies_to_branch, 'ece');
const cleared = normaliseCouponScope(db, { applies_to_course_ids: [], applies_to_branch: '' });
check('empty scope input clears cleanly', cleared.applies_to_course_ids.length + Number(cleared.applies_to_branch !== null), 0);

check('a valid expiry round-trips as ISO', typeof normaliseCouponExpiry(FUTURE), 'string');
check('empty expiry clears to null', normaliseCouponExpiry(''), null);
check('garbage expiry clears to null', normaliseCouponExpiry('soon-ish'), null);

// ---- live offer badge on catalogue cards -----------------------------------

const badgeDb = {
  coupons: [
    coupon({ id: 'b1', code: 'TWENTY', discount_percent: 20, applies_to_course_ids: ['c1'] }),
    coupon({ id: 'b2', code: 'FLAT100', discount_percent: 0, discount_flat: 100, applies_to_course_ids: ['c1'] }),
    coupon({ id: 'b3', code: 'EXPIRED', discount_percent: 50, applies_to_course_ids: ['c1'], expires_at: PAST }),
    coupon({ id: 'b4', code: 'REWARD-X', discount_percent: 90, applies_to_course_ids: ['c1'] }),
    coupon({ id: 'b5', code: 'BRANCH25', discount_percent: 25, applies_to_branch: 'cse' }),
  ],
};

const paidCourse = { id: 'C1', slug: 'genai', title: 'GenAI', price_inr: 799, is_free: false, branch: 'cse' };
const freeCourse = { id: 'c2', slug: 'python', title: 'Python', price_inr: 0, is_free: true };
const optedOut = { ...paidCourse, offer_badge_enabled: false };

const best = activeOfferBadgeFor(badgeDb, paidCourse, notReward);
checkTrue('a scoped live coupon produces a badge', best !== null);
check('the badge prefers the larger effective discount', best?.code, 'BRANCH25');
check('a percent badge reads as percent off', best?.badge, '25% OFF');
check('a free course never wears a badge', activeOfferBadgeFor(badgeDb, freeCourse, notReward), null);
check('an opted-out course never wears a badge', activeOfferBadgeFor(badgeDb, optedOut, notReward), null);
check(
  'an expired coupon never produces a badge',
  activeOfferBadgeFor({ coupons: [coupon({ applies_to_course_ids: ['c1'], expires_at: PAST })] }, paidCourse, notReward),
  null
);
check(
  'a reward code never produces a badge',
  activeOfferBadgeFor({ coupons: [coupon({ code: 'REWARD-90', discount_percent: 90, applies_to_course_ids: ['c1'] })] }, paidCourse, notReward),
  null
);
check(
  'an unscoped coupon does not badge every course',
  activeOfferBadgeFor({ coupons: [coupon({ discount_percent: 10 })] }, paidCourse, notReward),
  null
);
const flatOnly = activeOfferBadgeFor(
  { coupons: [coupon({ code: 'FLAT', discount_percent: 0, discount_flat: 50, applies_to_course_ids: ['c1'] })] },
  paidCourse,
  notReward
);
check('a flat discount badges as rupees off', flatOnly?.badge, '₹50 OFF');

console.log(`\ncheckout-coupons: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
