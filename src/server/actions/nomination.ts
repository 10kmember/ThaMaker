'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { acceptsNominations, type SeasonStage } from '@/domain/season';
import { assessIntegrity } from '@/domain/integrity';
import { checkNomination, nominatorKey } from '@/domain/nomination';
import { canResend, checkCodeState, expiryFrom, MAX_ATTEMPTS } from '@/domain/verification-code';
import { constantTimeEquals, hashIdentifier, sha256 } from '@/lib/crypto';
import { signingSecret } from '@/lib/env';
import {
  fieldErrors,
  nominationDraftSchema,
  submitNominationSchema,
  verifyCodeSchema,
} from '@/lib/validation/nomination';
import { getSession } from '@/lib/auth/session';
import { recordAudit } from '@/server/audit';
import { prisma } from '@/server/db';
import { sendNominationCode, sendNominationReceipt } from '@/server/email/messages';
import { RATE_LIMITS, enforceRateLimit } from '@/server/rate-limit';
import type { NominationState } from '@/lib/nomination-state';

/**
 * The nomination flow, in three server actions:
 *
 *   requestNominationCode → verifyNominationCode → submitNomination
 *
 * A draft row exists from the first step so the code can be bound to it, but
 * nothing counts until `submitNomination` commits it. The nomination is only
 * ever a signal: the count it increments is operational, and no part of the
 * judging path reads it.
 */

function sixDigitCode(): string {
  // Uniform over 000000–999999; leading zeros preserved.
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  return String(buffer[0]! % 1_000_000).padStart(6, '0');
}

async function requestMeta() {
  try {
    const headerList = await headers();
    const forwarded = headerList.get('x-forwarded-for');
    const ip = forwarded?.split(',')[0]?.trim() ?? headerList.get('x-real-ip') ?? '';
    return {
      ipHash: ip ? hashIdentifier(ip, signingSecret()) : null,
      userAgentHash: hashIdentifier(headerList.get('user-agent') ?? '', signingSecret()),
    };
  } catch {
    return { ipHash: null, userAgentHash: null };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1 — Details, then a code
// ─────────────────────────────────────────────────────────────────────────────

export async function requestNominationCode(
  _previous: NominationState,
  formData: FormData,
): Promise<NominationState> {
  const parsed = nominationDraftSchema.safeParse({
    creatorSlug: formData.get('creatorSlug'),
    categorySlug: formData.get('categorySlug'),
    reason: formData.get('reason'),
    email: formData.get('email'),
    referralSlug: formData.get('referralSlug') ?? '',
    website: formData.get('website') ?? '',
    formRenderedAt: formData.get('formRenderedAt') ?? undefined,
  });

  if (!parsed.success) {
    return {
      step: 'details',
      status: 'error',
      message: 'A couple of details need attention.',
      errors: fieldErrors(parsed.error),
    };
  }

  const input = parsed.data;

  const limit = await enforceRateLimit(RATE_LIMITS.nominationCode);
  if (!limit.allowed) {
    return {
      step: 'details',
      status: 'error',
      message: `Too many attempts from this connection. Try again in ${Math.ceil(limit.retryAfterSeconds / 60)} minutes.`,
    };
  }

  const db = prisma;
  if (!db) {
    return {
      step: 'details',
      status: 'error',
      message:
        'PALMA is running without a database and cannot accept nominations. This is a configuration problem, not your nomination.',
    };
  }

  const creator = await db.creator.findUnique({
    where: { slug: input.creatorSlug },
    include: { user: { select: { email: true } } },
  });

  if (!creator || !creator.isPublished) {
    return {
      step: 'details',
      status: 'error',
      message: 'That creator could not be found.',
      errors: { creatorSlug: 'Search for a creator and pick them from the list.' },
    };
  }

  const season = await db.awardYear.findFirst({
    where: { isCurrent: true },
    include: { categories: { where: { slug: input.categorySlug } } },
  });
  const category = season?.categories[0];

  if (!season || !category) {
    return {
      step: 'details',
      status: 'error',
      message: 'That category is not part of the current season.',
      errors: { categorySlug: 'Choose a category.' },
    };
  }

  const key = nominatorKey(input.email);

  const nominator =
    (await db.nominator.findUnique({ where: { emailKey: key } })) ??
    (await db.nominator.create({ data: { email: input.email, emailKey: key } }));

  const candidacy = await db.candidacy.findUnique({
    where: {
      awardYearId_categoryId_creatorId: {
        awardYearId: season.id,
        categoryId: category.id,
        creatorId: creator.id,
      },
    },
  });

  const existing = candidacy
    ? await db.nomination.findUnique({
        where: {
          nominatorId_candidacyId: { nominatorId: nominator.id, candidacyId: candidacy.id },
        },
      })
    : null;

  const check = checkNomination({
    nominatorEmail: input.email,
    creatorAccountEmails: creator.user?.email ? [creator.user.email] : [],
    alreadyNominated: existing?.status === 'counted',
    creatorIsSuspended: creator.isSuspended,
    categoryIsOpen: category.isOpen,
    seasonAcceptsNominations: acceptsNominations(season.stage as SeasonStage),
    nominatorIsBlocked: nominator.isBlocked,
    reasonLength: input.reason.length,
  });

  if (!check.ok) {
    return { step: 'details', status: 'error', message: check.message };
  }

  const recentByNominator = await db.nomination.count({
    where: { nominatorId: nominator.id, createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
  });

  const recentForCandidacy = candidacy
    ? await db.nomination.count({
        where: {
          candidacyId: candidacy.id,
          createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) },
        },
      })
    : 0;

  const integrity = assessIntegrity({
    honeypot: input.website,
    elapsedMs: input.formRenderedAt ? Date.now() - input.formRenderedAt : null,
    reason: input.reason,
    email: input.email,
    recentByNominator,
    recentForCandidacy,
  });

  if (integrity.reject) {
    // Deliberately unspecific: naming the signal teaches an abuser how to pass.
    return {
      step: 'details',
      status: 'error',
      message: 'This nomination could not be accepted. Contact PALMA if you believe that is wrong.',
    };
  }

  // Rate-limit fresh codes per address, not just per connection.
  const lastCode = await db.nominatorVerification.findFirst({
    where: { nominatorId: nominator.id },
    orderBy: { createdAt: 'desc' },
  });
  if (lastCode && !canResend(lastCode.createdAt)) {
    return {
      step: 'details',
      status: 'error',
      message:
        'A code was just sent to that address. Check your inbox, then try again in a minute.',
    };
  }

  const meta = await requestMeta();

  const candidacyRecord =
    candidacy ??
    (await db.candidacy.create({
      data: {
        reference: await nextCandidacyReference(season.year),
        awardYearId: season.id,
        categoryId: category.id,
        creatorId: creator.id,
      },
    }));

  const nomination = await db.nomination.upsert({
    where: {
      nominatorId_candidacyId: { nominatorId: nominator.id, candidacyId: candidacyRecord.id },
    },
    create: {
      reference: await nextNominationReference(season.year),
      candidacyId: candidacyRecord.id,
      nominatorId: nominator.id,
      source: input.referralSlug ? 'referral' : 'organic',
      referralSlug: input.referralSlug || null,
      reason: input.reason,
      status: 'pending_verification',
      ipHash: meta.ipHash,
      userAgentHash: meta.userAgentHash,
      integrityScore: integrity.score,
      integritySignals: integrity.signals,
    },
    update: {
      reason: input.reason,
      source: input.referralSlug ? 'referral' : 'organic',
      referralSlug: input.referralSlug || null,
      integrityScore: integrity.score,
      integritySignals: integrity.signals,
      ipHash: meta.ipHash,
      userAgentHash: meta.userAgentHash,
    },
  });

  const code = sixDigitCode();

  await db.nominatorVerification.create({
    data: {
      nominatorId: nominator.id,
      codeHash: sha256(`${nomination.id}:${code}`),
      expiresAt: expiryFrom(),
      ipHash: meta.ipHash,
    },
  });

  const sent = await sendNominationCode({
    to: input.email,
    code,
    creatorName: creator.displayName,
    categoryName: category.name,
  });

  if (!sent.ok) {
    return { step: 'details', status: 'error', message: sent.error };
  }

  return {
    step: 'verify',
    status: 'success',
    nominationId: nomination.id,
    email: input.email,
    creatorName: creator.displayName,
    categoryName: category.name,
    codeNotDelivered: !sent.delivered,
    message: `We have sent a six-digit code to ${input.email}.`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2 — The code
// ─────────────────────────────────────────────────────────────────────────────

export async function verifyNominationCode(
  previous: NominationState,
  formData: FormData,
): Promise<NominationState> {
  const parsed = verifyCodeSchema.safeParse({
    nominationId: formData.get('nominationId'),
    code: formData.get('code'),
  });

  if (!parsed.success) {
    return {
      ...previous,
      step: 'verify',
      status: 'error',
      message: parsed.error.issues[0]?.message ?? 'Enter the six-digit code.',
    };
  }

  const limit = await enforceRateLimit(RATE_LIMITS.nominationVerify);
  if (!limit.allowed) {
    return {
      ...previous,
      step: 'verify',
      status: 'error',
      message: 'Too many attempts. Try again later.',
    };
  }

  const db = prisma;
  if (!db) {
    return {
      ...previous,
      step: 'verify',
      status: 'error',
      message: 'Nominations are unavailable.',
    };
  }

  const nomination = await db.nomination.findUnique({
    where: { id: parsed.data.nominationId },
    include: { nominator: true },
  });

  if (!nomination) {
    return {
      ...previous,
      step: 'details',
      status: 'error',
      message: 'Start the nomination again.',
    };
  }

  if (nomination.status === 'counted') {
    return {
      ...previous,
      step: 'verify',
      status: 'error',
      message: 'This nomination is already recorded.',
    };
  }

  const verification = await db.nominatorVerification.findFirst({
    where: { nominatorId: nomination.nominatorId, consumedAt: null },
    orderBy: { createdAt: 'desc' },
  });

  if (!verification) {
    return {
      ...previous,
      step: 'verify',
      status: 'error',
      message: 'That code is no longer valid. Request a new one.',
    };
  }

  const state = checkCodeState(verification);
  if (!state.ok) {
    return { ...previous, step: 'verify', status: 'error', message: state.message };
  }

  const matches = constantTimeEquals(
    verification.codeHash,
    sha256(`${nomination.id}:${parsed.data.code}`),
  );

  if (!matches) {
    const updated = await db.nominatorVerification.update({
      where: { id: verification.id },
      data: { attempts: { increment: 1 } },
    });
    const left = Math.max(0, MAX_ATTEMPTS - updated.attempts);
    return {
      ...previous,
      step: 'verify',
      status: 'error',
      message:
        left > 0
          ? `That code is not right. ${left} attempts left.`
          : 'Too many attempts. Request a new code.',
    };
  }

  await db.$transaction([
    db.nominatorVerification.update({
      where: { id: verification.id },
      data: { consumedAt: new Date() },
    }),
    db.nominator.update({
      where: { id: nomination.nominatorId },
      data: { verifiedAt: nomination.nominator.verifiedAt ?? new Date() },
    }),
    db.nomination.update({ where: { id: nomination.id }, data: { verifiedAt: new Date() } }),
  ]);

  return {
    ...previous,
    step: 'verify',
    status: 'success',
    nominationId: nomination.id,
    message: 'Email verified. You can submit the nomination now.',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3 — Submit
// ─────────────────────────────────────────────────────────────────────────────

export async function submitNomination(
  previous: NominationState,
  formData: FormData,
): Promise<NominationState> {
  const parsed = submitNominationSchema.safeParse({ nominationId: formData.get('nominationId') });
  if (!parsed.success) {
    return { ...previous, status: 'error', message: 'Start the nomination again.' };
  }

  const db = prisma;
  if (!db) {
    return { ...previous, status: 'error', message: 'Nominations are unavailable.' };
  }

  const nomination = await db.nomination.findUnique({
    where: { id: parsed.data.nominationId },
    include: {
      nominator: true,
      candidacy: {
        include: { creator: true, category: true, awardYear: true },
      },
    },
  });

  if (!nomination) {
    return {
      ...previous,
      step: 'details',
      status: 'error',
      message: 'Start the nomination again.',
    };
  }

  // The button is disabled until verification, but the server decides.
  if (!nomination.verifiedAt) {
    return {
      ...previous,
      step: 'verify',
      status: 'error',
      message: 'Verify your email address before submitting.',
    };
  }

  if (nomination.status === 'counted') {
    return {
      ...previous,
      step: 'done',
      status: 'success',
      reference: nomination.reference,
      creatorName: nomination.candidacy.creator.displayName,
      categoryName: nomination.candidacy.category.name,
      message: 'This nomination is already recorded.',
    };
  }

  // The season can close between requesting a code and submitting.
  if (!acceptsNominations(nomination.candidacy.awardYear.stage as SeasonStage)) {
    return {
      ...previous,
      status: 'error',
      message: 'Nominations closed while you were verifying. Nothing has been recorded.',
    };
  }

  const now = new Date();

  await db.$transaction([
    db.nomination.update({
      where: { id: nomination.id },
      data: { status: 'counted', countedAt: now },
    }),
    db.candidacy.update({
      where: { id: nomination.candidacyId },
      data: {
        nominationCount: { increment: 1 },
        lastNominatedAt: now,
        firstNominatedAt: nomination.candidacy.firstNominatedAt ?? now,
        // Automation signals raise a flag for a moderator; they never block
        // the person in front of us, who is most likely a real supporter.
        integrityFlag: nomination.integrityScore >= 30 ? true : undefined,
      },
    }),
    db.nominator.update({
      where: { id: nomination.nominatorId },
      data: { lastNominatedAt: now },
    }),
  ]);

  const session = await getSession();

  await recordAudit({
    action: 'nomination.counted',
    entityType: 'Nomination',
    entityId: nomination.id,
    actor: session
      ? { id: session.user.id, role: session.user.role, label: session.user.email }
      : { label: 'nominator' },
    summary: `${nomination.candidacy.creator.displayName} nominated in ${nomination.candidacy.category.name}`,
    after: {
      reference: nomination.reference,
      candidacy: nomination.candidacy.reference,
      source: nomination.source,
      integrityScore: nomination.integrityScore,
      integritySignals: nomination.integritySignals,
    },
  });

  await sendNominationReceipt({
    to: nomination.nominator.email,
    creatorName: nomination.candidacy.creator.displayName,
    categoryName: nomination.candidacy.category.name,
    reference: nomination.reference,
    year: nomination.candidacy.awardYear.year,
  }).catch(() => undefined);

  revalidatePath('/admin/nominations');

  return {
    step: 'done',
    status: 'success',
    reference: nomination.reference,
    creatorName: nomination.candidacy.creator.displayName,
    categoryName: nomination.candidacy.category.name,
    message: 'Nomination recorded.',
  };
}

async function nextNominationReference(year: number): Promise<string> {
  const db = prisma!;
  const count = await db.nomination.count({ where: { candidacy: { awardYear: { year } } } });
  return `PN-${year}-${String(count + 1).padStart(6, '0')}`;
}

async function nextCandidacyReference(year: number): Promise<string> {
  const db = prisma!;
  const count = await db.candidacy.count({ where: { awardYear: { year } } });
  return `PC-${year}-${String(count + 1).padStart(4, '0')}`;
}
