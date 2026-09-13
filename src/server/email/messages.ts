import 'server-only';
import { siteUrl } from '@/lib/env';
import { CODE_TTL_SECONDS } from '@/domain/verification-code';
import { sendEmail, type EmailResult } from './resend';

const MINUTES = Math.round(CODE_TTL_SECONDS / 60);

/** Plain, institutional, and impossible to mistake for marketing. */
function wrap(body: string, preheader: string): string {
  return `<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>PALMA</title></head>
<body style="margin:0;padding:0;background:#F4F0E8;">
<span style="display:none;opacity:0;visibility:hidden;height:0;width:0;overflow:hidden">${preheader}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F0E8;padding:40px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FBF9F4;border:1px solid #D8D3C9;">
<tr><td style="background:#161719;padding:28px 32px;">
  <div style="font-family:Georgia,'Times New Roman',serif;color:#F4F0E8;font-size:20px;letter-spacing:6px;">PALMA</div>
  <div style="font-family:Helvetica,Arial,sans-serif;color:#C9B58A;font-size:10px;letter-spacing:3px;text-transform:uppercase;padding-top:8px;">The Creator Honours</div>
</td></tr>
<tr><td style="padding:32px;font-family:Helvetica,Arial,sans-serif;color:#161719;font-size:15px;line-height:1.65;">
${body}
</td></tr>
<tr><td style="padding:20px 32px;border-top:1px solid #D8D3C9;font-family:Helvetica,Arial,sans-serif;color:#8C8478;font-size:12px;line-height:1.6;">
  PALMA — The Creator Honours. <a href="${siteUrl}" style="color:#4A5148;">palmaawards.com</a>
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

export async function sendNominationCode(input: {
  to: string;
  code: string;
  creatorName: string;
  categoryName: string;
}): Promise<EmailResult> {
  const text = [
    `Your PALMA verification code is ${input.code}.`,
    '',
    `It confirms your nomination of ${input.creatorName} for ${input.categoryName}.`,
    `The code expires in ${MINUTES} minutes and can be used once.`,
    '',
    'If you did not ask to nominate anyone, ignore this email — nothing has been recorded.',
  ].join('\n');

  const html = wrap(
    `<p style="margin:0 0 20px;">Enter this code to confirm your nomination of
      <strong>${escape(input.creatorName)}</strong> for ${escape(input.categoryName)}.</p>
     <p style="margin:0 0 20px;font-family:Georgia,serif;font-size:34px;letter-spacing:10px;color:#161719;">${input.code}</p>
     <p style="margin:0 0 20px;color:#8C8478;font-size:13px;">The code expires in ${MINUTES} minutes and can be used once.</p>
     <p style="margin:0;color:#8C8478;font-size:13px;">If you did not ask to nominate anyone, ignore this email — nothing has been recorded.</p>`,
    `${input.code} — your PALMA verification code`,
  );

  return sendEmail({
    to: input.to,
    subject: `${input.code} is your PALMA verification code`,
    text,
    html,
  });
}

export async function sendNominationReceipt(input: {
  to: string;
  creatorName: string;
  categoryName: string;
  reference: string;
  year: number;
}): Promise<EmailResult> {
  const text = [
    `Your nomination has been recorded.`,
    '',
    `${input.creatorName} — ${input.categoryName}, PALMA ${input.year}`,
    `Reference ${input.reference}`,
    '',
    'What happens next: PALMA screens every nomination, gathers the evidence itself, and an independent panel judges. Nomination numbers are not a leaderboard and do not decide the outcome.',
    '',
    `Follow the season at ${siteUrl}/awards/${input.year}`,
  ].join('\n');

  const html = wrap(
    `<p style="margin:0 0 20px;">Your nomination has been recorded.</p>
     <p style="margin:0 0 8px;font-family:Georgia,serif;font-size:24px;">${escape(input.creatorName)}</p>
     <p style="margin:0 0 20px;color:#8C8478;font-size:13px;text-transform:uppercase;letter-spacing:2px;">${escape(input.categoryName)} · PALMA ${input.year}</p>
     <p style="margin:0 0 20px;">PALMA screens every nomination, gathers the evidence itself, and an independent panel judges. Nomination numbers are not a leaderboard and do not decide the outcome.</p>
     <p style="margin:0;color:#8C8478;font-size:13px;">Reference ${input.reference}</p>`,
    `Nomination recorded — ${input.creatorName}`,
  );

  return sendEmail({
    to: input.to,
    subject: 'Your PALMA nomination has been recorded',
    text,
    html,
  });
}

function escape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
