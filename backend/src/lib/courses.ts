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
  CourseLesson,
  CourseModule,
  CourseProgress,
  LessonVideo,
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
  if (video.provider === 'vimeo') return `https://player.vimeo.com/video/${video.video_id}`;
  return `https://www.youtube-nocookie.com/embed/${video.video_id}?enablejsapi=1&rel=0`;
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
  let slug = base;
  let n = 2;
  const taken = (db.courses || []).some(
    (c: Course) => c.slug === slug && c.id !== ignoreCourseId
  );
  while (taken) {
    slug = `${base}-${n}`;
    n += 1;
  }
  return slug;
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
} {
  const { quiz, ...rest } = lesson;
  // The embed src is derived here so the player does not have to reimplement
  // provider rules (privacy flags, nocookie, Vimeo path shape) and get one of
  // them subtly wrong.
  const view = { ...rest, video: lesson.video ? { ...lesson.video, embed_url: embedUrlFor(lesson.video) } : null };
  if (!quiz) return { ...view, quiz: null };
  return {
    ...view,
    quiz: {
      id: quiz.id,
      question_count: quiz.questions.length,
      passing_percent: quiz.passing_percent,
    },
  };
}

export function sanitizeCourse(course: Course) {
  return {
    ...course,
    modules: orderedModules(course).map((m) => ({
      ...m,
      lessons: (m.lessons || [])
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((l) => sanitizeLesson(l)),
    })),
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
    last_heartbeat_at: {},
    completed_lesson_ids: [],
    quiz_best_percent: {},
    passed_quiz_ids: [],
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
    last_heartbeat_at: p.last_heartbeat_at || {},
    quiz_best_percent: p.quiz_best_percent || {},
    completed_lesson_ids: p.completed_lesson_ids || [],
    passed_quiz_ids: p.passed_quiz_ids || [],
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
  quiz_best_percent: number | null;
  quiz_ok: boolean;
  read_percent: number;
  read_ok: boolean;
  ready: boolean;
  is_complete: boolean;
  /** What the learner still has to do, phrased for the UI. */
  requirements: { key: string; label: string; met: boolean }[];
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
    quiz_best_percent: quizBest ?? null,
    quiz_ok: quizOk,
    read_percent: readOk ? 100 : videoPercent,
    read_ok: readOk,
    ready: requirements.every((r) => r.met),
    is_complete: (progress?.completed_lesson_ids || []).includes(lesson.id),
    requirements,
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
