export const CONFLICT_KINDS = [
  { key: 'personal_relationship', label: 'Personal relationship' },
  { key: 'commercial_relationship', label: 'Commercial relationship' },
  { key: 'representation', label: 'Representation or management' },
  { key: 'employment', label: 'Employment' },
  { key: 'competitor', label: 'Direct competitor' },
  { key: 'other', label: 'Other' },
] as const;

export type ConflictKind = (typeof CONFLICT_KINDS)[number]['key'];

export type ConflictRecord = {
  judgeId: string;
  creatorId?: string | null;
  nominationId?: string | null;
  status: 'declared' | 'upheld' | 'dismissed';
};

/**
 * A declared conflict removes a judge from the nomination immediately — it is
 * not held pending review. Only an explicit dismissal restores eligibility.
 */
export function isJudgeEligible(
  judgeId: string,
  nomination: { id: string; creatorId: string },
  conflicts: ConflictRecord[],
): boolean {
  return !conflicts.some(
    (conflict) =>
      conflict.judgeId === judgeId &&
      conflict.status !== 'dismissed' &&
      (conflict.nominationId === nomination.id || conflict.creatorId === nomination.creatorId),
  );
}

export type AssignmentPlanInput = {
  nominations: { id: string; creatorId: string }[];
  judgeIds: string[];
  conflicts: ConflictRecord[];
  /** How many judges should score each nomination. */
  judgesPerNomination: number;
};

export type AssignmentPlan = {
  assignments: { nominationId: string; judgeId: string }[];
  /** Nominations that could not be fully covered without a conflict. */
  understaffed: { nominationId: string; assigned: number }[];
};

/**
 * Deterministic round-robin assignment that respects conflicts and spreads
 * load evenly across the panel. Deterministic on purpose: the same inputs must
 * produce the same panel, so an assignment can be explained after the fact.
 */
export function planAssignments(input: AssignmentPlanInput): AssignmentPlan {
  const assignments: { nominationId: string; judgeId: string }[] = [];
  const understaffed: { nominationId: string; assigned: number }[] = [];
  const load = new Map<string, number>(input.judgeIds.map((id) => [id, 0]));

  for (const nomination of input.nominations) {
    const eligible = input.judgeIds
      .filter((judgeId) => isJudgeEligible(judgeId, nomination, input.conflicts))
      .sort((a, b) => {
        const loadDiff = (load.get(a) ?? 0) - (load.get(b) ?? 0);
        return loadDiff !== 0 ? loadDiff : a.localeCompare(b);
      });

    const chosen = eligible.slice(0, input.judgesPerNomination);
    for (const judgeId of chosen) {
      assignments.push({ nominationId: nomination.id, judgeId });
      load.set(judgeId, (load.get(judgeId) ?? 0) + 1);
    }

    if (chosen.length < input.judgesPerNomination) {
      understaffed.push({ nominationId: nomination.id, assigned: chosen.length });
    }
  }

  return { assignments, understaffed };
}
