/**
 * Nomination integrity.
 *
 * PALMA is decided by judges, not by volume. These signals exist to keep
 * automated and coordinated submissions out of the judging pool — never to
 * rank creators by popularity.
 */

export type IntegritySignalInput = {
  /** Hidden field that only automated clients tend to complete. */
  honeypot: string | null | undefined;
  /** Milliseconds between the form being rendered and submitted. */
  elapsedMs: number | null | undefined;
  statement: string;
  evidenceUrls: string[];
  nominatorEmail?: string | null;
  /** Nominations already made from this identity inside the current window. */
  recentSubmissions: number;
};

export type IntegrityAssessment = {
  /** 0 (clean) to 100 (almost certainly abusive). */
  score: number;
  /** Reject outright. */
  reject: boolean;
  /** Accept, but route to manual moderation. */
  flagForReview: boolean;
  signals: string[];
};

const MIN_HUMAN_COMPLETION_MS = 4000;
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  'guerrillamail.com',
  '10minutemail.com',
  'yopmail.com',
  'trashmail.com',
]);

export function assessIntegrity(input: IntegritySignalInput): IntegrityAssessment {
  const signals: string[] = [];
  let score = 0;

  if (input.honeypot && input.honeypot.trim().length > 0) {
    signals.push('honeypot_filled');
    score += 100;
  }

  if (typeof input.elapsedMs === 'number' && input.elapsedMs >= 0) {
    if (input.elapsedMs < MIN_HUMAN_COMPLETION_MS) {
      signals.push('submitted_too_quickly');
      score += 45;
    }
  }

  const statement = input.statement.trim();
  if (statement.length > 0) {
    const words = statement.split(/\s+/);
    const unique = new Set(words.map((word) => word.toLowerCase()));
    if (words.length >= 20 && unique.size / words.length < 0.35) {
      signals.push('repetitive_statement');
      score += 25;
    }
    if (/(https?:\/\/[^\s]+){4,}/.test(statement)) {
      signals.push('link_stuffed_statement');
      score += 20;
    }
    if (statement === statement.toUpperCase() && statement.length > 60) {
      signals.push('shouting_statement');
      score += 10;
    }
  }

  const hosts = input.evidenceUrls
    .map((url) => {
      try {
        return new URL(url).hostname.replace(/^www\./, '');
      } catch {
        return null;
      }
    })
    .filter((host): host is string => host !== null);

  if (hosts.length > 0 && new Set(hosts).size === 1 && hosts.length >= 4) {
    signals.push('single_source_evidence');
    score += 10;
  }

  const domain = input.nominatorEmail?.split('@')[1]?.toLowerCase();
  if (domain && DISPOSABLE_DOMAINS.has(domain)) {
    signals.push('disposable_email');
    score += 35;
  }

  if (input.recentSubmissions >= 3) {
    signals.push('high_submission_rate');
    score += 15 * (input.recentSubmissions - 2);
  }

  score = Math.min(100, score);

  return {
    score,
    reject: score >= 80,
    flagForReview: score >= 30 && score < 80,
    signals,
  };
}

/**
 * Duplicate detection across a category. Exact (year, category, creator) pairs
 * are already prevented by the database; this catches the softer case of the
 * same nominator re-submitting near-identical statements.
 */
export function looksLikeDuplicate(a: string, b: string): boolean {
  const normalise = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  const left = normalise(a);
  const right = normalise(b);
  if (!left || !right) return false;
  if (left === right) return true;

  const leftWords = new Set(left.split(' '));
  const rightWords = new Set(right.split(' '));
  const intersection = [...leftWords].filter((word) => rightWords.has(word)).length;
  const union = new Set([...leftWords, ...rightWords]).size;
  return union > 0 && intersection / union > 0.85;
}
