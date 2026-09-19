import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { EmptyState, Notice } from '@/components/ui/feedback';
import { PlacementForm, PlacementDecision } from '@/components/operations/PlacementForms';
import { buildMetadata } from '@/lib/seo';
import { requirePermission } from '@/lib/auth/guards';
import { can } from '@/lib/auth/rbac';
import { PLACEMENT_LIST, placement as placementRule, type Placement } from '@/domain/sponsorship';
import { sql } from '@/server/db/sql';
import { featureStates } from '@/server/features';
import { formatShortDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Sponsor placements',
  description: 'Where a sponsor’s name appears, and where it does not.',
  path: '/portal/sponsorships',
  noIndex: true,
});

/**
 * The placement desk.
 *
 * The deal belongs to administration; the pages belong here. A moderator
 * proposes that a partner's name sits under a category heading, and an
 * administrator approves it — so no single person can put a logo on a public
 * page from end to end.
 */
export default async function SponsorshipsPage() {
  const session = await requirePermission('commercial:assign_placement', '/portal/sponsorships');

  const [placements, sponsors, seasons, categories, articles, events, states] = await Promise.all([
    sql<
      {
        id: string;
        placement: string;
        isApproved: boolean;
        approvedAt: string | null;
        sponsorName: string;
        categoryName: string | null;
        articleTitle: string | null;
        eventName: string | null;
        awardYearTitle: string;
      }[]
    >`
      SELECT
        sp."id",
        sp."placement",
        sp."isApproved",
        to_char(sp."approvedAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "approvedAt",
        s."name" AS "sponsorName",
        cat."name" AS "categoryName",
        a."title" AS "articleTitle",
        e."name" AS "eventName",
        ay."title" AS "awardYearTitle"
      FROM "Sponsorship" sp
      JOIN "Sponsor" s ON s."id" = sp."sponsorId"
      LEFT JOIN "Category" cat ON cat."id" = sp."categoryId"
      LEFT JOIN "Article" a ON a."id" = sp."articleId"
      LEFT JOIN "PalmaEvent" e ON e."id" = sp."eventId"
      JOIN "AwardYear" ay ON ay."id" = sp."awardYearId"
      ORDER BY sp."isApproved" ASC, sp."createdAt" DESC
    `,
    sql<{ id: string; name: string }[]>`
      SELECT "id", "name"
      FROM "Sponsor"
      WHERE "status" = 'active' AND "agreementStatus" = 'signed'
      ORDER BY "name" ASC
    `,
    sql<{ id: string; title: string; year: number }[]>`
      SELECT "id", "title", "year"
      FROM "AwardYear"
      ORDER BY "year" DESC
      LIMIT 5
    `,
    sql<{ id: string; name: string; awardYearId: string }[]>`
      SELECT "id", "name", "awardYearId"
      FROM "Category"
      ORDER BY "name" ASC
    `,
    sql<{ id: string; title: string }[]>`
      SELECT "id", "title"
      FROM "Article"
      ORDER BY "createdAt" DESC
      LIMIT 50
    `,
    sql<{ id: string; name: string }[]>`
      SELECT "id", "name"
      FROM "PalmaEvent"
      ORDER BY "name" ASC
    `,
    featureStates(),
  ]);

  const mayApprove = can(session.user.role, 'commercial:manage_sponsors');
  const waiting = placements.filter((row) => !row.isApproved);
  const live = placements.filter((row) => row.isApproved);

  const gateFor: Record<Placement, string> = {
    category: 'category_sponsorship',
    principal: 'partner_programme',
    editorial: 'sponsored_editorial',
    event: 'event_ticketing',
  };

  return (
    <>
      <div className="flex flex-col gap-3">
        <span className="palma-label text-taupe-deep">The record</span>
        <h1 className="text-4xl">Sponsor placements</h1>
        <p className="text-taupe-deep max-w-160 leading-relaxed">
          Association follows the thing they funded. A category partner appears on that category and
          the honours conferred in it, not on the Journal, not on the ceremony, not across the site.
          Nothing bleeds, which is what keeps the site worth sponsoring: a page covered in logos is
          worth less to every logo on it.
        </p>
      </div>

      <Notice className="mt-8" title="What a placement can and cannot do">
        It buys the association and nothing else. It cannot touch nomination eligibility, weighting,
        judging, assignment, scores or selection. That separation is enforced in the permission
        matrix and asserted by tests, not left to this page. You propose a placement here; an
        administrator approves it, so no single person can put a logo on a public page alone.
      </Notice>

      <section className="mt-14">
        <h2 className="palma-label text-taupe-deep mb-6">How each placement renders</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          {PLACEMENT_LIST.map((rule) => {
            const gate = states.find((state) => state.key === gateFor[rule.key]);
            return (
              <div key={rule.key} className="border-stone-deep border p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="font-display text-lg">{rule.name}</h3>
                  <Badge variant={gate?.live ? 'olive' : 'muted'}>
                    {gate?.live ? 'Live' : 'Switched off'}
                  </Badge>
                </div>
                <p className="text-taupe-deep mt-3 text-sm leading-relaxed">{rule.buys}</p>
                <p className="palma-label text-champagne-deep mt-4">
                  “{rule.attribution} [Sponsor]”
                </p>
                <ul className="text-taupe mt-3 flex flex-col gap-1 text-xs leading-relaxed">
                  {rule.appearsOn.map((where) => (
                    <li key={where}>· {where}</li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-14">
        <h2 className="palma-label text-taupe-deep mb-6">
          Waiting for approval {waiting.length > 0 ? `· ${waiting.length}` : ''}
        </h2>

        {waiting.length === 0 ? (
          <EmptyState
            title="Nothing waiting"
            description="A placement proposed here appears nowhere public until an administrator approves it."
          />
        ) : (
          <ul className="flex flex-col">
            {waiting.map((row) => (
              <li
                key={row.id}
                className="border-stone-deep flex flex-wrap items-center justify-between gap-4 border-b py-5"
              >
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="font-display text-lg">{row.sponsorName}</span>
                  <span className="palma-label text-taupe-deep">
                    {placementRule(row.placement as Placement).name} ·{' '}
                    {row.categoryName ?? row.articleTitle ?? row.eventName ?? row.awardYearTitle}
                  </span>
                </span>
                {mayApprove ? (
                  <PlacementDecision sponsorshipId={row.id} name={row.sponsorName} />
                ) : (
                  <Badge variant="muted">With administration</Badge>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-14">
        <h2 className="palma-label text-taupe-deep mb-6">Live placements</h2>
        {live.length === 0 ? (
          <EmptyState
            title="No sponsor appears anywhere"
            description="PALMA is running unsponsored, which is the correct configuration for a first season."
          />
        ) : (
          <ul className="flex flex-col">
            {live.map((row) => {
              const gate = states.find(
                (state) => state.key === gateFor[row.placement as Placement],
              );
              return (
                <li
                  key={row.id}
                  className="border-stone-deep flex flex-wrap items-center justify-between gap-4 border-b py-5"
                >
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="font-display text-lg">{row.sponsorName}</span>
                    <span className="palma-label text-taupe-deep">
                      {placementRule(row.placement as Placement).name} ·{' '}
                      {row.categoryName ?? row.articleTitle ?? row.eventName ?? row.awardYearTitle}{' '}
                      · approved {row.approvedAt ? formatShortDate(row.approvedAt) : ''}
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    <Badge variant={gate?.live ? 'olive' : 'muted'}>
                      {gate?.live ? 'Showing' : 'Held. Feature off'}
                    </Badge>
                    {mayApprove ? (
                      <PlacementDecision sponsorshipId={row.id} name={row.sponsorName} approved />
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-14 max-w-160">
        <h2 className="palma-label text-taupe-deep mb-2">Propose a placement</h2>
        <p className="text-taupe mb-6 text-xs leading-relaxed">
          Only sponsors administration has already marked active with a signed agreement appear
          here. A placement against a conversation is a logo PALMA cannot support.
        </p>

        {sponsors.length === 0 ? (
          <Notice tone="warning" title="No sponsor is ready to be placed">
            A sponsor has to be active with a signed agreement first, which is{' '}
            <Link href="/admin/business" className="palma-link text-ink">
              administration&rsquo;s side
            </Link>
            .
          </Notice>
        ) : (
          <PlacementForm
            sponsors={sponsors}
            seasons={seasons}
            categories={categories}
            articles={articles}
            events={events}
          />
        )}
      </section>
    </>
  );
}
