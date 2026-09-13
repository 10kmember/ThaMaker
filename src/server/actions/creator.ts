'use server';

import { revalidatePath } from 'next/cache';
import { authorise } from '@/lib/auth/guards';
import { assertSameOrigin } from '@/lib/auth/session';
import { creatorProfileSchema, notificationPreferenceSchema } from '@/lib/validation/account';
import { containsExplicitLanguage } from '@/domain/content-policy';
import { isValidCountryCode } from '@/lib/countries';
import { recordAudit } from '@/server/audit';
import { requireDb } from '@/server/db';
import { env } from '@/lib/env';

export type CreatorState = { status: 'idle' | 'error' | 'success'; message?: string };

export async function updateCreatorProfile(
  _previous: CreatorState,
  formData: FormData,
): Promise<CreatorState> {
  await assertSameOrigin();

  let session;
  try {
    session = await authorise('creator:update_own_profile');
  } catch {
    return { status: 'error', message: 'You are not authorised to edit this profile.' };
  }

  if (!session.user.creatorId) {
    return { status: 'error', message: 'Claim a creator profile before editing it.' };
  }

  const parsed = creatorProfileSchema.safeParse({
    displayName: formData.get('displayName'),
    pronouns: formData.get('pronouns') ?? '',
    countryCode: formData.get('countryCode'),
    city: formData.get('city') ?? '',
    headline: formData.get('headline') ?? '',
    biography: formData.get('biography') ?? '',
    websiteUrl: formData.get('websiteUrl') ?? '',
  });

  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Check the details.' };
  }

  if (!isValidCountryCode(parsed.data.countryCode)) {
    return { status: 'error', message: 'Select a valid country.' };
  }

  // Public surfaces of PALMA stay SFW. A person reviews anything this catches.
  const prose = `${parsed.data.headline ?? ''} ${parsed.data.biography ?? ''}`;
  if (containsExplicitLanguage(prose)) {
    return {
      status: 'error',
      message:
        'PALMA profiles are a professional record and must stay suitable for every audience. Edit the wording and try again.',
    };
  }

  const db = requireDb();
  const before = await db.creator.findUnique({
    where: { id: session.user.creatorId },
    select: { displayName: true, headline: true, biography: true, countryCode: true, city: true },
  });

  await db.creator.update({
    where: { id: session.user.creatorId },
    data: {
      displayName: parsed.data.displayName,
      pronouns: parsed.data.pronouns || null,
      countryCode: parsed.data.countryCode,
      city: parsed.data.city || null,
      headline: parsed.data.headline || null,
      biography: parsed.data.biography || null,
      websiteUrl: parsed.data.websiteUrl || null,
    },
  });

  await recordAudit({
    action: 'creator.profile_updated',
    entityType: 'Creator',
    entityId: session.user.creatorId,
    actor: { id: session.user.id, role: session.user.role, label: session.user.email },
    before,
    after: parsed.data,
  });

  revalidatePath('/portal');
  if (session.user.creatorSlug) revalidatePath(`/creators/${session.user.creatorSlug}`);

  return { status: 'success', message: 'Profile updated.' };
}

export async function updateNotificationPreferences(
  _previous: CreatorState,
  formData: FormData,
): Promise<CreatorState> {
  await assertSameOrigin();

  let session;
  try {
    session = await authorise('creator:update_own_profile');
  } catch {
    return { status: 'error', message: 'You are not authorised to change these settings.' };
  }

  const parsed = notificationPreferenceSchema.safeParse({
    seasonAnnouncements: formData.get('seasonAnnouncements') === 'on',
    nominationUpdates: formData.get('nominationUpdates') === 'on',
    honourAnnouncements: formData.get('honourAnnouncements') === 'on',
    journalDigest: formData.get('journalDigest') === 'on',
  });

  if (!parsed.success) return { status: 'error', message: 'Could not save those preferences.' };

  const db = requireDb();
  await db.notificationPreference.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, ...parsed.data },
    update: parsed.data,
  });

  revalidatePath('/portal');
  return { status: 'success', message: 'Preferences saved.' };
}

/**
 * Begin age and identity assurance.
 *
 * PALMA never sees an identity document. The creator is handed to a specialist
 * provider; we record only that the check was started, and later its outcome
 * and the provider's reference.
 */
export async function startVerification(_previous: CreatorState): Promise<CreatorState> {
  await assertSameOrigin();

  let session;
  try {
    session = await authorise('creator:start_verification');
  } catch {
    return { status: 'error', message: 'You are not authorised to start verification.' };
  }

  if (!session.user.creatorId) {
    return { status: 'error', message: 'Claim a creator profile first.' };
  }

  const db = requireDb();

  await db.creatorVerification.upsert({
    where: { creatorId: session.user.creatorId },
    create: {
      creatorId: session.user.creatorId,
      status: 'pending',
      provider: env.AGE_VERIFICATION_PROVIDER,
      lastCheckedAt: new Date(),
    },
    update: {
      status: 'pending',
      provider: env.AGE_VERIFICATION_PROVIDER,
      lastCheckedAt: new Date(),
      failureCode: null,
    },
  });

  await recordAudit({
    action: 'creator.verification_updated',
    entityType: 'CreatorVerification',
    entityId: session.user.creatorId,
    actor: { id: session.user.id, role: session.user.role, label: session.user.email },
    summary: 'Verification started',
    after: { status: 'pending', provider: env.AGE_VERIFICATION_PROVIDER },
  });

  revalidatePath('/portal');
  return {
    status: 'success',
    message:
      'Verification started. You will be handed to PALMA’s verification provider to complete it — PALMA never receives or stores your identity documents.',
  };
}

/**
 * Claiming moved.
 *
 * A claim used to link the account on the spot. It is now a request reviewed
 * by a person — see `requestProfileClaim` in `@/server/actions/claims`. The
 * old behaviour is deliberately gone rather than deprecated: an instant claim
 * is exactly the thing PALMA must not offer.
 */
