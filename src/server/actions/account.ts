'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { randomToken, sha256, verifyPassword } from '@/lib/crypto';
import { siteUrl } from '@/lib/env';
import { assertSameOrigin, destroySession, getSession } from '@/lib/auth/session';
import { changeEmailSchema, closeAccountSchema } from '@/lib/validation/account';
import { fieldErrors } from '@/lib/validation/nomination';
import { recordAudit } from '@/server/audit';
import { prisma } from '@/server/db';
import {
  sendAccountClosed,
  sendEmailChangeConfirm,
  sendEmailChangeNotice,
} from '@/server/email/messages';
import { clearSuppression } from '@/server/email/suppression';

/**
 * What a person can do to their own account without asking PALMA.
 *
 * The line this draws is the one the whole institution rests on: an account is
 * yours and you may leave, but the *record* is PALMA's and it stays. Closing
 * an account unlinks it from a creator record; it does not delete the record,
 * the honours on it, or the fact that they were conferred — an award somebody
 * can erase by clicking a button was never an award.
 */

export type AccountState = {
  status: 'idle' | 'error' | 'success';
  message?: string;
  errors?: Record<string, string>;
};

/** 24 hours. A change of address is not urgent and the link is powerful. */
const EMAIL_CHANGE_TTL_MS = 24 * 60 * 60 * 1000;

export async function requestEmailChange(
  _previous: AccountState,
  formData: FormData,
): Promise<AccountState> {
  await assertSameOrigin();

  const session = await getSession();
  if (!session) return { status: 'error', message: 'Sign in again.' };

  const parsed = changeEmailSchema.safeParse({
    newEmail: formData.get('newEmail'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { status: 'error', message: 'Check the details.', errors: fieldErrors(parsed.error) };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, role: true, passwordHash: true },
  });
  if (!user) return { status: 'error', message: 'Sign in again.' };

  // The session proves possession of a browser. The password proves it is the
  // account holder sitting at it, which is the thing that matters here.
  if (!(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { status: 'error', message: 'That is not your password.' };
  }

  if (parsed.data.newEmail === user.email) {
    return { status: 'error', message: 'That is already your address.' };
  }

  const token = randomToken(32);

  await prisma.$transaction(async (tx) => {
    // One live request at a time, so an older email stops working.
    await tx.emailChangeRequest.updateMany({
      where: { userId: user.id, confirmedAt: null, cancelledAt: null },
      data: { cancelledAt: new Date() },
    });

    await tx.emailChangeRequest.create({
      data: {
        userId: user.id,
        newEmail: parsed.data.newEmail,
        tokenHash: sha256(token),
        expiresAt: new Date(Date.now() + EMAIL_CHANGE_TTL_MS),
      },
    });
  });

  // The new address is asked to confirm; the old one is told it was asked.
  // Losing an inbox should not silently lose somebody their account.
  await sendEmailChangeConfirm({
    to: parsed.data.newEmail,
    userId: user.id,
    url: `${siteUrl}/account/email/${token}`,
    currentEmail: user.email,
  });

  await sendEmailChangeNotice({
    to: user.email,
    userId: user.id,
    newEmail: parsed.data.newEmail,
  });

  await recordAudit({
    action: 'user.email_change_requested',
    entityType: 'User',
    entityId: user.id,
    actor: { id: user.id, role: user.role, label: user.email },
    summary: `Change of address requested to ${parsed.data.newEmail}`,
  });

  return {
    status: 'success',
    message: `Confirm it from ${parsed.data.newEmail}. Nothing changes until you do, and we have told ${user.email} that this was asked for.`,
  };
}

/** Spending the confirmation. Called from the page, which owns the token. */
export async function confirmEmailChange(
  token: string,
): Promise<{ ok: boolean; email?: string; reason?: string }> {
  const request = await prisma.emailChangeRequest.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: { select: { id: true, email: true, role: true } } },
  });

  const usable =
    request && !request.confirmedAt && !request.cancelledAt && request.expiresAt > new Date();

  if (!usable) return { ok: false, reason: 'expired' };

  // Somebody may have registered the address in the meantime.
  const taken = await prisma.user.findUnique({
    where: { email: request.newEmail },
    select: { id: true },
  });
  if (taken && taken.id !== request.user.id) {
    return { ok: false, reason: 'taken' };
  }

  const previous = request.user.email;

  await prisma.$transaction(async (tx) => {
    await tx.emailChangeRequest.update({
      where: { id: request.id },
      data: { confirmedAt: new Date() },
    });
    await tx.user.update({
      where: { id: request.user.id },
      // The new address has just proved itself; the old one's proof is gone.
      data: { email: request.newEmail, emailVerifiedAt: new Date() },
    });
  });

  // Confirming from the new address is proof it works.
  await clearSuppression(request.newEmail);

  await recordAudit({
    action: 'user.email_changed',
    entityType: 'User',
    entityId: request.user.id,
    actor: { id: request.user.id, role: request.user.role, label: request.newEmail },
    summary: `Address changed from ${previous}`,
    before: { email: previous },
    after: { email: request.newEmail },
  });

  return { ok: true, email: request.newEmail };
}

/**
 * Closing an account.
 *
 * Everything personal goes. The record does not, and the confirmation screen
 * says so before the button is pressed rather than in an email afterwards.
 */
export async function closeAccount(
  _previous: AccountState,
  formData: FormData,
): Promise<AccountState> {
  await assertSameOrigin();

  const session = await getSession();
  if (!session) return { status: 'error', message: 'Sign in again.' };

  const parsed = closeAccountSchema.safeParse({
    password: formData.get('password'),
    confirm: formData.get('confirm'),
  });

  if (!parsed.success) {
    return { status: 'error', message: 'Check the details.', errors: fieldErrors(parsed.error) };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      role: true,
      passwordHash: true,
      creator: { select: { id: true, displayName: true } },
    },
  });
  if (!user) return { status: 'error', message: 'Sign in again.' };

  if (!(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { status: 'error', message: 'That is not your password.' };
  }

  // An operator cannot close their own account from here. Removing the last
  // administrator by self-service is not a thing a system should allow, and
  // the route back is another administrator rather than a form.
  if (user.role !== 'creator') {
    return {
      status: 'error',
      message:
        'Accounts holding a PALMA role are closed by an administrator, not from here. Write to concierge@palmaawards.com and it will be done.',
    };
  }

  const heldRecord = Boolean(user.creator);

  // Sent before the account goes, because afterwards there is no Dossier to
  // write to and no address on file to write from.
  await sendAccountClosed({ to: user.email, userId: user.id, heldRecord });

  await prisma.$transaction(async (tx) => {
    if (user.creator) {
      // The record stays and becomes unclaimed — exactly the state it was in
      // before anybody claimed it, and claimable again by the right person.
      await tx.creator.update({
        where: { id: user.creator.id },
        data: { userId: null, isClaimed: false, referralEnabled: false },
      });
    }

    await tx.authSession.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    // Cascades take the Dossier, the preferences, the tokens and the sessions.
    // The audit log does not cascade: it records that this account existed.
    await tx.user.delete({ where: { id: user.id } });
  });

  await recordAudit({
    action: 'user.account_closed',
    entityType: 'User',
    entityId: user.id,
    actor: { label: user.email },
    summary: heldRecord
      ? `Account closed at the holder's request. ${user.creator?.displayName} is unclaimed again.`
      : 'Account closed at the holder’s request.',
  });

  await destroySession();
  redirect('/?closed=1');
}

/** Leaving one device signed in and evicting the rest. */
export async function revokeOtherSessions(): Promise<void> {
  await assertSameOrigin();
  const session = await getSession();
  if (!session) return;

  await prisma.authSession.updateMany({
    where: { userId: session.user.id, revokedAt: null, id: { not: session.sessionId } },
    data: { revokedAt: new Date() },
  });

  await recordAudit({
    action: 'user.sessions_revoked',
    entityType: 'User',
    entityId: session.user.id,
    actor: { id: session.user.id, role: session.user.role, label: session.user.email },
    summary: 'Every other session signed out at the holder’s request',
  });

  revalidatePath('/account');
}
