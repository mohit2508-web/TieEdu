import type { MemberRole, PlatformRole } from '@prisma/client';

/**
 * RBAC (spec §3). A single permission table the server consults on every
 * protected action. Roles are additive here: a platform SUPER_ADMIN implicitly
 * holds every permission.
 */

export const PERMISSIONS = [
  // Platform (TieEdu staff)
  'platform.manage', // schools CRUD, plan assignment, renewals
  'leads.manage', // CRM pipeline
  'content.manage', // courses, lessons, quizzes, papers
  'trainer.manage', // trainers, verification, availability
  'pricing.manage', // plans, discounts, coupons
  'audit.view',

  // School
  'school.manage', // roster, teachers, branding, settings
  'roster.import',
  'roster.rollover',
  'billing.pay',
  'booking.create',
  'analytics.view',
  'parent.view',

  // Teaching
  'course.assign',
  'grade.write',
  'lessonplan.view',

  // Learning
  'course.learn',
  'portfolio.manage',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const MEMBER_PERMISSIONS: Record<MemberRole, Permission[]> = {
  SCHOOL_ADMIN: [
    'school.manage',
    'roster.import',
    'roster.rollover',
    'billing.pay',
    'booking.create',
    'course.assign',
    'analytics.view',
    'parent.view',
    'lessonplan.view',
  ],
  TEACHER: [
    'course.assign',
    'grade.write',
    'lessonplan.view',
    'analytics.view',
  ],
  STUDENT: ['course.learn', 'portfolio.manage'],
  PARENT: ['parent.view'],
};

const PLATFORM_PERMISSIONS: Record<PlatformRole, Permission[]> = {
  SUPER_ADMIN: [...PERMISSIONS],
  OPS: ['leads.manage', 'school.manage', 'booking.create', 'pricing.manage'],
  CONTENT_ADMIN: ['content.manage', 'pricing.manage', 'lessonplan.view'],
};

export interface Principal {
  userId: string;
  platformRole?: PlatformRole | null;
  /** Role within the active school, if any. */
  memberRole?: MemberRole | null;
}

export function permissionsFor(principal: Principal): Set<Permission> {
  const out = new Set<Permission>();
  if (principal.platformRole) {
    for (const p of PLATFORM_PERMISSIONS[principal.platformRole]) out.add(p);
  }
  if (principal.memberRole) {
    for (const p of MEMBER_PERMISSIONS[principal.memberRole]) out.add(p);
  }
  return out;
}

export function can(principal: Principal, permission: Permission): boolean {
  return permissionsFor(principal).has(permission);
}

export function canAll(principal: Principal, needed: Permission[]): boolean {
  const owned = permissionsFor(principal);
  return needed.every((p) => owned.has(p));
}
