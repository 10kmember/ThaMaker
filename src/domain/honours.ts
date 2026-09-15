/**
 * The kinds of honour PALMA confers.
 *
 * One list. It was three: `server/data/types.ts`, `server/services/honours.ts`
 * and an inline union inside `lib/verification.ts`, each written out by hand and
 * each a place the set could be extended without the others noticing. The
 * verification signature binds the kind, so a divergence there is not a typing
 * inconvenience, it is a record that cannot be checked.
 */

export const HONOUR_KINDS = ['shortlist', 'finalist', 'winner', 'special_recognition'] as const;

export type HonourKind = (typeof HONOUR_KINDS)[number];

/** How an honour is named in public: on a record, a badge, a citation. */
export const HONOUR_LABEL: Record<HonourKind, string> = {
  winner: 'PALMA Winner',
  finalist: 'PALMA Finalist',
  shortlist: 'PALMA Shortlist',
  special_recognition: 'Special Recognition',
};

/** Whether a kind mints a permanent, citable achievement record. */
export function mintsAchievement(kind: HonourKind): boolean {
  return kind === 'finalist' || kind === 'winner' || kind === 'special_recognition';
}

export function isHonourKind(value: string): value is HonourKind {
  return (HONOUR_KINDS as readonly string[]).includes(value);
}
