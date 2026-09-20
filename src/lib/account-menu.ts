import type { Role } from '@/lib/auth/rbac';
import { isStaff } from '@/lib/auth/rbac';

/**
 * What an account can reach from the menu in the chrome.
 *
 * Built from the session's own role and memberships, so the menu shows the
 * judging room only to somebody seated on a panel and the command centre
 * only to staff. The keys map to icons inside the menu; the labels are the
 * words a person would use for the thing.
 */
export type AccountLink = { key: string; href: string; label: string };

export function accountLinks({
  role,
  judgeId,
  creatorId,
  /** The desk this menu is being rendered on, so it never links to itself. */
  desk,
}: {
  role: Role;
  judgeId?: string | null;
  creatorId?: string | null;
  desk: 'creator' | 'judge' | 'portal' | 'admin';
}): AccountLink[] {
  const links: AccountLink[] = [];

  if (creatorId || role === 'creator') {
    links.push({ key: 'profile', href: '/creator/profile', label: 'Your profile' });
    links.push({ key: 'verification', href: '/creator/verification', label: 'Verification' });
  }

  links.push({ key: 'dossier', href: '/dossier', label: 'Your Dossier' });
  links.push({
    key: 'email',
    href: '/account/email-preferences',
    label: 'What reaches your inbox',
  });
  links.push({ key: 'account', href: '/account', label: 'Account & security' });

  if (judgeId && desk !== 'judge') {
    links.push({ key: 'judging', href: '/judge', label: 'The judging room' });
  }

  if (isStaff(role) && desk !== 'admin' && desk !== 'portal') {
    links.push({ key: 'admin', href: '/admin', label: 'Command centre' });
  }

  return links;
}
