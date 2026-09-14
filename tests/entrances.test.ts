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

describe('entrances', () => {
  it('gives the judges their own door at /judge', () => {
    expect(ENTRANCES.judge.path).toBe('/judge');
    expect(ENTRANCES.judge.home).toBe('/judging');
    expect(admits(ENTRANCES.judge, 'judge')).toBe(true);
  });

  it('admits each role at exactly one door', () => {
    for (const role of ROLES) {
      if (role === 'visitor') continue;
      const doors = ENTRANCE_LIST.filter((entrance) => admits(entrance, role));
      expect(doors, `${role} is admitted at ${doors.length} doors`).toHaveLength(1);
    }
  });

  it('never admits a creator or staff account at the judges’ entrance', () => {
    for (const role of ['creator', 'moderator', 'admin', 'super_admin'] as Role[]) {
      expect(admits(ENTRANCES.judge, role)).toBe(false);
    }
  });

  it('never admits a judge at the creator or staff entrance', () => {
    expect(admits(ENTRANCES.creator, 'judge')).toBe(false);
    expect(admits(ENTRANCES.staff, 'judge')).toBe(false);
  });

  it('sends every role to its own dashboard', () => {
    expect(homeForRole('judge')).toBe('/judging');
    expect(homeForRole('creator')).toBe('/portal');
    expect(homeForRole('admin')).toBe('/admin');
    expect(homeForRole('super_admin')).toBe('/admin');
    // A moderator shares the staff door and not the administrator's dashboard.
    expect(homeForRole('moderator')).toBe('/moderation');
    expect(entranceForRole('moderator').path).toBe('/staff');
  });

  it('guards the moderation surface behind the staff door', () => {
    expect(entranceForPath('/moderation').key).toBe('staff');
    expect(entranceForPath('/moderation/claims').key).toBe('staff');
  });

  it('falls back to the creator door for a visitor', () => {
    expect(entranceForRole('visitor').key).toBe('creator');
  });

  it('resolves the door from the surface, without needing a role', () => {
    expect(entranceForPath('/judging').key).toBe('judge');
    expect(entranceForPath('/judging/abc123').key).toBe('judge');
    expect(entranceForPath('/admin').key).toBe('staff');
    expect(entranceForPath('/admin/audit').key).toBe('staff');
    expect(entranceForPath('/portal').key).toBe('creator');
    expect(entranceForPath(undefined).key).toBe('creator');
  });

  it('does not mistake a lookalike path for a guarded surface', () => {
    // /about/judging and /judge are public and must not resolve to the
    // judging room's door as though they were the portal.
    expect(entranceForPath('/about/judging').key).toBe('creator');
    expect(entranceForPath('/administration').key).toBe('creator');
  });

  it('keeps the staff door outside the guarded admin segment', () => {
    expect(ENTRANCES.staff.path.startsWith('/admin')).toBe(false);
  });

  it('resolves a door by key and refuses an unknown one', () => {
    expect(entranceByKey('judge')).toBe(ENTRANCES.judge);
    expect(entranceByKey('nonsense')).toBeUndefined();
  });
});
