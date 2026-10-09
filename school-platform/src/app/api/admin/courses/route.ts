import { NextRequest } from 'next/server';
import { z } from 'zod';
import { parseCatalogQuery } from '@/lib/catalog';
import { createCourse, listCourses } from '@/server/catalog-service';
import { requirePermission } from '@/server/auth';
import { fail, handleError, ok } from '@/server/http';

export const dynamic = 'force-dynamic';

const courseInput = z.object({
  title: z.string().min(3).max(160),
  summary: z.string().max(400).optional().nullable(),
  description: z.string().max(8000).optional().nullable(),
  skillTrackId: z.string().min(1),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).optional(),
  gradeMin: z.number().int().min(3).max(12).optional(),
  gradeMax: z.number().int().min(3).max(12).optional(),
  outcomes: z.array(z.string().max(300)).max(30).optional(),
  tags: z.array(z.string().max(40)).max(30).optional(),
  heroImageUrl: z.string().url().optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    await requirePermission('content.manage');
    const query = parseCatalogQuery(req.nextUrl.searchParams);
    return ok(await listCourses(query, false));
  } catch (err) {
    return handleError(err, 'admin/courses GET');
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission('content.manage');
    const parsed = courseInput.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail(400, parsed.error.issues[0]?.message || 'Invalid input');

    const course = await createCourse(parsed.data, session.userId);
    return ok({ course }, 201);
  } catch (err) {
    return handleError(err, 'admin/courses POST');
  }
}
