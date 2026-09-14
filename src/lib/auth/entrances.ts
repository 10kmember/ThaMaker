import type { Role } from './rbac';

/**
 * Four paths, one per role.
 *
 *   /creator   creators — the default account on PALMA
 *   /judge     judges
 *   /portal    moderators
 *   /admin     administrators
 *
 * Each path is both the door and the dashboard behind it. Signed out you get
 * that role's sign-in; signed in you get its dashboard; signed in as somebody
 * else you are sent to your own. Nobody has to remember a separate sign-in
 * URL, and there is no way to land on a dashboard that is not yours.
 *
 * Anyone who signs up is a creator. A judge, moderator or administrator is a
 * creator whose account PALMA has *also* given a role — so they reach their
 * desk by typing its path, and their creator record still lives at /creator.
 *
 * RBAC decides what a signed-in account may do. This decides only where it
 * lives.
 */

export type EntranceKey = 'creator' | 'judge' | 'moderator' | 'admin';

export type Entrance = {
  key: EntranceKey;
  /** The role's whole surface: its door and its dashboard, one path. */
  path: string;
  title: string;
  eyebrow: string;
  standfirst: string;
  /** Roles admitted here. Nothing else gets a session at this door. */
  roles: readonly Role[];
};

export const ENTRANCES = {
  creator: {
    key: 'creator',
    path: '/creator',
    title: 'Creators',
    eyebrow: 'Creator portal',
    standfirst:
      'Your PALMA record: claim or create a profile, complete verification, and manage your nomination link.',
    roles: ['creator'],
  },
  judge: {
    key: 'judge',
    path: '/judge',
    title: 'Judges',
    eyebrow: 'The panel',
    standfirst:
      'The judging room is open only to judges seated on a PALMA panel. Everything inside it is confidential.',
    roles: ['judge'],
  },
  moderator: {
    key: 'moderator',
    path: '/portal',
    title: 'Moderation',
    eyebrow: 'PALMA operations',
    standfirst: 'The moderation desk: creator records, claims, age verification and reports.',
    roles: ['moderator'],
  },
  admin: {
    key: 'admin',
    path: '/admin',
    title: 'Administration',
    eyebrow: 'PALMA administration',
    standfirst:
      'The institution: seasons, judging, selection, people, enforcement and the system itself.',
    roles: ['admin', 'super_admin'],
  },
} as const satisfies Record<EntranceKey, Entrance>;

export const ENTRANCE_LIST: Entrance[] = Object.values(ENTRANCES);

export function admits(entrance: Entrance, role: Role): boolean {
  return (entrance.roles as readonly Role[]).includes(role);
}

/** The path this role belongs at. Every role has exactly one. */
export function entranceForRole(role: Role): Entrance {
  return ENTRANCE_LIST.find((entrance) => admits(entrance, role)) ?? ENTRANCES.creator;
}

/** Where a role lands. The same thing as its door — that is the point. */
export function homeForRole(role: Role): string {
  return entranceForRole(role).path;
}

/**
 * Which surface a path belongs to, resolved from the path rather than from the
 * visitor — somebody being asked to sign in has no role to consult yet.
 */
export function entranceForPath(path: string | undefined | null): Entrance {
  if (!path) return ENTRANCES.creator;
  for (const entrance of ENTRANCE_LIST) {
    if (path === entrance.path || path.startsWith(`${entrance.path}/`)) return entrance;
  }
  return ENTRANCES.creator;
}

export function entranceByKey(key: string): Entrance | undefined {
  return ENTRANCE_LIST.find((entrance) => entrance.key === key);
}
