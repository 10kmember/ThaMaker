import 'server-only';
import { prisma } from '@/server/db';
import { TEMPLATE_LIST, type TemplateMeta } from '@/server/email/register';
import { MAILBOX_LIST, type Mailbox } from '@/server/email/addresses';
import { env } from '@/lib/env';

/**
 * What PALMA has said, and what it is able to say.
 *
 * An institution that cannot answer "did we tell them?" has not told them. The
 * delivery record exists for that question and this is what reads it.
 */

export type DeliveryRow = {
  id: string;
  template: string;
  templateName: string;
  from: string;
  to: string;
  subject: string;
  status: string;
  detail: string | null;
  createdAt: string;
  sentAt: string | null;
};

export type TemplateRow = TemplateMeta & {
  /** How many have gone out, ever. */
  sent: number;
  failed: number;
  suppressed: number;
  lastSentAt: string | null;
};

export type SuppressedRow = {
  id: string;
  email: string;
  reason: string;
  detail: string | null;
  createdAt: string;
};

export type CommunicationsOverview = {
  /** Is there a provider at all? Everything below is theatre without one. */
  provider: {
    configured: boolean;
    from: string;
    /** The domain PALMA writes as, which the provider has to have verified. */
    domain: string;
    /** Set while the real domain is still being verified. */
    sandboxFrom: string | null;
    /** Whether the provider can tell us what became of a message. */
    webhookConfigured: boolean;
  };
  /** Addresses PALMA has stopped writing to. */
  suppressed: SuppressedRow[];
  mailboxes: Mailbox[];
  totals: {
    sent: number;
    delivered: number;
    bounced: number;
    complained: number;
    failed: number;
    suppressed: number;
    queued: number;
  };
  /** Failures first — they are the only rows anybody needs to act on. */
  failures: DeliveryRow[];
  recent: DeliveryRow[];
  templates: TemplateRow[];
  gazette: {
    confirmed: number;
    pending: number;
    unsubscribed: number;
    lastIssueAt: string | null;
  };
};

function shape(row: {
  id: string;
  template: string;
  from: string;
  to: string;
  subject: string;
  status: string;
  detail: string | null;
  createdAt: Date;
  sentAt: Date | null;
}): DeliveryRow {
  return {
    id: row.id,
    template: row.template,
    templateName: TEMPLATE_LIST.find((entry) => entry.key === row.template)?.name ?? row.template,
    from: row.from,
    to: row.to,
    subject: row.subject,
    status: row.status,
    detail: row.detail,
    createdAt: row.createdAt.toISOString(),
    sentAt: row.sentAt?.toISOString() ?? null,
  };
}

export async function getCommunicationsOverview(): Promise<CommunicationsOverview> {
  const [
    byStatus,
    failures,
    recent,
    byTemplate,
    lastPerTemplate,
    gazetteCounts,
    lastIssue,
    suppressedRows,
  ] = await Promise.all([
    prisma.emailDelivery.groupBy({ by: ['status'], _count: { _all: true } }),
    // Bounces sit with failures: both mean somebody was not told.
    prisma.emailDelivery.findMany({
      where: { status: { in: ['failed', 'bounced'] } },
      orderBy: { createdAt: 'desc' },
      take: 25,
    }),
    prisma.emailDelivery.findMany({ orderBy: { createdAt: 'desc' }, take: 60 }),
    prisma.emailDelivery.groupBy({
      by: ['template', 'status'],
      _count: { _all: true },
    }),
    prisma.emailDelivery.groupBy({
      by: ['template'],
      where: { status: { in: ['sent', 'delivered'] } },
      _max: { sentAt: true },
    }),
    prisma.gazetteSubscription.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.emailDelivery.findFirst({
      where: { template: 'gazette_issue', status: { in: ['sent', 'delivered'] } },
      orderBy: { sentAt: 'desc' },
      select: { sentAt: true },
    }),
    prisma.suppressedAddress.findMany({
      where: { clearedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
  ]);

  const count = (rows: { status: string; _count: { _all: number } }[], status: string) =>
    rows.find((row) => row.status === status)?._count._all ?? 0;

  const templateCount = (key: string, status: string) =>
    byTemplate.find((row) => row.template === key && row.status === status)?._count._all ?? 0;

  const gazette = (status: string) =>
    gazetteCounts.find((row) => row.status === status)?._count._all ?? 0;

  return {
    provider: {
      configured: Boolean(env.RESEND_API_KEY),
      from: env.EMAIL_FROM,
      domain: env.EMAIL_FROM.match(/@([^>\s]+)/)?.[1] ?? 'palmaawards.com',
      sandboxFrom: env.EMAIL_SANDBOX_FROM ?? null,
      webhookConfigured: Boolean(env.RESEND_WEBHOOK_SECRET),
    },
    suppressed: suppressedRows.map((row) => ({
      id: row.id,
      email: row.email,
      reason: row.reason,
      detail: row.detail,
      createdAt: row.createdAt.toISOString(),
    })),
    mailboxes: MAILBOX_LIST,
    totals: {
      sent: count(byStatus, 'sent'),
      delivered: count(byStatus, 'delivered'),
      bounced: count(byStatus, 'bounced'),
      complained: count(byStatus, 'complained'),
      failed: count(byStatus, 'failed'),
      suppressed: count(byStatus, 'suppressed'),
      queued: count(byStatus, 'queued'),
    },
    failures: failures.map(shape),
    recent: recent.map(shape),
    templates: TEMPLATE_LIST.map((meta) => ({
      ...meta,
      sent: templateCount(meta.key, 'sent') + templateCount(meta.key, 'delivered'),
      failed: templateCount(meta.key, 'failed') + templateCount(meta.key, 'bounced'),
      suppressed: templateCount(meta.key, 'suppressed'),
      lastSentAt:
        lastPerTemplate.find((row) => row.template === meta.key)?._max.sentAt?.toISOString() ??
        null,
    })),
    gazette: {
      confirmed: gazette('confirmed'),
      pending: gazette('pending'),
      unsubscribed: gazette('unsubscribed'),
      lastIssueAt: lastIssue?.sentAt?.toISOString() ?? null,
    },
  };
}
