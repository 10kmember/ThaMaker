import { Container, PageHeader, Section } from '@/components/palma/layout';
import { CategoryCard } from '@/components/palma/CategoryCard';
import { buildMetadata } from '@/lib/seo';
import { getCurrentSeason, listCategories } from '@/server/data/queries';

export const revalidate = 900;

export const metadata = buildMetadata({
  title: 'Categories',
  description:
    'Every PALMA category, with its eligibility rules and judging criteria set out in full — the eight honours contested in The Creator Honours.',
  path: '/categories',
});

export default async function CategoriesPage() {
  const season = await getCurrentSeason();
  const categories = await listCategories(season.year);

  return (
    <>
      <PageHeader
        label={season.title}
        title="The categories"
        standfirst="Eight honours. Each with published eligibility rules, published judging criteria, and a panel briefed to discount audience size."
      />

      <Section>
        <Container>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category, index) => (
              <CategoryCard key={category.slug} category={category} index={index} />
            ))}
          </div>
        </Container>
      </Section>
    </>
  );
}
