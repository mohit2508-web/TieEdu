// ============================================================================
// LEARNING TRACKS — the multi-course paths that award a Career Track
// certificate.
//
// Guarantees this router is built around:
//
//  * A track's progress is re-derived here from the same per-course completion
//    state the course pages use. The client never reports "I finished the
//    track" — it reports nothing, and the server decides.
//  * The track certificate re-checks every member course's completion AND its
//    exam/project readiness before issuing, so the track gate can never be
//    weaker than the weakest member course's own gate.
//  * A member course that is missing from the store or unpublished keeps the
//    track unclaimable — the track never silently shrinks to whatever happens
//    to be live today.
//  * Issuing is idempotent: claiming twice returns the same serial.
//  * The signed payload reuses the existing v4 Certificate shape — course_id
//    carries the track id and tier is 'career_track' — so verification,
//    revocation, download and the admin list all work unchanged.
// ============================================================================

import { Request, Response } from 'express';
import { Router } from 'express';
import { loadDb, saveDb, Course, Certificate, LearningTrack } from '../data/db';
import { optionalAuth, requireAuth } from '../middleware/auth';
import { totalXpForUser } from '../lib/xp';
import { certificateReadiness, completionState, generateSerial } from '../lib/courses';
import { findTrackBySlug, trackCourseCard, trackProgressFor } from '../lib/tracks';
import { SIGNING_VERSION, signCertificate, verificationUrlFor } from '../lib/certificate';

export const tracksRouter = Router();

/** Public card fields for one track — no per-learner state. */
function presentTrack(db: any, track: LearningTrack) {
  const courses = track.course_ids
    .map((id) => (db.courses || []).find((c: Course) => c && c.id === id))
    .filter((c: Course | undefined): c is Course => !!c)
    .map(trackCourseCard);
  const hours = courses.every((c: any) => typeof c.estimated_hours === 'number')
    ? courses.reduce((s: number, c: any) => s + (c.estimated_hours || 0), 0)
    : null;
  return {
    id: track.id,
    slug: track.slug,
    title: track.title,
    tagline: track.tagline,
    description: track.description,
    branch: track.branch,
    course_count: track.course_ids.length,
    courses,
    estimated_hours_total: hours,
  };
}

/** Learner view of one member course — completion + access, no answer keys. */
function presentMember(db: any, userId: string | null, course: Course) {
  const state = completionState(db, userId, course);
  return {
    ...trackCourseCard(course),
    enrolled: state.enrolled,
    completed: state.completed,
    total: state.total,
    percent: state.percent,
    is_complete: state.is_complete,
  };
}

function presentTrackCertificate(c: Certificate) {
  return {
    serial: c.serial,
    track_title: c.course_title,
    issued_at: c.issued_at,
    lessons_completed: c.lessons_completed,
    lessons_required: c.lessons_required,
    status: c.status,
    tier: c.tier || null,
    revoked_reason: c.revoked_reason,
    revoked_at: c.revoked_at,
    verification_url: verificationUrlFor(c.serial),
    download_path: `/courses/certificates/${encodeURIComponent(c.serial)}/download`,
  };
}

// GET /api/tracks — public list of published tracks.
tracksRouter.get('/', optionalAuth, (req: Request, res: Response) => {
  const db = loadDb();
  const userId = req.user?.id || null;
  const tracks = (db.tracks || [])
    .filter((t: LearningTrack) => t && t.published !== false)
    .map((t: LearningTrack) => {
      const base = presentTrack(db, t);
      if (!userId) return { ...base, progress: null, certificate: null };
      const progress = trackProgressFor(db, userId, t);
      const certificate = (db.certificates || []).find(
        (c: Certificate) => c.user_id === userId && c.course_id === t.id && c.status === 'active'
      );
      return {
        ...base,
        progress: {
          courses_complete: progress.courses_complete,
          courses_total: progress.courses_total,
          percent: progress.percent,
          is_complete: progress.is_complete,
        },
        certificate: certificate ? presentTrackCertificate(certificate) : null,
      };
    });
  res.json({ status: 'success', tracks });
});

// GET /api/tracks/:slug — track detail with the learner's per-course state.
// Registered after the collection literal so 'tracks' is not swallowed.
tracksRouter.get('/:slug', optionalAuth, (req: Request, res: Response) => {
  const db = loadDb();
  const track = findTrackBySlug(db, req.params.slug);
  if (!track || track.published === false) {
    return res.status(404).json({ error: 'Track not found' });
  }
  const userId = req.user?.id || null;
  const progress = trackProgressFor(db, userId, track);
  const courses = track.course_ids.map((id) => {
    const course: Course | undefined = (db.courses || []).find((c: Course) => c && c.id === id);
    return course
      ? presentMember(db, userId, course)
      : { id, slug: null, title: 'Coming soon', published: false, is_complete: false };
  });
  const certificate = userId
    ? (db.certificates || []).find(
        (c: Certificate) => c.user_id === userId && c.course_id === track.id && c.status === 'active'
      )
    : null;
  const card = presentTrack(db, track);
  return res.json({
    status: 'success',
    track: {
      ...card,
      courses,
      progress: {
        courses_complete: progress.courses_complete,
        courses_total: progress.courses_total,
        percent: progress.percent,
        is_complete: progress.is_complete,
        missing: progress.missing,
        unavailable: progress.unavailable,
      },
      certificate: certificate ? presentTrackCertificate(certificate) : null,
    },
  });
});

/**
 * POST /api/tracks/:slug/certificate
 *
 * Claims the Career Track certificate. Re-derives every member course's
 * completion AND assessment readiness from stored state. Idempotent: an
 * already-issued active certificate is returned rather than re-minted.
 */
tracksRouter.post('/:slug/certificate', requireAuth, (req: Request, res: Response) => {
  const db = loadDb();
  const userId = req.user!.id;
  const track = findTrackBySlug(db, req.params.slug);
  if (!track || track.published === false) {
    return res.status(404).json({ error: 'Track not found' });
  }

  const existing = (db.certificates || []).find(
    (c: Certificate) => c.user_id === userId && c.course_id === track.id && c.status === 'active'
  );
  if (existing) {
    return res.json({
      status: 'success',
      already_issued: true,
      certificate: presentTrackCertificate(existing),
    });
  }

  const progress = trackProgressFor(db, userId, track);
  if (progress.unavailable.length > 0) {
    return res.status(403).json({
      error: 'This track references a course that is not available yet — it cannot be completed.',
      progress,
    });
  }
  if (!progress.is_complete) {
    return res.status(403).json({
      error: `Not eligible yet — ${progress.courses_complete} of ${progress.courses_total} courses complete.`,
      progress,
    });
  }

  // Lesson completion alone is not enough: each member course's own exam and
  // project gates must also be cleared, so the track certificate can never be
  // weaker than the weakest member certificate.
  const readinessMissing: string[] = [];
  for (const courseId of track.course_ids) {
    const course: Course | undefined = (db.courses || []).find(
      (c: Course) => c && c.id === courseId
    );
    if (!course) continue;
    const readiness = certificateReadiness(db, userId, course);
    if (!readiness.ready) {
      readinessMissing.push(...readiness.missing.map((m) => `${course.title}: ${m}`));
    }
  }
  if (readinessMissing.length > 0) {
    return res.status(403).json({
      error: 'Complete the final exams and projects of every course in this track before claiming.',
      missing: readinessMissing,
      progress,
    });
  }

  // Aggregate lesson counts across member courses — the certificate body's
  // "N of M lessons" is the whole path, not one course.
  let lessonsCompleted = 0;
  let lessonsRequired = 0;
  const skills: string[] = [];
  for (const courseId of track.course_ids) {
    const course: Course | undefined = (db.courses || []).find(
      (c: Course) => c && c.id === courseId
    );
    if (!course) continue;
    const state = completionState(db, userId, course);
    lessonsCompleted += state.completed;
    lessonsRequired += state.total;
    for (const outcome of course.outcomes || []) {
      if (outcome && skills.length < 6 && !skills.includes(outcome)) skills.push(outcome);
    }
  }

  const issuedAt = new Date().toISOString();
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
    course_id: track.id,
    course_title: `${track.title} — Career Track`,
    issued_at: issuedAt,
    lessons_completed: lessonsCompleted,
    lessons_required: lessonsRequired,
    xp_at_issue: totalXpForUser(db, userId),
    tier: 'career_track' as const,
    score_percent: null,
    skills,
    project_title: null,
    project_url: null,
    exam_passed_at: null,
  };

  try {
    const signed = signCertificate(fields);
    const certificate: Certificate = {
      id: `cert-${Date.now()}-${serial.slice(-6)}`,
      serial,
      user_id: userId,
      course_id: track.id,
      course_title: fields.course_title,
      recipient_name: recipientName,
      recipient_email: req.user!.email,
      issued_at: issuedAt,
      xp_at_issue: fields.xp_at_issue,
      lessons_completed: fields.lessons_completed,
      lessons_required: fields.lessons_required,
      tier: 'career_track',
      score_percent: null,
      skills,
      project_title: null,
      project_url: null,
      exam_passed_at: null,
      // A track certificate is a path honour — distinction stays with the
      // individual course certificates where the exam score is signed.
      distinction: false,
      signing_version: SIGNING_VERSION,
      signature: signed.signature,
      signing_key_id: signed.keyId,
      status: 'active',
      revoked_reason: '',
      revoked_at: null,
    };
    db.certificates = db.certificates || [];
    db.certificates.push(certificate);
    saveDb(db);
    return res
      .status(201)
      .json({ status: 'success', already_issued: false, certificate: presentTrackCertificate(certificate) });
  } catch (e: any) {
    console.error(
      `❌ [ERROR] #${(req as any).requestId || '-'} ${req.method} ${req.originalUrl} -> 503`,
      e?.stack || e?.message || e
    );
    return res.status(503).json({ status: 'unavailable', error: 'Certificates are temporarily unavailable' });
  }
});
