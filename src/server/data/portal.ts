import 'server-only';
import { canIssueReferralLink, referralPath } from '@/domain/nomination';
import { prisma } from '@/server/db';
import { getDossierBadge } from './dossier';

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

/** The fields a creator writes about themselves, editable whether or not the
 *  record is published. The public query refuses unpublished records, which is
 *  right for the public and wrong for the person waiting on a moderator. */
export type PortalProfile = {
  displayName: string;
  pronouns: string;
  countryCode: string;
  city: string;
  headline: string;
  biography: string;
  websiteUrl: string;
};

export type PortalLink = {
  id: string;
  label: string;
  url: string;
};

export type CreatorPortal = {
  hasProfile: boolean;
  creatorSlug: string | null;
  displayName: string | null;
  isPublished: boolean;
  /** Null only when the account holds no record at all. */
  profile: PortalProfile | null;
  /** Where the work lives. The editorial desk reads these. */
  links: PortalLink[];
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
  /** What is waiting in the Dossier, for the badge on the portal. */
  dossier: { unread: number; important: number };
  /** Whether this account's address is on the Gazette. */
  gazette: boolean;
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
          links: { orderBy: { position: 'asc' } },
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

  const [dossier, gazette] = await Promise.all([
    getDossierBadge(userId),
    db.gazetteSubscription.findUnique({
      where: { email: user.email },
      select: { status: true },
    }),
  ]);

  return {
    hasProfile: Boolean(user.creator),
    creatorSlug: user.creator?.slug ?? null,
    displayName: user.creator?.displayName ?? null,
    isPublished: user.creator?.isPublished ?? false,
    profile: user.creator
      ? {
          displayName: user.creator.displayName,
          pronouns: user.creator.pronouns ?? '',
          countryCode: user.creator.countryCode,
          city: user.creator.city ?? '',
          headline: user.creator.headline ?? '',
          biography: user.creator.biography ?? '',
          websiteUrl: user.creator.websiteUrl ?? '',
        }
      : null,
    links: (user.creator?.links ?? []).map((link) => ({
      id: link.id,
      label: link.label,
      url: link.url,
    })),
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
    dossier,
    gazette: gazette?.status === 'confirmed',
  };
}
