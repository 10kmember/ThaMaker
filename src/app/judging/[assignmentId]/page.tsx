import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import { PortalShell } from '@/components/palma/PortalShell';
import { ScoreForm } from '@/components/judging/ScoreForm';
import { Notice } from '@/components/ui/feedback';
import { buildMetadata } from '@/lib/seo';
import { requirePermission } from '@/lib/auth/guards';
import { getAssignmentForJudge } from '@/server/data/judging';
import { countryName } from '@/lib/format';
import { titleCase } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Judging',
  description: 'Score a PALMA nomination.',
  path: '/judging',
  noIndex: true,
});

type Params = { params: Promise<{ assignmentId: string }> };

export default async function AssignmentPage({ params }: Params) {
  const { assignmentId } = await params;
  const session = await requirePermission('judging:submit_score', `/judging/${assignmentId}`);
  if (!session.user.judgeId) notFound();

  const assignment = await getAssignmentForJudge(assignmentId, session.user.judgeId);
  if (!assignment) notFound();

  return (
    <PortalShell
      title="PALMA Judging"
      subtitle={assignment.creatorName}
      userName={session.user.name}
    >
      <Link href="/judging" className="palma-label text-taupe-deep hover:text-ink">
        ← All assignments
      </Link>

      <div className="mt-10 grid gap-14 lg:grid-cols-12">
        <div className="flex flex-col gap-10 lg:col-span-7">
          <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
            <div className="border-stone-deep flex flex-col gap-1.5 border-t pt-4">
              <dt className="palma-label text-taupe-deep">Reference</dt>
              <dd className="font-mono text-sm tracking-wider">{assignment.reference}</dd>
            </div>
            <div className="border-stone-deep flex flex-col gap-1.5 border-t pt-4">
              <dt className="palma-label text-taupe-deep">Category</dt>
              <dd className="font-display text-lg">{assignment.categoryName}</dd>
            </div>
            <div className="border-stone-deep flex flex-col gap-1.5 border-t pt-4">
              <dt className="palma-label text-taupe-deep">Creator</dt>
              <dd className="font-display text-lg">{assignment.creatorName}</dd>
            </div>
            <div className="border-stone-deep flex flex-col gap-1.5 border-t pt-4">
              <dt className="palma-label text-taupe-deep">Country</dt>
              <dd className="font-display text-lg">{countryName(assignment.creatorCountry)}</dd>
            </div>
          </dl>

          {assignment.audienceVoices.length > 0 ? (
            <section className="flex flex-col gap-4">
              <h2 className="palma-label text-taupe-deep">What the audience said</h2>
              <Notice>
                A sample of the reasons given when this creator was nominated. PALMA does not tell
                you how many nominations there were, and does not want you to weigh it: popularity
                brings a creator to our attention, and stops there.
              </Notice>
              <ul className="flex flex-col gap-3">
                {assignment.audienceVoices.map((voice, index) => (
                  <li
                    key={index}
                    className="border-stone-deep text-ink/85 border-l-2 pl-5 text-sm leading-relaxed"
                  >
                    “{voice}”
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="flex flex-col gap-4">
            <h2 className="palma-label text-taupe-deep">External evidence</h2>
            <Notice>
              Evidence opens on the platform where the work lives. PALMA does not host it, and
              nothing here is published on the public site.
            </Notice>
            <ul className="flex flex-col gap-3">
              {assignment.evidence.map((item) => (
                <li key={item.id} className="border-stone-deep border p-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <span className="font-display text-lg">{item.label}</span>
                    <span className="palma-label text-taupe">{titleCase(item.kind)}</span>
                  </div>
                  {item.url ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="text-olive palma-link mt-2 inline-flex items-center gap-2 text-sm break-all"
                    >
                      {item.url}
                      <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
                    </a>
                  ) : null}
                  {item.note ? <p className="text-taupe-deep mt-2 text-sm">{item.note}</p> : null}
                </li>
              ))}
            </ul>
          </section>

          <section className="border-stone-deep flex flex-col gap-3 border-t pt-8">
            <h2 className="palma-label text-taupe-deep">Category eligibility</h2>
            <p className="text-taupe-deep text-sm leading-relaxed">
              {assignment.categoryEligibility}
            </p>
            <h2 className="palma-label text-taupe-deep mt-4">Judging guidance</h2>
            <p className="text-taupe-deep text-sm leading-relaxed">{assignment.categoryCriteria}</p>
          </section>
        </div>

        <div className="lg:col-span-5">
          <ScoreForm
            assignmentId={assignment.id}
            candidacyId={assignment.candidacyId}
            alreadyScored={assignment.alreadyScored}
          />
        </div>
      </div>
    </PortalShell>
  );
}
