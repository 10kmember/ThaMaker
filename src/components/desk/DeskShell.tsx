import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { Wordmark } from '@/components/brand/Wordmark';
import { Ambient } from './motion';
import { DeskChoreography } from './choreography';
import { MobileNav, MobileNavItem, MobileNavGroup } from './MobileNav';
import { ProfileMenu, SignOutBody } from './ProfileMenu';
import { signOut } from '@/server/actions/auth';
import type { Role } from '@/lib/auth/rbac';
import { cn } from '@/lib/utils';

/* ───────────────────────────────────────────────────────────────────────────
   The desk shell

   One frame for all four desks, in two shapes on a wide screen:

     · `seg`, a segmented control in the chrome, for a desk with four
       destinations. A rail for four items spends a column of the page to
       hold four words.
     · `rail`, a left rail, for a desk with twenty. A segmented control for
       twenty items is a sideways strip nobody can find anything in.

   On a phone both collapse into one collapsible panel behind a hamburger in
   the outer corner. Either way the furniture lives in the frame, and the page
   below it holds nothing but the page.
   ─────────────────────────────────────────────────────────────────────────── */

export type DeskNavItem = { href: string; label: string; icon?: LucideIcon; badge?: number };
export type DeskNavGroup = { title: string; items: DeskNavItem[] };

export const ROLE_LABEL: Record<Role, string> = {
  visitor: 'Visitor',
  creator: 'Creator',
  judge: 'Judge',
  moderator: 'Moderation',
  admin: 'Administrator',
  super_admin: 'Super administrator',
};

/** Maps a desk section's path to the icon key the account menu looks up. */
function sectionKey(href: string) {
  const tail = href.split('?')[0]?.split('/').filter(Boolean) ?? [];
  if (tail.length <= 1) return 'overview';
  const last = tail[tail.length - 1] ?? '';
  if (last === 'account') return 'judge-account';
  if (last === 'share') return 'links';
  return last;
}

function isActive(activeHref: string, href: string, roots: string[]) {
  if (activeHref === href) return true;
  // A root ("/admin", "/portal") must not light up for every page beneath it,
  // or the rail shows two active items on every sub-page.
  if (roots.includes(href)) return false;
  return activeHref.startsWith(`${href}/`);
}

export function DeskShell({
  desk,
  eyebrow,
  layout,
  nav,
  activeHref,
  account,
  search,
  live,
  children,
}: {
  /** The desk's name, beside the wordmark. */
  desk: string;
  /** A second line in the chrome, usually the season. */
  eyebrow?: string;
  layout: 'seg' | 'rail';
  nav?: DeskNavGroup[];
  activeHref?: string;
  /**
   * Who is signed in. Supplied by the page from its own session; the shell
   * never looks an account up.
   */
  account: {
    name: string;
    email: string;
    role: Role;
    verified?: boolean;
    links: { key: string; href: string; label: string }[];
  };
  /** The command palette, which owns a server action of its own. */
  search?: React.ReactNode;
  /** Draw the ambient edge glow: something on this desk is currently live. */
  live?: boolean;
  children: React.ReactNode;
}) {
  const active = activeHref ?? '';
  const roots = (nav ?? []).flatMap((group) => group.items.slice(0, 1).map((item) => item.href));
  const flat = (nav ?? []).flatMap((group) => group.items);

  return (
    <div className="desk flex min-h-dvh flex-col">
      <Ambient />
      <div className="drizzle" aria-hidden />
      <div className="drizzle drizzle-near" aria-hidden />
      {live ? <div className="edge-glow" aria-hidden /> : null}

      {/* ── Chrome ──────────────────────────────────────────────────────── */}
      <header className="desk-chrome sticky top-0 z-50">
        <div className="relative mx-auto flex w-full max-w-[100rem] items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="tap shrink-0 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[color:var(--accent)]"
          >
            {/* `href={null}`: a Wordmark that links itself would nest one
                anchor inside another. */}
            <Wordmark size="sm" variant="lockup" href={null} />
          </Link>

          <span className="hidden h-6 w-px shrink-0 bg-[color:var(--line)] sm:block" aria-hidden />

          <span className="hidden min-w-0 shrink flex-col gap-0.5 sm:flex">
            <span className="label text-[color:var(--text-soft)]">{desk}</span>
            {eyebrow ? (
              <span className="truncate text-[0.6875rem] text-[color:var(--text-quiet)]">
                {eyebrow}
              </span>
            ) : null}
          </span>

          {/* A four-destination desk carries its nav here, centred, where it
              reads as part of the frame rather than as page content. */}
          {layout === 'seg' && flat.length > 0 ? (
            <nav aria-label={`${desk} sections`} className="mx-auto hidden lg:block">
              <div className="seg">
                {flat.map((item) => {
                  const on = isActive(active, item.href, roots);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={on ? 'page' : undefined}
                      data-active={on || undefined}
                      className="seg-item focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]"
                    >
                      {Icon ? <Icon className="size-3.5" strokeWidth={on ? 2 : 1.6} /> : null}
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </nav>
          ) : null}

          <div className="ml-auto flex shrink-0 items-center gap-2">
            {search}
            <ProfileMenu
              name={account.name}
              email={account.email}
              roleLabel={ROLE_LABEL[account.role]}
              verified={account.verified}
              links={account.links}
              sections={
                layout === 'seg'
                  ? flat.map((entry) => ({
                      key: sectionKey(entry.href),
                      href: entry.href,
                      label: entry.label,
                      active: isActive(active, entry.href, roots),
                    }))
                  : undefined
              }
              signOut={
                <form action={signOut}>
                  <button type="submit">
                    <SignOutBody />
                  </button>
                </form>
              }
            />

            {/* Only where there is a rail to replace. A desk with four
                destinations keeps them in the account menu, so the corner
                holds one control rather than two. */}
            {layout === 'rail' && flat.length > 0 ? (
              <MobileNav label={desk}>
                {(nav ?? []).map((group, groupIndex) => (
                  <MobileNavGroup
                    key={group.title}
                    title={group.title}
                    index={groupIndex === 0 ? 0 : groupIndex * 2}
                  >
                    {group.items.map((item, itemIndex) => {
                      const on = isActive(active, item.href, roots);
                      const Icon = item.icon;
                      return (
                        <MobileNavItem
                          key={item.href}
                          href={item.href}
                          active={on}
                          index={groupIndex * 2 + itemIndex + 1}
                        >
                          {Icon ? (
                            <Icon
                              className={cn('size-4 shrink-0', on && 'text-[color:var(--accent)]')}
                              strokeWidth={on ? 2 : 1.6}
                            />
                          ) : null}
                          <span className="truncate">{item.label}</span>
                          {item.badge ? (
                            <span className="ml-auto rounded-full bg-[color:var(--alert-wash)] px-1.5 py-0.5 text-[10px] font-semibold text-[color:var(--alert)] tabular-nums">
                              {item.badge}
                            </span>
                          ) : null}
                        </MobileNavItem>
                      );
                    })}
                  </MobileNavGroup>
                ))}
              </MobileNav>
            ) : null}
          </div>
        </div>

        <div className="h-px w-full overflow-hidden" aria-hidden>
          <div className="desk-progress h-full w-full bg-[color:var(--accent)]" />
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[100rem] flex-1 gap-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-9">
        {/* ── Rail ──────────────────────────────────────────────────────── */}
        {layout === 'rail' && nav && nav.length > 0 ? (
          <nav aria-label={`${desk} sections`} className="hidden w-56 shrink-0 lg:block xl:w-60">
            <div className="sticky top-24 flex flex-col gap-5 pb-4">
              {nav.map((group) => (
                <div key={group.title} className="flex flex-col gap-1">
                  <h2 className="label px-3 pb-1.5 text-[10px]">{group.title}</h2>
                  <ul className="flex flex-col gap-0.5">
                    {group.items.map((item) => {
                      const on = isActive(active, item.href, roots);
                      const Icon = item.icon;
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            aria-current={on ? 'page' : undefined}
                            data-active={on || undefined}
                            className="rail-item focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]"
                          >
                            {Icon ? (
                              <Icon
                                className={cn(
                                  'size-4 shrink-0',
                                  on && 'text-[color:var(--accent)]',
                                )}
                                strokeWidth={on ? 2 : 1.6}
                              />
                            ) : null}
                            <span className="truncate">{item.label}</span>
                            {item.badge ? (
                              <span className="ml-auto rounded-full bg-[color:var(--alert-wash)] px-1.5 py-0.5 text-[10px] font-semibold text-[color:var(--alert)] tabular-nums">
                                {item.badge}
                              </span>
                            ) : null}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </nav>
        ) : null}

        <main className="min-w-0 flex-1">
          <DeskChoreography>{children}</DeskChoreography>
        </main>
      </div>
    </div>
  );
}
