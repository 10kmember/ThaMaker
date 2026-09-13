import { redirect } from 'next/navigation';
import { EntrancePanel } from '@/components/account/EntrancePanel';
import { buildMetadata } from '@/lib/seo';
import { getSession } from '@/lib/auth/session';
import { ENTRANCES, entranceForRole } from '@/lib/auth/entrances';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Administration',
  description: 'The entrance to the PALMA administration surface.',
  path: '/staff',
  noIndex: true,
});

export default async function StaffEntrancePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await getSession();
  if (session) redirect(entranceForRole(session.user.role).home);

  const { next } = await searchParams;

  return <EntrancePanel entrance={ENTRANCES.staff} next={next} />;
}
