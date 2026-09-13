import type { Permission, Role } from '@/lib/auth/rbac';
import { can } from '@/lib/auth/rbac';

/**
 * The administration sidebar.
 *
 * Grouped by what a thing *is*, not by which table it lives in, and filtered by
 * what the signed-in role may actually reach. A moderator sees their queues and
 * a very short sidebar; a super administrator sees the institution. Nobody is
 * shown a door that will refuse them — a greyed-out menu is just a slower 403.
 */

export type AdminLink = {
  href: string;
  label: string;
  /** The permission that makes this destination reachable. */
  permission: Permission;
  /** Not yet built. Listed so the shape of the institution is visible. */
  planned?: boolean;
};

export type AdminGroup = { title: string; items: AdminLink[] };

export const ADMIN_NAV: AdminGroup[] = [
  {
    title: 'Command centre',
    items: [
      { href: '/admin', label: 'Overview', permission: 'admin:view_dashboard' },
      { href: '/admin/analytics', label: 'Analytics', permission: 'admin:view_analytics' },
      { href: '/admin/search', label: 'Search', permission: 'creators:view_records' },
      { href: '/admin/activity', label: 'Activity', permission: 'admin:view_audit_log' },
    ],
  },
  {
    title: 'Awards',
    items: [
      { href: '/admin/nominations', label: 'Nominations', permission: 'admin:review_nominations' },
      { href: '/admin/judging', label: 'Judging', permission: 'admin:assign_judging' },
      {
        href: '/admin/selection',
        label: 'Finalists & winners',
        permission: 'admin:select_finalists',
      },
      { href: '/paroh', label: 'PaROH', permission: 'admin:view_dashboard' },
    ],
  },
  {
    title: 'People',
    items: [
      { href: '/admin/creators', label: 'Creators', permission: 'creators:view_records' },
      { href: '/admin/users', label: 'Users & roles', permission: 'admin:manage_users' },
    ],
  },
  {
    title: 'Verification',
    items: [
      {
        href: '/admin/verification',
        label: 'Age verification',
        permission: 'verification:review_manual',
      },
      { href: '/admin/claims', label: 'Claims', permission: 'claims:review' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { href: '/admin/moderation', label: 'Reports', permission: 'moderation:view_reports' },
      { href: '/admin/enforcement', label: 'Enforcement', permission: 'admin:enforce' },
    ],
  },
  {
    title: 'Business',
    items: [
      {
        href: '/admin/sponsors',
        label: 'Sponsors & partners',
        permission: 'admin:manage_sponsors',
      },
    ],
  },
  {
    title: 'System',
    items: [
      { href: '/admin/audit', label: 'Audit log', permission: 'admin:view_audit_log' },
      { href: '/admin/health', label: 'System health', permission: 'admin:manage_system' },
      { href: '/admin/settings', label: 'Settings', permission: 'admin:manage_system' },
    ],
  },
];

/** The sidebar as this role actually sees it. Empty groups disappear. */
export function navFor(role: Role): AdminGroup[] {
  return ADMIN_NAV.map((group) => ({
    title: group.title,
    items: group.items.filter((item) => can(role, item.permission)),
  })).filter((group) => group.items.length > 0);
}
