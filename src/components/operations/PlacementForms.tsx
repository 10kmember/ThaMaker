'use client';

import * as React from 'react';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/form';
import { Notice } from '@/components/ui/feedback';
import {
  assignPlacement,
  decidePlacement,
  type CommercialState,
} from '@/server/actions/commercial';
import { PLACEMENT_LIST, placement as placementRule, type Placement } from '@/domain/sponsorship';

const initial: CommercialState = { status: 'idle' };

/**
 * Proposing a placement.
 *
 * The form follows the architecture: choose what they funded, and the target
 * field changes to match. A category partner names a category; an editorial
 * partner names an article; a principal partner names nothing, because they
 * are attached to the institution.
 */
export function PlacementForm({
  sponsors,
  seasons,
  categories,
  articles,
  events,
}: {
  sponsors: { id: string; name: string }[];
  seasons: { id: string; title: string; year: number }[];
  categories: { id: string; name: string; awardYearId: string }[];
  articles: { id: string; title: string }[];
  events: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(assignPlacement, initial);
  const [kind, setKind] = React.useState<Placement>('category');
  const [season, setSeason] = React.useState(seasons[0]?.id ?? '');

  const rule = placementRule(kind);
  const seasonCategories = categories.filter((category) => category.awardYearId === season);

  return (
    <form action={action} className="flex flex-col gap-6">
      {state.status !== 'idle' && state.message ? (
        <Notice tone={state.status === 'error' ? 'error' : 'ceremonial'}>{state.message}</Notice>
      ) : null}

      <Field htmlFor="sponsorId" label="Sponsor" required>
        <Select id="sponsorId" name="sponsorId" required defaultValue="">
          <option value="" disabled>
            Choose a sponsor
          </option>
          {sponsors.map((sponsor) => (
            <option key={sponsor.id} value={sponsor.id}>
              {sponsor.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field htmlFor="awardYearId" label="Season" required>
        <Select
          id="awardYearId"
          name="awardYearId"
          required
          value={season}
          onChange={(event) => setSeason(event.target.value)}
        >
          {seasons.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.title}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        htmlFor="placement"
        label="What they funded"
        required
        hint="Association follows the thing they funded — and goes nowhere else."
      >
        <Select
          id="placement"
          name="placement"
          value={kind}
          onChange={(event) => setKind(event.target.value as Placement)}
        >
          {PLACEMENT_LIST.map((entry) => (
            <option key={entry.key} value={entry.key}>
              {entry.name}
            </option>
          ))}
        </Select>
      </Field>

      <p className="text-taupe -mt-2 text-xs leading-relaxed">
        {rule.buys} Appears on: {rule.appearsOn.join('; ').toLowerCase()}.
      </p>

      {kind === 'category' ? (
        <Field htmlFor="categoryId" label="Category" required>
          <Select id="categoryId" name="categoryId" required defaultValue="">
            <option value="" disabled>
              Choose a category
            </option>
            {seasonCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </Field>
      ) : (
        <input type="hidden" name="categoryId" value="" />
      )}

      {kind === 'editorial' ? (
        <Field htmlFor="articleId" label="Article" required>
          <Select id="articleId" name="articleId" required defaultValue="">
            <option value="" disabled>
              Choose an article
            </option>
            {articles.map((article) => (
              <option key={article.id} value={article.id}>
                {article.title}
              </option>
            ))}
          </Select>
        </Field>
      ) : (
        <input type="hidden" name="articleId" value="" />
      )}

      {kind === 'event' ? (
        <Field htmlFor="eventId" label="Event" required>
          <Select id="eventId" name="eventId" required defaultValue="">
            <option value="" disabled>
              Choose an event
            </option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name}
              </option>
            ))}
          </Select>
        </Field>
      ) : (
        <input type="hidden" name="eventId" value="" />
      )}

      <Field
        htmlFor="attribution"
        label="How it reads"
        hint={`Leave blank for “${rule.attribution} [Sponsor]”. The desk chooses the register, not the sponsor.`}
      >
        <Input id="attribution" name="attribution" maxLength={60} placeholder={rule.attribution} />
      </Field>

      <Button type="submit" size="md" disabled={pending} className="self-start">
        {pending ? 'Proposing…' : 'Propose this placement'}
      </Button>
    </form>
  );
}

/** Approving or removing one. Administration only — the page hides it otherwise. */
export function PlacementDecision({
  sponsorshipId,
  name,
  approved = false,
}: {
  sponsorshipId: string;
  name: string;
  approved?: boolean;
}) {
  const [state, action, pending] = useActionState(decidePlacement, initial);

  if (state.status === 'success') {
    return <span className="palma-label text-olive">{state.message}</span>;
  }

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="sponsorshipId" value={sponsorshipId} />

      {state.status === 'error' && state.message ? (
        <span className="palma-label text-champagne-deep">{state.message}</span>
      ) : null}

      {approved ? null : (
        <Button type="submit" name="decision" value="approve" size="sm" disabled={pending}>
          {pending ? 'Saving…' : 'Approve'}
        </Button>
      )}
      <Button
        type="submit"
        name="decision"
        value="remove"
        variant="ghost"
        size="sm"
        disabled={pending}
      >
        {approved ? `Remove ${name}` : 'Decline'}
      </Button>
    </form>
  );
}
