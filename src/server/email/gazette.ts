import 'server-only';
import { siteUrl } from '@/lib/env';
import { dispatch } from './dispatch';
import {
  action,
  aside,
  escapeHtml as e,
  lede,
  paragraph,
  plain,
  plate,
  quiet,
  rule,
  shell,
} from './render';

/**
 * The Gazette.
 *
 * PALMA's letter to the people following the season. It is the only mail the
 * institution sends that nobody is owed — so it is the only mail that carries
 * a one-click way out in the header as well as the footer, and the only one
 * gated by a subscription rather than by a decision.
 */

export function sendGazetteConfirm(input: { to: string; url: string }) {
  return dispatch({
    template: 'gazette_confirm',
    to: input.to,
    subject: 'Confirm your PALMA Gazette subscription',
    html: shell({
      mailbox: 'laurels',
      preheader: 'One click, and nothing until then.',
      body: [
        lede('Confirm your subscription.'),
        paragraph(
          'Someone asked for the PALMA Gazette to come to this address. Nothing will be sent until you confirm it.',
        ),
        action({ href: input.url, label: 'Confirm the subscription' }),
        quiet(
          'If it was not you, ignore this. The address goes no further, and you will not hear from us again.',
        ),
      ].join('\n'),
    }),
    text: plain([
      'Confirm your PALMA Gazette subscription.',
      '',
      'Someone asked for the Gazette to come to this address. Nothing is sent until you confirm:',
      '',
      input.url,
      '',
      'If it was not you, ignore this. The address goes no further.',
    ]),
  });
}

export function sendGazetteWelcome(input: { to: string; unsubscribeUrl: string }) {
  return dispatch({
    template: 'gazette_welcome',
    to: input.to,
    unsubscribeUrl: input.unsubscribeUrl,
    subject: 'You are on the PALMA Gazette',
    html: shell({
      mailbox: 'laurels',
      preheader: 'What it is, how often, and how to leave.',
      unsubscribeUrl: input.unsubscribeUrl,
      body: [
        plate({ eyebrow: 'The Gazette', title: 'You are on the list' }),
        paragraph(
          'The Gazette is PALMA writing about the season: when nominations open and close, when a shortlist is read, when the panel confers, and what the institution is thinking while it does.',
        ),
        rule(),
        paragraph(
          'It comes when there is something to say — a handful of times a season, not weekly, and never because a schedule said so.',
        ),
        aside({
          title: 'What it will never be',
          body: 'A leaderboard, a plea for nominations, or a way for a sponsor to reach you. Nomination numbers are not published, and sponsorship buys no part of this letter.',
        }),
        action({ href: `${siteUrl}/journal`, label: 'Read the Journal', tone: 'olive' }),
      ].join('\n'),
    }),
    text: plain([
      'You are on the PALMA Gazette.',
      '',
      'The Gazette is PALMA writing about the season: when nominations open and close, when a shortlist is read, when the panel confers, and what the institution is thinking while it does.',
      '',
      'It comes when there is something to say — a handful of times a season.',
      '',
      'It will never be a leaderboard, a plea for nominations, or a way for a sponsor to reach you.',
      '',
      `Leave at any time: ${input.unsubscribeUrl}`,
    ]),
  });
}

export function sendGazetteIssue(input: {
  to: string;
  unsubscribeUrl: string;
  subject: string;
  standfirst: string;
  body: string;
  linkLabel?: string | null;
  linkUrl?: string | null;
}) {
  // The composer writes prose, not markup. Blank lines become paragraphs and
  // everything else is escaped — an issue must not be able to inject markup
  // into the letterhead, however much the desk is trusted.
  const paragraphs = input.body
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => paragraph(e(block).replace(/\n/g, '<br>')))
    .join('\n');

  return dispatch({
    template: 'gazette_issue',
    to: input.to,
    unsubscribeUrl: input.unsubscribeUrl,
    subject: input.subject,
    html: shell({
      mailbox: 'laurels',
      preheader: input.standfirst.slice(0, 160),
      unsubscribeUrl: input.unsubscribeUrl,
      body: [
        lede(e(input.subject)),
        paragraph(`<em>${e(input.standfirst)}</em>`),
        rule(),
        paragraphs,
        input.linkUrl && input.linkLabel
          ? action({ href: input.linkUrl, label: input.linkLabel, tone: 'olive' })
          : '',
      ]
        .filter(Boolean)
        .join('\n'),
    }),
    text: plain([
      input.subject,
      '',
      input.standfirst,
      '',
      input.body,
      input.linkUrl ? `\n${input.linkLabel ?? 'Read more'}: ${input.linkUrl}` : null,
      '',
      `Leave the Gazette: ${input.unsubscribeUrl}`,
    ]),
  });
}
