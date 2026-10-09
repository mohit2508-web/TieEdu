import { randomInt } from 'node:crypto';
import type { OtpPurpose } from '@prisma/client';
import { prisma } from './db';
import { hashPassword, verifyPassword } from './password';
import { sendOtp } from './notifications';
import { getRedis } from './redis';

/**
 * Phone OTP (spec §4, §18). Six digits, 5-minute TTL, max 5 verify attempts,
 * and both a 60-second send cooldown and an hourly cap per phone+purpose.
 * Rate limiting uses Redis when configured, and falls back to the DB so a
 * deployment without Redis still cannot be brute-forced.
 */

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const COOLDOWN_SECONDS = 60;
const HOURLY_CAP = 10;

export const OTP_DIGITS = 6;

export function generateOtp(): string {
  return String(randomInt(0, 10 ** OTP_DIGITS)).padStart(OTP_DIGITS, '0');
}

async function checkSendRate(phone: string, purpose: OtpPurpose): Promise<boolean> {
  const redis = getRedis();
  const cooldownKey = `otp:cooldown:${phone}:${purpose}`;
  const countKey = `otp:count:${phone}:${purpose}`;

  if (redis) {
    const ok = await redis.set(cooldownKey, '1', 'EX', COOLDOWN_SECONDS, 'NX');
    if (!ok) return false;
    const count = await redis.incr(countKey);
    if (count === 1) await redis.expire(countKey, 3600);
    return count <= HOURLY_CAP;
  }

  // DB fallback.
  const since = new Date(Date.now() - 3600 * 1000);
  const recent = await prisma.otpCode.findMany({
    where: { phone, purpose, createdAt: { gte: since } },
    orderBy: { createdAt: 'desc' },
  });
  if (recent.length >= HOURLY_CAP) return false;
  const last = recent[0];
  if (last && Date.now() - last.createdAt.getTime() < COOLDOWN_SECONDS * 1000) return false;
  return true;
}

export interface RequestOtpResult {
  sent: boolean;
  reason?: 'rate_limited';
}

export async function requestOtp(phone: string, purpose: OtpPurpose = 'LOGIN'): Promise<RequestOtpResult> {
  if (!/^\+?\d{10,15}$/.test(phone)) {
    throw new Error('A valid phone number is required');
  }
  const allowed = await checkSendRate(phone, purpose);
  if (!allowed) return { sent: false, reason: 'rate_limited' };

  const code = generateOtp();
  await prisma.otpCode.create({
    data: {
      phone,
      purpose,
      codeHash: await hashPassword(code),
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    },
  });

  await sendOtp(phone, code, purpose);
  return { sent: true };
}

export type VerifyOtpResult =
  | { ok: true }
  | { ok: false; reason: 'not_found' | 'expired' | 'too_many_attempts' | 'invalid' };

export async function verifyOtp(
  phone: string,
  code: string,
  purpose: OtpPurpose = 'LOGIN'
): Promise<VerifyOtpResult> {
  const otp = await prisma.otpCode.findFirst({
    where: { phone, purpose, consumedAt: null },
    orderBy: { createdAt: 'desc' },
  });
  if (!otp) return { ok: false, reason: 'not_found' };
  if (otp.expiresAt.getTime() < Date.now()) return { ok: false, reason: 'expired' };
  if (otp.attempts >= MAX_ATTEMPTS) return { ok: false, reason: 'too_many_attempts' };

  const valid = await verifyPassword(code, otp.codeHash);
  if (!valid) {
    await prisma.otpCode.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false, reason: 'invalid' };
  }

  await prisma.otpCode.update({
    where: { id: otp.id },
    data: { consumedAt: new Date() },
  });
  return { ok: true };
}
