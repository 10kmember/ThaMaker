import { headers } from 'next/headers';
import { AdminShell } from '@/components/admin/AdminShell';
import { roleSurface } from '@/components/account/RoleSurface';
import { ENTRANCES } from '@/lib/auth/entrances';
import { MODERATION_NAV } from '@/lib/admin-nav';

export const dynamic = 'force-dynamic';

/**
 * The moderator's desk.
 *
 * Its own surface rather than a narrower view of the administrator's: the two
 * jobs are different, and a dashboard that is mostly things you cannot open is
 * worse than a short one that is entirely yours.
 */
export default async function ModerationLayout({ children }: { children: React.ReactNode }) {
  const { session, panel } = await roleSurface(ENTRANCES.moderator);
  if (!session) return panel;

  const activeHref = (await headers()).get('x-palma-pathname') ?? '/creator';

  return (
    <AdminShell
      role={session.user.role}
      userName={session.user.email}
      activeHref={activeHref}
      title="Moderation"
      nav={MODERATION_NAV}
    >
      {children}
    </AdminShell>
  );
}
