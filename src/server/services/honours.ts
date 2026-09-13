import 'server-only';
import { signingSecret } from '@/lib/env';
import { deriveCode, payloadDigest, signAchievement } from '@/lib/verification';
import { canReceiveHonour } from '@/domain/eligibility';
import { recordAudit, type AuditActor } from '@/server/audit';
import { requireDb } from '@/server/db';

export type HonourKind = 'shortlist' | 'finalist' | 'winner' | 'special_recognition';

export type ConferInput = {
  nominationId: string;
  kind: HonourKind;
  position?: number;
  citation?: string | null;
  actor: AuditActor;
};

export type ConferResult =
  | { ok: true; honourId: string; code: string | null }
  | { ok: false; reason: string };

/**
 * Confer an honour.
 *
 * A finalist or winner honour also mints the permanent artefacts: an
 * Achievement (the citable record) and a signed VerificationRecord (the proof).
 * All three are written in one transaction — an honour without its proof would
 * be worse than no honour at all.
 */
export async function conferHonour(input: ConferInput): Promise<ConferResult> {
  const db = requireDb();

  const nomination = await db.nomination.findUnique({
    where: { id: input.nominationId },
    include: {
      creator: { include: { verification: true } },
      category: true,
      awardYear: true,
    },
  });

  if (!nomination) return { ok: false, reason: 'That nomination does not exist.' };

  if (nomination.status === 'ineligible' || nomination.status === 'withdrawn') {
    return { ok: false, reason: 'That nomination is not eligible for an honour.' };
  }

  const standing = canReceiveHonour({
    creatorIsSuspended: nomination.creator.isSuspended,
    creatorVerificationStatus: nomination.creator.verification?.status ?? 'unverified',
  });
  if (!standing.ok) return { ok: false, reason: standing.reason! };

  const existing = await db.honour.findUnique({
    where: {
      awardYearId_categoryId_creatorId_kind: {
        awardYearId: nomination.awardYearId,
        categoryId: nomination.categoryId,
        creatorId: nomination.creatorId,
        kind: input.kind,
      },
    },
  });
  if (existing) return { ok: false, reason: 'That honour has already been conferred.' };

  const issuedAt = new Date();

  const result = await db.$transaction(async (tx) => {
    const honour = await tx.honour.create({
      data: {
        awardYearId: nomination.awardYearId,
        categoryId: nomination.categoryId,
        creatorId: nomination.creatorId,
        nominationId: nomination.id,
        kind: input.kind,
        position: input.position ?? 0,
        citation: input.citation ?? null,
        announcedAt: issuedAt,
      },
    });

    await tx.nomination.update({
      where: { id: nomination.id },
      data: {
        status:
          input.kind === 'winner'
            ? 'winner'
            : input.kind === 'finalist'
              ? 'finalist'
              : 'shortlisted',
      },
    });

    // The creator profile becomes public the moment they hold an honour.
    await tx.creator.update({
      where: { id: nomination.creatorId },
      data: { isPublished: true },
    });

    if (input.kind === 'shortlist') {
      return { honourId: honour.id, code: null as string | null };
    }

    const code = deriveCode(signingSecret(), nomination.awardYear.year, honour.id);
    const payload = {
      code,
      creatorSlug: nomination.creator.slug,
      creatorName: nomination.creator.displayName,
      categoryName: nomination.category.name,
      year: nomination.awardYear.year,
      kind: input.kind,
      issuedAt: issuedAt.toISOString(),
    };

    const achievement = await tx.achievement.create({
      data: {
        honourId: honour.id,
        creatorId: nomination.creatorId,
        code,
        kind: input.kind,
        year: nomination.awardYear.year,
        categoryName: nomination.category.name,
        creatorName: nomination.creator.displayName,
        issuedAt,
      },
    });

    await tx.verificationRecord.create({
      data: {
        achievementId: achievement.id,
        code,
        signature: signAchievement(signingSecret(), payload),
        payloadDigest: payloadDigest(payload),
        issuedAt,
      },
    });

    return { honourId: honour.id, code };
  });

  await recordAudit({
    action:
      input.kind === 'winner'
        ? 'honour.winner_selected'
        : input.kind === 'finalist'
          ? 'honour.finalist_selected'
          : 'honour.shortlisted',
    entityType: 'Honour',
    entityId: result.honourId,
    actor: input.actor,
    summary: `${nomination.creator.displayName} — ${nomination.category.name} (${nomination.awardYear.year})`,
    after: { kind: input.kind, code: result.code, nominationId: nomination.id },
  });

  if (result.code) {
    await recordAudit({
      action: 'achievement.issued',
      entityType: 'Achievement',
      entityId: result.code,
      actor: input.actor,
      summary: `Verification record issued for ${nomination.creator.displayName}`,
    });
  }

  return { ok: true, honourId: result.honourId, code: result.code };
}

/**
 * Revoke an honour.
 *
 * Nothing is deleted. The honour, its achievement and its verification record
 * all remain, marked revoked — a verification page must be able to say "this
 * was revoked" rather than "this never existed".
 */
export async function revokeHonour(input: {
  honourId: string;
  reason: string;
  actor: AuditActor;
}): Promise<{ ok: boolean; reason?: string }> {
  const db = requireDb();

  const honour = await db.honour.findUnique({
    where: { id: input.honourId },
    include: { achievement: true, creator: true, category: true, awardYear: true },
  });

  if (!honour) return { ok: false, reason: 'That honour does not exist.' };
  if (honour.state === 'revoked') return { ok: false, reason: 'That honour is already revoked.' };
  if (input.reason.trim().length < 20) {
    return { ok: false, reason: 'A revocation must be explained in at least 20 characters.' };
  }

  const revokedAt = new Date();

  await db.$transaction(async (tx) => {
    await tx.honour.update({
      where: { id: honour.id },
      data: { state: 'revoked', revokedAt, revokedReason: input.reason },
    });

    if (honour.achievement) {
      await tx.achievement.update({
        where: { id: honour.achievement.id },
        data: { state: 'revoked', revokedAt },
      });
    }
  });

  await recordAudit({
    action: 'honour.revoked',
    entityType: 'Honour',
    entityId: honour.id,
    actor: input.actor,
    summary: `${honour.creator.displayName} — ${honour.category.name} (${honour.awardYear.year})`,
    before: { state: 'active' },
    after: { state: 'revoked', reason: input.reason },
  });

  return { ok: true };
}
