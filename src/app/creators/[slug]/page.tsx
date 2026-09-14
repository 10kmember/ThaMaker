import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import { Container, Section } from '@/components/palma/layout';
import { EditorialImage } from '@/components/palma/EditorialImage';
import { VerificationBadge, AchievementBadge } from '@/components/palma/badges';
import { CopyLink } from '@/components/palma/CopyLink';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/feedback';
import { PalmaSeal } from '@/components/brand/PalmaSeal';
import { JsonLd, absoluteUrl, awardJsonLd, breadcrumbJsonLd, buildMetadata } from '@/lib/seo';
import { countryName } from '@/lib/format';
import { pluralise } from '@/lib/utils';
import { getCreator, listCreators } from '@/server/data/queries';

export const revalidate = 900;

type Params = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const creators = await listCreators({ limit: 200 });
  return creators.map((creator) => ({ slug: creator.slug }));
}

export async function generateMetadata({ params }: Params) {
  const { slug } = await params;
  const creator = await getCreator(slug);
  if (!creator) {
    return buildMetadata({
      title: 'Creator',
      description: '',
      path: `/creators/${slug}`,
      noIndex: true,
    });
  }

  const honours = creator.record.filter((entry) => entry.state === 'active');
  const wins = honours.filter((entry) => entry.kind === 'winner');

  return buildMetadata({
    title: creator.displayName,
    description:
      wins.length > 0
        ? `${creator.displayName} holds ${wins.length} PALMA ${pluralise(wins.length, 'award')} — ${wins.map((entry) => `${entry.categoryName} ${entry.year}`).join(', ')}. The permanent PALMA record.`
        : `${creator.displayName} — ${creator.headline ?? 'creator'} in the PALMA record.`,
    path: `/creators/${creator.slug}`,
    image: `/creators/${creator.slug}/opengraph-image`,
    type: 'profile',
  });
}

export default async function CreatorPage({ params }: Params) {
  const { slug } = await params;
  const creator = await getCreator(slug);
  if (!creator) notFound();

  const active = creator.record.filter((entry) => entry.state === 'active');
  const wins = active.filter((entry) => entry.kind === 'winner');
  const profileUrl = absoluteUrl(`/creators/${creator.slug}`);

  return (
    <>
      <Section tone="ivory" className="pt-12 pb-0! sm:pt-16">
        <Container>
          <div className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <EditorialImage
                name={creator.displayName}
                src={creator.portraitUrl}
                alt={creator.portraitAlt}
                priority
                sizes="(max-width: 1024px) 100vw, 40vw"
              />
            </div>

            <div className="flex flex-col gap-8 lg:col-span-7 lg:pt-6">
              <div className="flex flex-col gap-5">
                <h1 className="text-5xl leading-[0.95] sm:text-6xl lg:text-7xl">
                  {creator.displayName}
                </h1>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                  <span className="palma-label text-taupe-deep">
                    Creator · {countryName(creator.countryCode)}
                    {creator.city ? ` · ${creator.city}` : ''}
                  </span>
                  {creator.pronouns ? (
                    <span className="palma-label text-taupe">{creator.pronouns}</span>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <VerificationBadge status={creator.verificationStatus} />
                  {wins.length > 0 ? (
                    <Badge variant="champagne">
                      {wins.length} PALMA {pluralise(wins.length, 'win')}
                    </Badge>
                  ) : null}
                </div>
              </div>

              {creator.headline ? (
                <p className="font-display text-ink/85 max-w-140 text-2xl leading-snug">
                  {creator.headline}
                </p>
              ) : null}

              {creator.biography ? (
                <p className="text-taupe-deep max-w-140 leading-relaxed">{creator.biography}</p>
              ) : null}

              {creator.links.length > 0 ? (
                <ul className="flex flex-wrap gap-4">
                  {creator.links.map((link) => (
                    <li key={link.url}>
                      <a
                        href={link.url}
                        rel="nofollow noopener noreferrer"
                        target="_blank"
                        className="palma-label border-stone-deep text-taupe-deep hover:border-ink hover:text-ink inline-flex items-center gap-2 border-b pb-1 transition-colors"
                      >
                        {link.label}
                        <ExternalLink className="size-3.5" aria-hidden="true" />
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </Container>
      </Section>

      <Section className="pt-16 sm:pt-20">
        <Container>
          <div className="grid gap-14 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <div className="border-ink/20 flex items-end justify-between gap-6 border-b pb-5">
                <h2 className="text-3xl sm:text-4xl">PALMA record</h2>
                <span className="palma-label text-taupe-deep">
                  {active.length} {pluralise(active.length, 'honour')}
                </span>
              </div>

              {active.length === 0 ? (
                <EmptyState
                  className="mt-10"
                  title="No honours yet"
                  description="This creator holds no PALMA honours at present. Nominations for the current season may be open."
                  action={
                    <Button asChild size="sm" variant="outline">
                      <Link href="/nominate">Nominate this creator</Link>
                    </Button>
                  }
                />
              ) : (
                <ul className="mt-2">
                  {active.map((entry) => (
                    <li
                      key={entry.id}
                      className="border-stone-deep flex flex-col gap-4 border-b py-7 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <AchievementBadge
                        kind={entry.kind}
                        year={entry.year}
                        categoryName={entry.categoryName}
                        revoked={entry.state === 'revoked'}
                      />
                      <div className="flex shrink-0 items-center gap-3 pl-7.5 sm:pl-0">
                        <Link
                          href={`/categories/${entry.categorySlug}?year=${entry.year}`}
                          className="palma-label text-taupe-deep hover:text-ink transition-colors"
                        >
                          Category
                        </Link>
                        {entry.code ? (
                          <Link
                            href={`/verify/${entry.code}`}
                            className="palma-label text-olive hover:text-ink transition-colors"
                          >
                            Verify
                          </Link>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <p className="text-taupe-deep mt-8 text-sm leading-relaxed">
                Every honour above is backed by a permanent verification record issued at the time
                it was conferred. PALMA does not publish judging scores, and never will.
              </p>
            </div>

            <aside className="flex flex-col gap-8 lg:col-span-4">
              {wins.length > 0 ? (
                <div className="border-stone-deep bg-ivory-bright flex flex-col items-center gap-6 border p-8 text-center">
                  <PalmaSeal
                    legend={`PALMA ${wins[0]!.year}`}
                    sublegend="THE CREATOR HONOURS"
                    centre="Winner"
                    className="text-olive h-40 w-40"
                  />
                  {/* The seal counts wins. Calling them "honours" here while the
                      record beside it counts finalist places too made the same
                      page say two different numbers for one word. */}
                  <p className="font-display text-xl leading-snug">
                    {wins.length} PALMA {pluralise(wins.length, 'win')}
                  </p>
                  <p className="text-taupe-deep text-sm leading-relaxed">
                    {wins.map((entry) => `${entry.categoryName} — ${entry.year}`).join(' · ')}
                  </p>
                </div>
              ) : null}

              <div className="border-stone-deep flex flex-col gap-4 border p-7">
                <h2 className="palma-label text-taupe-deep">Share this record</h2>
                <p className="text-taupe-deep text-sm leading-relaxed">
                  The PALMA record is public and permanent. Copy the link to cite it in a press kit,
                  a profile or a pitch.
                </p>
                <div className="flex flex-wrap gap-2">
                  <CopyLink value={profileUrl} label="Copy profile link" />
                  {active[0]?.code ? (
                    <CopyLink
                      value={absoluteUrl(`/verify/${active[0].code}`)}
                      label="Copy verification link"
                    />
                  ) : null}
                </div>
              </div>

              {/* A record exists before its creator has an account. This is the
                  only route by which the two are ever joined — and it opens a
                  request, not a door. */}
              {creator.isClaimed ? (
                <div className="border-stone-deep flex flex-col gap-3 border p-7">
                  <h2 className="palma-label text-olive">Claimed record</h2>
                  <p className="text-taupe-deep text-sm leading-relaxed">
                    This creator holds their PALMA record and maintains how they are described here.
                    The honours, and the record of how they were reached, remain PALMA&rsquo;s.
                  </p>
                </div>
              ) : (
                <div className="border-stone-deep flex flex-col gap-3 border p-7">
                  <h2 className="palma-label text-taupe-deep">Is this you?</h2>
                  <p className="text-taupe-deep text-sm leading-relaxed">
                    PALMA wrote this record when {creator.displayName} was first nominated. Claim it
                    to manage how you are described — PALMA reviews every claim by hand before the
                    record is treated as yours.
                  </p>
                  <Button asChild size="sm" variant="outline" className="mt-1 self-start">
                    <Link href={`/creator/claim?creator=${creator.slug}`}>Claim this profile</Link>
                  </Button>

                  {/* The other half of the same sentence. A record PALMA wrote
                      about somebody who never asked rests on legitimate
                      interests, and the person named may object — so the
                      objection is offered as plainly as the claim, rather than
                      buried in a privacy notice they would have to go and
                      find. */}
                  <div className="border-stone-deep/60 mt-4 border-t pt-4">
                    <p className="text-taupe text-xs leading-relaxed">
                      It is you, and you would rather not be here? PALMA wrote this record without
                      asking, and you can have it taken down —{' '}
                      <Link
                        href={`/creators/${creator.slug}/object`}
                        className="palma-link text-taupe-deep"
                      >
                        ask PALMA to remove it
                      </Link>
                      . No account, no reason needed.
                    </p>
                  </div>
                </div>
              )}
            </aside>
          </div>
        </Container>
      </Section>

      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Creators', path: '/creators' },
            { name: creator.displayName, path: `/creators/${creator.slug}` },
          ]),
          ...wins.map((entry) =>
            awardJsonLd({
              creatorName: creator.displayName,
              creatorUrl: profileUrl,
              categoryName: entry.categoryName,
              year: entry.year,
              kind: 'Winner',
              code: entry.code,
            }),
          ),
        ]}
      />
    </>
  );
}
