/**
 * Email verification for nominations.
 *
 * A nomination is not a nomination until the address behind it has answered a
 * code. No password, no account, no profile — one code, once.
 */

export const CODE_LENGTH = 6;
export const CODE_TTL_SECONDS = 15 * 60;
export const MAX_ATTEMPTS = 5;
/** A fresh code may be requested only this often, per address. */
export const RESEND_COOLDOWN_SECONDS = 60;

export const CODE_PATTERN = /^\d{6}$/;

export function isValidCodeFormat(value: string): boolean {
  return CODE_PATTERN.test(normaliseCode(value));
}

/** People type codes with spaces and dashes. Accept it. */
export function normaliseCode(value: string): string {
  return value.replace(/[\s-]/g, '').trim();
}

export type CodeState = {
  expiresAt: Date | string;
  attempts: number;
  consumedAt: Date | string | null;
};

export type CodeCheck =
  | { ok: true }
  | { ok: false; code: 'expired' | 'consumed' | 'too_many_attempts' | 'mismatch'; message: string };

/**
 * Everything about a stored code except the comparison itself, which must be
 * done in constant time against the stored hash by the caller.
 */
export function checkCodeState(state: CodeState, now = new Date()): CodeCheck {
  if (state.consumedAt) {
    return {
      ok: false,
      code: 'consumed',
      message: 'That code has already been used. Request a new one.',
    };
  }

  if (new Date(state.expiresAt).getTime() < now.getTime()) {
    return { ok: false, code: 'expired', message: 'That code has expired. Request a new one.' };
  }

  if (state.attempts >= MAX_ATTEMPTS) {
    return {
      ok: false,
      code: 'too_many_attempts',
      message: 'Too many attempts. Request a new code.',
    };
  }

  return { ok: true };
}

export function expiryFrom(now = new Date()): Date {
  return new Date(now.getTime() + CODE_TTL_SECONDS * 1000);
}

export function canResend(lastSentAt: Date | string | null, now = new Date()): boolean {
  if (!lastSentAt) return true;
  return now.getTime() - new Date(lastSentAt).getTime() >= RESEND_COOLDOWN_SECONDS * 1000;
}
