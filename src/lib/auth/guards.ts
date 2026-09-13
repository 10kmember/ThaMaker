import 'server-only';
import { redirect } from 'next/navigation';
import { getSession, type ActiveSession } from './session';
import { can, type Permission, type Role } from './rbac';

export class AuthorisationError extends Error {
  readonly permission: Permission | null;

  constructor(message: string, permission: Permission | null = null) {
    super(message);
    this.name = 'AuthorisationError';
    this.permission = permission;
  }
}

/** Server-side gate for pages: sends visitors to sign in, keeps the return path. */
export async function requireSession(returnTo?: string): Promise<ActiveSession> {
  const session = await getSession();
  if (!session) {
    const target = returnTo ? `/sign-in?next=${encodeURIComponent(returnTo)}` : '/sign-in';
    redirect(target);
  }
  return session;
}

export async function requirePermission(
  permission: Permission,
  returnTo?: string,
): Promise<ActiveSession> {
  const session = await requireSession(returnTo);
  if (!can(session.user.role, permission)) {
    throw new AuthorisationError('You do not have permission to do that.', permission);
  }
  return session;
}

/**
 * For Server Actions: never redirects, so the caller can return a typed error
 * to the form instead of throwing a navigation.
 */
export async function authorise(permission: Permission): Promise<ActiveSession> {
  const session = await getSession();
  if (!session) throw new AuthorisationError('You must be signed in to do that.', permission);
  if (!can(session.user.role, permission)) {
    throw new AuthorisationError('You do not have permission to do that.', permission);
  }
  return session;
}

export async function currentRole(): Promise<Role> {
  const session = await getSession();
  return session?.user.role ?? 'visitor';
}
