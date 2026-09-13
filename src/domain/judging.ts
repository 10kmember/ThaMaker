export const SCORING_CRITERIA = [
  {
    key: 'originality',
    label: 'Originality',
    description: 'Distinctiveness of the work and the ideas behind it.',
    guidance:
      'Would this work be recognisable as theirs with the name removed? Score the ideas and the form they take, not how unusual the subject happens to be this year.',
  },
  {
    key: 'consistency',
    label: 'Consistency',
    description: 'Sustained quality and output across the eligibility window.',
    guidance:
      'One exceptional piece is not a body of work. Look for quality held across the season, and do not penalise a deliberately small output that is uniformly strong.',
  },
  {
    key: 'professionalism',
    label: 'Professionalism',
    description: 'Conduct, reliability and standards in how the work is made.',
    guidance:
      'Craft, rigour, corrections, credit given to collaborators, and how the creator conducts themselves in the making. Not politeness, and not media training.',
  },
  {
    key: 'impact',
    label: 'Impact',
    description: 'Influence on audiences, peers and the wider creator industry.',
    guidance:
      'What changed because this work exists — practice other creators picked up, a subject taken seriously, a standard raised. Reach is not impact. Ignore audience size entirely.',
  },
  {
    key: 'brand',
    label: 'Brand',
    description: 'Coherence and craft of the creator’s public identity.',
    guidance:
      'How deliberately the work is presented: naming, design, titling, the fit between what is promised and what is delivered. Not how commercial it is.',
  },
] as const;

export type CriterionKey = (typeof SCORING_CRITERIA)[number]['key'];

export const MIN_SCORE = 0;
export const MAX_SCORE = 10;
export const MAX_TOTAL = SCORING_CRITERIA.length * MAX_SCORE;

export type ScoreCard = Record<CriterionKey, number>;

/**
 * The rationale.
 *
 * A score without reasoning is an opinion PALMA cannot defend. Judges write a
 * short argument — not an essay, and not a sentence — that a stranger reading
 * the case file afterwards could follow.
 */
export const RATIONALE_MIN_WORDS = 50;
export const RATIONALE_MAX_WORDS = 500;

export function countWords(value: string): number {
  const trimmed = value.trim();
  return trimmed === '' ? 0 : trimmed.split(/\s+/).length;
}

export function validateRationale(value: string): { ok: true } | { ok: false; message: string } {
  const words = countWords(value);
  if (words < RATIONALE_MIN_WORDS) {
    return {
      ok: false,
      message: `A rationale needs at least ${RATIONALE_MIN_WORDS} words. You have written ${words}.`,
    };
  }
  if (words > RATIONALE_MAX_WORDS) {
    return {
      ok: false,
      message: `A rationale is capped at ${RATIONALE_MAX_WORDS} words. You have written ${words}.`,
    };
  }
  return { ok: true };
}

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

export type CandidacyScores = { candidacyId: string; totals: number[] };

export type AggregatedScore = {
  candidacyId: string;
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
 *
 * Nothing here reads how many nominations a candidacy received: popularity
 * brings a creator to PALMA's attention, and stops there.
 */
export function aggregate(input: CandidacyScores): AggregatedScore {
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
    candidacyId: input.candidacyId,
    judgeCount,
    total: sum,
    mean: round(mean),
    trimmedMean: round(trimmedMean),
    spread,
  };
}

export function rank(entries: CandidacyScores[]): AggregatedScore[] {
  return entries
    .map(aggregate)
    .sort((a, b) =>
      b.trimmedMean !== a.trimmedMean
        ? b.trimmedMean - a.trimmedMean
        : b.judgeCount !== a.judgeCount
          ? b.judgeCount - a.judgeCount
          : a.candidacyId.localeCompare(b.candidacyId),
    );
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
