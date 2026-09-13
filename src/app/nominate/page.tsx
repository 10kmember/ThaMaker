import Link from 'next/link';
import { Container, PageHeader, Section } from '@/components/palma/layout';
import { NominationForm } from '@/components/nominate/NominationForm';
import { EmptyState } from '@/components/ui/feedback';
import { Button } from '@/components/ui/button';
import { buildMetadata } from '@/lib/seo';
import { acceptsNominations } from '@/domain/season';
import { formatDate } from '@/lib/format';
import { getCurrentSeason, listCategories } from '@/server/data/queries';

export const revalidate = 300;

export const metadata = buildMetadata({
  title: 'Nominate a creator',
  description:
    'Nominate a creator for a PALMA. Nominating is free, takes a few minutes, and cannot be bought — the shortlist is produced by judges, from evidence.',
  path: '/nominate',
});

type Props = { searchParams: Promise<{ category?: string }> };

export default async function NominatePage({ searchParams }: Props) {
  const { category } = await searchParams;
  const season = await getCurrentSeason();
  const categories = await listCategories(season.year);
  const open = acceptsNominations(season.stage);

  return (
    <>
      <PageHeader
        label={season.title}
        title="Nominate a creator"
        standfirst="A nomination is a claim about work that has already been done. Make it specific, evidence it, and a panel will read it."
        meta={
          season.nominationsCloseAt ? (
            <span className="palma-label text-ivory/55">
              Nominations close {formatDate(season.nominationsCloseAt)}
            </span>
          ) : undefined
        }
      />

      <Section className="py-16 sm:py-20">
        <Container>
          {open ? (
            <NominationForm
              year={season.year}
              categories={categories.map((entry) => ({
                slug: entry.slug,
                name: entry.name,
                strapline: entry.strapline,
              }))}
              defaultCategory={
                category && categories.some((entry) => entry.slug === category)
                  ? category
                  : undefined
              }
            />
          ) : (
            <EmptyState
              title="Nominations are closed"
              description={`Nominations for ${season.title} are not open. The season moves to the panel next; finalists are announced on ${formatDate(season.finalistsAt)}.`}
              action={
                <Button asChild size="sm" variant="outline">
                  <Link href={`/awards/${season.year}`}>Follow the season</Link>
                </Button>
              }
            />
          )}
        </Container>
      </Section>
    </>
  );
}
