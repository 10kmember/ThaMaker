import 'server-only';
import { env } from '@/lib/env';

/**
 * The wire.
 *
 * A thin, dependency-free client over the Resend REST API rather than another
 * package in the tree. Nothing in the application calls this directly — every
 * message goes through `dispatch`, which records it first. This file's only
 * job is to hand a finished message to the provider and report honestly what
 * happened to it.
 */

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  /** Which voice is writing: `PALMA Concierge <concierge@palmaawards.com>`. */
  from?: string;
  /** Shown to the recipient's client as the address a reply would go to. */
  replyTo?: string;
  /**
   * Gazette mail only. Gmail and Outlook put a one-click unsubscribe beside the
   * sender when these headers are present, and a reader who can leave in one
   * click is a reader who does not report you as spam instead.
   */
  unsubscribeUrl?: string;
};

export type EmailResult =
  { ok: true; id: string | null; delivered: boolean } | { ok: false; error: string };

const ENDPOINT = 'https://api.resend.com/emails';

export async function sendEmail(message: EmailMessage): Promise<EmailResult> {
  if (!env.RESEND_API_KEY) {
    // Development without a key: the message is logged, never silently dropped,
    // and the caller is told it was not delivered.
    if (env.NODE_ENV === 'production') {
      return { ok: false, error: 'RESEND_API_KEY is not configured.' };
    }
    console.info(
      `\n[palma:email] (not sent — no RESEND_API_KEY)\n  from: ${message.from || env.EMAIL_FROM}\n  to: ${message.to}\n  subject: ${message.subject}\n  ${message.text.replace(/\n/g, '\n  ')}\n`,
    );
    return { ok: true, id: null, delivered: false };
  }

  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: message.from || env.EMAIL_FROM,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        ...(message.html ? { html: message.html } : {}),
        ...(message.replyTo ? { reply_to: message.replyTo } : {}),
        ...(message.unsubscribeUrl
          ? {
              headers: {
                'List-Unsubscribe': `<${message.unsubscribeUrl}>`,
                'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
              },
            }
          : {}),
      }),
      // A nomination should not hang on a slow provider.
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.error('[palma:email] Resend rejected the message', response.status, detail);
      return { ok: false, error: `The provider refused the message (${response.status}).` };
    }

    const body = (await response.json().catch(() => ({}))) as { id?: string };
    return { ok: true, id: body.id ?? null, delivered: true };
  } catch (error) {
    console.error('[palma:email] Resend request failed', error);
    return { ok: false, error: 'The provider could not be reached.' };
  }
}
