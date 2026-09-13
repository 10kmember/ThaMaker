import 'server-only';
import { canIssueReferralLink, referralPath } from '@/domain/nomination';
import { prisma } from '@/server/db';

export type PortalCandidacy = {
  id: string;
  reference: string;
  categoryName: string;
  year: number;
  status: string;
};

export type PortalAchievement = {
  code: string;
  kind: string;
  year: number;
  categoryName: string;
  state: string;
};

export type CreatorPortal = {
  hasProfile: boolean;
  creatorSlug: string | null;
  displayName: string | null;
  isPublished: boolean;
  verification: {
    status: string;
    provider: string | null;
    verifiedAt: string | null;
    expiresAt: string | null;
  };
  candidacies: PortalCandidacy[];
  /** The creator's own nomination link, once it has been issued. */
  referralPath: string | null;
  achievements: PortalAchievement[];
  preferences: {
    seasonAnnouncements: boolean;
    nominationUpdates: boolean;
    honourAnnouncements: boolean;
    journalDigest: boolean;
  };
};

export async function getCreatorPortal(userId: string): Promise<CreatorPortal | null> {
  const db = prisma;
  if (!db) return null;

  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      notificationPrefs: true,
      creator: {
        include: {
          verification: true,
          achievements: { include: { honour: true }, orderBy: { issuedAt: 'desc' } },
          candidacies: {
            include: { category: true, awardYear: true },
            orderBy: { createdAt: 'desc' },
            take: 50,
          },
        },
      },
    },
  });

  if (!user) return null;

  return {
    hasProfile: Boolean(user.creator),
    creatorSlug: user.creator?.slug ?? null,
    displayName: user.creator?.displayName ?? null,
    isPublished: user.creator?.isPublished ?? false,
    verification: {
      status: user.creator?.verification?.status ?? 'unverified',
      provider: user.creator?.verification?.provider ?? null,
      verifiedAt: user.creator?.verification?.verifiedAt?.toISOString() ?? null,
      expiresAt: user.creator?.verification?.expiresAt?.toISOString() ?? null,
    },
    candidacies: (user.creator?.candidacies ?? []).map((candidacy) => ({
      id: candidacy.id,
      reference: candidacy.reference,
      categoryName: candidacy.category.name,
      year: candidacy.awardYear.year,
      status: candidacy.status,
    })),
    referralPath:
      user.creator &&
      canIssueReferralLink({
        isClaimed: user.creator.userId !== null,
        isSuspended: user.creator.isSuspended,
        verificationStatus: user.creator.verification?.status ?? 'unverified',
      })
        ? referralPath(user.creator.slug)
        : null,
    achievements: (user.creator?.achievements ?? []).map((achievement) => ({
      code: achievement.code,
      kind: achievement.kind,
      year: achievement.year,
      categoryName: achievement.categoryName,
      state: achievement.state,
    })),
    preferences: {
      seasonAnnouncements: user.notificationPrefs?.seasonAnnouncements ?? true,
      nominationUpdates: user.notificationPrefs?.nominationUpdates ?? true,
      honourAnnouncements: user.notificationPrefs?.honourAnnouncements ?? true,
      journalDigest: user.notificationPrefs?.journalDigest ?? false,
    },
  };
}
