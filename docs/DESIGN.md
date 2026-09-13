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

```
Ink          #161719   dark surfaces, typography, navigation
Warm Ivory   #F4F0E8   primary light background
Stone        #D8D3C9   cards, borders, secondary surfaces
Muted Taupe  #AAA397   secondary typography, subdued UI
Deep Olive   #4A5148   institutional accent
Champagne    #C9B58A   ceremonial accent
```

Champagne marks an honour: a winner's label, a seal, an active season beat. It
is never a surface, never a gradient, and never a button fill on its own.

Tokens live in `src/app/globals.css` under `@theme`, so they are available as
Tailwind utilities (`bg-ink`, `text-champagne-deep`, `border-stone-deep`).

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
