import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  accessCookieOptions,
  refreshCookieOptions,
  rotateSession,
  signAccessToken,
} from '@/lib/session';
import { fail, ok } from '@/server/http';

/**
 * Rotating refresh (spec §18). The presented refresh token is consumed and a
 * new pair is issued; replaying an old token fails because it is revoked.
 */
export async function POST(req: NextRequest) {
  const token = req.cookies.get(REFRESH_COOKIE)?.value;
  if (!token) return fail(401, 'No session');

  const rotated = await rotateSession(token);
  if (!rotated) return fail(401, 'Session expired');

  const access = await signAccessToken({ sub: rotated.userId, sid: rotated.sessionId, pr: null });

  const jar = cookies();
  jar.set(ACCESS_COOKIE, access, accessCookieOptions());
  jar.set(REFRESH_COOKIE, rotated.refreshToken, refreshCookieOptions());
  return ok({});
}
