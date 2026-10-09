import { describe, expect, it } from 'vitest';
import { applyTenantScope } from './tenant';

/**
 * Tenant isolation acceptance test (spec §21): data for School A must never be
 * reachable from a client scoped to School B.
 */
describe('applyTenantScope', () => {
  const A = 'school-A';
  const B = 'school-B';

  it('scopes reads to the active school', () => {
    const out = applyTenantScope('Notice', 'findMany', { where: { pinned: true } }, B);
    expect(out.where).toEqual({ pinned: true, schoolId: B });
  });

  it('scopes findFirst too', () => {
    const out = applyTenantScope('Membership', 'findFirst', { where: { role: 'STUDENT' } }, A);
    expect(out.where.schoolId).toBe(A);
  });

  it('a cross-tenant filter cannot widen the scope (schoolId wins)', () => {
    // Even if a caller tries to read the other tenant, the injected schoolId
    // replaces it, so School B's row never surfaces.
    const out = applyTenantScope('Notice', 'findMany', { where: { schoolId: A } }, B);
    expect(out.where.schoolId).toBe(B);
  });

  it('sets schoolId on create', () => {
    const out = applyTenantScope('Notice', 'create', { data: { title: 'x', body: 'y' } }, A);
    expect(out.data.schoolId).toBe(A);
  });

  it('blocks a create that targets another school', () => {
    expect(() =>
      applyTenantScope('Notice', 'create', { data: { title: 'x', body: 'y', schoolId: A } }, B)
    ).toThrow(/cross-tenant/i);
  });

  it('scopes every row of createMany', () => {
    const out = applyTenantScope(
      'Notice',
      'createMany',
      { data: [{ title: 'a', body: 'b' }, { title: 'c', body: 'd' }] },
      B
    );
    expect(out.data).toHaveLength(2);
    expect(out.data.every((r: any) => r.schoolId === B)).toBe(true);
  });

  it('scopes update and delete', () => {
    expect(applyTenantScope('Notice', 'update', { where: { id: 'n1' }, data: {} }, A).where).toEqual({
      id: 'n1',
      schoolId: A,
    });
    expect(applyTenantScope('Notice', 'deleteMany', { where: {} }, A).where).toEqual({ schoolId: A });
  });

  it('rejects findUnique / upsert (cannot be scoped by a non-unique field)', () => {
    expect(() => applyTenantScope('Notice', 'findUnique', { where: { id: 'n1' } }, A)).toThrow(/disabled/);
    expect(() => applyTenantScope('Notice', 'upsert', { where: { id: 'n1' } }, A)).toThrow(/disabled/);
  });

  it('leaves non-tenant models untouched', () => {
    const args = { where: { id: 'u1' } };
    expect(applyTenantScope('User', 'findMany', args, A)).toBe(args);
    expect(applyTenantScope('Course', 'findMany', args, A)).toBe(args);
    expect(applyTenantScope('Lesson', 'findMany', args, A)).toBe(args);
  });

  it('scopes the SchoolCourse opt-in to the active school', () => {
    const out = applyTenantScope('SchoolCourse', 'findMany', { where: {} }, B);
    expect(out.where).toEqual({ schoolId: B });
    expect(applyTenantScope('SchoolCourse', 'create', { data: { courseId: 'c1' } }, A).data).toMatchObject({
      courseId: 'c1',
      schoolId: A,
    });
  });

  it('scopes Phase 3 learning models', () => {
    for (const model of ['Enrollment', 'LessonProgress', 'QuizAttempt']) {
      expect(applyTenantScope(model, 'findMany', { where: {} }, A).where).toEqual({ schoolId: A });
    }
    // Quiz content is platform-owned.
    const args = { where: { id: 'quiz1' } };
    expect(applyTenantScope('Quiz', 'findFirst', args, A)).toBe(args);
  });

  it('scopes Phase 4 teaching assignments', () => {
    const out = applyTenantScope('TeacherCourseAssignment', 'findMany', { where: {} }, B);
    expect(out.where).toEqual({ schoolId: B });
  });

  it('scopes Phase 5–7 commerce, bookings and certificates', () => {
    for (const model of ['Invoice', 'Booking', 'Certificate']) {
      expect(applyTenantScope(model, 'findMany', { where: {} }, A).where).toEqual({ schoolId: A });
    }
  });

  it('refuses to run without a schoolId', () => {
    expect(() => applyTenantScope('Notice', 'findMany', {}, '')).toThrow(/without a schoolId/);
  });
});
