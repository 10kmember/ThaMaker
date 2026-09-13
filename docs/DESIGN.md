# PALMA — design system

The test every component must pass:

> Does this make PALMA feel more like an institution, or more like another
> website?

If it makes PALMA feel like another website, remove it. If an animation exists
only because it looks good, remove it.

---

## 1. Brand

**PALMA** is the brand. The interface says PALMA, not "Palma Awards" —
`palmaawards.com` is the address, and "Palma Awards" appears only in SEO
metadata, legal copy and descriptive contexts.

**The Creator Honours** is the institutional descriptor. It sits under the
wordmark, never replaces it.

The palm is an idea, not an illustration: victory, honour, achievement. It
appears as engraved line geometry, a seal, a watermark — never a tropical
motif, a beach, or a resort.

### Identity components

| Component | File                             | Use                                          |
| --------- | -------------------------------- | -------------------------------------------- |
| Wordmark  | `components/brand/Wordmark.tsx`  | `primary` alone, `lockup` with the palm mark |
| Palm mark | `components/brand/PalmMark.tsx`  | Compact mark, watermark, engraving           |
| Seal      | `components/brand/PalmaSeal.tsx` | Winners, certificates, verification, badges  |

The seal is the one place the ceremonial register is allowed to be explicit.

## 2. Colour

### The core six

```
Ink          #161719   dark surfaces, typography, navigation
Warm Ivory   #F4F0E8   primary light background
Stone        #D8D3C9   cards, borders, secondary surfaces
Muted Taupe  #AAA397   secondary typography, subdued UI
Deep Olive   #4A5148   institutional accent
Champagne    #C9B58A   ceremonial accent
```

The names are **roles, not descriptions**: `ivory` is the paper and `ink` is
what is printed on it. That is what makes the whole interface themeable from
six variables — under a dark theme the paper is dark and the ink is light, and
the relationship holds.

Champagne marks an honour: a winner's label, a seal, an active season beat. It
is never a surface, never a gradient, and never a button fill on its own.

### Category pigments

Eight heraldic accents, one per PALMA. This is where the life comes from: a
category stops being a slug and becomes a colour a reader recognises across
cards, headers, finalists and the Roll of Honour.

| Category                     | Pigment    |
| ---------------------------- | ---------- |
| Creator of the Year          | Amber      |
| Best Independent Creator     | Oxblood    |
| Best New Creator             | Verdigris  |
| Creative Direction           | Aubergine  |
| Community Impact             | Laurel     |
| Business of Creating         | Slate      |
| Craft in Video               | Indigo     |
| Contribution to the Industry | Terracotta |

Chosen as **pigments rather than screen colours** so they sit with ink and ivory
instead of shouting over them. Rules:

- A pigment is a **mark** — a crest, a rule, a plate, a tint. Never a page
  background, never a large fill.
- Two tones per pigment. The plain token carries real chroma for marks; the
  `-ink` token is darkened (or, on a dark ground, lightened) until it clears
  **WCAG AA** for type. A colour legible as a 3px rule is not legible as an
  11px label.
- Assigned by slug in `src/lib/category-identity.ts`, so reordering categories
  never shuffles an identity people have started to learn. An unknown category
  falls back to a deterministic pigment — the same slug always gets the same
  colour.

Set `pigmentStyle(slug)` on a container and everything beneath paints from it:
`.palma-pigment-crest`, `-rule`, `-text`, `-title`, `-field`, `-border`.

> **Tailwind v4 note.** These live in a plain `:root` block, not `@theme`.
> Tailwind tree-shakes theme tokens no utility references, and these are only
> ever read through `var()` in a style attribute — inside `@theme` they were
> silently dropped and everything fell back to olive.

### Themes

Three, and a theme is a redefinition of the six core colours and nothing else.
No component knows which one is running.

| Theme       | For                                              |
| ----------- | ------------------------------------------------ |
| **Paper**   | The default. The institution as printed          |
| **Ink**     | Dark ground, light type. The ceremony after dark |
| **Archive** | Aged paper, lower contrast. For long reading     |

Every inverted panel on the site already carries `.on-ink`, so each theme also
redefines the paper/ink relationship _inside those panels_. That single hook is
why the hero, headers, winner reveal and portals all re-theme correctly without
one component changing: under Ink they become a deeper panel with light type,
rather than a light slab in the middle of a dark page.

The reader's choice is stored and applied by a tiny inline script before first
paint. A reader who has expressed no choice gets what their system asked for.

### Material

A fixed, 3.5%-opacity generated grain sits over the page — multiply on light
grounds, screen on dark. One composited layer, no requests. It is the
difference between a colour and a stock.

## 3. Typography

Two families, one hierarchy.

**Display serif — Fraunces.** The wordmark, page titles, award names, creator
names, editorial headlines, PaROH entries. Editorial and contemporary, not a
wedding invitation.

**Contemporary sans — Inter.** Navigation, buttons, metadata, forms,
dashboards, labels, tables.

Two recurring classes carry most of the institutional voice:

- `.palma-label` — 11px, uppercase, `0.14em` tracking. Section labels, metadata,
  buttons. The most-used class in the system.
- `.palma-wordmark` — display face, uppercase, `0.24em` tracking.

Long-form Journal copy uses `.palma-prose`, which sets the measure, the
paragraph rhythm and a drop capital on the opening paragraph.

## 4. Navigation

Six destinations: **Awards · Categories · Nominate · PaROH · Journal · About**.

Finalists and Winners are _states of a season_, not permanent places. They are
reached from the season rail (`SeasonRail`), which appears on the homepage, the
awards pages and on the finalist and winner pages themselves, so the rest of the
season is always one click away. A state that has not been reached yet is not a
link.

PaROH keeps its casing everywhere it appears — `.palma-label-brand` exists for
exactly that, because the uppercase label style would otherwise flatten it to
"PAROH".

## 5. Layout

`Container` (`default` / `wide` / `narrow`), `Section` (tones: `ivory`, `stone`,
`ink`, `olive`), `SectionHeading` and `PageHeader` carry the page rhythm. Use
them rather than re-deriving spacing — consistent vertical rhythm is most of
what makes a site feel institutional.

Dark sections take the `on-ink` class, which switches the focus ring to
champagne so focus stays visible on ink.

## 6. Motion

Ceremonial and editorial, never a tech demo.

- `Reveal` — one IntersectionObserver per element, no library. Used for
  editorial reveals and staggered grids (`delay` in milliseconds).
- `--animate-reveal` / `--animate-rise` / `--animate-seal` — the three
  animations in the system. If a fourth is needed, question it.
- `--ease-ceremonial` — `cubic-bezier(0.16, 1, 0.3, 1)`. Everything uses it.

Under `prefers-reduced-motion`, animation is removed entirely and every
composition — the winner reveal included — is complete and still. Motion is
never load-bearing.

No parallax, no scroll hijacking, no particles, no WebGL, no animation on every
component.

## 7. Imagery

`EditorialImage` renders an approved portrait, or an engraved institutional
plate: the creator's initials in the display face over a palm engraving, on a
field chosen deterministically from their name. PALMA never renders stock
photography and never renders explicit imagery.

Every image has an explicit aspect ratio, so nothing shifts as it loads.

## 8. Components

Primitives in `components/ui`: `Button`, `Badge`, `Pill`, `Card`, `Field`,
`Input`, `Select`, `Textarea`, `Checkbox`, `Table`, `Tabs`, `Modal`, `Stat`,
`EmptyState`, `Skeleton`, `Notice`.

Editorial components in `components/palma`: `CreatorCard`, `CategoryCard`,
`FinalistCard`, `WinnerReveal`, `SeasonRail`, `Timeline`, `EditorialImage`,
`AchievementBadge`, `VerificationBadge`, `CopyLink`, `PortalShell`.

The nomination form (`components/nominate`) is held to one rule above all
others: it must stay short. Anything that would add a step, a field or an upload
belongs to PALMA's own process, not to the person nominating.

Build on the design system before duplicating a UI pattern.

## 9. Responsive

Mobile-first. Supported: mobile Safari, Android Chrome, tablet, desktop, large
desktop. No horizontal overflow at any width, no layout shift, explicit image
dimensions, and navigation that collapses to a full-height panel rather than a
cramped dropdown.

## 10. Accessibility

Target WCAG 2.2 AA.

- Semantic HTML: real `<nav>`, `<section>`, `<ol>`, `<dl>`, `<table>`.
- Visible focus on everything interactive; a skip link to `#main`.
- Form fields use `Field`, which wires up labels, hints and `role="alert"`
  errors.
- `aria-current` on active navigation and the current season beat.
- Reduced motion respected globally.
- Decorative SVG is `aria-hidden`; meaningful SVG carries a label.
