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
import {
  Layers,
  Clock,
  CheckCircle2,
  Sparkles,
  Megaphone,
  CalendarDays,
  Newspaper,
  PartyPopper,
  Crown,
  Info,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Sponsor placements',
  description: 'Where a sponsor\u2019s name appears, and where it does not.',
  path: '/portal/sponsorships',
  noIndex: true,
});

type SponsorshipRow = {
  id: string;
  placement: string;
  isApproved: boolean;
  approvedAt: string | null;
  attribution: string | null;
  Sponsor: { name: string } | null;
  Category: { name: string } | null;
  Article: { title: string } | null;
  PalmaEvent: { name: string } | null;
  AwardYear: { title: string } | null;
};

const PLACEMENT_ICONS: Record<string, typeof Crown> = {
  category: Megaphone,
  event: PartyPopper,
  editorial: Newspaper,
  principal: Crown,
};

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
        attribution: string | null;
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
        sp."attribution",
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

  const rows: SponsorshipRow[] = placements.map((row) => ({
    id: row.id,
    placement: row.placement,
    isApproved: row.isApproved,
    approvedAt: row.approvedAt,
    attribution: row.attribution,
    Sponsor: { name: row.sponsorName },
    Category: row.categoryName ? { name: row.categoryName } : null,
    Article: row.articleTitle ? { title: row.articleTitle } : null,
    PalmaEvent: row.eventName ? { name: row.eventName } : null,
    AwardYear: { title: row.awardYearTitle },
  }));

  const gateFor: Record<string, string> = {
    category: 'category_sponsorship',
    principal: 'partner_programme',
    editorial: 'sponsored_editorial',
    event: 'event_ticketing',
  };
  const isFeatureLive = (key: string) =>
    states.find((state) => state.key === gateFor[key])?.live ?? false;

  const waiting = rows.filter((row) => !row.isApproved);
  const live = rows.filter((row) => row.isApproved);
  const mayApprove = can(session.user.role, 'commercial:manage_sponsors');

  return (
    <>
      <header className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Layers className="text-taupe size-4" strokeWidth={1.5} />
          <span className="palma-label text-taupe-deep">The record</span>
        </div>
        <h1 className="font-display text-4xl leading-tight sm:text-5xl">Sponsor placements</h1>
        <p className="text-taupe-deep max-w-160 text-lg leading-relaxed">
          Association follows the thing they funded. A category partner appears on that category and
          the honours conferred in it, not on the Journal, not on the ceremony, not across the site.
        </p>
      </header>

      <div className="border-stone-deep mt-8 flex items-start gap-3 border px-5 py-4">
        <Info className="text-taupe mt-0.5 size-4 shrink-0" strokeWidth={1.5} />
        <p className="text-taupe-deep text-sm leading-relaxed">
          A placement buys the association and nothing else. It cannot touch nomination eligibility,
          weighting, judging, assignment, scores or selection. You propose a placement here; an
          administrator approves it, so no single person can put a logo on a public page alone.
        </p>
      </div>

      <section className="mt-14">
        <div className="border-stone-deep mb-8 flex items-center gap-2.5 border-b pb-3">
          <Sparkles className="text-taupe size-4" strokeWidth={1.5} />
          <h2 className="palma-label text-taupe-deep">How each placement renders</h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          {PLACEMENT_LIST.map((rule) => {
            const featureLive = isFeatureLive(rule.key);
            const Icon = PLACEMENT_ICONS[rule.key] ?? Layers;
            return (
              <div
                key={rule.key}
                className="border-stone-deep group hover:bg-stone/10 border transition-colors"
              >
                <div className="flex items-start gap-4 p-6">
                  <span className="bg-stone/30 flex size-10 shrink-0 items-center justify-center rounded-sm">
                    <Icon className="text-taupe-deep size-5" strokeWidth={1.5} />
                  </span>
                  <div className="flex min-w-0 flex-col gap-2">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="font-display text-lg">{rule.name}</h3>
                      <Badge variant={featureLive ? 'olive' : 'muted'}>
                        {featureLive ? 'Live' : 'Switched off'}
                      </Badge>
                    </div>
                    <p className="text-taupe-deep text-sm leading-relaxed">{rule.buys}</p>
                  </div>
                </div>
                <div className="border-stone-deep/60 border-t px-6 py-4">
                  <p className="palma-label text-champagne-deep">
                    &ldquo;{rule.attribution} [Sponsor]&rdquo;
                  </p>
                  <ul className="text-taupe mt-3 flex flex-col gap-1.5 text-xs leading-relaxed">
                    {rule.appearsOn.map((where) => (
                      <li key={where} className="flex items-center gap-2">
                        <span className="bg-taupe/30 inline-block size-1 shrink-0 rounded-full" />
                        {where}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-14">
        <div className="border-stone-deep mb-2 flex items-center justify-between gap-4 border-b pb-3">
          <div className="flex items-center gap-2.5">
            <Clock className="text-taupe size-4" strokeWidth={1.5} />
            <h2 className="palma-label text-taupe-deep">Waiting for approval</h2>
          </div>
          {waiting.length > 0 ? <Badge variant="default">{waiting.length} pending</Badge> : null}
        </div>

        {waiting.length === 0 ? (
          <EmptyState
            className="mt-6"
            title="Nothing waiting"
            description="A placement proposed here appears nowhere public until an administrator approves it."
          />
        ) : (
          <ul className="flex flex-col">
            {waiting.map((row) => {
              const rule = placementRule(row.placement as Placement);
              const Icon = PLACEMENT_ICONS[row.placement] ?? Layers;
              const target =
                row.Category?.name ??
                row.Article?.title ??
                row.PalmaEvent?.name ??
                row.AwardYear?.title ??
                '';
              return (
                <li
                  key={row.id}
                  className="palma-row group border-stone-deep hover:bg-stone/10 flex flex-wrap items-center justify-between gap-4 border-b py-6 transition-colors"
                >
                  <span className="flex items-center gap-4">
                    <span className="bg-champagne/20 flex size-10 shrink-0 items-center justify-center rounded-sm">
                      <Icon className="text-champagne-deep size-5" strokeWidth={1.5} />
                    </span>
                    <span className="flex min-w-0 flex-col gap-1">
                      <span className="font-display text-lg">
                        {row.Sponsor?.name ?? 'Unknown sponsor'}
                      </span>
                      <span className="palma-label text-taupe-deep">
                        {rule.name} &middot; {target}
                      </span>
                    </span>
                  </span>
                  {mayApprove ? (
                    <PlacementDecision
                      sponsorshipId={row.id}
                      name={row.Sponsor?.name ?? 'sponsor'}
                    />
                  ) : (
                    <Badge variant="muted">With administration</Badge>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-14">
        <div className="border-stone-deep mb-2 flex items-center gap-2.5 border-b pb-3">
          <CheckCircle2 className="text-taupe size-4" strokeWidth={1.5} />
          <h2 className="palma-label text-taupe-deep">Live placements</h2>
        </div>
        {live.length === 0 ? (
          <EmptyState
            className="mt-6"
            title="No sponsor appears anywhere"
            description="PALMA is running unsponsored, which is the correct configuration for a first season."
          />
        ) : (
          <ul className="flex flex-col">
            {live.map((row) => {
              const rule = placementRule(row.placement as Placement);
              const featureLive = isFeatureLive(row.placement);
              const Icon = PLACEMENT_ICONS[row.placement] ?? Layers;
              const target =
                row.Category?.name ??
                row.Article?.title ??
                row.PalmaEvent?.name ??
                row.AwardYear?.title ??
                '';
              return (
                <li
                  key={row.id}
                  className="palma-row group border-stone-deep hover:bg-stone/10 flex flex-wrap items-center justify-between gap-4 border-b py-6 transition-colors"
                >
                  <span className="flex items-center gap-4">
                    <span className="bg-olive/10 flex size-10 shrink-0 items-center justify-center rounded-sm">
                      <Icon className="text-olive size-5" strokeWidth={1.5} />
                    </span>
                    <span className="flex min-w-0 flex-col gap-1">
                      <span className="font-display text-lg">
                        {row.Sponsor?.name ?? 'Unknown sponsor'}
                      </span>
                      <span className="palma-label text-taupe-deep">
                        {rule.name} &middot; {target}
                        {row.approvedAt
                          ? ` \u00b7 approved ${formatShortDate(row.approvedAt)}`
                          : ''}
                      </span>
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    <Badge variant={featureLive ? 'olive' : 'muted'}>
                      {featureLive ? 'Showing' : 'Held \u2014 feature off'}
                    </Badge>
                    {mayApprove ? (
                      <PlacementDecision
                        sponsorshipId={row.id}
                        name={row.Sponsor?.name ?? 'sponsor'}
                        approved
                      />
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-14 max-w-160">
        <div className="border-stone-deep mb-6 flex items-center gap-2.5 border-b pb-3">
          <CalendarDays className="text-taupe size-4" strokeWidth={1.5} />
          <h2 className="palma-label text-taupe-deep">Propose a placement</h2>
        </div>
        <p className="text-taupe mb-8 text-sm leading-relaxed">
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
