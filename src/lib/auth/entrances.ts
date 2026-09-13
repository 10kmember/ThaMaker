import type { Role } from './rbac';

/**
 * Separate entrances.
 *
 * PALMA has three kinds of account and three doors, and an account may only
 * use its own. A creator signing in at the judges' entrance is refused there
 * and told where to go, even when the password is correct — no session is
 * created at the wrong door.
 *
 * RBAC still decides what a signed-in account may *do*; this decides where it
 * may come in. The two are independent on purpose: the door is a property of
 * the surface, and is settled before any session exists, so no page has to ask
 * "what is this person?" to work out where to send them.
 */

export type EntranceKey = 'creator' | 'judge' | 'staff';

export type Entrance = {
  key: EntranceKey;
  /** The public path of the door. */
  path: string;
  title: string;
  eyebrow: string;
  standfirst: string;
  /** Roles admitted here. Nothing else gets a session at this door. */
  roles: readonly Role[];
  /** Where a successful sign-in lands. */
  home: string;
};

export const ENTRANCES = {
  creator: {
    key: 'creator',
    path: '/sign-in',
    title: 'Creator sign in',
    eyebrow: 'Creator portal',
    standfirst:
      'For creators with a PALMA record: claim your profile, complete verification, and manage your nomination link.',
    roles: ['creator'],
    home: '/portal',
  },
  judge: {
    key: 'judge',
    path: '/judge',
    title: 'Judges',
    eyebrow: 'The panel',
    standfirst:
      'The judging room is open only to judges seated on a PALMA panel. Everything inside it is confidential.',
    roles: ['judge'],
    home: '/judging',
  },
  staff: {
    key: 'staff',
    // Deliberately outside /admin: that segment's layout guards every page
    // under it, and a door inside a guarded segment redirects to itself.
    path: '/staff',
    title: 'Administration',
    eyebrow: 'PALMA staff',
    standfirst: 'For PALMA staff: screening, selection, moderation and the audit log.',
    roles: ['editor', 'moderator', 'admin', 'super_admin'],
    home: '/admin',
  },
} as const satisfies Record<EntranceKey, Entrance>;

export const ENTRANCE_LIST: Entrance[] = Object.values(ENTRANCES);

export function admits(entrance: Entrance, role: Role): boolean {
  return (entrance.roles as readonly Role[]).includes(role);
}

/** The door this role belongs at. Every role has exactly one. */
export function entranceForRole(role: Role): Entrance {
  return ENTRANCE_LIST.find((entrance) => admits(entrance, role)) ?? ENTRANCES.creator;
}

/**
 * The door that guards a given path.
 *
 * Resolved from the surface rather than from the visitor, because a visitor
 * being sent to sign in does not yet have a role to consult.
 */
export function entranceForPath(path: string | undefined | null): Entrance {
  if (!path) return ENTRANCES.creator;
  if (path === '/judging' || path.startsWith('/judging/')) return ENTRANCES.judge;
  if (path === '/admin' || path.startsWith('/admin/')) return ENTRANCES.staff;
  return ENTRANCES.creator;
}

export function entranceByKey(key: string): Entrance | undefined {
  return ENTRANCE_LIST.find((entrance) => entrance.key === key);
}
