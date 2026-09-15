import 'server-only';
import { prisma } from '@/server/db';
import { assessClaim, type ClaimCheck } from '@/domain/claim';
import type { VerificationCaseReason, VerificationCaseStatus } from '@/domain/verification-case';
import { honourCategoryName } from '@/domain/honours';

/**
 * The operations read layer.
 *
 * The back office is organised around queues rather than analytics: the only
 * number that matters on the home screen is how much work is waiting, and for
 * each queue the answer is a count of things a person has to decide.
 *
 * Everything here reads the same Creator, User, Verification and Report rows
 * the public site and the creator portal read. One record, one history,
 * different permissions.
 */

export type QueueCounts = {
  claims: number;
  verification: number;
  unclaimedRecords: number;
  reports: number;
  escalations: number;
  unpublishedRecords: number;
};

export async function getQueueCounts(): Promise<QueueCounts> {
  const [claims, verification, unclaimedRecords, reports, escalations, unpublishedRecords] =
    await Promise.all([
      prisma.creatorClaim.count({
        where: { status: { in: ['submitted', 'awaiting_information'] } },
      }),
      prisma.verificationCase.count({
        where: { status: { in: ['open', 'awaiting_information'] } },
      }),
      prisma.creator.count({ where: { userId: null, isPublished: true } }),
      prisma.report.count({ where: { status: { in: ['open', 'investigating'] } } }),
      prisma.creatorClaim.count({ where: { status: 'escalated' } }),
      prisma.creator.count({ where: { isPublished: false } }),
    ]);

  return { claims, verification, unclaimedRecords, reports, escalations, unpublishedRecords };
}

export type ClaimSummary = {
  id: string;
  reference: string;
  status: string;
  createdAt: string;
  creatorName: string;
  creatorSlug: string;
  claimantEmail: string;
  invited: boolean;
  linkCount: number;
};

export async function listClaims(status?: 'open' | 'settled'): Promise<ClaimSummary[]> {
  const rows = await prisma.creatorClaim.findMany({
    where:
      status === 'open'
        ? { status: { in: ['submitted', 'awaiting_information', 'escalated'] } }
        : status === 'settled'
          ? { status: { in: ['approved', 'rejected', 'withdrawn'] } }
          : undefined,
    include: {
      creator: { select: { displayName: true, slug: true } },
      user: { select: { email: true } },
      links: { select: { id: true } },
    },
    orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
    take: 100,
  });

  const invitedCreatorIds = new Set(
    (
      await prisma.claimInvitation.findMany({
        where: { creatorId: { in: rows.map((row) => row.creatorId) }, usedAt: { not: null } },
        select: { creatorId: true },
      })
    ).map((invitation) => invitation.creatorId),
  );

  return rows.map((row) => ({
    id: row.id,
    reference: row.reference,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    creatorName: row.creator.displayName,
    creatorSlug: row.creator.slug,
    claimantEmail: row.user.email,
    invited: invitedCreatorIds.has(row.creatorId),
    linkCount: row.links.length,
  }));
}

export type ClaimCase = {
  id: string;
  reference: string;
  status: string;
  createdAt: string;

  /** The PALMA record as it stands. Read-only in this view. */
  record: {
    id: string;
    slug: string;
    displayName: string;
    countryCode: string;
    city: string | null;
    headline: string | null;
    biography: string | null;
    portraitUrl: string | null;
    createdAt: string;
    isPublished: boolean;
    verificationStatus: string;
    verifiedAt: string | null;
    links: { label: string; url: string }[];
    honours: { year: number; kind: string; categoryName: string }[];
  };

  /** What the claimant has supplied. Never published. */
  claimant: {
    userId: string;
    email: string;
    name: string;
    role: string;
    contactEmail: string;
    claimedIdentity: string;
    supportingNote: string | null;
    links: { label: string; url: string }[];
  };

  checks: ClaimCheck[];
  invited: boolean;
  openReports: number;
  informationRequestedNote: string | null;
  decisionNote: string | null;
  decidedAt: string | null;
  decidedByEmail: string | null;
};

export async function getClaimCase(id: string): Promise<ClaimCase | null> {
  const claim = await prisma.creatorClaim.findUnique({
    where: { id },
    include: {
      links: true,
      user: { select: { id: true, email: true, name: true, role: true } },
      decidedBy: { select: { email: true } },
      creator: {
        include: {
          verification: true,
          links: { orderBy: { position: 'asc' } },
          honours: {
            where: { state: 'active' },
            include: { awardYear: true, category: true },
          },
        },
      },
    },
  });

  if (!claim) return null;

  const [invitation, openReports] = await Promise.all([
    prisma.claimInvitation.findFirst({
      where: { creatorId: claim.creatorId, usedAt: { not: null } },
      select: { id: true },
    }),
    prisma.report.count({
      where: { creatorId: claim.creatorId, status: { in: ['open', 'investigating'] } },
    }),
  ]);

  const { creator } = claim;
  const invited = Boolean(invitation);

  return {
    id: claim.id,
    reference: claim.reference,
    status: claim.status,
    createdAt: claim.createdAt.toISOString(),

    record: {
      id: creator.id,
      slug: creator.slug,
      displayName: creator.displayName,
      countryCode: creator.countryCode,
      city: creator.city,
      headline: creator.headline,
      biography: creator.biography,
      portraitUrl: creator.portraitUrl,
      createdAt: creator.createdAt.toISOString(),
      isPublished: creator.isPublished,
      verificationStatus: creator.verification?.status ?? 'unverified',
      verifiedAt: creator.verification?.verifiedAt?.toISOString() ?? null,
      links: creator.links.map((link) => ({ label: link.label, url: link.url })),
      honours: creator.honours.map((honour) => ({
        year: honour.awardYear.year,
        kind: honour.kind,
        categoryName: honourCategoryName(honour.kind, honour.category?.name ?? null),
      })),
    },

    claimant: {
      userId: claim.user.id,
      email: claim.user.email,
      name: claim.user.name,
      role: claim.user.role,
      contactEmail: claim.contactEmail,
      claimedIdentity: claim.claimedIdentity,
      supportingNote: claim.supportingNote,
      links: claim.links.map((link) => ({ label: link.label, url: link.url })),
    },

    checks: assessClaim({
      recordUnclaimed: !creator.userId,
      verificationComplete: creator.verification?.status === 'verified',
      identityStatementSupplied: claim.claimedIdentity.trim().length > 0,
      evidenceLinkCount: claim.links.length,
      invited,
      openReports,
    }),

    invited,
    openReports,
    informationRequestedNote: claim.informationRequestedNote,
    decisionNote: claim.decisionNote,
    decidedAt: claim.decidedAt?.toISOString() ?? null,
    decidedByEmail: claim.decidedBy?.email ?? null,
  };
}

export type VerificationCaseSummary = {
  id: string;
  reference: string;
  status: VerificationCaseStatus;
  reason: VerificationCaseReason;
  creatorName: string;
  creatorSlug: string;
  openedAt: string;
  mediaReceivedAt: string | null;
  mediaDeletedAt: string | null;
};

export async function listVerificationCases(
  scope: 'open' | 'all' = 'open',
): Promise<VerificationCaseSummary[]> {
  const rows = await prisma.verificationCase.findMany({
    where: scope === 'open' ? { status: { in: ['open', 'awaiting_information'] } } : undefined,
    include: { creator: { select: { displayName: true, slug: true } } },
    orderBy: { openedAt: 'asc' },
    take: 100,
  });

  return rows.map((row) => ({
    id: row.id,
    reference: row.reference,
    status: row.status as VerificationCaseStatus,
    reason: row.reason as VerificationCaseReason,
    creatorName: row.creator.displayName,
    creatorSlug: row.creator.slug,
    openedAt: row.openedAt.toISOString(),
    mediaReceivedAt: row.mediaReceivedAt?.toISOString() ?? null,
    mediaDeletedAt: row.mediaDeletedAt?.toISOString() ?? null,
  }));
}

export type StaffCreatorSummary = {
  id: string;
  slug: string;
  displayName: string;
  countryCode: string;
  isPublished: boolean;
  isClaimed: boolean;
  isSuspended: boolean;
  verificationStatus: string;
  honourCount: number;
  openClaims: number;
  noteCount: number;
};

export async function listCreatorRecords(filter?: {
  query?: string;
  claimed?: boolean;
}): Promise<StaffCreatorSummary[]> {
  const rows = await prisma.creator.findMany({
    where: {
      ...(filter?.query
        ? { displayName: { contains: filter.query, mode: 'insensitive' as const } }
        : {}),
      ...(filter?.claimed === true ? { userId: { not: null } } : {}),
      ...(filter?.claimed === false ? { userId: null } : {}),
    },
    include: {
      verification: { select: { status: true } },
      honours: { where: { state: 'active' }, select: { id: true } },
      claims: {
        where: { status: { in: ['submitted', 'awaiting_information', 'escalated'] } },
        select: { id: true },
      },
      staffNotes: { select: { id: true } },
    },
    orderBy: { displayName: 'asc' },
    take: 200,
  });

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    displayName: row.displayName,
    countryCode: row.countryCode,
    isPublished: row.isPublished,
    isClaimed: Boolean(row.userId),
    isSuspended: row.isSuspended,
    verificationStatus: row.verification?.status ?? 'unverified',
    honourCount: row.honours.length,
    openClaims: row.claims.length,
    noteCount: row.staffNotes.length,
  }));
}

export type StaffCreatorRecord = {
  id: string;
  slug: string;
  displayName: string;
  countryCode: string;
  city: string | null;
  headline: string | null;
  biography: string | null;
  websiteUrl: string | null;
  isPublished: boolean;
  isSuspended: boolean;
  createdAt: string;

  /** Who holds it, if anyone. */
  heldBy: { email: string; name: string } | null;

  /** Where the work lives — what the desk writes and checks the record from. */
  links: { id: string; label: string; url: string }[];

  verification: {
    status: string;
    provider: string | null;
    providerReference: string | null;
    verifiedAt: string | null;
  };

  /** PALMA's record of what happened. Shown here, never editable here. */
  honours: { year: number; kind: string; categoryName: string; state: string }[];

  claims: { id: string; reference: string; status: string; createdAt: string; email: string }[];
  cases: { id: string; reference: string; status: string; reason: string }[];
  notes: { id: string; body: string; createdAt: string; author: string | null }[];
  invitations: { id: string; createdAt: string; expiresAt: string; usedAt: string | null }[];
};

export async function getCreatorRecord(slug: string): Promise<StaffCreatorRecord | null> {
  const creator = await prisma.creator.findUnique({
    where: { slug },
    include: {
      user: { select: { email: true, name: true } },
      verification: true,
      links: { orderBy: { position: 'asc' } },
      honours: { include: { awardYear: true, category: true }, orderBy: { createdAt: 'desc' } },
      claims: {
        include: { user: { select: { email: true } } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
      verificationCases: { orderBy: { openedAt: 'desc' }, take: 20 },
      staffNotes: {
        include: { author: { select: { email: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
      invitations: { orderBy: { createdAt: 'desc' }, take: 10 },
    },
  });

  if (!creator) return null;

  return {
    id: creator.id,
    slug: creator.slug,
    displayName: creator.displayName,
    countryCode: creator.countryCode,
    city: creator.city,
    headline: creator.headline,
    biography: creator.biography,
    websiteUrl: creator.websiteUrl,
    isPublished: creator.isPublished,
    isSuspended: creator.isSuspended,
    createdAt: creator.createdAt.toISOString(),

    heldBy: creator.user ? { email: creator.user.email, name: creator.user.name } : null,

    links: creator.links.map((link) => ({ id: link.id, label: link.label, url: link.url })),

    verification: {
      status: creator.verification?.status ?? 'unverified',
      provider: creator.verification?.provider ?? null,
      providerReference: creator.verification?.providerReference ?? null,
      verifiedAt: creator.verification?.verifiedAt?.toISOString() ?? null,
    },

    honours: creator.honours.map((honour) => ({
      year: honour.awardYear.year,
      kind: honour.kind,
      categoryName: honourCategoryName(honour.kind, honour.category?.name ?? null),
      state: honour.state,
    })),

    claims: creator.claims.map((claim) => ({
      id: claim.id,
      reference: claim.reference,
      status: claim.status,
      createdAt: claim.createdAt.toISOString(),
      email: claim.user.email,
    })),

    cases: creator.verificationCases.map((entry) => ({
      id: entry.id,
      reference: entry.reference,
      status: entry.status,
      reason: entry.reason,
    })),

    notes: creator.staffNotes.map((note) => ({
      id: note.id,
      body: note.body,
      createdAt: note.createdAt.toISOString(),
      author: note.author?.email ?? null,
    })),

    invitations: creator.invitations.map((invitation) => ({
      id: invitation.id,
      createdAt: invitation.createdAt.toISOString(),
      expiresAt: invitation.expiresAt.toISOString(),
      usedAt: invitation.usedAt?.toISOString() ?? null,
    })),
  };
}

/** Resolve a claim invitation token to the record it invites a claim on. */
export async function creatorForInvitationToken(
  tokenHash: string,
): Promise<{ slug: string; displayName: string } | null> {
  const invitation = await prisma.claimInvitation.findUnique({
    where: { tokenHash },
    include: { creator: { select: { slug: true, displayName: true, userId: true } } },
  });

  if (!invitation) return null;
  if (invitation.usedAt || invitation.revokedAt) return null;
  if (invitation.expiresAt.getTime() < Date.now()) return null;
  if (invitation.creator.userId) return null;

  return { slug: invitation.creator.slug, displayName: invitation.creator.displayName };
}
