import { headers } from 'next/headers';
import { AdminShell } from '@/components/admin/AdminShell';
import { roleSurface } from '@/components/account/RoleSurface';
import { ENTRANCES, housedAt } from '@/lib/auth/entrances';
import { ADMIN_NAV, MODERATION_NAV } from '@/lib/admin-nav';

export const dynamic = 'force-dynamic';

/**
 * The moderator's desk.
 *
 * Its own surface rather than a narrower view of the administrator's: the two
 * jobs are different, and a dashboard that is mostly things you cannot open is
 * worse than a short one that is entirely yours.
 *
 * An administrator is admitted here too, because their own sidebar links
 * straight at these queues and they hold every permission the pages need. They
 * keep their own furniture while they are here: the same pages, not a second
 * copy of them, and not a sidebar that strands them with no way back to /admin.
 */
export default async function ModerationLayout({ children }: { children: React.ReactNode }) {
  const { session, panel } = await roleSurface(ENTRANCES.moderator);
  if (!session) return panel;

  const activeHref = (await headers()).get('x-palma-pathname') ?? '/portal';
  const isModerator = housedAt(ENTRANCES.moderator, session.user.role);

  return (
    <AdminShell
      role={session.user.role}
      userName={session.user.email}
      activeHref={activeHref}
      title={isModerator ? 'Moderation' : 'Administration'}
      nav={isModerator ? MODERATION_NAV : ADMIN_NAV}
    >
      {children}
    </AdminShell>
  );
}
