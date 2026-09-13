import { z } from 'zod';
import { MAX_STATEMENT_LENGTH, MIN_STATEMENT_LENGTH } from '@/domain/eligibility';
import { checkEvidenceLink } from '@/domain/content-policy';

export const EVIDENCE_KINDS = [
  'external_link',
  'press_mention',
  'metric_statement',
  'testimonial',
  'award_record',
  'other',
] as const;

const evidenceUrl = z
  .string()
  .trim()
  .max(500, 'That link is too long.')
  .superRefine((value, ctx) => {
    const result = checkEvidenceLink(value);
    if (!result.ok) ctx.addIssue({ code: 'custom', message: result.reason });
  })
  .transform((value) => {
    const result = checkEvidenceLink(value);
    return result.ok ? result.url : value;
  });

export const evidenceItemSchema = z.object({
  kind: z.enum(EVIDENCE_KINDS).default('external_link'),
  label: z.string().trim().min(3, 'Describe the evidence.').max(140),
  url: evidenceUrl,
  note: z.string().trim().max(400).optional().or(z.literal('')),
});

export const nominationSchema = z.object({
  awardYear: z.coerce.number().int().min(2020).max(2100),
  categorySlug: z.string().trim().min(1, 'Choose a category.'),
  creatorSlug: z.string().trim().min(1).optional(),
  creatorName: z.string().trim().min(2, 'Enter the creator’s name.').max(120),
  creatorCountry: z
    .string()
    .trim()
    .length(2, 'Select a country.')
    .transform((value) => value.toUpperCase()),
  creatorProfileUrl: z.string().trim().max(500).optional().or(z.literal('')),
  source: z.enum(['self', 'public_nominator', 'authorised_nominator']),
  nominatorName: z.string().trim().max(120).optional().or(z.literal('')),
  nominatorEmail: z.string().trim().email('Enter a valid email address.').max(200),
  nominatorRelation: z.string().trim().max(140).optional().or(z.literal('')),
  statement: z
    .string()
    .trim()
    .min(MIN_STATEMENT_LENGTH, `Write at least ${MIN_STATEMENT_LENGTH} characters.`)
    .max(MAX_STATEMENT_LENGTH, `Keep this under ${MAX_STATEMENT_LENGTH} characters.`),
  evidence: z.array(evidenceItemSchema).min(1, 'Add at least one piece of evidence.').max(6),
  ageConfirmed: z.literal(true, { message: 'Confirm the nominee is 18 or over.' }),
  eligibilityConfirmed: z.literal(true, { message: 'Confirm the eligibility declaration.' }),
  contentPolicyConfirmed: z.literal(true, { message: 'Accept the PALMA content policy.' }),
  // Anti-automation fields. Never shown to a person.
  website: z.string().max(0).optional(),
  formRenderedAt: z.coerce.number().int().nonnegative().optional(),
});

export type NominationInput = z.infer<typeof nominationSchema>;

export function parseNominationFormData(formData: FormData) {
  const evidence: unknown[] = [];
  for (let index = 0; index < 6; index += 1) {
    const url = formData.get(`evidence.${index}.url`);
    if (typeof url !== 'string' || url.trim() === '') continue;
    evidence.push({
      kind: formData.get(`evidence.${index}.kind`) ?? 'external_link',
      label: formData.get(`evidence.${index}.label`) ?? '',
      url,
      note: formData.get(`evidence.${index}.note`) ?? '',
    });
  }

  return nominationSchema.safeParse({
    awardYear: formData.get('awardYear'),
    categorySlug: formData.get('categorySlug'),
    creatorSlug: formData.get('creatorSlug') || undefined,
    creatorName: formData.get('creatorName'),
    creatorCountry: formData.get('creatorCountry'),
    creatorProfileUrl: formData.get('creatorProfileUrl') ?? '',
    source: formData.get('source'),
    nominatorName: formData.get('nominatorName') ?? '',
    nominatorEmail: formData.get('nominatorEmail'),
    nominatorRelation: formData.get('nominatorRelation') ?? '',
    statement: formData.get('statement'),
    evidence,
    ageConfirmed: formData.get('ageConfirmed') === 'on' || formData.get('ageConfirmed') === 'true',
    eligibilityConfirmed:
      formData.get('eligibilityConfirmed') === 'on' ||
      formData.get('eligibilityConfirmed') === 'true',
    contentPolicyConfirmed:
      formData.get('contentPolicyConfirmed') === 'on' ||
      formData.get('contentPolicyConfirmed') === 'true',
    website: formData.get('website') ?? '',
    formRenderedAt: formData.get('formRenderedAt') ?? undefined,
  });
}

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || 'form';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
