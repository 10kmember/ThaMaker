import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container, Section } from '@/components/palma/layout';
import { GazetteForm } from '@/components/palma/GazetteForm';
import { buildMetadata } from '@/lib/seo';
import { prisma } from '@/server/db';
import { formatDate } from '@/lib/format';

export const revalidate = 3600;

export async function generateStaticParams() {
  const issues = await prisma.gazetteIssue.findMany({
    select: { slug: true },
    orderBy: { number: 'desc' },
    take: 50,
  });
  return issues.map((issue) => ({ slug: issue.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const issue = await prisma.gazetteIssue.findUnique({
    where: { slug },
    select: { subject: true, standfirst: true },
  });

  if (!issue) {
    return buildMetadata({
      title: 'The Gazette',
      description: 'PALMA’s letter on the season.',
      path: '/gazette',
    });
  }

  return buildMetadata({
    title: issue.subject,
    description: issue.standfirst.slice(0, 200),
    path: `/gazette/${slug}`,
  });
}

/**
 * An issue, kept.
 *
 * The same words that went out by email, on a page anybody can read — a reader
 * who joins tomorrow should not be told that what PALMA said yesterday exists
 * only in other people's inboxes.
 */
export default async function GazetteIssuePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const issue = await prisma.gazetteIssue.findUnique({ where: { slug } });
  if (!issue) notFound();

  const paragraphs = issue.body
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  return (
    <Section className="py-20">
      <Container size="narrow">
        <article className="mx-auto flex max-w-140 flex-col gap-8">
          <Link href="/gazette" className="palma-label text-taupe-deep hover:text-ink">
            ← The Gazette
          </Link>

          <header className="flex flex-col gap-5">
            <span className="palma-label text-champagne-deep">
              No. {issue.number} · {formatDate(issue.sentAt)}
            </span>
            <h1 className="text-5xl leading-tight">{issue.subject}</h1>
            <p className="text-taupe-deep text-lg leading-relaxed italic">{issue.standfirst}</p>
          </header>

          <div className="border-stone-deep flex flex-col gap-5 border-t pt-8 leading-relaxed">
            {paragraphs.map((block, index) => (
              <p key={index}>{block}</p>
            ))}
          </div>

          {issue.linkUrl && issue.linkLabel ? (
            <p>
              <a
                href={issue.linkUrl}
                className="palma-link text-ink"
                rel="noreferrer noopener"
                target="_blank"
              >
                {issue.linkLabel}
              </a>
            </p>
          ) : null}

          <aside className="border-stone-deep mt-6 border-t pt-9">
            <h2 className="palma-label text-taupe-deep mb-4">Get the next one</h2>
            <GazetteForm source="issue" compact />
          </aside>
        </article>
      </Container>
    </Section>
  );
}
