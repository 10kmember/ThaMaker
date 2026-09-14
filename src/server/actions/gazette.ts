'use server';

import { revalidatePath } from 'next/cache';
import { randomToken, sha256 } from '@/lib/crypto';
import { siteUrl, signingSecret } from '@/lib/env';
import { readUnsubscribeToken, unsubscribeToken } from '@/lib/gazette-token';
import { assertSameOrigin, getSession } from '@/lib/auth/session';
import { authorise } from '@/lib/auth/guards';
import { gazetteIssueSchema, gazetteSubscribeSchema } from '@/lib/validation/gazette';
import { recordAudit } from '@/server/audit';
import { prisma } from '@/server/db';
import { RATE_LIMITS, enforceRateLimit } from '@/server/rate-limit';
import {
  sendGazetteConfirm,
  sendGazetteIssue,
  sendGazetteWelcome,
} from '@/server/email/gazette';

/**
 * The Gazette.
 *
 * PALMA's mailing list, open to anyone — most of the people who want to follow
 * a season are not creators and never will be, so this is keyed by address
 * rather than by account.
 *
 * Double opt-in, without exception. Single opt-in means anyone can sign up
 * anybody, which is how a mailing list becomes a way to harass someone with a
 * newsletter. Nothing is ever sent to an address that has not opened the
 * confirmation.
 */

export type GazetteState = { status: 'idle' | 'error' | 'success'; message?: string };

const SAME_ANSWER =
  'Check your inbox. If this address can join the Gazette, a confirmation is on its way — nothing is sent until you open it.';

export async function subscribeToGazette(
  _previous: GazetteState,
  formData: FormData,
): Promise<GazetteState> {
  await assertSameOrigin();

  const limit = await enforceRateLimit(RATE_LIMITS.gazette);
  if (!limit.allowed) {
    return { status: 'error', message: 'Too many requests from this connection. Try again later.' };
  }

  const parsed = gazetteSubscribeSchema.safeParse({
    email: formData.get('email'),
    source: formData.get('source') ?? 'site',
  });

  if (!parsed.success) {
    return { status: 'error', message: 'Enter a valid email address.' };
  }

  const email = parsed.data.email;
  const existing = await prisma.gazetteSubscription.findUnique({
    where: { email },
    select: { id: true, status: true },
  });

  // Already confirmed: say the same thing and send nothing. Re-confirming an
  // existing subscriber is a way to mail somebody who has not asked twice.
  if (existing?.status === 'confirmed') {
    return { status: 'success', message: SAME_ANSWER };
  }

  const token = randomToken(24);
  const tokenHash = sha256(token);

  if (existing) {
    await prisma.gazetteSubscription.update({
      where: { id: existing.id },
      data: { tokenHash, status: 'pending', source: parsed.data.source, unsubscribedAt: null },
    });
  } else {
    await prisma.gazetteSubscription.create({
      data: { email, tokenHash, source: parsed.data.source },
    });
  }

  await sendGazetteConfirm({ to: email, url: `${siteUrl}/gazette/confirm/${token}` });

  await recordAudit({
    action: 'gazette.subscribed',
    entityType: 'GazetteSubscription',
    entityId: email,
    summary: `Confirmation requested (${parsed.data.source})`,
  });

  return { status: 'success', message: SAME_ANSWER };
}

/** Opening the confirmation. Called from the page, which owns the token. */
export async function confirmGazette(
  token: string,
): Promise<{ ok: boolean; email?: string; reason?: string }> {
  const subscription = await prisma.gazetteSubscription.findUnique({
    where: { tokenHash: sha256(token) },
    select: { id: true, email: true, status: true },
  });

  if (!subscription) return { ok: false, reason: 'not_found' };
  if (subscription.status === 'confirmed') {
    return { ok: true, email: subscription.email };
  }

  await prisma.gazetteSubscription.update({
    where: { id: subscription.id },
    data: { status: 'confirmed', confirmedAt: new Date(), unsubscribedAt: null },
  });

  await sendGazetteWelcome({
    to: subscription.email,
    unsubscribeUrl: `${siteUrl}/gazette/leave/${unsubscribeToken(signingSecret(), subscription.id)}`,
  });

  await recordAudit({
    action: 'gazette.confirmed',
    entityType: 'GazetteSubscription',
    entityId: subscription.email,
    summary: 'Subscription confirmed',
  });

  return { ok: true, email: subscription.email };
}

/**
 * Leaving.
 *
 * One click, no sign-in, no "are you sure", no survey. The same token that
 * confirmed the subscription cancels it, which is why it is kept rather than
 * burned — a list you cannot leave from the email is a list people report as
 * spam instead.
 */
export async function leaveGazette(token: string): Promise<{ ok: boolean; email?: string }> {
  const id = readUnsubscribeToken(signingSecret(), token);
  if (!id) return { ok: false };

  const subscription = await prisma.gazetteSubscription.findUnique({
    where: { id },
    select: { id: true, email: true, status: true },
  });

  if (!subscription) return { ok: false };

  if (subscription.status !== 'unsubscribed') {
    await prisma.gazetteSubscription.update({
      where: { id: subscription.id },
      data: { status: 'unsubscribed', unsubscribedAt: new Date() },
    });

    await recordAudit({
      action: 'gazette.unsubscribed',
      entityType: 'GazetteSubscription',
      entityId: subscription.email,
      summary: 'Unsubscribed from the email footer',
    });
  }

  return { ok: true, email: subscription.email };
}

/**
 * Joining from inside the account, where the address is already known and
 * already proven — so this one skips the confirmation step honestly rather
 * than pretending a double opt-in happened.
 */
export async function setGazetteFromAccount(formData: FormData): Promise<void> {
  await assertSameOrigin();
  const session = await getSession();
  if (!session) return;

  const wanted = formData.get('subscribed') === 'on';
  const email = session.user.email;

  const existing = await prisma.gazetteSubscription.findUnique({
    where: { email },
    select: { id: true, status: true },
  });

  if (!wanted) {
    if (existing && existing.status !== 'unsubscribed') {
      await prisma.gazetteSubscription.update({
        where: { id: existing.id },
        data: { status: 'unsubscribed', unsubscribedAt: new Date() },
      });
      await recordAudit({
        action: 'gazette.unsubscribed',
        entityType: 'GazetteSubscription',
        entityId: email,
        actor: { id: session.user.id, role: session.user.role, label: email },
        summary: 'Left the Gazette from the portal',
      });
    }
    revalidatePath('/creator');
    return;
  }

  const token = randomToken(24);

  if (existing) {
    await prisma.gazetteSubscription.update({
      where: { id: existing.id },
      data: { status: 'confirmed', confirmedAt: new Date(), unsubscribedAt: null },
    });
  } else {
    await prisma.gazetteSubscription.create({
      data: {
        email,
        tokenHash: sha256(token),
        status: 'confirmed',
        confirmedAt: new Date(),
        source: 'portal',
      },
    });
  }

  await recordAudit({
    action: 'gazette.confirmed',
    entityType: 'GazetteSubscription',
    entityId: email,
    actor: { id: session.user.id, role: session.user.role, label: email },
    summary: 'Joined the Gazette from the portal (address already proven)',
  });

  revalidatePath('/creator');
}

/**
 * Sending an issue.
 *
 * Confirmed subscribers only, one at a time rather than one BCC — a single
 * message to hundreds of addresses leaks the whole list to every recipient,
 * and each subscriber's unsubscribe link must be their own.
 *
 * There is no scheduling and no draft state on purpose: an issue is written,
 * confirmed by typing SEND, and goes. A half-sent newsletter sitting in a
 * queue is a worse failure than a late one.
 */
export async function sendGazetteIssueAction(
  _previous: GazetteState,
  formData: FormData,
): Promise<GazetteState> {
  await assertSameOrigin();

  let session;
  try {
    session = await authorise('admin:send_gazette');
  } catch {
    return { status: 'error', message: 'You are not authorised to write to the Gazette.' };
  }

  const parsed = gazetteIssueSchema.safeParse({
    subject: formData.get('subject'),
    standfirst: formData.get('standfirst'),
    body: formData.get('body'),
    linkLabel: formData.get('linkLabel') ?? '',
    linkUrl: formData.get('linkUrl') ?? '',
    confirm: formData.get('confirm'),
  });

  if (!parsed.success) {
    return {
      status: 'error',
      message: parsed.error.issues[0]?.message ?? 'Check the issue.',
    };
  }

  const subscribers = await prisma.gazetteSubscription.findMany({
    where: { status: 'confirmed' },
    select: { email: true, id: true },
  });

  if (subscribers.length === 0) {
    return { status: 'error', message: 'Nobody has confirmed a subscription yet.' };
  }

  let sent = 0;
  let failed = 0;

  for (const subscriber of subscribers) {
    // Each subscriber gets their own unsubscribe link, derived from their id.
    const result = await sendGazetteIssue({
      to: subscriber.email,
      unsubscribeUrl: `${siteUrl}/gazette/leave/${unsubscribeToken(signingSecret(), subscriber.id)}`,
      subject: parsed.data.subject,
      standfirst: parsed.data.standfirst,
      body: parsed.data.body,
      linkLabel: parsed.data.linkLabel || null,
      linkUrl: parsed.data.linkUrl || null,
    });

    if (result.status === 'sent') sent += 1;
    else failed += 1;
  }

  await recordAudit({
    action: 'gazette.issue_sent',
    entityType: 'GazetteSubscription',
    entityId: 'issue',
    actor: { id: session.user.id, role: session.user.role, label: session.user.email },
    summary: `“${parsed.data.subject}” — ${sent} sent, ${failed} not delivered`,
  });

  revalidatePath('/admin/communications');

  return {
    status: 'success',
    message:
      failed === 0
        ? `Sent to ${sent} subscriber${sent === 1 ? '' : 's'}.`
        : `Sent to ${sent}; ${failed} did not go. The failures are listed above.`,
  };
}
