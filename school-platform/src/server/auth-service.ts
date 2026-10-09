import 'server-only';
import { prisma } from '@/lib/db';
import { generateSchoolCode, generateReferralCode } from '@/lib/ids';
import { hashPassword, hashPin, isValidPin, verifyPassword, verifyPin } from '@/lib/password';
import { recordAudit } from '@/lib/audit';
import type { PlatformRole } from '@prisma/client';

/**
 * Authentication + onboarding business logic (spec §4). Kept out of the route
 * handlers so it can be unit-tested and reused by Server Actions.
 *
 * The three student/staff login paths:
 *   1. email + password            (older students, teachers, admins)
 *   2. school code + roll no + PIN (Class 3–6)
 *   3. phone + OTP                 (parents, staff without a password)
 */

export class AuthServiceError extends Error {
  constructor(
    public code:
      | 'SCHOOL_NOT_FOUND'
      | 'MEMBER_NOT_FOUND'
      | 'INVALID_CREDENTIALS'
      | 'INVALID_PIN'
      | 'ROLL_EXISTS'
      | 'PHONE_EXISTS'
      | 'EMAIL_EXISTS'
      | 'ACCOUNT_DISABLED'
      | 'PHONE_NOT_REGISTERED',
    message: string
  ) {
    super(message);
  }
}

const normalizeCode = (code: string) => code.trim().toUpperCase();

/** Ops creates a school; the sign-up code is generated here (spec §4.1). */
export async function createSchool(input: {
  name: string;
  board?: string;
  city?: string;
  state?: string;
  referredByCode?: string;
}) {
  // Retry a few times in the astronomically unlikely event of a code clash.
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const school = await prisma.school.create({
        data: {
          name: input.name,
          code: generateSchoolCode(input.name),
          board: input.board,
          city: input.city,
          state: input.state,
          referralCode: generateReferralCode(),
          referredByCode: input.referredByCode,
        },
      });
      await recordAudit({ schoolId: school.id, action: 'school.create', targetType: 'School', targetId: school.id });
      return school;
    } catch (err: any) {
      if (err?.code !== 'P2002' || attempt === 4) throw err;
    }
  }
}

/**
 * Self sign-up with a school code (spec §4.2). Young students require a PIN;
 * the school code is not a secret, so the PIN + roll number are the credentials.
 */
export async function signupStudent(input: {
  schoolCode: string;
  name: string;
  classLevel: string;
  section: string;
  rollNo: string;
  pin: string;
  parentPhone?: string;
}) {
  if (!isValidPin(input.pin)) {
    throw new AuthServiceError('INVALID_PIN', 'PIN must be 4–6 digits');
  }
  const code = normalizeCode(input.schoolCode);

  const school = await prisma.school.findFirst({ where: { code, status: 'ACTIVE' } });
  if (!school) throw new AuthServiceError('SCHOOL_NOT_FOUND', 'School not found');

  const existingRoll = await prisma.membership.findFirst({
    where: { schoolId: school.id, rollNo: input.rollNo.trim() },
  });
  if (existingRoll) throw new AuthServiceError('ROLL_EXISTS', 'This roll number is already registered');

  const user = await prisma.user.create({
    data: { name: input.name, phone: input.parentPhone ?? undefined },
  });

  const membership = await prisma.membership.create({
    data: {
      schoolId: school.id,
      userId: user.id,
      role: 'STUDENT',
      classLevel: input.classLevel,
      section: input.section,
      rollNo: input.rollNo.trim(),
      pinHash: await hashPin(input.pin),
    },
  });

  await recordAudit({
    actorUserId: user.id,
    schoolId: school.id,
    action: 'student.signup',
    targetType: 'Membership',
    targetId: membership.id,
  });

  return { user, membership, school };
}

/** Login path 2: school code + roll number + PIN. */
export async function loginWithRollAndPin(input: {
  schoolCode: string;
  rollNo: string;
  pin: string;
}) {
  const code = normalizeCode(input.schoolCode);
  const school = await prisma.school.findFirst({ where: { code, status: 'ACTIVE' } });
  if (!school) throw new AuthServiceError('SCHOOL_NOT_FOUND', 'School not found');

  const membership = await prisma.membership.findFirst({
    where: { schoolId: school.id, rollNo: input.rollNo.trim(), status: 'ACTIVE' },
    include: { user: true },
  });
  if (!membership) throw new AuthServiceError('MEMBER_NOT_FOUND', 'No student with this roll number');
  if (membership.user.disabled) throw new AuthServiceError('ACCOUNT_DISABLED', 'Account disabled');

  const ok = await verifyPin(input.pin, membership.pinHash);
  if (!ok) throw new AuthServiceError('INVALID_CREDENTIALS', 'Incorrect PIN');

  return membership.user;
}

/** Login path 1: email + password. */
export async function loginWithPassword(email: string, password: string) {
  const user = await prisma.user.findFirst({ where: { email: email.trim().toLowerCase() } });
  if (!user) throw new AuthServiceError('INVALID_CREDENTIALS', 'Incorrect email or password');
  if (user.disabled) throw new AuthServiceError('ACCOUNT_DISABLED', 'Account disabled');

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) throw new AuthServiceError('INVALID_CREDENTIALS', 'Incorrect email or password');

  return user;
}

/** Login path 3: the user resolved after a successful OTP verify. */
export async function findUserByVerifiedPhone(phone: string) {
  const user = await prisma.user.findFirst({ where: { phone } });
  if (!user) throw new AuthServiceError('PHONE_NOT_REGISTERED', 'No account for this phone number');
  if (user.disabled) throw new AuthServiceError('ACCOUNT_DISABLED', 'Account disabled');
  return user;
}

/** Seed/ops helper: create a platform staff account. */
export async function createPlatformUser(input: {
  name: string;
  email: string;
  password: string;
  role: PlatformRole;
}) {
  return prisma.user.create({
    data: {
      name: input.name,
      email: input.email.trim().toLowerCase(),
      passwordHash: await hashPassword(input.password),
      role: input.role,
    },
  });
}

export async function touchLastLogin(userId: string) {
  await prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
}
