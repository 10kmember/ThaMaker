'use server';

import { assertSameOrigin, getSession } from '@/lib/auth/session';
import { reportSchema } from '@/lib/validation/integrity';
import { recordAudit } from '@/server/audit';
import { prisma } from '@/server/db';
import { RATE_LIMITS, enforceRateLimit } from '@/server/rate-limit';

export type ReportState = { status: 'idle' | 'error' | 'success'; message?: string };

/**
 * Integrity reports. Open to anyone, signed in or not — a person being
 * impersonated may well not hold a PALMA account.
 */
export async function fileReport(_previous: ReportState, formData: FormData): Promise<ReportState> {
  await assertSameOrigin();

  const limit = await enforceRateLimit(RATE_LIMITS.report);
  if (!limit.allowed) {
    return { status: 'error', message: 'Too many reports from this connection. Try again later.' };
  }

  const parsed = reportSchema.safeParse({
    reason: formData.get('reason'),
    detail: formData.get('detail'),
    creatorSlug: formData.get('creatorSlug') ?? '',
    nominationReference: formData.get('nominationReference') ?? '',
    contactEmail: formData.get('contactEmail') ?? '',
    website: formData.get('website') ?? '',
  });

  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Check the details.' };
  }

  // Honeypot: accept silently rather than teaching an automated client anything.
  if (parsed.data.website) return { status: 'success', message: 'Report received.' };

  const db = prisma;

  const session = await getSession();
  const creator = parsed.data.creatorSlug
    ? await db.creator.findUnique({ where: { slug: parsed.data.creatorSlug } })
    : null;
  const candidacy = parsed.data.candidacyReference
    ? await db.candidacy.findUnique({ where: { reference: parsed.data.candidacyReference } })
    : null;

  const report = await db.report.create({
    data: {
      reason: parsed.data.reason as 'other',
      detail: parsed.data.detail,
      reporterId: session?.user.id ?? null,
      creatorId: creator?.id ?? null,
      candidacyId: candidacy?.id ?? null,
    },
  });

  await recordAudit({
    action: 'report.filed',
    entityType: 'Report',
    entityId: report.id,
    actor: session
      ? { id: session.user.id, role: session.user.role, label: session.user.email }
      : { label: parsed.data.contactEmail || 'anonymous' },
    summary: `Report filed: ${parsed.data.reason}`,
  });

  return {
    status: 'success',
    message:
      'Report received. A moderator will review it. If you left an email address we will tell you the outcome.',
  };
}
