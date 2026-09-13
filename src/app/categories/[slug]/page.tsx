import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container, PageHeader, Section, SectionHeading } from '@/components/palma/layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/feedback';
import { FinalistCard } from '@/components/palma/FinalistCard';
import { WinnerReveal } from '@/components/palma/WinnerReveal';
import { JsonLd, breadcrumbJsonLd, buildMetadata } from '@/lib/seo';
import { STAGE_LABEL, acceptsNominations, finalistsArePublic } from '@/domain/season';
import { SCORING_CRITERIA } from '@/domain/judging';
import {
  getCategoryOutcome,
  getCurrentSeason,
  listCategories,
  listSeasons,
} from '@/server/data/queries';

export const revalidate = 900;

type Params = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ year?: string }>;
};

export async function generateStaticParams() {
  const season = await getCurrentSeason();
  const categories = await listCategories(season.year);
  return categories.map((category) => ({ slug: category.slug }));
}

export async function generateMetadata({ params, searchParams }: Params) {
  const [{ slug }, { year }] = await Promise.all([params, searchParams]);
  const season = year ? await getSeasonOrCurrent(Number(year)) : await getCurrentSeason();
  const outcome = await getCategoryOutcome(season.year, slug);
  if (!outcome)
    return buildMetadata({ title: 'Category', description: '', path: `/categories/${slug}` });

  return buildMetadata({
    title: outcome.category.name,
    description: outcome.category.description.slice(0, 200),
    path: `/categories/${slug}`,
  });
}

async function getSeasonOrCurrent(year: number) {
  const seasons = await listSeasons();
  return seasons.find((season) => season.year === year) ?? (await getCurrentSeason());
}

export default async function CategoryPage({ params, searchParams }: Params) {
  const [{ slug }, { year }] = await Promise.all([params, searchParams]);
  const season = year ? await getSeasonOrCurrent(Number(year)) : await getCurrentSeason();
  const outcome = await getCategoryOutcome(season.year, slug);
  if (!outcome) notFound();

  const { category, finalists, winner } = outcome;
  const open = acceptsNominations(category.stage);
  const showFinalists = finalistsArePublic(category.stage) && finalists.length > 0;
  const seasons = await listSeasons();

  return (
    <>
      <PageHeader
        label={`${season.title} · Category`}
        title={category.name}
        standfirst={category.strapline ?? undefined}
        meta={
          <>
            <Badge variant={open ? 'champagneDark' : 'outlineIvory'}>
              {open ? 'Open for nominations' : STAGE_LABEL[category.stage]}
            </Badge>
            {category.partner ? (
              <span className="palma-label text-ivory/50">
                Category partner · {category.partner.name}
              </span>
            ) : null}
          </>
        }
      >
        {open ? (
          <div className="pt-4">
            <Button asChild variant="ivory" size="md">
              <Link href={`/nominate?category=${category.slug}`}>Nominate in this category</Link>
            </Button>
          </div>
        ) : null}
      </PageHeader>

      {winner ? <WinnerReveal outcome={outcome} season={season} /> : null}

      <Section className="py-16 sm:py-20">
        <Container>
          <div className="grid gap-12 lg:grid-cols-12">
            <div className="flex flex-col gap-10 lg:col-span-7">
              <div className="flex flex-col gap-4">
                <h2 className="palma-label text-taupe-deep">The category</h2>
                <p className="font-display text-2xl leading-snug">{category.description}</p>
              </div>

              <div className="border-stone-deep flex flex-col gap-4 border-t pt-8">
                <h2 className="palma-label text-taupe-deep">Eligibility</h2>
                <p className="text-ink/85 leading-relaxed">{category.eligibility}</p>
              </div>

              <div className="border-stone-deep flex flex-col gap-4 border-t pt-8">
                <h2 className="palma-label text-taupe-deep">Judging criteria</h2>
                <p className="text-ink/85 leading-relaxed">{category.judgingCriteria}</p>
              </div>
            </div>

            <aside className="lg:col-span-5">
              <div className="border-stone-deep bg-ivory-bright border p-7">
                <h2 className="palma-label text-taupe-deep">Scored against</h2>
                <ul className="mt-6 flex flex-col gap-5">
                  {SCORING_CRITERIA.map((criterion) => (
                    <li key={criterion.key} className="flex flex-col gap-1.5">
                      <div className="flex items-baseline justify-between gap-4">
                        <span className="font-display text-lg">{criterion.label}</span>
                        <span className="palma-label text-taupe">/10</span>
                      </div>
                      <p className="text-taupe-deep text-sm leading-relaxed">
                        {criterion.description}
                      </p>
                    </li>
                  ))}
                </ul>
                <p className="border-stone-deep text-taupe-deep mt-7 border-t pt-5 text-xs leading-relaxed">
                  Scores are submitted independently by each judge and are immutable once submitted.
                  Audience size is not a criterion.
                </p>
              </div>

              {seasons.length > 1 ? (
                <div className="border-stone-deep mt-6 border p-7">
                  <h2 className="palma-label text-taupe-deep">This category by season</h2>
                  <ul className="mt-5 flex flex-col gap-3">
                    {seasons.map((entry) => (
                      <li key={entry.year}>
                        <Link
                          href={`/categories/${category.slug}?year=${entry.year}`}
                          className="hover:text-olive flex items-baseline justify-between gap-4 text-sm transition-colors"
                          aria-current={entry.year === season.year ? 'page' : undefined}
                        >
                          <span className="font-display text-lg">{entry.title}</span>
                          <span className="palma-label text-taupe-deep">
                            {STAGE_LABEL[entry.stage]}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </aside>
          </div>
        </Container>
      </Section>

      <Section tone={showFinalists ? 'ink' : 'stone'}>
        <Container>
          {showFinalists ? (
            <>
              <SectionHeading
                label={`${season.title} · ${category.name}`}
                title="The finalists"
                className="[&_p]:text-ivory/60 [&>div>span]:text-champagne"
              />
              <div className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
                {finalists.map((finalist, index) => (
                  <FinalistCard key={finalist.creator.slug} finalist={finalist} index={index} />
                ))}
              </div>
            </>
          ) : (
            <EmptyState
              title={open ? 'Nominations are open' : 'Finalists not yet announced'}
              description={
                open
                  ? 'Finalists in this category are announced once judging is complete. Nominations close at the end of the nomination window.'
                  : 'The finalists for this category will appear here when the panel has completed its judging.'
              }
              action={
                open ? (
                  <Button asChild size="sm">
                    <Link href={`/nominate?category=${category.slug}`}>Nominate a creator</Link>
                  </Button>
                ) : undefined
              }
            />
          )}
        </Container>
      </Section>

      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Categories', path: '/categories' },
          { name: category.name, path: `/categories/${category.slug}` },
        ])}
      />
    </>
  );
}
