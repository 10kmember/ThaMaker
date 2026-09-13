import type { PortalNavItem } from '@/components/palma/PortalShell';

/** Four places, because a judge has four things to do. */
export const JUDGING_NAV: PortalNavItem[] = [
  { href: '/judging', label: 'Overview' },
  { href: '/judging/assignments', label: 'My judging' },
  { href: '/judging/history', label: 'History' },
  { href: '/judging/account', label: 'Account' },
];

/** "Good afternoon" is warmer than "Dashboard", and costs nothing. */
export function greeting(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}
