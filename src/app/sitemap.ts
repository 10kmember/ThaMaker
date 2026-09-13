import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/env';
import { listArticles, listCategoryIndex, listCreators, listSeasons } from '@/server/data/queries';
import { LEGAL_DOCUMENTS } from '@/lib/legal';

export const revalidate = 3600;

/**
 * Creator records and the Roll of Honour are the pages PALMA most wants
 * indexed: they are the institution's public memory.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [seasons, categories, creators, articles] = await Promise.all([
    listSeasons(),
    listCategoryIndex(),
    listCreators({ limit: 500 }),
    listArticles({ limit: 200 }),
  ]);

  const now = new Date();

  const statics: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${siteUrl}/awards`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${siteUrl}/categories`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${siteUrl}/nominate`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${siteUrl}/finalists`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${siteUrl}/winners`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${siteUrl}/paroh`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${siteUrl}/creators`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${siteUrl}/journal`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${siteUrl}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    {
      url: `${siteUrl}/about/judging`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${siteUrl}/about/policy`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${siteUrl}/about/judges`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${siteUrl}/about/sponsors`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    { url: `${siteUrl}/press`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${siteUrl}/contact`, lastModified: now, changeFrequency: 'yearly', priority: 0.5 },
    { url: `${siteUrl}/verify`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${siteUrl}/legal`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    // Every registered document has a page, so the register is the source of
    // truth for the sitemap too — a new document appears here by existing.
    ...LEGAL_DOCUMENTS.map((entry) => ({
      url: `${siteUrl}/legal/${entry.slug}`,
      lastModified: new Date(entry.effective),
      changeFrequency: 'yearly' as const,
      priority: 0.3,
    })),
  ];

  return [
    ...statics,
    ...seasons.flatMap((season) => [
      {
        url: `${siteUrl}/awards/${season.year}`,
        lastModified: now,
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      },
      {
        url: `${siteUrl}/paroh/${season.year}`,
        lastModified: now,
        changeFrequency: 'monthly' as const,
        priority: 0.8,
      },
    ]),
    ...categories.map((category) => ({
      url: `${siteUrl}/categories/${category.slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
    ...creators.map((creator) => ({
      url: `${siteUrl}/creators/${creator.slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: creator.winCount > 0 ? 0.9 : 0.6,
    })),
    ...articles.map((article) => ({
      url: `${siteUrl}/journal/${article.slug}`,
      lastModified: article.publishedAt ? new Date(article.publishedAt) : now,
      changeFrequency: 'yearly' as const,
      priority: 0.6,
    })),
  ];
}
