import 'server-only';
import { cache } from 'react';
import { prisma } from '@/server/db';
import type { SeasonStage } from '@/domain/season';
import { finalistsArePublic, winnersArePublic } from '@/domain/season';
import * as reference from './reference';
import type {
  AchievementRecord,
  ArticleDetail,
  ArticleSummary,
  CategoryOutcome,
  CategoryView,
  CreatorProfile,
  CreatorSummary,
  FinalistView,
  HonourEntry,
  RollOfHonourYear,
  SeasonStats,
  SeasonView,
  SponsorView,
} from './types';

/**
 * The read surface of PALMA.
 *
 * Every public page reads through this module. When DATABASE_URL is present the
 * queries hit PostgreSQL; otherwise they resolve against the bundled reference
 * dataset so the institution's public face can be built and reviewed without
 * infrastructure. Writes never fall back — see `requireDb()`.
 */

const iso = (value: Date | null | undefined) => (value ? value.toISOString() : null);

function summarise(creator: CreatorProfile): CreatorSummary {
  return {
    id: creator.id,
    slug: creator.slug,
    displayName: creator.displayName,
    countryCode: creator.countryCode,
    headline: creator.headline,
    portraitUrl: creator.portraitUrl,
    portraitAlt: creator.portraitAlt,
    verificationStatus: creator.verificationStatus,
    honourCount: creator.honourCount,
    winCount: creator.winCount,
  };
}

// ── Seasons ──────────────────────────────────────────────────────────────────

export const listSeasons = cache(async (): Promise<SeasonView[]> => {
  if (!prisma) return [...reference.seasons].sort((a, b) => b.year - a.year);

  const rows = await prisma.awardYear.findMany({
    orderBy: { year: 'desc' },
    include: { _count: { select: { categories: true } } },
  });

  return rows.map((row) => ({
    id: row.id,
    year: row.year,
    title: row.title,
    stage: row.stage as SeasonStage,
    tagline: row.tagline,
    summary: row.summary,
    nominationsOpenAt: iso(row.nominationsOpenAt),
    nominationsCloseAt: iso(row.nominationsCloseAt),
    shortlistAt: iso(row.shortlistAt),
    finalistsAt: iso(row.finalistsAt),
    ceremonyAt: iso(row.ceremonyAt),
    isCurrent: row.isCurrent,
    categoryCount: row._count.categories,
  }));
});

export const getSeason = cache(async (year: number): Promise<SeasonView | null> => {
  const all = await listSeasons();
  return all.find((season) => season.year === year) ?? null;
});

export const getCurrentSeason = cache(async (): Promise<SeasonView> => {
  const all = await listSeasons();
  return all.find((season) => season.isCurrent) ?? all[0]!;
});

// ── Categories ───────────────────────────────────────────────────────────────

export const listCategories = cache(async (year: number): Promise<CategoryView[]> => {
  if (!prisma) {
    return reference.categories
      .filter((category) => category.year === year)
      .sort((a, b) => a.position - b.position);
  }

  const rows = await prisma.category.findMany({
    where: { awardYear: { year } },
    orderBy: { position: 'asc' },
    include: {
      awardYear: true,
      sponsorships: { include: { sponsor: true }, take: 1 },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    strapline: row.strapline,
    description: row.description,
    eligibility: row.eligibility,
    judgingCriteria: row.judgingCriteria,
    isOpen: row.isOpen,
    position: row.position,
    year: row.awardYear.year,
    stage: row.awardYear.stage as SeasonStage,
    partner: row.sponsorships[0]
      ? { name: row.sponsorships[0].sponsor.name, slug: row.sponsorships[0].sponsor.slug }
      : null,
  }));
});

export const getCategory = cache(
  async (year: number, slug: string): Promise<CategoryView | null> => {
    const all = await listCategories(year);
    return all.find((category) => category.slug === slug) ?? null;
  },
);

/** The canonical, season-independent list of category slugs and names. */
export const listCategoryIndex = cache(
  async (): Promise<{ slug: string; name: string; strapline: string | null }[]> => {
    const season = await getCurrentSeason();
    const all = await listCategories(season.year);
    return all.map((category) => ({
      slug: category.slug,
      name: category.name,
      strapline: category.strapline,
    }));
  },
);

// ── Creators ─────────────────────────────────────────────────────────────────

export type CreatorFilter = {
  query?: string;
  country?: string;
  honoursOnly?: boolean;
  limit?: number;
};

export const listCreators = cache(async (filter: CreatorFilter = {}): Promise<CreatorSummary[]> => {
  if (!prisma) {
    let rows = reference.creators;
    if (filter.query) {
      const needle = filter.query.toLowerCase();
      rows = rows.filter(
        (creator) =>
          creator.displayName.toLowerCase().includes(needle) ||
          (creator.headline ?? '').toLowerCase().includes(needle),
      );
    }
    if (filter.country) {
      rows = rows.filter((creator) => creator.countryCode === filter.country!.toUpperCase());
    }
    if (filter.honoursOnly) rows = rows.filter((creator) => creator.honourCount > 0);
    return rows
      .slice()
      .sort((a, b) =>
        b.winCount !== a.winCount
          ? b.winCount - a.winCount
          : b.honourCount !== a.honourCount
            ? b.honourCount - a.honourCount
            : a.displayName.localeCompare(b.displayName),
      )
      .slice(0, filter.limit ?? 60)
      .map(summarise);
  }

  const rows = await prisma.creator.findMany({
    where: {
      isPublished: true,
      isSuspended: false,
      ...(filter.country ? { countryCode: filter.country.toUpperCase() } : {}),
      ...(filter.query
        ? {
            OR: [
              { displayName: { contains: filter.query, mode: 'insensitive' } },
              { headline: { contains: filter.query, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(filter.honoursOnly ? { honours: { some: { state: 'active' } } } : {}),
    },
    take: filter.limit ?? 60,
    include: {
      verification: true,
      honours: { where: { state: 'active' }, select: { kind: true } },
    },
    orderBy: { displayName: 'asc' },
  });

  return rows
    .map((row) => ({
      id: row.id,
      slug: row.slug,
      displayName: row.displayName,
      countryCode: row.countryCode,
      headline: row.headline,
      portraitUrl: row.portraitUrl,
      portraitAlt: row.portraitAlt,
      verificationStatus: (row.verification?.status ?? 'unverified') as CreatorSummary['verificationStatus'],
      honourCount: row.honours.length,
      winCount: row.honours.filter((honour) => honour.kind === 'winner').length,
    }))
    .sort((a, b) =>
      b.winCount !== a.winCount ? b.winCount - a.winCount : b.honourCount - a.honourCount,
    );
});

export const getCreator = cache(async (slug: string): Promise<CreatorProfile | null> => {
  if (!prisma) return reference.creators.find((creator) => creator.slug === slug) ?? null;

  const row = await prisma.creator.findUnique({
    where: { slug },
    include: {
      verification: true,
      links: { orderBy: { position: 'asc' } },
      honours: {
        include: {
          category: true,
          awardYear: true,
          achievement: true,
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!row || !row.isPublished) return null;

  const record: HonourEntry[] = row.honours
    .filter((honour) => winnersArePublic(honour.awardYear.stage as SeasonStage) || honour.kind !== 'winner')
    .map((honour) => ({
      id: honour.id,
      kind: honour.kind as HonourEntry['kind'],
      state: honour.state as HonourEntry['state'],
      year: honour.awardYear.year,
      categoryName: honour.category.name,
      categorySlug: honour.category.slug,
      citation: honour.citation,
      announcedAt: iso(honour.announcedAt),
      code: honour.achievement?.code ?? null,
      position: honour.position,
    }))
    .sort((a, b) => b.year - a.year);

  return {
    id: row.id,
    slug: row.slug,
    displayName: row.displayName,
    countryCode: row.countryCode,
    city: row.city,
    pronouns: row.pronouns,
    headline: row.headline,
    biography: row.biography,
    portraitUrl: row.portraitUrl,
    portraitAlt: row.portraitAlt,
    websiteUrl: row.websiteUrl,
    links: row.links.map((link) => ({ label: link.label, url: link.url })),
    verificationStatus: (row.verification?.status ?? 'unverified') as CreatorSummary['verificationStatus'],
    isClaimed: row.isClaimed,
    record,
    honourCount: record.filter((entry) => entry.state === 'active').length,
    winCount: record.filter((entry) => entry.kind === 'winner' && entry.state === 'active').length,
  };
});

// ── Honours ──────────────────────────────────────────────────────────────────

type HonourRow = {
  kind: HonourEntry['kind'];
  year: number;
  categorySlug: string;
  categoryName: string;
  creatorSlug: string;
  citation: string | null;
  code: string | null;
  position: number;
  announcedAt: string | null;
};

async function honourRows(year?: number, kind?: HonourEntry['kind']): Promise<HonourRow[]> {
  if (!prisma) {
    const seasonStage = new Map(reference.seasons.map((season) => [season.year, season.stage]));
    return reference.honours
      .filter((honour) => honour.state === 'active')
      .filter((honour) => (year ? honour.year === year : true))
      .filter((honour) => (kind ? honour.kind === kind : true))
      .filter((honour) => {
        const stage = seasonStage.get(honour.year);
        if (!stage) return false;
        return honour.kind === 'winner' ? winnersArePublic(stage) : finalistsArePublic(stage);
      })
      .map((honour) => ({
        kind: honour.kind,
        year: honour.year,
        categorySlug: honour.categorySlug,
        categoryName: honour.categoryName,
        creatorSlug: honour.creatorSlug,
        citation: honour.citation,
        code: honour.code,
        position: honour.position,
        announcedAt: honour.announcedAt,
      }));
  }

  const rows = await prisma.honour.findMany({
    where: {
      state: 'active',
      ...(kind ? { kind } : {}),
      awardYear: { ...(year ? { year } : {}) },
    },
    include: { category: true, awardYear: true, creator: true, achievement: true },
    orderBy: [{ position: 'asc' }],
  });

  return rows
    .filter((row) =>
      row.kind === 'winner'
        ? winnersArePublic(row.awardYear.stage as SeasonStage)
        : finalistsArePublic(row.awardYear.stage as SeasonStage),
    )
    .map((row) => ({
      kind: row.kind as HonourEntry['kind'],
      year: row.awardYear.year,
      categorySlug: row.category.slug,
      categoryName: row.category.name,
      creatorSlug: row.creator.slug,
      citation: row.citation,
      code: row.achievement?.code ?? null,
      position: row.position,
      announcedAt: iso(row.announcedAt),
    }));
}

async function creatorIndex(): Promise<Map<string, CreatorSummary>> {
  const all = await listCreators({ limit: 500 });
  return new Map(all.map((creator) => [creator.slug, creator]));
}

export const getCategoryOutcome = cache(
  async (year: number, categorySlug: string): Promise<CategoryOutcome | null> => {
    const category = await getCategory(year, categorySlug);
    if (!category) return null;

    const rows = (await honourRows(year)).filter((row) => row.categorySlug === categorySlug);
    const index = await creatorIndex();

    const finalists: FinalistView[] = rows
      .filter((row) => row.kind === 'finalist')
      .sort((a, b) => a.position - b.position)
      .map((row, i) => ({
        position: i + 1,
        creator: index.get(row.creatorSlug)!,
        citation: row.citation,
      }))
      .filter((entry) => Boolean(entry.creator));

    const winnerRow = rows.find((row) => row.kind === 'winner');
    const winner =
      winnerRow && index.get(winnerRow.creatorSlug)
        ? {
            position: 1,
            creator: index.get(winnerRow.creatorSlug)!,
            citation: winnerRow.citation,
            code: winnerRow.code,
          }
        : null;

    return { category, finalists, winner };
  },
);

export const listSeasonOutcomes = cache(async (year: number): Promise<CategoryOutcome[]> => {
  const categories = await listCategories(year);
  const outcomes = await Promise.all(
    categories.map((category) => getCategoryOutcome(year, category.slug)),
  );
  return outcomes.filter((outcome): outcome is CategoryOutcome => outcome !== null);
});

export type RollFilter = { year?: number; category?: string; country?: string; query?: string };

export const getRollOfHonour = cache(async (filter: RollFilter = {}): Promise<RollOfHonourYear[]> => {
  const rows = await honourRows(filter.year, 'winner');
  const index = await creatorIndex();
  const seasons = await listSeasons();

  const filtered = rows.filter((row) => {
    const creator = index.get(row.creatorSlug);
    if (!creator) return false;
    if (filter.category && row.categorySlug !== filter.category) return false;
    if (filter.country && creator.countryCode !== filter.country.toUpperCase()) return false;
    if (filter.query) {
      const needle = filter.query.toLowerCase();
      if (
        !creator.displayName.toLowerCase().includes(needle) &&
        !row.categoryName.toLowerCase().includes(needle)
      ) {
        return false;
      }
    }
    return true;
  });

  const byYear = new Map<number, RollOfHonourYear>();
  for (const row of filtered) {
    const creator = index.get(row.creatorSlug)!;
    const season = seasons.find((entry) => entry.year === row.year);
    const bucket = byYear.get(row.year) ?? {
      year: row.year,
      title: season?.title ?? `PALMA ${row.year}`,
      entries: [],
    };
    bucket.entries.push({
      year: row.year,
      categoryName: row.categoryName,
      categorySlug: row.categorySlug,
      creator,
      code: row.code,
      citation: row.citation,
    });
    byYear.set(row.year, bucket);
  }

  return [...byYear.values()]
    .map((entry) => ({
      ...entry,
      entries: entry.entries.sort((a, b) => a.categoryName.localeCompare(b.categoryName)),
    }))
    .sort((a, b) => b.year - a.year);
});

export const listRecentHonours = cache(async (limit = 6) => {
  const rows = await honourRows();
  const index = await creatorIndex();
  return rows
    .filter((row) => index.has(row.creatorSlug))
    .sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      if (a.kind !== b.kind) return a.kind === 'winner' ? -1 : 1;
      return a.categoryName.localeCompare(b.categoryName);
    })
    .slice(0, limit)
    .map((row) => ({
      kind: row.kind,
      year: row.year,
      categoryName: row.categoryName,
      categorySlug: row.categorySlug,
      code: row.code,
      creator: index.get(row.creatorSlug)!,
    }));
});

// ── Verification ─────────────────────────────────────────────────────────────

export const getAchievementByCode = cache(
  async (code: string): Promise<AchievementRecord | null> => {
    if (!prisma) {
      return reference.achievements.find((entry) => entry.code === code) ?? null;
    }

    const row = await prisma.verificationRecord.findUnique({
      where: { code },
      include: {
        achievement: {
          include: {
            creator: true,
            honour: { include: { category: true, awardYear: true } },
          },
        },
      },
    });

    if (!row) return null;
    const achievement = row.achievement;

    return {
      code: achievement.code,
      kind: achievement.kind as AchievementRecord['kind'],
      state: achievement.state as AchievementRecord['state'],
      year: achievement.year,
      categoryName: achievement.categoryName,
      categorySlug: achievement.honour.category.slug,
      creatorName: achievement.creatorName,
      creatorSlug: achievement.creator.slug,
      creatorCountry: achievement.creator.countryCode,
      citation: achievement.honour.citation,
      issuedAt: achievement.issuedAt.toISOString(),
      revokedAt: iso(achievement.revokedAt),
      signature: row.signature,
    };
  },
);

// ── Journal ──────────────────────────────────────────────────────────────────

export const listArticles = cache(
  async (options: { category?: string; limit?: number } = {}): Promise<ArticleSummary[]> => {
    if (!prisma) {
      return reference.articles
        .filter((article) => (options.category ? article.categorySlug === options.category : true))
        .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''))
        .slice(0, options.limit ?? 24)
        .map(({ body: _body, ...summary }) => summary);
    }

    const rows = await prisma.article.findMany({
      where: {
        status: 'published',
        publishedAt: { lte: new Date() },
        ...(options.category ? { category: { slug: options.category } } : {}),
      },
      orderBy: { publishedAt: 'desc' },
      take: options.limit ?? 24,
      include: { category: true },
    });

    return rows.map((row) => ({
      slug: row.slug,
      title: row.title,
      standfirst: row.standfirst,
      category: row.category?.name ?? null,
      categorySlug: row.category?.slug ?? null,
      authorName: row.authorName,
      publishedAt: iso(row.publishedAt),
      readingMinutes: row.readingMinutes,
      heroImageUrl: row.heroImageUrl,
      heroImageAlt: row.heroImageAlt,
    }));
  },
);

export const getArticle = cache(async (slug: string): Promise<ArticleDetail | null> => {
  if (!prisma) return reference.articles.find((article) => article.slug === slug) ?? null;

  const row = await prisma.article.findUnique({ where: { slug }, include: { category: true } });
  if (!row || row.status !== 'published') return null;

  return {
    slug: row.slug,
    title: row.title,
    standfirst: row.standfirst,
    body: row.body,
    category: row.category?.name ?? null,
    categorySlug: row.category?.slug ?? null,
    authorName: row.authorName,
    publishedAt: iso(row.publishedAt),
    readingMinutes: row.readingMinutes,
    heroImageUrl: row.heroImageUrl,
    heroImageAlt: row.heroImageAlt,
  };
});

export const listArticleCategories = cache(async () => {
  if (!prisma) return reference.articleCategories;
  const rows = await prisma.articleCategory.findMany({ orderBy: { position: 'asc' } });
  return rows.map((row) => ({ slug: row.slug, name: row.name }));
});

// ── Sponsors & operational stats ─────────────────────────────────────────────

export const listSponsors = cache(async (): Promise<SponsorView[]> => {
  if (!prisma) return reference.sponsors;

  const rows = await prisma.sponsorship.findMany({
    include: { sponsor: true, category: true },
    orderBy: { createdAt: 'asc' },
  });

  return rows
    .filter((row) => row.sponsor.isActive)
    .map((row) => ({
      slug: row.sponsor.slug,
      name: row.sponsor.name,
      summary: row.sponsor.summary,
      websiteUrl: row.sponsor.websiteUrl,
      tier: row.tier as SponsorView['tier'],
      categoryName: row.category?.name ?? null,
    }));
});

export const getSeasonStats = cache(async (year: number): Promise<SeasonStats> => {
  if (!prisma) {
    const outcomes = await listSeasonOutcomes(year);
    const finalists = outcomes.reduce((sum, outcome) => sum + outcome.finalists.length, 0);
    const winners = outcomes.filter((outcome) => outcome.winner).length;
    return { nominations: 0, underReview: 0, eligible: 0, judging: 0, finalists, winners };
  }

  const [nominations, underReview, eligible, judging, finalists, winners] = await Promise.all([
    prisma.nomination.count({ where: { awardYear: { year }, status: { not: 'draft' } } }),
    prisma.nomination.count({ where: { awardYear: { year }, status: 'under_review' } }),
    prisma.nomination.count({ where: { awardYear: { year }, status: 'eligible' } }),
    prisma.judgingAssignment.count({
      where: { nomination: { awardYear: { year } }, status: { in: ['assigned', 'in_progress'] } },
    }),
    prisma.honour.count({ where: { awardYear: { year }, kind: 'finalist', state: 'active' } }),
    prisma.honour.count({ where: { awardYear: { year }, kind: 'winner', state: 'active' } }),
  ]);

  return { nominations, underReview, eligible, judging, finalists, winners };
});

export const listCountries = cache(async (): Promise<string[]> => {
  const all = await listCreators({ limit: 500 });
  return [...new Set(all.map((creator) => creator.countryCode))].sort();
});
