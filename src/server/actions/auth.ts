'use server';

import { redirect } from 'next/navigation';
import { hashPassword, verifyPassword } from '@/lib/crypto';
import { assertSameOrigin, createSession, destroySession, getSession } from '@/lib/auth/session';
import { registerSchema, signInSchema } from '@/lib/validation/account';
import { fieldErrors } from '@/lib/validation/nomination';
import { recordAudit } from '@/server/audit';
import { prisma } from '@/server/db';
import { RATE_LIMITS, enforceRateLimit } from '@/server/rate-limit';

export type AuthState = {
  status: 'idle' | 'error';
  message?: string;
  errors?: Record<string, string>;
};

/** Only relative, single-slash paths are honoured as post-sign-in targets. */
function safeNext(value: string | undefined | null): string {
  if (!value) return '/portal';
  if (!value.startsWith('/') || value.startsWith('//')) return '/portal';
  return value;
}

export async function signIn(_previous: AuthState, formData: FormData): Promise<AuthState> {
  await assertSameOrigin();

  const limit = await enforceRateLimit(RATE_LIMITS.signIn);
  if (!limit.allowed) {
    return { status: 'error', message: 'Too many attempts. Try again shortly.' };
  }

  const parsed = signInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    next: formData.get('next') ?? undefined,
  });

  if (!parsed.success) {
    return { status: 'error', message: 'Check your details.', errors: fieldErrors(parsed.error) };
  }

  const db = prisma;
  if (!db) {
    return {
      status: 'error',
      message: 'PALMA is running without a database, so accounts are unavailable.',
    };
  }

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });

  // One message for "no such account" and "wrong password": a sign-in form
  // should not tell an attacker which addresses are registered.
  const valid = user ? await verifyPassword(parsed.data.password, user.passwordHash) : false;
  if (!user || !valid || !user.isActive) {
    return { status: 'error', message: 'Those details do not match an active PALMA account.' };
  }

  await createSession(user.id);
  await recordAudit({
    action: 'user.signed_in',
    entityType: 'User',
    entityId: user.id,
    actor: { id: user.id, role: user.role, label: user.email },
  });

  redirect(safeNext(parsed.data.next));
}

export async function register(_previous: AuthState, formData: FormData): Promise<AuthState> {
  await assertSameOrigin();

  const limit = await enforceRateLimit(RATE_LIMITS.register);
  if (!limit.allowed) {
    return { status: 'error', message: 'Too many sign-ups from this connection. Try again later.' };
  }

  const parsed = registerSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
    acceptTerms: formData.get('acceptTerms') === 'on',
  });

  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Check your details.',
      errors: fieldErrors(parsed.error),
    };
  }

  const db = prisma;
  if (!db) {
    return {
      status: 'error',
      message: 'PALMA is running without a database, so accounts are unavailable.',
    };
  }

  const existing = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    // Do not confirm that the address is taken; tell them how to proceed either way.
    return {
      status: 'error',
      message: 'If that address can hold a PALMA account, sign in or reset your password instead.',
    };
  }

  const user = await db.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash: await hashPassword(parsed.data.password),
      role: 'creator',
      notificationPrefs: { create: {} },
    },
  });

  await createSession(user.id);
  await recordAudit({
    action: 'user.registered',
    entityType: 'User',
    entityId: user.id,
    actor: { id: user.id, role: user.role, label: user.email },
  });

  redirect('/portal');
}

export async function signOut(): Promise<void> {
  const session = await getSession();
  if (session) {
    await recordAudit({
      action: 'user.signed_out',
      entityType: 'User',
      entityId: session.user.id,
      actor: { id: session.user.id, role: session.user.role, label: session.user.email },
    });
  }
  await destroySession();
  redirect('/');
}
