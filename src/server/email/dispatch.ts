import 'server-only';
import { prisma } from '@/server/db';
import { sender, replyTo } from './addresses';
import { sendEmail } from './resend';
import { TEMPLATES, templateMeta, type TemplateKey } from './register';
import { isSuppressed } from './suppression';

/**
 * The one way PALMA sends anything.
 *
 * No action calls the provider directly. Everything goes through here, which
 * buys three things worth having:
 *
 *   1. A delivery record exists before the provider is called, so a message
 *      that failed is as visible in /admin/communications as one that arrived.
 *      An institution that cannot say whether it told someone has not told them.
 *   2. Preferences are enforced in one place rather than at fifteen call sites,
 *      where the fifteenth will forget.
 *   3. The Dossier entry is written whether or not the email went. An account
 *      that muted a channel, or whose address bounced, can still find out what
 *      happened by looking.
 *
 * This function does not throw. A conferred honour must not be rolled back
 * because a mail server was slow; the failure is recorded and the caller is
 * told, and it is the operator's problem rather than the creator's.
 */

export type DispatchInput = {
  template: TemplateKey;
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Who it concerns. Used for the preference check and the Dossier entry. */
  userId?: string | null;
  creatorId?: string | null;
  /** What the Dossier says, when the template declares one. */
  dossier?: { body: string; href?: string | null };
  /** Present only on Gazette mail. */
  unsubscribeUrl?: string;
};

export type DispatchResult = {
  status: 'sent' | 'failed' | 'suppressed';
  detail?: string;
};

export async function dispatch(input: DispatchInput): Promise<DispatchResult> {
  const meta = templateMeta(input.template);
  const from = sender(meta.mailbox);

  try {
    const suppression = await suppressedBecause(input.userId ?? null, input.template, input.to);

    const delivery = await prisma.emailDelivery.create({
      data: {
        template: meta.key,
        from,
        to: input.to,
        subject: input.subject,
        status: suppression ? 'suppressed' : 'queued',
        detail: suppression,
        userId: input.userId ?? null,
        creatorId: input.creatorId ?? null,
      },
      select: { id: true },
    });

    // The Dossier is written either way — that is the point of it.
    if (meta.dossier && input.userId && input.dossier) {
      await prisma.notification.create({
        data: {
          userId: input.userId,
          kind: meta.key,
          subject: input.subject,
          body: input.dossier.body,
          href: input.dossier.href ?? null,
          isImportant: meta.important ?? false,
          sentAt: suppression ? null : new Date(),
        },
      });
    }

    if (suppression) return { status: 'suppressed', detail: suppression };

    const result = await sendEmail({
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
      replyTo: replyTo(meta.mailbox),
      from,
      unsubscribeUrl: input.unsubscribeUrl,
    });

    if (!result.ok) {
      await prisma.emailDelivery.update({
        where: { id: delivery.id },
        data: { status: 'failed', detail: result.error },
      });
      return { status: 'failed', detail: result.error };
    }

    // No provider configured in this environment: the message was written and
    // logged but nobody received it, and the record must not claim otherwise.
    if (!result.delivered) {
      await prisma.emailDelivery.update({
        where: { id: delivery.id },
        data: {
          status: 'suppressed',
          detail: 'No mail provider is configured in this environment.',
        },
      });
      return { status: 'suppressed', detail: 'No mail provider is configured.' };
    }

    await prisma.emailDelivery.update({
      where: { id: delivery.id },
      data: {
        status: 'sent',
        providerId: result.id,
        sentAt: new Date(),
        // The `from` column records the voice PALMA wrote in. When the real
        // domain is not yet verified the envelope carried a different sender,
        // and the record should say so rather than imply the institution's own
        // address was on it.
        detail: result.sandboxed
          ? 'Sent through the sandbox sender: the real domain is not yet verified with the provider.'
          : null,
      },
    });

    return { status: 'sent' };
  } catch (error) {
    console.error('[palma:email] dispatch failed', meta.key, error);
    return { status: 'failed', detail: 'The message could not be recorded or sent.' };
  }
}

/**
 * Why this message is not going, or null if it is.
 *
 * Only news can be suppressed. A template gated `always` is never checked
 * against a preference, so there is no way to arrive here holding a security
 * notice and a muted switch.
 */
async function suppressedBecause(
  userId: string | null,
  template: TemplateKey,
  to: string,
): Promise<string | null> {
  // An address the provider has told us is dead stops everything, including
  // mail PALMA would otherwise owe the account. There is no point posting to a
  // letterbox that has been returning envelopes for a month, and continuing to
  // is how a sending domain's reputation is destroyed for everybody else. The
  // Dossier entry is still written, so the account can read it when they get
  // back in.
  const blocked = await isSuppressed(to);
  if (blocked) {
    return blocked.reason === 'complaint'
      ? 'The recipient reported PALMA mail as spam, so this address is suppressed.'
      : `The provider could not deliver to this address (${blocked.reason.replace('_', ' ')}), so it is suppressed.`;
  }

  const gate = TEMPLATES[template].gate;
  if (gate === 'always') return null;

  if (gate === 'gazette') {
    // Gazette mail is gated by the subscription itself, checked by its sender.
    return null;
  }

  if (!userId) return null;

  const prefs = await prisma.notificationPreference.findUnique({
    where: { userId },
    select: { [gate]: true } as Record<string, true>,
  });

  // No row means the defaults, and every default except the Journal is on.
  if (!prefs) return null;

  const wanted = (prefs as unknown as Record<string, boolean | undefined>)[gate];
  return wanted === false ? `The recipient has switched off ${gate} in their Dossier.` : null;
}
