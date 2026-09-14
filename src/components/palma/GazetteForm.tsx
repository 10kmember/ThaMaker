'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/form';
import { Notice } from '@/components/ui/feedback';
import { subscribeToGazette, type GazetteState } from '@/server/actions/gazette';

const initial: GazetteState = { status: 'idle' };

/**
 * Joining the Gazette.
 *
 * The answer is the same whether the address is new, pending or already
 * subscribed — a form that says "you are already on this list" is a form that
 * tells a stranger who reads PALMA.
 */
export function GazetteForm({
  source = 'site',
  compact = false,
}: {
  source?: string;
  compact?: boolean;
}) {
  const [state, action, pending] = useActionState(subscribeToGazette, initial);

  if (state.status === 'success') {
    return (
      <Notice tone="ceremonial" title="Check your inbox">
        {state.message}
      </Notice>
    );
  }

  return (
    <form action={action} className={compact ? 'flex flex-col gap-3' : 'flex flex-col gap-5'}>
      <input type="hidden" name="source" value={source} />

      {state.status === 'error' && state.message ? (
        <Notice tone="error">{state.message}</Notice>
      ) : null}

      <div className={compact ? 'flex flex-wrap items-end gap-3' : 'flex flex-col gap-5'}>
        <div className={compact ? 'min-w-50 flex-1' : ''}>
          <Field htmlFor={`gazette-email-${source}`} label="Email" required>
            <Input
              id={`gazette-email-${source}`}
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
            />
          </Field>
        </div>
        <Button type="submit" size={compact ? 'sm' : 'md'} disabled={pending}>
          {pending ? 'Sending…' : 'Join the Gazette'}
        </Button>
      </div>

      <p className="text-taupe text-xs leading-relaxed">
        Double opt-in: nothing is sent until you open the confirmation. One click to leave, in every
        issue.
      </p>
    </form>
  );
}
