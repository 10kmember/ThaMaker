import 'server-only';

import { acceptsNominations, type SeasonStage } from '@/domain/season';
import { recordAudit, type AuditActor } from '@/server/audit';
import { sql, withTransaction } from '@/server/db/sql';
import { sendNominationReceipt } from '@/server/email/messages';

export type CountVerifiedNominationResult =
  | {
      ok: true;
      already: boolean;
      reference: string;
      creatorName: string;
      categoryName: string;
      seasonYear: number;
    }
  | { ok: false; message: string };

type NominationRow = {
  id: string;
  reference: string;
  status: string;
  source: string;
  integrityScore: number;
  integritySignals: string[] | null;
  candidacyId: string;
  nominatorId: string;
  verified: boolean;
  nominatorEmail: string;
  candidacyReference: string;
  creatorName: string;
  categoryName: string;
  seasonStage: string;
  seasonYear: number;
};

/**
 * Count one email-verified nomination.
 *
 * The email code is the human check. Once it has passed, there is no moderator
 * queue for the count itself: the nomination is recorded, the candidacy leaves
 * `under_review` on its first counted nomination, and integrity signals remain
 * flags rather than gates. Calling this twice is safe — the second call reads
 * as already counted and does not increment again.
 */
export async function countVerifiedNomination(
  nominationId: string,
  actor?: AuditActor,
): Promise<CountVerifiedNominationResult> {
  const [nomination] = await sql<NominationRow[]>`
    select
      n.id,
      n.reference,
      n.status,
      n.source,
      n."integrityScore",
      n."integritySignals",
      n."candidacyId",
      n."nominatorId",
      (n."verifiedAt" is not null) as verified,
      nom.email as "nominatorEmail",
      c.reference as "candidacyReference",
      cr."displayName" as "creatorName",
      cat.name as "categoryName",
      ay.stage as "seasonStage",
      ay.year as "seasonYear"
    from "Nomination" n
    join "Nominator" nom on nom.id = n."nominatorId"
    join "Candidacy" c on c.id = n."candidacyId"
    join "Creator" cr on cr.id = c."creatorId"
    join "Category" cat on cat.id = c."categoryId"
    join "AwardYear" ay on ay.id = c."awardYearId"
    where n.id = ${nominationId}
    limit 1
  `;

  if (!nomination) {
    return { ok: false, message: 'Start the nomination again.' };
  }

  const base = {
    reference: nomination.reference,
    creatorName: nomination.creatorName,
    categoryName: nomination.categoryName,
    seasonYear: nomination.seasonYear,
  };

  if (nomination.status === 'counted') {
    return { ok: true, already: true, ...base };
  }

  if (!nomination.verified) {
    return { ok: false, message: 'Verify your email address before submitting.' };
  }

  if (!acceptsNominations(nomination.seasonStage as SeasonStage)) {
    return {
      ok: false,
      message: 'Nominations closed while you were verifying. Nothing has been recorded.',
    };
  }

  const now = new Date();
  const flagged = nomination.integrityScore >= 30;

  const counted = await withTransaction(async (tx) => {
    const updated = await tx<{ id: string }[]>`
      update "Nomination"
      set status = 'counted', "countedAt" = ${now}
      where id = ${nomination.id} and status <> 'counted'
      returning id
    `;

    if (updated.length === 0) return false;

    await tx`
      update "Candidacy"
      set
        "nominationCount" = "nominationCount" + 1,
        "lastNominatedAt" = ${now},
        "firstNominatedAt" = coalesce("firstNominatedAt", ${now}),
        status = case when status = 'under_review' then 'eligible' else status end,
        ${flagged ? tx`"integrityFlag" = true,` : tx``}
        "updatedAt" = ${now}
      where id = ${nomination.candidacyId}
    `;

    await tx`
      update "Nominator"
      set "lastNominatedAt" = ${now}, "updatedAt" = ${now}
      where id = ${nomination.nominatorId}
    `;

    return true;
  });

  if (!counted) {
    return { ok: true, already: true, ...base };
  }

  await recordAudit({
    action: 'nomination.counted',
    entityType: 'Nomination',
    entityId: nomination.id,
    actor,
    summary: `${nomination.creatorName} nominated in ${nomination.categoryName}`,
    after: {
      reference: nomination.reference,
      candidacy: nomination.candidacyReference,
      source: nomination.source,
      integrityScore: nomination.integrityScore,
      integritySignals: nomination.integritySignals ?? [],
    },
  });

  await sendNominationReceipt({
    to: nomination.nominatorEmail,
    creatorName: nomination.creatorName,
    categoryName: nomination.categoryName,
    reference: nomination.reference,
    year: nomination.seasonYear,
  }).catch(() => undefined);

  return { ok: true, already: false, ...base };
}
