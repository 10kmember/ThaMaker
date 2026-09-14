import { headers } from 'next/headers';
import { requirePermission } from '@/lib/auth/guards';
import { AdminShell } from '@/components/admin/AdminShell';
import { MODERATION_NAV } from '@/lib/admin-nav';

export const dynamic = 'force-dynamic';

/**
 * The moderator's dashboard.
 *
 * Its own surface rather than a narrower view of the administrator's: the two
 * jobs are different, and a dashboard that is mostly things you cannot open is
 * a worse dashboard than a short one that is entirely yours.
 */
export default async function ModerationLayout({ children }: { children: React.ReactNode }) {
  const session = await requirePermission('operations:view_dashboard', '/moderation');

  const headerList = await headers();
  const activeHref = headerList.get('x-palma-pathname') ?? '/moderation';

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
