// ============================================================================
// COURSES DOMAIN — parsing, sanitising and grading rules.
//
// The important job in this file is deciding what the SERVER is willing to
// accept as proof that a learner finished something. The client can render a
// lesson and report its own state, but it can never declare itself complete and
// it can never name its own XP value.
// ============================================================================

import crypto from 'crypto';
import {
  Course,
  CourseExamConfig,
  CourseLesson,
  CourseModule,
  CourseModuleTest,
  CourseProgress,
  ExamAttempt,
  ExamQuestion,
  LessonVideo,
  ModuleTestAttempt,
  VideoProvider,
} from '../data/db';
import { XP } from './xp';
import { ownedCourseIdsFor } from '../payments/orders';

/** Fraction of a video that must actually be watched before the lesson counts. */
export const WATCH_THRESHOLD = 0.9;

/**
 * Upper bound on watch credit a single request may add. The player emits a
 * heartbeat roughly every 5 seconds, so this only ever bites on a tampered or
 * throttled client — it is what stops "set watched=99999" from working.
 */
export const MAX_HEARTBEAT_CREDIT_SECONDS = 20;

/** Read-only lessons have no video and no quiz, so completion is time-gated. */
export const READ_MIN_RATIO = 0.4;
export const READ_MIN_SECONDS = 20;
export const READ_MAX_SECONDS = 600;

/**
 * How far a client-reported player duration may stray from the duration the
 * author entered when the lesson was written.
 *
 * The completion percentage is watch_seconds / duration, so a client that gets
 * to choose its own denominator can declare a 19-minute video to be 3 seconds
 * long and clear the whole watch gate in one heartbeat. The duration the author
 * recorded is the only server-side number we have, so it becomes a bound: the
 * client's figure is believed, but only within a band around the author's.
 * Outside the band the server uses the author's figure and ignores the claim.
 */
export const DURATION_TOLERANCE_LOW = 0.7;
export const DURATION_TOLERANCE_HIGH = 1.3;

/** The author's own estimate of the video length, in seconds. 0 if unknown. */
export function authorVideoSeconds(lesson: CourseLesson): number {
  const minutes = Number(lesson.video?.duration_minutes) || 0;
  return minutes > 0 ? Math.round(minutes * 60) : 0;
}

/**
 * The duration the completion gate should actually divide by.
 *
 * Prefers the client's figure (the real player knows better than an estimate),
 * but clamps it to the author's ballpark so it cannot be used as a weapon.
 * With no author estimate, the client's figure is used as-is.
 */
export function effectiveVideoSeconds(lesson: CourseLesson, reportedSeconds: number): number {
  const author = authorVideoSeconds(lesson);
  const reported = Math.max(0, Number(reportedSeconds) || 0);

  if (author <= 0) return reported;
  if (reported <= 0) return author;

  const low = author * DURATION_TOLERANCE_LOW;
  const high = author * DURATION_TOLERANCE_HIGH;
  if (reported < low) return Math.round(author);
  if (reported > high) return Math.round(author);
  return Math.round(reported);
}

// ---------------------------------------------------------------------------
// Video URL parsing
// ---------------------------------------------------------------------------

/**
 * Extract a provider id from a YouTube or Vimeo URL. Returns null for anything
 * unrecognised so an admin cannot save a lesson pointing at nothing.
 */
export function parseVideoUrl(rawUrl: string): { provider: VideoProvider; video_id: string } | null {
  const url = (rawUrl || '').trim();
  if (!url) return null;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\./, '').toLowerCase();

  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
    const id =
      parsed.searchParams.get('v') ||
      (parsed.pathname.match(/^\/(embed|shorts|live|v)\/([^/?#]+)/)?.[2] ?? '');
    return isYoutubeId(id) ? { provider: 'youtube', video_id: id } : null;
  }

  if (host === 'youtu.be') {
    const id = parsed.pathname.replace(/^\//, '').split('/')[0];
    return isYoutubeId(id) ? { provider: 'youtube', video_id: id } : null;
  }

  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const id = parsed.pathname.match(/(\d+)/)?.[1] ?? '';
    return /^\d+$/.test(id) ? { provider: 'vimeo', video_id: id } : null;
  }

  return null;
}

function isYoutubeId(id: string): boolean {
  return /^[A-Za-z0-9_-]{11}$/.test(id);
}

/** Privacy-preserving embed URL. youtube-nocookie stops ad-personalisation. */
export function embedUrlFor(video: LessonVideo | null | undefined): string {
  if (!video?.video_id) return '';
  // `api=1` is what lets the page read real playback state out of a Vimeo
  // player over postMessage — without it the course player has to fall back to
  // asking the learner to vouch for their own watching.
  //
  // `playsinline=1` and `dnt=1` are the two params that make this behave like an
  // in-app player rather than a web page. Without `playsinline`, iOS Safari
  // hijacks the tap on play, tears the iframe out of the layout and takes over
  // the whole screen with its own player chrome — the learner loses the lesson
  // title, the sidebar and the next-lesson button, and on iPad the app is gone
  // entirely. It is a URL param, not an attribute, which is why an `allow` list
  // or a `playsInline` prop on our side cannot fix it.
  if (video.provider === 'vimeo')
    return `https://player.vimeo.com/video/${video.video_id}?api=1&dnt=1&playsinline=1`;
  return `https://www.youtube-nocookie.com/embed/${video.video_id}?enablejsapi=1&rel=0&playsinline=1&dnt=1`;
}

/**
 * Server-side existence check via the provider's public oEmbed endpoint.
 * Admin video pickers call this before saving, so a dead or mistyped URL is
 * rejected at authoring time instead of becoming a dead player for a student.
 */
export async function verifyVideoReachable(
  video: { provider: VideoProvider; video_id: string }
): Promise<{ ok: boolean; title?: string; channel?: string; error?: string }> {
  // Each provider has its own oEmbed endpoint. Vimeo ids must never be sent to
  // YouTube's endpoint: it 404s on every Vimeo url, which would reject every
  // Vimeo lesson an admin tried to save.
  const isVimeo = video.provider === 'vimeo';
  const watchUrl = isVimeo
    ? `https://vimeo.com/${video.video_id}`
    : `https://www.youtube.com/watch?v=${video.video_id}`;
  const oembedUrl = isVimeo
    ? `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(watchUrl)}`
    : `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(oembedUrl, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) {
      return {
        ok: false,
        error:
          res.status === 400 || res.status === 404 || res.status === 403
            ? // YouTube answers 400 and Vimeo 404 for "no such public video",
              // so all three collapse to the one message an admin can act on.
              `No public ${isVimeo ? 'Vimeo' : 'YouTube'} video with that id — check the link is not private or mistyped`
            : `Provider returned ${res.status}`,
      };
    }

    const data: any = await res.json().catch(() => ({}));
    return {
      ok: true,
      title: typeof data.title === 'string' ? data.title : `Vimeo video ${video.video_id}`,
      channel: typeof data.author_name === 'string' ? data.author_name : undefined,
    };
  } catch (err: any) {
    return {
      ok: false,
      error:
        err?.name === 'AbortError'
          ? 'Provider did not respond in time — try again'
          : 'Could not reach the video provider',
    };
  }
}

// ---------------------------------------------------------------------------
// Structure helpers
// ---------------------------------------------------------------------------

/** Every lesson in the course, in module then lesson order. */
export function orderedLessons(course: Course): CourseLesson[] {
  return (course.modules || [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .flatMap((m) => (m.lessons || []).slice().sort((a, b) => a.sort_order - b.sort_order));
}

export function orderedModules(course: Course): CourseModule[] {
  return (course.modules || []).slice().sort((a, b) => a.sort_order - b.sort_order);
}

export function courseStats(course: Course) {
  const lessons = orderedLessons(course);
  return {
    module_count: (course.modules || []).length,
    lesson_count: lessons.length,
    total_minutes: lessons.reduce((s, l) => s + (Number(l.duration_minutes) || 0), 0),
    total_xp: lessons.reduce((s, l) => s + (Number(l.xp_reward) || 0), 0),
    quiz_count: lessons.filter((l) => !!l.quiz).length,
    video_count: lessons.filter((l) => !!l.video).length,
  };
}

export function slugify(input: string, fallback = 'course'): string {
  const slug = (input || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return slug || fallback;
}

export function uniqueSlug(db: any, desired: string, ignoreCourseId?: string): string {
  const base = slugify(desired);

  const isTaken = (candidate: string) =>
    (db.courses || []).some((c: Course) => c.slug === candidate && c.id !== ignoreCourseId);

  /**
   * The collision test has to be re-run for every candidate.
   *
   * It used to be hoisted out of the loop and captured in a `const taken`, so the
   * value never changed: the first duplicate found made the `while` spin forever
   * instead of advancing to `base-2`, `base-3`, and so on. Because Node runs this
   * on the main thread, that busy loop did not just fail the one request - it
   * wedged the entire API process, so every other learner and admin request
   * stopped responding too, and the only way out was restarting the server.
   *
   * It is reached by entirely ordinary admin actions: creating a course whose slug
   * is already taken, renaming a course onto another course's slug, or duplicating
   * the same course twice.
   */
  if (!isTaken(base)) return base;

  let n = 2;
  for (;;) {
    const candidate = `${base}-${n}`;
    if (!isTaken(candidate)) return candidate;
    n += 1;
  }
}

export function findLesson(db: any, lessonId: string) {
  for (const course of db.courses || []) {
    for (const mod of course.modules || []) {
      const lesson = (mod.lessons || []).find((l: CourseLesson) => l.id === lessonId);
      if (lesson) return { course, module: mod, lesson };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Quiz redaction
// ---------------------------------------------------------------------------

/**
 * Strip the answer key before anything is sent to a learner. The correct index
 * and explanation exist only on the server and are released per-question after
 * a submission has been graded. This is what makes the score meaningful.
 */
/**
 * The quiz as the LEARNER is allowed to see it: every prompt and every option,
 * with no `correct_index` and no `explanation`.
 *
 * The syllabus deliberately shows only `question_count` (see `sanitizeLesson`),
 * but the lesson player has to be able to actually render the questions, so the
 * single-lesson response upgrades to this shape once the gate opens. Shipping
 * the key here would make the whole assessment decorative: the browser would
 * know every answer before the student picked one. Grading stays in
 * `gradeQuiz`, which is the only place that reads `correct_index`.
 */
export function sanitizeQuizForLearner(quiz: NonNullable<CourseLesson['quiz']>) {
  return {
    id: quiz.id,
    question_count: quiz.questions.length,
    passing_percent: quiz.passing_percent,
    questions: quiz.questions.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      // Options are plain strings; the learner picks by array position, which is
      // what `gradeQuiz` expects back in the submitted answer sheet.
      options: [...q.options],
    })),
  };
}

export function sanitizeLesson<T extends CourseLesson>(lesson: T): Omit<T, 'quiz'> & {
  quiz?: { id: string; question_count: number; passing_percent: number } | null;
  kind: string;
  has_video: boolean;
  has_quiz: boolean;
} {
  const { quiz, ...rest } = lesson;
  // The embed src is derived here so the player does not have to reimplement
  // provider rules (privacy flags, nocookie, Vimeo path shape) and get one of
  // them subtly wrong.
  const view = { ...rest, video: lesson.video ? { ...lesson.video, embed_url: embedUrlFor(lesson.video) } : null };

  // The lesson's MEDIUM, derived here rather than stored.
  //
  // `kind` is what the syllabus draws an icon from, and `has_video`/`has_quiz`
  // are what the stats row reads, so they have to be present on EVERY lesson the
  // API returns - open or locked. `lockedLessonStub` builds its own object for
  // locked lessons, and when this triple lived only there, the first (always
  // unlocked) lesson of a free course came back without them and rendered with a
  // blank icon. These are type flags, not content, so publishing them on an open
  // lesson discloses nothing that the locked stub already states.
  //
  // It used to be `video ? 'video' : quiz ? 'quiz' : 'reading'`, on the reasoning
  // that a lesson shipping both is "played as a quiz". That conflated the medium
  // with an attribute of it. Across all 109 seeded lessons there is not one that
  // is a quiz and nothing else: 104 reading lessons carry a quiz *and* teaching
  // blocks, and 3 are video. So the old expression labelled 104 reading lessons
  // as quizzes and gave the syllabus a quiz icon for material the learner reads.
  // Whether a lesson is assessable is `has_quiz`, which is reported separately and
  // is what the challenge counts come from - it does not need to be a second kind.
  const kind = lesson.video ? 'video' : 'reading';

  if (!quiz) return { ...view, kind, has_video: !!lesson.video, has_quiz: false, quiz: null };
  return {
    ...view,
    kind,
    has_video: !!lesson.video,
    has_quiz: true,
    quiz: {
      id: quiz.id,
      question_count: quiz.questions.length,
      passing_percent: quiz.passing_percent,
    },
  };
}

/**
 * The exam shape a learner may see BEFORE and DURING an attempt.
 *
 * Everything the interface needs to warn "20 questions, 30 minutes, 60% to
 * pass" — and nothing that could be used to skip the exam. The bank is reduced
 * to its size so the UI can say "drawn from 40 questions"; the questions
 * themselves are handed out per-attempt by the exam engine (no answers ever).
 * This is the same discipline as `sanitizeQuizForLearner`.
 */
export function sanitizeExamForLearner(exam: Course['exam']) {
  if (!exam) return null;
  return {
    question_count: exam.question_count,
    duration_minutes: exam.duration_minutes,
    passing_percent: exam.passing_percent,
    retake_cooldown_hours: exam.retake_cooldown_hours,
    distinction_percent: exam.distinction_percent,
    bank_size: Array.isArray(exam.bank) ? exam.bank.length : 0,
  };
}

export function sanitizeCourse(course: Course) {
  // `exam` carries the answer keys, so it is replaced rather than spread. A
  // wholesale `...course` would ship every `correct_index` to the browser and
  // make the final exam decorative. The same is true of each module's `test`.
  const { exam, ...rest } = course;
  return {
    ...rest,
    exam: sanitizeExamForLearner(exam),
    modules: orderedModules(course).map((m) => {
      // Strip the module-test bank the same way the course exam is stripped.
      const { test, ...modRest } = m;
      return {
        ...modRest,
        test: test
          ? {
              question_count: test.question_count,
              passing_percent: test.passing_percent,
              retake_cooldown_hours: test.retake_cooldown_hours,
              bank_size: Array.isArray(test.bank) ? test.bank.length : 0,
            }
          : null,
        lessons: (m.lessons || [])
          .slice()
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((l) => sanitizeLesson(l)),
      };
    }),
  };
}

// ---------------------------------------------------------------------------
// Progress
// ---------------------------------------------------------------------------

export function blankProgress(userId: string, courseId: string): CourseProgress {
  const now = new Date().toISOString();
  return {
    user_id: userId,
    course_id: courseId,
    enrolled_at: now,
    updated_at: now,
    completed_at: null,
    video_watch_seconds: {},
    video_duration_seconds: {},
    video_position_seconds: {},
    last_heartbeat_at: {},
    completed_lesson_ids: [],
    quiz_best_percent: {},
    passed_quiz_ids: [],
    exam_attempts: [],
    best_exam_percent: null,
    exam_passed: false,
    first_attempt_percent: null,
    last_attempt_at: null,
    project_url: null,
  };
}

export function getProgress(db: any, userId: string, courseId: string): CourseProgress | null {
  if (!db.course_progress) db.course_progress = {};
  return db.course_progress[userId]?.[courseId] || null;
}

/** Backfill fields added after a progress record was first written. */
function normaliseProgress(p: CourseProgress): CourseProgress {
  return {
    ...blankProgress(p.user_id, p.course_id),
    ...p,
    video_watch_seconds: p.video_watch_seconds || {},
    video_duration_seconds: p.video_duration_seconds || {},
    video_position_seconds: p.video_position_seconds || {},
    last_heartbeat_at: p.last_heartbeat_at || {},
    quiz_best_percent: p.quiz_best_percent || {},
    completed_lesson_ids: p.completed_lesson_ids || [],
    passed_quiz_ids: p.passed_quiz_ids || [],
    exam_attempts: Array.isArray(p.exam_attempts) ? p.exam_attempts : [],
    best_exam_percent: p.best_exam_percent ?? null,
    exam_passed: p.exam_passed === true,
    first_attempt_percent: p.first_attempt_percent ?? null,
    last_attempt_at: p.last_attempt_at || null,
    project_url: p.project_url ?? null,
  };
}

export function getOrCreateProgress(db: any, userId: string, course: Course): CourseProgress {
  if (!db.course_progress) db.course_progress = {};
  if (!db.course_progress[userId]) db.course_progress[userId] = {};
  const existing = db.course_progress[userId][course.id];
  if (existing) {
    const fixed = normaliseProgress(existing);
    db.course_progress[userId][course.id] = fixed;
    return fixed;
  }
  const fresh = blankProgress(userId, course.id);
  db.course_progress[userId][course.id] = fresh;
  return fresh;
}

// ---------------------------------------------------------------------------
// Gating
// ---------------------------------------------------------------------------

/**
 * Lessons unlock strictly in order: lesson N opens once lesson N-1 is complete.
 * The first lesson of a course is always open. The client is told which lesson
 * is locked, but the server re-derives this on every write, so a locked lesson
 * cannot be completed by calling the API directly.
 */
export function isLessonUnlocked(progress: CourseProgress | null, course: Course, lessonId: string) {
  const lessons = orderedLessons(course);
  const index = lessons.findIndex((l) => l.id === lessonId);
  if (index <= 0) return { unlocked: true, index, reason: '' };

  const completed = progress?.completed_lesson_ids || [];
  if (completed.includes(lessonId)) return { unlocked: true, index, reason: '' };

  const previous = lessons[index - 1];
  if (completed.includes(previous.id)) return { unlocked: true, index, reason: '' };

  return {
    unlocked: false,
    index,
    reason: `Finish "${previous.title}" first — this course runs lesson by lesson.`,
  };
}

/** A course opens only once its prerequisite is genuinely 100% complete. */
export function courseLockReason(db: any, userId: string | null, course: Course): string | null {
  if (!course.prerequisite_course_id) return null;
  if (!userId) return `Sign in to start — "${course.title}" is part of a learning sequence.`;

  const prereq = (db.courses || []).find((c: Course) => c.id === course.prerequisite_course_id);
  if (!prereq) return null;

  const state = completionState(db, userId, prereq);
  if (state.is_complete) return null;

  return `Complete "${prereq.title}" first — ${state.completed} of ${state.total} lessons done.`;
}

// ---------------------------------------------------------------------------
// Paid access
// ---------------------------------------------------------------------------

/**
 * Whether a user may take a course, decided from stored state only.
 *
 * This is the check that makes `is_free` mean something. Before it existed the
 * flag was display-only: `POST /:slug/enroll` consulted the prerequisite chain
 * and nothing else, so any signed-in account could enrol in a paid course,
 * unlock every lesson and walk away with a signed certificate. Hiding the
 * course *page* from logged-out visitors was never an access control.
 *
 * The grant is deliberately not time-limited and never revokes progress: a
 * learner who paid keeps the course even if the catalogue price changes later.
 */
export function courseAccessState(
  db: any,
  userId: string | null,
  course: Course,
  opts: { role?: string } = {}
): { granted: boolean; reason: string | null; price_inr: number; is_free: boolean } {
  const isFree = course.is_free === true;
  const price = Math.max(0, Number(course.price_inr) || 0);
  const base = { price_inr: price, is_free: isFree };

  if (isFree || price === 0) return { ...base, granted: true, reason: null };
  if (!userId) {
    return { ...base, granted: false, reason: 'Sign in to enrol in this course.' };
  }
  if (opts.role === 'admin') return { ...base, granted: true, reason: null };

  if (ownedCourseIdsFor(db, userId).includes(course.id)) {
    return { ...base, granted: true, reason: null };
  }

  return {
    ...base,
    granted: false,
    reason: `This course costs ${formatInr(price)}. Buy it to enrol.`,
  };
}

/** `₹1,299` — shared by the router and the admin copy so the two never drift. */
export function formatInr(amount: number): string {
  return `₹${Math.round(Number(amount) || 0).toLocaleString('en-IN')}`;
}

export function completionState(db: any, userId: string | null, course: Course) {
  const lessons = orderedLessons(course);
  const progress = userId ? getProgress(db, userId, course.id) : null;
  const completedIds = progress?.completed_lesson_ids || [];
  const completed = lessons.filter((l) => l.id && completedIds.includes(l.id)).length;
  const total = lessons.length;

  return {
    enrolled: !!progress,
    completed,
    total,
    percent: total === 0 ? 0 : Math.round((completed / total) * 100),
    is_complete: total > 0 && completed === total,
    completed_at: progress?.completed_at || null,
    completed_lesson_ids: completedIds,
    xp_earned: completedIds.reduce((sum, id) => {
      const lesson = lessons.find((l) => l.id === id);
      return sum + (lesson ? Number(lesson.xp_reward) || 0 : 0);
    }, 0),
    next_lesson_id: lessons.find((l) => !completedIds.includes(l.id))?.id || null,
  };
}

// ---------------------------------------------------------------------------
// Lesson completion rules — the only place "done" is decided
// ---------------------------------------------------------------------------

export interface LessonCompletionState {
  has_video: boolean;
  has_quiz: boolean;
  video_percent: number;
  video_ok: boolean;
  /**
   * The real numbers behind `video_percent`, so the player can say "12:34 of
   * 18:20 watched" instead of a bare percentage the learner cannot act on.
   * `video_duration_seconds` is the same bounded duration the gate divides by,
   * and `video_position_seconds` is where the learner stopped.
   */
  video_watched_seconds: number;
  video_duration_seconds: number;
  video_position_seconds: number;
  quiz_best_percent: number | null;
  quiz_ok: boolean;
  read_percent: number;
  read_ok: boolean;
  ready: boolean;
  is_complete: boolean;
  /** What the learner still has to do, phrased for the UI. */
  requirements: { key: string; label: string; met: boolean }[];
  /**
   * The gate, as a percentage. Sent so the player can mark the 90% tick and
   * phrase "N% still to go" without hardcoding a number that could drift from
   * the server's WATCH_THRESHOLD.
   */
  watch_required_percent: number;
}

/** Seconds a read-only lesson must be on screen before it can be completed. */
export function readRequiredSeconds(lesson: CourseLesson): number {
  const estimated = (Number(lesson.duration_minutes) || 0) * 60;
  return Math.min(READ_MAX_SECONDS, Math.max(READ_MIN_SECONDS, estimated * READ_MIN_RATIO));
}

export function lessonCompletionState(
  progress: CourseProgress | null,
  lesson: CourseLesson
): LessonCompletionState {
  const hasVideo = !!lesson.video;
  const hasQuiz = !!lesson.quiz;

  const watched = Number(progress?.video_watch_seconds?.[lesson.id]) || 0;
  const reported = Number(progress?.video_duration_seconds?.[lesson.id]) || 0;
  const position = Number(progress?.video_position_seconds?.[lesson.id]) || 0;
  // Divide by the bounded duration, never by the raw client claim.
  const duration = hasVideo ? effectiveVideoSeconds(lesson, reported) : 0;
  const videoPercent = duration > 0 ? Math.min(100, Math.round((watched / duration) * 100)) : 0;
  const videoOk = hasVideo ? videoPercent >= Math.round(WATCH_THRESHOLD * 100) : true;

  const quizBest = progress?.quiz_best_percent?.[lesson.quiz?.id || ''];
  const quizOk = hasQuiz ? (progress?.passed_quiz_ids || []).includes(lesson.quiz!.id) : true;

  const readOk = hasVideo || hasQuiz ? true : (Number(progress?.video_watch_seconds?.[lesson.id]) || 0) >= readRequiredSeconds(lesson);

  const requirements: LessonCompletionState['requirements'] = [];
  if (hasVideo) {
    requirements.push({
      key: 'video',
      label: `Watch at least ${Math.round(WATCH_THRESHOLD * 100)}% of the video`,
      met: videoOk,
    });
  }
  if (hasQuiz) {
    requirements.push({
      key: 'quiz',
      label: `Score at least ${lesson.quiz!.passing_percent}% on the quiz`,
      met: quizOk,
    });
  }
  if (!hasVideo && !hasQuiz) {
    requirements.push({
      key: 'read',
      label: `Spend about ${Math.round(readRequiredSeconds(lesson) / 60)} min on this lesson`,
      met: readOk,
    });
  }

  return {
    has_video: hasVideo,
    has_quiz: hasQuiz,
    video_percent: videoPercent,
    video_ok: videoOk,
    video_watched_seconds: Math.round(watched),
    video_duration_seconds: Math.round(duration),
    // Never hand back a playhead past the end: a resume target of duration
    // would drop the learner straight onto the end screen with nothing to play.
    video_position_seconds: Math.round(Math.min(Math.max(0, position), duration > 0 ? duration : position)),
    quiz_best_percent: quizBest ?? null,
    quiz_ok: quizOk,
    read_percent: readOk ? 100 : videoPercent,
    read_ok: readOk,
    ready: requirements.every((r) => r.met),
    is_complete: (progress?.completed_lesson_ids || []).includes(lesson.id),
    requirements,
    watch_required_percent: Math.round(WATCH_THRESHOLD * 100),
  };
}

/**
 * Grade a quiz submission against the stored answer key. Best-of scoring is
 * applied by the caller; this only ever reports the truth about one attempt.
 */
export function gradeQuiz(
  lesson: CourseLesson,
  answers: Record<string, number>
): {
  score_percent: number;
  passed: boolean;
  passing_percent: number;
  results: { id: string; prompt: string; chosen_index: number; correct_index: number; correct: boolean; explanation: string }[];
} {
  const quiz = lesson.quiz;
  if (!quiz) {
    return { score_percent: 0, passed: false, passing_percent: 0, results: [] };
  }

  const results = quiz.questions.map((q) => {
    const chosen = Number(answers[q.id]);
    const hasAnswer = Number.isInteger(chosen) && chosen >= 0 && chosen < q.options.length;
    const safeChoice = hasAnswer ? chosen : -1;
    return {
      id: q.id,
      prompt: q.prompt,
      chosen_index: safeChoice,
      correct_index: q.correct_index,
      correct: hasAnswer && safeChoice === q.correct_index,
      explanation: q.explanation,
    };
  });

  const correctCount = results.filter((r) => r.correct).length;
  const score = Math.round((correctCount / quiz.questions.length) * 100);

  return {
    score_percent: score,
    passed: score >= quiz.passing_percent,
    passing_percent: quiz.passing_percent,
    results,
  };
}

// ---------------------------------------------------------------------------
// Final exam engine
// ---------------------------------------------------------------------------
//
// The exam is the one assessment that decides a certificate, so it is built to
// the same rule as the lesson quizzes and then some:
//
//   * The bank never leaves the server. `sanitizeExamForLearner` publishes the
//     shape; the questions are handed out per attempt, and only after a graded
//     submission does the answer key come back with the result.
//   * A draw is random and unpredictable (crypto-backed), so two learners — or
//     the same learner on two attempts — do not sit the same paper.
//   * Every judgement (score, pass, cooldown, Distinction eligibility) is
//     re-derived here from stored state. The client reports answers, never a
//     score.

/** Slack granted on top of the timer before a submission is refused. */
export const EXAM_GRACE_SECONDS = 30;

/** A course only has an exam if it carries a usable bank and draw size. */
export function examConfigOf(course: Course): CourseExamConfig | null {
  const exam = course.exam;
  if (!exam || !Array.isArray(exam.bank) || exam.bank.length === 0) return null;
  if (!Number.isFinite(exam.question_count) || exam.question_count <= 0) return null;
  return exam;
}

/**
 * Unbiased Fisher–Yates shuffle. Uses `crypto.randomInt`, not `Math.random`,
 * so a draw cannot be predicted from previous outputs — the bank's ordering or
 * a seeded PRNG would let a determined learner work out the next paper.
 */
function shuffled<T>(items: T[]): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export interface ExamLearnerState {
  question_count: number;
  duration_minutes: number;
  passing_percent: number;
  retake_cooldown_hours: number;
  distinction_percent: number;
  bank_size: number;
  attempts_count: number;
  best_percent: number | null;
  first_attempt_percent: number | null;
  passed: boolean;
  last_attempt_at: string | null;
  cooldown_until: string | null;
  in_progress: boolean;
  can_start: boolean;
  project_required: boolean;
  project_title: string | null;
}

function durationMsOf(exam: CourseExamConfig): number {
  return Math.max(1, Number(exam.duration_minutes) || 1) * 60_000;
}

/** Newest attempt first, by start time. */
function attemptsNewestFirst(progress: CourseProgress | null): ExamAttempt[] {
  return (progress?.exam_attempts || []).slice().sort((a, b) => b.started_at.localeCompare(a.started_at));
}

/**
 * Everything the exam card needs to render its state, derived from stored
 * attempts. `null` when the course has no exam.
 */
export function examStateForLearner(course: Course, progress: CourseProgress | null): ExamLearnerState | null {
  const exam = examConfigOf(course);
  if (!exam) return null;

  const attempts = progress?.exam_attempts || [];
  const graded = attempts.filter((a) => a.graded);
  const passed = progress?.exam_passed === true;
  const durationMs = durationMsOf(exam);
  const now = Date.now();

  const lastGradedAt = graded.reduce<string | null>((latest, a) => {
    const at = a.submitted_at || a.started_at;
    return at && (!latest || at > latest) ? at : latest;
  }, null);

  const cooldownMs = Math.max(0, Number(exam.retake_cooldown_hours) || 0) * 3_600_000;
  const cooldownUntilIso =
    !passed && lastGradedAt && cooldownMs > 0
      ? new Date(new Date(lastGradedAt).getTime() + cooldownMs).toISOString()
      : null;
  const cooldownActive = !!cooldownUntilIso && now < new Date(cooldownUntilIso).getTime();

  // An ungraded attempt that is still inside its window is resumable, so a new
  // one must not start. An expired ungraded attempt is rolled over at start.
  const open = attempts.find((a) => !a.graded) || null;
  const inProgress = !!open && now < new Date(open.started_at).getTime() + durationMs;

  return {
    question_count: Math.min(Number(exam.question_count) || 0, exam.bank.length),
    duration_minutes: Number(exam.duration_minutes) || 0,
    passing_percent: Number(exam.passing_percent) || 0,
    retake_cooldown_hours: Number(exam.retake_cooldown_hours) || 0,
    distinction_percent: Number(exam.distinction_percent) || 0,
    bank_size: exam.bank.length,
    attempts_count: graded.length,
    best_percent: progress?.best_exam_percent ?? null,
    first_attempt_percent: progress?.first_attempt_percent ?? null,
    passed,
    last_attempt_at: progress?.last_attempt_at ?? null,
    cooldown_until: cooldownActive ? cooldownUntilIso : null,
    in_progress: inProgress,
    can_start: !inProgress && !passed && !cooldownActive,
    project_required: course.project?.required_for_certificate === true,
    project_title: course.project?.title || null,
  };
}

/**
 * Draw a fresh paper for an attempt. `question_count` is clamped to the bank so
 * a mis-sized config can never ask for more questions than exist (which would
 * otherwise silently shorten the paper and inflate the score).
 *
 * Takes the structural subset both the final exam and a module test provide.
 */
export function drawExamQuestions(exam: {
  bank: ExamQuestion[];
  question_count: number;
}): { question_ids: string[] } {
  const count = Math.min(Math.max(1, Number(exam.question_count) || 1), exam.bank.length);
  return { question_ids: shuffled(exam.bank).slice(0, count).map((q) => q.id) };
}

/**
 * The learner-safe shape of a drawn paper: prompt and options only. The answer
 * key and explanations stay server-side until `gradeExam` has run.
 */
export function sanitizeExamQuestions(
  exam: { bank: ExamQuestion[] },
  questionIds: string[]
) {
  const byId = new Map(exam.bank.map((q) => [q.id, q]));
  return questionIds
    .map((id) => byId.get(id))
    .filter((q): q is ExamQuestion => !!q)
    .map((q) => ({
      id: q.id,
      prompt: q.prompt,
      options: [...q.options],
      difficulty: q.difficulty,
      topic: q.topic || null,
    }));
}

/**
 * Grade a submitted paper. Only ever reports the truth about one attempt; the
 * caller applies best-of and the pass/cooldown rules.
 */
export function gradeExam(
  exam: { bank: ExamQuestion[]; passing_percent: number },
  questionIds: string[],
  answers: Record<string, number>
): {
  score_percent: number;
  passed: boolean;
  passing_percent: number;
  results: {
    id: string;
    prompt: string;
    difficulty: string;
    chosen_index: number;
    correct_index: number;
    correct: boolean;
    explanation: string;
  }[];
} {
  const byId = new Map(exam.bank.map((q) => [q.id, q]));
  const results = questionIds
    .map((id) => {
      const q = byId.get(id);
      if (!q) return null;
      const chosen = Number(answers[id]);
      const hasAnswer = Number.isInteger(chosen) && chosen >= 0 && chosen < q.options.length;
      return {
        id: q.id,
        prompt: q.prompt,
        difficulty: q.difficulty,
        chosen_index: hasAnswer ? chosen : -1,
        correct_index: q.correct_index,
        correct: hasAnswer && chosen === q.correct_index,
        explanation: q.explanation,
      };
    })
    .filter((r): r is NonNullable<typeof r> => !!r);

  const total = results.length || 1;
  const correctCount = results.filter((r) => r.correct).length;
  const score = Math.round((correctCount / total) * 100);

  return {
    score_percent: score,
    passed: score >= (Number(exam.passing_percent) || 0),
    passing_percent: Number(exam.passing_percent) || 0,
    results,
  };
}

// ---------------------------------------------------------------------------
// Module tests — the checkpoint at the end of a module.
//
// Same discipline as the final exam (randomised draw, server-side grading,
// keys never leave before submit), but untimed, scoped to one module, and —
// deliberately — NOT part of `certificateReadiness`. A module test is a
// practice gate; the certificate is gated by the final exam and the project.
// ---------------------------------------------------------------------------

/** A module only has a test if it carries a usable bank and draw size. */
export function moduleTestConfigOf(mod: CourseModule): CourseModuleTest | null {
  const test = mod.test;
  if (!test || !Array.isArray(test.bank) || test.bank.length === 0) return null;
  if (!Number.isFinite(test.question_count) || test.question_count <= 0) return null;
  return test;
}

/** True once every lesson in the module is complete — the gate to its test. */
export function moduleLessonsComplete(progress: CourseProgress | null, mod: CourseModule): boolean {
  const lessons = mod.lessons || [];
  if (!lessons.length) return false;
  const done = new Set(progress?.completed_lesson_ids || []);
  return lessons.every((l) => done.has(l.id));
}

export interface ModuleTestLearnerState {
  module_id: string;
  question_count: number;
  passing_percent: number;
  retake_cooldown_hours: number;
  bank_size: number;
  attempts_count: number;
  best_percent: number | null;
  passed: boolean;
  last_attempt_at: string | null;
  cooldown_until: string | null;
  in_progress: boolean;
  /** All module lessons done and no attempt currently open. */
  can_start: boolean;
  lessons_complete: boolean;
}

/** Attempts for one module, newest first. */
function moduleAttempts(progress: CourseProgress | null, moduleId: string): ModuleTestAttempt[] {
  return (progress?.module_test_attempts || [])
    .filter((a) => a.module_id === moduleId)
    .slice()
    .sort((a, b) => b.started_at.localeCompare(a.started_at));
}

/**
 * Everything the module-test card needs, derived from stored attempts. `null`
 * when the module has no test.
 */
export function moduleTestStateForLearner(
  mod: CourseModule,
  progress: CourseProgress | null
): ModuleTestLearnerState | null {
  const test = moduleTestConfigOf(mod);
  if (!test) return null;

  const attempts = moduleAttempts(progress, mod.id);
  const graded = attempts.filter((a) => a.graded);
  const passed = graded.some((a) => a.passed);
  const lessonsComplete = moduleLessonsComplete(progress, mod);

  const lastGradedAt = graded.reduce<string | null>((latest, a) => {
    const at = a.submitted_at || a.started_at;
    return at && (!latest || at > latest) ? at : latest;
  }, null);

  const cooldownMs = Math.max(0, Number(test.retake_cooldown_hours) || 0) * 3_600_000;
  const cooldownUntilIso =
    !passed && lastGradedAt && cooldownMs > 0
      ? new Date(new Date(lastGradedAt).getTime() + cooldownMs).toISOString()
      : null;
  const cooldownActive = !!cooldownUntilIso && Date.now() < new Date(cooldownUntilIso).getTime();

  // Module tests are untimed, so an ungraded attempt stays open until it is
  // submitted or the learner starts over — a new draw must not race an open one.
  const inProgress = attempts.some((a) => !a.graded);
  const best = graded.reduce<number | null>((b, a) => {
    if (a.score_percent == null) return b;
    return b == null || a.score_percent > b ? a.score_percent : b;
  }, null);

  return {
    module_id: mod.id,
    question_count: Math.min(Number(test.question_count) || 0, test.bank.length),
    passing_percent: Number(test.passing_percent) || 0,
    retake_cooldown_hours: Number(test.retake_cooldown_hours) || 0,
    bank_size: test.bank.length,
    attempts_count: graded.length,
    best_percent: best,
    passed,
    last_attempt_at: lastGradedAt,
    cooldown_until: cooldownActive ? cooldownUntilIso : null,
    in_progress: inProgress,
    // Same rule as the final exam: a pass stands, so a passed test cannot be
    // re-sat to chase a higher number. A failure can be retaken (subject to
    // the cooldown) because the point of the test is to eventually pass it.
    can_start: lessonsComplete && !inProgress && !passed && !cooldownActive,
    lessons_complete: lessonsComplete,
  };
}

/**
 * The learner-safe shape of a module's test, for the syllabus: config summary
 * plus this learner's state. The bank is reduced to its size — same rule as
 * `sanitizeExamForLearner`.
 */
export function sanitizeModuleTestForLearner(
  mod: CourseModule,
  progress: CourseProgress | null
) {
  const test = moduleTestConfigOf(mod);
  if (!test) return null;
  const state = moduleTestStateForLearner(mod, progress);
  return {
    question_count: Math.min(Number(test.question_count) || 0, test.bank.length),
    passing_percent: Number(test.passing_percent) || 0,
    retake_cooldown_hours: Number(test.retake_cooldown_hours) || 0,
    bank_size: test.bank.length,
    state,
  };
}

export interface CertificateReadiness {
  ready: boolean;
  missing: string[];
  score_percent: number | null;
  /** True when the first attempt cleared the course's distinction threshold. */
  distinction: boolean;
  exam_required: boolean;
  project_required: boolean;
  project_url: string | null;
  project_title: string | null;
}

/**
 * The full set of gates between a learner and their certificate, in one place.
 *
 * The certificate endpoint and the course page both call this, so "claim" only
 * ever appears when the server would actually issue. Lesson completion and
 * course access are checked by the caller (they need request-specific data);
 * this covers the assessment gates.
 */
export function certificateReadiness(db: any, userId: string, course: Course): CertificateReadiness {
  const progress = getProgress(db, userId, course.id);
  const exam = examConfigOf(course);
  const missing: string[] = [];

  const examRequired = !!exam;
  if (examRequired) {
    const state = examStateForLearner(course, progress);
    if (!state?.passed) missing.push('final_exam');
  }

  const projectRequired = course.project?.required_for_certificate === true;
  const projectUrl = progress?.project_url || null;
  if (projectRequired && !projectUrl) missing.push('project');

  const state = examRequired ? examStateForLearner(course, progress) : null;
  const distinction =
    !!exam &&
    progress?.first_attempt_percent != null &&
    progress.first_attempt_percent >= (Number(exam.distinction_percent) || 101);

  return {
    ready: missing.length === 0,
    missing,
    score_percent: progress?.best_exam_percent ?? null,
    distinction,
    exam_required: examRequired,
    project_required: projectRequired,
    project_url: projectUrl,
    project_title: course.project?.title || null,
  };
}

// ---------------------------------------------------------------------------
// Certificates
// ---------------------------------------------------------------------------

/** Crockford-style alphabet: no I, L, O, U — unambiguous when read aloud. */
const SERIAL_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export function generateSerial(): string {
  const bytes = crypto.randomBytes(8);
  let out = '';
  for (const b of bytes) out += SERIAL_ALPHABET[b % SERIAL_ALPHABET.length];
  return `TIEEDU-${new Date().getFullYear()}-${out}`;
}

/** Total XP obtainable from a course, used to display honest certificates. */
export function courseMaxXp(course: Course): number {
  return (
    orderedLessons(course).reduce((s, l) => s + (Number(l.xp_reward) || 0), 0) + XP.COURSE_COMPLETE
  );
}
