import Link from 'next/link';
import { Container, PageHeader, Section } from '@/components/palma/layout';
import { SeasonRail } from '@/components/palma/SeasonRail';
import { FinalistCard } from '@/components/palma/FinalistCard';
import { EmptyState } from '@/components/ui/feedback';
import { Button } from '@/components/ui/button';
import { buildMetadata } from '@/lib/seo';
import { finalistsArePublic } from '@/domain/season';
import { formatDate } from '@/lib/format';
import {
  getSeason,
  getCurrentSeason,
  listSeasonOutcomes,
  listSeasons,
} from '@/server/data/queries';

export const revalidate = 900;

export const metadata = buildMetadata({
  title: 'Finalists',
  description:
    'The PALMA finalists — the shortlisted creators contesting each honour of The Creator Honours.',
  path: '/finalists',
});

type Props = { searchParams: Promise<{ year?: string }> };

export default async function FinalistsPage({ searchParams }: Props) {
  const { year } = await searchParams;
  const seasons = await listSeasons();

  // Default to the most recent season whose finalists have been announced.
  const requested = year ? await getSeason(Number(year)) : null;
  const announced = seasons.find((season) => finalistsArePublic(season.stage));
  const season = requested ?? announced ?? (await getCurrentSeason());

  const outcomes = finalistsArePublic(season.stage) ? await listSeasonOutcomes(season.year) : [];
  const withFinalists = outcomes.filter((outcome) => outcome.finalists.length > 0);

  return (
    <>
      <PageHeader
        label={
          <Link href={`/awards/${season.year}`} className="hover:text-ivory transition-colors">
            {season.title}
          </Link>
        }
        title="The finalists"
        standfirst={
          withFinalists.length > 0
            ? 'Four creators contest each PALMA. They were selected by the panel, from evidence.'
            : undefined
        }
        meta={
          seasons.length > 1 ? (
            <nav aria-label="Season" className="flex flex-wrap gap-2">
              {seasons.map((entry) => (
                <Link
                  key={entry.year}
                  href={`/finalists?year=${entry.year}`}
                  aria-current={entry.year === season.year ? 'page' : undefined}
                  className={
                    entry.year === season.year
                      ? 'palma-label border-ivory bg-ivory text-ink rounded-full border px-3.5 py-2'
                      : 'palma-label border-ivory/30 text-ivory/70 hover:border-ivory/70 hover:text-ivory rounded-full border px-3.5 py-2 transition-colors'
                  }
                >
                  {entry.year}
                </Link>
              ))}
            </nav>
          ) : undefined
        }
      />

      {/* Finalists are a state of a season, not a destination of their own: the
          rail keeps the rest of the season one click away. */}
      <div className="border-stone-deep bg-ivory border-b">
        <Container className="py-10">
          <SeasonRail year={season.year} stage={season.stage} current="finalists" tone="light" />
        </Container>
      </div>

      {withFinalists.length === 0 ? (
        <Section>
          <Container>
            <EmptyState
              title="Finalists not yet announced"
              description={`The ${season.title} finalists are announced on ${formatDate(season.finalistsAt)}. Until then, the record shows the categories being contested.`}
              action={
                <Button asChild size="sm" variant="outline">
                  <Link href="/categories">View the categories</Link>
                </Button>
              }
            />
          </Container>
        </Section>
      ) : (
        withFinalists.map((outcome, index) => (
          <Section
            key={outcome.category.slug}
            tone={index % 2 === 0 ? 'ink' : 'olive'}
            className="py-20 sm:py-24"
          >
            <Container>
              <div className="flex flex-col gap-4 border-b border-current/15 pb-10">
                <span className="palma-label opacity-60">{season.title}</span>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <h2 className="text-4xl leading-tight sm:text-5xl">{outcome.category.name}</h2>
                  <Link
                    href={`/categories/${outcome.category.slug}?year=${season.year}`}
                    className="palma-label opacity-70 transition-opacity hover:opacity-100"
                  >
                    Category detail →
                  </Link>
                </div>
              </div>

              <div className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
                {outcome.finalists.map((finalist, position) => (
                  <FinalistCard key={finalist.creator.slug} finalist={finalist} index={position} />
                ))}
              </div>
            </Container>
          </Section>
        ))
      )}
    </>
  );
}
