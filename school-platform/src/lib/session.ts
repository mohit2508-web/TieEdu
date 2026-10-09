import { createHash } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { prisma } from './db';
import { env, requireAuthSecret } from './env';
import { randomToken } from './ids';

/**
 * Session model (spec §1): short-lived JWT access token + opaque rotating
 * refresh token stored hashed in the DB and carried in an httpOnly cookie.
 */

const ISSUER = 'tieedu-school';
const AUDIENCE = 'tieedu-school-app';

const secretKey = () => new TextEncoder().encode(requireAuthSecret());

export const REFRESH_COOKIE = 'tieedu_school_refresh';
export const ACCESS_COOKIE = 'tieedu_school_access';

export interface AccessClaims {
  sub: string; // userId
  sid: string; // session id
  pr?: string | null; // platform role
}

export async function signAccessToken(claims: AccessClaims): Promise<string> {
  return new SignJWT({ pr: claims.pr ?? null })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.sub)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setJti(claims.sid)
    .setIssuedAt()
    .setExpirationTime(`${env.accessTtlSeconds}s`)
    .sign(secretKey());
}

export async function verifyAccessToken(token: string): Promise<AccessClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    if (!payload.sub || !payload.jti) return null;
    return {
      sub: payload.sub,
      sid: payload.jti,
      pr: (payload.pr as string | null) ?? null,
    };
  } catch {
    return null;
  }
}

const hash = (token: string) => createHash('sha256').update(token).digest('hex');

export interface IssuedSession {
  sessionId: string;
  userId: string;
  refreshToken: string;
  expiresAt: Date;
}

export async function createSession(
  userId: string,
  meta: { userAgent?: string | null; ip?: string | null } = {}
): Promise<IssuedSession> {
  const refreshToken = randomToken();
  const expiresAt = new Date(Date.now() + env.refreshTtlDays * 24 * 60 * 60 * 1000);

  const session = await prisma.session.create({
    data: {
      userId,
      tokenHash: hash(refreshToken),
      userAgent: meta.userAgent ?? null,
      ip: meta.ip ?? null,
      expiresAt,
    },
  });

  return { sessionId: session.id, userId, refreshToken, expiresAt };
}

export async function resolveRefresh(refreshToken: string) {
  const session = await prisma.session.findUnique({
    where: { tokenHash: hash(refreshToken) },
    include: { user: true },
  });
  if (!session || session.revokedAt) return null;
  if (session.expiresAt.getTime() < Date.now()) return null;
  if (session.user.disabled) return null;
  return session;
}

/** Rotate: revoke the presented token and mint a fresh pair. */
export async function rotateSession(refreshToken: string): Promise<IssuedSession | null> {
  const session = await resolveRefresh(refreshToken);
  if (!session) return null;

  await prisma.session.update({
    where: { id: session.id },
    data: { revokedAt: new Date() },
  });

  return createSession(session.userId, {
    userAgent: session.userAgent,
    ip: session.ip,
  });
}

export async function revokeSession(refreshToken: string | undefined): Promise<void> {
  if (!refreshToken) return;
  await prisma.session.updateMany({
    where: { tokenHash: hash(refreshToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export const refreshCookieOptions = () => ({
  httpOnly: true,
  secure: env.isProd,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: env.refreshTtlDays * 24 * 60 * 60,
});

export const accessCookieOptions = () => ({
  httpOnly: true,
  secure: env.isProd,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: env.accessTtlSeconds,
});
