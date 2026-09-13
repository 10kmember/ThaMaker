import { requirePermission } from '@/lib/auth/guards';
import { PortalShell, type PortalNavItem } from '@/components/palma/PortalShell';

export const dynamic = 'force-dynamic';

/**
 * The back office is organised around work, not around tables. The queues come
 * first because they are what a person opens the dashboard to clear; the
 * season machinery sits behind them.
 */
const NAV: PortalNavItem[] = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/claims', label: 'Claims' },
  { href: '/admin/verification', label: 'Verification' },
  { href: '/admin/creators', label: 'Creators' },
  { href: '/admin/moderation', label: 'Reports' },
  { href: '/admin/nominations', label: 'Nominations' },
  { href: '/admin/judging', label: 'Judging' },
  { href: '/admin/selection', label: 'Finalists & winners' },
  { href: '/admin/audit', label: 'Audit log' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Every /admin route is gated here, server-side, before any of it renders.
  const session = await requirePermission('admin:view_dashboard', '/admin');

  return (
    <PortalShell title="PALMA Operations" nav={NAV} userName={session.user.email}>
      {children}
    </PortalShell>
  );
}
