import { Container, Section } from '@/components/palma/layout';
import { Masthead } from '@/components/palma/Masthead';
import { Notice } from '@/components/ui/feedback';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Terms',
  description: 'The terms on which PALMA accepts nominations and confers honours.',
  path: '/legal/terms',
});

export default function TermsPage() {
  return (
    <>
      <Masthead
        eyebrow={'Legal'}
        title="Terms"
        standfirst="The terms on which PALMA accepts nominations, confers honours, and maintains the record."
        meta={['Draft — pending UK counsel']}
        tone={'ivory'}
        size="compact"
      />

      <Section className="pt-8">
        <Container size="narrow">
          <Notice tone="warning" title="Draft">
            This page sets out PALMA’s intended terms. It must be reviewed and completed by UK
            counsel before launch.
          </Notice>

          <div className="palma-prose mt-12">
            <h2 className="mb-4 text-3xl">Nominations</h2>
            <p>
              Nominating is free. A nomination is a claim about work already published, and must be
              evidenced. PALMA may refuse, withdraw or reject any nomination, and volume of
              nominations confers no advantage.
            </p>

            <h2 className="mt-12 mb-4 text-3xl">Honours</h2>
            <p>
              An honour is conferred by PALMA on the recommendation of its panel. It recognises work
              in a stated category and season, and says nothing beyond that. Recipients may state
              the honour they hold and use the PALMA mark to do so; they may not imply endorsement
              of anything else.
            </p>

            <h2 className="mt-12 mb-4 text-3xl">Revocation</h2>
            <p>
              PALMA may revoke an honour where it was obtained through fabricated evidence,
              impersonation or manipulation, or where the recipient’s conduct makes it untenable. A
              revoked honour remains on the record, marked revoked.
            </p>

            <h2 className="mt-12 mb-4 text-3xl">Sponsorship</h2>
            <p>
              Sponsorship is a commercial relationship with PALMA. It confers no influence over
              nominations, judging or outcomes, and no access to confidential judging material.
            </p>

            <h2 className="mt-12 mb-4 text-3xl">Eligibility</h2>
            <p>
              PALMA creators must be 18 or over and must complete verification before an honour is
              conferred. PALMA may decline to confer an honour on a creator who is suspended,
              unverified, or in breach of the content policy.
            </p>
          </div>
        </Container>
      </Section>
    </>
  );
}
