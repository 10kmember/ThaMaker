import 'server-only';
import { prisma } from '@/server/db';

export type PortalNomination = {
  id: string;
  reference: string;
  creatorName: string;
  categoryName: string;
  year: number;
  status: string;
  submittedAt: string | null;
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
  nominations: PortalNomination[];
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
        },
      },
      nominationsMade: {
        include: { creator: true, category: true, awardYear: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
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
    nominations: user.nominationsMade.map((nomination) => ({
      id: nomination.id,
      reference: nomination.reference,
      creatorName: nomination.creator.displayName,
      categoryName: nomination.category.name,
      year: nomination.awardYear.year,
      status: nomination.status,
      submittedAt: nomination.submittedAt?.toISOString() ?? null,
    })),
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
