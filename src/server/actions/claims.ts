'use server';

import { revalidatePath } from 'next/cache';
import { authorise } from '@/lib/auth/guards';
import { can } from '@/lib/auth/rbac';
import { assertSameOrigin } from '@/lib/auth/session';
import { randomToken, sha256 } from '@/lib/crypto';
import { approvalIsBlocked, isOpenClaim } from '@/domain/claim';
import { claimDecisionSchema, claimRequestSchema } from '@/lib/validation/claims';
import { fieldErrors } from '@/lib/validation/nomination';
import { recordAudit } from '@/server/audit';
import { requireDb } from '@/server/db';

export type ClaimState = {
  status: 'idle' | 'error' | 'success';
  message?: string;
  errors?: Record<string, string>;
};

function reference(prefix: string): string {
  return `${prefix}-${new Date().getUTCFullYear()}-${randomToken(4).toUpperCase().slice(0, 6)}`;
}

/**
 * Ask to control a PALMA record.
 *
 * This creates a request and nothing else. It does not link the account, does
 * not set isClaimed, and does not grant the creator role — an approval by a
 * person does all three, in one transaction, later. Claiming a record you do
 * not control should fail at review, not at the database.
 */
export async function requestProfileClaim(
  _previous: ClaimState,
  formData: FormData,
): Promise<ClaimState> {
  await assertSameOrigin();

  let session;
  try {
    session = await authorise('creator:claim_profile');
  } catch {
    return { status: 'error', message: 'Sign in to claim a profile.' };
  }

  const linkCount = Number(formData.get('linkCount') ?? 0);
  const links = Array.from({ length: Math.min(4, Math.max(0, linkCount)) }, (_, index) => ({
    label: String(formData.get(`linkLabel${index}`) ?? '').trim(),
    url: String(formData.get(`linkUrl${index}`) ?? '').trim(),
  })).filter((link) => link.label && link.url);

  const parsed = claimRequestSchema.safeParse({
    creator: formData.get('creator'),
    contactEmail: formData.get('contactEmail') || session.user.email,
    claimedIdentity: formData.get('claimedIdentity'),
    supportingNote: formData.get('supportingNote') ?? '',
    links,
    token: formData.get('token') ?? '',
  });

  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Check the details you have supplied.',
      errors: fieldErrors(parsed.error),
    };
  }

  const db = requireDb();
  const creator = await db.creator.findUnique({
    where: { slug: parsed.data.creator },
    select: { id: true, displayName: true, userId: true },
  });

  if (!creator) return { status: 'error', message: 'That profile does not exist.' };

  if (creator.userId) {
    return {
      status: 'error',
      message:
        creator.userId === session.user.id
          ? 'You already hold this profile.'
          : 'That profile is already held by an account. Write to PALMA if you believe that is wrong.',
    };
  }

  const existing = await db.creatorClaim.findFirst({
    where: {
      creatorId: creator.id,
      userId: session.user.id,
      status: { in: ['submitted', 'awaiting_information', 'escalated'] },
    },
    select: { id: true },
  });

  if (existing) {
    return {
      status: 'error',
      message: 'You already have a claim open on this profile. PALMA will come back to you.',
    };
  }

  // An invitation PALMA issued is consumed here, and is evidence at review.
  let invitationId: string | null = null;
  if (parsed.data.token) {
    const invitation = await db.claimInvitation.findUnique({
      where: { tokenHash: sha256(parsed.data.token) },
      select: { id: true, creatorId: true, expiresAt: true, usedAt: true, revokedAt: true },
    });

    const usable =
      invitation &&
      invitation.creatorId === creator.id &&
      !invitation.usedAt &&
      !invitation.revokedAt &&
      invitation.expiresAt.getTime() > Date.now();

    if (usable) invitationId = invitation.id;
  }

  const claim = await db.$transaction(async (tx) => {
    const created = await tx.creatorClaim.create({
      data: {
        reference: reference('CL'),
        creatorId: creator.id,
        userId: session.user.id,
        contactEmail: parsed.data.contactEmail,
        claimedIdentity: parsed.data.claimedIdentity,
        supportingNote: parsed.data.supportingNote || null,
        links: { create: parsed.data.links },
      },
    });

    if (invitationId) {
      await tx.claimInvitation.update({
        where: { id: invitationId },
        data: { usedAt: new Date() },
      });
    }

    return created;
  });

  await recordAudit({
    action: 'claim.requested',
    entityType: 'CreatorClaim',
    entityId: claim.id,
    actor: { id: session.user.id, role: session.user.role, label: session.user.email },
    summary: `Claim ${claim.reference} opened on ${creator.displayName}`,
  });

  revalidatePath('/portal');
  return {
    status: 'success',
    message: `Claim ${claim.reference} submitted. PALMA reviews claims by hand; you will hear from us by email.`,
  };
}

/**
 * Decide a claim.
 *
 * Approval is the only operation in PALMA that hands a record to a person, so
 * it is a single transaction: link the User, mark the record claimed, raise
 * the account to the creator role if it holds none, and close the claim. Every
 * branch writes an audit entry naming the reviewer.
 */
export async function decideClaim(_previous: ClaimState, formData: FormData): Promise<ClaimState> {
  await assertSameOrigin();

  const parsed = claimDecisionSchema.safeParse({
    claimId: formData.get('claimId'),
    decision: formData.get('decision'),
    note: formData.get('note') ?? '',
  });

  if (!parsed.success) return { status: 'error', message: 'Choose a decision.' };

  // Reviewing is one permission; deciding is another. An editor may read a
  // claim and recommend, but only a moderator or administrator settles it.
  const permission = parsed.data.decision === 'approve' ? 'claims:decide' : 'claims:review';

  let session;
  try {
    session = await authorise(permission);
  } catch {
    return { status: 'error', message: 'You are not authorised to make that decision.' };
  }

  if (
    (parsed.data.decision === 'reject' || parsed.data.decision === 'approve') &&
    !can(session.user.role, 'claims:decide')
  ) {
    return {
      status: 'error',
      message: 'Approving or rejecting a claim is a moderator or administrator decision.',
    };
  }

  const db = requireDb();
  const claim = await db.creatorClaim.findUnique({
    where: { id: parsed.data.claimId },
    include: {
      creator: { select: { id: true, slug: true, displayName: true, userId: true } },
      user: { select: { id: true, email: true, role: true } },
    },
  });

  if (!claim) return { status: 'error', message: 'That claim does not exist.' };
  if (!isOpenClaim(claim.status)) {
    return { status: 'error', message: 'That claim has already been settled.' };
  }

  const actor = { id: session.user.id, role: session.user.role, label: session.user.email };
  const now = new Date();

  if (parsed.data.decision === 'request_information') {
    await db.creatorClaim.update({
      where: { id: claim.id },
      data: {
        status: 'awaiting_information',
        informationRequestedAt: now,
        informationRequestedNote: parsed.data.note || null,
      },
    });

    await recordAudit({
      action: 'claim.information_requested',
      entityType: 'CreatorClaim',
      entityId: claim.id,
      actor,
      summary: `More information requested on ${claim.reference}`,
    });

    revalidatePath('/moderation/claims');
    return { status: 'success', message: 'Information requested. The claim stays open.' };
  }

  if (parsed.data.decision === 'escalate') {
    await db.creatorClaim.update({
      where: { id: claim.id },
      data: { status: 'escalated', escalatedAt: now, decisionNote: parsed.data.note || null },
    });

    await recordAudit({
      action: 'claim.escalated',
      entityType: 'CreatorClaim',
      entityId: claim.id,
      actor,
      summary: `${claim.reference} escalated`,
    });

    revalidatePath('/moderation/claims');
    return { status: 'success', message: 'Escalated. An administrator will take it from here.' };
  }

  if (parsed.data.decision === 'reject') {
    if (!parsed.data.note) {
      return { status: 'error', message: 'A rejection has to carry a reason.' };
    }

    await db.creatorClaim.update({
      where: { id: claim.id },
      data: {
        status: 'rejected',
        decidedAt: now,
        decidedById: session.user.id,
        decisionNote: parsed.data.note,
      },
    });

    await recordAudit({
      action: 'claim.rejected',
      entityType: 'CreatorClaim',
      entityId: claim.id,
      actor,
      summary: `${claim.reference} rejected on ${claim.creator.displayName}`,
      after: { reason: parsed.data.note },
    });

    revalidatePath('/moderation/claims');
    return { status: 'success', message: 'Claim rejected, with the reason recorded.' };
  }

  // Approval.
  const verification = await db.creatorVerification.findUnique({
    where: { creatorId: claim.creatorId },
    select: { status: true },
  });

  const blocked = approvalIsBlocked({
    recordUnclaimed: !claim.creator.userId,
    verificationComplete: verification?.status === 'verified',
    identityStatementSupplied: claim.claimedIdentity.length > 0,
    evidenceLinkCount: 0,
    invited: false,
    openReports: 0,
  });

  if (blocked) return { status: 'error', message: blocked };

  await db.$transaction(async (tx) => {
    await tx.creator.update({
      where: { id: claim.creatorId },
      data: { userId: claim.userId, isClaimed: true },
    });

    // The account is raised to creator only if it holds no role of its own.
    // A judge or a member of staff who also creates keeps the role they have.
    if (claim.user.role === 'visitor') {
      await tx.user.update({ where: { id: claim.userId }, data: { role: 'creator' } });
    }

    await tx.creatorClaim.update({
      where: { id: claim.id },
      data: {
        status: 'approved',
        decidedAt: now,
        decidedById: session.user.id,
        decisionNote: parsed.data.note || null,
      },
    });

    // Any other claim still open on this record is now moot.
    await tx.creatorClaim.updateMany({
      where: {
        creatorId: claim.creatorId,
        id: { not: claim.id },
        status: { in: ['submitted', 'awaiting_information', 'escalated'] },
      },
      data: {
        status: 'rejected',
        decidedAt: now,
        decidedById: session.user.id,
        decisionNote: 'Another claim on this record was approved.',
      },
    });
  });

  await recordAudit({
    action: 'claim.approved',
    entityType: 'CreatorClaim',
    entityId: claim.id,
    actor,
    summary: `${session.user.email} approved ${claim.user.email}'s claim on ${claim.creator.displayName}`,
    before: { userId: null, isClaimed: false },
    after: { userId: claim.userId, isClaimed: true },
  });

  revalidatePath('/moderation/claims');
  revalidatePath('/portal');
  // The public record says whether it is claimed, so it goes stale the moment
  // this succeeds.
  revalidatePath(`/creators/${claim.creator.slug}`);
  revalidatePath('/creators');
  return {
    status: 'success',
    message: `Approved. ${claim.creator.displayName} is now held by ${claim.user.email}.`,
  };
}

/**
 * Issue a claim invitation.
 *
 * PALMA often knows about a creator before the creator knows about PALMA. The
 * token is returned once, here, and stored only as a hash — the link is
 * knowledge, not a row somebody can read back out of the database.
 */
export async function issueClaimInvitation(
  _previous: ClaimState,
  formData: FormData,
): Promise<ClaimState> {
  await assertSameOrigin();

  let session;
  try {
    session = await authorise('editorial:edit_creator');
  } catch {
    return { status: 'error', message: 'You are not authorised to invite a claim.' };
  }

  const creatorId = String(formData.get('creatorId') ?? '');
  const db = requireDb();
  const creator = await db.creator.findUnique({
    where: { id: creatorId },
    select: { id: true, slug: true, displayName: true, userId: true },
  });

  if (!creator) return { status: 'error', message: 'That record does not exist.' };
  if (creator.userId) return { status: 'error', message: 'That record is already held.' };

  const token = randomToken(24);

  await db.claimInvitation.create({
    data: {
      creatorId: creator.id,
      tokenHash: sha256(token),
      issuedById: session.user.id,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    },
  });

  await recordAudit({
    action: 'claim.invitation_issued',
    entityType: 'Creator',
    entityId: creator.id,
    actor: { id: session.user.id, role: session.user.role, label: session.user.email },
    summary: `Claim invitation issued for ${creator.displayName}`,
  });

  revalidatePath(`/moderation/creators/${creator.slug}`);
  return {
    status: 'success',
    message: `/claim/${token}`,
  };
}
