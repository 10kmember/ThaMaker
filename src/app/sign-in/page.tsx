import { redirect } from 'next/navigation';
import { Container, Section } from '@/components/palma/layout';
import { Wordmark } from '@/components/brand/Wordmark';
import { SignInForm } from '@/components/account/AuthForms';
import { Notice } from '@/components/ui/feedback';
import { buildMetadata } from '@/lib/seo';
import { getSession } from '@/lib/auth/session';
import { isLive } from '@/lib/env';

export const metadata = buildMetadata({
  title: 'Sign in',
  description: 'Sign in to the PALMA creator, judge or administration portal.',
  path: '/sign-in',
  noIndex: true,
});

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await getSession();
  if (session) redirect('/portal');

  const { next } = await searchParams;

  return (
    <Section className="py-20">
      <Container size="narrow">
        <div className="mx-auto flex max-w-110 flex-col gap-10">
          <div className="flex flex-col gap-4">
            <Wordmark size="md" descriptor />
            <h1 className="text-4xl">Sign in</h1>
          </div>

          {isLive ? null : (
            <Notice tone="warning" title="Archive mode">
              PALMA is running from the bundled reference dataset with no database, so accounts are
              unavailable in this environment.
            </Notice>
          )}

          <SignInForm next={next} />
        </div>
      </Container>
    </Section>
  );
}
