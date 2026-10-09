import 'server-only';
import { prisma } from '@/lib/db';
import { forSchool } from '@/lib/tenant';
import { recordAudit } from '@/lib/audit';
import { makeSerial } from '@/lib/certificates';
import { DomainError } from './errors';

/**
 * Certificates (Phase 7, spec §6). Issued automatically when an enrollment
 * completes; listed per student/course; verified publicly by serial.
 */

/** Idempotently issue a certificate for a completed enrollment. */
export async function issueForEnrollment(
  schoolId: string,
  enrollmentId: string,
  actorUserId?: string
) {
  const db = forSchool(schoolId);
  const enrollment = await db.enrollment.findFirst({ where: { id: enrollmentId } });
  if (!enrollment || enrollment.status !== 'COMPLETED') return null;

  const existing = await db.certificate.findFirst({
    where: { courseId: enrollment.courseId, userId: enrollment.userId },
  });
  if (existing) return existing;

  // Retry on the (astronomically unlikely) serial collision.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const certificate = await db.certificate.create({
        data: {
          schoolId,
          courseId: enrollment.courseId,
          userId: enrollment.userId,
          serial: makeSerial(),
        },
      });
      await recordAudit({
        actorUserId: actorUserId ?? enrollment.userId,
        schoolId,
        action: 'certificate.issue',
        targetType: 'Certificate',
        targetId: certificate.id,
      });
      return certificate;
    } catch (err) {
      if (attempt === 2) throw err;
    }
  }
  return null;
}

export async function listMyCertificates(schoolId: string, userId: string) {
  const db = forSchool(schoolId);
  const rows = await db.certificate.findMany({
    where: { userId, revokedAt: null },
    orderBy: { issuedAt: 'desc' },
    include: { course: { select: { title: true, slug: true } } },
  });
  return rows.map((c) => ({
    id: c.id,
    serial: c.serial,
    issuedAt: c.issuedAt,
    courseTitle: c.course.title,
  }));
}

export async function listCourseCertificates(schoolId: string, courseId: string) {
  const db = forSchool(schoolId);
  const rows = await db.certificate.findMany({
    where: { courseId, revokedAt: null },
    orderBy: { issuedAt: 'desc' },
    include: { user: { select: { id: true, name: true } } },
  });
  return rows.map((c) => ({
    id: c.id,
    serial: c.serial,
    issuedAt: c.issuedAt,
    userId: c.user.id,
    name: c.user.name,
  }));
}

export async function revokeCertificate(schoolId: string, certificateId: string, actorUserId: string) {
  const db = forSchool(schoolId);
  const cert = await db.certificate.findFirst({ where: { id: certificateId } });
  if (!cert) throw new DomainError('NOT_FOUND', 'Certificate not found');
  const updated = await db.certificate.update({
    where: { id: certificateId },
    data: { revokedAt: new Date() },
  });
  await recordAudit({
    actorUserId,
    schoolId,
    action: 'certificate.revoke',
    targetType: 'Certificate',
    targetId: certificateId,
  });
  return updated;
}

/**
 * Public verification by opaque serial. This is the ONE deliberate read of a
 * tenant model outside `forSchool`: the serial is an unguessable capability and
 * the response is limited to public fields (no roster or PII beyond the name).
 */
export async function verifyBySerial(serial: string) {
  const cert = await prisma.certificate.findUnique({
    where: { serial },
    include: {
      course: { select: { title: true } },
      school: { select: { name: true } },
      user: { select: { name: true } },
    },
  });
  if (!cert) return null;
  return {
    serial: cert.serial,
    revoked: cert.revokedAt != null,
    issuedAt: cert.issuedAt,
    courseTitle: cert.course.title,
    schoolName: cert.school.name,
    studentName: cert.user.name,
  };
}
