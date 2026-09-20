import { headers } from 'next/headers';
import { DeskShell } from '@/components/desk/DeskShell';
import { CommandPalette } from '@/components/admin/CommandPalette';
import { accountLinks } from '@/lib/account-menu';
import { navFor } from '@/lib/admin-nav';
import { roleSurface } from '@/components/account/RoleSurface';
import { ENTRANCES } from '@/lib/auth/entrances';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { session, panel } = await roleSurface(ENTRANCES.admin);
  if (!session) return panel;

  const activeHref = (await headers()).get('x-palma-pathname') ?? '/admin';
  const groups = navFor(session.user.role);

  return (
    <DeskShell
      desk="Administration"
      eyebrow="The Creator Honours"
      layout="rail"
      nav={groups}
      activeHref={activeHref}
      account={{
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
        links: accountLinks({
          role: session.user.role,
          judgeId: session.user.judgeId,
          creatorId: session.user.creatorId,
          desk: 'admin',
        }),
      }}
      search={
        <CommandPalette
          // Icons are components, and components do not cross into a client
          // component. The palette is given the words and the destinations.
          groups={groups.map((group) => ({
            title: group.title,
            items: group.items.map((item) => ({ href: item.href, label: item.label })),
          }))}
        />
      }
    >
      {children}
    </DeskShell>
  );
}
