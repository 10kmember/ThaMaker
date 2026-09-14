'use client';

import * as React from 'react';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/form';
import { Notice } from '@/components/ui/feedback';
import { reviewPortrait, type PortraitState } from '@/server/actions/portrait';

const initial: PortraitState = { status: 'idle' };

export function PortraitReviewForm({ portraitId, name }: { portraitId: string; name: string }) {
  const [state, action, pending] = useActionState(reviewPortrait, initial);
  const [refusing, setRefusing] = React.useState(false);

  if (state.status === 'success') {
    return (
      <Notice tone="ceremonial" title="Settled">
        {state.message}
      </Notice>
    );
  }

  return (
    <form action={action} className="border-stone-deep flex flex-col gap-4 border-t pt-5">
      <input type="hidden" name="portraitId" value={portraitId} />

      {state.status === 'error' && state.message ? (
        <Notice tone="error">{state.message}</Notice>
      ) : null}

      {refusing ? (
        <>
          <Input
            name="reason"
            placeholder="Why it cannot be published — the creator is told this."
            maxLength={300}
            autoFocus
          />
          <div className="flex flex-wrap gap-3">
            <Button
              type="submit"
              name="decision"
              value="reject"
              variant="danger"
              size="sm"
              disabled={pending}
            >
              {pending ? 'Refusing…' : 'Refuse and delete'}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setRefusing(false)}>
              Back
            </Button>
          </div>
        </>
      ) : (
        <div className="flex flex-wrap gap-3">
          <Button type="submit" name="decision" value="approve" size="sm" disabled={pending}>
            {pending ? 'Publishing…' : `Publish on ${name}’s record`}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setRefusing(true)}>
            Refuse
          </Button>
        </div>
      )}
    </form>
  );
}
