'use client';

import * as React from 'react';
import { useActionState } from 'react';
import Link from 'next/link';
import { Check, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox, CheckboxField, Field, Input, Select, Textarea } from '@/components/ui/form';
import { Notice } from '@/components/ui/feedback';
import { PalmaSeal } from '@/components/brand/PalmaSeal';
import { submitNomination, type NominationState } from '@/server/actions/nomination';
import { COUNTRIES } from '@/lib/countries';
import { EVIDENCE_KINDS } from '@/lib/validation/nomination';
import { MAX_STATEMENT_LENGTH, MIN_STATEMENT_LENGTH } from '@/domain/eligibility';
import { cn, ordinal, titleCase } from '@/lib/utils';

type CategoryOption = { slug: string; name: string; strapline: string | null };

const STEPS = [
  { key: 'creator', label: 'Creator' },
  { key: 'category', label: 'Category' },
  { key: 'evidence', label: 'Evidence' },
  { key: 'eligibility', label: 'Eligibility' },
  { key: 'review', label: 'Review' },
  { key: 'submit', label: 'Submit' },
] as const;

type StepKey = (typeof STEPS)[number]['key'];

type EvidenceRow = { kind: string; label: string; url: string; note: string };

const EMPTY_EVIDENCE: EvidenceRow = { kind: 'external_link', label: '', url: '', note: '' };

const initialState: NominationState = { status: 'idle' };

export function NominationForm({
  year,
  categories,
  defaultCategory,
}: {
  year: number;
  categories: CategoryOption[];
  defaultCategory?: string;
}) {
  const [state, formAction, pending] = useActionState(submitNomination, initialState);
  const [step, setStep] = React.useState(0);
  const [renderedAt] = React.useState(() => Date.now());

  const [creatorName, setCreatorName] = React.useState('');
  const [creatorCountry, setCreatorCountry] = React.useState('GB');
  const [creatorProfileUrl, setCreatorProfileUrl] = React.useState('');
  const [categorySlug, setCategorySlug] = React.useState(defaultCategory ?? '');
  const [source, setSource] = React.useState<'self' | 'public_nominator' | 'authorised_nominator'>(
    'public_nominator',
  );
  const [nominatorName, setNominatorName] = React.useState('');
  const [nominatorEmail, setNominatorEmail] = React.useState('');
  const [nominatorRelation, setNominatorRelation] = React.useState('');
  const [statement, setStatement] = React.useState('');
  const [evidence, setEvidence] = React.useState<EvidenceRow[]>([{ ...EMPTY_EVIDENCE }]);
  const [localError, setLocalError] = React.useState<string | null>(null);

  const current = STEPS[step]!;
  const serverErrors = state.errors ?? {};

  const selectedCategory = categories.find((entry) => entry.slug === categorySlug);

  function validateStep(key: StepKey): string | null {
    if (key === 'creator') {
      if (creatorName.trim().length < 2) return 'Enter the creator’s name.';
      if (!creatorCountry) return 'Select the country they work from.';
      if (!nominatorEmail.includes('@')) return 'Enter an email address we can reach you on.';
    }
    if (key === 'category' && !categorySlug) return 'Choose the category being contested.';
    if (key === 'evidence') {
      const filled = evidence.filter((row) => row.url.trim() && row.label.trim());
      if (filled.length === 0) return 'Add at least one piece of evidence, with a description.';
      if (statement.trim().length < MIN_STATEMENT_LENGTH) {
        return `The supporting statement needs at least ${MIN_STATEMENT_LENGTH} characters.`;
      }
    }
    return null;
  }

  function next() {
    const error = validateStep(current.key);
    if (error) {
      setLocalError(error);
      return;
    }
    setLocalError(null);
    setStep((value) => Math.min(value + 1, STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function back() {
    setLocalError(null);
    setStep((value) => Math.max(value - 1, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (state.status === 'success') {
    return (
      <div className="border-stone-deep bg-ivory-bright flex flex-col items-center gap-8 border px-6 py-20 text-center">
        <PalmaSeal className="text-olive h-40 w-40" sublegend="NOMINATION RECEIVED" />
        <div className="flex max-w-140 flex-col gap-4">
          <h2 className="text-4xl">Nomination received</h2>
          <p className="text-taupe-deep leading-relaxed">
            Your nomination has been entered into the PALMA {year} season and will be reviewed by a
            person before it reaches the panel. Keep the reference below — it is how PALMA can find
            this nomination.
          </p>
          <p className="font-mono text-xl tracking-[0.16em]">{state.reference}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild variant="outline" size="sm">
            <Link href="/categories">View the categories</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/nominate">Nominate someone else</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-12 lg:grid-cols-12">
      {/* Step rail */}
      <nav aria-label="Nomination steps" className="lg:col-span-3">
        <ol className="flex gap-4 overflow-x-auto lg:flex-col lg:gap-0 lg:overflow-visible">
          {STEPS.map((entry, index) => {
            const state_ = index === step ? 'current' : index < step ? 'complete' : 'upcoming';
            return (
              <li key={entry.key} className="lg:border-stone-deep shrink-0 lg:border-l">
                <button
                  type="button"
                  onClick={() => index < step && setStep(index)}
                  disabled={index > step}
                  aria-current={state_ === 'current' ? 'step' : undefined}
                  className={cn(
                    'flex items-center gap-3 py-3 text-left lg:-ml-px lg:w-full lg:border-l-2 lg:pl-5',
                    state_ === 'current'
                      ? 'lg:border-ink'
                      : state_ === 'complete'
                        ? 'lg:border-olive'
                        : 'lg:border-transparent',
                    index > step && 'cursor-default',
                  )}
                >
                  <span
                    className={cn(
                      'palma-label',
                      state_ === 'upcoming' ? 'text-taupe' : 'text-taupe-deep',
                    )}
                  >
                    {ordinal(index)}
                  </span>
                  <span
                    className={cn(
                      'font-display text-lg leading-none',
                      state_ === 'current'
                        ? 'text-ink'
                        : state_ === 'complete'
                          ? 'text-olive'
                          : 'text-taupe',
                    )}
                  >
                    {entry.label}
                  </span>
                  {state_ === 'complete' ? (
                    <Check className="text-olive size-3.5" aria-hidden="true" />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <form action={formAction} className="flex flex-col gap-10 lg:col-span-9">
        {/* Persisted values — every step's data travels with the submission. */}
        <input type="hidden" name="awardYear" value={year} />
        <input type="hidden" name="formRenderedAt" value={renderedAt} />
        <input type="hidden" name="creatorName" value={creatorName} />
        <input type="hidden" name="creatorCountry" value={creatorCountry} />
        <input type="hidden" name="creatorProfileUrl" value={creatorProfileUrl} />
        <input type="hidden" name="categorySlug" value={categorySlug} />
        <input type="hidden" name="source" value={source} />
        <input type="hidden" name="nominatorName" value={nominatorName} />
        <input type="hidden" name="nominatorEmail" value={nominatorEmail} />
        <input type="hidden" name="nominatorRelation" value={nominatorRelation} />
        <input type="hidden" name="statement" value={statement} />
        {evidence.map((row, index) => (
          <React.Fragment key={`evidence-${index}`}>
            <input type="hidden" name={`evidence.${index}.kind`} value={row.kind} />
            <input type="hidden" name={`evidence.${index}.label`} value={row.label} />
            <input type="hidden" name={`evidence.${index}.url`} value={row.url} />
            <input type="hidden" name={`evidence.${index}.note`} value={row.note} />
          </React.Fragment>
        ))}

        {/* Honeypot — positioned off-screen, never announced. */}
        <div aria-hidden="true" className="sr-only">
          <label htmlFor="website">Leave this field empty</label>
          <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
        </div>

        {state.status === 'error' && state.message ? (
          <Notice tone="error" title="Nomination not submitted">
            {state.message}
          </Notice>
        ) : null}
        {localError ? (
          <Notice tone="error" title="One moment">
            {localError}
          </Notice>
        ) : null}

        {/* 01 — Creator */}
        {current.key === 'creator' ? (
          <fieldset className="flex flex-col gap-8">
            <legend className="sr-only">The creator</legend>
            <StepHeading
              index={0}
              title="Who are you nominating?"
              description="PALMA recognises people. Give us the name the creator publishes under."
            />

            <Field
              htmlFor="creatorName"
              label="Creator name"
              required
              error={serverErrors.creatorName}
            >
              <Input
                id="creatorName"
                value={creatorName}
                onChange={(event) => setCreatorName(event.target.value)}
                required
                autoComplete="off"
              />
            </Field>

            <Field
              htmlFor="creatorCountry"
              label="Country they work from"
              required
              error={serverErrors.creatorCountry}
            >
              <Select
                id="creatorCountry"
                value={creatorCountry}
                onChange={(event) => setCreatorCountry(event.target.value)}
              >
                {COUNTRIES.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              htmlFor="creatorProfileUrl"
              label="Where their work lives"
              hint="A single link to the creator's own site or primary platform. PALMA points at work; it never republishes it."
            >
              <Input
                id="creatorProfileUrl"
                type="url"
                inputMode="url"
                value={creatorProfileUrl}
                onChange={(event) => setCreatorProfileUrl(event.target.value)}
                placeholder="https://"
              />
            </Field>

            <div className="border-stone-deep flex flex-col gap-4 border-t pt-8">
              <Field htmlFor="source" label="You are nominating as" required>
                <Select
                  id="source"
                  value={source}
                  onChange={(event) => setSource(event.target.value as typeof source)}
                >
                  <option value="self">The creator themselves</option>
                  <option value="public_nominator">A member of the public</option>
                  <option value="authorised_nominator">An authorised nominator</option>
                </Select>
              </Field>

              <div className="grid gap-6 sm:grid-cols-2">
                <Field htmlFor="nominatorName" label="Your name">
                  <Input
                    id="nominatorName"
                    value={nominatorName}
                    onChange={(event) => setNominatorName(event.target.value)}
                    autoComplete="name"
                  />
                </Field>
                <Field
                  htmlFor="nominatorEmail"
                  label="Your email"
                  required
                  hint="Used only to contact you about this nomination."
                  error={serverErrors.nominatorEmail}
                >
                  <Input
                    id="nominatorEmail"
                    type="email"
                    value={nominatorEmail}
                    onChange={(event) => setNominatorEmail(event.target.value)}
                    required
                    autoComplete="email"
                  />
                </Field>
              </div>

              {source !== 'self' ? (
                <Field
                  htmlFor="nominatorRelation"
                  label="Your relationship to the creator"
                  hint="Declared so the panel can weigh the nomination. Not published."
                >
                  <Input
                    id="nominatorRelation"
                    value={nominatorRelation}
                    onChange={(event) => setNominatorRelation(event.target.value)}
                    placeholder="Reader, collaborator, editor…"
                  />
                </Field>
              ) : null}
            </div>
          </fieldset>
        ) : null}

        {/* 02 — Category */}
        {current.key === 'category' ? (
          <fieldset className="flex flex-col gap-8">
            <legend className="sr-only">The category</legend>
            <StepHeading
              index={1}
              title="Which PALMA is being contested?"
              description="One nomination, one category. A creator may be nominated in more than one, but each needs its own nomination and its own evidence."
            />

            <div className="grid gap-3">
              {categories.map((category) => (
                <label
                  key={category.slug}
                  className={cn(
                    'flex cursor-pointer items-start gap-4 border p-5 transition-colors',
                    categorySlug === category.slug
                      ? 'border-ink bg-ink/[0.03]'
                      : 'border-stone-deep hover:border-ink/40',
                  )}
                >
                  <input
                    type="radio"
                    name="category-choice"
                    value={category.slug}
                    checked={categorySlug === category.slug}
                    onChange={() => setCategorySlug(category.slug)}
                    className="mt-1 size-4 accent-[#4A5148]"
                  />
                  <span className="flex flex-col gap-1">
                    <span className="font-display text-xl leading-tight">{category.name}</span>
                    {category.strapline ? (
                      <span className="text-taupe-deep text-sm">{category.strapline}</span>
                    ) : null}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}

        {/* 03 — Evidence */}
        {current.key === 'evidence' ? (
          <fieldset className="flex flex-col gap-8">
            <legend className="sr-only">Evidence</legend>
            <StepHeading
              index={2}
              title="What is the evidence?"
              description="Point, do not publish. Link to work that already exists in public — judges review it where it lives."
            />

            <Notice title="Evidence policy">
              PALMA does not host media. Do not upload or link to explicit material. Links are
              reviewed privately by authorised judges and are never published on the site.
            </Notice>

            <Field
              htmlFor="statement"
              label="Supporting statement"
              required
              hint={`Why this creator, this year, in this category. Between ${MIN_STATEMENT_LENGTH} and ${MAX_STATEMENT_LENGTH} characters.`}
              error={serverErrors.statement}
            >
              <Textarea
                id="statement"
                value={statement}
                onChange={(event) => setStatement(event.target.value)}
                maxLength={MAX_STATEMENT_LENGTH}
                className="min-h-48"
                required
              />
            </Field>
            <p className="text-taupe-deep -mt-6 text-xs" aria-live="polite">
              {statement.trim().length} / {MAX_STATEMENT_LENGTH} characters
            </p>

            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between gap-4">
                <h3 className="palma-label text-taupe-deep">Evidence ({evidence.length}/6)</h3>
                {evidence.length < 6 ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEvidence((rows) => [...rows, { ...EMPTY_EVIDENCE }])}
                  >
                    <Plus aria-hidden="true" />
                    Add evidence
                  </Button>
                ) : null}
              </div>

              {evidence.map((row, index) => (
                <div
                  key={index}
                  className="border-stone-deep bg-ivory-bright flex flex-col gap-4 border p-5"
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="palma-label text-taupe-deep">{ordinal(index)}</span>
                    {evidence.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => setEvidence((rows) => rows.filter((_, i) => i !== index))}
                        className="text-taupe-deep p-1 transition-colors hover:text-red-800"
                      >
                        <span className="sr-only">Remove evidence {index + 1}</span>
                        <Trash2 className="size-4" aria-hidden="true" />
                      </button>
                    ) : null}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field htmlFor={`evidence-kind-${index}`} label="Type">
                      <Select
                        id={`evidence-kind-${index}`}
                        value={row.kind}
                        onChange={(event) =>
                          setEvidence((rows) =>
                            rows.map((r, i) =>
                              i === index ? { ...r, kind: event.target.value } : r,
                            ),
                          )
                        }
                      >
                        {EVIDENCE_KINDS.map((kind) => (
                          <option key={kind} value={kind}>
                            {titleCase(kind)}
                          </option>
                        ))}
                      </Select>
                    </Field>

                    <Field htmlFor={`evidence-label-${index}`} label="What is it?" required>
                      <Input
                        id={`evidence-label-${index}`}
                        value={row.label}
                        onChange={(event) =>
                          setEvidence((rows) =>
                            rows.map((r, i) =>
                              i === index ? { ...r, label: event.target.value } : r,
                            ),
                          )
                        }
                        placeholder="Series finale, June 2026"
                      />
                    </Field>
                  </div>

                  <Field
                    htmlFor={`evidence-url-${index}`}
                    label="Link"
                    required
                    error={serverErrors[`evidence.${index}.url`]}
                  >
                    <Input
                      id={`evidence-url-${index}`}
                      type="url"
                      inputMode="url"
                      value={row.url}
                      onChange={(event) =>
                        setEvidence((rows) =>
                          rows.map((r, i) => (i === index ? { ...r, url: event.target.value } : r)),
                        )
                      }
                      placeholder="https://"
                    />
                  </Field>

                  <Field htmlFor={`evidence-note-${index}`} label="Why it matters">
                    <Input
                      id={`evidence-note-${index}`}
                      value={row.note}
                      onChange={(event) =>
                        setEvidence((rows) =>
                          rows.map((r, i) =>
                            i === index ? { ...r, note: event.target.value } : r,
                          ),
                        )
                      }
                    />
                  </Field>
                </div>
              ))}
            </div>
          </fieldset>
        ) : null}

        {/* 04 — Eligibility */}
        {current.key === 'eligibility' ? (
          <fieldset className="flex flex-col gap-8">
            <legend className="sr-only">Eligibility</legend>
            <StepHeading
              index={3}
              title="Eligibility declarations"
              description="These are the conditions on which PALMA accepts a nomination. All three are required."
            />

            <div className="border-stone-deep bg-ivory-bright flex flex-col gap-6 border p-6">
              <CheckboxField
                id="ageConfirmed"
                name="ageConfirmed"
                label="The nominee is 18 years old or over."
                description="PALMA recognises adult professionals only. Verification is completed by a specialist provider before any honour is conferred."
                error={serverErrors.ageConfirmed}
              />
              <CheckboxField
                id="eligibilityConfirmed"
                name="eligibilityConfirmed"
                label="This nomination meets the published eligibility rules for the category."
                description={
                  selectedCategory
                    ? `Eligibility for ${selectedCategory.name} is published in full on its category page.`
                    : undefined
                }
                error={serverErrors.eligibilityConfirmed}
              />
              <CheckboxField
                id="contentPolicyConfirmed"
                name="contentPolicyConfirmed"
                label="I accept the PALMA content policy."
                description="No explicit material, no sexual services, no fabricated achievements, no impersonation. Evidence links point at work that already exists in public."
                error={serverErrors.contentPolicyConfirmed}
              />
            </div>

            <p className="text-taupe-deep text-sm leading-relaxed">
              Nominations are reviewed by a person before they reach the panel. Fabricated evidence
              or impersonation ends a nomination and may end a creator’s eligibility.{' '}
              <Link href="/about/policy" className="hover:text-ink underline underline-offset-4">
                Read the content policy
              </Link>
              .
            </p>
          </fieldset>
        ) : null}

        {/* 05 — Review */}
        {current.key === 'review' ? (
          <div className="flex flex-col gap-8">
            <StepHeading
              index={4}
              title="Review the nomination"
              description="Check it as the panel will read it."
            />

            <dl className="grid gap-x-10 gap-y-6 sm:grid-cols-2">
              <Summary label="Creator" value={creatorName} />
              <Summary
                label="Country"
                value={COUNTRIES.find((c) => c.code === creatorCountry)?.name ?? creatorCountry}
              />
              <Summary label="Category" value={selectedCategory?.name ?? '—'} />
              <Summary label="Season" value={`PALMA ${year}`} />
              <Summary label="Nominating as" value={titleCase(source)} />
              <Summary label="Contact" value={nominatorEmail} />
            </dl>

            <div className="border-stone-deep flex flex-col gap-3 border-t pt-6">
              <span className="palma-label text-taupe-deep">Supporting statement</span>
              <p className="text-ink/85 leading-relaxed whitespace-pre-wrap">{statement}</p>
            </div>

            <div className="border-stone-deep flex flex-col gap-3 border-t pt-6">
              <span className="palma-label text-taupe-deep">Evidence</span>
              <ul className="flex flex-col gap-3">
                {evidence
                  .filter((row) => row.url.trim())
                  .map((row, index) => (
                    <li key={index} className="flex flex-col gap-1">
                      <span className="font-display text-lg">
                        {row.label || 'Untitled evidence'}
                      </span>
                      <span className="text-taupe-deep text-sm break-all">{row.url}</span>
                      {row.note ? <span className="text-taupe text-sm">{row.note}</span> : null}
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        ) : null}

        {/* 06 — Submit */}
        {current.key === 'submit' ? (
          <div className="flex flex-col gap-8">
            <StepHeading
              index={5}
              title="Submit the nomination"
              description="Once submitted, a nomination enters the PALMA record and cannot be edited. PALMA will contact you if anything needs clarifying."
            />

            <div className="border-stone-deep bg-ivory-bright text-taupe-deep flex flex-col gap-4 border p-6 text-sm leading-relaxed">
              <p>
                Nominating is free. Volume of nominations does not advance a creator — the shortlist
                is produced by judges, from evidence.
              </p>
              <p>
                PALMA stores the details above for the purpose of running the season. Evidence links
                are visible only to authorised judges and administrators.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox id="finalConfirm" required />
              <label htmlFor="finalConfirm" className="text-[0.9375rem] leading-relaxed">
                I confirm the information in this nomination is accurate to the best of my
                knowledge.
              </label>
            </div>
          </div>
        ) : null}

        {/* Controls */}
        <div className="border-stone-deep flex items-center justify-between gap-4 border-t pt-8">
          <Button type="button" variant="ghost" size="sm" onClick={back} disabled={step === 0}>
            Back
          </Button>

          {current.key === 'submit' ? (
            <Button type="submit" size="lg" disabled={pending}>
              {pending ? 'Submitting…' : 'Submit nomination'}
            </Button>
          ) : (
            <Button type="button" size="md" onClick={next}>
              Continue
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

function StepHeading({
  index,
  title,
  description,
}: {
  index: number;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <span className="palma-label text-taupe-deep">{ordinal(index)}</span>
      <h2 className="text-3xl leading-tight sm:text-4xl">{title}</h2>
      <p className="text-taupe-deep max-w-140 leading-relaxed">{description}</p>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-stone-deep flex flex-col gap-1.5 border-t pt-4">
      <dt className="palma-label text-taupe-deep">{label}</dt>
      <dd className="font-display text-lg break-words">{value || '—'}</dd>
    </div>
  );
}
