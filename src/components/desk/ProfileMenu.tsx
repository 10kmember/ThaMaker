'use client';

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import Link from 'next/link';
import {
  User,
  Settings,
  ShieldCheck,
  Inbox,
  Mail,
  LogOut,
  ChevronDown,
  Scale,
  Gauge,
  BadgeCheck,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ───────────────────────────────────────────────────────────────────────────
   The account menu

   An account's address is not a badge. It used to sit in the top right of
   every desk in full, which spent a header's worth of room on a string
   nobody needs to read, truncated it on a phone anyway, and put a person's
   email on screen in every screenshot and every screen share.

   What replaces it is the thing people actually reach for that corner to do:
   check which account they are on, and get to their profile, their record,
   their security and the way out. The address is inside, once, where it
   answers "am I signed in as the right person" and then stops.
   ─────────────────────────────────────────────────────────────────────────── */

export type ProfileLink = { href: string; label: string; icon: LucideIcon };

/**
 * Initials, as the avatar.
 *
 * Two letters from a name, or the first of an address when there is no name.
 * Deliberately not a generated pattern or a gravatar: those need a network
 * round trip to say something a person already knows.
 */
function initials(name: string, email: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts.at(0);
  const last = parts.at(-1);
  if (parts.length >= 2 && first && last) return `${first[0]}${last[0]}`.toUpperCase();
  if (first) return first.slice(0, 2).toUpperCase();
  return (email.at(0) ?? '?').toUpperCase();
}

const ICONS: Record<string, LucideIcon> = {
  profile: User,
  verification: ShieldCheck,
  dossier: Inbox,
  email: Mail,
  account: Settings,
  judging: Scale,
  admin: Gauge,
};

export function ProfileMenu({
  name,
  email,
  roleLabel,
  verified,
  links,
  signOut,
}: {
  name: string;
  email: string;
  /** The account's role, in words. Comes from the session, not from here. */
  roleLabel: string;
  /** Present only where the desk knows it — the creator portal does. */
  verified?: boolean;
  /** Where this account can go. Assembled by the page from its own session. */
  links: { key: string; href: string; label: string }[];
  /** The sign-out form, passed in because the action is a server action. */
  signOut: React.ReactNode;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={`Account: ${name}`}
          className={cn(
            'group flex items-center gap-2 rounded-full p-1 pr-2',
            'border border-transparent transition-[background-color,border-color,transform] duration-400',
            '[transition-timing-function:var(--spring)]',
            'hover:border-[color:var(--line)] hover:bg-[color:var(--surface-1)]',
            'data-[state=open]:border-[color:var(--line)] data-[state=open]:bg-[color:var(--surface-1)]',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]',
          )}
        >
          <span
            className={cn(
              'grid size-8 place-items-center rounded-full text-[0.6875rem] font-semibold tracking-wide',
              'bg-[color:var(--accent-wash)] text-[color:var(--accent)]',
              'ring-1 ring-[color:var(--accent)]/25 ring-inset',
            )}
          >
            {initials(name, email)}
          </span>
          <ChevronDown
            className="size-3.5 text-[color:var(--text-quiet)] transition-transform duration-300 group-data-[state=open]:rotate-180"
            strokeWidth={2}
          />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={10}
          className={cn(
            // `desk` because the menu is portalled to the body, outside the
            // desk root, and would otherwise inherit none of its tokens.
            'desk-tokens popover popover-enter z-[70] w-72 overflow-hidden p-1.5',
          )}
        >
          {/* Who you are. The one place the address appears. */}
          <div className="flex items-start gap-3 px-2.5 py-3">
            <span
              className={cn(
                'grid size-10 shrink-0 place-items-center rounded-full text-xs font-semibold tracking-wide',
                'bg-[color:var(--accent-wash)] text-[color:var(--accent)]',
                'ring-1 ring-[color:var(--accent)]/25 ring-inset',
              )}
            >
              {initials(name, email)}
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="flex items-center gap-1.5">
                <span className="truncate text-sm font-medium text-[color:var(--text)]">
                  {name}
                </span>
                {verified ? (
                  <BadgeCheck
                    className="size-3.5 shrink-0 text-[color:var(--positive)]"
                    strokeWidth={2}
                    aria-label="Verified"
                  />
                ) : null}
              </span>
              <span className="truncate text-xs text-[color:var(--text-quiet)]">{email}</span>
              <span className="label mt-1 text-[10px]">{roleLabel}</span>
            </span>
          </div>

          <DropdownMenu.Separator className="my-1 h-px bg-[color:var(--line)]" />

          {links.map((link) => {
            const Icon = ICONS[link.key] ?? User;
            return (
              <DropdownMenu.Item key={link.href} asChild>
                <Link
                  href={link.href}
                  className={cn(
                    'flex cursor-pointer items-center gap-2.5 rounded-[0.6rem] px-2.5 py-2 text-sm',
                    'text-[color:var(--text-soft)] outline-none select-none',
                    'data-[highlighted]:bg-[color:var(--surface-1)] data-[highlighted]:text-[color:var(--text)]',
                  )}
                >
                  <Icon className="size-4 shrink-0" strokeWidth={1.75} />
                  {link.label}
                </Link>
              </DropdownMenu.Item>
            );
          })}

          <DropdownMenu.Separator className="my-1 h-px bg-[color:var(--line)]" />

          <DropdownMenu.Item asChild>
            <div
              className={cn(
                'rounded-[0.6rem] text-sm outline-none select-none',
                'data-[highlighted]:bg-[color:var(--alert-wash)]',
                '[&_button]:flex [&_button]:w-full [&_button]:cursor-pointer [&_button]:items-center',
                '[&_button]:gap-2.5 [&_button]:px-2.5 [&_button]:py-2',
                '[&_button]:text-[color:var(--alert)]',
              )}
            >
              {signOut}
            </div>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/** The sign-out control itself. Rendered into the menu by the shell. */
export function SignOutBody() {
  return (
    <>
      <LogOut className="size-4 shrink-0" strokeWidth={1.75} />
      Sign out
    </>
  );
}
