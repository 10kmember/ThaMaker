import { Container, PageHeader, Section } from '@/components/palma/layout';
import { Notice } from '@/components/ui/feedback';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Privacy',
  description: 'What PALMA stores, why, and what it deliberately does not store.',
  path: '/legal/privacy',
});

export default function PrivacyPage() {
  return (
    <>
      <PageHeader
        label="Legal"
        title="Privacy"
        standfirst="What PALMA stores, why it stores it, and the things it has deliberately chosen not to hold."
        tone="ivory"
      />

      <Section className="pt-8">
        <Container size="narrow">
          <Notice tone="warning" title="Draft">
            This page sets out PALMA’s intended data practices. It must be reviewed and completed by
            UK counsel before launch, alongside the terms.
          </Notice>

          <div className="palma-prose mt-12">
            <p>
              PALMA holds the minimum it needs to run an awards season and keep a permanent record
              of its outcomes. Two categories of information sit at opposite ends of that: honours,
              which are public and permanent by design, and everything else, which is operational
              and kept only as long as it is needed.
            </p>

            <h2 className="mt-12 mb-4 text-3xl">What is public</h2>
            <p>
              A creator’s name, country, headline, biography, links and the honours they hold. These
              are the record. An honour, once conferred, is intended to remain publicly verifiable
              indefinitely — that permanence is the point of the institution.
            </p>

            <h2 className="mt-12 mb-4 text-3xl">What is never public</h2>
            <p>
              Judging scores, panel remarks, nomination evidence, nominator contact details,
              verification data, reports, and everything in the audit log.
            </p>

            <h2 className="mt-12 mb-4 text-3xl">Identity documents</h2>
            <p>
              PALMA does not receive or store identity documents. Age and identity assurance is
              performed by a specialist third-party provider; PALMA records only the status, the
              provider’s reference and the date.
            </p>

            <h2 className="mt-12 mb-4 text-3xl">IP addresses</h2>
            <p>
              IP addresses are not stored. Where an address is needed for abuse detection or audit,
              a salted one-way digest is stored instead, and the address itself is discarded.
            </p>

            <h2 className="mt-12 mb-4 text-3xl">Your rights</h2>
            <p>
              Under UK GDPR you may request access to the personal data PALMA holds about you, ask
              for corrections, and object to certain processing. Requests about the public record of
              a conferred honour are considered against PALMA’s legitimate interest in maintaining
              an accurate, permanent archive.
            </p>
          </div>
        </Container>
      </Section>
    </>
  );
}
