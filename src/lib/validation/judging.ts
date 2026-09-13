import { z } from 'zod';
import { MAX_SCORE, MIN_SCORE, SCORING_CRITERIA } from '@/domain/judging';
import { CONFLICT_KINDS } from '@/domain/conflicts';

const criterion = z.coerce.number().int().min(MIN_SCORE).max(MAX_SCORE);

export const scoreSchema = z.object({
  assignmentId: z.string().trim().min(1),
  originality: criterion,
  consistency: criterion,
  professionalism: criterion,
  impact: criterion,
  brand: criterion,
  remarks: z.string().trim().max(1500).optional().or(z.literal('')),
  conflictDeclared: z.boolean().default(false),
});

export const conflictSchema = z.object({
  nominationId: z.string().trim().min(1),
  kind: z.enum(CONFLICT_KINDS.map((entry) => entry.key) as [string, ...string[]]),
  note: z.string().trim().max(1000).optional().or(z.literal('')),
});

export const scoreCorrectionSchema = z.object({
  scoreId: z.string().trim().min(1),
  ...Object.fromEntries(SCORING_CRITERIA.map((entry) => [entry.key, criterion])),
  correctionNote: z
    .string()
    .trim()
    .min(20, 'A correction must be explained in at least 20 characters.')
    .max(1000),
});

export type ScoreInput = z.infer<typeof scoreSchema>;
