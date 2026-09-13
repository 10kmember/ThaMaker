import { Container, PageHeader, Section } from '@/components/palma/layout';
import { Notice } from '@/components/ui/feedback';
import { buildMetadata } from '@/lib/seo';
import { SCORING_CRITERIA, MAX_TOTAL } from '@/domain/judging';
import { CONFLICT_KINDS } from '@/domain/conflicts';
import { MIN_JUDGES_PER_NOMINATION, DEFAULT_FINALIST_COUNT } from '@/domain/selection';

export const metadata = buildMetadata({
  title: 'How judging works',
  description:
    'The five PALMA judging criteria, how scores are aggregated, how conflicts are handled, and why scores are immutable.',
  path: '/about/judging',
});

export default function JudgingPage() {
  return (
    <>
      <PageHeader
        label="The Creator Honours"
        title="How judging works"
        standfirst="Published in full, because a judgement nobody can inspect is not worth holding."
      />

      <Section>
        <Container size="narrow">
          <div className="palma-prose">
            <p>
              Every eligible nomination is scored independently by at least{' '}
              {MIN_JUDGES_PER_NOMINATION} judges against five criteria, each out of ten — a maximum
              of {MAX_TOTAL}. Judges are briefed in writing to discount audience size. It is not a
              criterion, and it never will be.
            </p>
          </div>

          <ul className="mt-12 flex flex-col">
            {SCORING_CRITERIA.map((criterion, index) => (
              <li key={criterion.key} className="border-stone-deep flex gap-6 border-t py-6">
                <span className="palma-label text-taupe-deep pt-1.5">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className="flex flex-col gap-2">
                  <div className="flex items-baseline gap-4">
                    <h2 className="font-display text-2xl">{criterion.label}</h2>
                    <span className="palma-label text-taupe">/10</span>
                  </div>
                  <p className="text-taupe-deep leading-relaxed">{criterion.description}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="palma-prose mt-14">
            <h2 className="mb-4 text-3xl">Aggregation</h2>
            <p>
              Once four or more judges have scored a nomination, the highest and lowest scores are
              removed before ranking. Panels disagree, and a single outlier — enthusiastic or
              hostile — should not decide a PALMA. Where judges disagree sharply, the chair sees the
              spread before any list is confirmed.
            </p>
            <p>
              The top {DEFAULT_FINALIST_COUNT} eligible nominations in each category are proposed as
              finalists. The ranking is a recommendation: confirming it is a human act, performed by
              an authorised administrator, and written to the audit log with the state before and
              after.
            </p>

            <h2 className="mt-12 mb-4 text-3xl">Conflicts of interest</h2>
            <p>
              A judge declares a conflict; they do not argue one. The moment a relationship is
              declared, the judge is removed from that nomination. Only an explicit dismissal by an
              administrator restores them, and both acts are recorded. Judges declare against these
              categories:
            </p>
            <ul className="text-taupe-deep mb-8 list-disc pl-6">
              {CONFLICT_KINDS.map((kind) => (
                <li key={kind.key} className="mb-2">
                  {kind.label}
                </li>
              ))}
            </ul>

            <h2 className="mt-12 mb-4 text-3xl">Immutability</h2>
            <p>
              A submitted score cannot be changed by the judge who gave it. If a genuine error is
              found, an authorised administrator performs a controlled correction which preserves
              the original score, the corrected score, who changed it and why.
            </p>

            <h2 className="mt-12 mb-4 text-3xl">Sponsors</h2>
            <p>
              Sponsorship is a commercial relationship recorded against a season or a category. It
              confers no access to nominations, judges, scores or outcomes. This is enforced in the
              permission model, not by convention: sponsors hold no role in the system at all.
            </p>
          </div>

          <Notice className="mt-12" title="What is never published">
            Individual scores, panel deliberations, remarks to the chair and nomination evidence.
            PALMA publishes outcomes, not the arguments behind them.
          </Notice>
        </Container>
      </Section>
    </>
  );
}
