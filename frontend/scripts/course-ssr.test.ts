/**
 * Tests for the paid-course server-render decision.
 *
 * The property that matters most is a negative one: when the API refuses a
 * signed-out viewer a paid course with 403, the page must still be able to render
 * something real and indexable, and what it renders must not contain anything the
 * API did not already publish. Those pull in opposite directions - a shell needs
 * content, and the content must not be the paid content - so the boundary is
 * worth pinning down precisely rather than eyeballing in the browser.
 */
import { decideCoursePage, findPublicCoursePreview, toPublicCoursePreview } from '../src/lib/courseSsr';

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
    throw new Error(`expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}${note ? ` - ${note}` : ''}`);
  }
}
function ok(value: unknown, note = '') {
  if (!value) throw new Error(`expected truthy, got ${JSON.stringify(value)}${note ? ` - ${note}` : ''}`);
}

// ---------------------------------------------------------------------------
// A catalogue row, carrying the fields the public API really sends.
// ---------------------------------------------------------------------------

const paidRow = {
  id: 'crs-ads',
  slug: 'advanced-data-structures',
  title: 'Advanced Data Structures: Choosing Well Under Real Constraints',
  subtitle: 'Hashing, trees, heaps and graphs - built, benchmarked, and chosen with a procedure you can defend',
  description: 'Most data-structure teaching stops at "a hash map is O(1)" and leaves you to guess.',
  category: 'Computer Science',
  level: 'advanced',
  is_free: false,
  price_inr: 1299,
  thumbnail_url: '',
  tags: ['data-structures', 'algorithms'],
  outcomes: ['Choose between an adjacency list and an adjacency matrix from the graph density'],
  certificate_eligible: true,
  created_at: '2026-03-02T09:00:00.000Z',
  updated_at: '2026-03-02T09:00:00.000Z',
  signals: { rating_avg: null, rating_count: 0, recommend_percent: null, enrollment_count: 0 },
  badges: [],
  is_new: false,
  is_popular: false,
  stats: { module_count: 3, lesson_count: 7, total_minutes: 105, total_xp: 280, quiz_count: 5, video_count: 0 },
  progress: null,
  access: { price_inr: 1299, is_free: false, granted: false, reason: 'Sign in to enrol in this course.' },
  lock_reason: null,
  // The paid detail payload. None of this may reach a signed-out viewer's HTML.
  modules: [
    {
      id: 'ads-m1',
      title: 'Complexity, and reading it honestly',
      lessons: [{ id: 'ads-m1-1', title: 'What Big-O actually claims', kind: 'reading', blocks: [{ block_type: 'markdown', payload: {} }] }],
    },
  ],
  instructor: { id: 'inst-1', name: 'A Real Person', bio: 'Writes things.' },
  about_course: 'Big-O notation is a statement about growth, not about your program.',
  prerequisites: ['Can already program'],
  audience: ['Working engineers'],
};

const catalogue = [paidRow, { id: 'crs-free', slug: 'coding-foundations', title: 'Coding Foundations', is_free: true, price_inr: 0 }];

// ---------------------------------------------------------------------------
// decideCoursePage: the status table
// ---------------------------------------------------------------------------

check('a 200 with a course renders it and never fetches a preview', () => {
  const d = decideCoursePage({ upstreamStatus: 200, course: paidRow, catalogue, slug: paidRow.slug });
  eq(d.kind, 'render');
  if (d.kind !== 'render') return;
  eq(d.preview, null, 'a course the API already returned needs no preview');
  eq((d.course as any).id, 'crs-ads');
});

check('a 403 renders the public catalogue row for the same slug', () => {
  const d = decideCoursePage({ upstreamStatus: 403, course: null, catalogue, slug: 'advanced-data-structures' });
  eq(d.kind, 'render');
  if (d.kind !== 'render') return;
  ok(d.preview, 'the preview is the whole point of the 403 branch');
  eq(d.preview!.title, paidRow.title);
  eq(d.preview!.price_inr, 1299);
  eq(d.preview!.is_free, false);
  eq(d.course, null, 'the paid detail was refused, so there is no course to hand over');
});

check('a 403 for a course the catalogue does not list falls back to the client', () => {
  const d = decideCoursePage({ upstreamStatus: 403, course: null, catalogue, slug: 'not-in-the-catalogue' });
  eq(d.kind, 'render');
  if (d.kind !== 'render') return;
  eq(d.preview, null);
});

check('a 404 is a real 404, not a rendered "not found" page with a 200', () => {
  eq(decideCoursePage({ upstreamStatus: 404, course: null, catalogue, slug: 'ghost' }).kind, 'notFound');
});

check('a 500 is not a 404: the course may well exist', () => {
  const d = decideCoursePage({ upstreamStatus: 500, course: null, catalogue, slug: paidRow.slug });
  eq(d.kind, 'render', 'a backend blip must not become a permanent verdict on a real course');
});

check('no answer at all is not a 404 either', () => {
  const d = decideCoursePage({ upstreamStatus: null, course: null, catalogue, slug: paidRow.slug });
  eq(d.kind, 'render');
  if (d.kind !== 'render') return;
  eq(d.preview, null, 'an unreachable API cannot produce a preview; the client retries');
});

check('a 200 that somehow carried no course is not a 404 either', () => {
  const d = decideCoursePage({ upstreamStatus: 200, course: null, catalogue, slug: paidRow.slug });
  eq(d.kind, 'render', 'the API contradicting itself is not evidence the course is gone');
});

check('a 403 does not produce a preview when no catalogue was fetched at all', () => {
  const d = decideCoursePage({ upstreamStatus: 403, course: null, slug: paidRow.slug });
  eq(d.kind, 'render');
  if (d.kind !== 'render') return;
  eq(d.preview, null);
});

// ---------------------------------------------------------------------------
// The whitelist. This is the load-bearing part.
// ---------------------------------------------------------------------------

check('the preview does not carry the syllabus', () => {
  const p = findPublicCoursePreview(catalogue, 'advanced-data-structures');
  ok(p);
  const serialised = JSON.stringify(p);
  ok(!serialised.includes('Complexity, and reading it honestly'), 'module title leaked');
  ok(!serialised.includes('What Big-O actually claims'), 'lesson title leaked');
  ok(!serialised.includes('ads-m1-1'), 'lesson id leaked');
  ok(!('modules' in p!), 'modules key present');
});

check('the preview does not carry the instructor', () => {
  const p = findPublicCoursePreview(catalogue, 'advanced-data-structures')!;
  const serialised = JSON.stringify(p);
  ok(!serialised.includes('A Real Person'), 'instructor name leaked');
  ok(!('instructor' in p), 'instructor key present');
});

check('the preview does not carry the long-form prose', () => {
  const p = findPublicCoursePreview(catalogue, 'advanced-data-structures')!;
  const serialised = JSON.stringify(p);
  ok(!serialised.includes('Big-O notation is a statement'), 'about_course leaked');
  ok(!('about_course' in p), 'about_course key present');
  ok(!('prerequisites' in p), 'prerequisites key present');
  ok(!('audience' in p), 'audience key present');
});

check('the preview does not carry per-learner state', () => {
  const p = findPublicCoursePreview(catalogue, 'advanced-data-structures')!;
  ok(!('progress' in p), 'progress key present');
  ok(!('access' in p), 'access key present');
  ok(!('lock_reason' in p), 'lock_reason key present');
});

check('the preview does not carry lesson content or quiz answers', () => {
  const serialised = JSON.stringify(findPublicCoursePreview(catalogue, 'advanced-data-structures'));
  ok(!serialised.includes('block_type'), 'block payload leaked');
  ok(!serialised.includes('correct_index'), 'answer key leaked');
  ok(!serialised.includes('modules'), 'modules leaked');
});

check('the preview does not carry derived marketing signals', () => {
  const p = findPublicCoursePreview(catalogue, 'advanced-data-structures')!;
  ok(!('signals' in p), 'signals key present');
  ok(!('badges' in p), 'badges key present');
  ok(!('updated_at' in p), 'updated_at key present');
  ok(!('rating' in p), 'a rating key present');
});

check('an unknown field added to the catalogue row is not published by default', () => {
  // The failure mode this guards: `return the row` means a new API field reaches
  // every paid course page the day it is added, with nothing to fail a test.
  const p = toPublicCoursePreview({ ...paidRow, secret_lesson_preview: 'the answer is 42' })!;
  ok(!JSON.stringify(p).includes('the answer is 42'), 'an unlisted field was passed through');
  ok(!('secret_lesson_preview' in (p as any)), 'an unlisted key is present');
});

check('the preview keys are exactly the whitelisted set', () => {
  const p = findPublicCoursePreview(catalogue, 'advanced-data-structures')!;
  eq(
    Object.keys(p).sort().join(','),
    [
      'category',
      'certificate_eligible',
      'created_at',
      'description',
      'id',
      'is_free',
      'is_new',
      'is_popular',
      'level',
      'outcomes',
      'price_inr',
      'slug',
      'stats',
      'subtitle',
      'tags',
      'thumbnail_url',
      'title',
    ].sort().join(',')
  );
});

// ---------------------------------------------------------------------------
// Real data only: the preview must not manufacture anything.
// ---------------------------------------------------------------------------

check('a free course is described as free at no price', () => {
  const p = findPublicCoursePreview(catalogue, 'coding-foundations')!;
  eq(p.is_free, true);
  eq(p.price_inr, 0);
});

check('a null rating stays null rather than becoming a zero', () => {
  const p = findPublicCoursePreview(catalogue, 'advanced-data-structures')!;
  ok(!('signals' in p), 'signals were dropped, so no null-to-zero conversion is possible');
  eq(p.stats?.lesson_count, 7, 'real counts are kept');
});

check('missing optional text becomes null, not the string "undefined"', () => {
  const p = toPublicCoursePreview({ id: 'x', slug: 'x', title: 'X' })!;
  eq(p.subtitle, null);
  eq(p.description, null);
  eq(p.thumbnail_url, null);
  eq(p.created_at, null);
  eq(p.category, null);
});

check('a missing list is an empty list, so the shell cannot render a broken map', () => {
  const p = toPublicCoursePreview({ id: 'x', slug: 'x', title: 'X' })!;
  eq(Array.isArray(p.tags), true);
  eq(p.tags.length, 0);
  eq(p.outcomes.length, 0);
});

check('a row with no title is not a course', () => {
  eq(toPublicCoursePreview({ id: 'x', slug: 'x' }), null);
});

check('a row with no slug cannot be matched to a request', () => {
  eq(toPublicCoursePreview({ id: 'x', title: 'X' }), null);
});

check('non-objects are rejected rather than crashing the page', () => {
  eq(toPublicCoursePreview(null), null);
  eq(toPublicCoursePreview(undefined), null);
  eq(toPublicCoursePreview('a string'), null);
  eq(toPublicCoursePreview(42), null);
  eq(toPublicCoursePreview([]), null);
});

check('a malformed catalogue is not a crash', () => {
  eq(findPublicCoursePreview(null, 'x'), null);
  eq(findPublicCoursePreview(undefined, 'x'), null);
  eq(findPublicCoursePreview({ courses: [] }, 'x'), null);
  eq(findPublicCoursePreview('nope', 'x'), null);
  eq(findPublicCoursePreview([null, undefined, 3], 'x'), null);
});

check('an empty slug matches nothing', () => {
  eq(findPublicCoursePreview(catalogue, ''), null);
});

check('a malformed stats block does not produce NaN counts', () => {
  const p = toPublicCoursePreview({ ...paidRow, stats: { module_count: 'three', lesson_count: null } })!;
  eq(p.stats?.module_count, 0, 'a non-numeric count becomes 0, not NaN');
  eq(p.stats?.lesson_count, 0);
  eq(Number.isNaN(p.stats?.total_minutes as number), false, 'total_minutes must not be NaN');
});

check('a paid row keeps its real price rather than a formatted string', () => {
  const p = findPublicCoursePreview(catalogue, 'advanced-data-structures')!;
  eq(typeof p.price_inr, 'number');
  eq(p.price_inr, 1299);
});

// ---------------------------------------------------------------------------

console.log(`\ncourse-ssr: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
