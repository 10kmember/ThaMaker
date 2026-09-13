import { describe, expect, it } from 'vitest';
import { can, canAny, isStaff, permissionsFor, ROLES, SPONSOR_PERMISSIONS } from '@/lib/auth/rbac';

describe('role permissions', () => {
  it('gives a visitor nothing', () => {
    expect(permissionsFor('visitor')).toHaveLength(0);
    expect(can('visitor', 'nomination:submit')).toBe(false);
    expect(can(null, 'admin:view_dashboard')).toBe(false);
  });

  it('lets creators nominate but never judge or administer', () => {
    expect(can('creator', 'nomination:submit')).toBe(true);
    expect(can('creator', 'judging:submit_score')).toBe(false);
    expect(can('creator', 'admin:select_winners')).toBe(false);
  });

  it('lets judges score but never select finalists or winners', () => {
    expect(can('judge', 'judging:submit_score')).toBe(true);
    expect(can('judge', 'judging:declare_conflict')).toBe(true);
    expect(can('judge', 'admin:select_finalists')).toBe(false);
    expect(can('judge', 'admin:select_winners')).toBe(false);
    expect(can('judge', 'admin:correct_score')).toBe(false);
  });

  it('keeps editors and moderators out of judging and selection', () => {
    for (const role of ['editor', 'moderator'] as const) {
      expect(can(role, 'judging:submit_score'), role).toBe(false);
      expect(can(role, 'admin:select_winners'), role).toBe(false);
    }
    expect(can('editor', 'journal:publish')).toBe(true);
    expect(can('moderator', 'moderation:act')).toBe(true);
    expect(can('moderator', 'journal:publish')).toBe(false);
  });

  it('reserves user and system administration for super administrators', () => {
    expect(can('admin', 'admin:manage_users')).toBe(false);
    expect(can('admin', 'admin:manage_system')).toBe(false);
    expect(can('super_admin', 'admin:manage_users')).toBe(true);
    expect(can('super_admin', 'admin:manage_system')).toBe(true);
  });

  it('never lets any role score and select in a way sponsors could reach', () => {
    // Sponsors hold no role at all: the matrix has nothing to grant them.
    expect(SPONSOR_PERMISSIONS).toHaveLength(0);
  });

  it('identifies staff roles', () => {
    expect(ROLES.filter(isStaff)).toEqual(['editor', 'moderator', 'admin', 'super_admin']);
  });

  it('canAny matches any of the listed permissions', () => {
    expect(canAny('judge', ['admin:select_winners', 'judging:submit_score'])).toBe(true);
    expect(canAny('creator', ['admin:select_winners', 'judging:submit_score'])).toBe(false);
  });
});
