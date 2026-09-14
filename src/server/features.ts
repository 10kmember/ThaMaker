import 'server-only';
import { cache } from 'react';
import { prisma } from '@/server/db';
import {
  FEATURE_LIST,
  feature,
  isLive,
  resolveFeature,
  type FeatureKey,
  type FeatureState,
} from '@/domain/features';

/**
 * Reading the rails.
 *
 * One query per request, cached, because a page may ask about several features
 * and none of them should cost a round trip. Everything defaults to off: a
 * missing row, an unreadable database, a key nobody has configured — all read
 * as "not selling this". The safe failure for a commercial feature is that it
 * does not appear.
 */

export type FeatureView = FeatureState & { key: FeatureKey; live: boolean };

type Row = {
  key: string;
  awardYearId: string | null;
  enabled: boolean;
  launchAt: Date | null;
  endAt: Date | null;
  config: unknown;
};

function toState(row: Row | undefined): FeatureState | null {
  if (!row) return null;
  return {
    enabled: row.enabled,
    launchAt: row.launchAt?.toISOString() ?? null,
    endAt: row.endAt?.toISOString() ?? null,
    config: (row.config as Record<string, unknown> | null) ?? null,
  };
}

const loadSettings = cache(async (): Promise<Row[]> => {
  try {
    return await prisma.featureSetting.findMany({
      select: {
        key: true,
        awardYearId: true,
        enabled: true,
        launchAt: true,
        endAt: true,
        config: true,
      },
    });
  } catch {
    // A commercial feature failing closed is correct. A page that cannot read
    // the settings shows the institution, not the shop.
    return [];
  }
});

/** Every feature, resolved for one season (or globally when none is given). */
export async function featureStates(awardYearId?: string | null): Promise<FeatureView[]> {
  const rows = await loadSettings();

  return FEATURE_LIST.map((entry) => {
    const state = resolveFeature({
      global: toState(rows.find((row) => row.key === entry.key && row.awardYearId === null)),
      season: awardYearId
        ? toState(rows.find((row) => row.key === entry.key && row.awardYearId === awardYearId))
        : null,
      seasonAware: entry.seasonAware,
    });

    return { key: entry.key, ...state, live: isLive(state) };
  });
}

/**
 * The question almost every caller actually has.
 *
 * `await featureLive('category_sponsorship', season.id)` — and if anything at
 * all has gone wrong, the answer is no.
 */
export async function featureLive(key: FeatureKey, awardYearId?: string | null): Promise<boolean> {
  const rows = await loadSettings();
  const entry = feature(key);

  const state = resolveFeature({
    global: toState(rows.find((row) => row.key === key && row.awardYearId === null)),
    season:
      entry.seasonAware && awardYearId
        ? toState(rows.find((row) => row.key === key && row.awardYearId === awardYearId))
        : null,
    seasonAware: entry.seasonAware,
  });

  return isLive(state);
}

/** Feature-specific configuration, when the feature is live and has some. */
export async function featureConfig(
  key: FeatureKey,
  awardYearId?: string | null,
): Promise<Record<string, unknown> | null> {
  const rows = await loadSettings();
  const entry = feature(key);

  const state = resolveFeature({
    global: toState(rows.find((row) => row.key === key && row.awardYearId === null)),
    season:
      entry.seasonAware && awardYearId
        ? toState(rows.find((row) => row.key === key && row.awardYearId === awardYearId))
        : null,
    seasonAware: entry.seasonAware,
  });

  return isLive(state) ? state.config : null;
}

/**
 * Every season-scoped override for one feature, for the settings page.
 *
 * The point of showing these together is that an administrator can see at a
 * glance that 2027 says one thing and 2028 another — which is the whole reason
 * season scoping exists.
 */
export async function seasonOverrides(
  key: FeatureKey,
): Promise<{ awardYearId: string; year: number; title: string; state: FeatureState }[]> {
  const rows = await prisma.featureSetting.findMany({
    where: { key, awardYearId: { not: null } },
    include: { awardYear: { select: { id: true, year: true, title: true } } },
    orderBy: { awardYear: { year: 'desc' } },
  });

  return rows.flatMap((row) =>
    row.awardYear
      ? [
          {
            awardYearId: row.awardYear.id,
            year: row.awardYear.year,
            title: row.awardYear.title,
            state: {
              enabled: row.enabled,
              launchAt: row.launchAt?.toISOString() ?? null,
              endAt: row.endAt?.toISOString() ?? null,
              config: (row.config as Record<string, unknown> | null) ?? null,
            },
          },
        ]
      : [],
  );
}
