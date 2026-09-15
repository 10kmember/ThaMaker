/**
 * The kinds of honour PALMA confers.
 *
 * One list. It was three: `server/data/types.ts`, `server/services/honours.ts`
 * and an inline union inside `lib/verification.ts`, each written out by hand and
 * each a place the set could be extended without the others noticing. The
 * verification signature binds the kind, so a divergence there is not a typing
 * inconvenience, it is a record that cannot be checked.
 */

export const HONOUR_KINDS = [
  'shortlist',
  'finalist',
  'winner',
  'special_recognition',
  'the_palma',
] as const;

export type HonourKind = (typeof HONOUR_KINDS)[number];

/** How an honour is named in public: on a record, a badge, a citation. */
export const HONOUR_LABEL: Record<HonourKind, string> = {
  winner: 'PALMA Winner',
  finalist: 'PALMA Finalist',
  shortlist: 'PALMA Shortlist',
  special_recognition: 'Special Recognition',
  // No qualifier, and no "winner of". A recipient holds THE PALMA.
  the_palma: 'THE PALMA',
};

/**
 * The one honour that is not held in a category.
 *
 * Anything walking the record has to branch here: a PALMA has no category to
 * name, no candidacy behind it, and it is never listed among the twelve. This
 * is the single predicate for all of that, so a new surface asks one question
 * rather than inventing its own answer.
 */
export function isThePalma(kind: HonourKind): boolean {
  return kind === 'the_palma';
}

/**
 * The slug a PALMA stands under where a category slug is expected.
 *
 * The record is full of places that carry a category slug for an honour: the
 * PaROH, a creator's list of honours, a verification page. THE PALMA has no
 * category, so rather than make every one of those fields nullable and every
 * consumer branch, it stands under its own name and `honourHref` sends it to
 * its own page instead of to a category that does not exist.
 */
export const THE_PALMA_SLUG = 'the-palma';

/** The public name of the thing an honour was conferred in. */
export function honourCategoryName(kind: HonourKind, categoryName: string | null): string {
  return isThePalma(kind) ? HONOUR_LABEL.the_palma : (categoryName ?? '');
}

/** The slug of the thing an honour was conferred in. */
export function honourCategorySlug(kind: HonourKind, categorySlug: string | null): string {
  return isThePalma(kind) ? THE_PALMA_SLUG : (categorySlug ?? '');
}

/**
 * Where an honour points in public.
 *
 * A category honour points at its category in the season it was won. THE PALMA
 * points at its own page, and carries no year parameter because there is one a
 * season and the page says which.
 */
export function honourHref(kind: HonourKind, categorySlug: string, year: number): string {
  if (isThePalma(kind)) return '/the-palma';
  return `/categories/${categorySlug}?year=${year}`;
}

/** Whether a kind mints a permanent, citable achievement record. */
export function mintsAchievement(kind: HonourKind): boolean {
  return (
    kind === 'finalist' ||
    kind === 'winner' ||
    kind === 'special_recognition' ||
    kind === 'the_palma'
  );
}

export function isHonourKind(value: string): value is HonourKind {
  return (HONOUR_KINDS as readonly string[]).includes(value);
}
