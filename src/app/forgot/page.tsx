import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Container, Section } from '@/components/palma/layout';
import { Wordmark } from '@/components/brand/Wordmark';
import { ForgotPasswordForm } from '@/components/account/AuthForms';
import { buildMetadata } from '@/lib/seo';
import { getSession } from '@/lib/auth/session';
import { CONTACTS } from '@/lib/legal';

export const metadata = buildMetadata({
  title: 'Forgotten password',
  description: 'Ask PALMA for a link to set a new password.',
  path: '/forgot',
  noIndex: true,
});

export default async function ForgotPasswordPage() {
  const session = await getSession();
  if (session) redirect('/creator');

  return (
    <Section className="py-20">
      <Container size="narrow">
        <div className="mx-auto flex max-w-110 flex-col gap-10">
          <div className="flex flex-col gap-4">
            <Wordmark size="md" descriptor />
            <h1 className="text-4xl">Forgotten your password</h1>
            <p className="text-taupe-deep leading-relaxed">
              Give us the address on the account and we will send a link that sets a new password.
              It is valid for one hour and works once.
            </p>
          </div>

          <ForgotPasswordForm />

          <div className="border-stone-deep text-taupe-deep border-t pt-6 text-sm leading-relaxed">
            <p>
              PALMA will never ask you for your password, and nobody here can read it. If you no
              longer have access to the address on your account, write to{' '}
              <a href={`mailto:${CONTACTS.security}`} className="palma-link text-ink">
                {CONTACTS.security}
              </a>{' '}
              from wherever you can — a person will read it.
            </p>
            <p className="mt-4">
              This works for every kind of PALMA account.{' '}
              <Link href="/judge" className="palma-link text-ink">
                Judges
              </Link>{' '}
              and operators set a new password here and then sign in at their own path.
            </p>
          </div>
        </div>
      </Container>
    </Section>
  );
}
