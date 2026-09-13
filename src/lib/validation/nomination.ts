import { z } from 'zod';
import { MAX_REASON_LENGTH, MIN_REASON_LENGTH } from '@/domain/nomination';

/**
 * What PALMA asks a nominator for: a creator, a category, a sentence, and an
 * email address. Nothing else — no account, no evidence, no attachments.
 */
export const nominationDraftSchema = z.object({
  creatorSlug: z.string().trim().min(1, 'Choose the creator you are nominating.').max(120),
  categorySlug: z.string().trim().min(1, 'Choose a category.').max(120),
  reason: z
    .string()
    .trim()
    .min(MIN_REASON_LENGTH, `Tell us why in at least ${MIN_REASON_LENGTH} characters.`)
    .max(MAX_REASON_LENGTH, `Keep it under ${MAX_REASON_LENGTH} characters.`),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Enter an email address we can send a code to.')
    .max(200),
  /** Present when the nomination arrived through a creator's own link. */
  referralSlug: z.string().trim().max(120).optional().or(z.literal('')),
  // Anti-automation fields. Never shown to a person.
  website: z.string().max(0).optional(),
  formRenderedAt: z.coerce.number().int().nonnegative().optional(),
});

export const verifyCodeSchema = z.object({
  nominationId: z.string().trim().min(1),
  code: z
    .string()
    .trim()
    .transform((value) => value.replace(/[\s-]/g, ''))
    .pipe(z.string().regex(/^\d{6}$/, 'Enter the six-digit code from your email.')),
});

export const submitNominationSchema = z.object({
  nominationId: z.string().trim().min(1),
});

export type NominationDraftInput = z.infer<typeof nominationDraftSchema>;

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || 'form';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
