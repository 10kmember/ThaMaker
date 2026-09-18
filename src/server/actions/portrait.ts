'use server';

import { revalidatePath } from 'next/cache';
import { assertSameOrigin } from '@/lib/auth/session';
import { authorise } from '@/lib/auth/guards';
import { containsExplicitLanguage } from '@/domain/content-policy';
import { recordAudit } from '@/server/audit';
import { prisma } from '@/server/db';
import { MAX_UPLOAD_BYTES, portraitPath, preparePortrait } from '@/server/services/portrait';

/**
 * A creator's portrait.
 *
 * Two rules shape this, and both come from elsewhere in PALMA rather than from
 * anything about images.
 *
 * A portrait is a *claimed-record* field. PALMA does not find a picture of an
 * unclaimed creator and put it on their record — the only way one exists is
 * that the person in it uploaded it, from their own account.
 *
 * And it is reviewed before it is public. PALMA is deliberately SFW and hosts
 * no explicit imagery; an upload is the one route by which someone could try,
 * so a person looks first. The Terms already promise an "approved profile
 * image", and this is what makes that word true.
 */

export type PortraitState = { status: 'idle' | 'error' | 'success'; message?: string };

export async function uploadPortrait(
  _previous: PortraitState,
  formData: FormData,
): Promise<PortraitState> {
  await assertSameOrigin();

  let session;
  try {
    session = await authorise('creator:update_own_profile');
  } catch {
    return { status: 'error', message: 'You are not authorised to change this record.' };
  }

  if (!session.user.creatorId) {
    return { status: 'error', message: 'Claim or start a record before adding a portrait.' };
  }

  const file = formData.get('portrait');
  if (!(file instanceof File) || file.size === 0) {
    return { status: 'error', message: 'Choose an image.' };
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      status: 'error',
      message: `That image is larger than ${MAX_UPLOAD_BYTES / 1024 / 1024}MB.`,
    };
  }

  const alt = String(formData.get('alt') ?? '').trim();
  if (alt.length > 300) {
    return { status: 'error', message: 'Keep the description under 300 characters.' };
  }
  if (alt && containsExplicitLanguage(alt)) {
    return {
      status: 'error',
      message: 'PALMA records stay suitable for every audience. Edit the description.',
    };
  }

  const prepared = await preparePortrait({
    bytes: await file.arrayBuffer(),
    declaredType: file.type,
  });

  if (!prepared.ok) {
    return { status: 'error', message: prepared.reason };
  }

  const creatorId = session.user.creatorId;
  const { portrait } = prepared;

  await prisma.$transaction(async (tx) => {
    await tx.creatorPortrait.upsert({
      where: { creatorId },
      create: {
        creatorId,
        data: portrait.data,
        contentType: portrait.contentType,
        width: portrait.width,
        height: portrait.height,
        byteSize: portrait.byteSize,
        checksum: portrait.checksum,
        alt: alt || null,
        status: 'pending',
      },
      // Replacing a portrait sends it back for review. A creator who could
      // swap an approved image for a different one afterwards would make the
      // review meaningless.
      update: {
        data: portrait.data,
        contentType: portrait.contentType,
        width: portrait.width,
        height: portrait.height,
        byteSize: portrait.byteSize,
        checksum: portrait.checksum,
        alt: alt || null,
        status: 'pending',
        reviewedAt: null,
        reviewedById: null,
        rejectionReason: null,
      },
    });

    // The public record shows nothing until a person has looked.
    await tx.creator.update({
      where: { id: creatorId },
      data: { portraitUrl: null, portraitAlt: null },
    });
  });

  await recordAudit({
    action: 'creator.portrait_submitted',
    entityType: 'Creator',
    entityId: creatorId,
    actor: { id: session.user.id, role: session.user.role, label: session.user.email },
    summary: `Portrait submitted (${Math.round(portrait.byteSize / 1024)}KB, ${portrait.width}×${portrait.height})`,
  });

  revalidatePath('/creator');
  revalidatePath('/portal/portraits');

  return {
    status: 'success',
    message:
      'Received. PALMA re-encoded it and discarded every scrap of metadata that came with it, including location. A moderator looks before it appears on your record.',
  };
}

/** Taking it down again. The creator's own decision, and immediate. */
export async function removePortrait(): Promise<void> {
  await assertSameOrigin();

  let session;
  try {
    session = await authorise('creator:update_own_profile');
  } catch {
    return;
  }
  if (!session.user.creatorId) return;

  const creatorId = session.user.creatorId;

  await prisma.$transaction(async (tx) => {
    await tx.creatorPortrait.deleteMany({ where: { creatorId } });
    await tx.creator.update({
      where: { id: creatorId },
      data: { portraitUrl: null, portraitAlt: null },
    });
  });

  await recordAudit({
    action: 'creator.portrait_removed',
    entityType: 'Creator',
    entityId: creatorId,
    actor: { id: session.user.id, role: session.user.role, label: session.user.email },
    summary: 'Portrait removed by the creator',
  });

  revalidatePath('/creator');
  if (session.user.creatorSlug) revalidatePath(`/creators/${session.user.creatorSlug}`);
}

/**
 * Reviewing one.
 *
 * Approval writes the serving path onto the record, which is what makes it
 * public. The path carries the checksum, so a replaced portrait is a different
 * URL and no cache anywhere is holding the old one.
 */
export async function reviewPortrait(
  _previous: PortraitState,
  formData: FormData,
): Promise<PortraitState> {
  await assertSameOrigin();

  let session;
  try {
    session = await authorise('editorial:edit_creator');
  } catch {
    return { status: 'error', message: 'You are not authorised to review portraits.' };
  }

  const portraitId = String(formData.get('portraitId') ?? '');
  const decision = String(formData.get('decision') ?? '');
  const reason = String(formData.get('reason') ?? '').trim();

  if (decision !== 'approve' && decision !== 'reject') {
    return { status: 'error', message: 'Choose a decision.' };
  }
  if (decision === 'reject' && reason.length < 10) {
    return {
      status: 'error',
      message: 'A rejection has to carry a reason. The creator is told what it says.',
    };
  }

  const portrait = await prisma.creatorPortrait.findUnique({
    where: { id: portraitId },
    include: { creator: { select: { id: true, slug: true, displayName: true } } },
  });

  if (!portrait) return { status: 'error', message: 'That portrait does not exist.' };

  const actor = { id: session.user.id, role: session.user.role, label: session.user.email };
  const now = new Date();

  if (decision === 'reject') {
    await prisma.$transaction(async (tx) => {
      // The bytes go with the refusal. PALMA does not keep a copy of an image
      // it has decided not to publish.
      await tx.creatorPortrait.update({
        where: { id: portrait.id },
        data: {
          status: 'rejected',
          reviewedAt: now,
          reviewedById: session.user.id,
          rejectionReason: reason,
          data: new Uint8Array(new ArrayBuffer(0)),
          byteSize: 0,
        },
      });
      await tx.creator.update({
        where: { id: portrait.creator.id },
        data: { portraitUrl: null, portraitAlt: null },
      });
    });

    await recordAudit({
      action: 'creator.portrait_rejected',
      entityType: 'Creator',
      entityId: portrait.creator.id,
      actor,
      summary: `Portrait for ${portrait.creator.displayName} refused: ${reason}`,
    });

    revalidatePath('/portal/portraits');
    revalidatePath(`/creators/${portrait.creator.slug}`);
    return { status: 'success', message: 'Refused, and the image deleted.' };
  }

  await prisma.$transaction(async (tx) => {
    await tx.creatorPortrait.update({
      where: { id: portrait.id },
      data: {
        status: 'approved',
        reviewedAt: now,
        reviewedById: session.user.id,
        rejectionReason: null,
      },
    });
    await tx.creator.update({
      where: { id: portrait.creator.id },
      data: {
        portraitUrl: portraitPath(portrait.creator.slug, portrait.checksum),
        portraitAlt: portrait.alt,
      },
    });
  });

  await recordAudit({
    action: 'creator.portrait_approved',
    entityType: 'Creator',
    entityId: portrait.creator.id,
    actor,
    summary: `Portrait for ${portrait.creator.displayName} published`,
  });

  revalidatePath('/portal/portraits');
  revalidatePath('/creator');
  revalidatePath('/creators');
  revalidatePath(`/creators/${portrait.creator.slug}`);
  revalidatePath(`/nominate/${portrait.creator.slug}`);

  return { status: 'success', message: 'Published on the record.' };
}
