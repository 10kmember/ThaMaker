'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input, Select, Textarea, Label } from '@/components/ui/form';
import { Notice } from '@/components/ui/feedback';
import {
  advanceSeason,
  assignJudges,
  confirmFinalists,
  confirmWinner,
  reviewNomination,
  type AdminState,
} from '@/server/actions/admin';
import { SEASON_STAGES, STAGE_LABEL, type SeasonStage } from '@/domain/season';

const initial: AdminState = { status: 'idle' };

function Feedback({ state }: { state: AdminState }) {
  if (state.status === 'idle' || !state.message) return null;
  return <Notice tone={state.status === 'error' ? 'error' : 'ceremonial'}>{state.message}</Notice>;
}

export function ReviewForm({ nominationId, status }: { nominationId: string; status: string }) {
  const [state, action, pending] = useActionState(reviewNomination, initial);

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="nominationId" value={nominationId} />
      <Feedback state={state} />

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`decision-${nominationId}`}>Decision</Label>
          <Select id={`decision-${nominationId}`} name="decision" defaultValue={status}>
            <option value="eligible">Eligible</option>
            <option value="under_review">Keep under review</option>
            <option value="ineligible">Ineligible</option>
            <option value="duplicate">Duplicate</option>
          </Select>
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor={`note-${nominationId}`}>Reason (required unless eligible)</Label>
          <Input id={`note-${nominationId}`} name="note" maxLength={500} />
        </div>
        <Button type="submit" size="md" variant="outline" disabled={pending}>
          {pending ? 'Saving…' : 'Record decision'}
        </Button>
      </div>
    </form>
  );
}

export function AssignJudgesForm({
  categoryId,
  categoryName,
  eligibleCount,
  assignedCount,
}: {
  categoryId: string;
  categoryName: string;
  eligibleCount: number;
  assignedCount: number;
}) {
  const [state, action, pending] = useActionState(assignJudges, initial);

  return (
    <form action={action} className="border-stone-deep flex flex-col gap-3 border p-6">
      <input type="hidden" name="categoryId" value={categoryId} />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="font-display text-xl">{categoryName}</span>
          <span className="palma-label text-taupe-deep">
            {eligibleCount} eligible · {assignedCount} assignments
          </span>
        </div>
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          {pending ? 'Assigning…' : 'Assign panel'}
        </Button>
      </div>
      <Feedback state={state} />
    </form>
  );
}

export function FinalistForm({ categoryId }: { categoryId: string }) {
  const [state, action, pending] = useActionState(confirmFinalists, initial);

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="categoryId" value={categoryId} />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? 'Conferring…' : 'Confirm finalists'}
      </Button>
      <Feedback state={state} />
    </form>
  );
}

export function WinnerForm({ categoryId }: { categoryId: string }) {
  const [state, action, pending] = useActionState(confirmWinner, initial);

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="categoryId" value={categoryId} />
      <div className="flex flex-col gap-2">
        <Label htmlFor={`citation-${categoryId}`}>Citation</Label>
        <Textarea
          id={`citation-${categoryId}`}
          name="citation"
          className="min-h-20"
          maxLength={400}
          placeholder="For a body of work that set the standard of the season."
        />
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? 'Conferring…' : 'Confer the PALMA'}
      </Button>
      <Feedback state={state} />
    </form>
  );
}

export function AdvanceSeasonForm({ year, stage }: { year: number; stage: SeasonStage }) {
  const [state, action, pending] = useActionState(advanceSeason, initial);
  const index = SEASON_STAGES.indexOf(stage);
  const next = SEASON_STAGES[index + 1];

  if (!next) {
    return (
      <p className="text-taupe-deep text-sm">This season is archived. There is no next stage.</p>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="year" value={year} />
      <input type="hidden" name="stage" value={next} />
      <div className="flex flex-wrap items-center gap-4">
        <span className="text-taupe-deep text-sm">
          Current stage: <strong className="text-ink">{STAGE_LABEL[stage]}</strong>
        </span>
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          {pending ? 'Advancing…' : `Advance to ${STAGE_LABEL[next]}`}
        </Button>
      </div>
      <Feedback state={state} />
    </form>
  );
}
