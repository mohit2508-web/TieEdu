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
import { loadDb, saveDb, Course, CourseLesson, Certificate, CourseFeedback, Instructor } from '../data/db';
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
  CATALOG_FILTER_GROUPS,
  CATALOG_SORTS,
  CourseBadges,
  CourseSignals,
  parseCatalogQuery,
  relatedCourses,
  runCatalog,
  courseSignalsFor,
  courseBadges,
} from '../lib/catalog';
import {
  buildCertificatePdf,
  publicKeyBundle,
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
  // The type flags come from `sanitizeLesson` so an open lesson and a locked one
  // report the same `kind`/`has_video`/`has_quiz` for the same lesson. They were
  // duplicated here once and the open branch drifted, which is how the first
  // lesson of a free course ended up rendering without an icon.
  const { kind, has_video, has_quiz } = sanitizeLesson(lesson);
  return {
    id: lesson.id,
    module_id: lesson.module_id,
    title: lesson.title,
    summary: lesson.summary,
    sort_order: lesson.sort_order,
    duration_minutes: lesson.duration_minutes,
    kind,
    has_video,
    has_quiz,
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

    const view: any = {
      ...sanitizeCourse(course),
      outcomes: course.outcomes || [],
      thumbnail_url: course.thumbnail_url,
      created_at: course.created_at,
      updated_at: course.updated_at,

      /**
       * The long-form page sections.
       *
       * The admin form always sends these keys, including when it is clearing one,
       * so an emptied field is stored as `''` or `[]` rather than being absent.
       * That makes "never written" and "written and then cleared" the same stored
       * value, which is fine, but it also means the page must be told to hide the
       * heading: an empty "Pre-requisites" block with no bullets under it reads as
       * a bug, and a placeholder bullet would be invented content.
       *
       * So they are stripped here, after the spread. Doing it with conditional
       * spreads above would not work, because `sanitizeCourse` copies every stored
       * field via `...course` - the empty key is already present by the time any
       * conditional runs, and the client sees a key it should have been able to
       * treat as absent. An earlier version of this code used exactly that
       * approach and the keys still shipped.
       */

      /**
       * The instructor, or `null`.
       *
       * Derived here rather than stored on the course so renaming or correcting
       * a biography fixes every course at once. `null` when the course has no
       * instructor assigned, which is the correct rendering for "unknown" and is
       * not the same as an empty object.
       */
      instructor: (() => {
        if (!course.instructor_id) return null;
        const i = ((db.instructors || []) as Instructor[]).find((x) => x.id === course.instructor_id);
        if (!i) return null;
        return {
          id: i.id,
          name: i.name,
          title: i.title || '',
          bio: i.bio || '',
          photo_url: i.photo_url || '',
          // Counts come from the data; claims about the person come from the
          // record. All are nullable and the page omits the ones that are null.
          course_count: ((db.courses || []) as Course[]).filter((c) => c.instructor_id === i.id).length,
          students_taught: typeof i.students_taught === 'number' ? i.students_taught : null,
          hours_lectured: typeof i.hours_lectured === 'number' ? i.hours_lectured : null,
          rating: typeof i.rating === 'number' ? i.rating : null,
        };
      })(),

      /**
       * How many graded challenges the course actually contains, counted from
       * the lessons. Computed rather than stored so it cannot drift out of date
       * when a module is added or a quiz is converted to a reading.
       *
       * "A quiz lesson" means the lesson carries a `quiz` object — the same
       * rule that produces `kind: 'quiz'` above. There is no `kind` field on the
       * stored lesson; it is derived for the response, so reading `l.kind` here
       * would silently count zero and the page would claim a course has no
       * challenges when it has dozens.
       */
      challenge_count: orderedModules(course).reduce(
        (total, m) => total + (m.lessons || []).filter((l: any) => !!l.quiz).length,
        0
      ),

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
      // Same derived numbers the card shows, so the detail hero and the catalogue
      // row can never disagree about how many learners or what rating.
      signals: courseSignalsFor(db, [course]).get(course.id) || null,
      progress: state,
      access,
      // Enough for the client to render the right button without a second request.
      certificate: own ? presentCertificate(db, own) : null,
      certificate_eligible: course.certificate_eligible,
      lock_reason: userId ? courseLockReason(db, userId, course) : null,
    };

    // Drop the long-form keys that hold nothing, so the client can decide whether
    // to draw a heading from the key's presence alone. `''`, `[]`, null and
    // undefined are all "nothing to show"; a whitespace-only string counts as
    // empty too, because it renders as a blank paragraph and is never intentional.
    for (const key of ['about_course', 'prerequisites', 'audience', 'audio_language', 'caption_language']) {
      const value = view[key];
      const empty =
        value === undefined ||
        value === null ||
        (typeof value === 'string' && value.trim() === '') ||
        (Array.isArray(value) && value.filter((v: unknown) => String(v ?? '').trim() !== '').length === 0);
      if (empty) delete view[key];
    }

    return view;
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

/**
 * The catalogue card.
 *
 * `signals` and `badges` are DERIVED, never stored — see lib/catalog.ts. A
 * rating here is the mean of real post-completion feedback and an enrolment is
 * a real progress row, so a course with no feedback carries `rating_avg: null`
 * and the client renders no star rather than a placeholder score.
 */
function catalogCard(
  db: any,
  userId: string | null,
  course: Course,
  signals: CourseSignals,
  badges: CourseBadges,
  role?: string
) {
  return {
    id: course.id,
    slug: course.slug,
    title: course.title,
    subtitle: course.subtitle,
    description: course.description || '',
    category: course.category,
    level: course.level,
    is_free: course.is_free,
    price_inr: course.price_inr,
    thumbnail_url: course.thumbnail_url,
    tags: course.tags,
    outcomes: course.outcomes || [],
    certificate_eligible: course.certificate_eligible,
    created_at: course.created_at,
    updated_at: course.updated_at,
    signals,
    badges: badges.badges,
    is_new: badges.is_new,
    is_popular: badges.is_popular,
    stats: courseStats(course),
    progress: userId ? completionState(db, userId, course) : null,
    // The catalog needs the same verdict the detail page gives, so a card
    // can say "Buy ₹1,299" instead of showing an enrol button that 402s.
    access: courseAccessState(db, userId, course, { role }),
    lock_reason: userId ? courseLockReason(db, userId, course) : null,
  };
}

// ============================================================================
// CATALOG
// ============================================================================

/**
 * GET /api/courses — the published catalogue.
 *
 * Filtering, sorting, faceting and pagination all happen here rather than in
 * the browser, because the counts a learner reads next to each filter have to
 * describe what clicking that filter will actually return. Doing it client-side
 * means shipping every course to every visitor just to filter a list, and the
 * facet counts would be guesses about the current page rather than facts about
 * the result set.
 *
 * Every parameter is optional, so the no-query-string response is still the
 * full default catalogue. Sorting deliberately does not preserve the old
 * "in-progress first" behaviour as a default: that is now an explicit
 * `sort=progress`-free rule inside `sortCourses`, applied on top of whatever
 * the learner chose, because resuming is not a sort preference.
 */
coursesRouter.get('/', optionalAuth, (req: Request, res: Response) => {
  const db = loadDb();
  const userId = req.user?.id || null;
  const role = req.user?.role;

  const query = parseCatalogQuery(req.query as Record<string, unknown>);

  const result = runCatalog(
    db,
    publishedCourses(db),
    query,
    (course, signals, badges) => catalogCard(db, userId, course, signals, badges, role),
    {
      // Read straight off the progress row. `completionState` would re-walk every
      // lesson of every course just to learn whether one field is set.
      isInProgress: (course) => {
        if (!userId) return false;
        const p = getProgress(db, userId, course.id);
        return !!p && !p.completed_at;
      },
    }
  );

  res.json({
    status: 'success',
    courses: result.rows,
    // Retained for older clients: the flat category list the old UI expected.
    categories: Array.from(new Set(publishedCourses(db).map((c) => c.category).filter(Boolean))).sort(),
    facets: result.facets,
    sorts: CATALOG_SORTS,
    filter_groups: CATALOG_FILTER_GROUPS,
    total: result.total,
    page: result.page,
    page_size: result.page_size,
    has_more: result.has_more,
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

// GET /api/courses/verify/key — public. The active Ed25519 PUBLIC key.
//
// Publishing this is the point of signing asymmetrically: a verifier can check a
// certificate itself, offline, without trusting or even reaching this server.
// It is not a secret and deliberately carries no auth.
coursesRouter.get('/verify/key', (_req: Request, res: Response) => {
  const bundle = publicKeyBundle();
  if (!bundle) {
    // Deliberately vague for an anonymous caller: the key being unavailable is
    // an operator problem, and the remedy is not something a stranger should
    // be able to read off this endpoint. The authenticated claim route reports
    // the specific missing variable.
    return res.status(503).json({ status: 'unavailable', error: 'Certificate verification is temporarily unavailable' });
  }
  return res.json({ status: 'ok', ...bundle });
});

// GET /api/courses/verify/:serial — public. No auth. Proves a certificate is ours.
coursesRouter.get('/verify/:serial', rateLimit(60), (req: Request, res: Response) => {
  const db = loadDb();

  let result;
  try {
    result = verifyCertificate(db, req.params.serial);
  } catch (e: any) {
    // Same reasoning as /verify/key: this endpoint is anonymous, so a signing
    // misconfiguration must not narrate our environment to anyone who asks.
    // The cause is logged with its request id for us; the caller gets a 503.
    console.error(
      `❌ [ERROR] #${(req as any).requestId || '-'} ${req.method} ${req.originalUrl} -> 503`,
      e?.stack || e?.message || e
    );
    return res.status(503).json({ status: 'unavailable', error: 'Certificate verification is temporarily unavailable' });
  }

  if (!result.found) {
    return res.status(404).json({
      // 'not_found', not 'genuine'. This used to report "genuine" for a serial we
      // never issued, on the theory that the ANSWER was authentic. That reading
      // is a trap: anyone checking `status` alone — a script, an employer, a
      // future integration — would score a fabricated certificate as genuine.
      // `status` now names the outcome; `record_exists` remains the verdict.
      status: 'not_found',
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
      ? 'The stored record does not match the signature made over it. This certificate was tampered with or fabricated.'
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
 * GET /api/courses/:slug/related — sibling courses for the detail page.
 *
 * Registered as its own route rather than folded into the detail payload so the
 * course page can fetch it in parallel with the course itself instead of
 * waiting for a slower first response. Signed-out visitors get it too: deciding
 * what to learn next is exactly the job of someone who has not signed in yet.
 */
coursesRouter.get('/:slug/related', optionalAuth, (req: Request, res: Response) => {
  const db = loadDb();
  const course = findBySlug(db, req.params.slug);
  if (!course) return res.status(404).json({ error: 'Course not found' });

  const siblings = relatedCourses(course, publishedCourses(db), 4);
  const signals = courseSignalsFor(db, siblings);

  res.json({
    status: 'success',
    courses: siblings.map((c) => {
      const s = signals.get(c.id)!;
      return {
        id: c.id,
        slug: c.slug,
        title: c.title,
        subtitle: c.subtitle,
        category: c.category,
        level: c.level,
        is_free: c.is_free,
        price_inr: c.price_inr,
        thumbnail_url: c.thumbnail_url,
        tags: c.tags,
        signals: s,
        stats: courseStats(c),
        badges: courseBadges(c, s, { topQuartile: s.enrollment_count > 0 }).badges,
      };
    }),
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
 * The client reports a watch delta, the player duration and the playhead. The
 * server:
 *   - refuses to credit more time than actually elapsed since the last
 *     heartbeat, and never more than MAX_HEARTBEAT_CREDIT_SECONDS,
 *   - keeps the highest duration reported so the percentage does not jump,
 *   - stores the playhead for resume, bounded by the same trusted duration,
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
  const reportedPosition = Math.max(0, Number(req.body?.position_seconds) || 0);

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

  // Playhead, for "resume where you left off". Stored in a separate heartbeat
  // slot from the watch credit and never fed into the completion maths, so a
  // learner who drags the scrubber to the end still has to sit through the
  // video to clear the watch gate — seeking only moves where they resume from.
  if (reportedPosition > 0) {
    const bounded = effectiveVideoSeconds(lesson, reportedDuration);
    // Bound the stored position by the same trusted duration the gate uses, so a
    // client cannot park a position far past the end and have the next load try
    // to seek into nothing.
    const ceiling = bounded > 0 ? bounded : 8 * 60 * 60;
    progress.video_position_seconds[lesson.id] = Math.min(reportedPosition, ceiling);
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
    // The playhead the server actually kept. A client whose own seek did not
    // land (rate limit, stale value) must not assume it did.
    position_seconds: after.video_position_seconds,
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
    // Sign and key id come back together: the id is the fingerprint of the key
    // that just signed, so storing it can never describe a different key.
    ...(() => {
      const signed = signCertificate(fields);
      return { signature: signed.signature, signing_key_id: signed.keyId };
    })(),
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
    signing_key_id: c.signing_key_id || '',
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
