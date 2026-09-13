import Link from 'next/link';
import { Container, PageHeader, Section } from '@/components/palma/layout';
import { Notice } from '@/components/ui/feedback';
import { Button } from '@/components/ui/button';
import { buildMetadata } from '@/lib/seo';
import { PROHIBITED_CONTENT } from '@/domain/content-policy';

export const metadata = buildMetadata({
  title: 'Content policy',
  description:
    'What PALMA permits, what it prohibits, and why evidence points at a creator’s work rather than republishing it.',
  path: '/about/policy',
});

export default function PolicyPage() {
  return (
    <>
      <PageHeader
        label="The Creator Honours"
        title="Content policy"
        standfirst="PALMA recognises achievement. It hosts no creator work, and brokers nothing."
      />

      <Section>
        <Container size="narrow">
          <div className="palma-prose">
            <p>
              PALMA is a record of professional achievement. Its public pages are suitable for every
              audience, and stay that way by design: there is no upload path for creator work, no
              feed, and no commentary.
            </p>

            <h2 className="mt-12 mb-4 text-3xl">Evidence: point, do not publish</h2>
            <p>
              A nomination carries references — links, credits, published outcomes — which
              authorised judges review on the platform where the work already lives. PALMA does not
              copy, mirror or display that work. Evidence links are never shown on the public site.
            </p>
            <p>
              This is partly a legal position and mostly an editorial one. An institution that
              recognises work does not need to republish it, and the moment it does, it takes on the
              obligations of a platform and loses the detachment that makes its judgement worth
              anything.
            </p>

            <h2 className="mt-12 mb-4 text-3xl">Age and eligibility</h2>
            <p>
              Every PALMA creator must be 18 or over. Age and identity assurance is carried out by a
              specialist third-party provider. PALMA stores only the verification status, the
              provider’s reference and the date — never an identity document, and never anything
              that is shown publicly.
            </p>

            <h2 className="mt-12 mb-4 text-3xl">Prohibited</h2>
          </div>

          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {PROHIBITED_CONTENT.map((item) => (
              <li
                key={item}
                className="border-stone-deep text-taupe-deep border px-5 py-4 text-sm leading-relaxed"
              >
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </li>
            ))}
          </ul>

          <div className="palma-prose mt-14">
            <h2 className="mb-4 text-3xl">Integrity</h2>
            <p>
              Nominations are rate-limited, screened for automation, and reviewed by a person before
              they reach a judge. Fabricated achievements, impersonation and coordinated nomination
              campaigns end a nomination and may end a creator’s eligibility. Popularity is not
              judging, and PALMA will not let it become judging by the back door.
            </p>

            <h2 className="mt-12 mb-4 text-3xl">Revocation</h2>
            <p>
              PALMA can revoke an honour. When it does, nothing is deleted: the honour, its record
              and its verification page all remain and read <em>revoked</em>. An institution that
              quietly erases its mistakes cannot be trusted about its successes.
            </p>
          </div>

          <Notice className="mt-12" tone="ceremonial" title="Reporting a concern">
            If you believe someone is presenting a PALMA they do not hold, or that content on PALMA
            breaches this policy, tell us.
          </Notice>

          <div className="mt-6">
            <Button asChild size="sm" variant="outline">
              <Link href="/report">Report a concern</Link>
            </Button>
          </div>
        </Container>
      </Section>
    </>
  );
}
