'use client';

import * as React from 'react';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/feedback';
import { Textarea, Label } from '@/components/ui/form';
import { SCORING_CRITERIA, MAX_SCORE, MAX_TOTAL } from '@/domain/judging';
import { CONFLICT_KINDS } from '@/domain/conflicts';
import { declareConflict, submitScore, type JudgingState } from '@/server/actions/judging';
import { Select } from '@/components/ui/form';
import { cn } from '@/lib/utils';

const initial: JudgingState = { status: 'idle' };

export function ScoreForm({
  assignmentId,
  nominationId,
  alreadyScored,
}: {
  assignmentId: string;
  nominationId: string;
  alreadyScored: boolean;
}) {
  const [state, action, pending] = useActionState(submitScore, initial);
  const [scores, setScores] = React.useState<Record<string, number>>(() =>
    Object.fromEntries(SCORING_CRITERIA.map((criterion) => [criterion.key, 5])),
  );

  const total = SCORING_CRITERIA.reduce((sum, criterion) => sum + (scores[criterion.key] ?? 0), 0);

  if (alreadyScored || state.status === 'success') {
    return (
      <Notice tone="ceremonial" title="Score submitted">
        {state.message ??
          'Your score for this nomination has been recorded. Scores are immutable once submitted.'}
      </Notice>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <form action={action} className="flex flex-col gap-8">
        <input type="hidden" name="assignmentId" value={assignmentId} />

        {state.status === 'error' && state.message ? (
          <Notice tone="error" title="Score not submitted">
            {state.message}
          </Notice>
        ) : null}

        <fieldset className="flex flex-col gap-8">
          <legend className="palma-label text-taupe-deep mb-2">Judging criteria</legend>

          {SCORING_CRITERIA.map((criterion) => (
            <div key={criterion.key} className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between gap-6">
                <Label htmlFor={criterion.key} className="text-ink">
                  {criterion.label}
                </Label>
                <span className="font-display text-2xl tabular-nums">
                  {scores[criterion.key]}
                  <span className="text-taupe-deep text-base">/{MAX_SCORE}</span>
                </span>
              </div>
              <p className="text-taupe-deep text-sm">{criterion.description}</p>
              <input
                id={criterion.key}
                name={criterion.key}
                type="range"
                min={0}
                max={MAX_SCORE}
                step={1}
                value={scores[criterion.key]}
                onChange={(event) =>
                  setScores((current) => ({
                    ...current,
                    [criterion.key]: Number(event.target.value),
                  }))
                }
                className="w-full accent-[#4A5148]"
                aria-describedby={`${criterion.key}-scale`}
              />
              <div
                id={`${criterion.key}-scale`}
                className="text-taupe flex justify-between text-xs"
              >
                <span>0 — not evidenced</span>
                <span>10 — exceptional</span>
              </div>
            </div>
          ))}
        </fieldset>

        <div className="border-stone-deep flex items-baseline justify-between border-t pt-6">
          <span className="palma-label text-taupe-deep">Total</span>
          <span className={cn('font-display text-4xl tabular-nums')}>
            {total}
            <span className="text-taupe-deep text-lg">/{MAX_TOTAL}</span>
          </span>
        </div>

        <div className="flex flex-col gap-3">
          <Label htmlFor="remarks">Remarks for the chair (optional)</Label>
          <Textarea id="remarks" name="remarks" maxLength={1500} />
          <p className="text-taupe-deep text-xs">
            Remarks are seen by the chair and administrators only. They are never shown to the
            creator, the nominator, sponsors or the public.
          </p>
        </div>

        <Button type="submit" size="lg" disabled={pending} className="self-start">
          {pending ? 'Submitting…' : 'Submit score'}
        </Button>
        <p className="text-taupe-deep -mt-4 text-xs">
          Once submitted, a score cannot be changed. Corrections are performed only by an authorised
          administrator and are recorded in the audit log.
        </p>
      </form>

      <ConflictForm nominationId={nominationId} />
    </div>
  );
}

function ConflictForm({ nominationId }: { nominationId: string }) {
  const [state, action, pending] = useActionState(declareConflict, initial);

  if (state.status === 'success') {
    return (
      <Notice tone="warning" title="Conflict declared">
        {state.message}
      </Notice>
    );
  }

  return (
    <form action={action} className="border-stone-deep flex flex-col gap-4 border p-6">
      <input type="hidden" name="nominationId" value={nominationId} />

      <h3 className="palma-label text-taupe-deep">Declare a conflict of interest</h3>
      <p className="text-taupe-deep text-sm leading-relaxed">
        If you have any relationship with this creator, declare it. Declaring removes you from this
        nomination immediately — you do not need to decide whether it matters.
      </p>

      {state.status === 'error' && state.message ? (
        <Notice tone="error">{state.message}</Notice>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor="kind">Nature of the conflict</Label>
          <Select id="kind" name="kind" defaultValue="personal_relationship">
            {CONFLICT_KINDS.map((kind) => (
              <option key={kind.key} value={kind.key}>
                {kind.label}
              </option>
            ))}
          </Select>
        </div>
        <Button type="submit" variant="outline" size="md" disabled={pending}>
          {pending ? 'Declaring…' : 'Declare conflict'}
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="note">Note (optional)</Label>
        <Textarea id="note" name="note" className="min-h-20" maxLength={1000} />
      </div>
    </form>
  );
}
