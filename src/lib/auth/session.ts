import 'server-only';
import { cookies, headers } from 'next/headers';
import { constantTimeEquals, hashIdentifier, hmac, randomToken, sha256 } from '@/lib/crypto';
import { signingSecret } from '@/lib/env';
import { prisma } from '@/server/db';
import type { Role } from './rbac';

export const SESSION_COOKIE = 'palma_session';
export const CSRF_COOKIE = 'palma_csrf';
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14; // 14 days

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  creatorId: string | null;
  creatorSlug: string | null;
  judgeId: string | null;
};

export type ActiveSession = {
  sessionId: string;
  user: SessionUser;
  csrfToken: string;
};

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  };
}

async function requestMeta() {
  const headerList = await headers();
  const forwarded = headerList.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() ?? headerList.get('x-real-ip') ?? '';
  return {
    userAgent: headerList.get('user-agent')?.slice(0, 255) ?? null,
    ipHash: ip ? hashIdentifier(ip, signingSecret()) : null,
  };
}

export function csrfTokenFor(csrfSecret: string): string {
  return hmac(signingSecret(), csrfSecret);
}

export async function createSession(userId: string): Promise<string> {
  const db = prisma;
  if (!db) throw new Error('Cannot create a session without a database.');

  const token = randomToken(32);
  const csrfSecret = randomToken(24);
  const meta = await requestMeta();

  const session = await db.authSession.create({
    data: {
      userId,
      tokenHash: sha256(token),
      csrfSecret,
      userAgent: meta.userAgent,
      ipHash: meta.ipHash,
      expiresAt: new Date(Date.now() + SESSION_TTL_SECONDS * 1000),
    },
  });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, cookieOptions(SESSION_TTL_SECONDS));
  // Readable by the client so forms can echo it back (double-submit pattern).
  jar.set(CSRF_COOKIE, csrfTokenFor(csrfSecret), {
    ...cookieOptions(SESSION_TTL_SECONDS),
    httpOnly: false,
  });

  await db.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });

  return session.id;
}

export async function getSession(): Promise<ActiveSession | null> {
  const db = prisma;
  if (!db) return null;

  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const record = await db.authSession.findUnique({
    where: { tokenHash: sha256(token) },
    include: {
      user: {
        include: {
          creator: { select: { id: true, slug: true } },
          judge: { select: { id: true } },
        },
      },
    },
  });

  if (!record || record.revokedAt || record.expiresAt.getTime() < Date.now()) return null;
  if (!record.user.isActive) return null;

  return {
    sessionId: record.id,
    csrfToken: csrfTokenFor(record.csrfSecret),
    user: {
      id: record.user.id,
      email: record.user.email,
      name: record.user.name,
      role: record.user.role as Role,
      creatorId: record.user.creator?.id ?? null,
      creatorSlug: record.user.creator?.slug ?? null,
      judgeId: record.user.judge?.id ?? null,
    },
  };
}

export async function destroySession(): Promise<void> {
  const db = prisma;
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;

  if (db && token) {
    await db.authSession
      .updateMany({ where: { tokenHash: sha256(token) }, data: { revokedAt: new Date() } })
      .catch(() => undefined);
  }

  jar.delete(SESSION_COOKIE);
  jar.delete(CSRF_COOKIE);
}

/**
 * Double-submit CSRF verification for anything that is not a Server Action.
 * Server Actions additionally carry Next.js' own origin checks.
 */
export async function assertCsrf(submitted: string | null | undefined): Promise<void> {
  const jar = await cookies();
  const cookieToken = jar.get(CSRF_COOKIE)?.value;
  if (!submitted || !cookieToken || !constantTimeEquals(submitted, cookieToken)) {
    throw new Error('This request could not be verified. Please reload the page and try again.');
  }
}

/** Rejects cross-origin form posts even where a CSRF cookie is absent. */
export async function assertSameOrigin(): Promise<void> {
  const headerList = await headers();
  const origin = headerList.get('origin');
  if (!origin) return;
  const host = headerList.get('host');
  if (!host) throw new Error('Malformed request.');
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new Error('Malformed request origin.');
  }
  if (originHost !== host) throw new Error('Cross-origin request refused.');
}
