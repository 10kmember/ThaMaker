import 'server-only';
import { prisma } from '@/server/db';
import { rank } from '@/domain/judging';

export type AdminOverview = {
  seasonTitle: string;
  seasonYear: number;
  stage: string;
  counts: {
    nominations: number;
    candidacies: number;
    underReview: number;
    eligible: number;
    judging: number;
    finalists: number;
    winners: number;
    creators: number;
    judges: number;
    openReports: number;
    openConflicts: number;
    flagged: number;
  };
};

export async function getAdminOverview(): Promise<AdminOverview | null> {
  const db = prisma;
  if (!db) return null;

  const season = await db.awardYear.findFirst({ where: { isCurrent: true } });
  if (!season) return null;

  const [
    nominations,
    candidacies,
    underReview,
    eligible,
    judging,
    finalists,
    winners,
    creators,
    judges,
    openReports,
    openConflicts,
    flagged,
  ] = await Promise.all([
    db.nomination.count({ where: { candidacy: { awardYearId: season.id }, status: 'counted' } }),
    db.candidacy.count({ where: { awardYearId: season.id } }),
    db.candidacy.count({ where: { awardYearId: season.id, status: 'under_review' } }),
    db.candidacy.count({ where: { awardYearId: season.id, status: 'eligible' } }),
    db.judgingAssignment.count({
      where: {
        candidacy: { awardYearId: season.id },
        status: { in: ['assigned', 'in_progress'] },
      },
    }),
    db.honour.count({ where: { awardYearId: season.id, kind: 'finalist', state: 'active' } }),
    db.honour.count({ where: { awardYearId: season.id, kind: 'winner', state: 'active' } }),
    db.creator.count(),
    db.judge.count({ where: { isActive: true } }),
    db.report.count({ where: { status: { in: ['open', 'investigating'] } } }),
    db.judgeConflict.count({ where: { status: 'declared' } }),
    db.candidacy.count({ where: { awardYearId: season.id, integrityFlag: true } }),
  ]);

  return {
    seasonTitle: season.title,
    seasonYear: season.year,
    stage: season.stage,
    counts: {
      nominations,
      candidacies,
      underReview,
      eligible,
      judging,
      finalists,
      winners,
      creators,
      judges,
      openReports,
      openConflicts,
      flagged,
    },
  };
}

export type AdminCandidacy = {
  id: string;
  reference: string;
  creatorName: string;
  creatorSlug: string;
  categoryName: string;
  categorySlug: string;
  status: string;
  /** Operational only. Never shown to judges, never shown publicly. */
  nominationCount: number;
  referralShare: number;
  integrityFlag: boolean;
  integrityNote: string | null;
  evidenceCount: number;
  firstNominatedAt: string | null;
  lastNominatedAt: string | null;
  verificationStatus: string;
};

export async function listAdminCandidacies(filter: {
  status?: string;
  year?: number;
  flagged?: boolean;
}): Promise<AdminCandidacy[]> {
  const db = prisma;
  if (!db) return [];

  const rows = await db.candidacy.findMany({
    where: {
      ...(filter.status ? { status: filter.status as 'under_review' } : {}),
      ...(filter.flagged ? { integrityFlag: true } : {}),
      ...(filter.year ? { awardYear: { year: filter.year } } : { awardYear: { isCurrent: true } }),
    },
    include: {
      creator: { include: { verification: true } },
      category: true,
      _count: { select: { evidence: true } },
      nominations: { where: { status: 'counted' }, select: { source: true } },
    },
    orderBy: [{ integrityFlag: 'desc' }, { nominationCount: 'desc' }, { createdAt: 'desc' }],
    take: 200,
  });

  return rows.map((row) => {
    const counted = row.nominations.length;
    const referrals = row.nominations.filter((entry) => entry.source === 'referral').length;
    return {
      id: row.id,
      reference: row.reference,
      creatorName: row.creator.displayName,
      creatorSlug: row.creator.slug,
      categoryName: row.category.name,
      categorySlug: row.category.slug,
      status: row.status,
      nominationCount: row.nominationCount,
      referralShare: counted > 0 ? Math.round((referrals / counted) * 100) : 0,
      integrityFlag: row.integrityFlag,
      integrityNote: row.integrityNote,
      evidenceCount: row._count.evidence,
      firstNominatedAt: row.firstNominatedAt?.toISOString() ?? null,
      lastNominatedAt: row.lastNominatedAt?.toISOString() ?? null,
      verificationStatus: row.creator.verification?.status ?? 'unverified',
    };
  });
}

export type CategoryStanding = {
  categoryId: string;
  categorySlug: string;
  categoryName: string;
  candidates: {
    candidacyId: string;
    creatorId: string;
    creatorName: string;
    judgeCount: number;
    trimmedMean: number;
    spread: number;
    eligible: boolean;
    honour: string | null;
  }[];
};

/**
 * The standings an administrator sees when selecting finalists and winners.
 * Aggregation happens here so the UI never has to hold raw judge scores.
 */
export async function getCategoryStandings(year: number): Promise<CategoryStanding[]> {
  const db = prisma;
  if (!db) return [];

  const categories = await db.category.findMany({
    where: { awardYear: { year } },
    orderBy: { position: 'asc' },
    include: {
      candidacies: {
        where: { status: { notIn: ['withdrawn', 'ineligible'] } },
        include: {
          creator: { include: { verification: true } },
          scores: { select: { total: true } },
          honours: { where: { state: 'active' }, select: { kind: true } },
        },
      },
    },
  });

  return categories.map((category) => {
    const ranked = rank(
      category.candidacies.map((candidacy) => ({
        candidacyId: candidacy.id,
        totals: candidacy.scores.map((score) => score.total),
      })),
    );
    const byId = new Map(category.candidacies.map((candidacy) => [candidacy.id, candidacy]));

    return {
      categoryId: category.id,
      categorySlug: category.slug,
      categoryName: category.name,
      candidates: ranked.map((entry) => {
        const candidacy = byId.get(entry.candidacyId)!;
        return {
          candidacyId: entry.candidacyId,
          creatorId: candidacy.creatorId,
          creatorName: candidacy.creator.displayName,
          judgeCount: entry.judgeCount,
          trimmedMean: entry.trimmedMean,
          spread: entry.spread,
          eligible:
            !candidacy.creator.isSuspended && candidacy.creator.verification?.status === 'verified',
          honour: candidacy.honours[0]?.kind ?? null,
        };
      }),
    };
  });
}

export type AuditEntry = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  actorLabel: string | null;
  actorRole: string | null;
  summary: string | null;
  createdAt: string;
};

export async function listAuditLog(
  options: { action?: string; limit?: number } = {},
): Promise<AuditEntry[]> {
  const db = prisma;
  if (!db) return [];

  const rows = await db.auditLog.findMany({
    where: options.action ? { action: options.action } : undefined,
    orderBy: { createdAt: 'desc' },
    take: options.limit ?? 100,
  });

  return rows.map((row) => ({
    id: row.id,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    actorLabel: row.actorLabel,
    actorRole: row.actorRole,
    summary: row.summary,
    createdAt: row.createdAt.toISOString(),
  }));
}

export type ReportEntry = {
  id: string;
  reason: string;
  status: string;
  detail: string;
  subject: string;
  createdAt: string;
};

export async function listReports(): Promise<ReportEntry[]> {
  const db = prisma;
  if (!db) return [];

  const rows = await db.report.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { creator: true, candidacy: true },
  });

  return rows.map((row) => ({
    id: row.id,
    reason: row.reason,
    status: row.status,
    detail: row.detail,
    subject: row.creator?.displayName ?? row.candidacy?.reference ?? 'Unattributed',
    createdAt: row.createdAt.toISOString(),
  }));
}
