import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/feedback';
import { ReviewForm } from '@/components/admin/AdminForms';
import { buildMetadata } from '@/lib/seo';
import { requirePermission } from '@/lib/auth/guards';
import { listAdminNominations } from '@/server/data/admin';
import { formatShortDate } from '@/lib/format';
import { titleCase } from '@/lib/utils';
import { cn } from '@/lib/utils';

export const metadata = buildMetadata({
  title: 'Nominations',
  description: 'Review PALMA nominations.',
  path: '/admin/nominations',
  noIndex: true,
});

const STATUSES = ['under_review', 'eligible', 'ineligible', 'duplicate', 'finalist', 'winner'];

export default async function AdminNominationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requirePermission('admin:review_nominations', '/admin/nominations');
  const { status } = await searchParams;
  const nominations = await listAdminNominations({ status });

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/admin/nominations"
          className={cn(
            'palma-label rounded-full border px-3.5 py-2',
            !status ? 'border-ink bg-ink text-ivory' : 'border-stone-deep text-taupe-deep',
          )}
        >
          All
        </Link>
        {STATUSES.map((entry) => (
          <Link
            key={entry}
            href={`/admin/nominations?status=${entry}`}
            className={cn(
              'palma-label rounded-full border px-3.5 py-2',
              status === entry ? 'border-ink bg-ink text-ivory' : 'border-stone-deep text-taupe-deep',
            )}
          >
            {titleCase(entry)}
          </Link>
        ))}
      </div>

      {nominations.length === 0 ? (
        <EmptyState className="mt-10" title="Nothing here" description="No nominations match that filter." />
      ) : (
        <ul className="mt-10 flex flex-col gap-5">
          {nominations.map((nomination) => (
            <li key={nomination.id} className="border border-stone-deep bg-ivory-bright p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex flex-col gap-2">
                  <span className="font-mono text-xs tracking-wider text-taupe-deep">
                    {nomination.reference}
                  </span>
                  <Link
                    href={`/creators/${nomination.creatorSlug}`}
                    className="font-display text-2xl hover:text-olive"
                  >
                    {nomination.creatorName}
                  </Link>
                  <span className="palma-label text-taupe-deep">{nomination.categoryName}</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={nomination.status === 'winner' ? 'champagne' : 'default'}>
                    {titleCase(nomination.status)}
                  </Badge>
                  <Badge variant={nomination.verificationStatus === 'verified' ? 'olive' : 'muted'}>
                    {titleCase(nomination.verificationStatus)}
                  </Badge>
                  {nomination.integrityScore >= 30 ? (
                    <Badge variant="muted" className="text-red-900">
                      Integrity {nomination.integrityScore}
                    </Badge>
                  ) : null}
                </div>
              </div>

              <dl className="mt-5 flex flex-wrap gap-x-10 gap-y-2 text-sm text-taupe-deep">
                <div className="flex gap-2">
                  <dt className="palma-label">Source</dt>
                  <dd>{titleCase(nomination.source)}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="palma-label">Evidence</dt>
                  <dd>{nomination.evidenceCount}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="palma-label">Submitted</dt>
                  <dd>{formatShortDate(nomination.submittedAt)}</dd>
                </div>
              </dl>

              <div className="mt-6 border-t border-stone-deep pt-5">
                <ReviewForm nominationId={nomination.id} status={nomination.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
