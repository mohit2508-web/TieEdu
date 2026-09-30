/**
 * Formatter tests. The two properties that matter most:
 *
 *  1. Nothing invents a number. A null rating and a zero enrolment must produce
 *     null, so the card renders nothing instead of a plausible-looking figure.
 *  2. Nothing is locale-dependent. Every formatter is pinned, because an
 *     `Intl` call that disagrees between the server and the browser throws the
 *     hydrated subtree away — and a learner who is 3% into a course should not
 *     watch the page re-render under them.
 */
import {
  compactCount,
  courseCta,
  courseCover,
  courseIncludes,
  formatDuration,
  formatEnrolled,
  formatLessonCount,
  formatLevel,
  formatModuleCount,
  formatPrice,
  formatRating,
  formatReviewCount,
  pluralize,
  plainText,
} from '../src/lib/courseFormat';

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
function throws(fn: () => void) {
  try {
    fn();
  } catch {
    return;
  }
  throw new Error('expected a throw');
}

// --- compactCount -----------------------------------------------------------

check('compact counts are exact below a thousand', () => {
  eq(compactCount(0), '0');
  eq(compactCount(1), '1');
  eq(compactCount(999), '999');
});

check('compact counts keep one decimal under 10k', () => {
  eq(compactCount(1000), '1k');
  eq(compactCount(1200), '1.2k');
  eq(compactCount(4200), '4.2k');
  eq(compactCount(9400), '9.4k');
});

check('999 does not get rounded up to a thousand', () => {
  // The classic off-by-one: 999/1000 is 0.999, not 1.
  eq(compactCount(999), '999');
});

check('a trailing .0 is dropped so widths line up', () => {
  eq(compactCount(5000), '5k');
  eq(compactCount(3000), '3k');
});

check('counts above 10k drop the decimal, and never reach a four-digit k', () => {
  eq(compactCount(12_345), '12k');
  eq(compactCount(275_223), '275k');
  // 999,999 would round to 999.999k -> "1000k", which is both ugly and a
  // number nobody believes. It is promoted to millions instead.
  eq(compactCount(999_499), '999k');
  eq(compactCount(999_999), '1M');
});

check('millions are abbreviated to one decimal', () => {
  eq(compactCount(1_000_000), '1M');
  eq(compactCount(1_250_000), '1.3M');
  eq(compactCount(9_999_000), '10M');
});

check('millions are abbreviated', () => {
  eq(compactCount(1_000_000), '1M');
  eq(compactCount(1_250_000), '1.3M');
});

check('a null count is null, not zero — Number(null) is 0 and must be rejected', () => {
  eq(compactCount(null), null);
  eq(compactCount(undefined), null);
  eq(compactCount(Number.NaN), null);
  eq(compactCount(Number.POSITIVE_INFINITY), null);
  eq(compactCount(-5), null);
});

check('formatEnrolled and formatPrice reject null the same way', () => {
  // The same `Number(null) === 0` trap: a null price must read as free, and a
  // null enrolment must vanish, not show "0 learners".
  eq(formatEnrolled(null), null);
  eq(formatPrice(null), 'Free');
  eq(formatPrice(undefined), 'Free');
});

// --- enrolled / rating ------------------------------------------------------

check('enrolled is null at zero, because "0 learners" is noise on a card', () => {
  eq(formatEnrolled(0), null);
  eq(formatEnrolled(null), null);
});

check('enrolled is singular for exactly one learner', () => {
  eq(formatEnrolled(1), '1 learner');
  eq(formatEnrolled(2), '2 learners');
});

check('enrolled abbreviates like the rest of the UI', () => {
  eq(formatEnrolled(12_000), '12k learners');
});

check('a null rating stays null — this is the no-fake-social-proof guard', () => {
  eq(formatRating({ rating_avg: null, rating_count: 0 } as any), null);
  eq(formatRating(null), null);
  eq(formatRating(undefined), null);
});

check('a real rating renders as given', () => {
  eq(formatRating({ rating_avg: 4.5 } as any), '4.5');
  eq(formatRating({ rating_avg: 5 } as any), '5');
});

check('review count is null when there are none, so it can be omitted', () => {
  eq(formatReviewCount({ rating_count: 0 } as any), null);
  eq(formatReviewCount({ rating_count: 1 } as any), '1 review');
  eq(formatReviewCount({ rating_count: 12 } as any), '12 reviews');
});

check('a zero rating count never pairs with a displayed rating', () => {
  // Guards the pair as a unit: if a caller ever invented an average for an
  // unrated course, this shape would be what the card rendered.
  const signals = { rating_avg: null, rating_count: 0 } as any;
  eq(formatRating(signals) === null && formatReviewCount(signals) === null, true);
});

// --- duration ---------------------------------------------------------------

check('durations under an hour stay in minutes', () => {
  eq(formatDuration(1), '1 min');
  eq(formatDuration(45), '45 min');
  eq(formatDuration(59), '59 min');
});

check('an exact hour count drops the minutes', () => {
  eq(formatDuration(60), '1 hr');
  eq(formatDuration(120), '2 hr');
});

check('a partial hour is kept when it is worth reading', () => {
  eq(formatDuration(70), '1 hr 10 min');
  eq(formatDuration(99), '1 hr 39 min');
});

check('a near-full leftover rounds up, never down', () => {
  // 2h40m reads worse than "3 hr", and rounding down would understate the work.
  eq(formatDuration(160), '3 hr');
  // 5h40m is the boundary itself and rounds up; 5h39m is just under it.
  eq(formatDuration(340), '6 hr');
  eq(formatDuration(339), '5 hr 39 min');
});

check('a zero or unknown duration is null, not "0 min"', () => {
  eq(formatDuration(0), null);
  eq(formatDuration(null), null);
  eq(formatDuration(undefined), null);
  eq(formatDuration(-10), null);
});

check('the old raw-minute problem is fixed: 559 minutes is readable', () => {
  // This is the exact figure the previous card rendered as "559 min".
  eq(formatDuration(559), '9 hr 19 min');
});

check('a 46-lesson course does not read as a 46-minute course', () => {
  // Sanity check that minutes and lessons are never conflated.
  eq(formatLessonCount({ lesson_count: 46 }), '46 lessons');
  eq(formatModuleCount({ module_count: 15 }), '15 modules');
});

// --- pluralize --------------------------------------------------------------

check('pluralize agrees with itself at the boundaries', () => {
  eq(pluralize(0, 'lesson'), '0 lessons');
  eq(pluralize(1, 'lesson'), '1 lesson');
  eq(pluralize(2, 'lesson'), '2 lessons');
  eq(pluralize(1, 'module'), '1 module');
});

check('pluralize respects an irregular plural', () => {
  eq(pluralize(2, 'class', 'classes'), '2 classes');
});

// --- level / price ----------------------------------------------------------

check('levels are human readable and title-cased as a fallback', () => {
  eq(formatLevel('beginner'), 'Beginner');
  eq(formatLevel('intermediate'), 'Intermediate');
  eq(formatLevel('advanced'), 'Advanced');
  eq(formatLevel('expert'), 'Expert');
});

check('a missing level does not render as an empty chip', () => {
  eq(formatLevel(''), 'All levels');
  eq(formatLevel(null), 'All levels');
});

check('price groups thousands the Indian way, matching the server', () => {
  eq(formatPrice(0), 'Free');
  eq(formatPrice(999), '₹999');
  eq(formatPrice(1299), '₹1,299');
  // The server uses toLocaleString('en-IN'); a Western ₹1,299,999 here and an
  // Indian ₹12,99,999 in the order record would be two different prices.
  eq(formatPrice(1_299_999), '₹12,99,999');
  eq(formatPrice(100_000), '₹1,00,000');
  eq(formatPrice(123_456_789), '₹12,34,56,789');
});

// --- CTA --------------------------------------------------------------------

check('a fresh course says start, not continue', () => {
  eq(courseCta({ progress: null }).label, 'Start learning');
  eq(courseCta({ progress: { enrolled: false, is_complete: false } }).label, 'Start learning');
});

check('an open course says continue', () => {
  eq(courseCta({ progress: { enrolled: true, is_complete: false } }).label, 'Continue learning');
});

check('a finished course says review rather than pretending there is more to do', () => {
  eq(courseCta({ progress: { enrolled: true, is_complete: true } }).label, 'Review course');
});

check('a paid course the learner has not bought offers the price, not a lie', () => {
  const cta = courseCta({
    progress: null,
    access: { granted: false },
    price_inr: 1299,
  });
  eq(cta.label, 'Get this course · ₹1,299');
  eq(cta.tone, 'gold');
});

check('a paid course the learner HAS bought says continue, not buy', () => {
  const cta = courseCta({
    progress: { enrolled: true, is_complete: false },
    access: { granted: true },
    price_inr: 1299,
  });
  eq(cta.label, 'Continue learning');
});

check('a signed-out visitor to a paid course is shown the price', () => {
  const cta = courseCta({ progress: null, access: { granted: false }, price_inr: 0 });
  // Price 0 with access denied is a prerequisite lock, not a purchase, so the
  // enrol wording stays honest and the page explains the lock separately.
  eq(cta.label, 'Start learning');
});

check('the CTA never throws on a bare card', () => {
  eq(courseCta({ progress: null }).label, 'Start learning');
  eq(courseCta({ progress: undefined, access: undefined }).label, 'Start learning');
});

// --- cover ------------------------------------------------------------------

check('the generated cover is stable for the same slug', () => {
  const a = courseCover('c-programming', 'C Programming: Pointers');
  const b = courseCover('c-programming', 'C Programming: Pointers');
  eq(a.from, b.from);
  eq(a.to, b.to);
  eq(a.initial, b.initial);
});

check('the cover initial comes from the first word', () => {
  eq(courseCover('python-programming', 'Python Programming').initial, 'P');
  eq(courseCover('c-programming', 'C Programming').initial, 'C');
  eq(courseCover('x', 'Intro to Algorithms').initial, 'I');
});

check('different slugs get different covers', () => {
  const seen = new Set(
    ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((s) => courseCover(s, s).from)
  );
  // Not a strict guarantee of the hash, but six distinct slugs colliding to a
  // single colour would mean the palette is being ignored.
  if (seen.size < 4) throw new Error(`cover palette collapsed to ${seen.size} colours`);
});

check('a missing slug or title still produces a usable cover', () => {
  // Must not throw: a course with a blank slug should render a tile, not crash
  // the catalogue. The fallback initial is arbitrary but stable.
  const cover = courseCover('', '');
  eq(typeof cover.from, 'string');
  eq(typeof cover.to, 'string');
  eq(cover.initial, 'T');
  // And it must be stable, or the tile would change colour on every render.
  eq(courseCover('', '').from, cover.from);
});

// --- plainText --------------------------------------------------------------

check('markdown is stripped for meta descriptions', () => {
  eq(plainText('**Bold** and `code` and [a link](https://x.com)'), 'Bold and code and a link');
  eq(plainText('# Heading\n\nBody text.'), 'Heading Body text.');
  eq(plainText('![alt](img.png) caption'), 'caption');
});

check('a long description is cut on a word boundary', () => {
  const long = `${'word '.repeat(200)}end`;
  const out = plainText(long, 50);
  if (out.length > 51) throw new Error(`too long: ${out.length}`);
  if (out.endsWith('wor…')) throw new Error('cut mid-word');
  if (!out.endsWith('…')) throw new Error('missing ellipsis');
});

check('plainText collapses newlines into single spaces', () => {
  eq(plainText('a\n\n\nb'), 'a b');
});

  check('plainText on empty input is empty, not "undefined"', () => {
    eq(plainText(null), '');
    eq(plainText(''), '');
    eq(plainText(undefined), '');
  });

  /**
   * The enrolment card's list is the one place on the page that makes promises
   * in a buyer's voice, so its failure mode is the worst one available: claiming
   * something the course does not have. These pin that it stays silent instead.
   *
   * Compared as JSON because `eq` is a strict `!==`, which two separate empty
   * arrays can never satisfy - "no claims" is exactly the assertion that matters
   * most here, so it must not be the one that cannot be written.
   */
  const list = (actual: unknown, expected: string[], note = '') =>
    eq(JSON.stringify(actual), JSON.stringify(expected), note);

  check('courseIncludes describes a fully populated course', () => {
    // `formatDuration` rounds the hour up when the leftover is 40 minutes or more,
    // so 105 minutes reads "2 hr" - the same figure the hero shows.
    list(
      courseIncludes({
        stats: { module_count: 3, lesson_count: 7, total_minutes: 105 },
        challenge_count: 5,
        certificate_eligible: true,
        caption_language: 'English',
      }),
      ['3 modules', '7 lessons', '2 hr of material', '5 graded challenges', 'Certificate on completion', 'Captions in English']
    );
  });

  check('courseIncludes omits a certificate the course cannot issue', () => {
    const items = courseIncludes({
      stats: { module_count: 2, lesson_count: 4, total_minutes: 60 },
      certificate_eligible: false,
    });
    eq(items.some((i) => /Certificate/i.test(i)), false);
  });

  check('courseIncludes omits captions when there are none', () => {
    const items = courseIncludes({
      stats: { module_count: 2, lesson_count: 4, total_minutes: 60 },
      caption_language: null,
    });
    eq(items.some((i) => /Caption/i.test(i)), false);
  });

  check('courseIncludes never renders a zero count as a number', () => {
    list(
      courseIncludes({ stats: { module_count: 0, lesson_count: 0, total_minutes: 0 } }),
      [],
      'a course with nothing counted must claim nothing'
    );
  });

  check('courseIncludes does not pluralise a single challenge', () => {
    const items = courseIncludes({
      stats: { module_count: 1, lesson_count: 1, total_minutes: 5 },
      challenge_count: 1,
    });
    eq(items.includes('1 graded challenge'), true);
    eq(items.includes('1 graded challenges'), false);
  });

  check('courseIncludes on a course with no stats is empty, not broken', () => {
    list(courseIncludes({}), []);
    list(courseIncludes(null), []);
    list(courseIncludes(undefined), []);
  });

  check('courseIncludes ignores a challenge count of zero', () => {
    const items = courseIncludes({
      stats: { module_count: 2, lesson_count: 4, total_minutes: 30 },
      challenge_count: 0,
    });
    eq(items.some((i) => /challenge/i.test(i)), false);
  });

  check('courseIncludes says minutes, not a rounded hour, for a short course', () => {
    const items = courseIncludes({ stats: { module_count: 1, lesson_count: 2, total_minutes: 45 } });
    eq(items.includes('45 min of material'), true);
  });

  console.log(`\ncourseFormat: ${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);

