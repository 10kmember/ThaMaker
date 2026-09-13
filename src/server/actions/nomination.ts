'use server';

import { headers } from 'next/headers';
import { assessEligibility } from '@/domain/eligibility';
import { assessIntegrity } from '@/domain/integrity';
import { acceptsNominations } from '@/domain/season';
import { isValidCountryCode } from '@/lib/countries';
import { hashIdentifier } from '@/lib/crypto';
import { signingSecret } from '@/lib/env';
import { fieldErrors, parseNominationFormData } from '@/lib/validation/nomination';
import { getSession } from '@/lib/auth/session';
import { recordAudit } from '@/server/audit';
import { prisma } from '@/server/db';
import { RATE_LIMITS, enforceRateLimit } from '@/server/rate-limit';
import { slugify } from '@/lib/utils';

export type NominationState = {
  status: 'idle' | 'error' | 'success';
  message?: string;
  reference?: string;
  errors?: Record<string, string>;
};

/**
 * Nomination submission.
 *
 * Order matters: rate limit, then validate, then integrity, then eligibility,
 * then write. Everything before the write is cheap and refusable; the write is
 * transactional and audited.
 */
export async function submitNomination(
  _previous: NominationState,
  formData: FormData,
): Promise<NominationState> {
  const limit = await enforceRateLimit(RATE_LIMITS.nominationSubmit);
  if (!limit.allowed) {
    return {
      status: 'error',
      message: `Too many nominations from this connection. Try again in ${Math.ceil(limit.retryAfterSeconds / 60)} minutes.`,
    };
  }

  const parsed = parseNominationFormData(formData);
  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Some details need attention before this nomination can be submitted.',
      errors: fieldErrors(parsed.error),
    };
  }

  const input = parsed.data;

  if (!isValidCountryCode(input.creatorCountry)) {
    return {
      status: 'error',
      message: 'Select the country the creator works from.',
      errors: { creatorCountry: 'Select a valid country.' },
    };
  }

  const integrity = assessIntegrity({
    honeypot: input.website,
    elapsedMs: input.formRenderedAt ? Date.now() - input.formRenderedAt : null,
    statement: input.statement,
    evidenceUrls: input.evidence.map((item) => item.url),
    nominatorEmail: input.nominatorEmail,
    recentSubmissions: RATE_LIMITS.nominationSubmit.limit - limit.remaining - 1,
  });

  if (integrity.reject) {
    // Deliberately unspecific: naming the signal teaches an abuser how to pass.
    return {
      status: 'error',
      message: 'This nomination could not be accepted. Please contact PALMA if you believe this is an error.',
    };
  }

  const db = prisma;
  if (!db) {
    return {
      status: 'error',
      message:
        'PALMA is running without a database and cannot accept nominations. This is a configuration problem, not your nomination.',
    };
  }

  const season = await db.awardYear.findUnique({
    where: { year: input.awardYear },
    include: { categories: { where: { slug: input.categorySlug } } },
  });

  const category = season?.categories[0];
  if (!season || !category) {
    return { status: 'error', message: 'That category is not part of the current season.' };
  }

  if (!acceptsNominations(season.stage)) {
    return { status: 'error', message: 'Nominations are not open for this season.' };
  }

  const session = await getSession();
  const slug = input.creatorSlug ?? slugify(input.creatorName);

  const creator =
    (await db.creator.findUnique({ where: { slug }, include: { verification: true } })) ??
    (await db.creator.create({
      data: {
        slug: await uniqueSlug(slug),
        displayName: input.creatorName,
        countryCode: input.creatorCountry,
        websiteUrl: input.creatorProfileUrl || null,
        isPublished: false,
        isClaimed: false,
      },
      include: { verification: true },
    }));

  const existing = await db.nomination.findFirst({
    where: { awardYearId: season.id, categoryId: category.id, creatorId: creator.id },
    select: { id: true },
  });

  const eligibility = assessEligibility({
    stage: season.stage,
    categoryIsOpen: category.isOpen,
    creatorIsSuspended: creator.isSuspended,
    creatorVerificationStatus: creator.verification?.status ?? 'unverified',
    ageConfirmed: input.ageConfirmed,
    eligibilityConfirmed: input.eligibilityConfirmed,
    contentPolicyConfirmed: input.contentPolicyConfirmed,
    hasExistingNomination: Boolean(existing),
    evidenceCount: input.evidence.length,
    statementLength: input.statement.length,
  });

  if (!eligibility.eligible) {
    return {
      status: 'error',
      message: eligibility.findings.find((finding) => finding.severity === 'blocking')!.message,
    };
  }

  const headerList = await headers();
  const forwarded = headerList.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() ?? '';
  const ipHash = ip ? hashIdentifier(ip, signingSecret()) : null;

  const reference = await nextReference(season.year);

  const nomination = await db.$transaction(async (tx) => {
    const created = await tx.nomination.create({
      data: {
        reference,
        awardYearId: season.id,
        categoryId: category.id,
        creatorId: creator.id,
        submittedById: session?.user.id ?? null,
        source: input.source,
        // Every accepted nomination is reviewed by a person before judging.
        status: 'under_review',
        statement: input.statement,
        nominatorName: input.nominatorName || null,
        nominatorEmail: input.nominatorEmail,
        nominatorRelation: input.nominatorRelation || null,
        eligibilityConfirmed: input.eligibilityConfirmed,
        contentPolicyConfirmed: input.contentPolicyConfirmed,
        ageConfirmed: input.ageConfirmed,
        integrityScore: integrity.score,
        ipHash,
        submittedAt: new Date(),
      },
    });

    await tx.nominationEvidence.createMany({
      data: input.evidence.map((item) => ({
        nominationId: created.id,
        kind: item.kind,
        label: item.label,
        url: item.url,
        note: item.note || null,
        isExternal: true,
      })),
    });

    return created;
  });

  await recordAudit({
    action: 'nomination.submitted',
    entityType: 'Nomination',
    entityId: nomination.id,
    actor: session
      ? { id: session.user.id, role: session.user.role, label: session.user.email }
      : { label: input.nominatorEmail },
    summary: `${creator.displayName} nominated in ${category.name} (${season.year})`,
    after: {
      reference,
      category: category.slug,
      source: input.source,
      integrityScore: integrity.score,
      integritySignals: integrity.signals,
      requiresReview: eligibility.requiresReview || integrity.flagForReview,
    },
  });

  return {
    status: 'success',
    reference,
    message: 'Nomination received.',
  };
}

async function uniqueSlug(base: string): Promise<string> {
  const db = prisma!;
  let candidate = base;
  let suffix = 2;
  while (await db.creator.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

/** References are human-quotable and unique per season: PN-2027-000481. */
async function nextReference(year: number): Promise<string> {
  const db = prisma!;
  const count = await db.nomination.count({ where: { awardYear: { year } } });
  return `PN-${year}-${String(count + 1).padStart(6, '0')}`;
}
