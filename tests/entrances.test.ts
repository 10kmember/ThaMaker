import { describe, expect, it } from 'vitest';
import {
  ENTRANCES,
  ENTRANCE_LIST,
  admits,
  entranceByKey,
  entranceForPath,
  entranceForRole,
  homeForRole,
} from '@/lib/auth/entrances';
import { ROLES, type Role } from '@/lib/auth/rbac';

/**
 * Four paths, one per role. Each is both the door and the dashboard, so these
 * assertions are about one thing rather than two that can drift apart.
 */
describe('the four surfaces', () => {
  it('gives every role exactly one path', () => {
    for (const role of ROLES) {
      if (role === 'visitor') continue;
      const doors = ENTRANCE_LIST.filter((entrance) => admits(entrance, role));
      expect(doors, `${role} is admitted at ${doors.length} paths`).toHaveLength(1);
    }
  });

  it('puts each role where you said it goes', () => {
    expect(homeForRole('creator')).toBe('/creator');
    expect(homeForRole('judge')).toBe('/judge');
    expect(homeForRole('moderator')).toBe('/portal');
    expect(homeForRole('admin')).toBe('/admin');
    expect(homeForRole('super_admin')).toBe('/admin');
  });

  it('makes the door and the dashboard the same path', () => {
    for (const entrance of ENTRANCE_LIST) {
      for (const role of entrance.roles) {
        expect(homeForRole(role)).toBe(entrance.path);
      }
    }
  });

  it('gives the four paths four distinct URLs', () => {
    const paths = ENTRANCE_LIST.map((entrance) => entrance.path);
    expect(new Set(paths).size).toBe(paths.length);
    expect(paths).toEqual(['/creator', '/judge', '/portal', '/admin']);
  });

  it('never admits one role at another role’s path', () => {
    const matrix: [Role, string][] = [
      ['creator', '/creator'],
      ['judge', '/judge'],
      ['moderator', '/portal'],
      ['admin', '/admin'],
      ['super_admin', '/admin'],
    ];

    for (const [role, path] of matrix) {
      for (const entrance of ENTRANCE_LIST) {
        expect(admits(entrance, role), `${role} at ${entrance.path}`).toBe(entrance.path === path);
      }
    }
  });

  it('falls back to the creator surface for a visitor', () => {
    expect(entranceForRole('visitor').key).toBe('creator');
  });

  it('resolves the surface from the path, without needing a role', () => {
    expect(entranceForPath('/judge').key).toBe('judge');
    expect(entranceForPath('/judge/abc123').key).toBe('judge');
    expect(entranceForPath('/portal').key).toBe('moderator');
    expect(entranceForPath('/portal/claims').key).toBe('moderator');
    expect(entranceForPath('/admin').key).toBe('admin');
    expect(entranceForPath('/admin/audit').key).toBe('admin');
    expect(entranceForPath('/creator').key).toBe('creator');
    expect(entranceForPath('/creator/start').key).toBe('creator');
  });

  it('does not mistake a lookalike public path for a surface', () => {
    // /about/judging and /judges are public pages, not the judging room.
    expect(entranceForPath('/about/judging').key).toBe('creator');
    expect(entranceForPath('/about/judges').key).toBe('creator');
    expect(entranceForPath('/administration').key).toBe('creator');
    expect(entranceForPath(undefined).key).toBe('creator');
  });

  it('resolves a surface by key and refuses an unknown one', () => {
    expect(entranceByKey('judge')).toBe(ENTRANCES.judge);
    expect(entranceByKey('staff')).toBeUndefined();
    expect(entranceByKey('nonsense')).toBeUndefined();
  });
});
