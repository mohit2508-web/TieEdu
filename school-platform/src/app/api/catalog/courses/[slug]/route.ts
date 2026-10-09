import { getPublishedCourseBySlug } from '@/server/catalog-service';
import { fail, handleError, ok } from '@/server/http';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  try {
    const course = await getPublishedCourseBySlug(params.slug);
    if (!course) return fail(404, 'Course not found');

    return ok({
      course: {
        id: course.id,
        slug: course.slug,
        title: course.title,
        summary: course.summary,
        description: course.description,
        level: course.level,
        gradeMin: course.gradeMin,
        gradeMax: course.gradeMax,
        durationMins: course.durationMins,
        outcomes: course.outcomes,
        tags: course.tags,
        heroImageUrl: course.heroImageUrl,
        skillTrack: course.skillTrack
          ? { slug: course.skillTrack.slug, name: course.skillTrack.name }
          : null,
        modules: course.modules.map((m) => ({
          id: m.id,
          title: m.title,
          summary: m.summary,
          lessons: m.lessons.map((l) => ({
            id: l.id,
            title: l.title,
            summary: l.summary,
            kind: l.kind,
            durationMins: l.durationMins,
            isPreview: l.isPreview,
            // Full lesson content only for preview lessons on the public endpoint.
            ...(l.isPreview ? { contentUrl: l.contentUrl, contentBody: l.contentBody } : {}),
          })),
        })),
      },
    });
  } catch (err) {
    return handleError(err, 'catalog/courses/[slug]');
  }
}
