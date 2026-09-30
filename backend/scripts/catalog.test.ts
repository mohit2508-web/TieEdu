/**
 * Catalogue query tests. Pure-function level: no server, no HTTP.
 *
 * The point of the first block is that a course nobody has rated reports
 * `rating_avg: null`. That is the whole reason this file exists — it is the
 * regression guard against someone "fixing" the empty rating into a default
 * score and quietly putting fake social proof back on the cards.
 */
import assert from 'assert';
import {
  CATALOG_SORTS,
  buildFacets,
  courseBadges,
  courseSignalsFor,
  filterCourses,
  parseCatalogQuery,
  relatedCourses,
  runCatalog,
  sortCourses,
  isFreeCourse,
  emptySignals,
} from '../src/lib/catalog';
import { Course, CourseFeedback, CourseProgress } from '../src/data/db';

let seq = 0;
function course(over: Partial<Course> = {}): Course {
  seq += 1;
  return {
    id: `c${seq}`,
    slug: `c${seq}`,
    title: `Course ${seq}`,
    subtitle: 'sub',
    description: 'desc',
    category: 'Computer Science',
    level: 'beginner',
    is_free: true,
    price_inr: 0,
    thumbnail_url: '',
    tags: [],
    outcomes: [],
    prerequisite_course_id: null,
    certificate_eligible: true,
    published: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    modules: [],
    ...over,
  };
}

function progress(userId: string, courseId: string, over: Partial<CourseProgress> = {}): CourseProgress {
  return {
    user_id: userId,
    course_id: courseId,
    enrolled_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    completed_at: null,
    video_watch_seconds: {},
    video_duration_seconds: {},
    video_position_seconds: {},
    last_heartbeat_at: {},
    completed_lesson_ids: [],
    quiz_best_percent: {},
    passed_quiz_ids: [],
    ...over,
  };
}

function feedback(courseId: string, rating: number, over: Partial<CourseFeedback> = {}): CourseFeedback {
  return {
    id: `fb-${courseId}-${rating}-${seq}`,
    user_id: `u${seq}`,
    user_name: 'Learner',
    course_id: courseId,
    rating,
    what_learned: 'learned a thing',
    would_recommend: rating >= 4,
    xp_awarded: 10,
    created_at: '2026-02-01T00:00:00.000Z',
    ...over,
  };
}

function dbWith(courses: Course[], progressRows: CourseProgress[] = [], feedbackRows: CourseFeedback[] = []) {
  const progress: Record<string, Record<string, CourseProgress>> = {};
  for (const p of progressRows) {
    progress[p.user_id] = progress[p.user_id] || {};
    progress[p.user_id][p.course_id] = p;
  }
  return { courses, course_progress: progress, course_feedback: feedbackRows };
}

const q = (over: Partial<ReturnType<typeof parseCatalogQuery>> = {}) => ({
  ...parseCatalogQuery({}),
  ...over,
});

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

// --- signals: real counts, null when there is nothing to count ---------------

check('a course with no feedback has a null rating, not a zero or a default', () => {
  const c = course();
  const signals = courseSignalsFor(dbWith([c]), [c]).get(c.id)!;
  assert.strictEqual(signals.rating_avg, null);
  assert.strictEqual(signals.rating_count, 0);
  assert.strictEqual(signals.recommend_percent, null);
  assert.strictEqual(signals.enrollment_count, 0);
});

check('rating is the mean of real feedback rows, to one decimal', () => {
  const c = course();
  const db = dbWith([c], [], [feedback(c.id, 5), feedback(c.id, 4), feedback(c.id, 4)]);
  const s = courseSignalsFor(db, [c]).get(c.id)!;
  // (5+4+4)/3 = 4.333... -> 4.3
  assert.strictEqual(s.rating_avg, 4.3);
  assert.strictEqual(s.rating_count, 3);
  assert.strictEqual(s.recommend_percent, 100);
});

check('enrollment count is the number of real progress rows', () => {
  const c = course();
  const db = dbWith([c], [progress('u1', c.id), progress('u2', c.id), progress('u3', c.id)]);
  const s = courseSignalsFor(db, [c]).get(c.id)!;
  assert.strictEqual(s.enrollment_count, 3);
  assert.strictEqual(s.completion_count, 0);
});

check('completion count only counts rows with completed_at', () => {
  const c = course();
  const db = dbWith(
    [c],
    [
      progress('u1', c.id, { completed_at: '2026-03-01T00:00:00.000Z' }),
      progress('u2', c.id),
      progress('u3', c.id, { completed_at: '2026-03-01T00:00:00.000Z' }),
    ]
  );
  const s = courseSignalsFor(db, [c]).get(c.id)!;
  assert.strictEqual(s.enrollment_count, 3);
  assert.strictEqual(s.completion_count, 2);
});

check('signals for different courses do not bleed into each other', () => {
  const a = course();
  const b = course();
  const db = dbWith([a, b], [progress('u1', a.id)], [feedback(a.id, 5)]);
  const all = courseSignalsFor(db, [a, b]);
  assert.strictEqual(all.get(a.id)!.rating_count, 1);
  assert.strictEqual(all.get(b.id)!.rating_count, 0);
  assert.strictEqual(all.get(b.id)!.enrollment_count, 0);
});

// --- badges: derived, not hand-set ------------------------------------------

const NOW = Date.parse('2026-06-01T00:00:00.000Z');

check('a course published inside the window is new', () => {
  const c = course({ created_at: '2026-05-20T00:00:00.000Z' });
  const b = courseBadges(c, emptySignals(), { topQuartile: false, now: NOW });
  assert.ok(b.is_new);
  assert.ok(b.badges.includes('new'));
});

check('a course published long ago is not new', () => {
  const c = course({ created_at: '2026-01-01T00:00:00.000Z' });
  const b = courseBadges(c, emptySignals(), { topQuartile: false, now: NOW });
  assert.ok(!b.is_new);
});

check('popular needs BOTH a real enrolment floor and top-quartile rank', () => {
  const c = course();
  const busy = { ...emptySignals(), enrollment_count: 50 };
  const quiet = { ...emptySignals(), enrollment_count: 2 };

  // Top of the catalogue but below the floor -> still not popular.
  assert.ok(!courseBadges(c, busy, { topQuartile: false, now: NOW }).is_popular);
  // Above the floor but not top quartile -> still not popular.
  assert.ok(!courseBadges(c, quiet, { topQuartile: true, now: NOW }).is_popular);
  // Both -> popular.
  assert.ok(courseBadges(c, busy, { topQuartile: true, now: NOW }).is_popular);
});

check('a course with zero enrolments is never popular, even ranked first', () => {
  const c = course();
  assert.ok(!courseBadges(c, emptySignals(), { topQuartile: true, now: NOW }).is_popular);
});

check('a future created_at does not read as new', () => {
  const c = course({ created_at: '2027-01-01T00:00:00.000Z' });
  assert.ok(!courseBadges(c, emptySignals(), { topQuartile: false, now: NOW }).is_new);
});

// --- query parsing ----------------------------------------------------------

check('parses repeated params and comma lists into one deduped list', () => {
  const parsed = parseCatalogQuery({ tag: ['python,c', 'python', 'oop'] });
  assert.deepStrictEqual(parsed.tag, ['python', 'c', 'oop']);
});

check('rejects an unknown sort instead of trusting it', () => {
  assert.strictEqual(parseCatalogQuery({ sort: 'drop table' }).sort, 'popular');
});

check('clamps page_size so the whole table cannot be requested at once', () => {
  assert.strictEqual(parseCatalogQuery({ page_size: '999999' }).pageSize, 50);
  assert.strictEqual(parseCatalogQuery({ page_size: '0' }).pageSize, 20);
  assert.strictEqual(parseCatalogQuery({ page_size: 'abc' }).pageSize, 20);
});

check('rejects a nonsense page rather than computing a negative offset', () => {
  assert.strictEqual(parseCatalogQuery({ page: '-5' }).page, 1);
  assert.strictEqual(parseCatalogQuery({ page: '2' }).page, 2);
});

  check('keeps an unrecognised course-type value so it matches nothing', () => {
    // Previously this value was dropped, which turned `?type=rented` into "no
    // type filter" and answered with the entire catalogue while the URL claimed
    // a filter was active. Preserving it makes the result empty instead, which
    // is the same answer an unknown `level` gives.
    assert.deepStrictEqual(parseCatalogQuery({ type: 'free,rented,paid' }).type, ['free', 'rented', 'paid']);
  });


check('every advertised sort key is accepted', () => {
  for (const s of CATALOG_SORTS) {
    assert.strictEqual(parseCatalogQuery({ sort: s.key }).sort, s.key, s.key);
  }
});

// --- filtering --------------------------------------------------------------

const pyC = course({ title: 'Python', tags: ['python', 'beginner'], level: 'beginner' });
const cC = course({ title: 'C Programming', tags: ['c', 'memory'], level: 'intermediate' });
const paidC = course({ title: 'Rust', tags: ['rust', 'memory'], level: 'advanced', is_free: false, price_inr: 1499 });

check('values within a group are OR-ed', () => {
  const out = filterCourses([pyC, cC], q({ level: ['beginner', 'intermediate'] }));
  assert.strictEqual(out.length, 2);
});

check('groups are AND-ed together', () => {
  const out = filterCourses([pyC, cC], q({ level: ['beginner'], tag: ['memory'] }));
  assert.strictEqual(out.length, 0);
});

  check('type=paid returns only priced courses', () => {
    const out = filterCourses([pyC, cC, paidC], q({ type: ['paid'] }));
    assert.deepStrictEqual(out.map((c) => c.title), ['Rust']);
  });

  check('an unrecognised type value filters everything out', () => {
    const out = filterCourses([pyC, cC, paidC], q({ type: ['rented'] }));
    assert.deepStrictEqual(out, []);
  });

  check('an unrecognised type value is not treated as "no filter"', () => {
    // The regression this guards: dropping the token used to return all three
    // courses, so the URL claimed a filter and the page ignored it.
    assert.deepStrictEqual(filterCourses([pyC, cC, paidC], q({ type: ['rented'] })).length, 0);
    assert.deepStrictEqual(filterCourses([pyC, cC, paidC], q({ type: [] })).length, 3);
  });


check('a course priced 0 counts as free', () => {
  assert.ok(isFreeCourse(course({ is_free: false, price_inr: 0 })));
  assert.ok(!isFreeCourse(course({ is_free: false, price_inr: 10 })));
});

check('search covers title, subtitle, description, category and tags', () => {
  const c = course({ title: 'T', subtitle: 'about pointerz', description: '', category: 'X', tags: ['memory'] });
  assert.strictEqual(filterCourses([c], q({ q: 'POINTERZ' })).length, 1);
  assert.strictEqual(filterCourses([c], q({ q: 'memory' })).length, 1);
  assert.strictEqual(filterCourses([c], q({ q: 'nothinghere' })).length, 0);
});

// --- sorting ----------------------------------------------------------------

function sortable(c: Course, over: Partial<ReturnType<typeof emptySignals>> = {}, inProgress = false) {
  return { course: c, signals: { ...emptySignals(), ...over }, inProgress };
}

check('sort=az orders by title', () => {
  const rows = [sortable(paidC), sortable(pyC), sortable(cC)];
  assert.deepStrictEqual(sortCourses(rows, 'az').map((r) => r.course.title), [
    'C Programming',
    'Python',
    'Rust',
  ]);
});

check('sort=popular orders by real enrolment count, descending', () => {
  const rows = [
    sortable(pyC, { enrollment_count: 3 }),
    sortable(cC, { enrollment_count: 40 }),
    sortable(paidC, { enrollment_count: 12 }),
  ];
  assert.deepStrictEqual(sortCourses(rows, 'popular').map((r) => r.course.title), [
    'C Programming',
    'Rust',
    'Python',
  ]);
});

check('sort=rating puts unrated courses LAST rather than treating them as zero', () => {
  const rows = [sortable(pyC), sortable(cC, { rating_avg: 4.5, rating_count: 10 })];
  assert.deepStrictEqual(sortCourses(rows, 'rating').map((r) => r.course.title), ['C Programming', 'Python']);
});

check('sort=newest orders by created_at, newest first', () => {
  const old = course({ title: 'Old', created_at: '2026-01-01T00:00:00.000Z' });
  const fresh = course({ title: 'Fresh', created_at: '2026-05-01T00:00:00.000Z' });
  assert.deepStrictEqual(sortCourses([sortable(old), sortable(fresh)], 'newest').map((r) => r.course.title), [
    'Fresh',
    'Old',
  ]);
});

check('an in-progress course floats above the sort order, whatever was chosen', () => {
  for (const sort of ['az', 'za', 'newest', 'rating', 'popular'] as const) {
    const rows = [sortable(pyC, { enrollment_count: 99 }, true), sortable(cC, { rating_avg: 5 })];
    assert.strictEqual(sortCourses(rows, sort)[0].course.title, 'Python', `sort=${sort}`);
  }
});

// --- facets -----------------------------------------------------------------

check('facet counts describe the WHOLE result set, not the current page', () => {
  const many = Array.from({ length: 25 }, (_, i) =>
    course({ title: `T${i}`, tags: ['bulk'], category: 'Bulk' })
  );
  const db = dbWith(many);
  const parsed = { ...parseCatalogQuery({}), page: 1, pageSize: 20 };
  const out = runCatalog(db, many, parsed, (c) => c.id);
  assert.strictEqual(out.rows.length, 20);
  assert.strictEqual(out.total, 25);
  assert.ok(out.has_more);
  // The facet says 25 even though only 20 cards were returned.
  assert.strictEqual(out.facets.category.find((f) => f.key === 'bulk')!.count, 25);
});

check('facets are self-narrowing per group so a count is trustworthy', () => {
  const list = [pyC, cC, paidC];
  // level=intermediate selected: tag counts must reflect that constraint.
  const facets = buildFacets(list, q({ level: ['intermediate'] }));
  const memTag = facets.tag.find((f) => f.key === 'memory')!;
  // 'memory' appears on cC (intermediate) and paidC (advanced). Only cC passes.
  assert.strictEqual(memTag.count, 1);
});

check('the selected group itself is not narrowed, so a learner can widen it', () => {
  const list = [pyC, cC, paidC];
  const facets = buildFacets(list, q({ level: ['intermediate'] }));
  // Level counts still offer the other options, otherwise the learner could
  // never switch to a different level without clearing everything first.
  assert.ok(facets.level.find((f) => f.key === 'beginner'));
  assert.ok(facets.level.find((f) => f.key === 'advanced'));
});

check('level facet labels are human readable', () => {
  const facets = buildFacets([pyC, cC, paidC], q());
  const labels = facets.level.map((f) => f.label);
  assert.ok(labels.includes('Beginner'));
  assert.ok(labels.includes('Intermediate'));
  assert.ok(labels.includes('Advanced'));
});

check('type facet always reports both free and paid', () => {
  const facets = buildFacets([pyC, cC, paidC], q());
  const free = facets.type.find((f) => f.key === 'free')!;
  const paid = facets.type.find((f) => f.key === 'paid')!;
  assert.strictEqual(free.count, 2);
  assert.strictEqual(paid.count, 1);
});

// --- pagination -------------------------------------------------------------

check('page 2 returns the remainder and reports has_more false', () => {
  const many = Array.from({ length: 25 }, (_, i) => course({ title: `T${i}` }));
  const out = runCatalog(dbWith(many), many, { ...parseCatalogQuery({}), page: 2, pageSize: 20 }, (c) => c.id);
  assert.strictEqual(out.rows.length, 5);
  assert.strictEqual(out.total, 25);
  assert.ok(!out.has_more);
});

check('a page past the end is empty, not an error', () => {
  const one = [course()];
  const out = runCatalog(dbWith(one), one, { ...parseCatalogQuery({}), page: 99, pageSize: 20 }, (c) => c.id);
  assert.strictEqual(out.rows.length, 0);
  assert.strictEqual(out.total, 1);
  assert.ok(!out.has_more);
});

check('an empty catalogue is a valid, empty result', () => {
  const out = runCatalog(dbWith([]), [], parseCatalogQuery({}), (c) => c.id);
  assert.strictEqual(out.rows.length, 0);
  assert.strictEqual(out.total, 0);
  assert.ok(!out.has_more);
  assert.deepStrictEqual(out.facets.tag, []);
});

// --- related ----------------------------------------------------------------

check('related ranks shared tags above a shared category alone', () => {
  const source = course({ title: 'C', tags: ['c', 'memory'], category: 'CS' });
  const tagMatch = course({ title: 'Systems', tags: ['c', 'memory'], category: 'CS' });
  const catMatch = course({ title: 'Theory', tags: ['math'], category: 'CS' });
  const out = relatedCourses(source, [source, tagMatch, catMatch], 4);
  assert.strictEqual(out[0].title, 'Systems');
  assert.ok(out.some((c) => c.title === 'Theory'));
});

check('related excludes the course itself and unrelated courses', () => {
  const source = course({ title: 'C', tags: ['c'], category: 'CS' });
  const unrelated = course({ title: 'Cooking', tags: ['pasta'], category: 'Kitchen' });
  const out = relatedCourses(source, [source, unrelated], 4);
  assert.strictEqual(out.length, 0);
});

check('related honours the limit', () => {
  const source = course({ tags: ['x'] });
  const others = Array.from({ length: 10 }, (_, i) => course({ title: `T${i}`, tags: ['x'] }));
  assert.strictEqual(relatedCourses(source, [source, ...others], 3).length, 3);
});

// --- end-to-end through the pipeline ----------------------------------------

check('the decorated card carries signals, badges and stats together', () => {
  const c = course({ title: 'Python', tags: ['python'], created_at: '2026-05-25T00:00:00.000Z' });
  const db = dbWith(
    [c],
    Array.from({ length: 8 }, (_, i) => progress(`u${i}`, c.id)),
    [feedback(c.id, 5), feedback(c.id, 4)]
  );
  const out = runCatalog(
    db,
    [c],
    { ...parseCatalogQuery({}), sort: 'popular' },
    (course, signals, badges) => ({ id: course.id, signals, badges: badges.badges, stats: signals.enrollment_count }),
    { now: NOW }
  );
  const card = out.rows[0]!;
  assert.strictEqual(card.id, c.id);
  assert.strictEqual(card.signals.rating_avg, 4.5);
  assert.strictEqual(card.signals.enrollment_count, 8);
  // 8 enrolments, top of a one-course catalogue, above the floor of 5.
  assert.ok(card.badges.includes('popular'));
  // Published 7 days before NOW.
  assert.ok(card.badges.includes('new'));
});

console.log(`\ncatalog: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
