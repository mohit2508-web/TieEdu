import { NextRequest, NextResponse } from 'next/server';
import { AuthError } from './auth';
import { CatalogError } from './catalog-service';
import { LearningError } from './learning-service';
import { DomainError } from './errors';

export function requestMeta(req: NextRequest) {
  return {
    userAgent: req.headers.get('user-agent'),
    ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
  };
}

export function fail(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

export function ok<T extends object>(data: T, status = 200) {
  return NextResponse.json({ status: 'ok', ...data }, { status });
}

/** Maps the domain errors thrown by services onto HTTP responses. */
export function handleError(err: unknown, tag: string) {
  if (err instanceof AuthError) {
    return fail(err.code === 'UNAUTHENTICATED' ? 401 : 403, err.message);
  }
  if (err instanceof CatalogError) {
    const status =
      err.code === 'NOT_FOUND' ? 404 : err.code === 'NOT_PUBLISHABLE' ? 422 : 400;
    return NextResponse.json({ error: err.message, problems: err.problems }, { status });
  }
  if (err instanceof LearningError) {
    const status = err.code === 'NOT_FOUND' ? 404 : err.code === 'FORBIDDEN' ? 403 : 400;
    return fail(status, err.message);
  }
  if (err instanceof DomainError) {
    const status =
      err.code === 'NOT_FOUND' ? 404 : err.code === 'FORBIDDEN' ? 403 : err.code === 'CONFLICT' ? 409 : 400;
    return fail(status, err.message);
  }
  console.error(`[${tag}]`, err);
  return fail(500, 'Something went wrong');
}
