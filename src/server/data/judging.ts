import 'server-only';
import { prisma } from '@/server/db';
import { prepareEligibility, caseIsClear, type EligibilityCheck } from '@/domain/case-file';
import { honourCategoryName } from '@/domain/honours';

/**
 * The judging room's read layer.
 *
 * Two rules govern everything here. First, a judge may only ever load their
 * own work: the judgeId is part of the query, never a check applied after the
 * rows come back. Second, nomination volume never leaves this file — it is not
 * selected, not mapped, and not returned, so it cannot reach a judge's screen
 * by accident.
 */

export type AssignmentSummary = {
  id: string;
  status: 'assigned' | 'in_progress' | 'completed' | 'recused' | 'reassigned';
  candidacyId: string;
  reference: string;
  creatorName: string;
  creatorSlug: string;
  categoryName: string;
  categorySlug: string;
  year: number;
  assignedAt: string;
  completedAt: string | null;
};

export type CategoryWorkload = {
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  assigned: number;
  completed: number;
  /** The next case in this category awaiting the judge, if there is one. */
  nextAssignmentId: string | null;
};

export type JudgeOverview = {
  judgeName: string;
  isChair: boolean;
  season: {
    year: number;
    title: string;
    stage: string;
    closesAt: string | null;
    daysRemaining: number | null;
  };
  counts: { assigned: number; completed: number; remaining: number; recused: number };
  categories: CategoryWorkload[];
  toReview: AssignmentSummary[];
  inProgress: AssignmentSummary[];
  completed: AssignmentSummary[];
  recused: AssignmentSummary[];
  notifications: {
    id: string;
    subject: string;
    body: string;
    href: string | null;
    createdAt: string;
    readAt: string | null;
  }[];
};

function days(from: Date, to: Date): number {
  return Math.ceil((to.getTime() - from.getTime()) / 86_400_000);
}

export async function getJudgeOverview(
  judgeId: string,
  userId: string,
): Promise<JudgeOverview | null> {
  const judge = await prisma.judge.findUnique({
    where: { id: judgeId },
    include: { memberships: { include: { awardYear: true } } },
  });

  if (!judge) return null;

  // The season the judge is shown is the current one — unless they have no work
  // in it yet, in which case showing an empty page would be unhelpful and the
  // most recent season they actually judged is shown instead.
  const currentSeason = await prisma.awardYear.findFirst({ where: { isCurrent: true } });

  const hasWorkInCurrent = currentSeason
    ? (await prisma.judgingAssignment.count({
        where: { judgeId, candidacy: { awardYearId: currentSeason.id } },
      })) > 0
    : false;

  const latestAssignment = hasWorkInCurrent
    ? null
    : await prisma.judgingAssignment.findFirst({
        where: { judgeId },
        include: { candidacy: { include: { awardYear: true } } },
        orderBy: { assignedAt: 'desc' },
      });

  const current = hasWorkInCurrent
    ? currentSeason
    : (latestAssignment?.candidacy.awardYear ??
      currentSeason ??
      judge.memberships
        .map((membership) => membership.awardYear)
        .sort((a, b) => b.year - a.year)[0] ??
      null);

  const assignments = await prisma.judgingAssignment.findMany({
    where: {
      judgeId,
      ...(current ? { candidacy: { awardYearId: current.id } } : {}),
    },
    include: {
      candidacy: { include: { creator: true, awardYear: true } },
      category: true,
    },
    orderBy: { assignedAt: 'asc' },
  });

  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 6,
  });

  const map = (assignment: (typeof assignments)[number]): AssignmentSummary => ({
    id: assignment.id,
    status: assignment.status,
    candidacyId: assignment.candidacyId,
    reference: assignment.candidacy.reference,
    creatorName: assignment.candidacy.creator.displayName,
    creatorSlug: assignment.candidacy.creator.slug,
    categoryName: assignment.category.name,
    categorySlug: assignment.category.slug,
    year: assignment.candidacy.awardYear.year,
    assignedAt: assignment.assignedAt.toISOString(),
    completedAt: assignment.completedAt?.toISOString() ?? null,
  });

  const toReview = assignments.filter((a) => a.status === 'assigned').map(map);
  const inProgress = assignments.filter((a) => a.status === 'in_progress').map(map);
  const completed = assignments.filter((a) => a.status === 'completed').map(map);
  const recused = assignments.filter((a) => a.status === 'recused').map(map);

  const byCategory = new Map<string, CategoryWorkload>();
  for (const assignment of assignments) {
    if (assignment.status === 'recused' || assignment.status === 'reassigned') continue;

    const existing = byCategory.get(assignment.categoryId) ?? {
      categoryId: assignment.categoryId,
      categoryName: assignment.category.name,
      categorySlug: assignment.category.slug,
      assigned: 0,
      completed: 0,
      nextAssignmentId: null,
    };

    existing.assigned += 1;
    if (assignment.status === 'completed') existing.completed += 1;
    else if (!existing.nextAssignmentId) existing.nextAssignmentId = assignment.id;

    byCategory.set(assignment.categoryId, existing);
  }

  const closesAt = current?.finalistsAt ?? current?.ceremonyAt ?? null;

  return {
    judgeName: judge.displayName,
    isChair: judge.memberships.some((membership) => membership.isChair),
    season: {
      year: current?.year ?? new Date().getUTCFullYear(),
      title: current?.title ?? 'PALMA',
      stage: current?.stage ?? 'announced',
      closesAt: closesAt?.toISOString() ?? null,
      daysRemaining: closesAt ? Math.max(0, days(new Date(), closesAt)) : null,
    },
    counts: {
      assigned: toReview.length + inProgress.length + completed.length,
      completed: completed.length,
      remaining: toReview.length + inProgress.length,
      recused: recused.length,
    },
    categories: [...byCategory.values()].sort((a, b) =>
      a.categoryName.localeCompare(b.categoryName),
    ),
    toReview,
    inProgress,
    completed,
    recused,
    notifications: notifications.map((notification) => ({
      id: notification.id,
      subject: notification.subject,
      body: notification.body,
      href: notification.href,
      createdAt: notification.createdAt.toISOString(),
      readAt: notification.readAt?.toISOString() ?? null,
    })),
  };
}

export type JudgingCase = {
  assignmentId: string;
  status: string;
  candidacyId: string;
  reference: string;
  year: number;
  seasonTitle: string;

  category: { name: string; slug: string; criteria: string; eligibility: string };

  candidate: {
    name: string;
    slug: string;
    pronouns: string | null;
    country: string;
    city: string | null;
    headline: string | null;
    biography: string | null;
    isVerified: boolean;
    verifiedAt: string | null;
    links: { label: string; url: string }[];
    /** Previous PALMA recognition, with the code that makes each checkable. */
    palmaRecord: { year: number; kind: string; categoryName: string; code: string | null }[];
  };

  /** PALMA's own screening result, presented as a settled checklist. */
  eligibility: EligibilityCheck[];
  isClear: boolean;
  screenedAt: string | null;
  screeningNote: string | null;

  /** What the audience said — never how many said it. */
  audienceVoices: string[];

  evidence: { id: string; kind: string; label: string; url: string | null; note: string | null }[];

  alreadyScored: boolean;
  conflictDeclared: boolean;
};

/**
 * A judge may only ever load their own assignment. The judgeId is part of the
 * query, not checked afterwards.
 */
export async function getJudgingCase(
  assignmentId: string,
  judgeId: string,
): Promise<JudgingCase | null> {
  const assignment = await prisma.judgingAssignment.findFirst({
    where: { id: assignmentId, judgeId },
    include: {
      category: true,
      score: { select: { id: true } },
      candidacy: {
        include: {
          awardYear: true,
          evidence: { orderBy: { createdAt: 'asc' } },
          creator: {
            include: {
              verification: true,
              links: { orderBy: { position: 'asc' } },
              achievements: { select: { code: true, year: true, categoryName: true } },
              honours: {
                where: { state: 'active' },
                include: { awardYear: true, category: true },
                orderBy: { createdAt: 'desc' },
              },
            },
          },
          // A handful of nomination reasons, oldest first, with no count and
          // no nominator attached: judges see the argument, not the crowd.
          nominations: {
            where: { status: 'counted' },
            select: { reason: true },
            orderBy: { countedAt: 'asc' },
            take: 5,
          },
        },
      },
    },
  });

  if (!assignment) return null;

  const { candidacy } = assignment;
  const { creator } = candidacy;

  const openedAt = candidacy.awardYear.nominationsOpenAt;
  const closedAt = candidacy.awardYear.nominationsCloseAt;
  const nominatedAt = candidacy.firstNominatedAt ?? candidacy.createdAt;
  const withinSubmissionWindow =
    (!openedAt || nominatedAt >= openedAt) && (!closedAt || nominatedAt <= closedAt);

  const eligibility = prepareEligibility({
    verificationStatus: creator.verification?.status ?? 'unverified',
    verifiedAt: creator.verification?.verifiedAt?.toISOString() ?? null,
    candidacyStatus: candidacy.status,
    withinSubmissionWindow,
    evidenceCount: candidacy.evidence.length,
    hasNominationReason: candidacy.nominations.length > 0,
    integrityFlag: candidacy.integrityFlag,
    reviewedAt: candidacy.reviewedAt?.toISOString() ?? null,
  });

  const conflict = await prisma.judgeConflict.findFirst({
    where: { judgeId, candidacyId: candidacy.id, status: { not: 'dismissed' } },
    select: { id: true },
  });

  return {
    assignmentId: assignment.id,
    status: assignment.status,
    candidacyId: candidacy.id,
    reference: candidacy.reference,
    year: candidacy.awardYear.year,
    seasonTitle: candidacy.awardYear.title,

    category: {
      name: assignment.category.name,
      slug: assignment.category.slug,
      criteria: assignment.category.judgingCriteria,
      eligibility: assignment.category.eligibility,
    },

    candidate: {
      name: creator.displayName,
      slug: creator.slug,
      pronouns: creator.pronouns,
      country: creator.countryCode,
      city: creator.city,
      headline: creator.headline,
      biography: creator.biography,
      isVerified: creator.verification?.status === 'verified',
      verifiedAt: creator.verification?.verifiedAt?.toISOString() ?? null,
      links: creator.links.map((link) => ({ label: link.label, url: link.url })),
      palmaRecord: creator.honours.map((honour) => ({
        year: honour.awardYear.year,
        kind: honour.kind,
        categoryName: honourCategoryName(honour.kind, honour.category?.name ?? null),
        code:
          creator.achievements.find(
            (achievement) =>
              achievement.year === honour.awardYear.year &&
              achievement.categoryName ===
                honourCategoryName(honour.kind, honour.category?.name ?? null),
          )?.code ?? null,
      })),
    },

    eligibility,
    isClear: caseIsClear(eligibility),
    screenedAt: candidacy.reviewedAt?.toISOString() ?? null,
    screeningNote: candidacy.reviewNote,

    audienceVoices: candidacy.nominations.map((entry) => entry.reason),

    evidence: candidacy.evidence.map((item) => ({
      id: item.id,
      kind: item.kind,
      label: item.label,
      url: item.url,
      note: item.note,
    })),

    alreadyScored: Boolean(assignment.score),
    conflictDeclared: Boolean(conflict) || assignment.status === 'recused',
  };
}

export type JudgeHistorySeason = {
  year: number;
  title: string;
  categories: { categoryName: string; assigned: number; completed: number }[];
  completed: number;
  assigned: number;
};

/** The judge's institutional record. Not a trophy cabinet — a service record. */
export async function getJudgeHistory(judgeId: string): Promise<JudgeHistorySeason[]> {
  const assignments = await prisma.judgingAssignment.findMany({
    where: { judgeId, status: { in: ['assigned', 'in_progress', 'completed'] } },
    include: { candidacy: { include: { awardYear: true } }, category: true },
  });

  const seasons = new Map<
    number,
    JudgeHistorySeason & { byCategory: Map<string, [number, number]> }
  >();

  for (const assignment of assignments) {
    const { year, title } = assignment.candidacy.awardYear;
    const season = seasons.get(year) ?? {
      year,
      title,
      categories: [],
      completed: 0,
      assigned: 0,
      byCategory: new Map<string, [number, number]>(),
    };

    season.assigned += 1;
    if (assignment.status === 'completed') season.completed += 1;

    const [assigned, completed] = season.byCategory.get(assignment.category.name) ?? [0, 0];
    season.byCategory.set(assignment.category.name, [
      assigned + 1,
      completed + (assignment.status === 'completed' ? 1 : 0),
    ]);

    seasons.set(year, season);
  }

  return [...seasons.values()]
    .map((season) => ({
      year: season.year,
      title: season.title,
      assigned: season.assigned,
      completed: season.completed,
      categories: [...season.byCategory.entries()]
        .map(([categoryName, [assigned, completed]]) => ({ categoryName, assigned, completed }))
        .sort((a, b) => a.categoryName.localeCompare(b.categoryName)),
    }))
    .sort((a, b) => b.year - a.year);
}

export type JudgeAccount = {
  displayName: string;
  title: string | null;
  organisation: string | null;
  biography: string | null;
  countryCode: string | null;
  email: string;
  emailVerified: boolean;
  lastLoginAt: string | null;
  seatedSince: string;
  seasons: { year: number; isChair: boolean }[];
  sessions: {
    id: string;
    userAgent: string | null;
    createdAt: string;
    expiresAt: string;
    isCurrent: boolean;
  }[];
};

export async function getJudgeAccount(
  judgeId: string,
  userId: string,
  currentSessionId: string | null,
): Promise<JudgeAccount | null> {
  const judge = await prisma.judge.findUnique({
    where: { id: judgeId },
    include: {
      user: true,
      memberships: { include: { awardYear: true } },
    },
  });

  if (!judge) return null;

  const sessions = await prisma.authSession.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  return {
    displayName: judge.displayName,
    title: judge.title,
    organisation: judge.organisation,
    biography: judge.biography,
    countryCode: judge.countryCode,
    email: judge.user.email,
    emailVerified: Boolean(judge.user.emailVerifiedAt),
    lastLoginAt: judge.user.lastLoginAt?.toISOString() ?? null,
    seatedSince: judge.createdAt.toISOString(),
    seasons: judge.memberships
      .map((membership) => ({ year: membership.awardYear.year, isChair: membership.isChair }))
      .sort((a, b) => b.year - a.year),
    sessions: sessions.map((session) => ({
      id: session.id,
      userAgent: session.userAgent,
      createdAt: session.createdAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
      isCurrent: session.id === currentSessionId,
    })),
  };
}
