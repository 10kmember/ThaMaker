import { z } from 'zod';
import { passwordSchema } from '@/lib/auth/password-policy';

export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
  next: z.string().trim().max(500).optional(),
  /** Which door this attempt came through. Unknown values fall back to the creator door. */
  entrance: z.enum(['creator', 'judge', 'moderator', 'admin']).default('creator'),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name.').max(120),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  password: passwordSchema,
  acceptTerms: z.literal(true, { message: 'Accept the PALMA terms to continue.' }),
});

export const creatorProfileSchema = z.object({
  displayName: z.string().trim().min(2, 'Enter a display name.').max(120),
  pronouns: z.string().trim().max(40).optional().or(z.literal('')),
  countryCode: z
    .string()
    .trim()
    .length(2, 'Select a country.')
    .transform((value) => value.toUpperCase()),
  city: z.string().trim().max(80).optional().or(z.literal('')),
  headline: z.string().trim().max(160).optional().or(z.literal('')),
  biography: z.string().trim().max(2000).optional().or(z.literal('')),
  websiteUrl: z.string().trim().url('Enter a valid link.').max(400).optional().or(z.literal('')),
});

/**
 * Where the work lives.
 *
 * A creator gives these when they start a record and keeps them current
 * afterwards: they are what the editorial desk reads the record from, and a
 * dead link is worse than no link. Between one and six, same as the start
 * form — a record with none tells PALMA nothing.
 */
export const creatorLinksSchema = z.object({
  links: z
    .array(
      z.object({
        label: z.string().trim().min(1, 'Name each link.').max(80),
        url: z.string().trim().url('Enter a valid link.').max(400),
      }),
    )
    .min(1, 'Keep at least one link to your work.')
    .max(6, 'Six links is the limit.'),
});

export const notificationPreferenceSchema = z.object({
  seasonAnnouncements: z.boolean(),
  nominationUpdates: z.boolean(),
  honourAnnouncements: z.boolean(),
  journalDigest: z.boolean(),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreatorProfileInput = z.infer<typeof creatorProfileSchema>;
export type CreatorLinksInput = z.infer<typeof creatorLinksSchema>;
