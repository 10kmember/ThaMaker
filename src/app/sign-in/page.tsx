import { redirect } from 'next/navigation';
import { EntrancePanel } from '@/components/account/EntrancePanel';
import { buildMetadata } from '@/lib/seo';
import { getSession } from '@/lib/auth/session';
import { ENTRANCES, homeForRole } from '@/lib/auth/entrances';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Creator sign in',
  description: 'Sign in to the PALMA creator portal.',
  path: '/sign-in',
  noIndex: true,
});

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await getSession();
  if (session) redirect(homeForRole(session.user.role));

  const { next } = await searchParams;

  return <EntrancePanel entrance={ENTRANCES.creator} next={next} />;
}
