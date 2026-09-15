import 'server-only';
import { prisma } from '@/server/db';
import { byUrgency, momentumFor, type CategoryMomentum } from '@/domain/momentum';

/**
 * The command centre's read layer.
 *
 * Everything here counts the same rows the public site, the creator portal,
 * the judging room and the operations queues read. There is no reporting
 * database, no nightly rollup and no second copy of the truth — a statistic
 * that disagrees with the page it summarises is worse than no statistic.
 *
 * Period filtering is applied at the query, not in JavaScript over a fetched
 * array, so a wider window costs the database more and the process nothing.
 */

export const PERIODS = ['7d', '30d', '90d', 'season', 'all'] as const;
export type Period = (typeof PERIODS)[number];

export const PERIOD_LABEL: Record<Period, string> = {
  '7d': '7 days',
  '30d': '30 days',
  '90d': '90 days',
  season: 'This season',
  all: 'All time',
};

export function isPeriod(value: string | undefined): value is Period {
  return Boolean(value) && (PERIODS as readonly string[]).includes(value as string);
}

/** Resolves a period to a cutoff. `null` means no lower bound. */
export async function periodStart(period: Period): Promise<Date | null> {
  const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : null;
  if (days) return new Date(Date.now() - days * 86_400_000);

  if (period === 'season') {
    const season = await prisma.awardYear.findFirst({ where: { isCurrent: true } });
    return season?.nominationsOpenAt ?? season?.createdAt ?? null;
  }

  return null;
}

export type CreatorStats = {
  total: number;
  added: number;
  claimed: number;
  unclaimed: number;
  verified: number;
  verificationPending: number;
  suspended: number;
  unpublished: number;
};

export type AwardStats = {
  seasonTitle: string;
  seasonYear: number;
  stage: string;
  categories: number;
  nominations: number;
  eligible: number;
  finalists: number;
  winners: number;
  awaitingFinalisation: number;
};

export type OperationsStats = {
  openClaims: number;
  escalations: number;
  verificationQueue: number;
  reports: number;
  openConflicts: number;
  unassignedJudging: number;
};

export type PlatformStats = {
  accounts: number;
  newAccounts: number;
  activeSessions: number;
  nominationActivity: number;
  claimActivity: number;
  auditEvents: number;
  emailsQueued: number;
};

export type CommandCentre = {
  period: Period;
  since: string | null;
  creators: CreatorStats;
  awards: AwardStats | null;
  operations: OperationsStats;
  platform: PlatformStats;
};

export async function getCommandCentre(period: Period): Promise<CommandCentre> {
  const since = await periodStart(period);
  const window = since ? { gte: since } : undefined;

  const season = await prisma.awardYear.findFirst({ where: { isCurrent: true } });

  const [
    creatorsTotal,
    creatorsAdded,
    creatorsClaimed,
    creatorsVerified,
    creatorsPending,
    creatorsSuspended,
    creatorsUnpublished,
    accounts,
    newAccounts,
    activeSessions,
    nominationActivity,
    claimActivity,
    auditEvents,
    openClaims,
    escalations,
    verificationQueue,
    reports,
    openConflicts,
    unassignedJudging,
  ] = await Promise.all([
    prisma.creator.count(),
    prisma.creator.count({ where: window ? { createdAt: window } : {} }),
    prisma.creator.count({ where: { userId: { not: null } } }),
    prisma.creatorVerification.count({ where: { status: 'verified' } }),
    prisma.creatorVerification.count({ where: { status: 'pending' } }),
    prisma.creator.count({ where: { isSuspended: true } }),
    prisma.creator.count({ where: { isPublished: false } }),
    prisma.user.count(),
    prisma.user.count({ where: window ? { createdAt: window } : {} }),
    prisma.authSession.count({ where: { revokedAt: null, expiresAt: { gt: new Date() } } }),
    prisma.nomination.count({ where: window ? { createdAt: window } : {} }),
    prisma.creatorClaim.count({ where: window ? { createdAt: window } : {} }),
    prisma.auditLog.count({ where: window ? { createdAt: window } : {} }),
    prisma.creatorClaim.count({ where: { status: { in: ['submitted', 'awaiting_information'] } } }),
    prisma.creatorClaim.count({ where: { status: 'escalated' } }),
    prisma.verificationCase.count({ where: { status: { in: ['open', 'awaiting_information'] } } }),
    prisma.report.count({ where: { status: { in: ['open', 'investigating'] } } }),
    prisma.judgeConflict.count({ where: { status: 'declared' } }),
    prisma.judgingAssignment.count({ where: { status: { in: ['assigned', 'in_progress'] } } }),
  ]);

  let awards: AwardStats | null = null;

  if (season) {
    const [categories, nominations, eligible, finalists, winners, scored] = await Promise.all([
      prisma.category.count({ where: { awardYearId: season.id } }),
      prisma.nomination.count({
        where: { candidacy: { awardYearId: season.id }, status: 'counted' },
      }),
      prisma.candidacy.count({ where: { awardYearId: season.id, status: 'eligible' } }),
      prisma.honour.count({ where: { awardYearId: season.id, kind: 'finalist', state: 'active' } }),
      prisma.honour.count({ where: { awardYearId: season.id, kind: 'winner', state: 'active' } }),
      prisma.candidacy.count({
        where: { awardYearId: season.id, scores: { some: {} }, honours: { none: {} } },
      }),
    ]);

    awards = {
      seasonTitle: season.title,
      seasonYear: season.year,
      stage: season.stage,
      categories,
      nominations,
      eligible,
      finalists,
      winners,
      awaitingFinalisation: scored,
    };
  }

  return {
    period,
    since: since?.toISOString() ?? null,
    creators: {
      total: creatorsTotal,
      added: creatorsAdded,
      claimed: creatorsClaimed,
      unclaimed: creatorsTotal - creatorsClaimed,
      verified: creatorsVerified,
      verificationPending: creatorsPending,
      suspended: creatorsSuspended,
      unpublished: creatorsUnpublished,
    },
    awards,
    operations: {
      openClaims,
      escalations,
      verificationQueue,
      reports,
      openConflicts,
      unassignedJudging,
    },
    platform: {
      accounts,
      newAccounts,
      activeSessions,
      nominationActivity,
      claimActivity,
      auditEvents,
      emailsQueued: 0,
    },
  };
}

// ── Analytics ────────────────────────────────────────────────────────────────

export type SeasonComparison = {
  year: number;
  title: string;
  stage: string;
  nominations: number;
  candidacies: number;
  categories: number;
  finalists: number;
  winners: number;
  creators: number;
  returningCreators: number;
  newCreators: number;
};

export async function compareSeasons(): Promise<SeasonComparison[]> {
  const seasons = await prisma.awardYear.findMany({ orderBy: { year: 'asc' } });
  const out: SeasonComparison[] = [];
  const seen = new Set<string>();

  for (const season of seasons) {
    const [nominations, candidacies, categories, finalists, winners, creatorRows] =
      await Promise.all([
        prisma.nomination.count({
          where: { candidacy: { awardYearId: season.id }, status: 'counted' },
        }),
        prisma.candidacy.count({ where: { awardYearId: season.id } }),
        prisma.category.count({ where: { awardYearId: season.id } }),
        prisma.honour.count({
          where: { awardYearId: season.id, kind: 'finalist', state: 'active' },
        }),
        prisma.honour.count({ where: { awardYearId: season.id, kind: 'winner', state: 'active' } }),
        prisma.candidacy.findMany({
          where: { awardYearId: season.id },
          select: { creatorId: true },
          distinct: ['creatorId'],
        }),
      ]);

    // Returning means PALMA has considered this creator in an earlier season.
    let returning = 0;
    for (const row of creatorRows) {
      if (seen.has(row.creatorId)) returning += 1;
    }
    for (const row of creatorRows) seen.add(row.creatorId);

    out.push({
      year: season.year,
      title: season.title,
      stage: season.stage,
      nominations,
      candidacies,
      categories,
      finalists,
      winners,
      creators: creatorRows.length,
      returningCreators: returning,
      newCreators: creatorRows.length - returning,
    });
  }

  return out;
}

export type NominationAnalytics = {
  byDay: { label: string; values: number[] }[];
  bySource: { label: string; value: number }[];
  byStatus: { label: string; value: number }[];
  byCategory: { label: string; value: number }[];
  funnel: { label: string; value: number }[];
  integrityFlagged: number;
  duplicatesRefused: number;
};

export async function getNominationAnalytics(period: Period): Promise<NominationAnalytics> {
  const since = await periodStart(period);
  const where = since ? { createdAt: { gte: since } } : {};

  const [rows, categories, candidacies, flagged] = await Promise.all([
    prisma.nomination.findMany({
      where,
      select: { createdAt: true, source: true, status: true },
      orderBy: { createdAt: 'asc' },
      take: 20_000,
    }),
    prisma.category.findMany({
      select: {
        name: true,
        candidacies: { select: { nominationCount: true } },
      },
    }),
    prisma.candidacy.count(),
    prisma.candidacy.count({ where: { integrityFlag: true } }),
  ]);

  // Bucket by day, oldest first, with empty days preserved so a quiet week
  // reads as quiet rather than as a gap in the data.
  const buckets = new Map<string, { organic: number; referral: number }>();
  const start = since ?? rows[0]?.createdAt ?? new Date();
  const days = Math.min(120, Math.max(1, Math.ceil((Date.now() - start.getTime()) / 86_400_000)));

  for (let index = days - 1; index >= 0; index -= 1) {
    const day = new Date(Date.now() - index * 86_400_000).toISOString().slice(0, 10);
    buckets.set(day, { organic: 0, referral: 0 });
  }

  for (const row of rows) {
    const day = row.createdAt.toISOString().slice(0, 10);
    const bucket = buckets.get(day);
    if (!bucket) continue;
    if (row.source === 'referral') bucket.referral += 1;
    else bucket.organic += 1;
  }

  const counted = rows.filter((row) => row.status === 'counted').length;
  const rejected = rows.filter((row) => row.status === 'rejected').length;
  const pending = rows.filter((row) => row.status === 'pending_verification').length;

  return {
    byDay: [...buckets.entries()].map(([day, value]) => ({
      label: day.slice(5),
      values: [value.organic, value.referral],
    })),
    bySource: [
      { label: 'Organic', value: rows.filter((row) => row.source === 'organic').length },
      { label: 'Referral', value: rows.filter((row) => row.source === 'referral').length },
    ],
    byStatus: [
      { label: 'Counted', value: counted },
      { label: 'Awaiting verification', value: pending },
      { label: 'Rejected', value: rejected },
    ],
    byCategory: categories
      .map((category) => ({
        label: category.name,
        value: category.candidacies.reduce((sum, entry) => sum + entry.nominationCount, 0),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10),
    funnel: [
      { label: 'Nominations submitted', value: rows.length },
      { label: 'Verified and counted', value: counted },
      { label: 'Candidacies formed', value: candidacies },
    ],
    integrityFlagged: flagged,
    duplicatesRefused: rejected,
  };
}

export type CreatorAnalytics = {
  claimed: { label: string; value: number }[];
  verification: { label: string; value: number }[];
  byCountry: { label: string; value: number }[];
  honoursHeld: { label: string; value: number }[];
};

export async function getCreatorAnalytics(): Promise<CreatorAnalytics> {
  const creators = await prisma.creator.findMany({
    select: {
      countryCode: true,
      userId: true,
      verification: { select: { status: true } },
      honours: { where: { state: 'active' }, select: { kind: true } },
    },
  });

  const countries = new Map<string, number>();
  for (const creator of creators) {
    countries.set(creator.countryCode, (countries.get(creator.countryCode) ?? 0) + 1);
  }

  const statuses = new Map<string, number>();
  for (const creator of creators) {
    const status = creator.verification?.status ?? 'unverified';
    statuses.set(status, (statuses.get(status) ?? 0) + 1);
  }

  const claimedCount = creators.filter((creator) => creator.userId).length;

  return {
    claimed: [
      { label: 'Claimed', value: claimedCount },
      { label: 'Unclaimed', value: creators.length - claimedCount },
    ],
    verification: [...statuses.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value),
    byCountry: [...countries.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10),
    honoursHeld: [
      {
        label: 'Holds a winner',
        value: creators.filter((c) => c.honours.some((h) => h.kind === 'winner')).length,
      },
      {
        label: 'Finalist only',
        value: creators.filter(
          (c) =>
            c.honours.some((h) => h.kind === 'finalist') &&
            !c.honours.some((h) => h.kind === 'winner'),
        ).length,
      },
      {
        label: 'No honour yet',
        value: creators.filter((c) => c.honours.length === 0).length,
      },
    ],
  };
}

export type AwardsAnalytics = {
  participation: { label: string; value: number }[];
  conversion: { label: string; value: number }[];
  repeatWinners: number;
  firstTimeWinners: number;
  winnersByCategory: { label: string; value: number }[];
};

export async function getAwardsAnalytics(): Promise<AwardsAnalytics> {
  const [categories, winners, candidacies, finalists] = await Promise.all([
    prisma.category.findMany({
      select: { name: true, candidacies: { select: { id: true } } },
    }),
    prisma.honour.findMany({
      where: { kind: 'winner', state: 'active' },
      select: { creatorId: true, category: { select: { name: true } } },
    }),
    prisma.candidacy.count(),
    prisma.honour.count({ where: { kind: 'finalist', state: 'active' } }),
  ]);

  const winsPerCreator = new Map<string, number>();
  for (const winner of winners) {
    winsPerCreator.set(winner.creatorId, (winsPerCreator.get(winner.creatorId) ?? 0) + 1);
  }

  const byCategory = new Map<string, number>();
  for (const winner of winners) {
    // Winners only, so every row has a category. THE PALMA is not counted
    // here and should not be: it is not won in a category, and adding it to a
    // per-category breakdown would invent a thirteenth column.
    const name = winner.category?.name;
    if (!name) continue;
    byCategory.set(name, (byCategory.get(name) ?? 0) + 1);
  }

  return {
    participation: categories
      .map((category) => ({ label: category.name, value: category.candidacies.length }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10),
    conversion: [
      { label: 'Candidacies', value: candidacies },
      { label: 'Finalists', value: finalists },
      { label: 'Winners', value: winners.length },
    ],
    repeatWinners: [...winsPerCreator.values()].filter((count) => count > 1).length,
    firstTimeWinners: [...winsPerCreator.values()].filter((count) => count === 1).length,
    winnersByCategory: [...byCategory.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value),
  };
}

export type OperationalAnalytics = {
  claimOutcomes: { label: string; value: number }[];
  averageClaimReviewHours: number | null;
  verificationOutcomes: { label: string; value: number }[];
  averageVerificationHours: number | null;
  staffWorkload: { label: string; value: number }[];
  enforcement: { label: string; value: number }[];
};

export async function getOperationalAnalytics(): Promise<OperationalAnalytics> {
  const [claims, cases, audit, moderation] = await Promise.all([
    prisma.creatorClaim.findMany({
      select: {
        status: true,
        createdAt: true,
        decidedAt: true,
        decidedBy: { select: { email: true } },
      },
    }),
    prisma.verificationCase.findMany({
      select: { status: true, openedAt: true, decidedAt: true },
    }),
    prisma.auditLog.findMany({
      where: { actorLabel: { not: null } },
      select: { actorLabel: true },
      take: 5_000,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.moderationAction.groupBy({ by: ['kind'], _count: { _all: true } }),
  ]);

  const hours = (rows: { from: Date; to: Date | null }[]) => {
    const settled = rows.filter((row) => row.to);
    if (settled.length === 0) return null;
    const total = settled.reduce(
      (sum, row) => sum + ((row.to as Date).getTime() - row.from.getTime()),
      0,
    );
    return Math.round((total / settled.length / 3_600_000) * 10) / 10;
  };

  const workload = new Map<string, number>();
  for (const entry of audit) {
    if (!entry.actorLabel) continue;
    workload.set(entry.actorLabel, (workload.get(entry.actorLabel) ?? 0) + 1);
  }

  const claimStatuses = new Map<string, number>();
  for (const claim of claims) {
    claimStatuses.set(claim.status, (claimStatuses.get(claim.status) ?? 0) + 1);
  }

  const caseStatuses = new Map<string, number>();
  for (const entry of cases) {
    caseStatuses.set(entry.status, (caseStatuses.get(entry.status) ?? 0) + 1);
  }

  return {
    claimOutcomes: [...claimStatuses.entries()].map(([label, value]) => ({ label, value })),
    averageClaimReviewHours: hours(
      claims.map((claim) => ({ from: claim.createdAt, to: claim.decidedAt })),
    ),
    verificationOutcomes: [...caseStatuses.entries()].map(([label, value]) => ({ label, value })),
    averageVerificationHours: hours(
      cases.map((entry) => ({ from: entry.openedAt, to: entry.decidedAt })),
    ),
    staffWorkload: [...workload.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8),
    enforcement: moderation.map((row) => ({
      label: row.kind.replace(/_/g, ' '),
      value: row._count._all,
    })),
  };
}

/**
 * Category momentum.
 *
 * The one question a category list cannot answer on its own: which of these do
 * people actually want? Counts alone say which category is biggest, which is
 * mostly a fact about how long it has existed. Momentum compares a window
 * against the window immediately before it, and pairs that with how widely the
 * interest is spread — because a category surging on one creator's audience and
 * a category surging across forty are the same number and opposite findings.
 *
 * Internal only, and the module it calls into explains at length why. These
 * figures are for deciding what next season's categories should be, not for
 * ranking anybody, and nothing in the judging path reads them.
 */
export type MomentumReport = {
  /** The window these figures cover, and the one they are compared against. */
  window: { days: number; from: string; comparedFrom: string } | null;
  seasonYear: number | null;
  rows: CategoryMomentum[];
};

export async function getCategoryMomentum(period: Period): Promise<MomentumReport> {
  const season = await prisma.awardYear.findFirst({
    where: { isCurrent: true },
    select: { id: true, year: true },
  });

  if (!season) return { window: null, seasonYear: null, rows: [] };

  const since = await periodStart(period);

  // "All time" and "this season" have no earlier window to compare against, so
  // momentum is measured over the season's own length against the equivalent
  // stretch before it. A comparison against nothing is not a comparison.
  const days = since ? Math.max(1, Math.ceil((Date.now() - since.getTime()) / 86_400_000)) : 30;
  const from = since ?? new Date(Date.now() - days * 86_400_000);
  const comparedFrom = new Date(from.getTime() - days * 86_400_000);

  const categories = await prisma.category.findMany({
    where: { awardYearId: season.id },
    select: {
      id: true,
      name: true,
      slug: true,
      position: true,
      candidacies: {
        select: {
          id: true,
          nominationCount: true,
        },
      },
    },
    orderBy: { position: 'asc' },
  });

  const candidacyToCategory = new Map<string, string>();
  for (const category of categories) {
    for (const candidacy of category.candidacies) {
      candidacyToCategory.set(candidacy.id, category.id);
    }
  }

  // One pass over the two windows rather than a query per category. Only
  // counted nominations are read: a nomination awaiting its verification code
  // is not yet a signal about anything, and a rejected one never was.
  const nominations = await prisma.nomination.findMany({
    where: {
      status: 'counted',
      candidacyId: { in: [...candidacyToCategory.keys()] },
      createdAt: { gte: comparedFrom },
    },
    select: { candidacyId: true, nominatorId: true, createdAt: true },
    take: 50_000,
  });

  const current = new Map<string, number>();
  const previous = new Map<string, number>();
  const nominators = new Map<string, Set<string>>();

  for (const row of nominations) {
    const categoryId = candidacyToCategory.get(row.candidacyId);
    if (!categoryId) continue;

    if (row.createdAt >= from) {
      current.set(categoryId, (current.get(categoryId) ?? 0) + 1);
      const seen = nominators.get(categoryId) ?? new Set<string>();
      seen.add(row.nominatorId);
      nominators.set(categoryId, seen);
    } else {
      previous.set(categoryId, (previous.get(categoryId) ?? 0) + 1);
    }
  }

  const rows = categories.map((category) =>
    momentumFor({
      categoryId: category.id,
      name: category.name,
      slug: category.slug,
      current: current.get(category.id) ?? 0,
      previous: previous.get(category.id) ?? 0,
      nominators: nominators.get(category.id)?.size ?? 0,
      // Concentration is read from the season's standing totals, not the
      // window: whether one creator holds a category is a fact about the
      // category, not about the last thirty days of it.
      spread: category.candidacies.map((candidacy) => candidacy.nominationCount),
    }),
  );

  return {
    seasonYear: season.year,
    window: {
      days,
      from: from.toISOString(),
      comparedFrom: comparedFrom.toISOString(),
    },
    rows: byUrgency(rows),
  };
}
