import { z } from 'zod';

/**
 * Environment validation. PALMA runs in one of two modes:
 *
 *  - `live`     — DATABASE_URL present; reads and writes hit PostgreSQL.
 *  - `archive`  — no DATABASE_URL; public pages render from the bundled
 *                 reference dataset and every write is rejected server-side.
 *
 * Archive mode exists so the institution's public surface can be built,
 * designed and reviewed without provisioning infrastructure. It is never a
 * substitute for the database in production, and running it there requires the
 * explicit PALMA_ARCHIVE_MODE=1 opt-in rather than a missing variable.
 */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1).optional(),
  AUTH_SECRET: z.string().min(32).optional(),
  NEXT_PUBLIC_SITE_URL: z.string().url().default('https://palmaawards.com'),
  EMAIL_FROM: z.string().default('PALMA <honours@palmaawards.com>'),
  RESEND_API_KEY: z.string().optional(),
  AGE_VERIFICATION_PROVIDER: z.string().default('stub'),
  AGE_VERIFICATION_API_KEY: z.string().optional(),
  /** Explicit opt-in to running the public site without a database. */
  PALMA_ARCHIVE_MODE: z
    .enum(['0', '1'])
    .default('0')
    .transform((value) => value === '1'),
});

function read() {
  const parsed = schema.safeParse({
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL || undefined,
    AUTH_SECRET: process.env.AUTH_SECRET || undefined,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || undefined,
    EMAIL_FROM: process.env.EMAIL_FROM || undefined,
    RESEND_API_KEY: process.env.RESEND_API_KEY || undefined,
    AGE_VERIFICATION_PROVIDER: process.env.AGE_VERIFICATION_PROVIDER || undefined,
    AGE_VERIFICATION_API_KEY: process.env.AGE_VERIFICATION_API_KEY || undefined,
    PALMA_ARCHIVE_MODE: process.env.PALMA_ARCHIVE_MODE || undefined,
  });

  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  const value = parsed.data;

  if (value.NODE_ENV === 'production') {
    if (!value.DATABASE_URL && !value.PALMA_ARCHIVE_MODE) {
      throw new Error(
        'DATABASE_URL is required in production. Set PALMA_ARCHIVE_MODE=1 to deliberately run the public site from the bundled reference dataset instead.',
      );
    }
    if (!value.AUTH_SECRET) throw new Error('AUTH_SECRET is required in production.');
  }

  return value;
}

export const env = read();

export const mode: 'live' | 'archive' = env.DATABASE_URL ? 'live' : 'archive';

export const isLive = mode === 'live';

/** Signing key for sessions and verification records. */
export function signingSecret(): string {
  if (env.AUTH_SECRET) return env.AUTH_SECRET;
  if (env.NODE_ENV === 'production') throw new Error('AUTH_SECRET is required in production.');
  // Deterministic development fallback — never used when AUTH_SECRET is set.
  return 'palma-development-signing-secret-do-not-use-in-production';
}

export const siteUrl = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
