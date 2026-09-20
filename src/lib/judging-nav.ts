import { LayoutDashboard, Gavel, History, UserCog } from 'lucide-react';
import type { DeskNavItem } from '@/components/desk/DeskShell';

/** Four places, because a judge has four things to do. */
export const JUDGING_NAV: DeskNavItem[] = [
  { href: '/judge', label: 'Overview', icon: LayoutDashboard },
  { href: '/judge/assignments', label: 'My judging', icon: Gavel },
  { href: '/judge/history', label: 'History', icon: History },
  { href: '/judge/account', label: 'Account', icon: UserCog },
];

/** "Good afternoon" is warmer than "Dashboard", and costs nothing. */
export function greeting(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}
