'use server';

import { revalidatePath } from 'next/cache';
import { authorise } from '@/lib/auth/guards';
import { assertSameOrigin } from '@/lib/auth/session';
import { randomToken, sha256 } from '@/lib/crypto';
import { closureIsBlocked, caseReference } from '@/domain/verification-case';
import {
  creatorRecordSchema,
  internalNoteSchema,
  verificationCaseSchema,
  verificationDecisionSchema,
} from '@/lib/validation/claims';
import { fieldErrors } from '@/lib/validation/nomination';
import { recordAudit } from '@/server/audit';
import { requireDb } from '@/server/db';
import { slugify } from '@/lib/utils';

export type OperationsState = {
  status: 'idle' | 'error' | 'success';
  message?: string;
  errors?: Record<string, string>;
};

/**
 * Create or enrich a creator record.
 *
 * PALMA writes records before creators claim them — that is how the archive
 * gets ahead of the industry rather than waiting on it. Everything set here is
 * *public* information. Anything a member of staff wants to say privately goes
 * in an internal note, which is a different table with a different audience.
 */
export async function saveCreatorRecord(
  _previous: OperationsState,
  formData: FormData,
): Promise<OperationsState> {
  await assertSameOrigin();

  const creatorId = String(formData.get('creatorId') ?? '').trim();
  const permission = creatorId ? 'editorial:edit_creator' : 'editorial:create_creator';

  let session;
  try {
    session = await authorise(permission);
  } catch {
    return { status: 'error', message: 'You are not authorised to change creator records.' };
  }

  const parsed = creatorRecordSchema.safeParse({
    creatorId,
    displayName: formData.get('displayName'),
    countryCode: formData.get('countryCode'),
    city: formData.get('city') ?? '',
    headline: formData.get('headline') ?? '',
    biography: formData.get('biography') ?? '',
    websiteUrl: formData.get('websiteUrl') ?? '',
    isPublished: formData.get('isPublished') === 'on',
  });

  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Check the record.',
      errors: fieldErrors(parsed.error),
    };
  }

  const db = requireDb();
  const data = {
    displayName: parsed.data.displayName,
    countryCode: parsed.data.countryCode,
    city: parsed.data.city || null,
    headline: parsed.data.headline || null,
    biography: parsed.data.biography || null,
    websiteUrl: parsed.data.websiteUrl || null,
    isPublished: parsed.data.isPublished,
  };

  if (creatorId) {
    const before = await db.creator.findUnique({
      where: { id: creatorId },
      select: {
        slug: true,
        displayName: true,
        countryCode: true,
        city: true,
        headline: true,
        biography: true,
        websiteUrl: true,
        isPublished: true,
      },
    });

    if (!before) return { status: 'error', message: 'That record does not exist.' };

    await db.creator.update({ where: { id: creatorId }, data });

    await recordAudit({
      action: 'creator.record_updated',
      entityType: 'Creator',
      entityId: creatorId,
      actor: { id: session.user.id, role: session.user.role, label: session.user.email },
      summary: `${before.displayName} updated`,
      before,
      after: data,
    });

    revalidatePath(`/creators/${before.slug}`);
    revalidatePath(`/moderation/creators/${before.slug}`);
    return { status: 'success', message: 'Record updated. The change is in the audit log.' };
  }

  // A new record needs a slug that does not collide with an existing one.
  const base = slugify(parsed.data.displayName);
  let slug = base;
  for (let attempt = 2; await db.creator.findUnique({ where: { slug } }); attempt += 1) {
    slug = `${base}-${attempt}`;
  }

  const created = await db.creator.create({ data: { ...data, slug } });

  await recordAudit({
    action: 'creator.record_created',
    entityType: 'Creator',
    entityId: created.id,
    actor: { id: session.user.id, role: session.user.role, label: session.user.email },
    summary: `${created.displayName} created as an unclaimed record`,
    after: data,
  });

  revalidatePath('/moderation/creators');
  return { status: 'success', message: `Created ${created.displayName}, unclaimed.` };
}

/** Staff-only working notes. Never public, never shown to the creator. */
export async function addInternalNote(
  _previous: OperationsState,
  formData: FormData,
): Promise<OperationsState> {
  await assertSameOrigin();

  let session;
  try {
    session = await authorise('editorial:write_internal_note');
  } catch {
    return { status: 'error', message: 'You are not authorised to write internal notes.' };
  }

  const parsed = internalNoteSchema.safeParse({
    creatorId: formData.get('creatorId'),
    body: formData.get('body'),
  });

  if (!parsed.success) return { status: 'error', message: 'Write the note.' };

  const db = requireDb();
  const creator = await db.creator.findUnique({
    where: { id: parsed.data.creatorId },
    select: { id: true, slug: true, displayName: true },
  });

  if (!creator) return { status: 'error', message: 'That record does not exist.' };

  await db.creatorNote.create({
    data: { creatorId: creator.id, authorId: session.user.id, body: parsed.data.body },
  });

  await recordAudit({
    action: 'creator.internal_note_added',
    entityType: 'Creator',
    entityId: creator.id,
    actor: { id: session.user.id, role: session.user.role, label: session.user.email },
    summary: `Internal note added to ${creator.displayName}`,
  });

  revalidatePath(`/moderation/creators/${creator.slug}`);
  return { status: 'success', message: 'Note added. Staff only — it is never published.' };
}

/** Open a manual age-assurance case. */
export async function openVerificationCase(
  _previous: OperationsState,
  formData: FormData,
): Promise<OperationsState> {
  await assertSameOrigin();

  let session;
  try {
    session = await authorise('verification:review_manual');
  } catch {
    return { status: 'error', message: 'You are not authorised to open verification cases.' };
  }

  const parsed = verificationCaseSchema.safeParse({
    creatorId: formData.get('creatorId'),
    reason: formData.get('reason'),
    mediaReceived: formData.get('mediaReceived') === 'on',
  });

  if (!parsed.success) return { status: 'error', message: 'Choose why this needs a person.' };

  const db = requireDb();
  const creator = await db.creator.findUnique({
    where: { id: parsed.data.creatorId },
    select: { id: true, displayName: true },
  });

  if (!creator) return { status: 'error', message: 'That record does not exist.' };

  const year = new Date().getUTCFullYear();
  const sequence = (await db.verificationCase.count()) + 1;

  const opened = await db.verificationCase.create({
    data: {
      reference: caseReference(year, sequence),
      creatorId: creator.id,
      reason: parsed.data.reason,
      mediaReceivedAt: parsed.data.mediaReceived ? new Date() : null,
    },
  });

  await recordAudit({
    action: 'verification.case_opened',
    entityType: 'VerificationCase',
    entityId: opened.id,
    actor: { id: session.user.id, role: session.user.role, label: session.user.email },
    summary: `${opened.reference} opened for ${creator.displayName}`,
    after: { reason: parsed.data.reason, mediaReceived: parsed.data.mediaReceived },
  });

  revalidatePath('/moderation/verification');
  return { status: 'success', message: `Opened ${opened.reference}.` };
}

/**
 * Decide a verification case.
 *
 * What PALMA keeps is a status, a provider reference and a result hash. The
 * documents, if any were ever received, are destroyed as part of closing —
 * and the case cannot be closed while they are still held, so nothing is left
 * sitting in a workspace with no prompt to remove it.
 */
export async function decideVerificationCase(
  _previous: OperationsState,
  formData: FormData,
): Promise<OperationsState> {
  await assertSameOrigin();

  let session;
  try {
    session = await authorise('verification:review_manual');
  } catch {
    return { status: 'error', message: 'You are not authorised to decide verification cases.' };
  }

  const parsed = verificationDecisionSchema.safeParse({
    caseId: formData.get('caseId'),
    outcome: formData.get('outcome'),
    providerReference: formData.get('providerReference') ?? '',
    note: formData.get('note') ?? '',
    mediaDeleted: formData.get('mediaDeleted') === 'on',
  });

  if (!parsed.success) return { status: 'error', message: 'Choose an outcome.' };

  const db = requireDb();
  const record = await db.verificationCase.findUnique({
    where: { id: parsed.data.caseId },
    include: { creator: { select: { id: true, slug: true, displayName: true } } },
  });

  if (!record) return { status: 'error', message: 'That case does not exist.' };
  if (record.decidedAt) return { status: 'error', message: 'That case is already decided.' };

  const actor = { id: session.user.id, role: session.user.role, label: session.user.email };
  const now = new Date();

  if (parsed.data.outcome === 'request_information') {
    await db.verificationCase.update({
      where: { id: record.id },
      data: { status: 'awaiting_information', decisionNote: parsed.data.note || null },
    });

    revalidatePath('/moderation/verification');
    return { status: 'success', message: 'Information requested. The case stays open.' };
  }

  // Narrowed above: 'request_information' has already returned.
  const outcome: 'verified' | 'refused' | 'abandoned' = parsed.data.outcome;

  const mediaDeletedAt = record.mediaDeletedAt ?? (parsed.data.mediaDeleted ? now : null);

  const blocked = closureIsBlocked({
    receivedAt: record.mediaReceivedAt?.toISOString() ?? null,
    deletedAt: mediaDeletedAt?.toISOString() ?? null,
  });

  if (blocked) return { status: 'error', message: blocked };

  // The hash binds the outcome to this case without carrying anything about
  // the person. It is a receipt, not a copy.
  const resultHash =
    outcome === 'verified'
      ? sha256(`${record.reference}:${record.creatorId}:${now.toISOString()}:${randomToken(8)}`)
      : null;

  await db.$transaction(async (tx) => {
    await tx.verificationCase.update({
      where: { id: record.id },
      data: {
        status: outcome,
        decidedAt: now,
        decidedById: session.user.id,
        decisionNote: parsed.data.note || null,
        providerReference: parsed.data.providerReference || null,
        resultHash,
        mediaDeletedAt,
      },
    });

    if (outcome === 'verified') {
      await tx.creatorVerification.upsert({
        where: { creatorId: record.creatorId },
        update: {
          status: 'verified',
          provider: 'palma_manual',
          providerReference: parsed.data.providerReference || record.reference,
          method: 'manual_review',
          verifiedAt: now,
          lastCheckedAt: now,
          failureCode: null,
        },
        create: {
          creatorId: record.creatorId,
          status: 'verified',
          provider: 'palma_manual',
          providerReference: parsed.data.providerReference || record.reference,
          method: 'manual_review',
          verifiedAt: now,
          lastCheckedAt: now,
        },
      });
    }

    if (outcome === 'refused') {
      await tx.creatorVerification.upsert({
        where: { creatorId: record.creatorId },
        update: { status: 'failed', lastCheckedAt: now, failureCode: 'manual_refusal' },
        create: { creatorId: record.creatorId, status: 'failed', lastCheckedAt: now },
      });
    }
  });

  await recordAudit({
    action: 'verification.case_decided',
    entityType: 'VerificationCase',
    entityId: record.id,
    actor,
    summary: `${record.reference} decided: ${outcome}`,
    // The outcome only. No documents, no date of birth, no address.
    after: {
      status: outcome,
      providerReference: parsed.data.providerReference || null,
      resultHash: resultHash ? `${resultHash.slice(0, 8)}…` : null,
    },
  });

  if (mediaDeletedAt && !record.mediaDeletedAt) {
    await recordAudit({
      action: 'verification.media_deleted',
      entityType: 'VerificationCase',
      entityId: record.id,
      actor,
      summary: `Submitted media deleted for ${record.reference}`,
    });
  }

  revalidatePath('/moderation/verification');
  revalidatePath(`/creators/${record.creator.slug}`);
  return {
    status: 'success',
    message:
      mediaDeletedAt && record.mediaReceivedAt
        ? `${record.reference} closed. Submitted media deleted.`
        : `${record.reference} closed.`,
  };
}
