import Link from 'next/link';
import { Container, Section } from '@/components/palma/layout';
import { Notice } from '@/components/ui/feedback';
import { Button } from '@/components/ui/button';
import { buildMetadata } from '@/lib/seo';
import { confirmGazette } from '@/server/actions/gazette';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Gazette confirmed',
  description: 'Confirm your PALMA Gazette subscription.',
  path: '/gazette',
  noIndex: true,
});

export default async function ConfirmGazettePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await confirmGazette(token);

  return (
    <Section className="py-20">
      <Container size="narrow">
        <div className="mx-auto flex max-w-120 flex-col gap-8">
          {result.ok ? (
            <>
              <span className="palma-label text-champagne-deep">The Gazette</span>
              <h1 className="text-4xl leading-tight">You are on the list.</h1>
              <p className="text-taupe-deep leading-relaxed">
                {result.email} is confirmed. The Gazette comes when there is something to say, and
                every issue carries a one-click way out.
              </p>
              <Button asChild className="self-start">
                <Link href="/journal">Read the Journal</Link>
              </Button>
            </>
          ) : (
            <>
              <h1 className="text-4xl leading-tight">That link is not valid.</h1>
              <Notice tone="warning" title="Nothing has changed">
                A confirmation link is replaced whenever the address is entered again, so this one
                may simply be an older copy. Enter your address on{' '}
                <Link href="/gazette" className="palma-link text-ink">
                  the Gazette page
                </Link>{' '}
                and we will send a fresh one.
              </Notice>
            </>
          )}
        </div>
      </Container>
    </Section>
  );
}
