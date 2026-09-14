# Running a PALMA season

Operational guide for administrators. Every action described here is recorded in
the audit log with the actor, the entity and the state before and after.

---

## Roles

| Role          | Can                                                                                                          |
| ------------- | ------------------------------------------------------------------------------------------------------------ |
| `visitor`     | Read the public record. Nominate.                                                                            |
| `creator`     | Claim a profile, verify, submit and track nominations.                                                       |
| `judge`       | See their own assignments, score, declare conflicts.                                                         |
| `moderator`   | The whole editorial and moderation job: creator records, the Journal, claims, manual age assurance, reports. |
| `admin`       | Run the season: review, assign, select, revoke, correct, moderate.                                           |
| `super_admin` | Everything, plus users and system settings.                                                                  |

Sponsors hold **no role**. Sponsorship is recorded against a season or category
and grants no access to nominations, judges, scores or outcomes.

## Four paths

| Surface        | Path       | Who                    |
| -------------- | ---------- | ---------------------- |
| Creators       | `/creator` | `creator`              |
| Judges         | `/judge`   | `judge`                |
| Moderation     | `/portal`  | `moderator`            |
| Administration | `/admin`   | `admin`, `super_admin` |

Four paths, one per role, and **each path is both the door and the dashboard
behind it**. Signed out you get that role's sign-in; signed in you get its
dashboard; signed in as somebody else you are sent to your own. Nobody has to
remember a separate sign-in URL, and there is no way to land on a dashboard
that is not yours.

Three of those are platform operators — moderator, judge, administrator. The
creator is not one: a creator holds a record, they do not run the institution.

**Everybody who signs up is a creator.** That is the default and the only role
registration can produce. A judge, moderator or administrator is an account
PALMA has _also_ given a role, so they reach their desk by typing its path —
`palmaawards.com/judge` — and nothing on the creator surface advertises it.
Roles are never offered at sign-up and never self-selected.

**Editorial and moderation are one role.** They were two until it became clear
that neither could finish a task on its own: the person who writes a creator's
record is the person who screens a claim about it. `editor` is gone and
`moderator` holds the whole of it.

Moderators and administrators do not share a dashboard. `homeForRole` sends
each to its own, because a dashboard that is mostly things you cannot open is
worse than a short one that is entirely yours — a moderator's sidebar is six
entries, an administrator's is the institution.

The queues live at `/portal/*`, and an administrator reaches **the same pages**
from their own sidebar rather than a second copy of them.

## The seed

Nine people, and one list declares all of them. `prisma/seed-data.ts` holds a
single `people` array where each entry says what that person _is_ — an
operator, a judge, a creator, or more than one — and the accounts, the panel,
the archive and the claim states are all derived from it. Three parallel lists
would drift; one cannot.

|           |                                                                             |
| --------- | --------------------------------------------------------------------------- |
| Operators | Sarah Okonkwo (super admin), Tom Ashworth (editor), Nadia Bello (moderator) |
| Panel     | Adaeze Mbeki (chair), Frances Okonjo, Marcus Hale                           |
| Creators  | Maya Rivers and Jordan Smith (claimed), Noor Haddad (unclaimed)             |

Every account signs in at its own door with the password from `SEED_PASSWORD`
(default `Palma-Development-2027`), at its own path: administration at
`/admin`, moderation at `/portal`, judges at `/judge`, creators at `/creator`.

Noor Haddad has no account on purpose. PALMA wrote the record when she was
first nominated and nobody holds it — which is the ordinary state of a record
in a young archive, and what the claim flow exists to resolve.

**The seed is authoritative, not additive.** It clears the entities it owns
before writing them, so running it twice leaves exactly the dataset described
in `seed-data.ts`. A seed that only ever adds drifts away from its own
description on the second run, which is how a demonstration database ends up
with fourteen creators nobody chose. Staff and panel accounts on
palmaawards.com are seed-owned and reconciled to the cast; accounts on any
other domain, and rows a person created while testing — a claim, an internal
note, an enforcement proposal — are left alone.

The archive is deliberately thin: three creators, four categories, three
seasons. It is an honest picture of a young institution rather than a fake
picture of a busy one — and it exercises every state, including the one that
matters most. **In 2025 the panel declined Community Impact**: contested,
judged, and no PALMA conferred. The winners page says so under _Contested, not
conferred_ rather than quietly omitting the category, because a rule PALMA
published is worth more when the record shows it being used.

## The administration dashboard

Four dashboards, and the distinction between them is the point:

| Surface           | Answers                   |
| ----------------- | ------------------------- |
| Creator portal    | "My PALMA record."        |
| Judging room      | "My decisions."           |
| Operations queues | "My operational queue."   |
| Administration    | "The entire institution." |

They are not four systems. All four read the same Creator, User, Verification,
Nomination, Candidacy, Honour and Achievement rows — one record, one history,
different permissions. That is also what makes the global search at
`/admin/search` possible: a creator is the same row wherever you meet them, so
one query reaches their record, the account that holds it, their claims, their
cases, their honours and the audit trail of all of it.

### The sidebar is the permission matrix

`src/lib/admin-nav.ts` declares every destination with the permission that
makes it reachable, and `navFor(role)` filters the sidebar to what the signed-in
role can actually open. A greyed-out menu item is just a slower 403, so nobody
is shown a door that will refuse them — and a test asserts that every link any
role can see is one that role can open.

A moderator's sidebar is six entries. A super administrator's is the whole
institution.

### Statistics are counted live

Every figure on `/admin` and `/admin/analytics` is counted against PostgreSQL at
request time. There is no reporting database, no nightly rollup and no second
copy of the truth, because a statistic that disagrees with the page it
summarises is worse than no statistic. Period filtering (7/30/90 days, season,
all time) is applied in the query rather than in JavaScript over a fetched
array.

### Charts

Inline SVG in PALMA's own palette, not a charting library — a dependency with
its own visual opinions would fight the typography and lose the point of it.

The chart colours are separate tokens from the category pigments
(`--palma-chart-*` and `--palma-ramp-*` in `globals.css`), because a chart asks
a different question of a colour than a card does. Two series are validated as a
categorical pair in **both** themes, all-pairs, under simulated protanopia and
deuteranopia; a third exists but is only clean on ivory, so any chart reaching
for it also carries direct labels. Beyond three series PALMA facets rather than
inventing a hue. Funnels and stages take the ordinal ramp — one hue, light to
dark — so the reader sees the order in the colour.

Every chart carries a table view, because a number somebody intends to quote
should be readable exactly.

### Two administrators for the irreversible

A permanent account ban and the revocation of an honour are the two things PALMA
cannot take back cleanly, so neither is one person's decision made at speed:

    administrator proposes (with a reason, recorded in full)
           ↓
    a DIFFERENT administrator approves
           ↓
    executed in one transaction, both names on the record

The proposer cannot approve their own proposal — checked in
`decideConsequentialAction`, not hidden in the interface. Everything else in
enforcement (suspension, session revocation, role change) is reversible and
takes one administrator, with the same audit trail.

Nobody changes their own role or suspends their own account, and only a super
administrator grants or removes that role.

### System health says what is not wired up

`/admin/health` either measures something real — a PostgreSQL round trip, the
presence of a signing secret, whether the email and assurance providers are
configured — or says plainly that a thing is not automated yet. A green tick
against a service PALMA cannot actually reach is worse than no panel, because it
gets believed. Retention deletion is listed as _not configured_, because it is.

### Settings says where each setting lives

Three sources, and the distinction is the content of the page: **database** is
editable in the back office, **env** is a deployment decision, and **code** is a
rule PALMA has published and cannot change without a release. Judging criteria,
nomination limits and selection counts are code on purpose — making them
editable from a dashboard would let a season's rules change after it opened,
which the rules themselves forbid.

## The back office

PALMA Operations is organised around queues, not analytics. The home screen
answers one question — what is waiting on a person — and everything else sits
behind it.

| Queue                   | Path                   | Held by          |
| ----------------------- | ---------------------- | ---------------- |
| Creator claims          | `/portal/claims`       | moderator, admin |
| Manual age verification | `/portal/verification` | moderator, admin |
| Creator records         | `/portal/creators`     | moderator, admin |
| Reports                 | `/portal/reports`      | moderator, admin |

### The two things that are not the same

A **creator profile** is a PALMA record. It exists before the creator has an
account — PALMA writes one the first time a creator is nominated.

A **creator account** is the authenticated person who has successfully claimed
that record.

    PALMA writes the record
           ↓
    public profile exists, unclaimed
           ↓
    creator sees "Is this you?"
           ↓
    claim request + evidence
           ↓
    age and identity assurance
           ↓
    editorial review
           ↓
    APPROVED
           ↓
    User linked to the existing Creator
           ↓
    creator dashboard unlocked

Approving a claim never creates a creator. It links a `User` to the `Creator`
row that already existed, in one transaction, and raises the account to the
`creator` role only if it holds none. The public profile is the same profile it
was the moment before — `Unclaimed` becomes `Claimed`, and nothing else changes.

`Creator.userId` is the truth about who holds a record. `isClaimed` is a
denormalised convenience written on approval, and nothing reads it: a boolean
that can drift from the relation it summarises is not a source of truth.

### When there is no record to claim

The archive is younger than the industry, so an account will often find nothing
to claim. That is not a dead end and it is not a signup form for a profile
page. From `/creator` there are two routes out of it, and both end in the same
place — a record held by that account, unpublished, waiting on a moderator:

| Route               | Who writes the copy | What the creator supplies         |
| ------------------- | ------------------- | --------------------------------- |
| **I will write it** | The creator         | Name, place, headline, bio, links |
| **PALMA writes it** | The editorial desk  | Name, place, links                |

On the request route the headline and biography fields are not even read — a
creator's own words must not be published as PALMA's editorial copy by
accident. Both routes require **at least one link** (up to six): a record with
no links is one the desk cannot check, and an unverifiable record is worse than
none.

Starting a record writes a `CreatorVerification` row at `unverified` and an
internal note saying which route it came in by and who to chase, and audits as
`creator.record_requested` or `creator.record_created`. Nothing is public:
`getCreator` refuses unpublished records, so the public page 404s until a
moderator publishes it from `/portal/creators`.

Age and identity assurance runs **after** the record exists, not before it —
there is nothing to attach an assurance to until then, and no honour is
conferred without it.

### What a claimed creator may change

Presentation only: display name, pronouns, country, city, headline, biography,
portrait, website and links. The list is in `src/domain/claim.ts` and it is the
whole list.

What they may never change, however verified they are: nominations,
candidacies, shortlist, finalist and winner status, honours, judging scores and
assignments, verification history, achievements, PaROH entries, award dates and
the audit log. A test asserts the two lists are disjoint, because a field that
drifted into both would quietly hand PALMA's history to the person it is about.

"Delete my 2027 finalist record" is not a setting. It is a request under
[complaints and appeals](../src/app/legal/complaints/page.tsx), and it is
usually refused.

### Claim invitations

PALMA often knows about a creator before the creator knows about PALMA. An
editor issues an invitation from the record page; the link is shown once, works
once, expires in 30 days, and is stored only as a SHA-256 hash — so it cannot
be read back out of the database.

A token proves PALMA sent the link. It does not prove the holder is the
creator, so it is evidence at review and never a substitute for it.

### Age and identity assurance

PALMA creators must be 18 or over, and PALMA holds no identity documents to
prove it. The creator starts the check from `/creator`; the permanent record is
a status, a provider reference, a result hash and a timestamp, and the whole of
who performs the check sits behind one environment variable:

    AGE_VERIFICATION_PROVIDER

| Value      | Who verifies                                                |
| ---------- | ----------------------------------------------------------- |
| `stub`     | Nobody. Development only — the check is recorded, not made. |
| `manual`   | A moderator, in the restricted workspace below.             |
| A provider | The specialist service, over its own hosted flow.           |

**Today it is moderators.** `startVerification` writes `status: 'pending'` with
the configured provider, and a moderator settles it at `/portal/verification`.
When a third-party provider is contracted, the creator-facing flow does not
change: the same button hands them to the provider's hosted flow, the provider
reports back, and `provider` on the row records which one decided. Rows
verified by a moderator keep saying so — the history is not rewritten to claim
a machine did it.

Manual review never goes away entirely. A provider that cannot settle a case
refers it, and referrals become cases:

    submission
       ↓
    restricted verification workspace
       ↓
    moderator verifies the requirement
       ↓
    result recorded (status + provider reference + result hash)
       ↓
    submitted media deleted
       ↓
    audit event

The permanent record is four small things: a status, a provider reference, a
result hash and a timestamp. Never a document, a date of birth, an ID number or
an address — a test asserts an outcome carrying any of those is rejected.

**A case cannot be closed while media is still held.** Closing is what triggers
deletion, so a closed case with media outstanding would leave documents in a
workspace with nothing left to prompt anyone to remove them. The operator
confirms deletion on the same screen that records the outcome, and the UI shows
the stage explicitly: no media received, held, or deleted.

### Public and internal are never mixed

Everything on the creator record form is published. Anything a member of staff
wants to record privately — provenance, a conversation, a doubt — goes in an
internal note: a different table, a different permission, and never shown to
the creator or the public.

### The editorial boundary

Editorial maintains the _accuracy_ of the record and never its _results_.
`OUTCOME_PERMISSIONS` in `src/lib/auth/rbac.ts` names the six that decide an
award — selection, revocation, score correction, panel assignment, conflict
resolution — and no editor or moderator holds any of them, at any time, by any
route. A test asserts it rather than trusting the matrix to stay right.

## Entrances

PALMA has four entrances, and an account may only use its own. Which roles an
entrance admits is declared once, in `src/lib/auth/entrances.ts`, and
everything else reads from there — the sign-in action, the page guards, the
redirects.

| Entrance       | Path       | Admits                 |
| -------------- | ---------- | ---------------------- |
| Creators       | `/creator` | `creator`              |
| Judges         | `/judge`   | `judge`                |
| Moderation     | `/portal`  | `moderator`            |
| Administration | `/admin`   | `admin`, `super_admin` |

There is no separate sign-in URL. `roleSurface()` is what makes one path serve
twice: no session renders that entrance's panel, a session it admits renders
the dashboard, and a session it does not admit is redirected to its own
entrance. This also settles the performance question behind the design — no
page consults a role to work out _where_ an account belongs, because the path
already says.

The rules that follow from that:

- A correct password at the wrong entrance creates **no session**. The form
  says which entrance the account belongs at, and the attempt is written to the
  audit log as `user.wrong_entrance`.
- An unauthenticated visitor is shown the panel for _the surface they asked
  for_, resolved from the path — so `/judge/history` shows the judges' panel,
  never the creator one. No role lookup is involved, because there is no
  session to look one up from.
- A signed-in account on a surface it is not admitted to is redirected to its
  own rather than shown the refusal page: it is in the wrong building, not
  merely under-permissioned.
- A `next=` parameter cannot carry an account across buildings. A judge signing
  in with `next=/portal/claims` lands in the judging room.

RBAC is unchanged and still decides what a signed-in account may _do_. The
entrances decide only where it may come in.

## The season

Stages advance one step at a time, from `/admin`:

```
announced → nominations_open → nominations_closed → shortlisting
  → shortlist_announced → judging → finalists_announced
  → winners_announced → archived
```

Nominations are accepted in exactly one stage (`nominations_open`). Finalists
become public at `finalists_announced`; winners at `winners_announced`. Until
then, the read layer will not return them, whatever a page asks for.

Going backwards is refused by `canAdvance()`. A genuine correction is a
deliberate database operation, made by a super administrator, and recorded.

## 1. Open nominations

Check before opening:

- The season exists, `isCurrent` is set, and its dates are published.
- Categories exist with eligibility and judging criteria written in full.
- The panel is seated (`JudgePanelMembership`) for the season.

Then advance the stage to `nominations_open`.

## 2. Review nominations

`/admin/nominations`, sorted with the highest integrity scores first.

Each nomination shows its source, evidence count, creator verification status
and integrity score. Decisions: **eligible**, **keep under review**,
**ineligible**, **duplicate**. Anything other than _eligible_ requires a written
reason.

Nominations scoring 80+ on integrity were refused at submission. Those between
30 and 80 reach this queue flagged.

## 3. Assign the panel

`/admin/judging`, per category. Assignment is deterministic and conflict-aware:
each eligible candidacy is placed with three judges, load is spread evenly, and
any judge with an undismissed conflict is excluded before placement.

Running it again adds only what is missing. Where a candidacy could not be fully
covered without a conflict, the result says so — seat another judge rather than
lowering the bar.

## 4. Judging

Judges score independently at `/judge`. Scores are immutable once submitted.

A judge sees the creator, the category, the evidence PALMA gathered, and a
sample of what nominators said — never how many nominated, and never who. The
briefing is explicit that audience size is not a criterion.

A judge who declares a conflict is removed from that nomination immediately;
they are not asked to decide whether it matters. Only an explicit dismissal
restores them, and both acts are audited.

**Score corrections.** If a genuine error is found, an administrator with
`admin:correct_score` may correct it with a written reason of at least 20
characters. The original values, the corrected values, the person and the reason
are all preserved in the audit log.

## 5. Finalists

`/admin/selection` shows, per category: judge count, trimmed mean and spread.
Watch for:

- **Fewer than three judges** — the candidacy is under-judged. Assign more.
- **A spread of 20 or more** — the panel disagrees sharply. Review before
  confirming.
- **A tie at the cut line** — flagged for chair adjudication.

Confirming confers finalist honours on the top four eligible candidacies and
mints a verification record for each. Then advance the stage to
`finalists_announced`.

## 6. Winners

From the same page, once finalists exist. Write the citation — it is published
on the winner page, the PaROH and the verification record.

Confirming confers the PALMA, mints the verification record, publishes the
creator's profile and writes to the audit log. Advance to `winners_announced`
when the ceremony has taken place.

## 7. Revocation

PALMA can revoke an honour obtained through fabricated evidence, impersonation
or manipulation. A revocation needs a written reason of at least 20 characters.

Nothing is deleted. The honour, its achievement and its verification page remain
and read _revoked_. Share cards stop being issued for it.

## Verification codes

Format `PM-YYYY-XXXXXX`, Crockford base32 without the characters that read as
digits, so a code can be read aloud from a trophy or typed from a certificate.

Codes are derived from the signing secret, the season and the honour id — not
sequential, so they reveal nothing about how many honours exist.

**The signing secret is the institution's integrity.** `AUTH_SECRET` signs every
verification record. Rotating it invalidates every existing signature; a
rotation therefore requires re-signing every record in the same operation. Treat
it as the most sensitive value in the deployment.

## Integrity queue

`/portal/reports` carries reports of impersonation, fabricated achievements,
explicit content, ineligible creators and nomination manipulation.

Reports come from anyone, signed in or not — a person being impersonated may
well not hold a PALMA account.

## Creator nomination links

A creator's link (`/nominate/<slug>`) is issued once their profile is claimed
and verified, and appears in their portal with a copy button. It pre-selects
them on the nomination form and does nothing else: no weight in judging, no
ranking, no separate tally that decides anything.

If a link is being abused, the remedy is the candidacy, not the link: mark it
ineligible with a written reason, and the audit log records who did so and why.

## Data retention

- Public and permanent: creator profiles and the honours they hold.
- Never public: scores, panel remarks, evidence, nomination counts, nominator
  addresses, verification data, reports, the audit log.
- Never stored: identity documents, raw IP addresses.
- Nominators hold no account and no profile — an address, a verification
  timestamp, and the nominations made from it.

## What is not built yet

Written down rather than discovered later. `/admin/health` says the same thing
about the parts a deployment can check for itself; this is the rest.

| Gap                              | What it means today                                                                                                                                                                    |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Password reset**               | There is no forgot-password route. An account that loses its password has no way back in without a person.                                                                             |
| **Transactional email**          | Two messages exist — the nomination code and the nomination receipt. Nothing is sent on claim decisions, publication, verification outcomes, honours, panel assignment or enforcement. |
| **Notification preferences**     | Stored on `/creator` and read by nothing, because there is nothing yet to suppress.                                                                                                    |
| **Communications**               | Section 12 of the administration spec. No sent-mail record, no delivery state, no template register.                                                                                   |
| **Bulk creator import**          | Records are written one at a time at `/portal/creators/new`. Presetting an archive of hundreds is not practical yet.                                                                   |
| **Two-factor authentication**    | Not available, on any role — including the accounts that can revoke an honour.                                                                                                         |
| **Scheduled retention deletion** | Retention periods are published and applied by hand.                                                                                                                                   |
| **Third-party age assurance**    | `AGE_VERIFICATION_PROVIDER` is `stub` by default. A real deployment must set `manual` until a provider is contracted, or it records assurance nobody performed.                        |
| **Account self-service**         | A creator cannot change their email address or close their account without asking PALMA.                                                                                               |

None of these are silent. The stub provider and the retention job are reported
on `/admin/health`; the rest are listed here because a gap nobody wrote down is
a gap somebody will assume is finished.
