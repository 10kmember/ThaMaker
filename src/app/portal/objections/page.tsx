import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { EmptyState, Notice } from '@/components/ui/feedback';
import { ObjectionDecisionForm } from '@/components/operations/ObjectionDecisionForm';
import { buildMetadata } from '@/lib/seo';
import { requirePermission } from '@/lib/auth/guards';
import { prisma } from '@/server/db';
import { formatShortDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Objections',
  description: 'People asking not to be in the PALMA archive.',
  path: '/portal/objections',
  noIndex: true,
});

/**
 * The queue nobody wants to have, and every archive needs.
 *
 * PALMA writes records about people who never asked. The balance that makes
 * that lawful holds only while somebody reads this page and acts on it, so it
 * sits in the moderation desk beside the claims rather than in an inbox.
 */
export default async function ObjectionsPage() {
  await requirePermission('creators:view_records', '/portal/objections');

  const [open, settled] = await Promise.all([
    prisma.recordObjection.findMany({
      where: { status: 'received' },
      orderBy: { createdAt: 'asc' },
      include: {
        creator: {
          select: {
            slug: true,
            displayName: true,
            countryCode: true,
            createdAt: true,
            links: { select: { id: true, label: true, url: true } },
            honours: { select: { id: true }, where: { state: 'active' } },
            candidacies: { select: { id: true } },
          },
        },
      },
    }),
    prisma.recordObjection.findMany({
      where: { status: { not: 'received' } },
      orderBy: { decidedAt: 'desc' },
      take: 20,
      include: { creator: { select: { slug: true, displayName: true } } },
    }),
  ]);

  return (
    <>
      <div className="flex flex-col gap-3">
        <span className="palma-label text-taupe-deep">The record</span>
        <h1 className="text-4xl">Objections</h1>
        <p className="text-taupe-deep max-w-160 leading-relaxed">
          People asking not to be in an archive they never joined. PALMA writes records about
          creators before they agree to anything; the lawful basis for that is legitimate interests,
          and it holds only because this page exists and somebody works it.
        </p>
      </div>

      <Notice className="mt-8" title="The default answer is yes">
        For an unclaimed record with no honour on it, uphold the objection. It is somebody
        exercising a right, not a negotiation, and PALMA has no institutional interest in a record
        of somebody who does not want one. Refuse only where an honour has been conferred — and even
        then, the record is reduced to the achievement rather than kept whole.
      </Notice>

      <section className="mt-14">
        <h2 className="palma-label text-taupe-deep mb-6">
          Waiting {open.length > 0 ? `· ${open.length}` : ''}
        </h2>

        {open.length === 0 ? (
          <EmptyState
            title="Nothing waiting"
            description="Objections appear here the moment somebody asks to be removed from the archive."
          />
        ) : (
          <ul className="flex flex-col gap-10">
            {open.map((objection) => {
              const hasHonours = objection.creator.honours.length > 0;

              return (
                <li key={objection.id} className="border-stone-deep border p-7">
                  <div className="flex flex-wrap items-baseline justify-between gap-4">
                    <div className="flex min-w-0 flex-col gap-1">
                      <Link
                        href={`/portal/creators/${objection.creator.slug}`}
                        className="font-display hover:text-olive text-2xl transition-colors"
                      >
                        {objection.creator.displayName}
                      </Link>
                      <span className="palma-label text-taupe-deep">
                        Objected {formatShortDate(objection.createdAt.toISOString())} · record
                        written {formatShortDate(objection.creator.createdAt.toISOString())}
                      </span>
                    </div>
                    {hasHonours ? (
                      <Badge variant="champagne">Holds an honour</Badge>
                    ) : (
                      <Badge variant="muted">No honour conferred</Badge>
                    )}
                  </div>

                  <dl className="border-stone-deep mt-6 grid gap-x-8 gap-y-4 border-y py-5 sm:grid-cols-3">
                    <div className="flex min-w-0 flex-col gap-1">
                      <dt className="palma-label text-taupe-deep">Country</dt>
                      <dd className="text-sm">{objection.creator.countryCode}</dd>
                    </div>
                    <div className="flex min-w-0 flex-col gap-1">
                      <dt className="palma-label text-taupe-deep">Links held</dt>
                      <dd className="text-sm">{objection.creator.links.length}</dd>
                    </div>
                    <div className="flex min-w-0 flex-col gap-1">
                      <dt className="palma-label text-taupe-deep">Candidacies</dt>
                      <dd className="text-sm">{objection.creator.candidacies.length}</dd>
                    </div>
                  </dl>

                  <div className="mt-6 flex flex-col gap-2">
                    <span className="palma-label text-taupe-deep">Reply to</span>
                    <a
                      href={`mailto:${objection.contactEmail}`}
                      className="palma-link text-ink text-sm break-all"
                    >
                      {objection.contactEmail}
                    </a>
                  </div>

                  {objection.note ? (
                    <div className="border-stone-deep/60 mt-6 border-l-2 pl-5">
                      <span className="palma-label text-taupe-deep">What they said</span>
                      <p className="text-taupe-deep mt-2 text-sm leading-relaxed">
                        {objection.note}
                      </p>
                    </div>
                  ) : (
                    <p className="text-taupe mt-6 text-xs leading-relaxed">
                      No reason given — none is required, and asking for one is not a condition of
                      acting.
                    </p>
                  )}

                  <div className="border-stone-deep mt-7 border-t pt-7">
                    <ObjectionDecisionForm
                      objectionId={objection.id}
                      name={objection.creator.displayName}
                      hasHonours={hasHonours}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {settled.length > 0 ? (
        <section className="mt-16">
          <h2 className="palma-label text-taupe-deep mb-6">Settled</h2>
          <ul className="flex flex-col">
            {settled.map((objection) => (
              <li
                key={objection.id}
                className="border-stone-deep/60 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b py-4"
              >
                <span className="font-display text-base">{objection.creator.displayName}</span>
                <span className="flex flex-wrap items-center gap-3">
                  <Badge variant={objection.status === 'upheld' ? 'olive' : 'muted'}>
                    {objection.status === 'upheld' ? 'Record removed' : 'Refused'}
                  </Badge>
                  <span className="palma-label text-taupe">
                    {objection.decidedAt ? formatShortDate(objection.decidedAt.toISOString()) : ''}
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
