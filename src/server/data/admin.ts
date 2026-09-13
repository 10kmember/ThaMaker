import 'server-only';
import { prisma } from '@/server/db';
import { rank } from '@/domain/judging';

export type AdminOverview = {
  seasonTitle: string;
  seasonYear: number;
  stage: string;
  counts: {
    nominations: number;
    underReview: number;
    eligible: number;
    judging: number;
    finalists: number;
    winners: number;
    creators: number;
    judges: number;
    openReports: number;
    openConflicts: number;
  };
};

export async function getAdminOverview(): Promise<AdminOverview | null> {
  const db = prisma;
  if (!db) return null;

  const season = await db.awardYear.findFirst({ where: { isCurrent: true } });
  if (!season) return null;

  const [
    nominations,
    underReview,
    eligible,
    judging,
    finalists,
    winners,
    creators,
    judges,
    openReports,
    openConflicts,
  ] = await Promise.all([
    db.nomination.count({ where: { awardYearId: season.id, status: { not: 'draft' } } }),
    db.nomination.count({ where: { awardYearId: season.id, status: 'under_review' } }),
    db.nomination.count({ where: { awardYearId: season.id, status: 'eligible' } }),
    db.judgingAssignment.count({
      where: { nomination: { awardYearId: season.id }, status: { in: ['assigned', 'in_progress'] } },
    }),
    db.honour.count({ where: { awardYearId: season.id, kind: 'finalist', state: 'active' } }),
    db.honour.count({ where: { awardYearId: season.id, kind: 'winner', state: 'active' } }),
    db.creator.count(),
    db.judge.count({ where: { isActive: true } }),
    db.report.count({ where: { status: { in: ['open', 'investigating'] } } }),
    db.judgeConflict.count({ where: { status: 'declared' } }),
  ]);

  return {
    seasonTitle: season.title,
    seasonYear: season.year,
    stage: season.stage,
    counts: {
      nominations,
      underReview,
      eligible,
      judging,
      finalists,
      winners,
      creators,
      judges,
      openReports,
      openConflicts,
    },
  };
}

export type AdminNomination = {
  id: string;
  reference: string;
  creatorName: string;
  creatorSlug: string;
  categoryName: string;
  categorySlug: string;
  status: string;
  source: string;
  integrityScore: number;
  evidenceCount: number;
  submittedAt: string | null;
  verificationStatus: string;
};

export async function listAdminNominations(filter: {
  status?: string;
  year?: number;
}): Promise<AdminNomination[]> {
  const db = prisma;
  if (!db) return [];

  const rows = await db.nomination.findMany({
    where: {
      ...(filter.status ? { status: filter.status as 'under_review' } : {}),
      ...(filter.year ? { awardYear: { year: filter.year } } : { awardYear: { isCurrent: true } }),
    },
    include: {
      creator: { include: { verification: true } },
      category: true,
      _count: { select: { evidence: true } },
    },
    orderBy: [{ integrityScore: 'desc' }, { createdAt: 'desc' }],
    take: 200,
  });

  return rows.map((row) => ({
    id: row.id,
    reference: row.reference,
    creatorName: row.creator.displayName,
    creatorSlug: row.creator.slug,
    categoryName: row.category.name,
    categorySlug: row.category.slug,
    status: row.status,
    source: row.source,
    integrityScore: row.integrityScore,
    evidenceCount: row._count.evidence,
    submittedAt: row.submittedAt?.toISOString() ?? null,
    verificationStatus: row.creator.verification?.status ?? 'unverified',
  }));
}

export type CategoryStanding = {
  categoryId: string;
  categorySlug: string;
  categoryName: string;
  candidates: {
    nominationId: string;
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
      nominations: {
        where: { status: { notIn: ['draft', 'withdrawn', 'ineligible', 'duplicate'] } },
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
      category.nominations.map((nomination) => ({
        nominationId: nomination.id,
        totals: nomination.scores.map((score) => score.total),
      })),
    );
    const byId = new Map(category.nominations.map((nomination) => [nomination.id, nomination]));

    return {
      categoryId: category.id,
      categorySlug: category.slug,
      categoryName: category.name,
      candidates: ranked.map((entry) => {
        const nomination = byId.get(entry.nominationId)!;
        return {
          nominationId: entry.nominationId,
          creatorId: nomination.creatorId,
          creatorName: nomination.creator.displayName,
          judgeCount: entry.judgeCount,
          trimmedMean: entry.trimmedMean,
          spread: entry.spread,
          eligible:
            !nomination.creator.isSuspended &&
            nomination.creator.verification?.status === 'verified',
          honour: nomination.honours[0]?.kind ?? null,
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

export async function listAuditLog(options: { action?: string; limit?: number } = {}): Promise<
  AuditEntry[]
> {
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
    include: { creator: true, nomination: true },
  });

  return rows.map((row) => ({
    id: row.id,
    reason: row.reason,
    status: row.status,
    detail: row.detail,
    subject: row.creator?.displayName ?? row.nomination?.reference ?? 'Unattributed',
    createdAt: row.createdAt.toISOString(),
  }));
}
