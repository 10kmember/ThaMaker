import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { EmptyState, Notice } from '@/components/ui/feedback';
import { ReviewForm } from '@/components/admin/AdminForms';
import { buildMetadata } from '@/lib/seo';
import { requirePermission } from '@/lib/auth/guards';
import { listAdminCandidacies } from '@/server/data/admin';
import { formatShortDate } from '@/lib/format';
import { titleCase } from '@/lib/utils';
import { cn } from '@/lib/utils';

export const metadata = buildMetadata({
  title: 'Nominations',
  description: 'Review PALMA nominations.',
  path: '/admin/nominations',
  noIndex: true,
});

const STATUSES = ['under_review', 'eligible', 'ineligible', 'shortlisted', 'finalist', 'winner'];

export default async function AdminNominationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; flagged?: string }>;
}) {
  await requirePermission('admin:review_nominations', '/admin/nominations');
  const { status, flagged } = await searchParams;
  const candidacies = await listAdminCandidacies({ status, flagged: flagged === '1' });

  return (
    <>
      <div className="mb-8 flex flex-col gap-3">
        <span className="palma-label text-taupe-deep">Awards</span>
        <h1 className="text-4xl">Nominations</h1>
        <p className="text-taupe-deep max-w-160 leading-relaxed">
          Screening: eligibility, duplicate detection and integrity. Every candidacy here is
          reviewed by a person before a judge ever sees it.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/admin/nominations"
          className={cn(
            'palma-chip palma-label rounded-full border px-3.5 py-2',
            !status ? 'border-ink bg-ink text-ivory' : 'border-stone-deep text-taupe-deep',
          )}
        >
          All
        </Link>
        <Link
          href="/admin/nominations?flagged=1"
          className={cn(
            'palma-chip palma-label rounded-full border px-3.5 py-2',
            flagged === '1' ? 'border-ink bg-ink text-ivory' : 'border-stone-deep text-taupe-deep',
          )}
        >
          Flagged
        </Link>
        {STATUSES.map((entry) => (
          <Link
            key={entry}
            href={`/admin/nominations?status=${entry}`}
            className={cn(
              'palma-chip palma-label rounded-full border px-3.5 py-2',
              status === entry
                ? 'border-ink bg-ink text-ivory'
                : 'border-stone-deep text-taupe-deep',
            )}
          >
            {titleCase(entry)}
          </Link>
        ))}
      </div>

      <Notice className="mt-8" title="What the count is for">
        Nomination numbers tell PALMA where the audience is pointing. They are an input to discovery
        and to integrity screening — nothing in the judging path reads them, judges never see them,
        and they are never published.
      </Notice>

      {candidacies.length === 0 ? (
        <EmptyState
          className="mt-10"
          title="Nothing here"
          description="No candidacies match that filter."
        />
      ) : (
        <ul className="mt-10 flex flex-col gap-5">
          {candidacies.map((candidacy) => (
            <li key={candidacy.id} className="border-stone-deep bg-ivory-bright border p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex flex-col gap-2">
                  <span className="text-taupe-deep font-mono text-xs tracking-wider">
                    {candidacy.reference}
                  </span>
                  <Link
                    href={`/creators/${candidacy.creatorSlug}`}
                    className="font-display hover:text-olive text-2xl"
                  >
                    {candidacy.creatorName}
                  </Link>
                  <span className="palma-label text-taupe-deep">{candidacy.categoryName}</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={candidacy.status === 'winner' ? 'champagne' : 'default'}>
                    {titleCase(candidacy.status)}
                  </Badge>
                  <Badge variant={candidacy.verificationStatus === 'verified' ? 'olive' : 'muted'}>
                    {titleCase(candidacy.verificationStatus)}
                  </Badge>
                  {candidacy.integrityFlag ? (
                    <Badge variant="muted" className="text-red-900">
                      Flagged for review
                    </Badge>
                  ) : null}
                </div>
              </div>

              <dl className="text-taupe-deep mt-5 flex flex-wrap gap-x-10 gap-y-2 text-sm">
                <div className="flex gap-2">
                  <dt className="palma-label">Nominations</dt>
                  <dd>{candidacy.nominationCount}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="palma-label">Via creator link</dt>
                  <dd>{candidacy.referralShare}%</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="palma-label">Evidence</dt>
                  <dd>{candidacy.evidenceCount}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="palma-label">First</dt>
                  <dd>{formatShortDate(candidacy.firstNominatedAt)}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="palma-label">Latest</dt>
                  <dd>{formatShortDate(candidacy.lastNominatedAt)}</dd>
                </div>
              </dl>

              {candidacy.integrityNote ? (
                <p className="mt-4 text-sm leading-relaxed text-red-900">
                  {candidacy.integrityNote}
                </p>
              ) : null}

              <div className="border-stone-deep mt-6 border-t pt-5">
                <ReviewForm candidacyId={candidacy.id} status={candidacy.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
