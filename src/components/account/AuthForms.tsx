'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CheckboxField, Field, Input } from '@/components/ui/form';
import { Notice } from '@/components/ui/feedback';
import { register, signIn, type AuthState } from '@/server/actions/auth';

const initial: AuthState = { status: 'idle' };

export function SignInForm({
  next,
  entrance = 'creator',
  submitLabel = 'Sign in',
  showRegister = true,
}: {
  next?: string;
  /** Which door this form belongs to. The server refuses the wrong role here. */
  entrance?: 'creator' | 'judge' | 'staff';
  submitLabel?: string;
  showRegister?: boolean;
}) {
  const [state, action, pending] = useActionState(signIn, initial);

  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="entrance" value={entrance} />
      {next ? <input type="hidden" name="next" value={next} /> : null}

      {state.status === 'error' && state.message ? (
        <Notice tone="error" title={state.wrongDoor ? 'Wrong entrance' : 'Could not sign in'}>
          {state.message}
          {state.wrongDoor ? (
            <>
              {' '}
              <Link href={state.wrongDoor.path} className="palma-link text-ink">
                Go to {state.wrongDoor.title.toLowerCase()}
              </Link>
              .
            </>
          ) : null}
        </Notice>
      ) : null}

      <Field htmlFor="email" label="Email" required error={state.errors?.email}>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </Field>

      <Field htmlFor="password" label="Password" required error={state.errors?.password}>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
        />
      </Field>

      <Button type="submit" size="md" disabled={pending}>
        {pending ? 'Signing in…' : submitLabel}
      </Button>

      {showRegister ? (
        <p className="text-taupe-deep text-sm">
          No account?{' '}
          <Link href="/register" className="palma-link hover:text-ink">
            Create one
          </Link>
          .
        </p>
      ) : null}
    </form>
  );
}

export function RegisterForm() {
  const [state, action, pending] = useActionState(register, initial);

  return (
    <form action={action} className="flex flex-col gap-6">
      {state.status === 'error' && state.message ? (
        <Notice tone="error" title="Could not create the account">
          {state.message}
        </Notice>
      ) : null}

      <Field htmlFor="name" label="Your name" required error={state.errors?.name}>
        <Input id="name" name="name" required autoComplete="name" />
      </Field>

      <Field htmlFor="email" label="Email" required error={state.errors?.email}>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </Field>

      <Field
        htmlFor="password"
        label="Password"
        required
        hint="At least 12 characters, mixing cases or including a number."
        error={state.errors?.password}
      >
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          minLength={12}
        />
      </Field>

      <CheckboxField
        id="acceptTerms"
        name="acceptTerms"
        label="I accept the PALMA terms and content policy."
        error={state.errors?.acceptTerms}
      />

      <Button type="submit" size="md" disabled={pending}>
        {pending ? 'Creating account…' : 'Create account'}
      </Button>

      <p className="text-taupe-deep text-sm">
        Already have an account?{' '}
        <Link href="/sign-in" className="palma-link hover:text-ink">
          Sign in
        </Link>
        .
      </p>
    </form>
  );
}
