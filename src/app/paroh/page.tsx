import Link from 'next/link';
import { Container, Section } from '@/components/palma/layout';
import { EmptyState } from '@/components/ui/feedback';
import { Input } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { PalmMark } from '@/components/brand/PalmMark';
import { buildMetadata } from '@/lib/seo';
import { countryName } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  getRollOfHonour,
  listCategoryIndex,
  listCountries,
  listSeasons,
} from '@/server/data/queries';

export const revalidate = 900;

export const metadata = buildMetadata({
  title: 'PALMA Roll of Honour',
  description:
    'The PaROH — the permanent record of PALMA recipients. Every honour, every season, filterable by year, category, creator and country.',
  path: '/paroh',
});

type Props = {
  searchParams: Promise<{ year?: string; category?: string; country?: string; q?: string }>;
};

function filterHref(base: Record<string, string | undefined>, patch: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...base, ...patch })) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `/paroh?${query}` : '/paroh';
}

export default async function ParohPage({ searchParams }: Props) {
  const filters = await searchParams;
  const [seasons, categories, countries] = await Promise.all([
    listSeasons(),
    listCategoryIndex(),
    listCountries(),
  ]);

  const roll = await getRollOfHonour({
    year: filters.year ? Number(filters.year) : undefined,
    category: filters.category,
    country: filters.country,
    query: filters.q,
  });

  const total = roll.reduce((sum, group) => sum + group.entries.length, 0);
  const filtered = Boolean(filters.year || filters.category || filters.country || filters.q);

  return (
    <>
      <header className="on-ink relative overflow-hidden border-b border-ink bg-ink text-ivory">
        <PalmMark className="pointer-events-none absolute -top-10 -right-20 h-120 text-ivory/[0.05]" />
        <Container className="relative py-20 sm:py-28">
          <div className="flex max-w-200 flex-col gap-8">
            <span className="palma-label text-champagne">PaROH</span>
            <h1 className="text-5xl leading-[0.95] sm:text-7xl lg:text-8xl">
              PALMA
              <br />
              Roll of Honour
            </h1>
            <p className="max-w-130 text-lg leading-relaxed text-ivory/70">
              The permanent record of PALMA recipients. {total} {total === 1 ? 'honour' : 'honours'}{' '}
              held across {seasons.filter((s) => s.stage === 'archived').length || seasons.length}{' '}
              seasons.
            </p>
          </div>
        </Container>
      </header>

      <div className="sticky top-18 z-30 border-b border-stone-deep bg-ivory/94 backdrop-blur-md">
        <Container className="flex flex-col gap-4 py-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="palma-label mr-2 text-taupe-deep">Year</span>
            <Link
              href={filterHref(filters, { year: undefined })}
              className={cn(
                'palma-label rounded-full border px-3.5 py-2 transition-colors',
                !filters.year
                  ? 'border-ink bg-ink text-ivory'
                  : 'border-stone-deep text-taupe-deep hover:border-ink/40 hover:text-ink',
              )}
            >
              All
            </Link>
            {seasons.map((season) => (
              <Link
                key={season.year}
                href={filterHref(filters, { year: String(season.year) })}
                className={cn(
                  'palma-label rounded-full border px-3.5 py-2 transition-colors',
                  filters.year === String(season.year)
                    ? 'border-ink bg-ink text-ivory'
                    : 'border-stone-deep text-taupe-deep hover:border-ink/40 hover:text-ink',
                )}
              >
                {season.year}
              </Link>
            ))}
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="palma-label mr-2 text-taupe-deep">Category</span>
              <Link
                href={filterHref(filters, { category: undefined })}
                className={cn(
                  'palma-label rounded-full border px-3.5 py-2 transition-colors',
                  !filters.category
                    ? 'border-ink bg-ink text-ivory'
                    : 'border-stone-deep text-taupe-deep hover:border-ink/40 hover:text-ink',
                )}
              >
                All
              </Link>
              {categories.map((category) => (
                <Link
                  key={category.slug}
                  href={filterHref(filters, { category: category.slug })}
                  className={cn(
                    'palma-label rounded-full border px-3.5 py-2 transition-colors',
                    filters.category === category.slug
                      ? 'border-ink bg-ink text-ivory'
                      : 'border-stone-deep text-taupe-deep hover:border-ink/40 hover:text-ink',
                  )}
                >
                  {category.name}
                </Link>
              ))}
            </div>

            <form action="/paroh" className="flex items-center gap-2" role="search">
              {filters.year ? <input type="hidden" name="year" value={filters.year} /> : null}
              {filters.category ? (
                <input type="hidden" name="category" value={filters.category} />
              ) : null}
              <label htmlFor="paroh-search" className="sr-only">
                Search the Roll of Honour
              </label>
              <Input
                id="paroh-search"
                name="q"
                type="search"
                defaultValue={filters.q ?? ''}
                placeholder="Creator or category"
                className="h-11 w-full lg:w-64"
              />
              <Button type="submit" size="sm" variant="outline">
                Search
              </Button>
            </form>
          </div>

          {countries.length > 1 ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="palma-label mr-2 text-taupe-deep">Country</span>
              <Link
                href={filterHref(filters, { country: undefined })}
                className={cn(
                  'palma-label rounded-full border px-3.5 py-2 transition-colors',
                  !filters.country
                    ? 'border-ink bg-ink text-ivory'
                    : 'border-stone-deep text-taupe-deep hover:border-ink/40 hover:text-ink',
                )}
              >
                All
              </Link>
              {countries.map((code) => (
                <Link
                  key={code}
                  href={filterHref(filters, { country: code })}
                  className={cn(
                    'palma-label rounded-full border px-3.5 py-2 transition-colors',
                    filters.country === code
                      ? 'border-ink bg-ink text-ivory'
                      : 'border-stone-deep text-taupe-deep hover:border-ink/40 hover:text-ink',
                  )}
                >
                  {countryName(code)}
                </Link>
              ))}
            </div>
          ) : null}
        </Container>
      </div>

      <Section className="py-16 sm:py-20">
        <Container>
          {roll.length === 0 ? (
            <EmptyState
              title="No honours match that filter"
              description="The Roll of Honour holds only conferred honours. Try widening the year, category or country."
              action={
                <Button asChild size="sm" variant="outline">
                  <Link href="/paroh">Clear filters</Link>
                </Button>
              }
            />
          ) : (
            <div className="flex flex-col gap-20">
              {roll.map((group) => (
                <section key={group.year} aria-labelledby={`paroh-${group.year}`}>
                  <div className="flex items-end justify-between gap-6 border-b border-ink/15 pb-5">
                    <h2 id={`paroh-${group.year}`} className="text-5xl leading-none sm:text-6xl">
                      {group.year}
                    </h2>
                    <Link
                      href={`/paroh/${group.year}`}
                      className="palma-label text-taupe-deep transition-colors hover:text-ink"
                    >
                      Class of {group.year} →
                    </Link>
                  </div>

                  <ul className="mt-2">
                    {group.entries.map((entry) => (
                      <li key={`${entry.year}-${entry.categorySlug}`}>
                        <Link
                          href={`/creators/${entry.creator.slug}`}
                          className="group grid grid-cols-1 items-baseline gap-1 border-b border-stone-deep py-6 transition-colors hover:bg-stone/25 sm:grid-cols-12 sm:gap-6"
                        >
                          <span className="palma-label text-taupe-deep sm:col-span-5">
                            {entry.categoryName}
                          </span>
                          <span className="font-display text-2xl leading-tight sm:col-span-5 sm:text-3xl">
                            {entry.creator.displayName}
                          </span>
                          <span className="palma-label text-taupe sm:col-span-2 sm:text-right">
                            {countryName(entry.creator.countryCode)}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}

          {filtered ? (
            <p className="mt-12 text-sm text-taupe-deep">
              Showing {total} {total === 1 ? 'honour' : 'honours'} ·{' '}
              <Link href="/paroh" className="underline underline-offset-4 hover:text-ink">
                Clear filters
              </Link>
            </p>
          ) : null}
        </Container>
      </Section>
    </>
  );
}
