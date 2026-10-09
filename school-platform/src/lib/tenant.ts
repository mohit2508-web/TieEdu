import type { PrismaClient } from '@prisma/client';
import { prisma } from './db';

/**
 * Tenant isolation (spec §2) — enforced in exactly ONE place.
 *
 * `applyTenantScope` is a pure function over `(model, operation, args)`. It
 * rewrites a Prisma argument object so a query can never cross the tenant
 * boundary, or throws when the operation cannot be made tenant-safe:
 *
 *   - reads      → `where.schoolId = schoolId` is injected
 *   - writes     → `where.schoolId = schoolId` is injected
 *   - creates    → `data.schoolId = schoolId` is set; a conflicting value throws
 *   - findUnique / upsert → rejected, because their `where` must be a unique
 *     key and a bare `schoolId` is not one. Callers use the compound-keyed
 *     finders provided here instead.
 *
 * Keeping the rule pure is what lets `src/lib/tenant.test.ts` prove cross-tenant
 * access fails without needing a live database.
 */

export const TENANT_MODELS = [
  'Membership',
  'Notice',
  'ParentConsent',
  'SchoolCourse',
  'Enrollment',
  'LessonProgress',
  'QuizAttempt',
  'TeacherCourseAssignment',
  'Invoice',
  'Booking',
  'Certificate',
] as const;
export type TenantModel = (typeof TENANT_MODELS)[number];

const TENANT_MODEL_SET = new Set<string>(TENANT_MODELS);

export function isTenantModel(model: string): model is TenantModel {
  return TENANT_MODEL_SET.has(model);
}

type AnyArgs = Record<string, any>;

const READ_OPS = new Set([
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
]);

const WRITE_WHERE_OPS = new Set([
  'update',
  'updateMany',
  'delete',
  'deleteMany',
]);

const REJECT_OPS = new Set(['findUnique', 'findUniqueOrThrow', 'upsert']);

export function applyTenantScope(
  model: string,
  operation: string,
  args: AnyArgs,
  schoolId: string
): AnyArgs {
  if (!isTenantModel(model)) return args;
  if (!schoolId) {
    throw new Error(`[tenant] tenant model ${model} queried without a schoolId`);
  }

  const next: AnyArgs = { ...args };

  if (REJECT_OPS.has(operation)) {
    throw new Error(
      `[tenant] ${model}.${operation} is disabled — it cannot be scoped by schoolId. ` +
        `Use findById(schoolId, id) (query.findFirst) instead.`
    );
  }

  if (READ_OPS.has(operation) || WRITE_WHERE_OPS.has(operation)) {
    next.where = { ...(args.where || {}), schoolId };
    return next;
  }

  if (operation === 'create') {
    const data = { ...(args.data || {}) };
    if (data.schoolId && data.schoolId !== schoolId) {
      throw new Error(
        `[tenant] cross-tenant write blocked: ${model}.create targeted ${data.schoolId}`
      );
    }
    data.schoolId = schoolId;
    next.data = data;
    return next;
  }

  if (operation === 'createMany') {
    const raw = args.data;
    const rows: AnyArgs[] = Array.isArray(raw) ? raw : [raw];
    next.data = rows.map((row) => {
      if (row.schoolId && row.schoolId !== schoolId) {
        throw new Error(
          `[tenant] cross-tenant write blocked: ${model}.createMany targeted ${row.schoolId}`
        );
      }
      return { ...row, schoolId };
    });
    return next;
  }

  return next;
}

/**
 * A client scoped to one school. Every tenant model read/write goes through the
 * extension above, so a route physically cannot touch another school's rows.
 */
export function forSchool(schoolId: string, base: PrismaClient = prisma) {
  if (!schoolId) throw new Error('[tenant] forSchool requires a schoolId');

  return base.$extends({
    name: `tenant:${schoolId}`,
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const scoped = applyTenantScope(model, operation, args as AnyArgs, schoolId);
          return query(scoped);
        },
      },
    },
  });
}

export type SchoolClient = ReturnType<typeof forSchool>;

/**
 * Compound-keyed finder for tenant models. `findUnique({ id })` is rejected by
 * design, so this is the only supported way to load one row by id — and it is
 * always scoped to the school.
 */
export function findById<T extends TenantModel>(
  client: SchoolClient,
  model: T,
  id: string
): Promise<any | null> {
  const delegate = (client as any)[model.charAt(0).toLowerCase() + model.slice(1)];
  return delegate.findFirst({ where: { id } });
}
