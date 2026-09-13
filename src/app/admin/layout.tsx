import { requirePermission } from '@/lib/auth/guards';
import { PortalShell, type PortalNavItem } from '@/components/palma/PortalShell';

export const dynamic = 'force-dynamic';

const NAV: PortalNavItem[] = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/nominations', label: 'Nominations' },
  { href: '/admin/judging', label: 'Judging' },
  { href: '/admin/selection', label: 'Finalists & winners' },
  { href: '/admin/moderation', label: 'Moderation' },
  { href: '/admin/audit', label: 'Audit log' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Every /admin route is gated here, server-side, before any of it renders.
  const session = await requirePermission('admin:view_dashboard', '/admin');

  return (
    <PortalShell title="PALMA Admin" nav={NAV} userName={session.user.email}>
      {children}
    </PortalShell>
  );
}
