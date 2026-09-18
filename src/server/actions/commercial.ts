'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { assertSameOrigin } from '@/lib/auth/session';
import { authorise } from '@/lib/auth/guards';
import { slugify } from '@/lib/utils';
import { feature, isFeatureKey } from '@/domain/features';
import { placement as placementRule, placementTargetIsValid } from '@/domain/sponsorship';
import { recordAudit } from '@/server/audit';
import { prisma } from '@/server/db';

/**
 * Throwing a switch, and writing down that somebody threw it.
 *
 * Every change here creates an audit entry with the actor, the setting, what it
 * was and what it became — because "when did we start selling that, and who
 * decided?" is a question an institution has to be able to answer about itself.
 */

export type CommercialState = { status: 'idle' | 'error' | 'success'; message?: string };

const featureSchema = z.object({
  key: z.string().refine(isFeatureKey, 'Unknown feature.'),
  awardYearId: z.string().trim().max(40).optional().or(z.literal('')),
  enabled: z.boolean(),
  launchAt: z.string().trim().max(40).optional().or(z.literal('')),
  endAt: z.string().trim().max(40).optional().or(z.literal('')),
  reason: z.string().trim().max(400).optional().or(z.literal('')),
});

export async function setFeature(
  _previous: CommercialState,
  formData: FormData,
): Promise<CommercialState> {
  await assertSameOrigin();

  let session;
  try {
    session = await authorise('commercial:manage_features');
  } catch {
    return {
      status: 'error',
      message: 'Changing what PALMA sells is a super administrator’s decision.',
    };
  }

  const parsed = featureSchema.safeParse({
    key: formData.get('key'),
    awardYearId: formData.get('awardYearId') ?? '',
    enabled: formData.get('enabled') === 'true',
    launchAt: formData.get('launchAt') ?? '',
    endAt: formData.get('endAt') ?? '',
    reason: formData.get('reason') ?? '',
  });

  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Check the setting.' };
  }

  const entry = feature(parsed.data.key as Parameters<typeof feature>[0]);
  const awardYearId = parsed.data.awardYearId || null;

  // Turning something on needs a reason; turning it off never does. The audit
  // entry is the point of this whole page — "when did we start selling that,
  // and who decided?" is a question an institution has to be able to answer
  // about itself, and an empty string is not an answer. Stopping, by contrast,
  // is always allowed and never needs justifying.
  if (parsed.data.enabled && (parsed.data.reason ?? '').trim().length < 10) {
    return {
      status: 'error',
      message:
        'Say why, in at least ten characters. It is recorded with your name against the moment PALMA started selling this.',
    };
  }

  if (awardYearId && !entry.seasonAware) {
    return {
      status: 'error',
      message: `${entry.name} is not season-aware. It is on or off for the whole institution.`,
    };
  }

  // findFirst rather than findUnique on the compound key: awardYearId is
  // nullable, and Postgres treats NULLs as distinct in a unique index — so the
  // constraint does not actually prevent a second global row, and the write
  // below has to be the thing that does.
  const before = await prisma.featureSetting.findFirst({
    where: { key: entry.key, awardYearId },
    select: { id: true, enabled: true, launchAt: true, endAt: true },
  });

  const data = {
    enabled: parsed.data.enabled,
    launchAt: parsed.data.launchAt ? new Date(parsed.data.launchAt) : null,
    endAt: parsed.data.endAt ? new Date(parsed.data.endAt) : null,
    updatedById: session.user.id,
  };

  if (data.launchAt && Number.isNaN(data.launchAt.getTime())) {
    return { status: 'error', message: 'That launch date is not a date.' };
  }
  if (data.endAt && Number.isNaN(data.endAt.getTime())) {
    return { status: 'error', message: 'That end date is not a date.' };
  }
  if (data.launchAt && data.endAt && data.endAt <= data.launchAt) {
    return { status: 'error', message: 'The end date has to be after the launch date.' };
  }

  if (before) {
    await prisma.featureSetting.update({ where: { id: before.id }, data });
  } else {
    await prisma.featureSetting.create({ data: { key: entry.key, awardYearId, ...data } });
  }

  const season = awardYearId
    ? await prisma.awardYear.findUnique({ where: { id: awardYearId }, select: { title: true } })
    : null;

  await recordAudit({
    action: parsed.data.enabled ? 'feature.enabled' : 'feature.disabled',
    entityType: 'FeatureSetting',
    entityId: `${entry.key}${awardYearId ? `:${awardYearId}` : ''}`,
    actor: { id: session.user.id, role: session.user.role, label: session.user.email },
    summary: `${entry.name} ${parsed.data.enabled ? 'enabled' : 'disabled'}${season ? ` for ${season.title}` : ' globally'}${parsed.data.reason ? `, ${parsed.data.reason}` : ''}`,
    before: before
      ? {
          enabled: before.enabled,
          launchAt: before.launchAt?.toISOString() ?? null,
          endAt: before.endAt?.toISOString() ?? null,
        }
      : { enabled: false },
    after: {
      enabled: data.enabled,
      launchAt: data.launchAt?.toISOString() ?? null,
      endAt: data.endAt?.toISOString() ?? null,
      reason: parsed.data.reason || null,
    },
  });

  revalidatePath('/admin/settings/features');
  revalidatePath('/admin/business');
  revalidatePath('/');

  return {
    status: 'success',
    message: `${entry.name} is ${parsed.data.enabled ? 'on' : 'off'}${season ? ` for ${season.title}` : ''}.`,
  };
}

const sponsorSchema = z.object({
  sponsorId: z.string().trim().max(40).optional().or(z.literal('')),
  name: z.string().trim().min(2, 'Give the sponsor a name.').max(120),
  legalName: z.string().trim().max(160).optional().or(z.literal('')),
  websiteUrl: z.string().trim().url('Enter a valid link.').max(400).optional().or(z.literal('')),
  summary: z.string().trim().max(600).optional().or(z.literal('')),
  status: z.enum(['prospect', 'active', 'paused', 'expired', 'terminated']),
  agreementStatus: z.enum(['none', 'drafted', 'sent', 'signed', 'expired']),
  contactName: z.string().trim().max(120).optional().or(z.literal('')),
  contactEmail: z.string().trim().max(200).optional().or(z.literal('')),
  internalNotes: z.string().trim().max(4000).optional().or(z.literal('')),
});

export async function saveSponsor(
  _previous: CommercialState,
  formData: FormData,
): Promise<CommercialState> {
  await assertSameOrigin();

  let session;
  try {
    session = await authorise('commercial:manage_sponsors');
  } catch {
    return { status: 'error', message: 'You are not authorised to manage sponsors.' };
  }

  const parsed = sponsorSchema.safeParse({
    sponsorId: formData.get('sponsorId') ?? '',
    name: formData.get('name'),
    legalName: formData.get('legalName') ?? '',
    websiteUrl: formData.get('websiteUrl') ?? '',
    summary: formData.get('summary') ?? '',
    status: formData.get('status'),
    agreementStatus: formData.get('agreementStatus'),
    contactName: formData.get('contactName') ?? '',
    contactEmail: formData.get('contactEmail') ?? '',
    internalNotes: formData.get('internalNotes') ?? '',
  });

  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Check the details.' };
  }

  const data = {
    name: parsed.data.name,
    legalName: parsed.data.legalName || null,
    websiteUrl: parsed.data.websiteUrl || null,
    summary: parsed.data.summary || null,
    status: parsed.data.status,
    agreementStatus: parsed.data.agreementStatus,
    contactName: parsed.data.contactName || null,
    contactEmail: parsed.data.contactEmail || null,
    internalNotes: parsed.data.internalNotes || null,
    // A sponsor is only shown publicly once the agreement is signed and the
    // relationship is live. Everything else is a conversation, not a partner.
    isActive: parsed.data.status === 'active' && parsed.data.agreementStatus === 'signed',
  };

  const existing = parsed.data.sponsorId
    ? await prisma.sponsor.findUnique({
        where: { id: parsed.data.sponsorId },
        select: { id: true, name: true, status: true, agreementStatus: true },
      })
    : null;

  let sponsorId: string;

  if (existing) {
    await prisma.sponsor.update({ where: { id: existing.id }, data });
    sponsorId = existing.id;
  } else {
    const base = slugify(parsed.data.name);
    let slug = base;
    for (let attempt = 2; await prisma.sponsor.findUnique({ where: { slug } }); attempt += 1) {
      slug = `${base}-${attempt}`;
    }
    const created = await prisma.sponsor.create({ data: { ...data, slug } });
    sponsorId = created.id;
  }

  await recordAudit({
    action: 'commercial.sponsor_saved',
    entityType: 'Sponsor',
    entityId: sponsorId,
    actor: { id: session.user.id, role: session.user.role, label: session.user.email },
    summary: `${parsed.data.name}, ${parsed.data.status}, agreement ${parsed.data.agreementStatus}`,
    before: existing
      ? { status: existing.status, agreementStatus: existing.agreementStatus }
      : undefined,
    after: { status: data.status, agreementStatus: data.agreementStatus },
  });

  revalidatePath('/admin/business');
  revalidatePath('/about/sponsors');

  return { status: 'success', message: existing ? 'Sponsor updated.' : 'Sponsor created.' };
}

const packageSchema = z.object({
  packageId: z.string().trim().max(40).optional().or(z.literal('')),
  name: z.string().trim().min(2, 'Give the package a name.').max(120),
  description: z.string().trim().max(1000).optional().or(z.literal('')),
  price: z.coerce.number().min(0, 'A price cannot be negative.').max(10_000_000),
  currency: z.string().trim().length(3).default('GBP'),
  duration: z.string().trim().max(80).optional().or(z.literal('')),
  benefits: z.string().trim().max(2000).optional().or(z.literal('')),
  maxQuantity: z.coerce.number().int().min(0).max(1000).optional(),
  isAvailable: z.boolean(),
});

export async function savePackage(
  _previous: CommercialState,
  formData: FormData,
): Promise<CommercialState> {
  await assertSameOrigin();

  let session;
  try {
    session = await authorise('commercial:manage_packages');
  } catch {
    return { status: 'error', message: 'You are not authorised to change what PALMA sells.' };
  }

  const parsed = packageSchema.safeParse({
    packageId: formData.get('packageId') ?? '',
    name: formData.get('name'),
    description: formData.get('description') ?? '',
    price: formData.get('price') ?? 0,
    currency: formData.get('currency') || 'GBP',
    duration: formData.get('duration') ?? '',
    benefits: formData.get('benefits') ?? '',
    maxQuantity: formData.get('maxQuantity') || undefined,
    isAvailable: formData.get('isAvailable') === 'on',
  });

  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Check the details.' };
  }

  // Benefits are one per line. Anything that reads like access to a decision is
  // refused here rather than argued about later.
  const benefits = (parsed.data.benefits ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 20);

  const forbidden = /judg|score|winner selection|finalist selection|nominat\w* weight|outcome/i;
  const offending = benefits.find((benefit) => forbidden.test(benefit));
  if (offending) {
    return {
      status: 'error',
      message: `“${offending}” describes a benefit PALMA does not sell. Sponsorship buys visibility and association, never any part of a decision.`,
    };
  }

  const data = {
    name: parsed.data.name,
    description: parsed.data.description || null,
    priceMinor: Math.round(parsed.data.price * 100),
    currency: parsed.data.currency.toUpperCase(),
    duration: parsed.data.duration || null,
    benefits,
    maxQuantity: parsed.data.maxQuantity ?? null,
    isAvailable: parsed.data.isAvailable,
  };

  const existing = parsed.data.packageId
    ? await prisma.sponsorshipPackage.findUnique({
        where: { id: parsed.data.packageId },
        select: { id: true, priceMinor: true, name: true },
      })
    : null;

  let packageId: string;

  if (existing) {
    await prisma.sponsorshipPackage.update({ where: { id: existing.id }, data });
    packageId = existing.id;
  } else {
    const base = slugify(parsed.data.name);
    let slug = base;
    for (
      let attempt = 2;
      await prisma.sponsorshipPackage.findUnique({ where: { slug } });
      attempt += 1
    ) {
      slug = `${base}-${attempt}`;
    }
    const created = await prisma.sponsorshipPackage.create({ data: { ...data, slug } });
    packageId = created.id;
  }

  await recordAudit({
    action: 'commercial.package_saved',
    entityType: 'SponsorshipPackage',
    entityId: packageId,
    actor: { id: session.user.id, role: session.user.role, label: session.user.email },
    summary: `${data.name}, ${(data.priceMinor / 100).toLocaleString('en-GB', { style: 'currency', currency: data.currency })}`,
    before: existing ? { priceMinor: existing.priceMinor } : undefined,
    after: { priceMinor: data.priceMinor, isAvailable: data.isAvailable },
  });

  revalidatePath('/admin/business');

  return { status: 'success', message: existing ? 'Package updated.' : 'Package created.' };
}

const placementSchema = z.object({
  sponsorId: z.string().trim().min(1, 'Choose a sponsor.').max(40),
  awardYearId: z.string().trim().min(1, 'Choose a season.').max(40),
  placement: z.enum(['category', 'event', 'editorial', 'principal']),
  categoryId: z.string().trim().max(40).optional().or(z.literal('')),
  eventId: z.string().trim().max(40).optional().or(z.literal('')),
  articleId: z.string().trim().max(40).optional().or(z.literal('')),
  attribution: z.string().trim().max(60).optional().or(z.literal('')),
});

/**
 * Placing a sponsor against the thing they funded.
 *
 * The moderation desk does this, because the desk owns the pages a sponsor's
 * name appears on. What it cannot do is create the sponsor, price the package
 * or decide the association is live — a placement is proposed here and
 * approved by administration, so no single person can put a logo on a category
 * page from end to end.
 */
export async function assignPlacement(
  _previous: CommercialState,
  formData: FormData,
): Promise<CommercialState> {
  await assertSameOrigin();

  let session;
  try {
    session = await authorise('commercial:assign_placement');
  } catch {
    return { status: 'error', message: 'You are not authorised to place sponsors.' };
  }

  const parsed = placementSchema.safeParse({
    sponsorId: formData.get('sponsorId'),
    awardYearId: formData.get('awardYearId'),
    placement: formData.get('placement'),
    categoryId: formData.get('categoryId') ?? '',
    eventId: formData.get('eventId') ?? '',
    articleId: formData.get('articleId') ?? '',
    attribution: formData.get('attribution') ?? '',
  });

  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Check the placement.' };
  }

  const target = {
    categoryId: parsed.data.categoryId || null,
    eventId: parsed.data.eventId || null,
    articleId: parsed.data.articleId || null,
  };

  if (!placementTargetIsValid({ placement: parsed.data.placement, ...target })) {
    const rule = placementRule(parsed.data.placement);
    return {
      status: 'error',
      message: rule.target
        ? `A ${rule.name.toLowerCase()} has to name exactly one ${rule.target.replace('Id', '')}.`
        : 'A principal partnership attaches to the season itself. Leave the others blank.',
    };
  }

  const sponsor = await prisma.sponsor.findUnique({
    where: { id: parsed.data.sponsorId },
    select: { id: true, name: true, status: true, agreementStatus: true },
  });

  if (!sponsor) return { status: 'error', message: 'That sponsor does not exist.' };

  // A placement against a prospect, or against a deal nobody has signed, is a
  // logo on the strength of a conversation.
  if (sponsor.status !== 'active' || sponsor.agreementStatus !== 'signed') {
    return {
      status: 'error',
      message: `${sponsor.name} is ${sponsor.status} with a ${sponsor.agreementStatus} agreement. A placement needs an active sponsor and a signed agreement.`,
    };
  }

  const existing = await prisma.sponsorship.findFirst({
    where: {
      sponsorId: sponsor.id,
      awardYearId: parsed.data.awardYearId,
      placement: parsed.data.placement,
      ...target,
    },
    select: { id: true },
  });

  if (existing) {
    return { status: 'error', message: 'That placement already exists.' };
  }

  const created = await prisma.sponsorship.create({
    data: {
      sponsorId: sponsor.id,
      awardYearId: parsed.data.awardYearId,
      placement: parsed.data.placement,
      ...target,
      attribution: parsed.data.attribution || null,
      // Proposed, not live. Administration approves.
      isApproved: false,
    },
  });

  await recordAudit({
    action: 'commercial.sponsorship_assigned',
    entityType: 'Sponsorship',
    entityId: created.id,
    actor: { id: session.user.id, role: session.user.role, label: session.user.email },
    summary: `${sponsor.name} proposed as ${placementRule(parsed.data.placement).name.toLowerCase()}`,
    after: { placement: parsed.data.placement, ...target },
  });

  revalidatePath('/portal/sponsorships');
  revalidatePath('/admin/business');

  return {
    status: 'success',
    message: `Proposed. ${sponsor.name} appears nowhere public until an administrator approves it.`,
  };
}

/** Approving or removing a placement. Administration only. */
export async function decidePlacement(
  _previous: CommercialState,
  formData: FormData,
): Promise<CommercialState> {
  await assertSameOrigin();

  let session;
  try {
    session = await authorise('commercial:manage_sponsors');
  } catch {
    return { status: 'error', message: 'Approving a placement is an administrator’s decision.' };
  }

  const id = String(formData.get('sponsorshipId') ?? '');
  const decision = String(formData.get('decision') ?? '');

  const sponsorship = await prisma.sponsorship.findUnique({
    where: { id },
    include: {
      sponsor: { select: { name: true } },
      category: { select: { name: true, slug: true } },
      awardYear: { select: { id: true, title: true } },
    },
  });

  if (!sponsorship) return { status: 'error', message: 'That placement does not exist.' };

  if (decision === 'remove') {
    await prisma.sponsorship.delete({ where: { id } });

    await recordAudit({
      action: 'commercial.sponsorship_removed',
      entityType: 'Sponsorship',
      entityId: id,
      actor: { id: session.user.id, role: session.user.role, label: session.user.email },
      summary: `${sponsorship.sponsor.name} removed from ${sponsorship.category?.name ?? sponsorship.awardYear.title}`,
    });

    revalidatePath('/portal/sponsorships');
    revalidatePath('/admin/business');
    if (sponsorship.category) revalidatePath(`/categories/${sponsorship.category.slug}`);

    return { status: 'success', message: 'Removed. The attribution is gone from every page.' };
  }

  if (decision !== 'approve') {
    return { status: 'error', message: 'Choose approve or remove.' };
  }

  await prisma.sponsorship.update({
    where: { id },
    data: { isApproved: true, approvedById: session.user.id, approvedAt: new Date() },
  });

  await recordAudit({
    action: 'commercial.sponsorship_assigned',
    entityType: 'Sponsorship',
    entityId: id,
    actor: { id: session.user.id, role: session.user.role, label: session.user.email },
    summary: `${sponsorship.sponsor.name} approved on ${sponsorship.category?.name ?? sponsorship.awardYear.title}`,
    after: { isApproved: true },
  });

  revalidatePath('/portal/sponsorships');
  revalidatePath('/admin/business');
  revalidatePath('/categories');
  if (sponsorship.category) revalidatePath(`/categories/${sponsorship.category.slug}`);

  return {
    status: 'success',
    message: `Approved. It appears once ${'the matching feature'} is switched on for that season.`,
  };
}
