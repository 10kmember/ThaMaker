import { describe, expect, it } from 'vitest';
import { isJudgeEligible, planAssignments, type ConflictRecord } from '@/domain/conflicts';

const nomination = { id: 'nom-1', creatorId: 'creator-1' };

describe('conflict handling', () => {
  it('removes a judge who has declared against the nomination', () => {
    const conflicts: ConflictRecord[] = [
      { judgeId: 'j1', nominationId: 'nom-1', status: 'declared' },
    ];
    expect(isJudgeEligible('j1', nomination, conflicts)).toBe(false);
    expect(isJudgeEligible('j2', nomination, conflicts)).toBe(true);
  });

  it('removes a judge who has declared against the creator, not just the nomination', () => {
    const conflicts: ConflictRecord[] = [
      { judgeId: 'j1', creatorId: 'creator-1', status: 'declared' },
    ];
    expect(isJudgeEligible('j1', nomination, conflicts)).toBe(false);
  });

  it('restores a judge only when the conflict is explicitly dismissed', () => {
    expect(
      isJudgeEligible('j1', nomination, [
        { judgeId: 'j1', nominationId: 'nom-1', status: 'upheld' },
      ]),
    ).toBe(false);
    expect(
      isJudgeEligible('j1', nomination, [
        { judgeId: 'j1', nominationId: 'nom-1', status: 'dismissed' },
      ]),
    ).toBe(true);
  });
});

describe('panel assignment', () => {
  const nominations = [
    { id: 'n1', creatorId: 'c1' },
    { id: 'n2', creatorId: 'c2' },
    { id: 'n3', creatorId: 'c3' },
  ];

  it('gives every nomination the requested number of judges', () => {
    const plan = planAssignments({
      nominations,
      judgeIds: ['j1', 'j2', 'j3', 'j4'],
      conflicts: [],
      judgesPerNomination: 3,
    });

    expect(plan.assignments).toHaveLength(9);
    expect(plan.understaffed).toHaveLength(0);
  });

  it('spreads load evenly across the panel', () => {
    const plan = planAssignments({
      nominations,
      judgeIds: ['j1', 'j2', 'j3'],
      conflicts: [],
      judgesPerNomination: 2,
    });

    const load = new Map<string, number>();
    for (const assignment of plan.assignments) {
      load.set(assignment.judgeId, (load.get(assignment.judgeId) ?? 0) + 1);
    }
    expect([...load.values()]).toEqual([2, 2, 2]);
  });

  it('never assigns a conflicted judge, and reports the shortfall', () => {
    const plan = planAssignments({
      nominations: [{ id: 'n1', creatorId: 'c1' }],
      judgeIds: ['j1', 'j2'],
      conflicts: [{ judgeId: 'j1', creatorId: 'c1', status: 'declared' }],
      judgesPerNomination: 2,
    });

    expect(plan.assignments.map((a) => a.judgeId)).toEqual(['j2']);
    expect(plan.understaffed).toEqual([{ nominationId: 'n1', assigned: 1 }]);
  });

  it('is deterministic, so a placement can be explained after the fact', () => {
    const input = {
      nominations,
      judgeIds: ['j3', 'j1', 'j2'],
      conflicts: [],
      judgesPerNomination: 2,
    };
    expect(planAssignments(input)).toEqual(planAssignments(input));
  });
});
