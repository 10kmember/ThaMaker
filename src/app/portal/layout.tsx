import { headers } from 'next/headers';
import { DeskShell } from '@/components/desk/DeskShell';
import { CommandPalette } from '@/components/admin/CommandPalette';
import { accountLinks } from '@/lib/account-menu';
import { ADMIN_NAV, MODERATION_NAV, navFor } from '@/lib/admin-nav';
import { roleSurface } from '@/components/account/RoleSurface';
import { ENTRANCES } from '@/lib/auth/entrances';

export const dynamic = 'force-dynamic';

export default async function ModerationLayout({ children }: { children: React.ReactNode }) {
  const { session, panel } = await roleSurface(ENTRANCES.moderator);
  if (!session) return panel;

  const activeHref = (await headers()).get('x-palma-pathname') ?? '/portal';

  const role = session.user.role;
  const isModerator = role === 'moderator';
  const groups = navFor(role, isModerator ? MODERATION_NAV : ADMIN_NAV);

  return (
    <DeskShell
      desk={isModerator ? 'Moderation' : 'Administration'}
      eyebrow="The Creator Honours"
      layout="rail"
      nav={groups}
      activeHref={activeHref}
      account={{
        name: session.user.name,
        email: session.user.email,
        role,
        links: accountLinks({
          role,
          judgeId: session.user.judgeId,
          creatorId: session.user.creatorId,
          desk: 'portal',
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
