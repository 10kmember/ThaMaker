import { describe, expect, it } from 'vitest';
import {
  aggregate,
  MAX_TOTAL,
  rank,
  SCORING_CRITERIA,
  totalScore,
  validateScoreCard,
} from '@/domain/judging';

describe('score cards', () => {
  it('requires every criterion', () => {
    const result = validateScoreCard({ originality: 8 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(Object.keys(result.errors)).toContain('consistency');
  });

  it('rejects scores outside 0–10 and non-integers', () => {
    const card = Object.fromEntries(SCORING_CRITERIA.map((c) => [c.key, 5]));
    expect(validateScoreCard({ ...card, impact: 11 } as never).ok).toBe(false);
    expect(validateScoreCard({ ...card, impact: -1 } as never).ok).toBe(false);
    expect(validateScoreCard({ ...card, impact: 7.5 } as never).ok).toBe(false);
  });

  it('totals a full card', () => {
    const card = Object.fromEntries(SCORING_CRITERIA.map((c) => [c.key, 10])) as never;
    const validated = validateScoreCard(card);
    expect(validated.ok).toBe(true);
    if (validated.ok) expect(totalScore(validated.card)).toBe(MAX_TOTAL);
  });
});

describe('aggregation', () => {
  it('uses the plain mean below four judges', () => {
    const result = aggregate({ candidacyId: 'n1', totals: [30, 40, 50] });
    expect(result.judgeCount).toBe(3);
    expect(result.mean).toBe(40);
    expect(result.trimmedMean).toBe(40);
  });

  it('trims the highest and lowest once four judges have scored', () => {
    // A hostile 0 and an enthusiastic 50 should not decide this candidacy.
    const result = aggregate({ candidacyId: 'n1', totals: [0, 40, 42, 50] });
    expect(result.mean).toBe(33);
    expect(result.trimmedMean).toBe(41);
    expect(result.spread).toBe(50);
  });

  it('handles an unscored candidacy without dividing by zero', () => {
    const result = aggregate({ candidacyId: 'n1', totals: [] });
    expect(result.mean).toBe(0);
    expect(result.trimmedMean).toBe(0);
    expect(result.judgeCount).toBe(0);
  });

  it('ranks by trimmed mean, then judge count, then id', () => {
    const ranked = rank([
      { candidacyId: 'b', totals: [40, 40, 40] },
      { candidacyId: 'a', totals: [45, 45, 45] },
      { candidacyId: 'c', totals: [40, 40] },
    ]);
    expect(ranked.map((entry) => entry.candidacyId)).toEqual(['a', 'b', 'c']);
  });
});
