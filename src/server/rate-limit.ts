import 'server-only';
import { headers } from 'next/headers';
import { hashIdentifier } from '@/lib/crypto';
import { signingSecret } from '@/lib/env';
import { prisma } from '@/server/db';

export type RateLimitRule = {
  /** Logical bucket name, e.g. `nomination:submit`. */
  bucket: string;
  /** Maximum successful attempts inside the window. */
  limit: number;
  /** Window length in seconds. */
  windowSeconds: number;
};

export const RATE_LIMITS = {
  /** Requesting a verification code. Generous: a household or campus shares an
   *  address, and a creator's audience arrives through one network at once. */
  nominationCode: { bucket: 'nomination:code', limit: 20, windowSeconds: 60 * 60 },
  /** Entering a code. Tight, because guessing is the only reason to repeat. */
  nominationVerify: { bucket: 'nomination:verify', limit: 15, windowSeconds: 15 * 60 },
  signIn: { bucket: 'auth:sign-in', limit: 10, windowSeconds: 15 * 60 },
  register: { bucket: 'auth:register', limit: 5, windowSeconds: 60 * 60 },
  /** Asking for a reset link. Tight: the cost of abuse lands in someone
   *  else's inbox, and nobody needs five in a quarter of an hour. */
  passwordReset: { bucket: 'auth:password-reset', limit: 5, windowSeconds: 15 * 60 },
  /** Presenting a reset token. Guessing is the only reason to repeat. */
  passwordResetSubmit: { bucket: 'auth:password-reset-submit', limit: 10, windowSeconds: 15 * 60 },
  /** Joining a list. One address per person; the rest is a script. */
  subscribe: { bucket: 'list:subscribe', limit: 5, windowSeconds: 60 * 60 },
  /** Objecting to an unclaimed record. Generous — this is somebody exercising
   *  a right, and being rate-limited out of it would be the wrong failure. */
  objection: { bucket: 'record:objection', limit: 20, windowSeconds: 60 * 60 },
  report: { bucket: 'integrity:report', limit: 10, windowSeconds: 60 * 60 },
  verifyLookup: { bucket: 'verify:lookup', limit: 120, windowSeconds: 60 * 60 },
  creatorSearch: { bucket: 'creator:search', limit: 120, windowSeconds: 10 * 60 },
} satisfies Record<string, RateLimitRule>;

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

/**
 * In-process counters, used by the unit tests. The live limiter is durable and
 * lives in PostgreSQL, so limits survive a restart and are shared across
 * instances — an in-memory limiter behind a load balancer limits nothing.
 */
const memory = new Map<string, { count: number; expires: number }>();

export async function requesterIdentity(salt = ''): Promise<string> {
  try {
    const headerList = await headers();
    const forwarded = headerList.get('x-forwarded-for');
    const ip = forwarded?.split(',')[0]?.trim() ?? headerList.get('x-real-ip') ?? 'unknown';
    return hashIdentifier(`${ip}:${salt}`, signingSecret());
  } catch {
    return hashIdentifier(`anonymous:${salt}`, signingSecret());
  }
}

export async function consumeRateLimit(
  rule: RateLimitRule,
  identity: string,
): Promise<RateLimitResult> {
  const now = Date.now();
  const db = useMemoryLimiter ? null : prisma;

  if (!db) {
    const key = `${rule.bucket}:${identity}`;
    const entry = memory.get(key);
    if (!entry || entry.expires < now) {
      memory.set(key, { count: 1, expires: now + rule.windowSeconds * 1000 });
      return { allowed: true, remaining: rule.limit - 1, retryAfterSeconds: 0 };
    }
    entry.count += 1;
    const allowed = entry.count <= rule.limit;
    return {
      allowed,
      remaining: Math.max(0, rule.limit - entry.count),
      retryAfterSeconds: allowed ? 0 : Math.ceil((entry.expires - now) / 1000),
    };
  }

  const existing = await db.rateLimitCounter.findUnique({
    where: { bucket_identity: { bucket: rule.bucket, identity } },
  });

  if (!existing || existing.windowEndsAt.getTime() < now) {
    await db.rateLimitCounter.upsert({
      where: { bucket_identity: { bucket: rule.bucket, identity } },
      create: {
        bucket: rule.bucket,
        identity,
        count: 1,
        windowEndsAt: new Date(now + rule.windowSeconds * 1000),
      },
      update: { count: 1, windowEndsAt: new Date(now + rule.windowSeconds * 1000) },
    });
    return { allowed: true, remaining: rule.limit - 1, retryAfterSeconds: 0 };
  }

  const updated = await db.rateLimitCounter.update({
    where: { bucket_identity: { bucket: rule.bucket, identity } },
    data: { count: { increment: 1 } },
  });

  const allowed = updated.count <= rule.limit;
  return {
    allowed,
    remaining: Math.max(0, rule.limit - updated.count),
    retryAfterSeconds: allowed ? 0 : Math.ceil((existing.windowEndsAt.getTime() - now) / 1000),
  };
}

export async function enforceRateLimit(rule: RateLimitRule, salt = ''): Promise<RateLimitResult> {
  const identity = await requesterIdentity(salt);
  return consumeRateLimit(rule, identity);
}

/** Test seam: the unit suite exercises the limiter without a database. */
let useMemoryLimiter = process.env.NODE_ENV === 'test';

export function __resetMemoryLimiter() {
  memory.clear();
  useMemoryLimiter = true;
}
