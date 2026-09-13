import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container, Section } from '@/components/palma/layout';
import { PalmMark } from '@/components/brand/PalmMark';
import { JsonLd, articleJsonLd, breadcrumbJsonLd, buildMetadata } from '@/lib/seo';
import { formatDate } from '@/lib/format';
import { getArticle, listArticles } from '@/server/data/queries';

export const revalidate = 900;

type Params = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const articles = await listArticles({ limit: 100 });
  return articles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: Params) {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) {
    return buildMetadata({ title: 'Journal', description: '', path: `/journal/${slug}`, noIndex: true });
  }

  return buildMetadata({
    title: article.title,
    description: article.standfirst,
    path: `/journal/${article.slug}`,
    type: 'article',
    publishedTime: article.publishedAt,
  });
}

export default async function ArticlePage({ params }: Params) {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) notFound();

  const related = (await listArticles({ limit: 4 }))
    .filter((entry) => entry.slug !== article.slug)
    .slice(0, 3);

  const paragraphs = article.body.split('\n\n').filter(Boolean);

  return (
    <>
      <article>
        <header className="border-b border-stone-deep bg-ivory">
          <Container size="narrow" className="py-16 sm:py-24">
            <div className="flex flex-col gap-6">
              <Link
                href={article.categorySlug ? `/journal?category=${article.categorySlug}` : '/journal'}
                className="palma-label text-olive transition-opacity hover:opacity-70"
              >
                {article.category ?? 'Journal'}
              </Link>
              <h1 className="text-4xl leading-[1.05] sm:text-6xl">{article.title}</h1>
              <p className="max-w-140 font-display text-xl leading-snug text-taupe-deep sm:text-2xl">
                {article.standfirst}
              </p>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-stone-deep pt-6">
                <span className="palma-label text-ink">{article.authorName}</span>
                <span className="palma-label text-taupe-deep">
                  {formatDate(article.publishedAt)}
                </span>
                <span className="palma-label text-taupe-deep">
                  {article.readingMinutes} min read
                </span>
              </div>
            </div>
          </Container>
        </header>

        <Container size="narrow" className="py-16 sm:py-20">
          <div className="palma-prose max-w-160">
            {paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>

          <div className="mt-16 flex items-center gap-6 border-t border-stone-deep pt-10">
            <PalmMark className="h-8 text-stone-deep" />
            <p className="text-sm leading-relaxed text-taupe-deep">
              The PALMA Journal is published by PALMA — The Creator Honours.
            </p>
          </div>
        </Container>
      </article>

      {related.length > 0 ? (
        <Section tone="stone" className="py-16 sm:py-20">
          <Container>
            <h2 className="palma-label mb-10 text-taupe-deep">More from the Journal</h2>
            <div className="grid gap-10 sm:grid-cols-3">
              {related.map((entry) => (
                <Link
                  key={entry.slug}
                  href={`/journal/${entry.slug}`}
                  className="group flex flex-col gap-3 border-t border-stone-deep pt-5"
                >
                  <span className="palma-label text-taupe-deep">{entry.category ?? 'Journal'}</span>
                  <h3 className="text-xl leading-tight transition-colors group-hover:text-olive">
                    {entry.title}
                  </h3>
                </Link>
              ))}
            </div>
          </Container>
        </Section>
      ) : null}

      <JsonLd
        data={[
          articleJsonLd({
            title: article.title,
            description: article.standfirst,
            path: `/journal/${article.slug}`,
            authorName: article.authorName,
            publishedAt: article.publishedAt,
          }),
          breadcrumbJsonLd([
            { name: 'Journal', path: '/journal' },
            { name: article.title, path: `/journal/${article.slug}` },
          ]),
        ]}
      />
    </>
  );
}
