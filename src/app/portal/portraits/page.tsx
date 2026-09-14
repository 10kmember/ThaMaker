import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { EmptyState, Notice } from '@/components/ui/feedback';
import { PortraitReviewForm } from '@/components/operations/PortraitReviewForm';
import { buildMetadata } from '@/lib/seo';
import { requirePermission } from '@/lib/auth/guards';
import { prisma } from '@/server/db';
import { formatShortDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Portraits',
  description: 'Portraits waiting to be published on a PALMA record.',
  path: '/portal/portraits',
  noIndex: true,
});

/**
 * The portrait queue.
 *
 * PALMA hosts no explicit imagery, and an upload is the only route by which
 * any would arrive — so a person looks at every one before it is public. The
 * pending image is rendered from its bytes here and nowhere else: the public
 * route serves approved portraits only.
 */
export default async function PortraitsPage() {
  await requirePermission('editorial:edit_creator', '/portal/portraits');

  const [pending, recent] = await Promise.all([
    prisma.creatorPortrait.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' },
      include: { creator: { select: { slug: true, displayName: true, countryCode: true } } },
    }),
    prisma.creatorPortrait.findMany({
      where: { status: { not: 'pending' } },
      orderBy: { reviewedAt: 'desc' },
      take: 15,
      include: { creator: { select: { slug: true, displayName: true } } },
    }),
  ]);

  return (
    <>
      <div className="flex flex-col gap-3">
        <span className="palma-label text-taupe-deep">The record</span>
        <h1 className="text-4xl">Portraits</h1>
        <p className="text-taupe-deep max-w-160 leading-relaxed">
          Every portrait is looked at before it appears. PALMA hosts no explicit imagery and this is
          the only route by which any could arrive.
        </p>
      </div>

      <Notice className="mt-8" title="What you are deciding">
        Whether this image belongs on a public institutional record: a person, recognisable,
        suitable for every audience. Not whether it is a good photograph. Refuse anything explicit,
        anything that is plainly not the creator, and anything carrying a logo, a price or a
        promotion — a portrait is not an advertisement.
      </Notice>

      <section className="mt-14">
        <h2 className="palma-label text-taupe-deep mb-6">
          Waiting {pending.length > 0 ? `· ${pending.length}` : ''}
        </h2>

        {pending.length === 0 ? (
          <EmptyState
            title="Nothing waiting"
            description="A portrait appears here the moment a creator submits one."
          />
        ) : (
          <ul className="grid gap-10 lg:grid-cols-2">
            {pending.map((portrait) => (
              <li key={portrait.id} className="border-stone-deep flex flex-col gap-5 border p-6">
                <div className="flex flex-wrap items-start gap-5">
                  {/* Rendered inline from the pending bytes, which are not
                      served publicly and so cannot be optimised by a loader.
                      eslint-disable-next-line @next/next/no-img-element */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`data:${portrait.contentType};base64,${Buffer.from(portrait.data).toString('base64')}`}
                    alt={portrait.alt ?? `Portrait submitted by ${portrait.creator.displayName}`}
                    className="border-stone-deep size-32 shrink-0 border object-cover"
                  />
                  <div className="flex min-w-0 flex-col gap-2">
                    <Link
                      href={`/portal/creators/${portrait.creator.slug}`}
                      className="font-display hover:text-olive text-xl transition-colors"
                    >
                      {portrait.creator.displayName}
                    </Link>
                    <span className="palma-label text-taupe-deep">
                      {portrait.width}×{portrait.height} · {Math.round(portrait.byteSize / 1024)}KB
                    </span>
                    <span className="palma-label text-taupe">
                      Submitted {formatShortDate(portrait.createdAt.toISOString())}
                    </span>
                  </div>
                </div>

                <div className="border-stone-deep/60 border-t pt-4">
                  <span className="palma-label text-taupe-deep">Their description</span>
                  <p className="text-taupe-deep mt-2 text-sm leading-relaxed">
                    {portrait.alt ?? <span className="text-taupe">None given.</span>}
                  </p>
                </div>

                <PortraitReviewForm portraitId={portrait.id} name={portrait.creator.displayName} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {recent.length > 0 ? (
        <section className="mt-16">
          <h2 className="palma-label text-taupe-deep mb-6">Settled</h2>
          <ul className="flex flex-col">
            {recent.map((portrait) => (
              <li
                key={portrait.id}
                className="border-stone-deep/60 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b py-4"
              >
                <span className="font-display text-base">{portrait.creator.displayName}</span>
                <span className="flex flex-wrap items-center gap-3">
                  <Badge variant={portrait.status === 'approved' ? 'olive' : 'muted'}>
                    {portrait.status === 'approved' ? 'Published' : 'Refused'}
                  </Badge>
                  <span className="palma-label text-taupe">
                    {portrait.reviewedAt ? formatShortDate(portrait.reviewedAt.toISOString()) : ''}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
