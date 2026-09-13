import { headers } from 'next/headers';
import { requirePermission } from '@/lib/auth/guards';
import { AdminShell } from '@/components/admin/AdminShell';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Every /admin route is gated here, server-side, before any of it renders.
  const session = await requirePermission('admin:view_dashboard', '/admin');

  // Next does not hand a layout its own pathname, and the sidebar needs it to
  // mark where the reader is. The middleware header carries it.
  const headerList = await headers();
  const activeHref = headerList.get('x-palma-pathname') ?? '/admin';

  return (
    <AdminShell role={session.user.role} userName={session.user.email} activeHref={activeHref}>
      {children}
    </AdminShell>
  );
}
