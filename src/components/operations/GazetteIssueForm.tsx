'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, Input, Textarea } from '@/components/ui/form';
import { Notice } from '@/components/ui/feedback';
import { sendGazetteIssueAction, type GazetteState } from '@/server/actions/gazette';

const initial: GazetteState = { status: 'idle' };

/**
 * Composing an issue.
 *
 * Plain prose rather than a rich editor: the letterhead does the design, and
 * a composer that lets an operator paste arbitrary markup into a mail sent to
 * the whole list is a composer that will eventually send broken HTML to the
 * whole list.
 */
export function GazetteIssueForm({ recipients }: { recipients: number }) {
  const [state, action, pending] = useActionState(sendGazetteIssueAction, initial);

  return (
    <form action={action} className="flex flex-col gap-6">
      {state.status !== 'idle' && state.message ? (
        <Notice
          tone={state.status === 'error' ? 'error' : 'ceremonial'}
          title={state.status === 'error' ? 'Not sent' : 'Sent'}
        >
          {state.message}
        </Notice>
      ) : null}

      <Notice tone="warning" title="This cannot be recalled">
        Confirming sends to <strong>{recipients}</strong> confirmed subscriber
        {recipients === 1 ? '' : 's'} immediately. There is no draft, no schedule and no undo.
      </Notice>

      <Field htmlFor="subject" label="Subject" required>
        <Input id="subject" name="subject" required maxLength={160} />
      </Field>

      <Field
        htmlFor="standfirst"
        label="Standfirst"
        required
        hint="The line under the title, and the inbox preview. One sentence."
      >
        <Textarea id="standfirst" name="standfirst" className="min-h-20" maxLength={400} required />
      </Field>

      <Field
        htmlFor="body"
        label="The issue"
        required
        hint="Plain prose. A blank line starts a new paragraph; everything else is escaped."
      >
        <Textarea id="body" name="body" className="min-h-64" maxLength={20000} required />
      </Field>

      <div className="grid gap-5 sm:grid-cols-[1fr_2fr]">
        <Field htmlFor="linkLabel" label="Button label">
          <Input id="linkLabel" name="linkLabel" maxLength={60} placeholder="Read the Journal" />
        </Field>
        <Field htmlFor="linkUrl" label="Button link">
          <Input id="linkUrl" name="linkUrl" type="url" placeholder="https://" />
        </Field>
      </div>

      <Field htmlFor="confirm" label="Type SEND to confirm" required>
        <Input id="confirm" name="confirm" required autoComplete="off" placeholder="SEND" />
      </Field>

      <Button type="submit" size="md" disabled={pending} className="self-start">
        {pending ? 'Sending…' : `Send to ${recipients}`}
      </Button>
    </form>
  );
}
