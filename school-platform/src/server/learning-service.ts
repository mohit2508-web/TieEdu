import 'server-only';
import { prisma } from '@/lib/db';
import { forSchool } from '@/lib/tenant';
import { recordAudit } from '@/lib/audit';
import { computeCourseProgress, gradeQuiz, toStudentQuiz } from '@/lib/learning';
import { issueForEnrollment } from './certificate-service';

/**
 * Learning business logic (Phase 3, spec §6).
 *
 * Enrollment, per-lesson progress and quiz attempts are all tenant-scoped and
 * therefore only ever touched through `forSchool(schoolId)`. Course structure
 * and quizzes are platform content read straight from `prisma`.
 */

export class LearningError extends Error {
  constructor(
    public code: 'NOT_FOUND' | 'FORBIDDEN' | 'INVALID',
    message: string
  ) {
    super(message);
  }
}

// ---------------------------------------------------------------------------
// Enrollment
// ---------------------------------------------------------------------------

export async function enrollInCourse(schoolId: string, courseId: string, userId: string) {
  const db = forSchool(schoolId);

  const course = await prisma.course.findFirst({ where: { id: courseId, status: 'PUBLISHED' } });
  if (!course) throw new LearningError('NOT_FOUND', 'Course not found');

  const enabled = await db.schoolCourse.findFirst({ where: { courseId, status: 'ENABLED' } });
  if (!enabled) throw new LearningError('FORBIDDEN', 'This course is not enabled for your school');

  const existing = await db.enrollment.findFirst({ where: { courseId, userId } });
  if (existing) return existing;

  const enrollment = await db.enrollment.create({
    data: { schoolId, courseId, userId, status: 'ACTIVE' },
  });
  await recordAudit({ actorUserId: userId, schoolId, action: 'learning.enroll', targetType: 'Enrollment', targetId: enrollment.id });
  return enrollment;
}

/** Load an enrollment only if it belongs to `userId` (prevents acting on a peer's). */
export async function findOwnedEnrollment(schoolId: string, enrollmentId: string, userId: string) {
  const db = forSchool(schoolId);
  const enrollment = await db.enrollment.findFirst({ where: { id: enrollmentId, userId } });
  if (!enrollment) throw new LearningError('NOT_FOUND', 'Enrollment not found');
  return enrollment;
}

export async function listMyEnrollments(schoolId: string, userId: string) {
  const db = forSchool(schoolId);
  return db.enrollment.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    include: {
      course: {
        include: {
          skillTrack: { select: { name: true, slug: true } },
          _count: { select: { modules: true } },
        },
      },
    },
  });
}

/** School-enabled published courses the student has not enrolled in yet. */
export async function listAvailableCourses(schoolId: string, userId: string) {
  const db = forSchool(schoolId);
  const [enabled, mine] = await Promise.all([
    db.schoolCourse.findMany({ where: { status: 'ENABLED' }, select: { courseId: true } }),
    db.enrollment.findMany({ where: { userId }, select: { courseId: true } }),
  ]);
  const enrolled = new Set(mine.map((e) => e.courseId));
  const courseIds = enabled.map((e) => e.courseId).filter((id) => !enrolled.has(id));
  if (courseIds.length === 0) return [];

  return prisma.course.findMany({
    where: { id: { in: courseIds }, status: 'PUBLISHED' },
    orderBy: { title: 'asc' },
    include: {
      skillTrack: { select: { name: true } },
      _count: { select: { modules: true } },
    },
  });
}

// ---------------------------------------------------------------------------
// Course player
// ---------------------------------------------------------------------------

export type PlayerData = NonNullable<Awaited<ReturnType<typeof loadPlayer>>>;

async function loadPlayer(schoolId: string, enrollmentId: string) {
  const db = forSchool(schoolId);
  return db.enrollment.findFirst({
    where: { id: enrollmentId },
    include: {
      course: {
        include: {
          skillTrack: true,
          modules: {
            orderBy: { sortOrder: 'asc' },
            include: {
              lessons: {
                orderBy: { sortOrder: 'asc' },
                include: {
                  quiz: {
                    include: {
                      questions: {
                        orderBy: { sortOrder: 'asc' },
                        include: { options: { orderBy: { sortOrder: 'asc' } } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
}

export async function getPlayerData(schoolId: string, enrollmentId: string) {
  const enrollment = await loadPlayer(schoolId, enrollmentId);
  if (!enrollment) throw new LearningError('NOT_FOUND', 'Enrollment not found');

  const db = forSchool(schoolId);
  const progress = await db.lessonProgress.findMany({ where: { enrollmentId } });
  const completed = new Set(progress.filter((p) => p.status === 'COMPLETED').map((p) => p.lessonId));

  return {
    enrollment: { id: enrollment.id, progressPct: enrollment.progressPct, status: enrollment.status },
    course: {
      id: enrollment.course.id,
      slug: enrollment.course.slug,
      title: enrollment.course.title,
      summary: enrollment.course.summary,
      skillTrack: enrollment.course.skillTrack?.name ?? null,
      modules: enrollment.course.modules.map((m) => ({
        id: m.id,
        title: m.title,
        summary: m.summary,
        lessons: m.lessons.map((l) => ({
          id: l.id,
          title: l.title,
          summary: l.summary,
          kind: l.kind,
          durationMins: l.durationMins,
          contentUrl: l.contentUrl,
          contentBody: l.contentBody,
          completed: completed.has(l.id),
          quiz: l.quiz ? toStudentQuiz(l.quiz) : null,
        })),
      })),
    },
  };
}

/** Recompute and persist an enrollment's cached progress. */
async function recomputeProgress(schoolId: string, enrollmentId: string) {
  const db = forSchool(schoolId);
  const enrollment = await db.enrollment.findFirst({ where: { id: enrollmentId } });
  if (!enrollment) throw new LearningError('NOT_FOUND', 'Enrollment not found');

  const [totalLessons, completedLessons] = await Promise.all([
    prisma.lesson.count({ where: { module: { courseId: enrollment.courseId } } }),
    db.lessonProgress.count({ where: { enrollmentId, status: 'COMPLETED' } }),
  ]);

  const progress = computeCourseProgress(totalLessons, completedLessons);
  const done = progress.pct === 100 && totalLessons > 0;

  const updated = await db.enrollment.update({
    where: { id: enrollmentId },
    data: {
      progressPct: progress.pct,
      status: done ? 'COMPLETED' : 'ACTIVE',
      completedAt: done ? new Date() : null,
    },
  });

  if (done) await issueForEnrollment(schoolId, enrollmentId);
  return updated;
}

export async function completeLesson(
  schoolId: string,
  enrollmentId: string,
  lessonId: string,
  actorUserId: string
) {
  const db = forSchool(schoolId);
  const enrollment = await db.enrollment.findFirst({ where: { id: enrollmentId } });
  if (!enrollment) throw new LearningError('NOT_FOUND', 'Enrollment not found');

  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId, module: { courseId: enrollment.courseId } },
  });
  if (!lesson) throw new LearningError('NOT_FOUND', 'Lesson not part of this course');

  const existing = await db.lessonProgress.findFirst({ where: { enrollmentId, lessonId } });
  if (existing) {
    if (existing.status !== 'COMPLETED') {
      await db.lessonProgress.update({
        where: { id: existing.id },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });
    }
  } else {
    await db.lessonProgress.create({
      data: { schoolId, enrollmentId, lessonId, status: 'COMPLETED', completedAt: new Date() },
    });
  }

  const updated = await recomputeProgress(schoolId, enrollmentId);
  await recordAudit({ actorUserId, schoolId, action: 'learning.lesson.complete', targetType: 'Lesson', targetId: lessonId });
  return { progressPct: updated.progressPct, status: updated.status };
}

// ---------------------------------------------------------------------------
// Quizzes
// ---------------------------------------------------------------------------

export async function submitQuiz(
  schoolId: string,
  enrollmentId: string,
  quizId: string,
  answers: Record<string, string | undefined>,
  actorUserId: string
) {
  const db = forSchool(schoolId);
  const enrollment = await db.enrollment.findFirst({ where: { id: enrollmentId } });
  if (!enrollment) throw new LearningError('NOT_FOUND', 'Enrollment not found');

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      lesson: { select: { id: true, module: { select: { courseId: true } } } },
      questions: { include: { options: { select: { id: true, isCorrect: true } } } },
    },
  });
  if (!quiz || quiz.lesson.module.courseId !== enrollment.courseId) {
    throw new LearningError('NOT_FOUND', 'Quiz not part of this course');
  }

  const gradeable = quiz.questions.map((q) => ({
    id: q.id,
    correctOptionId: q.options.find((o) => o.isCorrect)?.id ?? '',
  }));
  const grade = gradeQuiz(gradeable, answers, quiz.passingScore);

  const attempt = await db.quizAttempt.create({
    data: {
      schoolId,
      enrollmentId,
      quizId,
      status: 'SUBMITTED',
      score: grade.score,
      passed: grade.passed,
      submittedAt: new Date(),
      answers: {
        create: grade.perQuestion
          .filter((a) => a.optionId != null)
          .map((a) => ({ questionId: a.questionId, optionId: a.optionId!, isCorrect: a.correct })),
      },
    },
  });

  // Passing the quiz completes its lesson.
  if (grade.passed) {
    await completeLesson(schoolId, enrollmentId, quiz.lesson.id, actorUserId);
  }

  await recordAudit({ actorUserId, schoolId, action: 'learning.quiz.submit', targetType: 'Quiz', targetId: quizId });
  return {
    attemptId: attempt.id,
    score: grade.score,
    passed: grade.passed,
    correct: grade.correct,
    total: grade.total,
    perQuestion: grade.perQuestion.map(({ questionId, correct }) => ({ questionId, correct })),
  };
}

// ---------------------------------------------------------------------------
// Teacher view
// ---------------------------------------------------------------------------

export async function getCourseRosterProgress(schoolId: string, courseId: string) {
  const db = forSchool(schoolId);
  const enrollments = await db.enrollment.findMany({
    where: { courseId },
    orderBy: { progressPct: 'desc' },
    include: {
      user: { select: { id: true, name: true } },
      _count: { select: { lessonProgress: { where: { status: 'COMPLETED' } } } },
    },
  });

  return enrollments.map((e) => ({
    userId: e.user.id,
    name: e.user.name,
    progressPct: e.progressPct,
    status: e.status,
    completedLessons: e._count.lessonProgress,
  }));
}
