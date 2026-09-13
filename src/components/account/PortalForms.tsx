'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckboxField, Field, Input, Select, Textarea } from '@/components/ui/form';
import { Notice } from '@/components/ui/feedback';
import { COUNTRIES } from '@/lib/countries';
import {
  startVerification,
  updateCreatorProfile,
  updateNotificationPreferences,
  type CreatorState,
} from '@/server/actions/creator';

const initial: CreatorState = { status: 'idle' };

function Feedback({ state }: { state: CreatorState }) {
  if (state.status === 'idle' || !state.message) return null;
  return <Notice tone={state.status === 'error' ? 'error' : 'ceremonial'}>{state.message}</Notice>;
}

export function ProfileForm({
  defaults,
}: {
  defaults: {
    displayName: string;
    pronouns: string;
    countryCode: string;
    city: string;
    headline: string;
    biography: string;
    websiteUrl: string;
  };
}) {
  const [state, action, pending] = useActionState(updateCreatorProfile, initial);

  return (
    <form action={action} className="flex flex-col gap-6">
      <Feedback state={state} />

      <Field htmlFor="displayName" label="Display name" required>
        <Input id="displayName" name="displayName" defaultValue={defaults.displayName} required />
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field htmlFor="pronouns" label="Pronouns">
          <Input id="pronouns" name="pronouns" defaultValue={defaults.pronouns} />
        </Field>
        <Field htmlFor="countryCode" label="Country" required>
          <Select id="countryCode" name="countryCode" defaultValue={defaults.countryCode || 'GB'}>
            {COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field htmlFor="city" label="City">
        <Input id="city" name="city" defaultValue={defaults.city} />
      </Field>

      <Field
        htmlFor="headline"
        label="Headline"
        hint="One line describing your work. Shown beneath your name in the record."
      >
        <Input id="headline" name="headline" defaultValue={defaults.headline} maxLength={160} />
      </Field>

      <Field htmlFor="biography" label="Biography" hint="Up to 2000 characters.">
        <Textarea
          id="biography"
          name="biography"
          defaultValue={defaults.biography}
          maxLength={2000}
        />
      </Field>

      <Field htmlFor="websiteUrl" label="Website">
        <Input id="websiteUrl" name="websiteUrl" type="url" defaultValue={defaults.websiteUrl} />
      </Field>

      <Button type="submit" size="md" disabled={pending} className="self-start">
        {pending ? 'Saving…' : 'Save profile'}
      </Button>
    </form>
  );
}

export function VerificationForm({ status }: { status: string }) {
  const [state, action, pending] = useActionState(startVerification, initial);

  return (
    <form action={action} className="flex flex-col gap-4">
      <Feedback state={state} />
      <p className="text-taupe-deep text-sm leading-relaxed">
        PALMA creators must be 18 or over. Age and identity assurance is carried out by a specialist
        third-party provider. PALMA never receives or stores your identity documents — only that the
        check succeeded, when, and the provider’s reference.
      </p>
      <Button
        type="submit"
        variant={status === 'verified' ? 'outline' : 'primary'}
        size="md"
        disabled={pending || status === 'verified'}
        className="self-start"
      >
        {status === 'verified'
          ? 'Verified'
          : pending
            ? 'Starting…'
            : status === 'pending'
              ? 'Resume verification'
              : 'Start verification'}
      </Button>
    </form>
  );
}

export function PreferencesForm({
  defaults,
}: {
  defaults: {
    seasonAnnouncements: boolean;
    nominationUpdates: boolean;
    honourAnnouncements: boolean;
    journalDigest: boolean;
  };
}) {
  const [state, action, pending] = useActionState(updateNotificationPreferences, initial);

  return (
    <form action={action} className="flex flex-col gap-5">
      <Feedback state={state} />

      <CheckboxField
        id="seasonAnnouncements"
        name="seasonAnnouncements"
        label="Season announcements"
        defaultChecked={defaults.seasonAnnouncements}
      />
      <CheckboxField
        id="nominationUpdates"
        name="nominationUpdates"
        label="Updates on nominations I submit"
        defaultChecked={defaults.nominationUpdates}
      />
      <CheckboxField
        id="honourAnnouncements"
        name="honourAnnouncements"
        label="Shortlist, finalist and winner announcements"
        defaultChecked={defaults.honourAnnouncements}
      />
      <CheckboxField
        id="journalDigest"
        name="journalDigest"
        label="The PALMA Journal digest"
        defaultChecked={defaults.journalDigest}
      />

      <Button type="submit" variant="outline" size="md" disabled={pending} className="self-start">
        {pending ? 'Saving…' : 'Save preferences'}
      </Button>
    </form>
  );
}
