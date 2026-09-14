import 'server-only';
import { prisma } from '@/server/db';
import { FEATURE_LIST } from '@/domain/features';
import { featureStates } from '@/server/features';

/**
 * The commercial overview.
 *
 * Deliberately not a revenue dashboard yet. PALMA has sold nothing, and a
 * dashboard reporting £0 across seven headings is theatre — so this reports
 * what actually exists: the pipeline, the inventory, and which rails are live.
 *
 * Revenue reporting arrives when there is revenue, and it will read from
 * agreements rather than from a number somebody typed.
 */

export type BusinessOverview = {
  features: { key: string; name: string; group: string; live: boolean }[];
  liveCount: number;
  sponsors: {
    total: number;
    prospects: number;
    active: number;
    signed: number;
    expiringSoon: number;
  };
  packages: { total: number; available: number };
  /** What could be sold, and whether it currently is. */
  inventory: {
    kind: string;
    label: string;
    detail: string;
    state: 'available' | 'taken' | 'off';
  }[];
  subscribers: { key: string; confirmed: number }[];
};

export async function getBusinessOverview(): Promise<BusinessOverview> {
  const soon = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

  const [states, sponsorCounts, signed, expiring, packages, availablePackages, season, lists] =
    await Promise.all([
      featureStates(),
      prisma.sponsor.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.sponsor.count({ where: { agreementStatus: 'signed' } }),
      prisma.sponsor.count({
        where: { status: 'active', endsAt: { not: null, lte: soon } },
      }),
      prisma.sponsorshipPackage.count(),
      prisma.sponsorshipPackage.count({ where: { isAvailable: true } }),
      prisma.awardYear.findFirst({ where: { isCurrent: true }, select: { id: true, title: true } }),
      prisma.emailSubscription.groupBy({
        by: ['type'],
        where: { status: 'confirmed' },
        _count: { _all: true },
      }),
    ]);

  const sponsorCount = (status: string) =>
    sponsorCounts.find((row) => row.status === status)?._count._all ?? 0;

  const features = FEATURE_LIST.map((entry) => ({
    key: entry.key,
    name: entry.name,
    group: entry.group,
    live: states.find((state) => state.key === entry.key)?.live ?? false,
  }));

  const sponsorshipLive = features.find((f) => f.key === 'category_sponsorship')?.live ?? false;

  // Inventory is derived, never hard-coded into a page component: what is for
  // sale is a function of what exists and what is switched on.
  const categories = season
    ? await prisma.category.findMany({
        where: { awardYearId: season.id },
        select: {
          id: true,
          name: true,
          sponsorships: {
            where: { isApproved: true },
            select: { sponsor: { select: { name: true } } },
          },
        },
        orderBy: { name: 'asc' },
      })
    : [];

  const inventory: BusinessOverview['inventory'] = [
    ...categories.map((category) => {
      const taken = category.sponsorships[0]?.sponsor.name;
      return {
        kind: 'Category sponsorship',
        label: category.name,
        detail: season?.title ?? '',
        state: (!sponsorshipLive ? 'off' : taken ? 'taken' : 'available') as
          'available' | 'taken' | 'off',
      };
    }),
    {
      kind: 'Event',
      label: 'Ceremony partnership',
      detail: 'No event is confirmed.',
      state: (features.find((f) => f.key === 'event_ticketing')?.live ? 'available' : 'off') as
        'available' | 'off',
    },
    {
      kind: 'Journal',
      label: 'Partner feature',
      detail: 'Labelled partner content in the Journal.',
      state: (features.find((f) => f.key === 'sponsored_editorial')?.live ? 'available' : 'off') as
        'available' | 'off',
    },
    {
      kind: 'Newsletter',
      label: 'Partner offer',
      detail: `${lists.find((row) => row.type === 'partner_offers')?._count._all ?? 0} subscribers`,
      state: (features.find((f) => f.key === 'partner_offers')?.live ? 'available' : 'off') as
        'available' | 'off',
    },
  ];

  return {
    features,
    liveCount: features.filter((entry) => entry.live).length,
    sponsors: {
      total: sponsorCounts.reduce((sum, row) => sum + row._count._all, 0),
      prospects: sponsorCount('prospect'),
      active: sponsorCount('active'),
      signed,
      expiringSoon: expiring,
    },
    packages: { total: packages, available: availablePackages },
    inventory,
    subscribers: lists.map((row) => ({ key: row.type, confirmed: row._count._all })),
  };
}
