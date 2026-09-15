import 'server-only';
import { signingSecret } from '@/lib/env';
import { deriveCode, payloadDigest, signAchievement } from '@/lib/verification';
import { canReceiveHonour } from '@/domain/eligibility';
import { recordAudit, type AuditActor } from '@/server/audit';
import { requireDb } from '@/server/db';
import { sendHonourConferred, sendHonourRevoked } from '@/server/email/messages';

export type { HonourKind } from '@/domain/honours';
import type { HonourKind } from '@/domain/honours';

export type ConferInput = {
  candidacyId: string;
  kind: HonourKind;
  position?: number;
  citation?: string | null;
  actor: AuditActor;
};

export type ConferResult =
  { ok: true; honourId: string; code: string | null } | { ok: false; reason: string };

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

  const candidacy = await db.candidacy.findUnique({
    where: { id: input.candidacyId },
    include: {
      creator: {
        include: { verification: true, user: { select: { id: true, email: true } } },
      },
      category: true,
      awardYear: true,
    },
  });

  if (!candidacy) return { ok: false, reason: 'That candidacy does not exist.' };

  if (candidacy.status === 'ineligible' || candidacy.status === 'withdrawn') {
    return { ok: false, reason: 'That candidacy is not eligible for an honour.' };
  }

  const standing = canReceiveHonour({
    creatorIsSuspended: candidacy.creator.isSuspended,
    creatorVerificationStatus: candidacy.creator.verification?.status ?? 'unverified',
  });
  if (!standing.ok) return { ok: false, reason: standing.reason! };

  const existing = await db.honour.findUnique({
    where: {
      awardYearId_categoryId_creatorId_kind: {
        awardYearId: candidacy.awardYearId,
        categoryId: candidacy.categoryId,
        creatorId: candidacy.creatorId,
        kind: input.kind,
      },
    },
  });
  if (existing) return { ok: false, reason: 'That honour has already been conferred.' };

  const issuedAt = new Date();

  const result = await db.$transaction(async (tx) => {
    const honour = await tx.honour.create({
      data: {
        awardYearId: candidacy.awardYearId,
        categoryId: candidacy.categoryId,
        creatorId: candidacy.creatorId,
        candidacyId: candidacy.id,
        kind: input.kind,
        position: input.position ?? 0,
        citation: input.citation ?? null,
        announcedAt: issuedAt,
      },
    });

    await tx.candidacy.update({
      where: { id: candidacy.id },
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
      where: { id: candidacy.creatorId },
      data: { isPublished: true },
    });

    if (input.kind === 'shortlist') {
      return { honourId: honour.id, code: null as string | null };
    }

    const code = deriveCode(signingSecret(), candidacy.awardYear.year, honour.id);
    const payload = {
      code,
      creatorSlug: candidacy.creator.slug,
      creatorName: candidacy.creator.displayName,
      categoryName: candidacy.category.name,
      year: candidacy.awardYear.year,
      kind: input.kind,
      issuedAt: issuedAt.toISOString(),
    };

    const achievement = await tx.achievement.create({
      data: {
        honourId: honour.id,
        creatorId: candidacy.creatorId,
        code,
        kind: input.kind,
        year: candidacy.awardYear.year,
        categoryName: candidacy.category.name,
        creatorName: candidacy.creator.displayName,
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
    summary: `${candidacy.creator.displayName} — ${candidacy.category.name} (${candidacy.awardYear.year})`,
    after: { kind: input.kind, code: result.code, candidacyId: candidacy.id },
  });

  if (result.code) {
    await recordAudit({
      action: 'achievement.issued',
      entityType: 'Achievement',
      entityId: result.code,
      actor: input.actor,
      summary: `Verification record issued for ${candidacy.creator.displayName}`,
    });
  }

  // Telling the creator belongs here rather than at each call site: an honour
  // conferred by a route that forgot to send the email is an honour somebody
  // finds out about from a stranger. A record nobody holds has nobody to tell,
  // and special recognition is announced by the desk rather than by a template.
  if (candidacy.creator.user && input.kind !== 'special_recognition') {
    await sendHonourConferred({
      to: candidacy.creator.user.email,
      userId: candidacy.creator.user.id,
      creatorId: candidacy.creatorId,
      creatorName: candidacy.creator.displayName,
      kind: input.kind,
      categoryName: candidacy.category.name,
      year: candidacy.awardYear.year,
      verificationCode: result.code,
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

  // Never gated by a preference. Finding out from the public page that your
  // honour was revoked is not an acceptable way to be told.
  if (honour.creator.userId) {
    const holder = await db.user.findUnique({
      where: { id: honour.creator.userId },
      select: { id: true, email: true },
    });
    if (holder) {
      await sendHonourRevoked({
        to: holder.email,
        userId: holder.id,
        creatorId: honour.creatorId,
        creatorName: honour.creator.displayName,
        categoryName: honour.category.name,
        year: honour.awardYear.year,
        reason: input.reason,
      });
    }
  }

  return { ok: true };
}
