'use server';

import { revalidatePath } from 'next/cache';
import { authorise } from '@/lib/auth/guards';
import { assertSameOrigin } from '@/lib/auth/session';
import { ROLES, type Role } from '@/lib/auth/rbac';
import { recordAudit } from '@/server/audit';
import { requireDb } from '@/server/db';

export type PeopleState = { status: 'idle' | 'error' | 'success'; message?: string };

/**
 * Change an account's role.
 *
 * Three rules, and each exists because of a specific way this goes wrong:
 * nobody changes their own role, only a super administrator can make or unmake
 * one, and the before and after are both written to the audit log so a
 * privilege that appeared can always be traced to the person who granted it.
 */
export async function changeUserRole(
  _previous: PeopleState,
  formData: FormData,
): Promise<PeopleState> {
  await assertSameOrigin();

  let session;
  try {
    session = await authorise('admin:manage_users');
  } catch {
    return { status: 'error', message: 'You are not authorised to manage accounts.' };
  }

  const userId = String(formData.get('userId') ?? '');
  const role = String(formData.get('role') ?? '') as Role;

  if (!ROLES.includes(role)) return { status: 'error', message: 'That is not a PALMA role.' };
  if (userId === session.user.id) {
    return { status: 'error', message: 'You cannot change your own role.' };
  }

  const db = requireDb();
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true },
  });

  if (!user) return { status: 'error', message: 'That account does not exist.' };

  const involvesSuperAdmin = role === 'super_admin' || user.role === 'super_admin';
  if (involvesSuperAdmin && session.user.role !== 'super_admin') {
    return {
      status: 'error',
      message: 'Only a super administrator can grant or remove that role.',
    };
  }

  if (user.role === role)
    return { status: 'error', message: 'That is already the account’s role.' };

  await db.user.update({ where: { id: user.id }, data: { role } });

  await recordAudit({
    action: 'user.role_changed',
    entityType: 'User',
    entityId: user.id,
    actor: { id: session.user.id, role: session.user.role, label: session.user.email },
    summary: `${user.email}: ${user.role} → ${role}`,
    before: { role: user.role },
    after: { role },
  });

  revalidatePath('/admin/users');
  return { status: 'success', message: `${user.email} is now ${role.replace('_', ' ')}.` };
}

/**
 * Suspend or restore an account.
 *
 * Suspension is reversible and immediate: every session is revoked in the same
 * transaction, because an account that is suspended but still signed in
 * somewhere is not suspended.
 */
export async function setAccountState(
  _previous: PeopleState,
  formData: FormData,
): Promise<PeopleState> {
  await assertSameOrigin();

  let session;
  try {
    session = await authorise('admin:enforce');
  } catch {
    return { status: 'error', message: 'You are not authorised to suspend accounts.' };
  }

  const userId = String(formData.get('userId') ?? '');
  const suspend = formData.get('suspend') === 'true';
  const reason = String(formData.get('reason') ?? '').trim();

  if (userId === session.user.id) {
    return { status: 'error', message: 'You cannot suspend your own account.' };
  }
  if (suspend && reason.length < 10) {
    return { status: 'error', message: 'A suspension has to carry a reason.' };
  }

  const db = requireDb();
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true, isActive: true },
  });

  if (!user) return { status: 'error', message: 'That account does not exist.' };
  if (user.role === 'super_admin' && session.user.role !== 'super_admin') {
    return { status: 'error', message: 'Only a super administrator can do that.' };
  }

  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { isActive: !suspend } });

    if (suspend) {
      await tx.authSession.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      await tx.moderationAction.create({
        data: {
          actorId: session.user.id,
          kind: 'profile_suspended',
          entityType: 'User',
          entityId: user.id,
          rationale: reason,
        },
      });
    }
  });

  await recordAudit({
    action: suspend ? 'user.suspended' : 'user.restored',
    entityType: 'User',
    entityId: user.id,
    actor: { id: session.user.id, role: session.user.role, label: session.user.email },
    summary: suspend ? `${user.email} suspended: ${reason}` : `${user.email} restored`,
    before: { isActive: user.isActive },
    after: { isActive: !suspend },
  });

  revalidatePath('/admin/users');
  revalidatePath('/admin/enforcement');
  return {
    status: 'success',
    message: suspend
      ? `${user.email} suspended and signed out everywhere.`
      : `${user.email} restored.`,
  };
}

/** End every session an account holds, without suspending it. */
export async function revokeSessions(
  _previous: PeopleState,
  formData: FormData,
): Promise<PeopleState> {
  await assertSameOrigin();

  let session;
  try {
    session = await authorise('admin:manage_users');
  } catch {
    return { status: 'error', message: 'You are not authorised to do that.' };
  }

  const userId = String(formData.get('userId') ?? '');
  const db = requireDb();
  const user = await db.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!user) return { status: 'error', message: 'That account does not exist.' };

  const { count } = await db.authSession.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  await recordAudit({
    action: 'user.sessions_revoked',
    entityType: 'User',
    entityId: userId,
    actor: { id: session.user.id, role: session.user.role, label: session.user.email },
    summary: `${count} session${count === 1 ? '' : 's'} revoked for ${user.email}`,
  });

  revalidatePath('/admin/users');
  return { status: 'success', message: `Signed ${user.email} out of ${count} session(s).` };
}

/**
 * Propose an irreversible action.
 *
 * A permanent ban and the revocation of an honour are the two things PALMA
 * cannot take back cleanly, so neither is one person's decision made at speed.
 * This records the proposal and the reason; a *different* administrator
 * executes it.
 */
export async function proposeConsequentialAction(
  _previous: PeopleState,
  formData: FormData,
): Promise<PeopleState> {
  await assertSameOrigin();

  let session;
  try {
    session = await authorise('admin:enforce');
  } catch {
    return { status: 'error', message: 'You are not authorised to propose that.' };
  }

  const kind = String(formData.get('kind') ?? '');
  const entityId = String(formData.get('entityId') ?? '').trim();
  const subject = String(formData.get('subject') ?? '').trim();
  const reason = String(formData.get('reason') ?? '').trim();

  if (kind !== 'account_ban' && kind !== 'honour_revocation') {
    return { status: 'error', message: 'Choose what is being proposed.' };
  }
  if (!entityId || !subject) return { status: 'error', message: 'Name what this concerns.' };
  if (reason.length < 20) {
    return { status: 'error', message: 'An irreversible action needs a reason of real substance.' };
  }

  const db = requireDb();
  const proposal = await db.consequentialAction.create({
    data: {
      kind,
      entityType: kind === 'account_ban' ? 'User' : 'Honour',
      entityId,
      subject,
      reason,
      requestedById: session.user.id,
    },
  });

  await recordAudit({
    action: 'action.proposed',
    entityType: 'ConsequentialAction',
    entityId: proposal.id,
    actor: { id: session.user.id, role: session.user.role, label: session.user.email },
    summary: `${kind.replace('_', ' ')} proposed for ${subject}`,
    after: { reason },
  });

  revalidatePath('/admin/enforcement');
  return {
    status: 'success',
    message: 'Proposed. A second administrator has to approve it before anything happens.',
  };
}

/**
 * Approve and execute — or cancel — a proposal.
 *
 * The approver may not be the proposer. That is the whole mechanism, and it is
 * checked here rather than hidden in the interface.
 */
export async function decideConsequentialAction(
  _previous: PeopleState,
  formData: FormData,
): Promise<PeopleState> {
  await assertSameOrigin();

  let session;
  try {
    session = await authorise('admin:enforce');
  } catch {
    return { status: 'error', message: 'You are not authorised to do that.' };
  }

  const id = String(formData.get('actionId') ?? '');
  const decision = String(formData.get('decision') ?? '');

  const db = requireDb();
  const proposal = await db.consequentialAction.findUnique({ where: { id } });

  if (!proposal) return { status: 'error', message: 'That proposal does not exist.' };
  if (proposal.executedAt || proposal.cancelledAt) {
    return { status: 'error', message: 'That proposal has already been settled.' };
  }

  if (decision === 'cancel') {
    await db.consequentialAction.update({
      where: { id },
      data: { cancelledAt: new Date(), cancelledReason: 'Cancelled before execution.' },
    });

    await recordAudit({
      action: 'action.cancelled',
      entityType: 'ConsequentialAction',
      entityId: id,
      actor: { id: session.user.id, role: session.user.role, label: session.user.email },
      summary: `${proposal.kind.replace('_', ' ')} for ${proposal.subject} cancelled`,
    });

    revalidatePath('/admin/enforcement');
    return { status: 'success', message: 'Proposal cancelled. Nothing was done.' };
  }

  if (proposal.requestedById === session.user.id) {
    return {
      status: 'error',
      message:
        'You proposed this. A second administrator has to approve it — that is the point of the rule.',
    };
  }

  const now = new Date();

  await db.$transaction(async (tx) => {
    if (proposal.kind === 'account_ban') {
      await tx.user.update({ where: { id: proposal.entityId }, data: { isActive: false } });
      await tx.authSession.updateMany({
        where: { userId: proposal.entityId, revokedAt: null },
        data: { revokedAt: now },
      });
      await tx.moderationAction.create({
        data: {
          actorId: session.user.id,
          kind: 'creator_banned',
          entityType: 'User',
          entityId: proposal.entityId,
          rationale: proposal.reason,
        },
      });
    } else {
      await tx.honour.update({
        where: { id: proposal.entityId },
        data: { state: 'revoked', revokedAt: now, revokedReason: proposal.reason },
      });
      await tx.achievement.updateMany({
        where: { honourId: proposal.entityId },
        data: { state: 'revoked', revokedAt: now },
      });
      await tx.moderationAction.create({
        data: {
          actorId: session.user.id,
          kind: 'honour_revoked',
          entityType: 'Honour',
          entityId: proposal.entityId,
          rationale: proposal.reason,
        },
      });
    }

    await tx.consequentialAction.update({
      where: { id },
      data: { approvedById: session.user.id, approvedAt: now, executedAt: now },
    });
  });

  await recordAudit({
    action: 'action.approved',
    entityType: 'ConsequentialAction',
    entityId: id,
    actor: { id: session.user.id, role: session.user.role, label: session.user.email },
    summary: `${proposal.kind.replace('_', ' ')} for ${proposal.subject} executed on a second approval`,
    after: { reason: proposal.reason },
  });

  revalidatePath('/admin/enforcement');
  revalidatePath('/paroh');
  return { status: 'success', message: 'Approved and carried out. Both names are on the record.' };
}
