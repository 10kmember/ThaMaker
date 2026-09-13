# Running a PALMA season

Operational guide for administrators. Every action described here is recorded in
the audit log with the actor, the entity and the state before and after.

---

## Roles

| Role          | Can                                                                |
| ------------- | ------------------------------------------------------------------ |
| `visitor`     | Read the public record. Nominate.                                  |
| `creator`     | Claim a profile, verify, submit and track nominations.             |
| `judge`       | See their own assignments, score, declare conflicts.               |
| `editor`      | Write and publish the Journal.                                     |
| `moderator`   | See and act on reports.                                            |
| `admin`       | Run the season: review, assign, select, revoke, correct, moderate. |
| `super_admin` | Everything, plus users and system settings.                        |

Sponsors hold **no role**. Sponsorship is recorded against a season or category
and grants no access to nominations, judges, scores or outcomes.

## Entrances

PALMA has three doors, and an account may only use its own. Which roles a door
admits is declared once, in `src/lib/auth/entrances.ts`, and everything else
reads from there — the sign-in action, the page guards, the redirects.

| Door           | Path       | Admits                                        | Lands at   |
| -------------- | ---------- | --------------------------------------------- | ---------- |
| Creator        | `/sign-in` | `creator`                                     | `/portal`  |
| Judges         | `/judge`   | `judge`                                       | `/judging` |
| Administration | `/staff`   | `editor`, `moderator`, `admin`, `super_admin` | `/admin`   |

The rules that follow from that:

- A correct password at the wrong door creates **no session**. The form says
  which door the account belongs at, and the attempt is written to the audit
  log as `user.wrong_entrance`.
- An unauthenticated visitor is sent to the door that guards _the surface they
  asked for_, resolved from the path — so `/judging/*` sends them to `/judge`,
  never to the creator form. No role lookup is involved, because there is no
  session to look one up from.
- A signed-in account on a surface its own door does not lead to is redirected
  to its own home rather than shown the refusal page: it is in the wrong
  building, not merely under-permissioned.
- A `next=` parameter cannot carry an account across buildings. A judge signing
  in with `next=/portal/claim` lands in the judging room.

The staff door sits at `/staff` rather than `/admin/sign-in` deliberately: the
`/admin` segment's layout guards every page beneath it, so a door placed inside
it would redirect to itself.

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

Judges score independently at `/judging`. Scores are immutable once submitted.

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

`/admin/moderation` carries reports of impersonation, fabricated achievements,
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
