/**
 * Unit tests for the pure decision functions in `src/lib/courses.ts`.
 *
 * These are the functions that decide whether a learner has earned something.
 * They are pure and side-effect free, so they are tested directly here rather
 * than only through the HTTP smoke test — the smoke test proves the wiring, but
 * a boundary case in `effectiveVideoSeconds` or `gradeQuiz` is far easier to pin
 * down at this level, and a regression in them is exactly the kind of bug that
 * silently hands out XP.
 *
 * The cases below are all adversarial on purpose: tampered client claims,
 * author/client disagreement, missing data, and division by zero.
 */

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
// Set before importing, so the signing-key assertion in lib/courses' import
// chain cannot warn or throw during the run. Ed25519, matching production.
if (!process.env.CERT_SIGNING_PRIVATE_KEY) {
  const { privateKey } = require('crypto').generateKeyPairSync('ed25519');
  process.env.CERT_SIGNING_PRIVATE_KEY = privateKey
    .export({ type: 'pkcs8', format: 'der' })
    .toString('base64');
}

import {
  DURATION_TOLERANCE_HIGH,
  DURATION_TOLERANCE_LOW,
  MAX_HEARTBEAT_CREDIT_SECONDS,
  READ_MAX_SECONDS,
  READ_MIN_SECONDS,
  WATCH_THRESHOLD,
  authorVideoSeconds,
  courseAccessState,
  courseMaxXp,
  effectiveVideoSeconds,
  embedUrlFor,
  formatInr,
  gradeQuiz,
  isLessonUnlocked,
  lessonCompletionState,
  orderedLessons,
  parseVideoUrl,
  readRequiredSeconds,
  sanitizeLesson,
  sanitizeQuizForLearner,
  slugify,
  uniqueSlug,
} from '../src/lib/courses';
import { Course, CourseLesson, CourseProgress } from '../src/data/db';

let pass = 0;
let fail = 0;

function check(name: string, actual: unknown, expected: unknown) {
  if (actual === expected) {
    pass++;
  } else {
    fail++;
    console.log(
      `FAIL ${name}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`
    );
  }
}

function checkJson(name: string, actual: unknown, expected: unknown) {
  check(name, JSON.stringify(actual), JSON.stringify(expected));
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function lesson(over: Partial<CourseLesson> = {}): CourseLesson {
  return {
    id: 'l1',
    module_id: 'm1',
    title: 'Lesson one',
    summary: '',
    sort_order: 1,
    duration_minutes: 10,
    xp_reward: 25,
    blocks: [],
    video: null,
    quiz: null,
    ...over,
  } as CourseLesson;
}

function videoLesson(over: Partial<CourseLesson> = {}): CourseLesson {
  return lesson({
    video: { provider: 'youtube', video_id: 'dQw4w9WgXcQ', duration_minutes: 10 },
    ...over,
  });
}

function quizLesson(over: Partial<CourseLesson> = {}): CourseLesson {
  return lesson({
    quiz: {
      id: 'q1',
      passing_percent: 70,
      questions: [
        { id: 'q1a', prompt: 'One?', options: ['a', 'b', 'c'], correct_index: 1, explanation: 'because' },
        { id: 'q1b', prompt: 'Two?', options: ['a', 'b'], correct_index: 0, explanation: 'also' },
      ],
    },
    ...over,
  });
}

function course(over: Partial<Course> = {}): Course {
  return {
    id: 'c1',
    slug: 'test-course',
    title: 'Test course',
    subtitle: '',
    description: '',
    category: 'engineering',
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
    modules: [
      {
        id: 'm1',
        course_id: 'c1',
        title: 'Module one',
        summary: '',
        sort_order: 1,
        lessons: [lesson({ id: 'l1', sort_order: 1 }), lesson({ id: 'l2', sort_order: 2 })],
      },
    ],
    ...over,
  } as Course;
}

function blankP(over: Partial<CourseProgress> = {}): CourseProgress {
  return {
    user_id: 'u1',
    course_id: 'c1',
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

// ---------------------------------------------------------------------------
// slugify
// ---------------------------------------------------------------------------

slugify('  Intro to Data Structures  ');
slugify('Intro to Data Structures');
check('slugify lowercases and hyphenates', slugify('Intro to Data Structures'), 'intro-to-data-structures');
check('slugify strips punctuation', slugify('C++ / Rust: a primer!'), 'c-rust-a-primer');
check('slugify collapses repeated separators', slugify('a   b___c'), 'a-b-c');
check('slugify falls back when nothing survives', slugify('!!!'), 'course');
check('slugify honours a custom fallback', slugify('', 'module'), 'module');
check('slugify caps length', slugify('x'.repeat(200)).length, 64);

// ---------------------------------------------------------------------------
// effectiveVideoSeconds — the anti-cheat bound
// ---------------------------------------------------------------------------

const authorSeconds = authorVideoSeconds(videoLesson());
check('authorVideoSeconds converts minutes', authorSeconds, 600);

check(
  'a client duration inside the tolerance band is believed',
  effectiveVideoSeconds(videoLesson(), 660),
  660
);
check(
  'a client claiming a tiny duration is overruled by the author figure',
  effectiveVideoSeconds(videoLesson(), 3),
  600
);
check(
  'a client claiming an enormous duration is overruled by the author figure',
  effectiveVideoSeconds(videoLesson(), 999999),
  600
);
check(
  'a zero client duration falls back to the author figure',
  effectiveVideoSeconds(videoLesson(), 0),
  600
);
check(
  'a negative client duration falls back to the author figure',
  effectiveVideoSeconds(videoLesson(), -50),
  600
);
check(
  'with no author estimate the client figure is used as-is',
  effectiveVideoSeconds(videoLesson({ video: { provider: 'youtube', video_id: 'x'.repeat(11) } }), 42),
  42
);
check(
  'with no author estimate and no client figure the bound is zero, not NaN',
  effectiveVideoSeconds(videoLesson({ video: { provider: 'youtube', video_id: 'x'.repeat(11) } }), 0),
  0
);
// The exact edges of the band: at the boundary the client is believed, one
// second outside it the author wins. Off-by-one here would either trust a liar
// or reject an honest player.
check(
  'exactly at the low tolerance edge the client is believed',
  effectiveVideoSeconds(videoLesson(), Math.round(authorSeconds * DURATION_TOLERANCE_LOW)),
  Math.round(authorSeconds * DURATION_TOLERANCE_LOW)
);
check(
  'one second inside the low edge is overruled',
  effectiveVideoSeconds(videoLesson(), Math.round(authorSeconds * DURATION_TOLERANCE_LOW) - 1),
  600
);
check(
  'one second outside the high edge is overruled',
  effectiveVideoSeconds(videoLesson(), Math.round(authorSeconds * DURATION_TOLERANCE_HIGH) + 1),
  600
);

// ---------------------------------------------------------------------------
// readRequiredSeconds — the time gate for lessons with no media
// ---------------------------------------------------------------------------

check('a short reading scales with the estimate', readRequiredSeconds(lesson({ duration_minutes: 1 })), 24);
check('a long reading is capped', readRequiredSeconds(lesson({ duration_minutes: 120 })), READ_MAX_SECONDS);
check(
  'a mid-length reading scales with the estimate',
  readRequiredSeconds(lesson({ duration_minutes: 10 })),
  Math.round(600 * 0.4)
);
check(
  'a lesson with no estimate is floored, not NaN',
  readRequiredSeconds(lesson({ duration_minutes: 0 })),
  READ_MIN_SECONDS
);

// ---------------------------------------------------------------------------
// lessonCompletionState
// ---------------------------------------------------------------------------

// Video: below the threshold, at it, and above it.
{
  const l = videoLesson();
  const s = lessonCompletionState(blankP({ video_watch_seconds: { l1: 300 }, video_duration_seconds: { l1: 600 } }), l);
  check('a half-watched video is not complete', s.is_complete, false);
  check('a half-watched video is 50%', s.video_percent, 50);
  check('a half-watched video is not ready', s.ready, false);
}
{
  const l = videoLesson();
  // Watched well past the duration: the percentage is clamped, not allowed to
  // read as 150% and make a 10-minute lesson look further along than it is.
  const s = lessonCompletionState(blankP({ video_watch_seconds: { l1: 900 }, video_duration_seconds: { l1: 600 } }), l);
  check('a video watched to the threshold is ready', s.ready, true);
  check('watching past the duration does not exceed 100%', s.video_percent, 100);
}
{
  // The core cheat: claim the video is 3 seconds long, then watch 3 seconds.
  const l = videoLesson();
  const s = lessonCompletionState(blankP({ video_watch_seconds: { l1: 3 }, video_duration_seconds: { l1: 3 } }), l);
  check('shrinking the duration does not clear the watch gate', s.ready, false);
  check('the percentage is still computed against the author figure', s.video_percent, 1);
}

// Read-only lesson: the time gate.
{
  const l = lesson({ duration_minutes: 10 });
  const s = lessonCompletionState(blankP({ video_watch_seconds: { l1: 10 } }), l);
  check('a reading lesson under the time gate is not ready', s.ready, false);
}
{
  const l = lesson({ duration_minutes: 10 });
  const s = lessonCompletionState(blankP({ video_watch_seconds: { l1: 240 } }), l);
  check('a reading lesson past the time gate is ready', s.ready, true);
}

// Quiz: pass is by quiz id, never by score.
{
  const l = quizLesson();
  const s = lessonCompletionState(blankP({ quiz_best_percent: { q1: 100 }, passed_quiz_ids: [] }), l);
  check('a perfect score without a recorded pass is not complete', s.quiz_ok, false);
  check('a perfect score without a pass leaves the lesson not ready', s.ready, false);
}
{
  const l = quizLesson();
  const s = lessonCompletionState(blankP({ passed_quiz_ids: ['q1'] }), l);
  check('a recorded pass completes the quiz requirement', s.quiz_ok, true);
  check('a recorded pass readies the lesson', s.ready, true);
}
{
  const l = quizLesson();
  const s = lessonCompletionState(blankP({ passed_quiz_ids: ['some-other-quiz'] }), l);
  check('a pass on a different quiz does not count', s.quiz_ok, false);
}

// `requirements` is the UI contract: one row per thing the learner must do.
{
  const s = lessonCompletionState(blankP(), videoLesson({ quiz: quizLesson().quiz }));
  checkJson(
    'a video+quiz lesson lists both requirements',
    s.requirements.map((r) => r.key),
    ['video', 'quiz']
  );
  check(
    'a video+quiz lesson is not ready until both are met',
    lessonCompletionState(blankP({ passed_quiz_ids: ['q1'] }), videoLesson({ quiz: quizLesson().quiz })).ready,
    false
  );
}
{
  const s = lessonCompletionState(blankP(), videoLesson());
  checkJson('a video-only lesson lists just the video', s.requirements.map((r) => r.key), ['video']);
}
{
  const s = lessonCompletionState(blankP(), lesson());
  checkJson('a reading lesson lists the time gate', s.requirements.map((r) => r.key), ['read']);
}

// A zero-duration video must not produce NaN/Infinity percentages.
{
  const l = videoLesson({ video: { provider: 'youtube', video_id: 'x'.repeat(11) } });
  const s = lessonCompletionState(blankP({ video_watch_seconds: { l1: 100 } }), l);
  check('an unknown duration yields 0%, not NaN', s.video_percent, 0);
}

// ---------------------------------------------------------------------------
// The real seconds behind the percentage, and the resume point
// ---------------------------------------------------------------------------
// The player has to be able to say "12:34 of 18:20 watched" and resume where the
// learner stopped, and it can only do that if the server hands back the numbers
// it is actually gating on — not a percentage the client would have to guess at.
{
  const l = videoLesson();
  const s = lessonCompletionState(
    blankP({
      video_watch_seconds: { l1: 300 },
      video_duration_seconds: { l1: 600 },
      video_position_seconds: { l1: 295 },
    }),
    l
  );
  check('watched seconds are reported', s.video_watched_seconds, 300);
  check('the gate duration is reported', s.video_duration_seconds, 600);
  check('the resume point is reported', s.video_position_seconds, 295);
  check('the watch gate is sent so the UI cannot hardcode it', s.watch_required_percent, 90);
}
{
  // A resume point past the end would drop the learner onto the end screen.
  const l = videoLesson();
  const s = lessonCompletionState(
    blankP({ video_duration_seconds: { l1: 600 }, video_position_seconds: { l1: 5000 } }),
    l
  );
  check('a resume point beyond the end is clamped to the duration', s.video_position_seconds, 600);
}
{
  // Negative or junk input must not leak through as a negative playhead.
  const l = videoLesson();
  const s = lessonCompletionState(
    blankP({ video_duration_seconds: { l1: 600 }, video_position_seconds: { l1: -30 } }),
    l
  );
  check('a negative resume point is floored at zero', s.video_position_seconds, 0);
}

// ---------------------------------------------------------------------------
// isLessonUnlocked — sequential gating
// ---------------------------------------------------------------------------

{
  const c = course();
  check('the first lesson is always open', isLessonUnlocked(blankP(), c, 'l1').unlocked, true);
  check('the second lesson is shut until the first is done', isLessonUnlocked(blankP(), c, 'l2').unlocked, false);
  check('the gate names the lesson to finish', /Lesson one/.test(isLessonUnlocked(blankP(), c, 'l2').reason), true);
}
{
  const c = course();
  check(
    'finishing the first opens the second',
    isLessonUnlocked(blankP({ completed_lesson_ids: ['l1'] }), c, 'l2').unlocked,
    true
  );
}
{
  // Revising a finished lesson must not re-lock it — that would strand a learner
  // on lesson 7 of 10 with no way back to the one they want to redo.
  const c = course();
  check(
    'a completed lesson stays open for revision',
    isLessonUnlocked(blankP({ completed_lesson_ids: ['l1'] }), c, 'l1').unlocked,
    true
  );
}
{
  const c = course();
  check('an unknown lesson id is reported, not silently open', isLessonUnlocked(blankP(), c, 'nope').unlocked, true);
}
{
  const c = course();
  check('no progress at all still opens lesson one', isLessonUnlocked(null, c, 'l1').unlocked, true);
}

// ---------------------------------------------------------------------------
// gradeQuiz
// ---------------------------------------------------------------------------

{
  const l = quizLesson();
  const g = gradeQuiz(l, { q1a: 1, q1b: 0 });
  check('a perfect answer sheet scores 100', g.score_percent, 100);
  check('a perfect answer sheet passes', g.passed, true);
  check('every question is reported', g.results.length, 2);
  check('the passing threshold is echoed back', g.passing_percent, 70);
}
{
  const l = quizLesson();
  const g = gradeQuiz(l, { q1a: 0, q1b: 1 });
  check('a fully wrong answer sheet scores 0', g.score_percent, 0);
  check('a fully wrong answer sheet fails', g.passed, false);
}
{
  const l = quizLesson();
  const g = gradeQuiz(l, { q1a: 1, q1b: 0 });
  check('a correct answer is reported correct', g.results[0].correct, true);
  check('an explanation is released after grading', g.results[0].explanation, 'because');
}
{
  // The important one: an omitted or out-of-range answer must not accidentally
  // match. A missing key means NaN, and NaN === 0 is false, so it is already
  // safe — this pins that, because a future "default to index 0" would break it.
  const l = quizLesson();
  const g = gradeQuiz(l, { q1a: 1 });
  check('an unanswered question scores zero, not a lucky correct', g.results[1].correct, false);
  check('a half-answered sheet scores 50', g.score_percent, 50);
  check('a half-answered sheet fails a 70% threshold', g.passed, false);
}
{
  const l = quizLesson();
  const g = gradeQuiz(l, { q1a: 99, q1b: -3 });
  check('an out-of-range answer is not credited', g.score_percent, 0);
}
{
  const l = quizLesson();
  const g = gradeQuiz(l, { q1a: 1.5, q1b: 0 });
  check('a non-integer answer is not credited', g.score_percent, 50);
}
{
  // A pass threshold of 0 would let an empty sheet pass. That is a data problem,
  // not a learner problem, so the grader must not be the thing that hides it.
  const l = quizLesson({ quiz: { id: 'q0', passing_percent: 0, questions: [] } });
  const g = gradeQuiz(l, {});
  check('an empty quiz does not crash the grader', g.results.length, 0);
}

// ---------------------------------------------------------------------------
// Quiz redaction — the answer key must never reach the learner
// ---------------------------------------------------------------------------

{
  const l = quizLesson();
  const view = sanitizeQuizForLearner(l.quiz!);
  const serialised = JSON.stringify(view);
  check('the learner view omits correct_index', serialised.includes('correct_index'), false);
  check('the learner view omits explanations', serialised.includes('because'), false);
  check('the learner view keeps the prompts', serialised.includes('One?'), true);
  check('the learner view keeps every option', view.questions[0].options.length, 3);
  check('the learner view reports the question count', view.question_count, 2);
}
{
  const l = quizLesson();
  const view = sanitizeLesson(l);
  const serialised = JSON.stringify(view);
  check('the syllabus view omits the whole question list', serialised.includes('One?'), false);
  check('the syllabus view still reports the question count', view.quiz?.question_count, 2);
}
{
  const l = videoLesson();
  check('the embed url is derived server-side', sanitizeLesson(l).video?.embed_url.includes('youtube-nocookie'), true);
// The Vimeo embed has to opt into the postMessage API, or the course player
// cannot read real playback state and has to fall back to a self-declared
// "I am watching" button.
//
// Asserted per-parameter rather than as a whole string. The exact-string form
// broke the moment Phase 4 added `dnt=1` and `playsinline=1` for inline mobile
// playback, and the fix then would have been to delete this assertion or paste
// the new string in - neither of which notices a *dropped* param, which is the
// failure that would actually matter here.
{
  const vimeo = embedUrlFor({ provider: 'vimeo', video_id: '76979871' } as any);
  check('a vimeo embed opts into the postMessage api', vimeo.includes('api=1'), true);
  check('a vimeo embed is told to play inline on a phone', vimeo.includes('playsinline=1'), true);
  check('a vimeo embed is sent do-not-track', vimeo.includes('dnt=1'), true);
  check('a vimeo embed still points at the right video', vimeo.startsWith('https://player.vimeo.com/video/76979871?'), true);

  const yt = embedUrlFor({ provider: 'youtube', video_id: 'abc123' } as any);
  check('a youtube embed is told to play inline on a phone', yt.includes('playsinline=1'), true);
  check('a youtube embed is sent do-not-track', yt.includes('dnt=1'), true);
}
  check('a lesson with no video reports null, not undefined', sanitizeLesson(lesson()).video, null);
  check('a lesson with no quiz reports null', sanitizeLesson(lesson()).quiz, null);
}

// ---------------------------------------------------------------------------
// sanitizeLesson -> kind
// ---------------------------------------------------------------------------
//
// `kind` is the lesson's MEDIUM and the syllabus draws its icon from it.
// It used to be `video ? 'video' : quiz ? 'quiz' : 'reading'`, which meant a
// reading lesson that happened to end in a challenge was published as a quiz -
// the learner was told they were about to be tested when they were about to be
// taught. Assessability is `has_quiz`, which is reported next to it.
//
// The seeded corpus has no quiz-only lessons at all, so 'quiz' described a
// combination that does not exist in the data.

check('a plain lesson is a reading', sanitizeLesson(lesson()).kind, 'reading');

check(
  'a reading lesson that carries a quiz is still a reading',
  sanitizeLesson(quizLesson()).kind,
  'reading'
);

check(
  'a reading lesson that carries a quiz still reports has_quiz',
  sanitizeLesson(quizLesson()).has_quiz,
  true
);

check(
  'a reading lesson that carries a quiz carries no questions in its syllabus view',
  sanitizeLesson(quizLesson()).quiz?.question_count,
  2
);

check('a video lesson is a video', sanitizeLesson(videoLesson()).kind, 'video');

// The combination that motivated the original ordering. The video is the medium
// the learner plays, and the quiz is an attribute of the lesson, so both flags
// have to survive: collapsing the quiz into `kind` is what lost the challenge
// count from the stats row.
{
  const both = sanitizeLesson(videoLesson({ quiz: quizLesson().quiz } as Partial<CourseLesson>));
  check('a video lesson that also has a quiz is a video', both.kind, 'video');
  check('...and still reports has_video', both.has_video, true);
  check('...and still reports has_quiz', both.has_quiz, true);
}

// Whatever the combination, `kind` must be exactly one of the two media the
// player knows how to present. This is the assertion that fails if anyone
// reinstates a third kind.
{
  const combos = [
    sanitizeLesson(lesson()),
    sanitizeLesson(quizLesson()),
    sanitizeLesson(videoLesson()),
    sanitizeLesson(videoLesson({ quiz: quizLesson().quiz } as Partial<CourseLesson>)),
  ];
  check(
    'kind is only ever video or reading, whatever the combination',
    combos.every((l) => l.kind === 'video' || l.kind === 'reading'),
    true
  );
  check(
    'no combination of video, quiz and blocks is reported as a quiz',
    combos.some((l) => l.kind === 'quiz'),
    false
  );
  check(
    'a video lesson is never reported as a reading',
    sanitizeLesson(videoLesson()).kind === 'reading',
    false
  );
  check(
    'has_quiz and kind stay independent: a reading lesson can be assessable',
    sanitizeLesson(quizLesson()).has_quiz && sanitizeLesson(quizLesson()).kind === 'reading',
    true
  );
}

// ---------------------------------------------------------------------------
// parseVideoUrl
// ---------------------------------------------------------------------------

checkJson('a youtube watch url parses', parseVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), {
  provider: 'youtube',
  video_id: 'dQw4w9WgXcQ',
});
checkJson('a youtu.be url parses', parseVideoUrl('https://youtu.be/dQw4w9WgXcQ'), {
  provider: 'youtube',
  video_id: 'dQw4w9WgXcQ',
});
checkJson('a youtube embed url parses', parseVideoUrl('https://www.youtube.com/embed/dQw4w9WgXcQ'), {
  provider: 'youtube',
  video_id: 'dQw4w9WgXcQ',
});
checkJson('a youtube shorts url parses', parseVideoUrl('https://youtube.com/shorts/dQw4w9WgXcQ'), {
  provider: 'youtube',
  video_id: 'dQw4w9WgXcQ',
});
checkJson('a vimeo url parses', parseVideoUrl('https://vimeo.com/76979871'), { provider: 'vimeo', video_id: '76979871' });
checkJson('a vimeo player url parses', parseVideoUrl('https://player.vimeo.com/video/76979871'), {
  provider: 'vimeo',
  video_id: '76979871',
});
// An admin must not be able to save a lesson pointing at nothing, so every
// unusable input has to come back null rather than a half-parsed object.
check('an empty url is rejected', parseVideoUrl(''), null);
check('a non-url is rejected', parseVideoUrl('just some text'), null);
check('an unknown host is rejected', parseVideoUrl('https://vimeo.com.evil.test/12345'), null);
check('a non-youtube host is rejected', parseVideoUrl('https://example.com/watch?v=dQw4w9WgXcQ'), null);
check('a too-short youtube id is rejected', parseVideoUrl('https://www.youtube.com/watch?v=short'), null);
check('a vimeo non-numeric id is rejected', parseVideoUrl('https://vimeo.com/not-a-number'), null);
check('a youtube url with no id is rejected', parseVideoUrl('https://www.youtube.com/'), null);

// ---------------------------------------------------------------------------
// orderedLessons — the canonical order everything else assumes
// ---------------------------------------------------------------------------

{
  // Deliberately out of order on input: module sort and lesson sort both apply.
  const c = course({
    modules: [
      { id: 'm2', course_id: 'c1', title: 'Second', summary: '', sort_order: 2, lessons: [lesson({ id: 'b1', sort_order: 1 })] },
      { id: 'm1', course_id: 'c1', title: 'First', summary: '', sort_order: 1, lessons: [lesson({ id: 'a2', sort_order: 2 }), lesson({ id: 'a1', sort_order: 1 })] },
    ],
  });
  checkJson(
    'lessons are ordered by module then lesson',
    orderedLessons(c).map((l) => l.id),
    ['a1', 'a2', 'b1']
  );
}
{
  check('a course with no modules yields no lessons', orderedLessons(course({ modules: [] })).length, 0);
}

// ---------------------------------------------------------------------------
// courseAccessState — the paid gate
// ---------------------------------------------------------------------------

{
  const a = courseAccessState({}, null, course({ is_free: true, price_inr: 0 }));
  check('a free course is granted to a signed-out visitor', a.granted, true);
  check('a free course has no refusal reason', a.reason, null);
}
{
  // `is_free` false but no price: treat as free rather than locking everyone out
  // of content an admin forgot to price.
  const a = courseAccessState({}, null, course({ is_free: false, price_inr: 0 }));
  check('a zero-price course is treated as free', a.granted, true);
}
{
  const paid = course({ is_free: false, price_inr: 4999 });
  const anon = courseAccessState({}, null, paid);
  check('a signed-out visitor cannot enter a paid course', anon.granted, false);
  check('a signed-out visitor is told to sign in', /Sign in/.test(anon.reason || ''), true);
  check('a signed-out visitor is quoted the price', anon.price_inr, 4999);

  const buyer = courseAccessState(
    { orders: [{ id: 'o1', user_id: 'u1', status: 'paid', items: [{ kind: 'course', id: 'c1' }] }] },
    'u1',
    paid
  );
  check('a paid order grants the course', buyer.granted, true);

  const unpaid = courseAccessState(
    { orders: [{ id: 'o2', user_id: 'u1', status: 'created', items: [{ kind: 'course', id: 'c1' }] }] },
    'u1',
    paid
  );
  check('an order that was created but not paid grants nothing', unpaid.granted, false);

  const revoked = courseAccessState(
    { orders: [{ id: 'o3', user_id: 'u1', status: 'rejected', items: [{ kind: 'course', id: 'c1' }] }] },
    'u1',
    paid
  );
  check('a rejected order grants nothing', revoked.granted, false);

  const other = courseAccessState(
    { orders: [{ id: 'o4', user_id: 'someone-else', status: 'paid', items: [{ kind: 'course', id: 'c1' }] }] },
    'u1',
    paid
  );
  check("another learner's paid order grants nothing", other.granted, false);

  const otherCourse = courseAccessState(
    { orders: [{ id: 'o5', user_id: 'u1', status: 'paid', items: [{ kind: 'course', id: 'c-other' }] }] },
    'u1',
    paid
  );
  check('paying for a different course grants nothing', otherCourse.granted, false);

  const admin = courseAccessState({}, 'u1', paid, { role: 'admin' });
  check('an admin is granted access for support and QA', admin.granted, true);
}
check('currency is formatted for display', formatInr(4999), '₹4,999');
check('currency formatting tolerates a float', formatInr(99.6), '₹100');
check('currency formatting tolerates nonsense', formatInr(NaN), '₹0');

// ---------------------------------------------------------------------------
// courseMaxXp — what the certificate honestly claims
// ---------------------------------------------------------------------------

{
  const c = course();
  // 2 lessons x 25 + the course-completion bonus.
  check('max xp sums the lessons plus the completion award', courseMaxXp(c), 50 + 150);
}
check('a course with no lessons claims only the completion award', courseMaxXp(course({ modules: [] })), 150);

// ---------------------------------------------------------------------------
// Constants that other code is allowed to depend on
// ---------------------------------------------------------------------------

check('the watch threshold is 90%', WATCH_THRESHOLD, 0.9);
check('a single heartbeat cannot credit more than 20s', MAX_HEARTBEAT_CREDIT_SECONDS, 20);
check('the read floor is 20s', READ_MIN_SECONDS, 20);
check('the read cap is 600s', READ_MAX_SECONDS, 600);
checkJson('the duration tolerance band is 0.7x-1.3x', [DURATION_TOLERANCE_LOW, DURATION_TOLERANCE_HIGH], [0.7, 1.3]);

// ---------------------------------------------------------------------------
// uniqueSlug
// ---------------------------------------------------------------------------
// This one gets its own section because it had no coverage at all, and it was
// hiding an infinite loop.
//
// The collision check used to be evaluated once into a `const taken` before the
// loop, so the loop condition never changed. The first duplicate encountered made
// `while (taken)` spin forever rather than moving on to the next candidate. On the
// main thread that does not merely fail the request - it stops the whole API
// process responding, so the blast radius was the whole site.
//
// It is reached by ordinary admin actions, so the duplicate cases below are the
// important ones, not the happy path.

const slugDb = (slugs: string[]): any => ({
  courses: slugs.map((s, i) => ({ id: `c${i + 1}`, slug: s })),
});

check('an unused slug is returned as-is', uniqueSlug(slugDb(['other']), 'python-basics'), 'python-basics');

check('a duplicate slug gets a -2 suffix', uniqueSlug(slugDb(['python-basics']), 'python-basics'), 'python-basics-2');

check(
  'a second collision moves on to -3 rather than repeating -2',
  uniqueSlug(slugDb(['python-basics', 'python-basics-2']), 'python-basics'),
  'python-basics-3'
);

check(
  'collisions are skipped over, not just the first one',
  uniqueSlug(slugDb(['a', 'a-2', 'a-3', 'a-4']), 'a'),
  'a-5'
);

// The bug's real signature: with the old code this call never returned, so the
// test process had to be killed rather than failing an assertion.
check(
  'ten duplicates in a row still terminate on a free slug',
  uniqueSlug(slugDb(Array.from({ length: 10 }, (_, i) => (i === 0 ? 'x' : `x-${i + 1}`))), 'x'),
  'x-11'
);

check(
  'a course keeping its own slug is not treated as a collision',
  uniqueSlug(slugDb(['python-basics']), 'python-basics', 'c1'),
  'python-basics'
);

// The ignored id has to be honoured for the suffixed candidates too, not just
// the first one. Here `c2` owns `python-basics-2`, so re-saving `c2` is free to
// reclaim that exact slug rather than being pushed to `-3`.
check(
  'the ignored id is honoured for suffixed candidates, not just the first',
  uniqueSlug(slugDb(['python-basics', 'python-basics-2']), 'python-basics-2', 'c2'),
  'python-basics-2'
);

check(
  'an empty course list leaves the slug alone',
  uniqueSlug({ courses: [] }, 'fresh'),
  'fresh'
);

check(
  'a db with no courses key at all does not throw',
  uniqueSlug({}, 'fresh'),
  'fresh'
);

// Duplicating the same course twice is the most likely way to hit this in real
// use: the duplicate route asks for `${slug}-copy`, so the second duplicate
// collides with the first.
check(
  'duplicating the same course twice finds a free slug',
  uniqueSlug(slugDb(['course', 'course-copy']), 'course-copy'),
  'course-copy-2'
);

check(
  'the desired slug is slugified before collisions are judged',
  uniqueSlug(slugDb(['hello-world']), 'Hello World!'),
  'hello-world-2'
);

// ---------------------------------------------------------------------------

console.log(`\ncourses-lib unit: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
