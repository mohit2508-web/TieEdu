import 'server-only';
import { cookies } from 'next/headers';
import type { PlatformRole } from '@prisma/client';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  accessCookieOptions,
  createSession,
  refreshCookieOptions,
  signAccessToken,
} from '@/lib/session';

/**
 * Establish a session for a just-authenticated user: mint the token pair and
 * write both httpOnly cookies. Only callable from Route Handlers / Server
 * Actions (where `cookies()` is mutable).
 */
export async function establishSession(
  userId: string,
  platformRole: PlatformRole | null,
  meta: { userAgent?: string | null; ip?: string | null } = {}
): Promise<void> {
  const issued = await createSession(userId, meta);
  const access = await signAccessToken({ sub: userId, sid: issued.sessionId, pr: platformRole });

  const jar = cookies();
  jar.set(ACCESS_COOKIE, access, accessCookieOptions());
  jar.set(REFRESH_COOKIE, issued.refreshToken, refreshCookieOptions());
}

export function clearSessionCookies(): void {
  const jar = cookies();
  jar.delete(ACCESS_COOKIE);
  jar.delete(REFRESH_COOKIE);
}
