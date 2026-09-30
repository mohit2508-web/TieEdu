// ============================================================================
// COURSE ADMIN — everything an instructor needs to build a course.
//
// Whole router is behind requireAdmin (applied to this router below, so the
// guard travels with the routes even if server.ts changes its mount).
// Covers:
//   courses ......... create, edit, publish/unpublish, duplicate, delete
//   modules ......... create, edit, reorder, delete
//   lessons ......... create, edit, reorder, delete, XP per lesson
//   video ........... attach / validate a YouTube or Vimeo video
//   quiz ............ write the answer key (never leaves the server)
//   certificates .... review and revoke
//   xp .............. audit the whole platform ledger
//   feedback ........ read what learners wrote
// ============================================================================

import { Request, Response } from 'express';
import { Router } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import {
  loadDb,
  saveDb,
  Course,
  CourseLesson,
  CourseModule,
  Instructor,
  Certificate,
  CourseFeedback,
  ContentBlockRecord,
  ContentBlockType,
  ALL_BLOCK_TYPES,
  XpEvent,
} from '../data/db';
import { requireAdmin } from '../middleware/auth';
import { syncUserXp, totalXpForUser, LEVELS, XP } from '../lib/xp';
import {
  courseStats,
  generateSerial,
  orderedLessons,
  orderedModules,
  parseVideoUrl,
  readRequiredSeconds,
  uniqueSlug,
  verifyVideoReachable,
  WATCH_THRESHOLD,
} from '../lib/courses';
import { signCertificate, verificationUrlFor } from '../lib/certificate';

export const courseAdminRouter = Router();

// ---------------------------------------------------------------------------
// Instructors
// ---------------------------------------------------------------------------
//
// Instructors are records rather than a free-text name on each course, so the
// "who teaches this" answer is consistent across the catalogue. Nothing is
// seeded: an instructor is a real person, and describing one that does not exist
// is a fabricated claim about a named human. Every numeric field is optional and
// should be left unset unless it comes from real records.

const allInstructors = (db: any): Instructor[] => (Array.isArray(db.instructors) ? db.instructors : []);

/** Courses taught by an instructor, for the "N courses" figure on their block. */
const coursesByInstructor = (db: any, instructorId: string): Course[] =>
  ((db.courses || []) as Course[]).filter((c) => c.instructor_id === instructorId);

/**
 * Public shape of an instructor, with the course count and every number derived
 * from the data rather than stored on the record, so none of it can drift.
 *
 * `students_taught` and `hours_lectured` come from the instructor record because
 * they are claims about a person's history, not something this database can
 * count. They are omitted, not zeroed, when unknown — "0 students" would read as
 * a claim that nobody has ever taken their course.
 */
function instructorForPage(db: any, i: Instructor) {
  const courses = coursesByInstructor(db, i.id);
  return {
    id: i.id,
    name: i.name,
    title: i.title || '',
    bio: i.bio || '',
    photo_url: i.photo_url || '',
    course_count: courses.length,
    students_taught: typeof i.students_taught === 'number' ? i.students_taught : null,
    hours_lectured: typeof i.hours_lectured === 'number' ? i.hours_lectured : null,
    rating: typeof i.rating === 'number' ? i.rating : null,
  };
}
// The instructor ROUTES are registered after the guard, near the end of this file.
// They used to sit here, above the admin guard, which let an unauthenticated
// caller write instructor records. The helpers above stay here; defining a
// function grants no access.


// ---------------------------------------------------------------------------
// Course thumbnail upload
// ---------------------------------------------------------------------------
//
// Modelled on `posters.routes.ts`, which already stores and serves uploaded
// images this way, so there is one convention for uploads in this codebase
// rather than two.

export const THUMBNAIL_DIR = path.join(__dirname, '../../uploads/course-thumbnails');
export const ensureThumbnailDir = () => fs.mkdirSync(THUMBNAIL_DIR, { recursive: true });
ensureThumbnailDir();

/**
 * Only these extensions are ever written to disk, and the name is generated
 * server-side rather than taken from the client, so an uploaded `../../evil.png`
 * cannot choose where the bytes land.
 */
const THUMB_ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);
/** Re-anchored on the serve route, so a crafted name cannot walk out of the dir. */
const THUMB_STORED_NAME_RE = /^thumb-[0-9]+-[a-z0-9]{4,10}\.(jpg|jpeg|png|webp|avif)$/;
const THUMB_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
};

/** The public URL for a stored name, stored on the course as `thumbnail_url`. */
export const thumbnailUrlFor = (storedName: string): string =>
  `/api/course-admin/thumbnail/${encodeURIComponent(storedName)}`;

/**
 * GET /api/course-admin/thumbnail/:storedName — serve a stored cover.
 *
 * Declared *before* `requireAdmin` so it is genuinely public: the card, the
 * detail hero and `og:image` all need the bytes without a session, and the
 * generated names carry nothing sensitive. A crawler fetching `og:image` has no
 * token, so a guarded version of this route would break social previews.
 */
courseAdminRouter.get('/thumbnail/:storedName', (req: Request, res: Response) => {
  const { storedName } = req.params;
  if (!THUMB_STORED_NAME_RE.test(storedName)) return res.status(404).json({ error: 'Invalid file' });

  const filePath = path.join(THUMBNAIL_DIR, storedName);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File missing on disk' });

  const ext = path.extname(storedName).toLowerCase();
  res.setHeader('Content-Type', THUMB_MIME[ext] || 'application/octet-stream');
  // The name embeds a timestamp, so these bytes never change for a given name
  // and a re-upload produces a new name. Safe to cache hard.
  res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.sendFile(filePath);
});
courseAdminRouter.use(requireAdmin);

// ---------------------------------------------------------------------------
// Instructor routes
// ---------------------------------------------------------------------------
//
// Registered BELOW requireAdmin on purpose. They used to be declared at the top
// of this file, above the guard, and POST /api/course-admin/instructors then
// accepted an unauthenticated write: anyone could create, rename or delete the
// records the course page presents as the answer to who teaches this. On an
// Express router, order IS the security boundary - middleware only protects the
// routes registered after it. The public thumbnail GET above the guard is the one
// deliberate exception, and it only reads a file whose name had to match a
// server-generated pattern.

courseAdminRouter.get('/instructors', (_req: Request, res: Response) => {
  const db = loadDb();
  const rows = allInstructors(db).map((i) => instructorForPage(db, i));
  res.json({ status: 'success', instructors: rows });
});

courseAdminRouter.post('/instructors', (req: Request, res: Response) => {
  const db = loadDb();
  const b = req.body || {};
  const name = str(b.name, 120);
  if (name.length < 2) return res.status(400).json({ error: 'Instructor name is required' });

  const instructor: Instructor = {
    id: `inst-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    name,
    title: str(b.title, 120),
    bio: str(b.bio, 8000),
    photo_url: str(b.photo_url, 500),
    created_at: new Date().toISOString(),
  };
  // Optional claims are only stored when actually supplied, so an absent number
  // stays absent instead of becoming a zero the page would have to hide.
  if (b.students_taught !== undefined && b.students_taught !== null && b.students_taught !== '') {
    instructor.students_taught = num(b.students_taught, 0, 0, 100000000);
  }
  if (b.hours_lectured !== undefined && b.hours_lectured !== null && b.hours_lectured !== '') {
    instructor.hours_lectured = num(b.hours_lectured, 0, 0, 1000000);
  }
  if (b.rating !== undefined && b.rating !== null && b.rating !== '') {
    instructor.rating = num(b.rating, 0, 0, 5);
  }

  if (!Array.isArray(db.instructors)) db.instructors = [];
  db.instructors.push(instructor);
  saveDb(db);
  res.status(201).json({ status: 'success', instructor: instructorForPage(db, instructor) });
});

courseAdminRouter.put('/instructors/:id', (req: Request, res: Response) => {
  const db = loadDb();
  const instructor = allInstructors(db).find((i) => i.id === req.params.id);
  if (!instructor) return res.status(404).json({ error: 'Instructor not found' });

  const b = req.body || {};
  if (b.name !== undefined) {
    const n = str(b.name, 120);
    if (n.length < 2) return res.status(400).json({ error: 'Instructor name is required' });
    instructor.name = n;
  }
  if (b.title !== undefined) instructor.title = str(b.title, 120);
  if (b.bio !== undefined) instructor.bio = str(b.bio, 8000);
  if (b.photo_url !== undefined) instructor.photo_url = str(b.photo_url, 500);
  if (b.students_taught !== undefined) {
    instructor.students_taught = b.students_taught === null || b.students_taught === '' ? undefined : num(b.students_taught, 0, 0, 100000000);
  }
  if (b.hours_lectured !== undefined) {
    instructor.hours_lectured = b.hours_lectured === null || b.hours_lectured === '' ? undefined : num(b.hours_lectured, 0, 0, 1000000);
  }
  if (b.rating !== undefined) {
    instructor.rating = b.rating === null || b.rating === '' ? undefined : num(b.rating, 0, 0, 5);
  }

  saveDb(db);
  res.json({ status: 'success', instructor: instructorForPage(db, instructor) });
});

courseAdminRouter.delete('/instructors/:id', (req: Request, res: Response) => {
  const db = loadDb();
  const before = allInstructors(db).length;
  db.instructors = allInstructors(db).filter((i) => i.id !== req.params.id);
  if (db.instructors.length === before) return res.status(404).json({ error: 'Instructor not found' });

  // Detach rather than cascade-delete: the courses are real content and must not
  // disappear because a person stopped teaching them.
  for (const c of (db.courses || []) as Course[]) {
    if (c.instructor_id === req.params.id) c.instructor_id = null;
  }
  saveDb(db);
  res.json({ status: 'success' });
});

const thumbnailStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, THUMBNAIL_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = THUMB_ALLOWED_EXT.has(ext) ? ext : '.jpg';
    const suffix = Math.random().toString(36).slice(2, 10);
    cb(null, `thumb-${Date.now()}-${suffix}${safeExt}`);
  },
});

const thumbnailUpload = multer({
  storage: thumbnailStorage,
  fileFilter: (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (file.mimetype.startsWith('image/') && THUMB_ALLOWED_EXT.has(ext)) cb(null, true);
    else cb(new Error('ONLY_IMAGE_ALLOWED'));
  },
  // 4 MB. A course card cover is decorative; anything larger is a mistake or an
  // attempt to fill the disk, and the page would look no different for it.
  limits: { fileSize: 4 * 1024 * 1024 },
}).single('file');

/**
 * POST /api/course-admin/courses/:id/thumbnail — upload or clear a cover.
 *
 * Behind `requireAdmin`. The previous file is deleted only after the new one is
 * safely on disk, so a failed upload cannot leave a course with no cover.
 */
/**
 * Read the optional long-form page fields off a request body and apply them.
 *
 * Shared by create and update because the two used to disagree: update accepted
 * `about_course` / `instructor_id` and create silently ignored them. An admin who
 * filled the long-form form in on the *new course* screen and watched it vanish
 * would reasonably conclude the form was broken.
 *
 * Every field is applied only when present in the body, so an update that omits a
 * key leaves it alone. That is what makes "clear this section" work - the client
 * sends `''` or `[]` explicitly rather than dropping the key.
 *
 * Returns an error string when the body is unusable, so the caller can bail out
 * before writing a half-built course.
 */
const applyLongFormFields = (
  db: any,
  course: Course,
  b: any,
): { error?: string } => {
  if (b.about_course !== undefined) course.about_course = str(b.about_course, 20000);
  if (b.prerequisites !== undefined) course.prerequisites = longBullets(b.prerequisites, 12);
  if (b.audience !== undefined) course.audience = longBullets(b.audience, 12);
  if (b.audio_language !== undefined) course.audio_language = str(b.audio_language, 40);
  if (b.caption_language !== undefined) course.caption_language = str(b.caption_language, 40);
  if (b.instructor_id !== undefined) {
    const id = str(b.instructor_id, 60) || null;
    // Rejecting a dangling id keeps the course page from silently losing its
    // instructor block after someone deletes the instructor record.
    if (id && !(db.instructors || []).some((i: Instructor) => i.id === id)) {
      return { error: 'Instructor not found' };
    }
    course.instructor_id = id;
  }
  return {};
};

courseAdminRouter.post('/courses/:id/thumbnail', (req: Request, res: Response) => {
  const db = loadDb();
  const course = (db.courses || []).find((c: any) => c.id === req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found' });

  thumbnailUpload(req, res, (err: any) => {
    if (err) {
      const code = err?.code === 'LIMIT_FILE_SIZE' ? 'FILE_TOO_LARGE' : err?.message || 'UPLOAD_FAILED';
      const status = code === 'FILE_TOO_LARGE' ? 413 : 400;
      return res.status(status).json({ error: code });
    }

    // `?remove=1` clears the cover and goes back to the generated gradient.
    if (String(req.query.remove || '') === '1') {
      if (course.thumbnail_url) {
        const old = course.thumbnail_url.split('/').pop() || '';
        if (THUMB_STORED_NAME_RE.test(old)) {
          fs.rm(path.join(THUMBNAIL_DIR, old), { force: true }, () => {});
        }
      }
      course.thumbnail_url = '';
      saveDb(db);
      return res.json({ status: 'success', course: { id: course.id, thumbnail_url: '' } });
    }

    const file = req.file as Express.Multer.File | undefined;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    const previous = String(course.thumbnail_url || '');
    course.thumbnail_url = thumbnailUrlFor(file.filename);
    saveDb(db);

    // Only now that the record points at the new file is the old one removed.
    const oldName = previous.split('/').pop() || '';
    if (THUMB_STORED_NAME_RE.test(oldName)) {
      fs.rm(path.join(THUMBNAIL_DIR, oldName), { force: true }, () => {});
    }

    return res.status(201).json({
      status: 'success',
      course: { id: course.id, thumbnail_url: course.thumbnail_url },
    });
  });
});


// Derived from the shared union, so a block type the editor can produce can
// never be one the save path throws away.
const BLOCK_TYPES: ContentBlockType[] = [...ALL_BLOCK_TYPES];
const LEVELS_ALLOWED = ['beginner', 'intermediate', 'advanced'];

function str(v: any, max = 400): string {
  return (v === undefined || v === null ? '' : String(v)).trim().slice(0, max);
}

function strArray(v: any, max = 20): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => str(x, 60)).filter(Boolean).slice(0, max);
}

/**
 * Bullets for the long-form page sections.
 *
 * `strArray` caps each item at 60 characters, which suits a tag but truncates a
 * sentence like "Anyone comfortable writing a small Python script" mid-word.
 * These get a sentence-sized cap instead.
 */
function longBullets(v: any, max = 12): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => str(x, 400)).filter(Boolean).slice(0, max);
}

function num(v: any, fallback: number, min: number, max: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function nextSort(list: { sort_order: number }[]): number {
  return list.length ? Math.max(...list.map((l) => l.sort_order || 0)) + 1 : 1;
}

function audit(db: any, action: string, detail: string) {
  db.audit = db.audit || [];
  db.audit.push({ id: `aud-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`, action, detail, at: new Date().toISOString() });
  if (db.audit.length > 500) db.audit = db.audit.slice(-500);
}

/** Course with answer keys, for the editor only. Never used on the student API. */
function courseForEditor(db: any, course: Course) {
  return {
    ...course,
    modules: orderedModules(course).map((m) => ({
      ...m,
      lessons: (m.lessons || [])
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((l) => ({ ...l, read_required_seconds: readRequiredSeconds(l) })),
    })),
    stats: courseStats(course),
  };
}

// ============================================================================
// COURSES
// ============================================================================

courseAdminRouter.get('/courses', (req: Request, res: Response) => {
  const db = loadDb();
  const q = str(req.query.q).toLowerCase();
  let list = (db.courses || []) as Course[];
  if (q) {
    list = list.filter((c) =>
      [c.title, c.subtitle, c.category, ...(c.tags || [])].join(' ').toLowerCase().includes(q)
    );
  }

  const enrolledCount = (courseId: string) =>
    Object.values(db.course_progress || {}).filter((byUser: any) => byUser?.[courseId]).length;

  res.json({
    status: 'success',
    courses: list
      .map((c) => ({
        ...c,
        modules: undefined,
        module_count: (c.modules || []).length,
        stats: courseStats(c),
        enrolled: enrolledCount(c.id),
        certificates: (db.certificates || []).filter((x: Certificate) => x.course_id === c.id).length,
      }))
      .sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || '')),
  });
});

courseAdminRouter.post('/courses', (req: Request, res: Response) => {
  const db = loadDb();
  const title = str(req.body?.title, 160);
  if (title.length < 3) return res.status(400).json({ error: 'Course title is required (min 3 characters)' });

  const now = new Date().toISOString();
  const course: Course = {
    id: `crs-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    slug: uniqueSlug(db, str(req.body?.slug) || title),
    title,
    subtitle: str(req.body?.subtitle, 220),
    description: str(req.body?.description, 6000),
    category: str(req.body?.category, 60) || 'General',
    level: LEVELS_ALLOWED.includes(req.body?.level) ? req.body.level : 'beginner',
    is_free: req.body?.is_free !== false,
    price_inr: Math.max(0, num(req.body?.price_inr, 0, 0, 100000)),
    thumbnail_url: str(req.body?.thumbnail_url, 500),
    tags: strArray(req.body?.tags),
    outcomes: strArray(req.body?.outcomes, 12).map((o) => o.slice(0, 240)),
    prerequisite_course_id: str(req.body?.prerequisite_course_id, 60) || null,
    certificate_eligible: req.body?.certificate_eligible !== false,
    // New courses start as drafts. Nothing reaches the student catalog until
    // an admin explicitly publishes it.
    published: false,
    created_at: now,
    updated_at: now,
    modules: [],
  };

  if (!course.is_free) course.price_inr = Math.max(1, course.price_inr);

  // Long-form page sections and the instructor assignment are accepted on create
  // as well as update. Without this an admin filling the new-course form would
  // lose every one of them, because the body keys were only ever read by PUT.
  const longForm = applyLongFormFields(db, course, req.body || {});
  if (longForm.error) return res.status(400).json({ error: longForm.error });

  db.courses = db.courses || [];
  db.courses.push(course);
  audit(db, 'course.create', `Created course "${course.title}"`);
  saveDb(db);

  res.status(201).json({ status: 'success', course: courseForEditor(db, course) });
});

courseAdminRouter.get('/courses/:id', (req: Request, res: Response) => {
  const db = loadDb();
  const course = (db.courses || []).find((c: Course) => c.id === req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found' });

  const enrollments = Object.entries(db.course_progress || {})
    .filter(([, byUser]: [string, any]) => byUser?.[course.id])
    .map(([userId, byUser]: [string, any]) => {
      const user = (db.users || []).find((u: any) => u.id === userId);
      return {
        user_id: userId,
        name: user?.name || 'Unknown',
        email: user?.email || '',
        enrolled_at: byUser[course.id].enrolled_at,
        completed_at: byUser[course.id].completed_at,
        completed_lessons: (byUser[course.id].completed_lesson_ids || []).length,
        total_lessons: orderedLessons(course).length,
      };
    });

  res.json({
    status: 'success',
    course: courseForEditor(db, course),
    enrollments,
    feedback: (db.course_feedback || []).filter((f: CourseFeedback) => f.course_id === course.id),
  });
});

courseAdminRouter.put('/courses/:id', (req: Request, res: Response) => {
  const db = loadDb();
  const course = (db.courses || []).find((c: Course) => c.id === req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found' });

  const b = req.body || {};

  if (b.title !== undefined) {
    const t = str(b.title, 160);
    if (t.length < 3) return res.status(400).json({ error: 'Course title is required (min 3 characters)' });
    course.title = t;
  }
  if (b.slug !== undefined) course.slug = uniqueSlug(db, str(b.slug) || course.title, course.id);
  if (b.subtitle !== undefined) course.subtitle = str(b.subtitle, 220);
  if (b.description !== undefined) course.description = str(b.description, 6000);
  if (b.category !== undefined) course.category = str(b.category, 60) || 'General';
  if (b.level !== undefined && LEVELS_ALLOWED.includes(b.level)) course.level = b.level;
  if (b.is_free !== undefined) {
    course.is_free = !!b.is_free;
    if (course.is_free) course.price_inr = 0;
  }
  if (b.price_inr !== undefined) course.price_inr = Math.max(course.is_free ? 0 : 1, num(b.price_inr, course.price_inr, 0, 100000));
  if (b.thumbnail_url !== undefined) course.thumbnail_url = str(b.thumbnail_url, 500);
  if (b.tags !== undefined) course.tags = strArray(b.tags);
  if (b.outcomes !== undefined) course.outcomes = strArray(b.outcomes, 12).map((o) => o.slice(0, 240));
  // Long-form page sections. Each is optional and an empty value clears it, so
  // an admin can remove a section by sending `[]` / `''` rather than only adding.
  const longForm = applyLongFormFields(db, course, b);
  if (longForm.error) return res.status(400).json({ error: longForm.error });
  if (b.certificate_eligible !== undefined) course.certificate_eligible = !!b.certificate_eligible;
  if (b.prerequisite_course_id !== undefined) {
    const prereq = str(b.prerequisite_course_id, 60) || null;
    if (prereq === course.id) return res.status(400).json({ error: 'A course cannot be its own prerequisite' });
    if (prereq && !(db.courses || []).some((c: Course) => c.id === prereq)) {
      return res.status(400).json({ error: 'Prerequisite course not found' });
    }
    course.prerequisite_course_id = prereq;
  }
  if (b.published !== undefined) {
    const publishing = !!b.published;
    if (publishing) {
      const stats = courseStats(course);
      const problems: string[] = [];
      if (stats.lesson_count === 0) problems.push('it has no lessons');
      if (!course.description.trim()) problems.push('the description is empty');
      if (!course.subtitle.trim()) problems.push('the subtitle is empty');
      if (problems.length) {
        return res.status(400).json({
          error: `Cannot publish yet — ${problems.join(', ')}. Add content first, or save it as a draft.`,
        });
      }
    }
    course.published = publishing;
    audit(db, publishing ? 'course.publish' : 'course.unpublish', `${publishing ? 'Published' : 'Unpublished'} "${course.title}"`);
  }

  course.updated_at = new Date().toISOString();
  saveDb(db);
  res.json({ status: 'success', course: courseForEditor(db, course) });
});

/** Duplicate a course as a draft. Answers copy too — reuse is the point. */
courseAdminRouter.post('/courses/:id/duplicate', (req: Request, res: Response) => {
  const db = loadDb();
  const source = (db.courses || []).find((c: Course) => c.id === req.params.id);
  if (!source) return res.status(404).json({ error: 'Course not found' });

  const now = new Date().toISOString();
  const idSuffix = crypto.randomBytes(3).toString('hex');
  const clone: Course = JSON.parse(JSON.stringify(source));
  clone.id = `crs-${Date.now()}-${idSuffix}`;
  clone.title = `${source.title} (copy)`;
  clone.slug = uniqueSlug(db, `${source.slug}-copy`);
  clone.published = false;
  clone.certificate_eligible = false;
  clone.prerequisite_course_id = null;
  clone.created_at = now;
  clone.updated_at = now;

  for (const m of clone.modules || []) {
    m.id = `crm-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    m.course_id = clone.id;
    for (const l of m.lessons || []) {
      l.id = `cfl-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
      l.module_id = m.id;
      for (const blk of l.blocks || []) blk.id = `blk-${crypto.randomBytes(4).toString('hex')}`;
      if (l.quiz) {
        l.quiz.id = `ql-${crypto.randomBytes(5).toString('hex')}`;
        for (const q of l.quiz.questions || []) q.id = `q-${crypto.randomBytes(5).toString('hex')}`;
      }
    }
  }

  db.courses.push(clone);
  audit(db, 'course.duplicate', `Duplicated "${source.title}" into "${clone.title}"`);
  saveDb(db);
  res.status(201).json({ status: 'success', course: courseForEditor(db, clone) });
});

/** Refuses to delete a course that learners have already started. */
courseAdminRouter.delete('/courses/:id', (req: Request, res: Response) => {
  const db = loadDb();
  const course = (db.courses || []).find((c: Course) => c.id === req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found' });

  const enrolled = Object.values(db.course_progress || {}).filter((byUser: any) => byUser?.[course.id]).length;
  if (enrolled > 0 && req.query.force !== '1') {
    return res.status(409).json({
      error: `${enrolled} learner(s) have progress in this course. Unpublish it instead, or re-send with force=1 to delete anyway (their progress is kept but orphaned).`,
      enrolled,
    });
  }

  db.courses = db.courses.filter((c: Course) => c.id !== course.id);
  for (const c of db.courses || []) {
    if (c.prerequisite_course_id === course.id) c.prerequisite_course_id = null;
  }
  audit(db, 'course.delete', `Deleted course "${course.title}"`);
  saveDb(db);
  res.json({ status: 'success', deleted: course.id });
});

// ============================================================================
// MODULES
// ============================================================================

function findCourse(db: any, id: string) {
  const course = (db.courses || []).find((c: Course) => c.id === id);
  return course || null;
}

courseAdminRouter.post('/courses/:id/modules', (req: Request, res: Response) => {
  const db = loadDb();
  const course = findCourse(db, req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found' });

  const title = str(req.body?.title, 160);
  if (title.length < 2) return res.status(400).json({ error: 'Module title is required' });

  course.modules = course.modules || [];
  const mod: CourseModule = {
    id: `crm-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    course_id: course.id,
    title,
    summary: str(req.body?.summary, 400),
    sort_order: req.body?.sort_order !== undefined ? num(req.body.sort_order, nextSort(course.modules), 1, 9999) : nextSort(course.modules),
    lessons: [],
  };
  course.modules.push(mod);
  course.updated_at = new Date().toISOString();
  saveDb(db);
  res.status(201).json({ status: 'success', module: mod });
});

courseAdminRouter.put('/modules/:moduleId', (req: Request, res: Response) => {
  const db = loadDb();
  const found = locateModule(db, req.params.moduleId);
  if (!found) return res.status(404).json({ error: 'Module not found' });

  const b = req.body || {};
  if (b.title !== undefined) found.module.title = str(b.title, 160) || found.module.title;
  if (b.summary !== undefined) found.module.summary = str(b.summary, 400);
  if (b.sort_order !== undefined) found.module.sort_order = num(b.sort_order, found.module.sort_order, 1, 9999);
  found.course.updated_at = new Date().toISOString();
  saveDb(db);
  res.json({ status: 'success', module: found.module });
});

courseAdminRouter.post('/courses/:id/modules/reorder', (req: Request, res: Response) => {
  const db = loadDb();
  const course = findCourse(db, req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found' });

  const order: string[] = Array.isArray(req.body?.module_ids) ? req.body.module_ids : [];
  const byId = new Map<string, CourseModule>((course.modules || []).map((m: CourseModule) => [m.id, m]));
  let position = 1;
  for (const id of order) {
    const mod = byId.get(id);
    if (mod) {
      mod.sort_order = position;
      position += 1;
    }
  }
  // Anything the client did not mention keeps its relative order at the end.
  for (const mod of (course.modules || []).slice().sort((a: CourseModule, b: CourseModule) => a.sort_order - b.sort_order)) {
    if (!order.includes(mod.id)) {
      mod.sort_order = position;
      position += 1;
    }
  }
  saveDb(db);
  res.json({ status: 'success', modules: orderedModules(course) });
});

courseAdminRouter.delete('/modules/:moduleId', (req: Request, res: Response) => {
  const db = loadDb();
  const found = locateModule(db, req.params.moduleId);
  if (!found) return res.status(404).json({ error: 'Module not found' });

  const lessonCount = (found.module.lessons || []).length;
  const startedBy = Object.values(db.course_progress || {}).filter((byUser: any) => {
    const p = byUser?.[found.course.id];
    return p && (found.module.lessons || []).some((l: CourseLesson) => (p.completed_lesson_ids || []).includes(l.id));
  }).length;

  if (startedBy > 0 && req.query.force !== '1') {
    return res.status(409).json({
      error: `${startedBy} learner(s) have completed lessons in this module. Re-send with force=1 to delete it anyway.`,
      started_by: startedBy,
      lesson_count: lessonCount,
    });
  }

  found.course.modules = found.course.modules.filter((m: CourseModule) => m.id !== found.module.id);
  found.course.updated_at = new Date().toISOString();
  saveDb(db);
  res.json({ status: 'success', deleted: found.module.id });
});

// ============================================================================
// LESSONS
// ============================================================================

function locateLesson(db: any, lessonId: string) {
  for (const course of db.courses || []) {
    for (const mod of course.modules || []) {
      const lesson = (mod.lessons || []).find((l: CourseLesson) => l.id === lessonId);
      if (lesson) return { course, module: mod, lesson };
    }
  }
  return null;
}

function locateModule(db: any, moduleId: string) {
  for (const course of db.courses || []) {
    const mod = (course.modules || []).find((m: CourseModule) => m.id === moduleId);
    if (mod) return { course, module: mod };
  }
  return null;
}

courseAdminRouter.post('/modules/:moduleId/lessons', (req: Request, res: Response) => {
  const db = loadDb();
  const found = locateModule(db, req.params.moduleId);
  if (!found) return res.status(404).json({ error: 'Module not found' });

  const title = str(req.body?.title, 160);
  if (title.length < 2) return res.status(400).json({ error: 'Lesson title is required' });

  found.module.lessons = found.module.lessons || [];
  const incoming = normaliseBlocks(req.body?.blocks);
  const lesson: CourseLesson = {
    id: `cfl-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    module_id: found.module.id,
    title,
    summary: str(req.body?.summary, 400),
    sort_order: nextSort(found.module.lessons),
    duration_minutes: num(req.body?.duration_minutes, 10, 1, 600),
    // The default comes from the XP table, never from the request body.
    xp_reward: num(req.body?.xp_reward, XP.LESSON_COMPLETE, 0, 1000),
    video: null,
    blocks: incoming.blocks,
    quiz: null,
  };

  if (req.body?.quiz) lesson.quiz = normaliseQuiz(req.body.quiz);

  found.module.lessons.push(lesson);
  found.course.updated_at = new Date().toISOString();
  saveDb(db);
  res.status(201).json({ status: 'success', lesson, warnings: blockWarnings(incoming.dropped) });
});

courseAdminRouter.put('/lessons/:lessonId', (req: Request, res: Response) => {
  const db = loadDb();
  const found = locateLesson(db, req.params.lessonId);
  if (!found) return res.status(404).json({ error: 'Lesson not found' });

  const b = req.body || {};
  if (b.title !== undefined) found.lesson.title = str(b.title, 160) || found.lesson.title;
  if (b.summary !== undefined) found.lesson.summary = str(b.summary, 400);
  if (b.sort_order !== undefined) found.lesson.sort_order = num(b.sort_order, found.lesson.sort_order, 1, 9999);
  if (b.duration_minutes !== undefined) found.lesson.duration_minutes = num(b.duration_minutes, found.lesson.duration_minutes, 1, 600);
  if (b.xp_reward !== undefined) found.lesson.xp_reward = num(b.xp_reward, found.lesson.xp_reward, 0, 1000);
  if (b.blocks !== undefined) {
    const incoming = normaliseBlocks(b.blocks);
    found.lesson.blocks = incoming.blocks;
    const warnings = blockWarnings(incoming.dropped);
    if (warnings.length) return res.status(400).json({ error: warnings.join(' '), dropped: incoming.dropped });
  }

  found.course.updated_at = new Date().toISOString();
  saveDb(db);
  res.json({ status: 'success', lesson: found.lesson });
});

courseAdminRouter.post('/modules/:moduleId/lessons/reorder', (req: Request, res: Response) => {
  const db = loadDb();
  const found = locateModule(db, req.params.moduleId);
  if (!found) return res.status(404).json({ error: 'Module not found' });

  const order: string[] = Array.isArray(req.body?.lesson_ids) ? req.body.lesson_ids : [];
  const byId = new Map<string, CourseLesson>((found.module.lessons || []).map((l: CourseLesson) => [l.id, l]));
  let position = 1;
  for (const id of order) {
    const lesson = byId.get(id);
    if (lesson) {
      lesson.sort_order = position;
      position += 1;
    }
  }
  for (const lesson of (found.module.lessons || []).slice().sort((a: CourseLesson, b: CourseLesson) => a.sort_order - b.sort_order)) {
    if (!order.includes(lesson.id)) {
      lesson.sort_order = position;
      position += 1;
    }
  }
  saveDb(db);
  res.json({ status: 'success', lessons: (found.module.lessons || []).slice().sort((a: CourseLesson, b: CourseLesson) => a.sort_order - b.sort_order) });
});

courseAdminRouter.delete('/lessons/:lessonId', (req: Request, res: Response) => {
  const db = loadDb();
  const found = locateLesson(db, req.params.lessonId);
  if (!found) return res.status(404).json({ error: 'Lesson not found' });

  const startedBy = Object.values(db.course_progress || {}).filter((byUser: any) => {
    const p = byUser?.[found.course.id];
    return p && (p.completed_lesson_ids || []).includes(found.lesson.id);
  }).length;

  if (startedBy > 0 && req.query.force !== '1') {
    return res.status(409).json({
      error: `${startedBy} learner(s) already completed this lesson. Re-send with force=1 to delete it anyway — their progress stays credited.`,
      started_by: startedBy,
    });
  }

  found.module.lessons = found.module.lessons.filter((l: CourseLesson) => l.id !== found.lesson.id);
  found.course.updated_at = new Date().toISOString();
  saveDb(db);
  res.json({ status: 'success', deleted: found.lesson.id });
});

const MAX_BLOCKS_PER_LESSON = 60;

/** Human-readable reason a block did not survive the save. */
function blockWarnings(dropped: string[]): string[] {
  if (!dropped.length) return [];
  return [`${dropped.length} block(s) were not saved: ${dropped.join(', ')}.`];
}

/**
 * Blocks: allow-listed types, ordered array, ids regenerated server-side.
 *
 * Anything rejected is reported back in `dropped` rather than discarded in
 * silence. The allow-list is now derived from `ALL_BLOCK_TYPES`, so a drop can
 * only mean a genuinely unknown type or the 60-block cap — both of which an
 * admin needs to be told about, because a silent drop looks exactly like a save
 * that worked.
 */
function normaliseBlocks(input: any): { blocks: ContentBlockRecord[]; dropped: string[] } {
  if (!Array.isArray(input)) return { blocks: [], dropped: [] };
  const dropped: string[] = [];
  const kept = input
    .filter((b: any) => {
      if (b && BLOCK_TYPES.includes(b.block_type)) return true;
      dropped.push(String(b?.block_type ?? '(missing)').slice(0, 40));
      return false;
    })
    .slice(0, MAX_BLOCKS_PER_LESSON);
  if (input.filter((b: any) => b && BLOCK_TYPES.includes(b.block_type)).length > MAX_BLOCKS_PER_LESSON) {
    dropped.push(`(over the ${MAX_BLOCKS_PER_LESSON}-block limit)`);
  }
  return {
    blocks: kept.map((b: any, i: number) => ({
      id: `blk-${crypto.randomBytes(4).toString('hex')}`,
      block_type: b.block_type,
      block_order: i + 1,
      payload: typeof b.payload === 'object' && b.payload ? b.payload : {},
    })),
    dropped,
  };
}

function normaliseQuiz(input: any) {
  const questions = (Array.isArray(input?.questions) ? input.questions : [])
    .map((q: any) => {
      const options = (Array.isArray(q?.options) ? q.options : []).map((o: any) => str(o, 300)).filter(Boolean);
      const prompt = str(q?.prompt, 500);
      const correct = Number(q?.correct_index);
      if (!prompt || options.length < 2) return null;
      if (!Number.isInteger(correct) || correct < 0 || correct >= options.length) return null;
      return {
        id: str(q?.id, 40) || `q-${crypto.randomBytes(5).toString('hex')}`,
        prompt,
        options,
        correct_index: correct,
        explanation: str(q?.explanation, 800),
      };
    })
    .filter(Boolean);

  if (questions.length === 0) return null;

  return {
    id: str(input?.id, 40) || `ql-${crypto.randomBytes(5).toString('hex')}`,
    passing_percent: num(input?.passing_percent, 70, 1, 100),
    questions,
  };
}

// ============================================================================
// VIDEO
// ============================================================================

/**
 * POST /course-admin/videos/resolve — parse + reachability check.
 * The editor calls this before POST /lessons/:id/video, so a dead link is
 * caught at authoring time.
 */
courseAdminRouter.post('/videos/resolve', async (req: Request, res: Response) => {
  const url = str(req.body?.url, 500);
  const parsed = parseVideoUrl(url);
  if (!parsed) {
    return res.status(400).json({
      error: 'That is not a recognisable YouTube or Vimeo link. Paste the full watch URL.',
    });
  }
  const check = await verifyVideoReachable(parsed);
  if (!check.ok) return res.status(400).json({ error: check.error, provider: parsed.provider, video_id: parsed.video_id });

  res.json({
    status: 'success',
    provider: parsed.provider,
    video_id: parsed.video_id,
    title: check.title || '',
    channel: check.channel || '',
  });
});

/** PUT /course-admin/lessons/:lessonId/video — attach or clear a video. */
courseAdminRouter.put('/lessons/:lessonId/video', async (req: Request, res: Response) => {
  const db = loadDb();
  const found = locateLesson(db, req.params.lessonId);
  if (!found) return res.status(404).json({ error: 'Lesson not found' });

  if (req.body?.remove === true) {
    found.lesson.video = null;
    found.course.updated_at = new Date().toISOString();
    saveDb(db);
    return res.json({ status: 'success', lesson: found.lesson });
  }

  const url = str(req.body?.url, 500);
  const parsed = parseVideoUrl(url);
  if (!parsed) {
    return res.status(400).json({ error: 'That is not a recognisable YouTube or Vimeo link.' });
  }

  const check = await verifyVideoReachable(parsed);
  if (!check.ok) return res.status(400).json({ error: check.error });

  found.lesson.video = {
    provider: parsed.provider,
    url,
    video_id: parsed.video_id,
    title: str(req.body?.title, 200) || check.title || '',
    channel: str(req.body?.channel, 120) || check.channel || '',
    duration_minutes: num(req.body?.duration_minutes, found.lesson.duration_minutes, 1, 600),
    added_at: new Date().toISOString(),
  };
  found.course.updated_at = new Date().toISOString();
  audit(db, 'lesson.video', `Attached ${parsed.provider} video to "${found.lesson.title}"`);
  saveDb(db);

  res.json({ status: 'success', lesson: found.lesson });
});

// ============================================================================
// QUIZ
// ============================================================================

courseAdminRouter.put('/lessons/:lessonId/quiz', (req: Request, res: Response) => {
  const db = loadDb();
  const found = locateLesson(db, req.params.lessonId);
  if (!found) return res.status(404).json({ error: 'Lesson not found' });

  if (req.body?.remove === true) {
    found.lesson.quiz = null;
    found.course.updated_at = new Date().toISOString();
    saveDb(db);
    return res.json({ status: 'success', lesson: found.lesson });
  }

  const quiz = normaliseQuiz(req.body?.quiz || req.body);
  if (!quiz) {
    return res.status(400).json({
      error: 'A quiz needs at least one question with two or more options and a valid correct answer.',
    });
  }

  found.lesson.quiz = quiz;
  found.course.updated_at = new Date().toISOString();
  saveDb(db);
  res.json({ status: 'success', lesson: found.lesson, quiz });
});

// ============================================================================
// CERTIFICATES
// ============================================================================

courseAdminRouter.get('/certificates', (req: Request, res: Response) => {
  const db = loadDb();
  const status = str(req.query.status);
  const q = str(req.query.q).toLowerCase();

  let rows = (db.certificates || []) as Certificate[];
  if (status === 'active' || status === 'revoked') rows = rows.filter((c) => c.status === status);
  if (q) {
    rows = rows.filter((c) =>
      [c.serial, c.recipient_name, c.course_title].join(' ').toLowerCase().includes(q)
    );
  }

  const courseTitles = new Map<string, string>((db.courses || []).map((c: Course) => [c.id, c.title]));

  res.json({
    status: 'success',
    certificates: rows
      .slice()
      .sort((a, b) => b.issued_at.localeCompare(a.issued_at))
      .map((c) => ({
        serial: c.serial,
        recipient_name: c.recipient_name,
        recipient_email: c.recipient_email,
        course_id: c.course_id,
        course_title: c.course_title,
        course_still_exists: courseTitles.has(c.course_id),
        issued_at: c.issued_at,
        lessons_completed: c.lessons_completed,
        lessons_required: c.lessons_required,
        xp_at_issue: c.xp_at_issue,
        signature: c.signature,
        signature_prefix: c.signature.slice(0, 16),
        cert_status: c.status,
        revoked_reason: c.revoked_reason,
        revoked_at: c.revoked_at,
        verification_url: verificationUrlFor(c.serial),
      })),
    counts: {
      total: (db.certificates || []).length,
      active: (db.certificates || []).filter((c: Certificate) => c.status === 'active').length,
      revoked: (db.certificates || []).filter((c: Certificate) => c.status === 'revoked').length,
    },
  });
});

/**
 * POST /course-admin/certificates/issue — manual issue. Still goes through the
 * same completion check as the self-service route, so an admin cannot mint a
 * certificate for unfinished work either.
 */
courseAdminRouter.post('/certificates/issue', (req: Request, res: Response) => {
  const db = loadDb();
  const course = findCourse(db, str(req.body?.course_id, 60));
  if (!course) return res.status(404).json({ error: 'Course not found' });

  const userId = str(req.body?.user_id, 60);
  const user = (db.users || []).find((u: any) => u.id === userId && !u.disabled);
  if (!user) return res.status(404).json({ error: 'Learner not found' });

  if (!course.certificate_eligible) {
    return res.status(400).json({ error: 'This course is marked as skill practice only — enable certificates on the course first.' });
  }

  const p = db.course_progress?.[userId]?.[course.id];
  const required = orderedLessons(course).length;
  const done = (p?.completed_lesson_ids || []).length;
  if (required === 0 || done < required) {
    return res.status(403).json({
      error: `Refusing to issue: this learner has completed ${done} of ${required} lessons.`,
      completed: done,
      required,
    });
  }

  const existing = (db.certificates || []).find(
    (c: Certificate) => c.user_id === userId && c.course_id === course.id && c.status === 'active'
  );
  if (existing) {
    return res.status(409).json({ error: `Already issued: ${existing.serial}`, serial: existing.serial });
  }

  const issuedAt = new Date().toISOString();
  let serial = generateSerial();
  for (let attempt = 0; (db.certificates || []).some((c: Certificate) => c.serial === serial); attempt++) {
    if (attempt >= 5) {
      return res.status(503).json({ status: 'error', error: 'Could not allocate a unique serial' });
    }
    serial = generateSerial();
  }
  const fields = {
    serial,
    user_id: userId,
    recipient_email: user.email,
    recipient_name: user.name,
    course_id: course.id,
    course_title: course.title,
    issued_at: issuedAt,
    lessons_completed: done,
    lessons_required: required,
    xp_at_issue: totalXpForUser(db, userId),
  };

  const signed = signCertificate(fields);
  const certificate: Certificate = {
    id: `cert-${Date.now()}-${serial.slice(-6)}`,
    serial,
    user_id: userId,
    course_id: course.id,
    course_title: course.title,
    recipient_name: user.name,
    recipient_email: user.email,
    issued_at: issuedAt,
    xp_at_issue: fields.xp_at_issue,
    lessons_completed: fields.lessons_completed,
    lessons_required: fields.lessons_required,
    signature: signed.signature,
    signing_key_id: signed.keyId,
    status: 'active',
    revoked_reason: '',
    revoked_at: null,
  };

  db.certificates = db.certificates || [];
  db.certificates.push(certificate);
  audit(db, 'certificate.issue', `Manually issued ${serial} to ${user.email} for "${course.title}"`);
  saveDb(db);

  res.status(201).json({ status: 'success', certificate, verification_url: verificationUrlFor(serial) });
});

courseAdminRouter.post('/certificates/:serial/revoke', (req: Request, res: Response) => {
  const db = loadDb();
  const serial = (req.params.serial || '').trim().toUpperCase();
  const certificate: Certificate | undefined = (db.certificates || []).find((c: Certificate) => c.serial === serial);
  if (!certificate) return res.status(404).json({ error: 'Certificate not found' });
  if (certificate.status === 'revoked') {
    return res.status(409).json({ error: 'Already revoked', certificate });
  }

  certificate.status = 'revoked';
  certificate.revoked_reason = str(req.body?.reason, 300) || 'Revoked by TieEdu administrator';
  certificate.revoked_at = new Date().toISOString();
  audit(db, 'certificate.revoke', `Revoked ${serial}: ${certificate.revoked_reason}`);
  saveDb(db);

  res.json({ status: 'success', certificate });
});

/** Un-revoke. Kept because a mistaken revocation is a real support scenario. */
courseAdminRouter.post('/certificates/:serial/restore', (req: Request, res: Response) => {
  const db = loadDb();
  const serial = (req.params.serial || '').trim().toUpperCase();
  const certificate: Certificate | undefined = (db.certificates || []).find((c: Certificate) => c.serial === serial);
  if (!certificate) return res.status(404).json({ error: 'Certificate not found' });
  if (certificate.status === 'active') return res.json({ status: 'success', certificate });

  certificate.status = 'active';
  certificate.revoked_reason = '';
  certificate.revoked_at = null;
  audit(db, 'certificate.restore', `Restored ${serial}`);
  saveDb(db);
  res.json({ status: 'success', certificate });
});

// ============================================================================
// XP AUDIT
// ============================================================================

courseAdminRouter.get('/xp', (req: Request, res: Response) => {
  const db = loadDb();
  const q = str(req.query.q).toLowerCase();
  const reason = str(req.query.reason);

  const userById = new Map<string, any>((db.users || []).map((u: any) => [u.id, u]));
  const courseById = new Map<string, string>((db.courses || []).map((c: Course) => [c.id, c.title]));
  const lessonById = new Map<string, string>();
  for (const c of db.courses || []) {
    for (const m of c.modules || []) {
      for (const l of m.lessons || []) lessonById.set(l.id, l.title);
    }
  }

  let rows = (db.xp_ledger || []) as any[];
  if (reason) rows = rows.filter((e) => e.reason === reason);
  if (q) {
    rows = rows.filter((e) => {
      const u = userById.get(e.user_id);
      return [u?.name, u?.email, e.key, e.note].join(' ').toLowerCase().includes(q);
    });
  }

  const ledger = rows.slice().sort((a, b) => b.created_at.localeCompare(a.created_at));

  // Per-user totals, recomputed from the ledger so an admin can compare the
  // authoritative number with the cached user.xp.
  const perUser = new Map<string, { name: string; email: string; ledger_xp: number; cached_xp: number; drift: number }>();
  for (const e of db.xp_ledger || []) {
    const cur = perUser.get(e.user_id) || {
      name: userById.get(e.user_id)?.name || 'Unknown',
      email: userById.get(e.user_id)?.email || '',
      ledger_xp: 0,
      cached_xp: Number(userById.get(e.user_id)?.xp) || 0,
      drift: 0,
    };
    cur.ledger_xp += Number(e.xp) || 0;
    perUser.set(e.user_id, cur);
  }
  const withDrift = Array.from(perUser.entries()).map(([user_id, v]) => ({
    user_id,
    ...v,
    drift: v.ledger_xp - v.cached_xp,
  }));

  res.json({
    status: 'success',
    entries: ledger.slice(0, 300).map((e) => ({
      id: e.id,
      user_id: e.user_id,
      user_name: userById.get(e.user_id)?.name || 'Unknown',
      user_email: userById.get(e.user_id)?.email || '',
      reason: e.reason,
      xp: e.xp,
      key: e.key,
      course_title: e.course_id ? courseById.get(e.course_id) || null : null,
      lesson_title: e.lesson_id ? lessonById.get(e.lesson_id) || null : null,
      created_at: e.created_at,
      note: e.note,
    })),
    total_entries: (db.xp_ledger || []).length,
    // Derived from the data rather than a hardcoded list. The list used to omit
    // `review`, so every XP a student earned by publishing an interview report
    // was missing from these totals and the admin total was quietly wrong.
    totals_by_reason: ((db.xp_ledger || []) as XpEvent[])
      .map((e) => e.reason)
      .filter((r, i, all) => all.indexOf(r) === i)
      .sort()
      .reduce((acc: Record<string, { entries: number; xp: number }>, r) => {
        const matching = (db.xp_ledger || []).filter((e: XpEvent) => e.reason === r);
        acc[r] = {
          entries: matching.length,
          xp: matching.reduce((s: number, e: XpEvent) => s + (Number(e.xp) || 0), 0),
        };
        return acc;
      }, {}),
    xp_rules: XP,
    levels: LEVELS,
    watch_threshold_percent: Math.round(WATCH_THRESHOLD * 100),
    // Drift must always be zero. A non-zero value here is a bug worth chasing.
    xp_drift: withDrift.filter((v) => v.drift !== 0),
    leaderboard: withDrift.sort((a, b) => b.ledger_xp - a.ledger_xp).slice(0, 50),
  });
});

/** POST /course-admin/xp/reconcile — rewrite user.xp from the ledger. */
courseAdminRouter.post('/xp/reconcile', (req: Request, res: Response) => {
  const db = loadDb();
  const changed: { user_id: string; before: number; after: number }[] = [];
  for (const user of db.users || []) {
    const before = Number(user.xp) || 0;
    const after = syncUserXp(db, user.id);
    if (before !== after) changed.push({ user_id: user.id, before, after });
  }
  if (changed.length) audit(db, 'xp.reconcile', `Reconciled ${changed.length} user XP totals from the ledger`);
  saveDb(db);
  res.json({ status: 'success', reconciled: changed.length, changed });
});

// ============================================================================
// FEEDBACK INBOX
// ============================================================================

courseAdminRouter.get('/feedback', (req: Request, res: Response) => {
  const db = loadDb();
  const courseId = str(req.query.course_id);
  let rows = (db.course_feedback || []) as CourseFeedback[];
  if (courseId) rows = rows.filter((f) => f.course_id === courseId);

  const courseById = new Map<string, string>((db.courses || []).map((c: Course) => [c.id, c.title]));
  const rated = rows.filter((f) => f.rating > 0);

  res.json({
    status: 'success',
    feedback: rows
      .slice()
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((f) => ({
        ...f,
        course_title: courseById.get(f.course_id) || 'Deleted course',
      })),
    summary: {
      total: rows.length,
      average_rating: rated.length
        ? Math.round((rated.reduce((s, f) => s + f.rating, 0) / rated.length) * 10) / 10
        : 0,
      would_recommend: rows.filter((f) => f.would_recommend).length,
    },
  });
});

export default courseAdminRouter;
