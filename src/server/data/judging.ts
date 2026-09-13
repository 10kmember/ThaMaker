import 'server-only';
import { prisma } from '@/server/db';

export type AssignmentSummary = {
  id: string;
  status: 'assigned' | 'in_progress' | 'completed' | 'recused' | 'reassigned';
  candidacyId: string;
  reference: string;
  creatorName: string;
  creatorSlug: string;
  categoryName: string;
  year: number;
  assignedAt: string;
  completedAt: string | null;
};

export type JudgeDashboard = {
  judgeName: string;
  seasonTitle: string;
  assigned: AssignmentSummary[];
  completed: AssignmentSummary[];
  conflicts: {
    id: string;
    kind: string;
    status: string;
    subject: string;
    declaredAt: string;
  }[];
};

export async function getJudgeDashboard(judgeId: string): Promise<JudgeDashboard | null> {
  const db = prisma;
  if (!db) return null;

  const judge = await db.judge.findUnique({
    where: { id: judgeId },
    include: {
      assignments: {
        include: {
          candidacy: { include: { creator: true, awardYear: true } },
          category: true,
          score: { select: { id: true } },
        },
        orderBy: { assignedAt: 'desc' },
      },
      conflicts: { orderBy: { declaredAt: 'desc' } },
    },
  });

  if (!judge) return null;

  const map = (assignment: (typeof judge.assignments)[number]): AssignmentSummary => ({
    id: assignment.id,
    status: assignment.status,
    candidacyId: assignment.candidacyId,
    reference: assignment.candidacy.reference,
    creatorName: assignment.candidacy.creator.displayName,
    creatorSlug: assignment.candidacy.creator.slug,
    categoryName: assignment.category.name,
    year: assignment.candidacy.awardYear.year,
    assignedAt: assignment.assignedAt.toISOString(),
    completedAt: assignment.completedAt?.toISOString() ?? null,
  });

  const current = await db.awardYear.findFirst({ where: { isCurrent: true } });

  return {
    judgeName: judge.displayName,
    seasonTitle: current?.title ?? 'PALMA',
    assigned: judge.assignments
      .filter((a) => a.status === 'assigned' || a.status === 'in_progress')
      .map(map),
    completed: judge.assignments.filter((a) => a.status === 'completed').map(map),
    conflicts: judge.conflicts.map((conflict) => ({
      id: conflict.id,
      kind: conflict.kind,
      status: conflict.status,
      subject: conflict.candidacyId ?? conflict.creatorId ?? '—',
      declaredAt: conflict.declaredAt.toISOString(),
    })),
  };
}

export type AssignmentDetail = {
  id: string;
  status: string;
  candidacyId: string;
  reference: string;
  creatorName: string;
  creatorSlug: string;
  creatorCountry: string;
  categoryName: string;
  categoryCriteria: string;
  categoryEligibility: string;
  year: number;
  evidence: { id: string; kind: string; label: string; url: string | null; note: string | null }[];
  /** A sample of what the audience said, never how many said it. */
  audienceVoices: string[];
  alreadyScored: boolean;
};

/**
 * A judge may only ever load their own assignment. The judgeId is part of the
 * query, not checked afterwards.
 */
export async function getAssignmentForJudge(
  assignmentId: string,
  judgeId: string,
): Promise<AssignmentDetail | null> {
  const db = prisma;
  if (!db) return null;

  const assignment = await db.judgingAssignment.findFirst({
    where: { id: assignmentId, judgeId },
    include: {
      category: true,
      score: { select: { id: true } },
      candidacy: {
        include: {
          creator: true,
          awardYear: true,
          evidence: { orderBy: { createdAt: 'asc' } },
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

  return {
    id: assignment.id,
    status: assignment.status,
    candidacyId: assignment.candidacyId,
    reference: assignment.candidacy.reference,
    creatorName: assignment.candidacy.creator.displayName,
    creatorSlug: assignment.candidacy.creator.slug,
    creatorCountry: assignment.candidacy.creator.countryCode,
    categoryName: assignment.category.name,
    categoryCriteria: assignment.category.judgingCriteria,
    categoryEligibility: assignment.category.eligibility,
    year: assignment.candidacy.awardYear.year,
    audienceVoices: assignment.candidacy.nominations.map((entry) => entry.reason),
    evidence: assignment.candidacy.evidence.map((item) => ({
      id: item.id,
      kind: item.kind,
      label: item.label,
      url: item.url,
      note: item.note,
    })),
    alreadyScored: Boolean(assignment.score),
  };
}
