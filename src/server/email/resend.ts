import 'server-only';
import { env } from '@/lib/env';

/**
 * Transactional email through Resend.
 *
 * PALMA sends very little email — a verification code, and announcements a
 * person has asked for. This is a thin, dependency-free client over the Resend
 * REST API rather than another package in the tree.
 */

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  /** Shown to the recipient's client as the address a reply would go to. */
  replyTo?: string;
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
      `\n[palma:email] (not sent — no RESEND_API_KEY)\n  to: ${message.to}\n  subject: ${message.subject}\n  ${message.text.replace(/\n/g, '\n  ')}\n`,
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
        from: env.EMAIL_FROM,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        ...(message.html ? { html: message.html } : {}),
        ...(message.replyTo ? { reply_to: message.replyTo } : {}),
      }),
      // A nomination should not hang on a slow provider.
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.error('[palma:email] Resend rejected the message', response.status, detail);
      return { ok: false, error: 'The verification email could not be sent. Try again shortly.' };
    }

    const body = (await response.json().catch(() => ({}))) as { id?: string };
    return { ok: true, id: body.id ?? null, delivered: true };
  } catch (error) {
    console.error('[palma:email] Resend request failed', error);
    return { ok: false, error: 'The verification email could not be sent. Try again shortly.' };
  }
}
