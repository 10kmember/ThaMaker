import { PrismaClient } from '@prisma/client';
import { env, isLive } from '@/lib/env';

const globalForPrisma = globalThis as unknown as { palmaPrisma?: PrismaClient };

function createClient(): PrismaClient {
  return new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
}

/**
 * The Prisma client, or `null` when PALMA is running in archive mode
 * (no DATABASE_URL). Callers must handle `null` explicitly — reads fall back to
 * the bundled reference dataset, writes are refused.
 */
export const prisma: PrismaClient | null = isLive
  ? (globalForPrisma.palmaPrisma ?? createClient())
  : null;

if (env.NODE_ENV !== 'production' && prisma) {
  globalForPrisma.palmaPrisma = prisma;
}

export class DatabaseUnavailableError extends Error {
  constructor() {
    super(
      'PALMA is running without a database (archive mode). Set DATABASE_URL to enable writes.',
    );
    this.name = 'DatabaseUnavailableError';
  }
}

/** Use in write paths: throws rather than silently discarding institutional data. */
export function requireDb(): PrismaClient {
  if (!prisma) throw new DatabaseUnavailableError();
  return prisma;
}
