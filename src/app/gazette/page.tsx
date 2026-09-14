import Link from 'next/link';
import { Container, Section } from '@/components/palma/layout';
import { GazetteForm } from '@/components/palma/GazetteForm';
import { buildMetadata } from '@/lib/seo';
import { prisma } from '@/server/db';
import { formatDate } from '@/lib/format';

export const revalidate = 3600;

export const metadata = buildMetadata({
  title: 'The Gazette',
  description:
    'PALMA’s letter on the season — when nominations open, when the panel confers, and what the institution is thinking while it does.',
  path: '/gazette',
});

export default async function GazettePage() {
  const issues = await prisma.gazetteIssue.findMany({
    orderBy: { number: 'desc' },
    take: 20,
    select: { id: true, number: true, slug: true, subject: true, standfirst: true, sentAt: true },
  });

  return (
    <Section className="py-20">
      <Container size="narrow">
        <div className="mx-auto flex max-w-140 flex-col gap-10">
          <div className="flex flex-col gap-5">
            <span className="palma-label text-champagne-deep">The Gazette</span>
            <h1 className="text-5xl leading-tight">PALMA’s letter on the season</h1>
            <p className="text-taupe-deep text-lg leading-relaxed">
              When nominations open and close, when a shortlist is read, when the panel confers —
              and what the institution is thinking while it does.
            </p>
          </div>

          <div className="border-stone-deep border-y py-9">
            <GazetteForm source="gazette" />
          </div>

          {issues.length > 0 ? (
            <section>
              <h2 className="palma-label text-taupe-deep mb-6">Past issues</h2>
              <ul className="flex flex-col">
                {issues.map((issue) => (
                  <li key={issue.id} className="border-stone-deep border-b py-6 first:border-t">
                    <Link href={`/gazette/${issue.slug}`} className="group flex flex-col gap-2">
                      <span className="palma-label text-taupe-deep">
                        No. {issue.number} · {formatDate(issue.sentAt)}
                      </span>
                      <span className="font-display group-hover:text-olive text-2xl leading-snug transition-colors">
                        {issue.subject}
                      </span>
                      <span className="text-taupe-deep text-sm leading-relaxed">
                        {issue.standfirst}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className="flex flex-col gap-6">
            <div>
              <h2 className="palma-label text-taupe-deep mb-3">How often</h2>
              <p className="text-taupe-deep leading-relaxed">
                When there is something to say. A handful of times a season, not weekly, and never
                because a schedule said so.
              </p>
            </div>

            <div>
              <h2 className="palma-label text-taupe-deep mb-3">What it will never be</h2>
              <p className="text-taupe-deep leading-relaxed">
                A leaderboard, a plea for nominations, or a way for a sponsor to reach you. PALMA
                does not publish nomination counts, and sponsorship buys no part of this letter.
              </p>
            </div>

            <div>
              <h2 className="palma-label text-taupe-deep mb-3">Leaving</h2>
              <p className="text-taupe-deep leading-relaxed">
                One click in any issue. No sign-in, no confirmation screen, no survey about why.
                Your address is then marked unsubscribed rather than kept warm.
              </p>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
