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

/**
 * The moderator's dashboard.
 *
 * Queues, and the records those queues are about. Short on purpose: a
 * moderator's day is a list of things waiting for a person, and a sidebar that
 * offered them the institution's machinery would be offering them work that is
 * not theirs.
 */
export const MODERATION_NAV: AdminGroup[] = [
  {
    title: 'Queues',
    items: [
      { href: '/portal', label: 'Overview', permission: 'operations:view_dashboard' },
      { href: '/portal/claims', label: 'Creator claims', permission: 'claims:review' },
      {
        href: '/portal/verification',
        label: 'Age verification',
        permission: 'verification:review_manual',
      },
      { href: '/portal/reports', label: 'Reports', permission: 'moderation:view_reports' },
      { href: '/portal/portraits', label: 'Portraits', permission: 'editorial:edit_creator' },
      { href: '/portal/objections', label: 'Objections', permission: 'creators:view_records' },
    ],
  },
  {
    title: 'The record',
    items: [
      { href: '/portal/creators', label: 'Creators', permission: 'creators:view_records' },
      { href: '/portal/creators/import', label: 'Import', permission: 'editorial:import_creators' },
      {
        href: '/portal/sponsorships',
        label: 'Sponsor placements',
        permission: 'commercial:assign_placement',
      },
      {
        href: '/portal/kulture',
        label: 'Kulture',
        permission: 'kulture:manage_products',
      },
      {
        href: '/portal/features',
        label: 'Features',
        permission: 'commercial:manage_features',
      },
      { href: '/paroh', label: 'PaROH', permission: 'operations:view_dashboard' },
    ],
  },
];

export const ADMIN_NAV: AdminGroup[] = [
  {
    title: 'Command centre',
    items: [
      { href: '/admin', label: 'Overview', permission: 'admin:view_dashboard' },
      { href: '/admin/analytics', label: 'Analytics', permission: 'admin:view_analytics' },
      { href: '/admin/audience', label: 'Audience', permission: 'admin:view_analytics' },
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
      { href: '/portal/creators', label: 'Creators', permission: 'creators:view_records' },
      { href: '/admin/users', label: 'Users & roles', permission: 'admin:manage_users' },
    ],
  },
  {
    // The moderator's queues, reachable from here because an administrator
    // holds every moderator permission — the same pages, not a second copy.
    title: 'Queues',
    items: [
      { href: '/portal/claims', label: 'Creator claims', permission: 'claims:review' },
      {
        href: '/portal/verification',
        label: 'Age verification',
        permission: 'verification:review_manual',
      },
      { href: '/portal/reports', label: 'Reports', permission: 'moderation:view_reports' },
      { href: '/portal/portraits', label: 'Portraits', permission: 'editorial:edit_creator' },
      { href: '/portal/objections', label: 'Objections', permission: 'creators:view_records' },
    ],
  },
  {
    title: 'Enforcement',
    items: [{ href: '/admin/enforcement', label: 'Enforcement', permission: 'admin:enforce' }],
  },
  {
    title: 'Communications',
    items: [
      {
        href: '/admin/communications',
        label: 'Mail & the Gazette',
        permission: 'admin:view_communications',
      },
    ],
  },
  {
    title: 'Business',
    items: [
      { href: '/admin/business', label: 'Commercial', permission: 'commercial:view' },
      {
        href: '/portal/sponsorships',
        label: 'Sponsor placements',
        permission: 'commercial:assign_placement',
      },
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
      {
        href: '/admin/settings/features',
        label: 'Features & commercial',
        permission: 'commercial:manage_features',
      },
    ],
  },
];

/** The sidebar as this role actually sees it. Empty groups disappear. */
export function navFor(role: Role, nav: AdminGroup[] = ADMIN_NAV): AdminGroup[] {
  return nav
    .map((group) => ({
      title: group.title,
      items: group.items.filter((item) => can(role, item.permission)),
    }))
    .filter((group) => group.items.length > 0);
}
