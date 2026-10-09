import 'server-only';
import { prisma } from '@/lib/db';
import { forSchool } from '@/lib/tenant';
import {
  averageProgress,
  classifyRisk,
  completionRate,
  progressDistribution,
  type RiskLevel,
} from '@/lib/analytics';
import { DomainError } from './errors';

/**
 * School analytics (Phase 4, spec §7). Everything here is tenant-scoped and
 * only ever reads through `forSchool(schoolId)`.
 */

const DAY = 86_400_000;
const daysSince = (d: Date) => Math.floor((Date.now() - d.getTime()) / DAY);

export async function getSchoolOverview(schoolId: string) {
  const db = forSchool(schoolId);
  const [students, teachers, enabledCourses, enrollments] = await Promise.all([
    db.membership.count({ where: { role: 'STUDENT', status: 'ACTIVE' } }),
    db.membership.count({ where: { role: 'TEACHER', status: 'ACTIVE' } }),
    db.schoolCourse.count({ where: { status: 'ENABLED' } }),
    db.enrollment.findMany({
      include: { course: { select: { skillTrack: { select: { name: true } } } } },
    }),
  ]);

  const progresses = enrollments.map((e) => e.progressPct);
  const completed = enrollments.filter((e) => e.status === 'COMPLETED').length;
  const activeThisWeek = enrollments.filter((e) => daysSince(e.updatedAt) <= 7).length;

  const trackMap = new Map<string, number>();
  for (const e of enrollments) {
    const name = e.course.skillTrack?.name ?? 'General';
    trackMap.set(name, (trackMap.get(name) ?? 0) + 1);
  }

  return {
    students,
    teachers,
    enabledCourses,
    enrollments: enrollments.length,
    activeEnrollments: enrollments.filter((e) => e.status === 'ACTIVE').length,
    completedEnrollments: completed,
    activeThisWeek,
    avgProgress: averageProgress(progresses),
    completionRate: completionRate(completed, enrollments.length),
    distribution: progressDistribution(progresses),
    byTrack: [...trackMap.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
  };
}

export async function getCourseAnalytics(schoolId: string, courseId: string) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      skillTrack: { select: { name: true } },
      modules: { include: { lessons: { select: { id: true } } } },
    },
  });
  if (!course) throw new DomainError('NOT_FOUND', 'Course not found');

  const db = forSchool(schoolId);
  const enrollments = await db.enrollment.findMany({
    where: { courseId },
    orderBy: { progressPct: 'desc' },
    include: {
      user: { select: { id: true, name: true } },
      _count: { select: { lessonProgress: { where: { status: 'COMPLETED' } } } },
    },
  });

  const lessonIds = course.modules.flatMap((m) => m.lessons.map((l) => l.id));
  const attempts = lessonIds.length
    ? await db.quizAttempt.findMany({ where: { quiz: { lessonId: { in: lessonIds } } } })
    : [];

  const progresses = enrollments.map((e) => e.progressPct);
  const totalLessons = lessonIds.length;

  const students = enrollments.map((e) => {
    const daysSinceActive = daysSince(e.updatedAt);
    return {
      userId: e.user.id,
      name: e.user.name,
      progressPct: e.progressPct,
      status: e.status,
      completedLessons: e._count.lessonProgress,
      daysSinceActive,
      risk: classifyRisk({
        progressPct: e.progressPct,
        daysSinceActive,
        completed: e.status === 'COMPLETED',
      }) as RiskLevel,
    };
  });

  return {
    course: {
      id: course.id,
      slug: course.slug,
      title: course.title,
      trackName: course.skillTrack?.name ?? null,
      gradeMin: course.gradeMin,
      gradeMax: course.gradeMax,
      modules: course.modules.length,
      lessons: totalLessons,
    },
    students,
    enrolled: enrollments.length,
    avgProgress: averageProgress(progresses),
    completionRate: completionRate(
      enrollments.filter((e) => e.status === 'COMPLETED').length,
      enrollments.length
    ),
    distribution: progressDistribution(progresses),
    quiz: {
      attempts: attempts.length,
      passRate: completionRate(attempts.filter((a) => a.passed).length, attempts.length),
      avgScore: attempts.length
        ? Math.round(attempts.reduce((s, a) => s + a.score, 0) / attempts.length)
        : 0,
    },
  };
}

export async function getClassRoster(schoolId: string, classLevel: string, section?: string | null) {
  const db = forSchool(schoolId);
  const members = await db.membership.findMany({
    where: {
      role: 'STUDENT',
      status: 'ACTIVE',
      classLevel,
      ...(section ? { section } : {}),
    },
    orderBy: { rollNo: 'asc' },
    include: { user: { select: { id: true, name: true } } },
  });

  const userIds = members.map((m) => m.userId);
  const enrollments = userIds.length
    ? await db.enrollment.findMany({ where: { userId: { in: userIds } } })
    : [];

  return members.map((m) => {
    const mine = enrollments.filter((e) => e.userId === m.userId);
    return {
      userId: m.userId,
      name: m.user.name,
      rollNo: m.rollNo,
      section: m.section,
      enrollments: mine.length,
      avgProgress: averageProgress(mine.map((e) => e.progressPct)),
    };
  });
}

export async function getStudentAnalytics(schoolId: string, studentUserId: string) {
  const db = forSchool(schoolId);
  const membership = await db.membership.findFirst({
    where: { userId: studentUserId, role: 'STUDENT' },
    include: { user: { select: { id: true, name: true } } },
  });
  if (!membership) throw new DomainError('NOT_FOUND', 'Student not found in this school');

  const enrollments = await db.enrollment.findMany({
    where: { userId: studentUserId },
    orderBy: { updatedAt: 'desc' },
    include: {
      course: { select: { id: true, title: true, slug: true, skillTrack: { select: { name: true } } } },
      _count: { select: { lessonProgress: { where: { status: 'COMPLETED' } } } },
    },
  });

  const attempts = await db.quizAttempt.findMany({
    where: { enrollment: { userId: studentUserId } },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: { quiz: { include: { lesson: { select: { title: true } } } } },
  });

  const courses = enrollments.map((e) => {
    const daysSinceActive = daysSince(e.updatedAt);
    return {
      enrollmentId: e.id,
      courseId: e.course.id,
      title: e.course.title,
      trackName: e.course.skillTrack?.name ?? null,
      progressPct: e.progressPct,
      status: e.status,
      completedLessons: e._count.lessonProgress,
      daysSinceActive,
      risk: classifyRisk({
        progressPct: e.progressPct,
        daysSinceActive,
        completed: e.status === 'COMPLETED',
      }) as RiskLevel,
    };
  });

  return {
    student: {
      userId: membership.user.id,
      name: membership.user.name,
      classLevel: membership.classLevel,
      section: membership.section,
      rollNo: membership.rollNo,
    },
    courses,
    avgProgress: averageProgress(courses.map((c) => c.progressPct)),
    attempts: attempts.map((a) => ({
      id: a.id,
      lesson: a.quiz.lesson.title,
      score: a.score,
      passed: a.passed,
      submittedAt: a.submittedAt,
    })),
  };
}

export async function getTeacherDashboard(schoolId: string, teacherUserId: string) {
  const db = forSchool(schoolId);
  const assignments = await db.teacherCourseAssignment.findMany({
    where: { userId: teacherUserId },
    include: { course: { select: { id: true, title: true, slug: true } } },
  });

  const courseIds = assignments.map((a) => a.courseId);
  const enrollments = courseIds.length
    ? await db.enrollment.findMany({
        where: { courseId: { in: courseIds } },
        include: { user: { select: { id: true, name: true } } },
      })
    : [];

  const courses = assignments.map((a) => {
    const mine = enrollments.filter((e) => e.courseId === a.courseId);
    return {
      courseId: a.course.id,
      title: a.course.title,
      students: mine.length,
      avgProgress: averageProgress(mine.map((e) => e.progressPct)),
      completed: mine.filter((e) => e.status === 'COMPLETED').length,
    };
  });

  const atRisk = enrollments
    .map((e) => {
      const daysSinceActive = daysSince(e.updatedAt);
      const risk = classifyRisk({
        progressPct: e.progressPct,
        daysSinceActive,
        completed: e.status === 'COMPLETED',
      }) as RiskLevel;
      return {
        userId: e.user.id,
        name: e.user.name,
        courseId: e.courseId,
        progressPct: e.progressPct,
        daysSinceActive,
        risk,
      };
    })
    .filter((s) => s.risk === 'AT_RISK' || s.risk === 'WATCH')
    .sort((a, b) => a.progressPct - b.progressPct);

  return {
    courses,
    avgProgress: averageProgress(courses.map((c) => c.avgProgress)),
    atRisk: atRisk.slice(0, 25),
  };
}
