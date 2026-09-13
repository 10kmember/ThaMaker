import { describe, expect, it } from 'vitest';
import {
  canResend,
  checkCodeState,
  CODE_TTL_SECONDS,
  expiryFrom,
  isValidCodeFormat,
  MAX_ATTEMPTS,
  normaliseCode,
  RESEND_COOLDOWN_SECONDS,
} from '@/domain/verification-code';

const now = new Date('2027-01-15T12:00:00.000Z');

describe('verification codes', () => {
  it('accepts a code as a person would type it', () => {
    expect(normaliseCode(' 123 456 ')).toBe('123456');
    expect(normaliseCode('123-456')).toBe('123456');
    expect(isValidCodeFormat('123 456')).toBe(true);
    expect(isValidCodeFormat('12345')).toBe(false);
    expect(isValidCodeFormat('abcdef')).toBe(false);
  });

  it('expires', () => {
    const expiresAt = expiryFrom(now);
    expect(expiresAt.getTime() - now.getTime()).toBe(CODE_TTL_SECONDS * 1000);

    expect(checkCodeState({ expiresAt, attempts: 0, consumedAt: null }, now).ok).toBe(true);
    expect(
      checkCodeState(
        { expiresAt, attempts: 0, consumedAt: null },
        new Date(expiresAt.getTime() + 1),
      ),
    ).toMatchObject({ ok: false, code: 'expired' });
  });

  it('is single use', () => {
    expect(
      checkCodeState({ expiresAt: expiryFrom(now), attempts: 0, consumedAt: now }, now),
    ).toMatchObject({ ok: false, code: 'consumed' });
  });

  it('cannot be brute-forced', () => {
    expect(
      checkCodeState({ expiresAt: expiryFrom(now), attempts: MAX_ATTEMPTS, consumedAt: null }, now),
    ).toMatchObject({ ok: false, code: 'too_many_attempts' });

    expect(
      checkCodeState(
        { expiresAt: expiryFrom(now), attempts: MAX_ATTEMPTS - 1, consumedAt: null },
        now,
      ).ok,
    ).toBe(true);
  });

  it('rate-limits resending per address', () => {
    expect(canResend(null, now)).toBe(true);
    expect(canResend(new Date(now.getTime() - 1000), now)).toBe(false);
    expect(canResend(new Date(now.getTime() - RESEND_COOLDOWN_SECONDS * 1000), now)).toBe(true);
  });
});
