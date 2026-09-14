import { Container, Section } from '@/components/palma/layout';
import { GazetteForm } from '@/components/palma/GazetteForm';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'The Gazette',
  description:
    'PALMA’s letter on the season — when nominations open, when the panel confers, and what the institution is thinking while it does.',
  path: '/gazette',
});

export default function GazettePage() {
  return (
    <Section className="py-20">
      <Container size="narrow">
        <div className="mx-auto flex max-w-140 flex-col gap-10">
          <div className="flex flex-col gap-5">
            <span className="palma-label text-champagne-deep">The Gazette</span>
            <h1 className="text-5xl leading-tight">PALMA’s letter on the season</h1>
            <p className="text-taupe-deep text-lg leading-relaxed">
              When nominations open and close, when a shortlist is read, when the panel confers —
              and what the institution is thinking while it does.
            </p>
          </div>

          <div className="border-stone-deep border-y py-9">
            <GazetteForm source="gazette" />
          </div>

          <div className="flex flex-col gap-6">
            <div>
              <h2 className="palma-label text-taupe-deep mb-3">How often</h2>
              <p className="text-taupe-deep leading-relaxed">
                When there is something to say. A handful of times a season, not weekly, and never
                because a schedule said so.
              </p>
            </div>

            <div>
              <h2 className="palma-label text-taupe-deep mb-3">What it will never be</h2>
              <p className="text-taupe-deep leading-relaxed">
                A leaderboard, a plea for nominations, or a way for a sponsor to reach you. PALMA
                does not publish nomination counts, and sponsorship buys no part of this letter.
              </p>
            </div>

            <div>
              <h2 className="palma-label text-taupe-deep mb-3">Leaving</h2>
              <p className="text-taupe-deep leading-relaxed">
                One click in any issue. No sign-in, no confirmation screen, no survey about why.
                Your address is then marked unsubscribed rather than kept warm.
              </p>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
