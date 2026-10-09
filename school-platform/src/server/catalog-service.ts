import 'server-only';
import { Prisma, type CourseLevel } from '@prisma/client';
import { prisma } from '@/lib/db';
import { forSchool } from '@/lib/tenant';
import { recordAudit } from '@/lib/audit';
import {
  slugify,
  validateForPublish,
  type CatalogQuery,
  type PublishProblem,
} from '@/lib/catalog';

/**
 * Catalog business logic (Phase 2, spec §5).
 *
 * Global models (SkillTrack/Course/Module/Lesson) are written straight through
 * `prisma` because they are platform content. The per-school opt-in
 * (`SchoolCourse`) is the only tenant-scoped piece and always goes through
 * `forSchool(schoolId)`.
 */

export class CatalogError extends Error {
  constructor(
    public code: 'NOT_FOUND' | 'INVALID' | 'NOT_PUBLISHABLE' | 'ALREADY_EXISTS',
    message: string,
    public problems: PublishProblem[] = []
  ) {
    super(message);
  }
}

const courseInclude = {
  skillTrack: true,
  modules: { orderBy: { sortOrder: 'asc' as const }, include: { lessons: { orderBy: { sortOrder: 'asc' as const } } } },
} satisfies Prisma.CourseInclude;

async function uniqueSlug(base: string, model: 'course' | 'track' = 'course'): Promise<string> {
  const root = slugify(base) || 'course';
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`;
    const existing =
      model === 'course'
        ? await prisma.course.findUnique({ where: { slug: candidate }, select: { id: true } })
        : await prisma.skillTrack.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!existing) return candidate;
  }
  return `${root}-${Date.now()}`;
}

function courseWhere(query: CatalogQuery, onlyPublished: boolean): Prisma.CourseWhereInput {
  const where: Prisma.CourseWhereInput = {};
  if (onlyPublished) where.status = 'PUBLISHED';
  if (query.track) where.skillTrack = { slug: query.track };
  if (query.level) where.level = query.level;
  if (query.grade != null) {
    where.AND = [{ gradeMin: { lte: query.grade } }, { gradeMax: { gte: query.grade } }];
  }
  if (query.q) {
    where.OR = [
      { title: { contains: query.q, mode: 'insensitive' } },
      { summary: { contains: query.q, mode: 'insensitive' } },
      { tags: { has: query.q } },
    ];
  }
  return where;
}

export type CourseListItem = Prisma.CourseGetPayload<{
  include: { skillTrack: true; _count: { select: { modules: true; schoolCourses: true } } };
}>;

export interface CourseListResult {
  items: CourseListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function listCourses(query: CatalogQuery, onlyPublished = true): Promise<CourseListResult> {
  const where = courseWhere(query, onlyPublished);
  const orderBy: Prisma.CourseOrderByWithRelationInput =
    query.sort === 'title' ? { title: 'asc' } : { publishedAt: 'desc' };

  const [items, total] = await Promise.all([
    prisma.course.findMany({
      where,
      orderBy,
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: { skillTrack: true, _count: { select: { modules: true, schoolCourses: true } } },
    }),
    prisma.course.count({ where }),
  ]);

  return {
    items,
    total,
    page: query.page,
    pageSize: query.pageSize,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

export function getPublishedCourseBySlug(slug: string) {
  return prisma.course.findFirst({
    where: { slug, status: 'PUBLISHED' },
    include: courseInclude,
  });
}

export function getCourseById(id: string) {
  return prisma.course.findUnique({ where: { id }, include: courseInclude });
}

export async function listTracksWithCounts() {
  const tracks = await prisma.skillTrack.findMany({
    orderBy: { sortOrder: 'asc' },
    include: { _count: { select: { courses: { where: { status: 'PUBLISHED' } } } } },
  });
  return tracks.map((t) => ({
    id: t.id,
    slug: t.slug,
    name: t.name,
    description: t.description,
    icon: t.icon,
    color: t.color,
    courseCount: t._count.courses,
  }));
}

// ---------------------------------------------------------------------------
// Platform content management (content.manage)
// ---------------------------------------------------------------------------

export interface CourseInput {
  title: string;
  summary?: string | null;
  description?: string | null;
  skillTrackId: string;
  level?: CourseLevel;
  gradeMin?: number;
  gradeMax?: number;
  outcomes?: string[];
  tags?: string[];
  heroImageUrl?: string | null;
}

export async function createCourse(input: CourseInput, actorUserId: string) {
  const track = await prisma.skillTrack.findUnique({ where: { id: input.skillTrackId } });
  if (!track) throw new CatalogError('INVALID', 'Unknown skill track');

  const course = await prisma.course.create({
    data: {
      slug: await uniqueSlug(input.title),
      title: input.title.trim(),
      summary: input.summary ?? null,
      description: input.description ?? null,
      skillTrackId: input.skillTrackId,
      level: input.level ?? 'BEGINNER',
      gradeMin: input.gradeMin ?? 3,
      gradeMax: input.gradeMax ?? 12,
      outcomes: input.outcomes ?? [],
      tags: input.tags ?? [],
      heroImageUrl: input.heroImageUrl ?? null,
      createdById: actorUserId,
    },
  });
  await recordAudit({ actorUserId, action: 'course.create', targetType: 'Course', targetId: course.id });
  return course;
}

export async function updateCourse(id: string, input: Partial<CourseInput>, actorUserId: string) {
  const existing = await prisma.course.findUnique({ where: { id } });
  if (!existing) throw new CatalogError('NOT_FOUND', 'Course not found');
  if (input.skillTrackId) {
    const track = await prisma.skillTrack.findUnique({ where: { id: input.skillTrackId } });
    if (!track) throw new CatalogError('INVALID', 'Unknown skill track');
  }

  const course = await prisma.course.update({
    where: { id },
    data: {
      ...(input.title !== undefined ? { title: input.title.trim() } : {}),
      ...(input.summary !== undefined ? { summary: input.summary } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.skillTrackId !== undefined ? { skillTrackId: input.skillTrackId } : {}),
      ...(input.level !== undefined ? { level: input.level } : {}),
      ...(input.gradeMin !== undefined ? { gradeMin: input.gradeMin } : {}),
      ...(input.gradeMax !== undefined ? { gradeMax: input.gradeMax } : {}),
      ...(input.outcomes !== undefined ? { outcomes: input.outcomes } : {}),
      ...(input.tags !== undefined ? { tags: input.tags } : {}),
      ...(input.heroImageUrl !== undefined ? { heroImageUrl: input.heroImageUrl } : {}),
      // Editing a live course bumps its version so clients/analytics can tell.
      version: existing.status === 'PUBLISHED' ? { increment: 1 } : undefined,
    },
  });
  await recordAudit({ actorUserId, action: 'course.update', targetType: 'Course', targetId: id });
  return course;
}

export async function publishCourse(id: string, actorUserId: string) {
  const course = await getCourseById(id);
  if (!course) throw new CatalogError('NOT_FOUND', 'Course not found');

  const problems = validateForPublish({
    title: course.title,
    skillTrackId: course.skillTrackId,
    gradeMin: course.gradeMin,
    gradeMax: course.gradeMax,
    modules: course.modules.map((m) => ({ lessons: m.lessons.map((l) => ({ title: l.title })) })),
  });
  if (problems.length > 0) {
    throw new CatalogError('NOT_PUBLISHABLE', 'Course is not ready to publish', problems);
  }

  const updated = await prisma.course.update({
    where: { id },
    data: { status: 'PUBLISHED', publishedAt: new Date() },
  });
  await recordAudit({ actorUserId, action: 'course.publish', targetType: 'Course', targetId: id });
  return updated;
}

export async function unpublishCourse(id: string, actorUserId: string) {
  const updated = await prisma.course.update({
    where: { id },
    data: { status: 'DRAFT' },
  });
  await recordAudit({ actorUserId, action: 'course.unpublish', targetType: 'Course', targetId: id });
  return updated;
}

export async function createModule(courseId: string, input: { title: string; summary?: string }, actorUserId: string) {
  const course = await prisma.course.findUnique({ where: { id: courseId }, include: { modules: true } });
  if (!course) throw new CatalogError('NOT_FOUND', 'Course not found');
  const mod = await prisma.module.create({
    data: { courseId, title: input.title.trim(), summary: input.summary ?? null, sortOrder: course.modules.length },
  });
  await recordAudit({ actorUserId, action: 'module.create', targetType: 'Module', targetId: mod.id });
  return mod;
}

export async function createLesson(
  moduleId: string,
  input: { title: string; summary?: string; kind?: Prisma.LessonCreateInput['kind']; durationMins?: number; contentUrl?: string; contentBody?: string; isPreview?: boolean },
  actorUserId: string
) {
  const mod = await prisma.module.findUnique({ where: { id: moduleId }, include: { lessons: true } });
  if (!mod) throw new CatalogError('NOT_FOUND', 'Module not found');
  const lesson = await prisma.lesson.create({
    data: {
      moduleId,
      title: input.title.trim(),
      summary: input.summary ?? null,
      kind: input.kind ?? 'TEXT',
      durationMins: input.durationMins ?? 0,
      contentUrl: input.contentUrl ?? null,
      contentBody: input.contentBody ?? null,
      isPreview: input.isPreview ?? false,
      sortOrder: mod.lessons.length,
    },
  });
  await recordAudit({ actorUserId, action: 'lesson.create', targetType: 'Lesson', targetId: lesson.id });
  return lesson;
}

// ---------------------------------------------------------------------------
// School opt-in (tenant-scoped; requires course.assign)
// ---------------------------------------------------------------------------

export async function enableCourseForSchool(schoolId: string, courseId: string, actorUserId: string) {
  const course = await prisma.course.findFirst({ where: { id: courseId, status: 'PUBLISHED' } });
  if (!course) throw new CatalogError('NOT_FOUND', 'Published course not found');

  const db = forSchool(schoolId);
  const existing = await db.schoolCourse.findFirst({ where: { courseId } });

  const row = existing
    ? await db.schoolCourse.update({ where: { id: existing.id }, data: { status: 'ENABLED' } })
    : await db.schoolCourse.create({
        // schoolId is injected/validated by the tenant extension; passing it here
        // satisfies the generated type (extension types cannot be inferred).
        data: { schoolId, courseId, status: 'ENABLED', addedById: actorUserId },
      });

  await recordAudit({
    actorUserId,
    schoolId,
    action: 'school.course.enable',
    targetType: 'SchoolCourse',
    targetId: row.id,
  });
  return row;
}

export async function disableCourseForSchool(schoolId: string, courseId: string, actorUserId: string) {
  const db = forSchool(schoolId);
  const existing = await db.schoolCourse.findFirst({ where: { courseId } });
  if (!existing) throw new CatalogError('NOT_FOUND', 'Course is not enabled for this school');

  const row = await db.schoolCourse.update({ where: { id: existing.id }, data: { status: 'DISABLED' } });
  await recordAudit({
    actorUserId,
    schoolId,
    action: 'school.course.disable',
    targetType: 'SchoolCourse',
    targetId: row.id,
  });
  return row;
}

export interface SchoolCatalogItem {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  level: CourseLevel;
  gradeMin: number;
  gradeMax: number;
  trackName: string | null;
  enabled: boolean;
}

/** Published catalog annotated with whether this school has enabled each course. */
export async function listPublishedCoursesForSchool(
  schoolId: string
): Promise<SchoolCatalogItem[]> {
  const db = forSchool(schoolId);
  const [courses, enabled] = await Promise.all([
    prisma.course.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { title: 'asc' },
      include: { skillTrack: { select: { name: true } } },
    }),
    db.schoolCourse.findMany({ where: { status: 'ENABLED' } }),
  ]);

  const enabledIds = new Set(enabled.map((e) => e.courseId));
  return courses.map((c) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
    summary: c.summary,
    level: c.level,
    gradeMin: c.gradeMin,
    gradeMax: c.gradeMax,
    trackName: c.skillTrack?.name ?? null,
    enabled: enabledIds.has(c.id),
  }));
}
