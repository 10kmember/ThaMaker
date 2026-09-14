import { z } from 'zod';

/**
 * Environment validation.
 *
 * PostgreSQL is not optional. PALMA reads every public page from the database,
 * so `DATABASE_URL` is required everywhere — including at build time, where the
 * season, categories, creators and Journal are read to generate static pages.
 */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required — PostgreSQL is the source of truth.'),
  AUTH_SECRET: z.string().min(32).optional(),
  NEXT_PUBLIC_SITE_URL: z.string().url().default('https://palmaawards.com'),
  EMAIL_FROM: z.string().default('PALMA <laurels@palmaawards.com>'),
  RESEND_API_KEY: z.string().optional(),
  AGE_VERIFICATION_PROVIDER: z.string().default('stub'),
  AGE_VERIFICATION_API_KEY: z.string().optional(),
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
  });

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  const value = parsed.data;

  if (value.NODE_ENV === 'production' && !value.AUTH_SECRET) {
    throw new Error('AUTH_SECRET is required in production.');
  }

  return value;
}

export const env = read();

/** Signing key for sessions and verification records. */
export function signingSecret(): string {
  if (env.AUTH_SECRET) return env.AUTH_SECRET;
  if (env.NODE_ENV === 'production') throw new Error('AUTH_SECRET is required in production.');
  // Deterministic development fallback — never used when AUTH_SECRET is set.
  return 'palma-development-signing-secret-do-not-use-in-production';
}

export const siteUrl = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
