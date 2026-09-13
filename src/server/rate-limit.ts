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
  nominationSubmit: { bucket: 'nomination:submit', limit: 5, windowSeconds: 60 * 60 },
  signIn: { bucket: 'auth:sign-in', limit: 10, windowSeconds: 15 * 60 },
  register: { bucket: 'auth:register', limit: 5, windowSeconds: 60 * 60 },
  report: { bucket: 'integrity:report', limit: 10, windowSeconds: 60 * 60 },
  verifyLookup: { bucket: 'verify:lookup', limit: 120, windowSeconds: 60 * 60 },
} satisfies Record<string, RateLimitRule>;

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

/** In-process fallback so archive mode and tests still enforce limits. */
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
  const db = prisma;

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

/** Test seam — resets the in-process fallback between cases. */
export function __resetMemoryLimiter() {
  memory.clear();
}
