# PALMA — The Creator Honours

PALMA is a UK creator-industry awards institution. It recognises achievement and
keeps the permanent record of it: nominations, judging, honours, and a public
archive — the **PALMA Roll of Honour (PaROH)** — that is designed to still be
citable a decade from now.

PALMA is not a content platform, a social network, a subscription service or a
marketplace. It hosts no creator work and brokers nothing.

> PALMA is not the event. PALMA is the record. The event is one expression of it.

---

## Quick start

```bash
npm install
cp .env.example .env.local          # fill in AUTH_SECRET at minimum
npx prisma generate

# With PostgreSQL (full application):
npm run db:push
npm run db:seed
npm run dev

# Without PostgreSQL (public site only, from the bundled reference dataset):
echo 'PALMA_ARCHIVE_MODE="1"' >> .env.local
npm run dev
```

Nomination emails go through **Resend**. Without `RESEND_API_KEY` the
development server writes the verification code to its own log so the flow can
be exercised offline; in production the nomination is refused rather than the
code silently dropped.

Seeded accounts use the password in `SEED_PASSWORD` (default
`Palma-Development-2027`):

| Account                  | Role          | Portal     |
| ------------------------ | ------------- | ---------- |
| `admin@palmaawards.com`  | `super_admin` | `/admin`   |
| `editor@palmaawards.com` | `editor`      | `/portal`  |
| `chair@palmaawards.com`  | `judge`       | `/judging` |

## Scripts

| Script                     | What it does                                           |
| -------------------------- | ------------------------------------------------------ |
| `npm run dev`              | Development server                                     |
| `npm run build` / `start`  | Production build and server                            |
| `npm run verify`           | Typecheck, lint and unit tests — run before committing |
| `npm test`                 | Unit tests (no database required)                      |
| `npm run test:integration` | Awards-engine tests against PostgreSQL                 |
| `npm run db:push`          | Apply the Prisma schema                                |
| `npm run db:seed`          | Load the reference dataset                             |

## Two run modes

| Mode        | Trigger                                   | Behaviour                                                               |
| ----------- | ----------------------------------------- | ----------------------------------------------------------------------- |
| **Live**    | `DATABASE_URL` set                        | Everything. Reads and writes hit PostgreSQL.                            |
| **Archive** | No `DATABASE_URL`, `PALMA_ARCHIVE_MODE=1` | Public pages render from the bundled reference dataset; writes refused. |

Archive mode exists so the institution's public face can be built, designed and
reviewed without infrastructure. It is never a substitute for the database in
production, which is why running it there requires an explicit opt-in rather
than a missing variable.

## Architecture

```
src/
  app/            Routes. Public record, portals (/portal, /judging, /admin),
                  verification, share cards, sitemap and robots.
  components/
    brand/        Wordmark, palm mark, institutional seal
    ui/           Design-system primitives
    palma/        Editorial components (creator cards, winner reveal, PaROH…)
  domain/         Pure institutional logic — no I/O, fully unit-tested:
                  season stages, eligibility, judging and aggregation,
                  conflict-aware assignment, selection, integrity, policy
  lib/            Crypto, env validation, RBAC, verification codes, SEO
  server/
    actions/      Server Actions (the only write path)
    data/         Read layer — Prisma when live, reference dataset otherwise
    email/        Resend client and the two messages PALMA sends
    services/     Honours: conferral, verification records, revocation
    audit.ts      Append-only audit service
prisma/           Schema and seed
tests/            Unit tests; tests/integration needs PostgreSQL
```

The rule that shapes the layout: **`domain/` never touches I/O.** Eligibility,
score aggregation, conflict handling and selection are pure functions, so the
rules of the institution can be read, reasoned about and tested without a
database.

## Audience nominates. PALMA judges.

Two different things are kept apart in the data model, and that separation is
the whole design:

|                |                                                                                                          |
| -------------- | -------------------------------------------------------------------------------------------------------- |
| **Nomination** | One person's signal that a creator deserves consideration.                                               |
| **Candidacy**  | A creator's candidacy in one category of one season. This is what is judged, and what carries an honour. |

Many nominations point at one candidacy. **Nothing in the judging path reads the
count** — judges never see it, it is never published, and no ranking derives
from it. Popularity brings a creator to PALMA's attention and stops there.

### Nominating

Under a minute, no account, no evidence, no essay. Someone names a creator, says
why in a sentence, confirms their email, and leaves.

```
Search creator → category → a sentence → email → six-digit code → submit
```

Creators with a claimed, verified profile get their own link —
`palmaawards.com/nominate/maya-rivers` — which pre-selects them and changes
nothing else. It says "this is my nomination page", not "vote for me", and a
nomination made through it counts exactly as one made any other way.

Rules, enforced in the database rather than the form:

- One nomination per person, per creator, per category, per season.
- The same person may nominate other creators, and the same creator in other
  categories, as often as they like.
- A creator cannot nominate themselves, whichever alias of their address
  they use.
- A nomination does not exist until its email is verified. The submit button
  stays disabled, and the server refuses an unverified submission regardless.

### The season

Four public beats — **Nominate → Shortlist → Finalists → Winners** — advancing
one stage at a time.

1. **Nomination.** Free, open to anyone. Runs rate limit → validation →
   integrity assessment → verified email → counted, with an audit entry.
2. **Screening.** A person rules on each _candidacy_ — eligible, ineligible or
   withdrawn — before it reaches a judge. PALMA gathers the evidence itself.
3. **Judging.** At least three judges score each candidacy independently against
   five published criteria out of ten. Audience size is not a criterion, and
   nomination counts are not shown. Scores are immutable once submitted.
4. **Selection.** Once four or more judges have scored, the highest and lowest
   are trimmed before ranking. The ranking is a recommendation; an administrator
   confirms it, and that act is what confers an honour.
5. **The record.** Conferring mints an `Achievement` and a signed
   `VerificationRecord` in the same transaction, and the creator's profile
   becomes public.

## Verification

Every honour has a permanent URL: `/verify/PM-2027-XXXXXX`.

The code is derived (`HMAC(secret, year + honourId)`), so it is unguessable and
reveals nothing about how many honours exist. The record is signed over its
identity fields — code, creator, category, season, kind, issue date — and the
signature is re-checked on **every request**. Altering any stored field breaks
the signature and the page refuses to present the record as verified. This is
covered by unit tests and verified end to end against PostgreSQL.

Revocation never deletes. A revoked honour, its achievement and its verification
page all remain, marked revoked — an institution that quietly erases its
mistakes cannot be trusted about its successes.

## Integrity and security

- Server-side authorisation for every privileged action, from a single
  permission matrix (`src/lib/auth/rbac.ts`). Client components hide UI; they
  never grant it.
- scrypt password hashing, hashed session tokens, double-submit CSRF plus
  same-origin checks, and secure headers including a strict CSP.
- Durable rate limiting, honeypot and completion-timing signals, duplicate and
  near-duplicate detection, disposable-address screening, and human review of
  every candidacy before judging.
- Integrity safeguards are calibrated for legitimate mobilisation: a creator
  sharing their link and an audience answering is expected behaviour. Only a
  filled honeypot refuses outright; everything else flags a candidacy for a
  moderator rather than rejecting the person in front of us. IP address is never
  a basis for refusal on its own.
- IP addresses are never stored — only a salted one-way digest.
- Age and identity assurance is delegated to a third-party provider. PALMA
  stores the status, the provider reference and the date. Never a document.
- Sponsors hold **no role in the permission matrix at all**. Sponsorship is
  recorded against a season or category and grants nothing.
- Append-only audit log covering nominations, eligibility, assignment,
  conflicts, scores, honours, revocations, moderation and role changes.

## Design

| Token       | Value     | Use                                   |
| ----------- | --------- | ------------------------------------- |
| Ink         | `#161719` | Dark surfaces, typography, navigation |
| Warm Ivory  | `#F4F0E8` | Primary light background              |
| Stone       | `#D8D3C9` | Cards, borders, secondary surfaces    |
| Muted Taupe | `#AAA397` | Secondary typography, subdued UI      |
| Deep Olive  | `#4A5148` | Institutional accent                  |
| Champagne   | `#C9B58A` | Ceremonial accent — used sparingly    |

Display serif (Fraunces) for the wordmark, titles and honours; contemporary sans
(Inter) for navigation, forms and data. Motion is ceremonial rather than
decorative, and `prefers-reduced-motion` removes it entirely — the winner reveal
stays a complete, still composition.

Motion is a layered system, not scattered animation: CSS owns hover, focus and
press at zero hydration cost; Motion owns entrances, exits and shared-element
layout; GSAP owns the scroll choreography of a season; Three.js owns the trophy.
GSAP and Three.js are in no route's first load, and neither is fetched at all
under `prefers-reduced-motion`.

See [`docs/DESIGN.md`](docs/DESIGN.md) for the visual system,
[`docs/MOTION.md`](docs/MOTION.md) for the interaction language, and
[`docs/OPERATIONS.md`](docs/OPERATIONS.md) for running a season.

## Before launch

Two areas are deliberately staged rather than finished, and both need
specialist input:

- **Legal.** `/legal/privacy` and `/legal/terms` set out intended practice and
  are marked draft. They must be reviewed and completed by UK counsel, together
  with the age-verification approach.
- **Age verification.** The architecture is in place (status, provider
  reference, `verified_at`, no documents stored) but no provider is integrated.
  `AGE_VERIFICATION_PROVIDER` currently points at a stub.
