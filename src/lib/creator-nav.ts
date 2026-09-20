import { LayoutDashboard, User, ShieldCheck, LinkIcon } from 'lucide-react';
import type { DeskNavItem } from '@/components/desk/DeskShell';

/**
 * The creator portal, as pages rather than as one scroll.
 *
 * It began as a single screen holding the record, the candidacies, the
 * portrait, the profile fields, the links, verification, the nomination link,
 * the assets, the Dossier and two role panels. Each was reasonable on its own
 * and the sum was a page nobody could find anything on: the thing a creator
 * came to do was always somewhere below the thing they did not.
 *
 * Four surfaces, one question each. The overview answers "where do I stand",
 * and the other three are the three jobs a creator actually comes here to do.
 */
export const CREATOR_NAV: DeskNavItem[] = [
  { href: '/creator', label: 'Overview', icon: LayoutDashboard },
  { href: '/creator/profile', label: 'Profile', icon: User },
  { href: '/creator/verification', label: 'Verification', icon: ShieldCheck },
  { href: '/creator/share', label: 'Your links', icon: LinkIcon },
];
