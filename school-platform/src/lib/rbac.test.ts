import { describe, expect, it } from 'vitest';
import { can, permissionsFor } from './rbac';

describe('rbac', () => {
  it('a school admin can manage the roster but not platform content', () => {
    const p = { userId: 'u', platformRole: null, memberRole: 'SCHOOL_ADMIN' as const };
    expect(can(p, 'school.manage')).toBe(true);
    expect(can(p, 'roster.rollover')).toBe(true);
    expect(can(p, 'content.manage')).toBe(false);
    expect(can(p, 'platform.manage')).toBe(false);
  });

  it('a teacher can grade but not manage billing', () => {
    const p = { userId: 'u', platformRole: null, memberRole: 'TEACHER' as const };
    expect(can(p, 'grade.write')).toBe(true);
    expect(can(p, 'course.assign')).toBe(true);
    expect(can(p, 'billing.pay')).toBe(false);
  });

  it('a student can learn but not see analytics', () => {
    const p = { userId: 'u', platformRole: null, memberRole: 'STUDENT' as const };
    expect(can(p, 'course.learn')).toBe(true);
    expect(can(p, 'analytics.view')).toBe(false);
  });

  it('a super admin holds every permission', () => {
    const p = { userId: 'u', platformRole: 'SUPER_ADMIN' as const, memberRole: null };
    expect(can(p, 'platform.manage')).toBe(true);
    expect(can(p, 'school.manage')).toBe(true);
    expect(can(p, 'audit.view')).toBe(true);
  });

  it('roles combine (platform + school)', () => {
    const p = { userId: 'u', platformRole: 'OPS' as const, memberRole: 'TEACHER' as const };
    expect(permissionsFor(p).has('leads.manage')).toBe(true);
    expect(permissionsFor(p).has('grade.write')).toBe(true);
  });

  it('an unaffiliated user has no permissions', () => {
    expect(permissionsFor({ userId: 'u' }).size).toBe(0);
  });
});
