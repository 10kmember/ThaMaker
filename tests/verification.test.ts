import { describe, expect, it } from 'vitest';
import {
  canonicalPayload,
  deriveCode,
  isValidCodeFormat,
  normaliseCode,
  signAchievement,
  verifyAchievement,
  type AchievementPayload,
} from '@/lib/verification';

const SECRET = 'test-secret-test-secret-test-secret-0123';

const payload: AchievementPayload = {
  code: 'PM-2027-K4T9RD',
  creatorSlug: 'maya-rivers',
  creatorName: 'Maya Rivers',
  categoryName: 'Best Independent Creator',
  year: 2027,
  kind: 'winner',
  issuedAt: '2027-09-23T18:00:00.000Z',
};

describe('verification codes', () => {
  it('produces a well-formed, stable code for an honour', () => {
    const code = deriveCode(SECRET, 2027, 'honour-abc');
    expect(code).toMatch(/^PM-2027-[0-9A-HJKMNP-TV-Z]{6}$/);
    expect(deriveCode(SECRET, 2027, 'honour-abc')).toBe(code);
  });

  it('gives different honours different codes', () => {
    expect(deriveCode(SECRET, 2027, 'honour-a')).not.toBe(deriveCode(SECRET, 2027, 'honour-b'));
    expect(deriveCode(SECRET, 2027, 'honour-a')).not.toBe(deriveCode(SECRET, 2028, 'honour-a'));
  });

  it('normalises codes as a person would type them', () => {
    expect(normaliseCode(' pm-2027-k4t9rd ')).toBe('PM-2027-K4T9RD');
    expect(normaliseCode('PM2027K4T9RD')).toBe('PM-2027-K4T9RD');
    expect(isValidCodeFormat('pm-2027-k4t9rd')).toBe(true);
    expect(isValidCodeFormat('PM-27-K4T9RD')).toBe(false);
    expect(isValidCodeFormat('NOT-A-CODE')).toBe(false);
  });
});

describe('achievement signatures', () => {
  it('verifies an untouched record', () => {
    const signature = signAchievement(SECRET, payload);
    expect(verifyAchievement(SECRET, payload, signature)).toBe(true);
  });

  it('fails if any identity field is altered', () => {
    const signature = signAchievement(SECRET, payload);

    const tampered: Partial<AchievementPayload>[] = [
      { creatorName: 'Someone Else' },
      { creatorSlug: 'someone-else' },
      { categoryName: 'Creator of the Year' },
      { year: 2028 },
      { kind: 'finalist' },
      { code: 'PM-2027-AAAAAA' },
      { issuedAt: '2028-01-01T00:00:00.000Z' },
    ];

    for (const patch of tampered) {
      expect(
        verifyAchievement(SECRET, { ...payload, ...patch }, signature),
        JSON.stringify(patch),
      ).toBe(false);
    }
  });

  it('fails under a different signing key', () => {
    const signature = signAchievement(SECRET, payload);
    expect(verifyAchievement('a-different-secret-entirely-0123456789', payload, signature)).toBe(
      false,
    );
  });

  it('rejects a forged signature of the right shape', () => {
    expect(verifyAchievement(SECRET, payload, 'x'.repeat(43))).toBe(false);
  });

  it('binds every field into the canonical payload', () => {
    const canonical = canonicalPayload(payload);
    for (const value of [
      payload.code,
      payload.creatorSlug,
      payload.creatorName,
      payload.categoryName,
      String(payload.year),
      payload.kind,
      payload.issuedAt,
    ]) {
      expect(canonical).toContain(value);
    }
  });
});
