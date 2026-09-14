'use server';

import { redirect } from 'next/navigation';
import { hashPassword, randomToken, sha256, verifyPassword } from '@/lib/crypto';
import { assertSameOrigin, destroySession, getSession } from '@/lib/auth/session';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '@/lib/validation/account';
import { fieldErrors } from '@/lib/validation/nomination';
import { siteUrl } from '@/lib/env';
import { recordAudit } from '@/server/audit';
import { prisma } from '@/server/db';
import { RATE_LIMITS, enforceRateLimit } from '@/server/rate-limit';
import { sendPasswordChanged, sendPasswordReset } from '@/server/email/messages';

/**
 * Getting back in.
 *
 * The thing this flow must never do is tell a stranger whether an address has
 * a PALMA account. So the answer is the same sentence every time, whether we
 * sent an email or did nothing at all — and the work happens on the other side
 * of that identical response.
 */

export type PasswordState = {
  status: 'idle' | 'error' | 'success';
  message?: string;
  errors?: Record<string, string>;
};

/** One hour. Long enough to find the email, short enough to matter. */
const RESET_TTL_MS = 60 * 60 * 1000;

const SAME_ANSWER =
  'If that address has a PALMA account, a reset link is on its way. It is valid for one hour.';

export async function requestPasswordReset(
  _previous: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  await assertSameOrigin();

  const limit = await enforceRateLimit(RATE_LIMITS.passwordReset);
  if (!limit.allowed) {
    // Even this is phrased not to confirm anything about the address.
    return {
      status: 'error',
      message: 'Too many requests from this connection. Try again shortly.',
    };
  }

  const parsed = forgotPasswordSchema.safeParse({ email: formData.get('email') });
  if (!parsed.success) {
    return { status: 'error', message: 'Enter a valid email address.' };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, email: true, isActive: true },
  });

  // A closed account gets the same answer as a missing one, and no email.
  if (user && user.isActive) {
    const token = randomToken(32);

    await prisma.$transaction(async (tx) => {
      // One live link at a time. A second request invalidates the first, so a
      // forwarded or intercepted older email stops working.
      await tx.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });

      await tx.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: sha256(token),
          expiresAt: new Date(Date.now() + RESET_TTL_MS),
        },
      });
    });

    await sendPasswordReset({
      to: user.email,
      userId: user.id,
      url: `${siteUrl}/reset/${token}`,
    });

    await recordAudit({
      action: 'user.password_reset_requested',
      entityType: 'User',
      entityId: user.id,
      actor: { id: user.id, role: 'creator', label: user.email },
      summary: 'A password reset link was issued.',
    });
  }

  return { status: 'success', message: SAME_ANSWER };
}

/**
 * Spending the token.
 *
 * Setting a new password revokes every session, which is the whole point: if
 * somebody else was signed in as this account, this is the moment they stop
 * being. The token is burned in the same transaction, so a link cannot be
 * replayed even by the person who legitimately used it.
 */
export async function resetPassword(
  _previous: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  await assertSameOrigin();

  const limit = await enforceRateLimit(RATE_LIMITS.passwordResetSubmit);
  if (!limit.allowed) {
    return { status: 'error', message: 'Too many attempts. Try again shortly.' };
  }

  const parsed = resetPasswordSchema.safeParse({
    token: formData.get('token'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  });

  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Check the password and try again.',
      errors: fieldErrors(parsed.error),
    };
  }

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: sha256(parsed.data.token) },
    include: { user: { select: { id: true, email: true, role: true, isActive: true } } },
  });

  const usable =
    record && !record.usedAt && record.expiresAt > new Date() && record.user.isActive;

  if (!usable) {
    return {
      status: 'error',
      message: 'That link has expired or has already been used. Ask for a new one.',
    };
  }

  const passwordHash = await hashPassword(parsed.data.password);

  await prisma.$transaction(async (tx) => {
    await tx.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });
    await tx.user.update({
      where: { id: record.user.id },
      data: { passwordHash },
    });
    await tx.authSession.updateMany({
      where: { userId: record.user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  });

  await sendPasswordChanged({
    to: record.user.email,
    userId: record.user.id,
    when: new Date(),
  });

  await recordAudit({
    action: 'user.password_reset',
    entityType: 'User',
    entityId: record.user.id,
    actor: { id: record.user.id, role: record.user.role, label: record.user.email },
    summary: 'Password reset from a link. Every session was revoked.',
  });

  return {
    status: 'success',
    message: 'Your password is set and every other session has been signed out. Sign in below.',
  };
}

/**
 * Changing it while signed in.
 *
 * The current password is required even though the session already proves
 * possession — a borrowed, unlocked laptop proves possession too, and this is
 * the one control that stops it becoming a stolen account.
 */
export async function changePassword(
  _previous: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  await assertSameOrigin();

  const session = await getSession();
  if (!session) return { status: 'error', message: 'Sign in again.' };

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get('currentPassword'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  });

  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Check the details.',
      errors: fieldErrors(parsed.error),
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, role: true, passwordHash: true },
  });
  if (!user) return { status: 'error', message: 'Sign in again.' };

  if (!(await verifyPassword(parsed.data.currentPassword, user.passwordHash))) {
    return { status: 'error', message: 'That is not your current password.' };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { passwordHash } });
    // Every session but this one. Changing a password should evict everybody
    // else without also evicting the person doing it.
    await tx.authSession.updateMany({
      where: { userId: user.id, revokedAt: null, id: { not: session.sessionId } },
      data: { revokedAt: now },
    });
  });

  await sendPasswordChanged({ to: user.email, userId: user.id, when: now });

  await recordAudit({
    action: 'user.password_changed',
    entityType: 'User',
    entityId: user.id,
    actor: { id: user.id, role: user.role, label: user.email },
    summary: 'Password changed from the account page. Other sessions revoked.',
  });

  return {
    status: 'success',
    message: 'Your password is changed, and every other session has been signed out.',
  };
}

/** Used by the reset page after a successful reset, to land on the right door. */
export async function signOutAfterReset(): Promise<void> {
  await destroySession();
  redirect('/creator');
}
