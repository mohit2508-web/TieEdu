// ============================================================================
// Perks & rewards — idempotency and issuance rules.
//
// A reward that can be granted twice is a reward that can be handed out for a
// completion that never happened. These cases pin the three guarantees the
// grant path makes: a key is issued once, a coupon row is minted once, and the
// badge list stays unique per user no matter how many courses trigger it.
// ============================================================================

import { grantPerk, grantCoursePerks, grantBadge, hasGrant, hasBadge, listRewards, NEXT_COURSE_CREDIT_PERCENT } from '../src/lib/perks';
import type { Course } from '../src/data/db';

let pass = 0;
let fail = 0;

function check(name: string, actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    pass++;
  } else {
    fail++;
    console.log(`FAIL ${name}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
  }
}

function checkTrue(name: string, cond: boolean) {
  check(name, cond, true);
}

function emptyDb(): any {
  return { courses: [], coupons: [], reward_grants: [], user_badges: [] };
}

function course(over: Partial<Course> = {}): Course {
  return {
    id: 'course-1',
    slug: 'python-basics',
    title: 'Python Basics',
    perks: [
      { key: 'skill_badge', label: 'Skill badge' },
      { key: 'next_course_credit', label: 'Next-course credit' },
    ],
    ...over,
  } as Course;
}

// --- grantPerk ---------------------------------------------------------------

{
  const db = emptyDb();
  const first = grantPerk(db, { userId: 'u1', perkKey: 'skill_badge', courseId: 'course-1' });
  check('first grant is new', first.granted, true);
  checkTrue('grant row written', (db.reward_grants || []).length === 1);

  const second = grantPerk(db, { userId: 'u1', perkKey: 'skill_badge', courseId: 'course-1' });
  check('second grant of the same key is a no-op', second.granted, false);
  check('second grant exposes the original row', second.grant?.id, first.grant?.id);
  check('no duplicate grant row', (db.reward_grants || []).length, 1);
  check('hasGrant agrees', hasGrant(db, 'u1', 'skill_badge', 'course-1'), true);
}

{
  const db = emptyDb();
  grantPerk(db, { userId: 'u1', perkKey: 'skill_badge', courseId: 'course-1' });
  const otherCourse = grantPerk(db, { userId: 'u1', perkKey: 'skill_badge', courseId: 'course-2' });
  check('the same perk on another course is a separate grant', otherCourse.granted, true);
  check('two rows for two courses', (db.reward_grants || []).length, 2);
}

{
  const db = emptyDb();
  grantPerk(db, { userId: 'u1', perkKey: 'skill_badge', courseId: 'course-1' });
  const otherUser = grantPerk(db, { userId: 'u2', perkKey: 'skill_badge', courseId: 'course-1' });
  check('another learner earning the same perk is a separate grant', otherUser.granted, true);
}

// --- coupons -----------------------------------------------------------------

{
  const db = emptyDb();
  const a = grantPerk(db, {
    userId: 'u1',
    perkKey: 'next_course_credit',
    courseId: 'course-1',
    coupon: { label: 'Reward for completing Python Basics' },
  });
  checkTrue('a coupon code was minted', !!a.coupon_code);
  check('exactly one coupon row', (db.coupons || []).length, 1);
  const row = db.coupons[0];
  check('coupon is single use', row.max_uses, 1);
  check('coupon starts unused', row.uses, 0);
  check('coupon is active', row.is_active, true);
  check('coupon carries the credit percent', row.discount_percent, NEXT_COURSE_CREDIT_PERCENT);
  check('coupon code is recorded on the grant', a.grant?.coupon_code, a.coupon_code);

  // The grant key exists before the coupon is looked at, so replaying the same
  // grant must not mint a second row even though the coupon branch is reached
  // by key.
  const b = grantPerk(db, {
    userId: 'u1',
    perkKey: 'next_course_credit',
    courseId: 'course-1',
    coupon: { label: 'Reward for completing Python Basics' },
  });
  check('replayed grant mints no second coupon', (db.coupons || []).length, 1);
  check('replayed grant returns the original code', b.coupon_code, a.coupon_code);
  check('replayed grant reports granted=false', b.granted, false);
}

// --- badges ------------------------------------------------------------------

{
  const db = emptyDb();
  check('first badge is new', grantBadge(db, 'u1', 'course:course-1').granted, true);
  check('same badge twice is a no-op', grantBadge(db, 'u1', 'course:course-1').granted, false);
  check('one badge row', (db.user_badges || []).length, 1);
  check('hasBadge agrees', hasBadge(db, 'u1', 'course:course-1'), true);
}

// --- grantCoursePerks --------------------------------------------------------

{
  const db = emptyDb();
  const out = grantCoursePerks(db, 'u1', course());
  check('every declared perk is reported', out.map((p) => p.perk_key).sort(), ['next_course_credit', 'skill_badge']);
  checkTrue('the credit perk minted a coupon', !!out.find((p) => p.perk_key === 'next_course_credit')?.coupon_code);
  check('completion badges issued for course and branch', hasBadge(db, 'u1', 'course:course-1'), true);

  const again = grantCoursePerks(db, 'u1', course());
  check('a second settle grants nothing new', again.every((p) => !p.granted), true);
  check('grant count unchanged after replay', (db.reward_grants || []).length, 2);
  check('coupon count unchanged after replay', (db.coupons || []).length, 1);
  check('badge count unchanged after replay', (db.user_badges || []).length, 3);
}

{
  const db = emptyDb();
  const out = grantCoursePerks(db, 'u1', course({ perks: [] }));
  check('a course that declares no perks grants none', out, []);
  // The course badge still exists: finishing is what earns it, whatever the
  // course happens to promise.
  check('the course badge is still issued', hasBadge(db, 'u1', 'course:course-1'), true);
}

// --- listRewards -------------------------------------------------------------

{
  const db = emptyDb();
  db.courses.push(course());
  grantCoursePerks(db, 'u1', course());
  const listed = listRewards(db, 'u1');
  check('rewards are listed for the owner', listed.rewards.length, 2);
  check('course titles are resolved', listed.rewards[0].course_title, 'Python Basics');
  check('course slugs are resolved', listed.rewards[0].course_slug, 'python-basics');
  // Two declared-perk badges plus the course badge itself.
  check('badges are listed for the owner', listed.badges.length, 3);
  const other = listRewards(db, 'u2');
  check('another learner sees none of it', other.rewards.length, 0);
  check('and no badges', other.badges.length, 0);
}

console.log(`\nperks: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
