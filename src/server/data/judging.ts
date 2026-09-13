import 'server-only';
import { prisma } from '@/server/db';

export type AssignmentSummary = {
  id: string;
  status: 'assigned' | 'in_progress' | 'completed' | 'recused' | 'reassigned';
  nominationId: string;
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
          nomination: { include: { creator: true, awardYear: true } },
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
    nominationId: assignment.nominationId,
    reference: assignment.nomination.reference,
    creatorName: assignment.nomination.creator.displayName,
    creatorSlug: assignment.nomination.creator.slug,
    categoryName: assignment.category.name,
    year: assignment.nomination.awardYear.year,
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
      subject: conflict.nominationId ?? conflict.creatorId ?? '—',
      declaredAt: conflict.declaredAt.toISOString(),
    })),
  };
}

export type AssignmentDetail = {
  id: string;
  status: string;
  nominationId: string;
  reference: string;
  creatorName: string;
  creatorSlug: string;
  creatorCountry: string;
  categoryName: string;
  categoryCriteria: string;
  categoryEligibility: string;
  year: number;
  statement: string;
  evidence: { id: string; kind: string; label: string; url: string | null; note: string | null }[];
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
      nomination: {
        include: {
          creator: true,
          awardYear: true,
          evidence: { orderBy: { createdAt: 'asc' } },
        },
      },
    },
  });

  if (!assignment) return null;

  return {
    id: assignment.id,
    status: assignment.status,
    nominationId: assignment.nominationId,
    reference: assignment.nomination.reference,
    creatorName: assignment.nomination.creator.displayName,
    creatorSlug: assignment.nomination.creator.slug,
    creatorCountry: assignment.nomination.creator.countryCode,
    categoryName: assignment.category.name,
    categoryCriteria: assignment.category.judgingCriteria,
    categoryEligibility: assignment.category.eligibility,
    year: assignment.nomination.awardYear.year,
    statement: assignment.nomination.statement,
    evidence: assignment.nomination.evidence.map((item) => ({
      id: item.id,
      kind: item.kind,
      label: item.label,
      url: item.url,
      note: item.note,
    })),
    alreadyScored: Boolean(assignment.score),
  };
}
