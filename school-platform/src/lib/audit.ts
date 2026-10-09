import { prisma } from './db';

/**
 * Append-only audit log (spec §16, §18). Every admin/staff action funnels
 * through here. Failure to audit must never break the business action, so
 * errors are swallowed after logging.
 */
export async function recordAudit(entry: {
  actorUserId?: string | null;
  schoolId?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  meta?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorUserId: entry.actorUserId ?? null,
        schoolId: entry.schoolId ?? null,
        action: entry.action,
        targetType: entry.targetType ?? null,
        targetId: entry.targetId ?? null,
        meta: (entry.meta as object) ?? undefined,
      },
    });
  } catch (err) {
    console.error('[audit] failed to record', entry.action, err);
  }
}
