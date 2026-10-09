import { PrismaClient } from '@prisma/client';

/**
 * Prisma singleton. In dev, Next hot-reloads modules; caching on `globalThis`
 * keeps one pool instead of exhausting connections.
 *
 * NOTE: never query tenant models directly off this client in application code.
 * Use `forSchool(schoolId)` from `./tenant` so isolation is applied.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
