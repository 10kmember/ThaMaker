import Link from 'next/link';
import { Container, Section } from '@/components/palma/layout';
import { Notice } from '@/components/ui/feedback';
import { buildMetadata } from '@/lib/seo';
import { leaveGazette } from '@/server/actions/gazette';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Left the Gazette',
  description: 'Leave the PALMA Gazette.',
  path: '/gazette',
  noIndex: true,
});

/**
 * Leaving happens on load, deliberately.
 *
 * No confirmation screen and no "are you sure": a reader who clicked
 * unsubscribe has already decided, and the extra step is how a mailing list
 * gets reported as spam instead.
 */
export default async function LeaveGazettePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await leaveGazette(token);

  return (
    <Section className="py-20">
      <Container size="narrow">
        <div className="mx-auto flex max-w-120 flex-col gap-8">
          <span className="palma-label text-taupe-deep">The Gazette</span>
          <h1 className="text-4xl leading-tight">
            {result.ok ? 'Done. You will not hear from us again.' : 'That link is not valid.'}
          </h1>

          {result.ok ? (
            <p className="text-taupe-deep leading-relaxed">
              {result.email} has been removed from the Gazette. Nothing else changes: if you hold a
              PALMA record, decisions about it still reach you, because those are not a newsletter.
            </p>
          ) : (
            <Notice tone="warning" title="Nothing has changed">
              We could not match that link to a subscription. If you are still receiving the
              Gazette, reply to any issue and a person will remove you by hand.
            </Notice>
          )}

          <Link href="/" className="palma-link text-ink self-start">
            Back to PALMA
          </Link>
        </div>
      </Container>
    </Section>
  );
}
