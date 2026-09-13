import { describe, expect, it } from 'vitest';
import { assessIntegrity, looksLikeDuplicate } from '@/domain/integrity';

const clean = {
  honeypot: '',
  elapsedMs: 90_000,
  statement:
    'Maya has published a researched long-form essay every month for six years without an agency, and her work on platform labour changed how three other creators publish their own numbers.',
  evidenceUrls: ['https://example.com/a', 'https://other.example/b'],
  nominatorEmail: 'someone@example.com',
  recentSubmissions: 0,
};

describe('nomination integrity', () => {
  it('passes an ordinary human submission', () => {
    const result = assessIntegrity(clean);
    expect(result.score).toBe(0);
    expect(result.reject).toBe(false);
    expect(result.flagForReview).toBe(false);
  });

  it('rejects a filled honeypot outright', () => {
    const result = assessIntegrity({ ...clean, honeypot: 'http://spam' });
    expect(result.reject).toBe(true);
    expect(result.signals).toContain('honeypot_filled');
  });

  it('flags a form completed faster than a person could read it', () => {
    const result = assessIntegrity({ ...clean, elapsedMs: 800 });
    expect(result.signals).toContain('submitted_too_quickly');
    expect(result.flagForReview).toBe(true);
  });

  it('flags repetitive keyword-stuffed statements', () => {
    const result = assessIntegrity({
      ...clean,
      statement: Array.from({ length: 40 }, () => 'best creator').join(' '),
    });
    expect(result.signals).toContain('repetitive_statement');
  });

  it('flags disposable nominator addresses', () => {
    const result = assessIntegrity({ ...clean, nominatorEmail: 'burner@mailinator.com' });
    expect(result.signals).toContain('disposable_email');
  });

  it('escalates with repeat submissions from the same source', () => {
    const modest = assessIntegrity({ ...clean, recentSubmissions: 3 });
    const heavy = assessIntegrity({ ...clean, recentSubmissions: 6 });
    expect(heavy.score).toBeGreaterThan(modest.score);
    expect(heavy.signals).toContain('high_submission_rate');
  });

  it('caps the score at 100', () => {
    const result = assessIntegrity({
      ...clean,
      honeypot: 'x',
      elapsedMs: 10,
      recentSubmissions: 20,
    });
    expect(result.score).toBe(100);
  });
});

describe('duplicate detection', () => {
  it('catches identical statements regardless of punctuation and case', () => {
    expect(looksLikeDuplicate('Great work, all year!', 'great work all year')).toBe(true);
  });

  it('catches near-identical resubmissions', () => {
    const a = 'She published every single month this year without an agency behind her at all';
    const b = 'She published every single month this year without an agency behind her';
    expect(looksLikeDuplicate(a, b)).toBe(true);
  });

  it('does not flag genuinely different statements', () => {
    expect(
      looksLikeDuplicate(
        'His preservation work has been cited by two national archives.',
        'She records the recipes of Birmingham kitchens before they are lost.',
      ),
    ).toBe(false);
  });

  it('handles empty input', () => {
    expect(looksLikeDuplicate('', 'something')).toBe(false);
  });
});
