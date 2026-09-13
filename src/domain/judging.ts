export const SCORING_CRITERIA = [
  {
    key: 'originality',
    label: 'Originality',
    description: 'Distinctiveness of the work and the ideas behind it.',
  },
  {
    key: 'consistency',
    label: 'Consistency',
    description: 'Sustained quality and output across the eligibility window.',
  },
  {
    key: 'professionalism',
    label: 'Professionalism',
    description: 'Conduct, reliability and standards in how the work is made.',
  },
  {
    key: 'impact',
    label: 'Impact',
    description: 'Influence on audiences, peers and the wider creator industry.',
  },
  {
    key: 'brand',
    label: 'Brand',
    description: 'Coherence and craft of the creator’s public identity.',
  },
] as const;

export type CriterionKey = (typeof SCORING_CRITERIA)[number]['key'];

export const MIN_SCORE = 0;
export const MAX_SCORE = 10;
export const MAX_TOTAL = SCORING_CRITERIA.length * MAX_SCORE;

export type ScoreCard = Record<CriterionKey, number>;

export function isValidScore(value: number): boolean {
  return Number.isInteger(value) && value >= MIN_SCORE && value <= MAX_SCORE;
}

export function validateScoreCard(card: Partial<ScoreCard>):
  | { ok: true; card: ScoreCard }
  | {
      ok: false;
      errors: Partial<Record<CriterionKey, string>>;
    } {
  const errors: Partial<Record<CriterionKey, string>> = {};
  const result = {} as ScoreCard;

  for (const criterion of SCORING_CRITERIA) {
    const value = card[criterion.key];
    if (value === undefined || Number.isNaN(value)) {
      errors[criterion.key] = `${criterion.label} is required.`;
      continue;
    }
    if (!isValidScore(value)) {
      errors[criterion.key] = `${criterion.label} must be a whole number from 0 to 10.`;
      continue;
    }
    result[criterion.key] = value;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, card: result };
}

export function totalScore(card: ScoreCard): number {
  return SCORING_CRITERIA.reduce((sum, criterion) => sum + card[criterion.key], 0);
}

export type NominationScores = { nominationId: string; totals: number[] };

export type AggregatedScore = {
  nominationId: string;
  judgeCount: number;
  total: number;
  mean: number;
  /** Mean with the single highest and lowest judge removed, once a panel is large enough. */
  trimmedMean: number;
  spread: number;
};

/**
 * Panels disagree, and a single outlier should not decide a PALMA. Once four or
 * more judges have scored, the highest and lowest are trimmed before ranking.
 */
export function aggregate(input: NominationScores): AggregatedScore {
  const totals = [...input.totals].sort((a, b) => a - b);
  const judgeCount = totals.length;
  const sum = totals.reduce((a, b) => a + b, 0);
  const mean = judgeCount === 0 ? 0 : sum / judgeCount;

  let trimmedMean = mean;
  if (judgeCount >= 4) {
    const trimmed = totals.slice(1, -1);
    trimmedMean = trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
  }

  const spread = judgeCount === 0 ? 0 : (totals[judgeCount - 1] ?? 0) - (totals[0] ?? 0);

  return {
    nominationId: input.nominationId,
    judgeCount,
    total: sum,
    mean: round(mean),
    trimmedMean: round(trimmedMean),
    spread,
  };
}

export function rank(entries: NominationScores[]): AggregatedScore[] {
  return entries
    .map(aggregate)
    .sort((a, b) =>
      b.trimmedMean !== a.trimmedMean
        ? b.trimmedMean - a.trimmedMean
        : b.judgeCount !== a.judgeCount
          ? b.judgeCount - a.judgeCount
          : a.nominationId.localeCompare(b.nominationId),
    );
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
