import { DeskShell, type DeskNavItem } from '@/components/desk/DeskShell';
import { accountLinks } from '@/lib/account-menu';
import type { ActiveSession } from '@/lib/auth/session';

export type PortalNavItem = DeskNavItem;

/**
 * The authenticated shell.
 *
 * A thin adapter over `DeskShell`, so a creator moving from their overview
 * to their profile does not walk out of one design and into another.
 *
 * It takes the whole session rather than a display name: the account control
 * in the chrome needs the name, the address and the role, and every caller
 * already holds a session by the time it renders. Passing the session is one
 * prop where passing its parts would be three, and it keeps the shell from
 * having to look anything up for itself.
 */
export function PortalShell({
  title,
  subtitle,
  nav,
  activeHref,
  session,
  desk = 'creator',
  verified,
  children,
}: {
  title: string;
  subtitle?: string;
  nav?: PortalNavItem[];
  activeHref?: string;
  session: ActiveSession;
  /** Which desk this is, so the account menu never links to where you are. */
  desk?: 'creator' | 'judge' | 'portal' | 'admin';
  verified?: boolean;
  children: React.ReactNode;
}) {
  return (
    <DeskShell
      desk={title}
      eyebrow={subtitle}
      layout="seg"
      nav={nav && nav.length > 0 ? [{ title: 'Sections', items: nav }] : undefined}
      activeHref={activeHref}
      account={{
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
        verified,
        links: accountLinks({
          role: session.user.role,
          judgeId: session.user.judgeId,
          creatorId: session.user.creatorId,
          desk,
        }),
      }}
    >
      {children}
    </DeskShell>
  );
}
