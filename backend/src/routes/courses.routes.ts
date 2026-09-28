// ============================================================================
// COURSES — the student-facing API.
//
// Guarantees this router is built around:
//
//  * Identity always comes from the Bearer token. There is no user_id in any
//    request body, so progress cannot be written to somebody else's record.
//  * Every completion decision is re-derived here from stored state. The client
//    reports *what happened* (a heartbeat, an answer sheet) and the server
//    decides *what that means*.
//  * XP amounts are read from the lesson record or the XP table. No request
//    body value is ever used as an amount.
//  * Quiz answer keys never leave the server before a graded submission.
//  * Course access respects the prerequisite chain and lesson order, on the
//    server, not just in the UI.
// ============================================================================

import { Request, Response } from 'express';
import { Router } from 'express';
import { loadDb, saveDb, Course, CourseLesson, Certificate, CourseFeedback } from '../data/db';
import { optionalAuth, requireAuth, rateLimit } from '../middleware/auth';
import { awardAndCommit, levelFor, totalXpForUser, xpHistory, XP } from '../lib/xp';
import {
  MAX_HEARTBEAT_CREDIT_SECONDS,
  completionState,
  courseAccessState,
  courseLockReason,
  courseStats,
  effectiveVideoSeconds,
  findLesson,
  generateSerial,
  getOrCreateProgress,
  getProgress,
  gradeQuiz,
  isLessonUnlocked,
  lessonCompletionState,
  orderedLessons,
  orderedModules,
  sanitizeLesson,
  sanitizeCourse,
  sanitizeQuizForLearner,
} from '../lib/courses';
import {
  buildCertificatePdf,
  signCertificate,
  verificationUrlFor,
  verifyCertificate,
} from '../lib/certificate';

export const coursesRouter = Router();

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function publishedCourses(db: any): Course[] {
  return (db.courses || []).filter((c: Course) => c.published);
}

function findBySlug(db: any, slug: string): Course | undefined {
  return publishedCourses(db).find((c: Course) => c.slug === slug);
}

/**
 * Per-lesson view the player needs: structure + the learner's own state.
 *
 * Note the quiz stays as a bare `{question_count, passing_percent}` here, and
 * that is deliberate even though the lesson is unlocked: this function also
 * builds the SYLLABUS in `courseView`, and shipping every prompt in the course
 * detail response would undo the "one lesson at a time" pacing and make the
 * course page a few hundred KB. `GET /lessons/:lessonId` is the only endpoint
 * that upgrades to the real questions, via `playerLessonView` below.
 */
function lessonView(progress: any, lesson: CourseLesson) {
  return {
    ...sanitizeLesson(lesson),
    state: lessonCompletionState(progress, lesson),
    // Authoritative gate flag. The client must never re-derive this: `state.ready`
    // means "the learner has met this lesson's completion requirements", which is
    // a different question from "may they open it". Deriving the second from the
    // first makes every not-yet-started lesson look locked forever, deadlocking
    // the course after lesson 1.
    locked: false,
  };
}

/**
 * The single-lesson response the player renders. Identical to `lessonView` plus
 * the question list — prompts and options only, never `correct_index` or
 * `explanation`, which stay server-side until an attempt has been graded.
 */
function playerLessonView(progress: any, lesson: CourseLesson) {
  const view = sanitizeLesson(lesson);
  return {
    ...view,
    ...(lesson.quiz ? { quiz: sanitizeQuizForLearner(lesson.quiz) } : {}),
    state: lessonCompletionState(progress, lesson),
    locked: false,
  };
}

/**
 * The same lesson, minus its teaching content, for a learner who has not
 * unlocked it yet.
 *
 * A locked lesson must still be *listed* — the syllabus has to be visible so a
 * student knows what they are working towards — but the body is not sent. The
 * blocks contain the explanations and worked answers, and the video object
 * contains the URL, so shipping either one would let anyone read or watch the
 * whole course in order in the network tab while the progress screen still
 * claimed the gate was holding.
 */
function lockedLessonStub(lesson: CourseLesson, progress: any, lockReason = '') {
  return {
    id: lesson.id,
    module_id: lesson.module_id,
    title: lesson.title,
    summary: lesson.summary,
    sort_order: lesson.sort_order,
    duration_minutes: lesson.duration_minutes,
    kind: lesson.video ? 'video' : lesson.quiz ? 'quiz' : 'reading',
    has_video: !!lesson.video,
    has_quiz: !!lesson.quiz,
    // Deliberately absent: blocks, video, quiz.
    state: lessonCompletionState(progress, lesson),
    locked: true,
    /** Why the gate is closed, so the syllabus can explain itself. */
    lock_reason: lockReason || null,
  };
}

/** Full course view: sanitised lessons with state, plus progress and gating. */
function courseView(db: any, userId: string | null, course: Course, role?: string) {
  const progress = userId ? getProgress(db, userId, course.id) : null;
  const state = completionState(db, userId, course);
  const access = courseAccessState(db, userId, course, { role });

  // The learner's own certificate, if it has already been issued. Without this
  // the page cannot tell "claim your certificate" from "download your
  // certificate", so it shows the claim button forever and the learner has to
  // click through a no-op to reach the download.
  const own = userId
    ? (db.certificates || []).find(
        (c: Certificate) => c.user_id === userId && c.course_id === course.id && c.status === 'active'
      )
    : undefined;

  return {
    ...sanitizeCourse(course),
    modules: orderedModules(course).map((m) => ({
      ...m,
      lessons: (m.lessons || [])
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((l) => {
          // Same rule as the single-lesson route: the syllabus is public, the
          // teaching content is not, until the learner reaches it in order.
          //
          // `isLessonUnlocked` opens the first lesson unconditionally, so a
          // signed-out visitor to a FREE course does receive lesson 1's blocks
          // here. That is intentional — it is the course's public sample, and
          // smokeCourses.ts asserts it on purpose. It is not a hole: the
          // `access.granted` branch below short-circuits first, so on a paid
          // course a signed-out visitor gets stubs for every lesson, sample
          // included.
          const gate = isLessonUnlocked(progress, course, l.id);
          // A locked-by-purchase lesson is also a stub, and for the same reason:
          // the blocks contain the teaching content and the video object holds
          // the URL. Browsing the syllabus must not hand over the course.
          if (!access.granted) return lockedLessonStub(l, progress, access.reason || 'Enrol to unlock.');
          return gate.unlocked
            ? lessonView(progress, l)
            : lockedLessonStub(l, progress, gate.reason);
        }),
    })),
    stats: courseStats(course),
    progress: state,
    access,
    // Enough for the client to render the right button without a second request.
    certificate: own ? presentCertificate(db, own) : null,
    certificate_eligible: course.certificate_eligible,
    lock_reason: userId ? courseLockReason(db, userId, course) : null,
  };
}

/**
 * Promote a lesson to complete and, if that finishes the course, close the
 * course out. Every XP grant is a ledger row with a deterministic key, so a
 * retry or a double-submit cannot mint a second award.
 */
function settleCompletion(
  db: any,
  userId: string,
  course: Course,
  progress: any,
  lesson: CourseLesson
) {
  const xp: { reason: string; xp: number; awarded: boolean }[] = [];

  if (!progress.completed_lesson_ids.includes(lesson.id)) {
    progress.completed_lesson_ids.push(lesson.id);
    const res = awardAndCommit(db, {
      userId,
      key: `lesson:${lesson.id}:${userId}`,
      reason: 'lesson_complete',
      xp: Number(lesson.xp_reward) || XP.LESSON_COMPLETE,
      courseId: course.id,
      lessonId: lesson.id,
      note: `Completed lesson: ${lesson.title}`,
    });
    xp.push({ reason: 'lesson_complete', xp: res.event.xp, awarded: res.awarded });
  }

  const after = completionState(db, userId, course);
  if (after.is_complete && !progress.completed_at) {
    progress.completed_at = new Date().toISOString();
    const res = awardAndCommit(db, {
      userId,
      key: `course:${course.id}:${userId}`,
      reason: 'course_complete',
      xp: XP.COURSE_COMPLETE,
      courseId: course.id,
      note: `Finished course: ${course.title}`,
    });
    xp.push({ reason: 'course_complete', xp: res.event.xp, awarded: res.awarded });
  }

  return { xp, course_complete: after.is_complete };
}

// ============================================================================
// CATALOG
// ============================================================================

// GET /api/courses — published catalog, free first. Progress overlaid when signed in.
coursesRouter.get('/', optionalAuth, (req: Request, res: Response) => {
  const db = loadDb();
  const userId = req.user?.id || null;
  const q = (req.query.q as string || '').trim().toLowerCase();
  const category = (req.query.category as string || '').trim();

  let list = publishedCourses(db);

  if (q) {
    list = list.filter((c) =>
      [c.title, c.subtitle, c.category, ...(c.tags || [])]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }
  if (category) list = list.filter((c) => c.category === category);

  const cards = list
    .map((course) => {
      const stats = courseStats(course);
      const state = userId ? completionState(db, userId, course) : null;
      return {
        id: course.id,
        slug: course.slug,
        title: course.title,
        subtitle: course.subtitle,
        category: course.category,
        level: course.level,
        is_free: course.is_free,
        price_inr: course.price_inr,
        thumbnail_url: course.thumbnail_url,
        tags: course.tags,
        certificate_eligible: course.certificate_eligible,
        stats,
        progress: state,
        // The catalog needs the same verdict the detail page gives, so a card
        // can say "Buy ₹1,299" instead of showing an enrol button that 402s.
        access: courseAccessState(db, userId, course, { role: req.user?.role }),
        lock_reason: userId ? courseLockReason(db, userId, course) : null,
      };
    })
    // In-progress first, then free, then the rest. Keeps a learner's open
    // course at the top of their own catalog.
    .sort((a, b) => {
      const ap = a.progress?.enrolled && !a.progress.is_complete ? 0 : 1;
      const bp = b.progress?.enrolled && !b.progress.is_complete ? 0 : 1;
      if (ap !== bp) return ap - bp;
      if (a.is_free !== b.is_free) return a.is_free ? -1 : 1;
      return a.title.localeCompare(b.title);
    });

  res.json({
    status: 'success',
    courses: cards,
    categories: Array.from(new Set(publishedCourses(db).map((c) => c.category).filter(Boolean))).sort(),
    total_xp: userId ? totalXpForUser(db, userId) : 0,
  });
});

// GET /api/courses/my — the learner's dashboard payload.
coursesRouter.get('/my', requireAuth, (req: Request, res: Response) => {
  const db = loadDb();
  const userId = req.user!.id;

  const rows = publishedCourses(db)
    .map((course) => {
      const progress = getProgress(db, userId, course.id);
      const state = completionState(db, userId, course);
      return {
        id: course.id,
        slug: course.slug,
        title: course.title,
        subtitle: course.subtitle,
        category: course.category,
        level: course.level,
        is_free: course.is_free,
        thumbnail_url: course.thumbnail_url,
        certificate_eligible: course.certificate_eligible,
        stats: courseStats(course),
        progress: state,
        enrolled_at: progress?.enrolled_at || null,
        last_activity_at: progress?.updated_at || null,
        lock_reason: courseLockReason(db, userId, course),
        has_certificate: (db.certificates || []).some(
          (c: Certificate) => c.user_id === userId && c.course_id === course.id && c.status === 'active'
        ),
        feedback_given: (db.course_feedback || []).some((f: CourseFeedback) => f.user_id === userId && f.course_id === course.id),
      };
    })
    .filter((row) => row.progress.enrolled);

  const certificates = (db.certificates || []).filter((c: Certificate) => c.user_id === userId);

  res.json({
    status: 'success',
    courses: rows,
    in_progress: rows.filter((r) => !r.progress.is_complete),
    completed: rows.filter((r) => r.progress.is_complete),
    total_xp: totalXpForUser(db, userId),
    level: levelFor(totalXpForUser(db, userId)),
    certificates,
  });
});

// GET /api/courses/xp — XP ledger summary and timeline.
coursesRouter.get('/xp', requireAuth, (req: Request, res: Response) => {
  const db = loadDb();
  const userId = req.user!.id;
  const total = totalXpForUser(db, userId);

  const history = xpHistory(db, userId, 200);
  const earned = history.filter((h) => h.xp > 0).reduce((s, h) => s + h.xp, 0);
  const reversed = history.filter((h) => h.xp < 0).reduce((s, h) => s + h.xp, 0);

  res.json({
    status: 'success',
    total_xp: total,
    level: levelFor(total),
    earned_xp: earned,
    reversed_xp: reversed,
    entries: history,
    // Every point is traceable to a specific achievement. If this count and the
    // history length ever disagree, something is wrong and should be visible.
    ledger_entries: (db.xp_ledger || []).filter((e: any) => e.user_id === userId).length,
  });
});

// ============================================================================
// PUBLIC VERIFICATION — deliberately ahead of the /:slug catch-all
// ============================================================================

// GET /api/courses/verify/:serial — public. No auth. Proves a certificate is ours.
coursesRouter.get('/verify/:serial', rateLimit(60), (req: Request, res: Response) => {
  const db = loadDb();
  const result = verifyCertificate(db, req.params.serial);

  if (!result.found) {
    return res.status(404).json({
      status: 'genuine',
      found: false,
      check: result.check,
      message:
        'No certificate exists on TieEdu with this serial. It was never issued here, or it has a typo.',
    });
  }

  const { certificate, check, course } = result;
  const valid = check.signature_valid && check.status === 'active';

  return res.json({
    status: valid ? 'genuine' : check.status === 'revoked' ? 'revoked' : 'invalid',
    found: true,
    valid,
    check,
    certificate: {
      serial: certificate!.serial,
      recipient_name: certificate!.recipient_name,
      course_title: course?.title || certificate!.course_title,
      issued_at: certificate!.issued_at,
      lessons_completed: certificate!.lessons_completed,
      lessons_required: certificate!.lessons_required,
      xp_at_issue: certificate!.xp_at_issue,
      college: result.recipient?.college || null,
      verification_url: verificationUrlFor(certificate!.serial),
    },
    // Exactly what a verifier needs to interpret the two checks.
    explanation: !check.signature_valid
      ? 'The stored record does not match its own HMAC signature. This certificate was tampered with or fabricated.'
      : check.status === 'revoked'
        ? `Issued by TieEdu but revoked on ${certificate!.revoked_at}. Reason: ${certificate!.revoked_reason || 'not stated'}.`
        : 'Issued by TieEdu, signature intact, and not revoked.',
  });
});

// ============================================================================
// ENROLL
// ============================================================================

/**
 * GET /api/courses/:slug — the course page: modules, sanitised lessons, the
 * learner's own state and any course-level lock.
 *
 * Registered after /my, /xp and /verify/:serial so those literals are not
 * swallowed by this parameterised route.
 *
 * A course is browsable without an account, but a course that costs money or is
 * unpublished is not: there is nothing here a logged-out visitor should see.
 */
coursesRouter.get('/:slug', optionalAuth, (req: Request, res: Response) => {
  const db = loadDb();
  const course = findBySlug(db, req.params.slug);
  if (!course) return res.status(404).json({ error: 'Course not found' });

  const userId = req.user?.id || null;
  if (!course.published && (!userId || req.user!.role !== 'admin')) {
    return res.status(404).json({ error: 'Course not found' });
  }
  if (!course.is_free && !userId) {
    return res.status(403).json({ error: 'Sign in to view this course', locked: true });
  }

  res.json({
    status: 'success',
    course: courseView(db, userId, course, req.user?.role),
  });
});

/**
 * POST /api/courses/:slug/enroll — idempotent. Creates the progress record.
 *
 * The paid-access check is the point of this route. Enrolling is what unlocks
 * lesson 1, so this is the place that must refuse an unpaid learner. Every
 * later gate (lesson fetch, progress, quiz, certificate) re-checks it too,
 * because a progress row that already exists must not become a way around it.
 */
coursesRouter.post('/:slug/enroll', requireAuth, (req: Request, res: Response) => {
  const db = loadDb();
  const userId = req.user!.id;
  const course = findBySlug(db, req.params.slug);
  if (!course) return res.status(404).json({ error: 'Course not found' });

  const access = courseAccessState(db, userId, course, { role: req.user!.role });
  if (!access.granted) {
    return res.status(402).json({
      error: access.reason,
      locked: true,
      price_inr: access.price_inr,
      course_id: course.id,
      course_slug: course.slug,
    });
  }

  const lock = courseLockReason(db, userId, course);
  if (lock) return res.status(403).json({ error: lock, locked: true });

  const progress = getOrCreateProgress(db, userId, course);
  progress.updated_at = new Date().toISOString();
  saveDb(db);

  res.json({ status: 'success', progress, next_lesson_id: orderedLessons(course)[0]?.id || null });
});

// ============================================================================
// LESSON PLAYER + PROGRESS
// ============================================================================

// GET /api/courses/lessons/:lessonId — one lesson, answer key redacted.
coursesRouter.get('/lessons/:lessonId', optionalAuth, (req: Request, res: Response) => {
  const db = loadDb();
  const found = findLesson(db, req.params.lessonId);
  if (!found || !found.course.published) {
    return res.status(404).json({ error: 'Lesson not found' });
  }

  const { course, module, lesson } = found;
  const userId = req.user?.id || null;
  const progress = userId ? getProgress(db, userId, course.id) : null;

  const access = courseAccessState(db, userId, course, { role: req.user?.role });
  // Order matters: a paid course reports "buy it" even to a signed-in learner
  // who has not enrolled, because that is the more actionable message than the
  // prerequisite one they cannot act on either.
  const gate = !access.granted
    ? { unlocked: false, index: 0, reason: access.reason || 'Enrol to unlock this course.' }
    : userId
      ? isLessonUnlocked(progress, course, lesson.id)
      : { unlocked: false, index: 0, reason: 'Sign in to start this course.' };

  res.json({
    status: 'success',
    course: {
      id: course.id,
      slug: course.slug,
      title: course.title,
      certificate_eligible: course.certificate_eligible,
    },
    module: { id: module.id, title: module.title, sort_order: module.sort_order },
    // Content is withheld until the gate opens; the shape of the lesson is not.
    lesson: gate.unlocked
      ? playerLessonView(progress, lesson)
      : lockedLessonStub(lesson, progress, gate.reason),
    locked: !gate.unlocked,
    lock_reason: gate.reason || null,
    access,
    progress: userId ? completionState(db, userId, course) : null,
  });
});

/**
 * POST /api/courses/lessons/:lessonId/progress
 *
 * The client reports a watch delta and the player duration. The server:
 *   - refuses to credit more time than actually elapsed since the last
 *     heartbeat, and never more than MAX_HEARTBEAT_CREDIT_SECONDS,
 *   - keeps the highest duration reported so the percentage does not jump,
 *   - re-derives whether the lesson is now complete.
 *
 * XP is granted by settleCompletion, never by anything in the request body.
 */
coursesRouter.post('/lessons/:lessonId/progress', requireAuth, (req: Request, res: Response) => {
  const db = loadDb();
  const userId = req.user!.id;
  const found = findLesson(db, req.params.lessonId);
  if (!found || !found.course.published) {
    return res.status(404).json({ error: 'Lesson not found' });
  }

  const { course, lesson } = found;
  const access = courseAccessState(db, userId, course, { role: req.user!.role });
  if (!access.granted) return res.status(402).json({ error: access.reason, locked: true, price_inr: access.price_inr });

  const lock = courseLockReason(db, userId, course);
  if (lock) return res.status(403).json({ error: lock, locked: true });

  const progress = getOrCreateProgress(db, userId, course);
  const gate = isLessonUnlocked(progress, course, lesson.id);
  if (!gate.unlocked) {
    return res.status(409).json({ error: gate.reason, locked: true });
  }

  const now = Date.now();
  const reportedDelta = Math.max(0, Number(req.body?.delta_seconds) || 0);
  const reportedDuration = Math.max(0, Number(req.body?.duration_seconds) || 0);

  // Wall-clock clamp: a client cannot bank watch time faster than real time.
  const lastAt = progress.last_heartbeat_at?.[lesson.id];
  const elapsedMs = lastAt ? now - new Date(lastAt).getTime() : now - new Date(progress.enrolled_at).getTime();
  const realTimeCap = Math.max(0, Math.min(MAX_HEARTBEAT_CREDIT_SECONDS, elapsedMs / 1000));
  const creditedDelta = Math.min(reportedDelta, realTimeCap);

  progress.last_heartbeat_at = progress.last_heartbeat_at || {};
  progress.last_heartbeat_at[lesson.id] = new Date(now).toISOString();

  if (reportedDuration > 0) {
    // Store the bounded duration. A client that reports 3 seconds for a
    // 19-minute video gets the author's figure instead, so the stored value
    // can never be used to shrink the completion gate.
    const bounded = effectiveVideoSeconds(lesson, reportedDuration);
    progress.video_duration_seconds[lesson.id] = Math.max(
      Number(progress.video_duration_seconds[lesson.id]) || 0,
      Math.min(bounded, 8 * 60 * 60)
    );
  }

  if (creditedDelta > 0) {
    progress.video_watch_seconds[lesson.id] =
      (Number(progress.video_watch_seconds[lesson.id]) || 0) + creditedDelta;
  }

  progress.updated_at = new Date(now).toISOString();

  const before = lessonCompletionState(progress, lesson);
  let settlement: ReturnType<typeof settleCompletion> | null = null;
  if (before.ready && !before.is_complete) {
    settlement = settleCompletion(db, userId, course, progress, lesson);
  } else {
    saveDb(db);
  }

  const after = lessonCompletionState(progress, lesson);

  res.json({
    status: 'success',
    lesson: after,
    progress: completionState(db, userId, course),
    // Echoed so a client that has drifted can show the learner the truth
    // instead of continuing to claim a percentage the server will not honour.
    credited_seconds: Number(creditedDelta.toFixed(2)),
    rejected_seconds: Number((reportedDelta - creditedDelta).toFixed(2)),
    xp: settlement?.xp || [],
    xp_total: totalXpForUser(db, userId),
    course_complete: settlement?.course_complete || false,
  });
});

/**
 * POST /api/courses/lessons/:lessonId/quiz — server-graded. The answer key is
 * applied here and released per question only after grading.
 */
coursesRouter.post('/lessons/:lessonId/quiz', requireAuth, (req: Request, res: Response) => {
  const db = loadDb();
  const userId = req.user!.id;
  const found = findLesson(db, req.params.lessonId);
  if (!found || !found.course.published) {
    return res.status(404).json({ error: 'Lesson not found' });
  }

  const { course, lesson } = found;
  if (!lesson.quiz) return res.status(400).json({ error: 'This lesson has no quiz' });

  const access = courseAccessState(db, userId, course, { role: req.user!.role });
  if (!access.granted) return res.status(402).json({ error: access.reason, locked: true, price_inr: access.price_inr });

  const lock = courseLockReason(db, userId, course);
  if (lock) return res.status(403).json({ error: lock, locked: true });

  const progress = getOrCreateProgress(db, userId, course);
  const gate = isLessonUnlocked(progress, course, lesson.id);
  if (!gate.unlocked) return res.status(409).json({ error: gate.reason, locked: true });

  const rawAnswers = req.body?.answers;
  if (!rawAnswers || typeof rawAnswers !== 'object') {
    return res.status(400).json({ error: 'answers object required' });
  }

  const answers: Record<string, number> = {};
  for (const [k, v] of Object.entries(rawAnswers)) {
    const n = Number(v);
    if (Number.isInteger(n)) answers[k] = n;
  }

  const graded = gradeQuiz(lesson, answers);

  const quizId = lesson.quiz!.id;
  progress.quiz_best_percent = progress.quiz_best_percent || {};
  const previousBest = Number(progress.quiz_best_percent[quizId]) || 0;
  progress.quiz_best_percent[quizId] = Math.max(previousBest, graded.score_percent);

  const xp: { reason: string; xp: number; awarded: boolean }[] = [];
  if (graded.passed && !progress.passed_quiz_ids.includes(quizId)) {
    progress.passed_quiz_ids.push(quizId);
    const result = awardAndCommit(db, {
      userId,
      key: `quiz:${quizId}:${userId}`,
      reason: 'quiz_pass',
      xp: XP.QUIZ_PASS,
      courseId: course.id,
      lessonId: lesson.id,
      note: `Passed quiz (${graded.score_percent}%) in: ${lesson.title}`,
    });
    xp.push({ reason: 'quiz_pass', xp: result.event.xp, awarded: result.awarded });
  }

  const before = lessonCompletionState(progress, lesson);
  let courseComplete = false;
  if (before.ready && !before.is_complete) {
    const settlement = settleCompletion(db, userId, course, progress, lesson);
    xp.push(...settlement.xp);
    courseComplete = settlement.course_complete;
  }
  progress.updated_at = new Date().toISOString();
  saveDb(db);

  res.json({
    status: 'success',
    result: {
      score_percent: graded.score_percent,
      passed: graded.passed,
      passing_percent: graded.passing_percent,
      best_percent: Math.max(previousBest, graded.score_percent),
      is_best_attempt: graded.score_percent > previousBest,
      correct_count: graded.results.filter((r) => r.correct).length,
      total_count: graded.results.length,
      results: graded.results,
    },
    lesson: lessonCompletionState(progress, lesson),
    progress: completionState(db, userId, course),
    xp,
    xp_total: totalXpForUser(db, userId),
    course_complete: courseComplete,
  });
});

// ============================================================================
// CERTIFICATES
// ============================================================================

/**
 * POST /api/courses/:slug/certificate
 *
 * Re-derives completion from stored progress. Idempotent: calling it again for
 * a course that already has an active certificate returns the same record
 * rather than minting a second serial.
 */
coursesRouter.post('/:slug/certificate', requireAuth, (req: Request, res: Response) => {
  const db = loadDb();
  const userId = req.user!.id;
  const course = findBySlug(db, req.params.slug);
  if (!course) return res.status(404).json({ error: 'Course not found' });

  if (!course.certificate_eligible) {
    return res.status(400).json({
      error: 'This course does not award a certificate. It is marked as skill practice only.',
    });
  }

  // Re-checked here even though completion implies access: a certificate is the
  // one artefact here with lasting value outside the platform, so it must not be
  // issuable from a progress row that survived a lost refund or a delisting.
  const access = courseAccessState(db, userId, course, { role: req.user!.role });
  if (!access.granted) {
    return res.status(402).json({ error: access.reason, locked: true, price_inr: access.price_inr });
  }

  const state = completionState(db, userId, course);
  if (!state.is_complete) {
    return res.status(403).json({
      error: `Not eligible yet — ${state.completed} of ${state.total} lessons complete.`,
      progress: state,
    });
  }

  const existing = (db.certificates || []).find(
    (c: Certificate) => c.user_id === userId && c.course_id === course.id && c.status === 'active'
  );
  if (existing) {
    return res.json({
      status: 'success',
      already_issued: true,
      certificate: presentCertificate(db, existing),
    });
  }

  const lessons = orderedLessons(course);
  const issuedAt = new Date().toISOString();
  // Guarantee serial uniqueness even if two issues land in the same millisecond.
  let serial = generateSerial();
  for (let attempt = 0; (db.certificates || []).some((c: Certificate) => c.serial === serial); attempt++) {
    if (attempt >= 5) {
      return res.status(503).json({ error: 'Could not allocate a unique certificate serial — please retry' });
    }
    serial = generateSerial();
  }

  const recipientName = req.user!.name || 'TieEdu Learner';
  const fields = {
    serial,
    user_id: userId,
    recipient_email: req.user!.email,
    recipient_name: recipientName,
    course_id: course.id,
    course_title: course.title,
    issued_at: issuedAt,
    lessons_completed: state.completed,
    lessons_required: state.total,
    xp_at_issue: totalXpForUser(db, userId),
  };

  const certificate: Certificate = {
    id: `cert-${Date.now()}-${serial.slice(-6)}`,
    serial,
    user_id: userId,
    course_id: course.id,
    course_title: course.title,
    recipient_name: recipientName,
    recipient_email: req.user!.email,
    issued_at: issuedAt,
    xp_at_issue: fields.xp_at_issue,
    lessons_completed: fields.lessons_completed,
    lessons_required: fields.lessons_required,
    signature: signCertificate(fields),
    status: 'active',
    revoked_reason: '',
    revoked_at: null,
  };

  db.certificates = db.certificates || [];
  db.certificates.push(certificate);
  saveDb(db);

  res.status(201).json({ status: 'success', already_issued: false, certificate: presentCertificate(db, certificate) });
});

function presentCertificate(db: any, c: Certificate) {
  return {
    serial: c.serial,
    course_title: c.course_title,
    recipient_name: c.recipient_name,
    issued_at: c.issued_at,
    lessons_completed: c.lessons_completed,
    lessons_required: c.lessons_required,
    xp_at_issue: c.xp_at_issue,
    status: c.status,
    revoked_reason: c.revoked_reason,
    revoked_at: c.revoked_at,
    signature: c.signature,
    verification_url: verificationUrlFor(c.serial),
    // API-relative, not site-relative: the download endpoint requires a Bearer
    // token, so the client must fetch it with auth rather than link to it.
    download_path: `/courses/certificates/${encodeURIComponent(c.serial)}/download`,
  };
}

// GET /api/courses/certificates/mine
coursesRouter.get('/certificates/mine', requireAuth, (req: Request, res: Response) => {
  const db = loadDb();
  const userId = req.user!.id;
  const rows = (db.certificates || [])
    .filter((c: Certificate) => c.user_id === userId)
    .sort((a: Certificate, b: Certificate) => b.issued_at.localeCompare(a.issued_at))
    .map((c: Certificate) => presentCertificate(db, c));
  res.json({ status: 'success', certificates: rows });
});

/**
 * GET /api/courses/certificates/:serial/download
 *
 * Generates the PDF from the stored record on every request, so a revoked
 * certificate re-downloads with a REVOKED watermark instead of a clean one.
 * Owner or admin only.
 */
coursesRouter.get('/certificates/:serial/download', requireAuth, async (req: Request, res: Response) => {
  const db = loadDb();
  const serial = (req.params.serial || '').trim().toUpperCase();
  const certificate: Certificate | undefined = (db.certificates || []).find(
    (c: Certificate) => c.serial === serial
  );

  if (!certificate) return res.status(404).json({ error: 'Certificate not found' });

  const isOwner = certificate.user_id === req.user!.id;
  if (!isOwner && req.user!.role !== 'admin') {
    return res.status(403).json({ error: 'This certificate belongs to another learner' });
  }

  const course = (db.courses || []).find((c: Course) => c.id === certificate.course_id) || null;
  const pdf = await buildCertificatePdf(certificate, course);

  const disposition = req.query.inline === '1' ? 'inline' : 'attachment';
  const fileName = `TieEdu-Certificate-${certificate.serial}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Length', String(pdf.length));
  res.setHeader('Content-Disposition', `${disposition}; filename="${fileName}"`);
  res.setHeader('Cache-Control', 'private, no-store');
  return res.send(pdf);
});

// ============================================================================
// FEEDBACK — the gate between finishing a course and moving to the next one
// ============================================================================

coursesRouter.post('/:slug/feedback', requireAuth, (req: Request, res: Response) => {
  const db = loadDb();
  const userId = req.user!.id;
  const course = findBySlug(db, req.params.slug);
  if (!course) return res.status(404).json({ error: 'Course not found' });

  // Feedback pays real XP, so it is gated on access and not only on completion.
  const access = courseAccessState(db, userId, course, { role: req.user!.role });
  if (!access.granted) return res.status(402).json({ error: access.reason, locked: true, price_inr: access.price_inr });

  const state = completionState(db, userId, course);
  if (!state.is_complete) {
    return res.status(403).json({
      error: `Finish the course before leaving feedback — ${state.completed} of ${state.total} lessons done.`,
      progress: state,
    });
  }

  db.course_feedback = db.course_feedback || [];
  const already = db.course_feedback.find(
    (f: CourseFeedback) => f.user_id === userId && f.course_id === course.id
  );
  if (already) {
    return res.status(409).json({
      error: 'You have already submitted feedback for this course.',
      feedback: already,
    });
  }

  const rating = Number(req.body?.rating);
  const whatLearned = (req.body?.what_learned || '').toString().trim();
  const wouldRecommend = req.body?.would_recommend;

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'rating must be a whole number from 1 to 5' });
  }
  if (whatLearned.length < 10) {
    return res.status(400).json({ error: 'Tell us in a sentence or two what you learned (min 10 characters).' });
  }
  if (wouldRecommend === undefined) {
    return res.status(400).json({ error: 'would_recommend is required' });
  }

  const xpResult = awardAndCommit(db, {
    userId,
    key: `feedback:${course.id}:${userId}`,
    reason: 'feedback_reward',
    xp: XP.FEEDBACK,
    courseId: course.id,
    note: `Left feedback for: ${course.title}`,
  });

  const feedback: CourseFeedback = {
    id: `fb-${Date.now()}-${courseIdTail(course.id)}`,
    user_id: userId,
    user_name: req.user!.name || 'Learner',
    course_id: course.id,
    rating,
    what_learned: whatLearned.slice(0, 1200),
    would_recommend: !!wouldRecommend,
    xp_awarded: xpResult.event.xp,
    created_at: new Date().toISOString(),
  };
  db.course_feedback.push(feedback);
  saveDb(db);

  res.status(201).json({
    status: 'success',
    feedback,
    xp: { awarded: xpResult.awarded, xp: xpResult.event.xp, total_xp: xpResult.total_xp },
    certificate: (db.certificates || [])
      .filter((c: Certificate) => c.user_id === userId && c.course_id === course.id && c.status === 'active')
      .map((c: Certificate) => presentCertificate(db, c))[0] || null,
    // The catalogue, minus what is finished, is what "move on" means. Returning
    // it here means the completion screen never has to guess.
    next_courses: publishedCourses(db)
      .filter((c) => c.id !== course.id && !completionState(db, userId, c).is_complete)
      .filter((c) => !courseLockReason(db, userId, c))
      .map((c) => {
        const s = completionState(db, userId, c);
        return {
          slug: c.slug,
          title: c.title,
          subtitle: c.subtitle,
          category: c.category,
          is_free: c.is_free,
          lessons: s.total,
          progress: s,
        };
      })
      .slice(0, 6),
  });
});

function courseIdTail(courseId: string): string {
  return courseId.replace(/[^a-z0-9]/gi, '').slice(-5) || 'x';
}

export default coursesRouter;
