import 'server-only';
import { prisma } from '@/server/db';
import { dayOf, SURFACES, type SurfaceKey } from '@/domain/measurement';
import { EMAIL_LIST_ORDER, type EmailListKey } from '@/domain/email-lists';
import { featureLive } from '@/server/features';

/**
 * The audience read layer.
 *
 * Every figure here is either a counter PALMA incremented itself or a row it
 * already holds for a reason of its own — a subscription, a nomination, a
 * ticket. Nothing is inferred about a person, because there is nothing about a
 * person to infer it from.
 *
 * The funnel is the part worth the most: it is the same four stages the public
 * judging page describes, counted against the real record rather than restated.
 * The audience discovers, PALMA evaluates, judges decide — and this is the
 * first of those three, measured.
 */

export type AudienceWindow = 7 | 30 | 90;

export type SurfaceRow = {
  key: SurfaceKey;
  label: string;
  note: string;
  views: number;
  /** The same window immediately before this one. */
  previous: number;
  /** Distinct pages within the surface that were read at all. */
  pages: number;
};

export type TopPage = { path: string; views: number };

export type SearchRow = {
  term: string;
  scope: string;
  searches: number;
  /** What the last such search found. Zero is the interesting case. */
  results: number | null;
};

export type FunnelStage = {
  label: string;
  value: number;
  note: string;
};

export type AudienceReport = {
  window: AudienceWindow;
  from: string;
  /** Whether anything has been counted at all yet. */
  counting: boolean;
  totalViews: number;
  previousViews: number;
  byDay: { label: string; values: number[] }[];
  surfaces: SurfaceRow[];
  topPages: TopPage[];
  searches: SearchRow[];
  /** Searches that found nothing — what PALMA is being asked for and lacks. */
  emptySearches: SearchRow[];
  funnel: FunnelStage[];
  subscribers: { key: EmailListKey; confirmed: number; pending: number }[];
  /**
   * Events, as far as they exist.
   *
   * There is no registration model and no attendee record — ticketing is a
   * commercial rail that has never been switched on, and a ticket *type* with
   * a capacity is not a person who signed up. So this reports the events that
   * exist and the seats offered, and says plainly that interest cannot be
   * counted until there is somewhere for somebody to register.
   */
  events: {
    live: boolean;
    planned: number;
    capacity: number;
    events: { name: string; status: string; capacity: number | null; ticketTypes: number }[];
  };
  verification: { lookups: number; records: number };
  creators: { claimed: number; unclaimed: number; claimsAwaiting: number };
};

const DAY = 86_400_000;

export async function getAudienceReport(window: AudienceWindow): Promise<AudienceReport> {
  const from = dayOf(new Date(Date.now() - (window - 1) * DAY));
  const previousFrom = dayOf(new Date(from.getTime() - window * DAY));

  const [
    counts,
    previousCounts,
    searchRows,
    nominations,
    nominators,
    creatorsIdentified,
    candidacies,
    finalists,
    winners,
    subscriptions,
    verificationAgg,
    verificationRecords,
    claimedCreators,
    unclaimedCreators,
    claimsAwaiting,
    eventsLive,
  ] = await Promise.all([
    prisma.pageCount.findMany({
      where: { day: { gte: from } },
      select: { path: true, day: true, surface: true, count: true },
    }),
    prisma.pageCount.groupBy({
      by: ['surface'],
      where: { day: { gte: previousFrom, lt: from } },
      _sum: { count: true },
    }),
    prisma.searchCount.findMany({
      where: { day: { gte: from } },
      select: { term: true, scope: true, count: true, results: true },
    }),
    prisma.nomination.count({ where: { status: 'counted' } }),
    prisma.nominator.count({ where: { nominations: { some: { status: 'counted' } } } }),
    prisma.creator.count({ where: { candidacies: { some: {} } } }),
    prisma.candidacy.count({ where: { status: { notIn: ['withdrawn', 'ineligible'] } } }),
    prisma.honour.count({ where: { kind: 'finalist', state: 'active' } }),
    prisma.honour.count({ where: { kind: 'winner', state: 'active' } }),
    prisma.emailSubscription.groupBy({ by: ['type', 'status'], _count: { _all: true } }),
    prisma.verificationRecord.aggregate({ _sum: { viewCount: true } }),
    prisma.verificationRecord.count(),
    prisma.creator.count({ where: { userId: { not: null } } }),
    prisma.creator.count({ where: { userId: null } }),
    prisma.creatorClaim.count({
      where: { status: { in: ['submitted', 'awaiting_information', 'escalated'] } },
    }),
    featureLive('event_ticketing'),
  ]);

  // Page counters, folded three ways: by surface, by day, and by page.
  const bySurface = new Map<string, { views: number; pages: Set<string> }>();
  const byDay = new Map<string, number>();
  const byPage = new Map<string, number>();

  for (let index = window - 1; index >= 0; index -= 1) {
    byDay.set(new Date(Date.now() - index * DAY).toISOString().slice(0, 10), 0);
  }

  for (const row of counts) {
    const surface = bySurface.get(row.surface) ?? { views: 0, pages: new Set<string>() };
    surface.views += row.count;
    surface.pages.add(row.path);
    bySurface.set(row.surface, surface);

    const day = row.day.toISOString().slice(0, 10);
    if (byDay.has(day)) byDay.set(day, (byDay.get(day) ?? 0) + row.count);

    byPage.set(row.path, (byPage.get(row.path) ?? 0) + row.count);
  }

  const previousBySurface = new Map(
    previousCounts.map((row) => [row.surface, row._sum.count ?? 0] as const),
  );

  const totalViews = counts.reduce((sum, row) => sum + row.count, 0);
  const previousViews = previousCounts.reduce((sum, row) => sum + (row._sum.count ?? 0), 0);

  // Searches are summed across days, then split into those that found
  // something and those that did not.
  const searchTotals = new Map<string, SearchRow>();
  for (const row of searchRows) {
    const key = `${row.scope}:${row.term}`;
    const existing = searchTotals.get(key);
    if (existing) {
      existing.searches += row.count;
      // The most recent result count wins; an older one describes an archive
      // that has since changed.
      existing.results = row.results ?? existing.results;
    } else {
      searchTotals.set(key, {
        term: row.term,
        scope: row.scope,
        searches: row.count,
        results: row.results,
      });
    }
  }

  const searches = [...searchTotals.values()].sort((a, b) => b.searches - a.searches);

  const eventRows = await prisma.palmaEvent.findMany({
    select: {
      name: true,
      status: true,
      capacity: true,
      _count: { select: { ticketTypes: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  const listCount = (type: string, status: string) =>
    subscriptions.find((row) => row.type === type && row.status === status)?._count._all ?? 0;

  return {
    window,
    from: from.toISOString(),
    counting: counts.length > 0,
    totalViews,
    previousViews,
    byDay: [...byDay.entries()].map(([day, value]) => ({
      label: day.slice(5),
      values: [value],
    })),
    surfaces: SURFACES.map((surface) => ({
      key: surface.key,
      label: surface.label,
      note: surface.note,
      views: bySurface.get(surface.key)?.views ?? 0,
      previous: previousBySurface.get(surface.key) ?? 0,
      pages: bySurface.get(surface.key)?.pages.size ?? 0,
    })).sort((a, b) => b.views - a.views),
    topPages: [...byPage.entries()]
      .map(([path, views]) => ({ path, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 20),
    searches: searches.filter((row) => (row.results ?? 0) > 0).slice(0, 20),
    emptySearches: searches.filter((row) => row.results === 0).slice(0, 20),
    funnel: [
      {
        label: 'Nominations counted',
        value: nominations,
        note: 'Verified by a one-time code. The audience discovering.',
      },
      {
        label: 'Unique nominators',
        value: nominators,
        note: 'People, not nominations. The honest measure of reach.',
      },
      {
        label: 'Creators identified',
        value: creatorsIdentified,
        note: 'Named by at least one nomination.',
      },
      {
        label: 'Candidacies standing',
        value: candidacies,
        note: 'Survived eligibility and editorial screening. PALMA evaluating.',
      },
      { label: 'Finalists', value: finalists, note: 'Selected by the panel from the field.' },
      { label: 'Winners', value: winners, note: 'Conferred. Judges deciding.' },
    ],
    subscribers: EMAIL_LIST_ORDER.map((key) => ({
      key,
      confirmed: listCount(key, 'confirmed'),
      pending: listCount(key, 'pending'),
    })),
    events: {
      live: eventsLive,
      planned: eventRows.length,
      capacity: eventRows.reduce((sum, row) => sum + (row.capacity ?? 0), 0),
      events: eventRows.map((row) => ({
        name: row.name,
        status: row.status,
        capacity: row.capacity,
        ticketTypes: row._count.ticketTypes,
      })),
    },
    verification: {
      lookups: verificationAgg._sum.viewCount ?? 0,
      records: verificationRecords,
    },
    creators: {
      claimed: claimedCreators,
      unclaimed: unclaimedCreators,
      claimsAwaiting,
    },
  };
}

/** Seasons the report can be produced for, ignoring the current one. */
export const AUDIENCE_WINDOWS: AudienceWindow[] = [7, 30, 90];

export function isAudienceWindow(value: string | undefined): value is `${AudienceWindow}` {
  return value === '7' || value === '30' || value === '90';
}
