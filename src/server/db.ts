import { PrismaClient } from '@prisma/client';
import { env } from '@/lib/env';

const globalForPrisma = globalThis as unknown as { palmaPrisma?: PrismaClient };

/**
 * The database.
 *
 * PostgreSQL is PALMA's single source of truth. There is no fallback dataset,
 * no in-memory mode and no bundled fixtures behind this client: if the database
 * is unavailable the page fails loudly, which is the correct behaviour for an
 * institution whose whole value is the accuracy of its record.
 */
function createClient(): PrismaClient {
  return new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
}

export const prisma: PrismaClient = globalForPrisma.palmaPrisma ?? createClient();

if (env.NODE_ENV !== 'production') {
  globalForPrisma.palmaPrisma = prisma;
}

/**
 * Retained for write paths that want to state the requirement explicitly at
 * the call site. The client is always present; this is documentation with a
 * return type.
 */
export function requireDb(): PrismaClient {
  return prisma;
}
