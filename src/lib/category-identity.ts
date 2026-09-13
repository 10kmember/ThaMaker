/**
 * Category identity.
 *
 * Eight PALMAs, eight pigments. A category should become something a reader
 * recognises before they have read its name — on a card, in a header, against
 * a finalist, beside a line in the Roll of Honour.
 *
 * The colours are assigned by slug rather than by position, so adding or
 * reordering categories never shuffles an identity that people have started to
 * learn. A category PALMA has not seen before falls back to olive, which is the
 * institution's own accent — never an arbitrary colour.
 */
export const CATEGORY_PIGMENTS = [
  'laurel',
  'oxblood',
  'indigo',
  'verdigris',
  'aubergine',
  'terracotta',
  'slate',
  'amber',
] as const;

export type Pigment = (typeof CATEGORY_PIGMENTS)[number];

const ASSIGNED: Record<string, Pigment> = {
  'creator-of-the-year': 'amber',
  'best-independent-creator': 'oxblood',
  'best-new-creator': 'verdigris',
  'creative-direction': 'aubergine',
  'community-impact': 'laurel',
  'business-of-creating': 'slate',
  'craft-in-video': 'indigo',
  'industry-contribution': 'terracotta',
};

/**
 * Deterministic fallback for a category PALMA has not met: the same slug always
 * gets the same pigment, so a new category is stable from the day it appears.
 */
function derive(slug: string): Pigment {
  let hash = 0;
  for (let index = 0; index < slug.length; index += 1) {
    hash = (hash * 31 + slug.charCodeAt(index)) % 9973;
  }
  return CATEGORY_PIGMENTS[hash % CATEGORY_PIGMENTS.length]!;
}

export function pigmentFor(slug: string | null | undefined): Pigment {
  if (!slug) return 'laurel';
  return ASSIGNED[slug] ?? derive(slug);
}

/**
 * The pigment as a CSS custom property, to be set on a container. Everything
 * beneath it then paints with `text-(--palma-pigment)` and friends, so a card
 * needs one attribute rather than eight conditional class names.
 */
export function pigmentStyle(slug: string | null | undefined): React.CSSProperties {
  const pigment = pigmentFor(slug);
  return {
    '--palma-pigment': `var(--color-${pigment})`,
    '--palma-pigment-ink': `var(--color-${pigment}-ink, var(--color-${pigment}))`,
  } as React.CSSProperties;
}
