import 'server-only';
import { cookies } from 'next/headers';
import type { MemberRole, PlatformRole } from '@prisma/client';
import { prisma } from '@/lib/db';
import { ACCESS_COOKIE, verifyAccessToken } from '@/lib/session';
import { can, type Permission, type Principal } from '@/lib/rbac';

/**
 * Server-side session reader. Used by Server Components and Route Handlers.
 * Reads the short-lived access cookie, verifies it, then loads the user and
 * their single active school membership (Phase 1: one school per user).
 */
export interface SessionContext extends Principal {
  email: string | null;
  name: string;
  locale: string;
  schoolId: string | null;
  membershipId: string | null;
  classLevel: string | null;
  section: string | null;
  rollNo: string | null;
}

export async function getSession(): Promise<SessionContext | null> {
  const token = cookies().get(ACCESS_COOKIE)?.value;
  if (!token) return null;

  const claims = await verifyAccessToken(token);
  if (!claims) return null;

  const user = await prisma.user.findFirst({
    where: { id: claims.sub, disabled: false },
    include: {
      memberships: {
        where: { status: 'ACTIVE' },
        orderBy: { createdAt: 'asc' },
        take: 1,
      },
    },
  });
  if (!user) return null;

  const m = user.memberships[0] ?? null;
  return {
    userId: user.id,
    platformRole: user.role,
    memberRole: (m?.role ?? null) as MemberRole | null,
    email: user.email,
    name: user.name,
    locale: user.locale,
    schoolId: m?.schoolId ?? null,
    membershipId: m?.id ?? null,
    classLevel: m?.classLevel ?? null,
    section: m?.section ?? null,
    rollNo: m?.rollNo ?? null,
  };
}

export class AuthError extends Error {
  constructor(
    public code: 'UNAUTHENTICATED' | 'FORBIDDEN',
    message?: string
  ) {
    super(message ?? code);
  }
}

export async function requireSession(): Promise<SessionContext> {
  const session = await getSession();
  if (!session) throw new AuthError('UNAUTHENTICATED');
  return session;
}

export async function requireSchool(): Promise<SessionContext & { schoolId: string }> {
  const session = await requireSession();
  if (!session.schoolId) throw new AuthError('FORBIDDEN', 'No school membership');
  return session as SessionContext & { schoolId: string };
}

export function assertPermission(session: SessionContext, permission: Permission): void {
  if (!can(session, permission)) {
    throw new AuthError('FORBIDDEN', `Missing permission: ${permission}`);
  }
}

export async function requirePermission(permission: Permission): Promise<SessionContext> {
  const session = await requireSession();
  assertPermission(session, permission);
  return session;
}
