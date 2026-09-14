import 'server-only';
import { cache } from 'react';
import { prisma } from '@/server/db';
import { attributionFor, attributionIsVisible, type Placement } from '@/domain/sponsorship';
import { featureLive } from '@/server/features';

/**
 * Reading sponsor attributions for the public site.
 *
 * One query per request, cached, and every attribution passes the same four
 * checks before it is returned: the feature is on for that season, the
 * association is approved, the sponsor relationship is live, and the window is
 * open. A page never decides for itself whether a logo should be up.
 */

export type Attribution = {
  placement: Placement;
  line: string;
  sponsorName: string;
  sponsorSlug: string;
  logoUrl: string | null;
  websiteUrl: string | null;
  /** What it is attached to, so a page can pick out its own. */
  categoryId: string | null;
  eventId: string | null;
  articleId: string | null;
};

const loadVisible = cache(async (awardYearId: string): Promise<Attribution[]> => {
  try {
    const [rows, sponsorshipLive, partnerLive, editorialLive, eventLive] = await Promise.all([
      prisma.sponsorship.findMany({
        where: { awardYearId, isApproved: true, sponsor: { status: 'active', isActive: true } },
        select: {
          placement: true,
          attribution: true,
          startsAt: true,
          endsAt: true,
          categoryId: true,
          eventId: true,
          articleId: true,
          sponsor: {
            select: { name: true, slug: true, logoUrl: true, websiteUrl: true, status: true },
          },
        },
      }),
      featureLive('category_sponsorship', awardYearId),
      featureLive('partner_programme', awardYearId),
      featureLive('sponsored_editorial'),
      featureLive('event_ticketing', awardYearId),
    ]);

    // Each placement is gated by its own feature. Switching sponsorship on for
    // categories must not light up editorial partnerships as a side effect.
    const gate: Record<Placement, boolean> = {
      category: sponsorshipLive,
      principal: partnerLive,
      editorial: editorialLive,
      event: eventLive,
    };

    return rows
      .filter((row) =>
        attributionIsVisible({
          featureLive: gate[row.placement as Placement],
          isApproved: true,
          sponsorIsActive: row.sponsor.status === 'active',
          startsAt: row.startsAt?.toISOString() ?? null,
          endsAt: row.endsAt?.toISOString() ?? null,
        }),
      )
      .map((row) => ({
        placement: row.placement as Placement,
        line: attributionFor({
          placement: row.placement as Placement,
          sponsorName: row.sponsor.name,
          override: row.attribution,
        }),
        sponsorName: row.sponsor.name,
        sponsorSlug: row.sponsor.slug,
        logoUrl: row.sponsor.logoUrl,
        websiteUrl: row.sponsor.websiteUrl,
        categoryId: row.categoryId,
        eventId: row.eventId,
        articleId: row.articleId,
      }));
  } catch {
    // A page that cannot read sponsorships shows the institution, not a gap.
    return [];
  }
});

/** The attribution for one category, if there is one to show. */
export async function categoryAttribution(
  awardYearId: string,
  categoryId: string,
): Promise<Attribution | null> {
  const rows = await loadVisible(awardYearId);
  return rows.find((row) => row.placement === 'category' && row.categoryId === categoryId) ?? null;
}

/** Every category attribution in a season, keyed by category id. */
export async function categoryAttributions(
  awardYearId: string,
): Promise<Record<string, Attribution>> {
  const rows = await loadVisible(awardYearId);
  return Object.fromEntries(
    rows
      .filter((row) => row.placement === 'category' && row.categoryId)
      .map((row) => [row.categoryId as string, row]),
  );
}

export async function articleAttribution(
  awardYearId: string,
  articleId: string,
): Promise<Attribution | null> {
  const rows = await loadVisible(awardYearId);
  return rows.find((row) => row.placement === 'editorial' && row.articleId === articleId) ?? null;
}

export async function eventAttributions(
  awardYearId: string,
  eventId: string,
): Promise<Attribution[]> {
  const rows = await loadVisible(awardYearId);
  return rows.filter((row) => row.placement === 'event' && row.eventId === eventId);
}

/** Principal partners — the institution-level association. */
export async function principalPartners(awardYearId: string): Promise<Attribution[]> {
  const rows = await loadVisible(awardYearId);
  return rows.filter((row) => row.placement === 'principal');
}
