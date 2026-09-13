import { describe, expect, it } from 'vitest';
import { fieldErrors, nominationSchema } from '@/lib/validation/nomination';

const valid = {
  awardYear: 2027,
  categorySlug: 'best-independent-creator',
  creatorName: 'Maya Rivers',
  creatorCountry: 'gb',
  source: 'public_nominator' as const,
  nominatorEmail: 'nominator@example.com',
  statement:
    'Maya has published a researched long-form essay every month for six years without an agency behind her, and her work on platform labour changed how other creators publish their own numbers.',
  evidence: [{ kind: 'external_link' as const, label: 'Series finale', url: 'example.com/finale' }],
  ageConfirmed: true as const,
  eligibilityConfirmed: true as const,
  contentPolicyConfirmed: true as const,
};

describe('nomination schema', () => {
  it('accepts a complete nomination and normalises its values', () => {
    const result = nominationSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.creatorCountry).toBe('GB');
      expect(result.data.evidence[0]?.url).toBe('https://example.com/finale');
    }
  });

  it('requires every declaration to be accepted', () => {
    for (const key of ['ageConfirmed', 'eligibilityConfirmed', 'contentPolicyConfirmed'] as const) {
      const result = nominationSchema.safeParse({ ...valid, [key]: false });
      expect(result.success, key).toBe(false);
    }
  });

  it('requires at least one piece of evidence and caps it at six', () => {
    expect(nominationSchema.safeParse({ ...valid, evidence: [] }).success).toBe(false);
    expect(
      nominationSchema.safeParse({
        ...valid,
        evidence: Array.from({ length: 7 }, () => valid.evidence[0]),
      }).success,
    ).toBe(false);
  });

  it('refuses evidence links that are not safe external references', () => {
    const result = nominationSchema.safeParse({
      ...valid,
      evidence: [{ kind: 'external_link' as const, label: 'Bad', url: 'javascript:alert(1)' }],
    });
    expect(result.success).toBe(false);
  });

  it('refuses a statement that is too short to judge', () => {
    expect(nominationSchema.safeParse({ ...valid, statement: 'Great.' }).success).toBe(false);
  });

  it('reports errors keyed by field for the form to render', () => {
    const result = nominationSchema.safeParse({ ...valid, nominatorEmail: 'not-an-email' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(fieldErrors(result.error)).toHaveProperty('nominatorEmail');
    }
  });

  it('treats the honeypot as a field that must stay empty', () => {
    expect(nominationSchema.safeParse({ ...valid, website: 'http://spam' }).success).toBe(false);
    expect(nominationSchema.safeParse({ ...valid, website: '' }).success).toBe(true);
  });
});
