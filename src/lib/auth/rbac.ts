/**
 * Role-based access control.
 *
 * Every privileged action in PALMA is named here and checked on the server.
 * Client components may hide UI, but authority lives exclusively in this file
 * and the guards that consume it.
 */
export const ROLES = [
  'visitor',
  'creator',
  'judge',
  'editor',
  'moderator',
  'admin',
  'super_admin',
] as const;

export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  // Creator surface
  'creator:claim_profile',
  'creator:update_own_profile',
  'creator:start_verification',
  'nomination:submit',
  'nomination:view_own',

  // Judging
  'judging:view_assignments',
  'judging:submit_score',
  'judging:declare_conflict',

  // Editorial — the presentation of the record, never its outcomes
  'journal:write',
  'journal:publish',
  'creators:view_records',
  'editorial:create_creator',
  'editorial:edit_creator',
  'editorial:write_internal_note',

  // Operations queues
  'claims:review',
  'claims:decide',
  'verification:review_manual',

  // Moderation
  'moderation:view_reports',
  'moderation:act',

  // Administration
  'admin:view_dashboard',
  'admin:view_analytics',
  'admin:enforce',
  'admin:manage_seasons',
  'admin:manage_categories',
  'admin:review_nominations',
  'admin:manage_judges',
  'admin:assign_judging',
  'admin:resolve_conflicts',
  'admin:select_finalists',
  'admin:select_winners',
  'admin:revoke_honour',
  'admin:correct_score',
  'admin:manage_sponsors',
  'admin:view_audit_log',
  'admin:manage_users',
  'admin:manage_system',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const CREATOR: Permission[] = [
  'creator:claim_profile',
  'creator:update_own_profile',
  'creator:start_verification',
  'nomination:submit',
  'nomination:view_own',
];

const JUDGE: Permission[] = [
  'judging:view_assignments',
  'judging:submit_score',
  'judging:declare_conflict',
];

/**
 * Editorial maintains the *presentation* of the record: bios, imagery, links,
 * descriptions, the Journal. It has no permission that touches an outcome —
 * no selection, no revocation, no score correction — and that boundary is the
 * point of the role rather than an oversight in this list.
 */
const EDITOR: Permission[] = [
  'admin:view_dashboard',
  'creators:view_records',
  'journal:write',
  'journal:publish',
  'creators:view_records',
  'editorial:create_creator',
  'editorial:edit_creator',
  'editorial:write_internal_note',
  'claims:review',
];

const MODERATOR: Permission[] = [
  'admin:view_dashboard',
  // A moderator reads records to investigate; editing their presentation is
  // editorial's job, so the page renders read-only for them.
  'creators:view_records',
  'moderation:view_reports',
  'moderation:act',
  'editorial:write_internal_note',
  'claims:review',
  'claims:decide',
  'verification:review_manual',
];

const ADMIN: Permission[] = [
  ...EDITOR,
  ...MODERATOR,
  'claims:decide',
  'admin:view_dashboard',
  'admin:view_analytics',
  'admin:enforce',
  'admin:manage_seasons',
  'admin:manage_categories',
  'admin:review_nominations',
  'admin:manage_judges',
  'admin:assign_judging',
  'admin:resolve_conflicts',
  'admin:select_finalists',
  'admin:select_winners',
  'admin:revoke_honour',
  'admin:correct_score',
  'admin:manage_sponsors',
  'admin:view_audit_log',
];

const MATRIX: Record<Role, readonly Permission[]> = {
  visitor: [],
  creator: CREATOR,
  // Judges are people first: they may also hold a creator profile of their own.
  judge: [...CREATOR, ...JUDGE],
  editor: [...CREATOR, ...EDITOR],
  moderator: [...CREATOR, ...MODERATOR],
  admin: [...CREATOR, ...ADMIN],
  super_admin: [...PERMISSIONS],
};

export function permissionsFor(role: Role): readonly Permission[] {
  return MATRIX[role] ?? [];
}

export function can(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return permissionsFor(role).includes(permission);
}

export function canAll(role: Role | null | undefined, permissions: Permission[]): boolean {
  return permissions.every((permission) => can(role, permission));
}

export function canAny(role: Role | null | undefined, permissions: Permission[]): boolean {
  return permissions.some((permission) => can(role, permission));
}

/**
 * Outcomes of the award. No editor or moderator holds any of these, at any
 * time, by any route — the back office maintains the accuracy of the record
 * and never its results.
 */
export const OUTCOME_PERMISSIONS: readonly Permission[] = [
  'admin:select_finalists',
  'admin:select_winners',
  'admin:revoke_honour',
  'admin:correct_score',
  'admin:assign_judging',
  'admin:resolve_conflicts',
];

/**
 * Sponsors hold no role in this matrix by design. Sponsorship is a commercial
 * relationship recorded against a season; it grants no access to nominations,
 * judges, scores or outcomes.
 */
export const SPONSOR_PERMISSIONS: readonly Permission[] = [];

export function isStaff(role: Role | null | undefined): boolean {
  return role === 'editor' || role === 'moderator' || role === 'admin' || role === 'super_admin';
}
