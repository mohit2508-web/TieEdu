import 'server-only';
import { prisma } from '@/lib/db';
import { forSchool } from '@/lib/tenant';
import { recordAudit } from '@/lib/audit';
import { DomainError } from './errors';

/**
 * Teaching assignments (Phase 4, spec §6–§7). A school admin links a teacher
 * to a catalog course. Assignments are tenant-scoped.
 */

export async function listTeachers(schoolId: string) {
  const db = forSchool(schoolId);
  const members = await db.membership.findMany({
    where: { role: 'TEACHER', status: 'ACTIVE' },
    orderBy: { createdAt: 'asc' },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  const assignments = await db.teacherCourseAssignment.findMany({
    select: { userId: true, courseId: true },
  });
  return members.map((m) => ({
    userId: m.userId,
    name: m.user.name,
    email: m.user.email,
    courseIds: assignments.filter((a) => a.userId === m.userId).map((a) => a.courseId),
  }));
}

export async function listAssignments(schoolId: string) {
  const db = forSchool(schoolId);
  const rows = await db.teacherCourseAssignment.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      course: { select: { id: true, title: true, slug: true } },
      user: { select: { id: true, name: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    courseId: r.courseId,
    courseTitle: r.course.title,
    teacherId: r.userId,
    teacherName: r.user.name,
    createdAt: r.createdAt,
  }));
}

export async function assignTeacher(
  schoolId: string,
  courseId: string,
  teacherUserId: string,
  actorUserId: string
) {
  const db = forSchool(schoolId);

  const membership = await db.membership.findFirst({
    where: { userId: teacherUserId, role: 'TEACHER', status: 'ACTIVE' },
  });
  if (!membership) throw new DomainError('INVALID', 'That user is not an active teacher in this school');

  const course = await prisma.course.findFirst({ where: { id: courseId, status: 'PUBLISHED' } });
  if (!course) throw new DomainError('NOT_FOUND', 'Course not found');

  const existing = await db.teacherCourseAssignment.findFirst({ where: { courseId, userId: teacherUserId } });
  if (existing) return existing;

  const row = await db.teacherCourseAssignment.create({
    data: { schoolId, courseId, userId: teacherUserId },
  });
  await recordAudit({
    actorUserId,
    schoolId,
    action: 'teaching.assign',
    targetType: 'TeacherCourseAssignment',
    targetId: row.id,
  });
  return row;
}

export async function unassignTeacher(schoolId: string, assignmentId: string, actorUserId: string) {
  const db = forSchool(schoolId);
  const row = await db.teacherCourseAssignment.findFirst({ where: { id: assignmentId } });
  if (!row) throw new DomainError('NOT_FOUND', 'Assignment not found');

  await db.teacherCourseAssignment.delete({ where: { id: assignmentId } });
  await recordAudit({
    actorUserId,
    schoolId,
    action: 'teaching.unassign',
    targetType: 'TeacherCourseAssignment',
    targetId: assignmentId,
  });
}

export async function getTeacherCourseIds(schoolId: string, teacherUserId: string) {
  const db = forSchool(schoolId);
  const rows = await db.teacherCourseAssignment.findMany({
    where: { userId: teacherUserId },
    select: { courseId: true },
  });
  return rows.map((r) => r.courseId);
}
