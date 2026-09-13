'use server';

import { revalidatePath } from 'next/cache';
import { authorise } from '@/lib/auth/guards';
import { assertSameOrigin } from '@/lib/auth/session';
import { SCORING_CRITERIA, totalScore, validateScoreCard, type ScoreCard } from '@/domain/judging';
import { conflictSchema, scoreSchema } from '@/lib/validation/judging';
import { recordAudit } from '@/server/audit';
import { requireDb } from '@/server/db';

export type JudgingState = { status: 'idle' | 'error' | 'success'; message?: string };

/**
 * Submit a score.
 *
 * Scores are immutable: a second submission against the same assignment is
 * refused rather than overwritten. Corrections are an administrative act with
 * their own audit trail.
 */
export async function submitScore(
  _previous: JudgingState,
  formData: FormData,
): Promise<JudgingState> {
  await assertSameOrigin();

  let session;
  try {
    session = await authorise('judging:submit_score');
  } catch {
    return { status: 'error', message: 'You are not authorised to submit scores.' };
  }

  const judgeId = session.user.judgeId;
  if (!judgeId) return { status: 'error', message: 'This account is not on a PALMA panel.' };

  const parsed = scoreSchema.safeParse({
    assignmentId: formData.get('assignmentId'),
    originality: formData.get('originality'),
    consistency: formData.get('consistency'),
    professionalism: formData.get('professionalism'),
    impact: formData.get('impact'),
    brand: formData.get('brand'),
    remarks: formData.get('remarks') ?? '',
    conflictDeclared: formData.get('conflictDeclared') === 'on',
  });

  if (!parsed.success) {
    return { status: 'error', message: 'Every criterion must be scored from 0 to 10.' };
  }

  const db = requireDb();

  const assignment = await db.judgingAssignment.findFirst({
    where: { id: parsed.data.assignmentId, judgeId },
    include: { score: { select: { id: true } }, candidacy: { select: { creatorId: true } } },
  });

  if (!assignment) return { status: 'error', message: 'That assignment is not yours.' };
  if (assignment.score) {
    return { status: 'error', message: 'A score has already been submitted for this nomination.' };
  }
  if (assignment.status === 'recused') {
    return { status: 'error', message: 'You have recused yourself from this candidacy.' };
  }

  // A conflict declared at the point of scoring removes the judge immediately.
  if (parsed.data.conflictDeclared) {
    return declareConflictInternal({
      judgeId,
      candidacyId: assignment.candidacyId,
      creatorId: assignment.candidacy.creatorId,
      kind: 'other',
      note: 'Declared while scoring.',
      actor: { id: session.user.id, role: session.user.role, label: session.user.email },
    });
  }

  const card = validateScoreCard(
    Object.fromEntries(
      SCORING_CRITERIA.map((criterion) => [criterion.key, parsed.data[criterion.key]]),
    ) as Partial<ScoreCard>,
  );

  if (!card.ok)
    return { status: 'error', message: Object.values(card.errors)[0] ?? 'Invalid score.' };

  const total = totalScore(card.card);

  const score = await db.$transaction(async (tx) => {
    const created = await tx.judgingScore.create({
      data: {
        assignmentId: assignment.id,
        judgeId,
        candidacyId: assignment.candidacyId,
        ...card.card,
        total,
        remarks: parsed.data.remarks || null,
      },
    });

    await tx.judgingAssignment.update({
      where: { id: assignment.id },
      data: { status: 'completed', completedAt: new Date() },
    });

    return created;
  });

  await recordAudit({
    action: 'score.submitted',
    entityType: 'JudgingScore',
    entityId: score.id,
    actor: { id: session.user.id, role: session.user.role, label: session.user.email },
    summary: `Score submitted for candidacy ${assignment.candidacyId}`,
    // The score itself is recorded in the audit log but never surfaced publicly.
    after: { total, criteria: card.card },
  });

  revalidatePath('/judging');
  return { status: 'success', message: 'Score submitted. It cannot be changed.' };
}

export async function declareConflict(
  _previous: JudgingState,
  formData: FormData,
): Promise<JudgingState> {
  await assertSameOrigin();

  let session;
  try {
    session = await authorise('judging:declare_conflict');
  } catch {
    return { status: 'error', message: 'You are not authorised to declare conflicts.' };
  }

  const judgeId = session.user.judgeId;
  if (!judgeId) return { status: 'error', message: 'This account is not on a PALMA panel.' };

  const parsed = conflictSchema.safeParse({
    candidacyId: formData.get('candidacyId'),
    kind: formData.get('kind'),
    note: formData.get('note') ?? '',
  });

  if (!parsed.success) return { status: 'error', message: 'Choose the kind of conflict.' };

  const db = requireDb();
  const candidacy = await db.candidacy.findUnique({
    where: { id: parsed.data.candidacyId },
    select: { id: true, creatorId: true },
  });
  if (!candidacy) return { status: 'error', message: 'That candidacy does not exist.' };

  return declareConflictInternal({
    judgeId,
    candidacyId: candidacy.id,
    creatorId: candidacy.creatorId,
    kind: parsed.data.kind,
    note: parsed.data.note || null,
    actor: { id: session.user.id, role: session.user.role, label: session.user.email },
  });
}

async function declareConflictInternal(input: {
  judgeId: string;
  candidacyId: string;
  creatorId: string;
  kind: string;
  note: string | null;
  actor: { id: string; role: string; label: string };
}): Promise<JudgingState> {
  const db = requireDb();

  const conflict = await db.$transaction(async (tx) => {
    const created = await tx.judgeConflict.create({
      data: {
        judgeId: input.judgeId,
        candidacyId: input.candidacyId,
        creatorId: input.creatorId,
        kind: input.kind as 'other',
        note: input.note,
      },
    });

    // Declaring removes the judge now. Only an explicit dismissal restores them.
    await tx.judgingAssignment.updateMany({
      where: { judgeId: input.judgeId, candidacyId: input.candidacyId },
      data: { status: 'recused', recusedAt: new Date() },
    });

    return created;
  });

  await recordAudit({
    action: 'judge.conflict_declared',
    entityType: 'JudgeConflict',
    entityId: conflict.id,
    actor: { id: input.actor.id, role: input.actor.role as 'judge', label: input.actor.label },
    summary: `Conflict declared on candidacy ${input.candidacyId}`,
    after: { kind: input.kind },
  });

  revalidatePath('/judging');
  return {
    status: 'success',
    message: 'Conflict declared. You have been removed from this candidacy.',
  };
}
