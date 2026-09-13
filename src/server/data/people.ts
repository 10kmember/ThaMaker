import 'server-only';
import { prisma } from '@/server/db';
import type { Role } from '@/lib/auth/rbac';

/**
 * Accounts, as distinct from creators.
 *
 *     User ≠ Creator
 *
 * A user is somebody who signs in. A creator is a record in the archive. One
 * may hold the other, and most do not: PALMA has creators with no account at
 * all, and staff accounts attached to no creator. Managing them on one screen
 * would quietly merge two things the institution keeps apart.
 */

export type AccountSummary = {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  activeSessions: number;
  /** The creator record this account holds, if any. */
  creator: { slug: string; displayName: string } | null;
  isJudge: boolean;
};

export async function listAccounts(filter?: {
  query?: string;
  role?: Role;
  state?: 'active' | 'suspended';
}): Promise<AccountSummary[]> {
  const rows = await prisma.user.findMany({
    where: {
      ...(filter?.query
        ? {
            OR: [
              { email: { contains: filter.query, mode: 'insensitive' as const } },
              { name: { contains: filter.query, mode: 'insensitive' as const } },
            ],
          }
        : {}),
      ...(filter?.role ? { role: filter.role } : {}),
      ...(filter?.state === 'active' ? { isActive: true } : {}),
      ...(filter?.state === 'suspended' ? { isActive: false } : {}),
    },
    include: {
      creator: { select: { slug: true, displayName: true } },
      judge: { select: { id: true } },
      sessions: {
        where: { revokedAt: null, expiresAt: { gt: new Date() } },
        select: { id: true },
      },
    },
    orderBy: [{ role: 'asc' }, { createdAt: 'desc' }],
    take: 200,
  });

  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role as Role,
    isActive: row.isActive,
    emailVerified: Boolean(row.emailVerifiedAt),
    createdAt: row.createdAt.toISOString(),
    lastLoginAt: row.lastLoginAt?.toISOString() ?? null,
    activeSessions: row.sessions.length,
    creator: row.creator,
    isJudge: Boolean(row.judge),
  }));
}

export type PendingAction = {
  id: string;
  kind: string;
  subject: string;
  reason: string;
  requestedBy: string;
  requestedAt: string;
  approvedBy: string | null;
  executedAt: string | null;
  cancelledAt: string | null;
};

export async function listConsequentialActions(
  scope: 'pending' | 'all' = 'pending',
): Promise<PendingAction[]> {
  const rows = await prisma.consequentialAction.findMany({
    where: scope === 'pending' ? { executedAt: null, cancelledAt: null } : undefined,
    include: {
      requestedBy: { select: { email: true } },
      approvedBy: { select: { email: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 60,
  });

  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    subject: row.subject,
    reason: row.reason,
    requestedBy: row.requestedBy.email,
    requestedAt: row.createdAt.toISOString(),
    approvedBy: row.approvedBy?.email ?? null,
    executedAt: row.executedAt?.toISOString() ?? null,
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
  }));
}

export type EnforcementRecord = {
  id: string;
  kind: string;
  entityType: string;
  entityId: string;
  rationale: string;
  actor: string;
  createdAt: string;
};

export async function listEnforcement(): Promise<EnforcementRecord[]> {
  const rows = await prisma.moderationAction.findMany({
    include: { actor: { select: { email: true } } },
    orderBy: { createdAt: 'desc' },
    take: 60,
  });

  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    entityType: row.entityType,
    entityId: row.entityId,
    rationale: row.rationale,
    actor: row.actor.email,
    createdAt: row.createdAt.toISOString(),
  }));
}

// ── Global search ────────────────────────────────────────────────────────────

export type SearchHit = {
  kind: 'Creator' | 'Account' | 'Claim' | 'Verification case' | 'Honour' | 'Audit';
  title: string;
  detail: string;
  href: string;
};

/**
 * One search across the institution.
 *
 * Only possible because there is one record per thing: a creator is a Creator
 * row wherever you meet them, so searching a name reaches their record, the
 * account that holds it, their claims, their cases and the audit trail of all
 * of it at once.
 */
export async function searchEverything(query: string): Promise<SearchHit[]> {
  const term = query.trim();
  if (term.length < 2) return [];

  const contains = { contains: term, mode: 'insensitive' as const };

  const [creators, accounts, claims, cases, achievements, audit] = await Promise.all([
    prisma.creator.findMany({
      where: { OR: [{ displayName: contains }, { slug: contains }] },
      select: { slug: true, displayName: true, countryCode: true, userId: true },
      take: 10,
    }),
    prisma.user.findMany({
      where: { OR: [{ email: contains }, { name: contains }] },
      select: { id: true, email: true, name: true, role: true },
      take: 10,
    }),
    prisma.creatorClaim.findMany({
      where: {
        OR: [
          { reference: contains },
          { creator: { displayName: contains } },
          { user: { email: contains } },
        ],
      },
      select: {
        id: true,
        reference: true,
        status: true,
        creator: { select: { displayName: true } },
      },
      take: 10,
    }),
    prisma.verificationCase.findMany({
      where: { OR: [{ reference: contains }, { creator: { displayName: contains } }] },
      select: {
        id: true,
        reference: true,
        status: true,
        creator: { select: { displayName: true, slug: true } },
      },
      take: 10,
    }),
    prisma.achievement.findMany({
      where: { OR: [{ code: contains }, { creatorName: contains }] },
      select: { code: true, creatorName: true, categoryName: true, year: true, kind: true },
      take: 10,
    }),
    prisma.auditLog.findMany({
      where: { OR: [{ summary: contains }, { actorLabel: contains }, { entityId: term }] },
      select: { id: true, action: true, summary: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  return [
    ...creators.map<SearchHit>((creator) => ({
      kind: 'Creator',
      title: creator.displayName,
      detail: `${creator.countryCode} · ${creator.userId ? 'claimed' : 'unclaimed'}`,
      href: `/admin/creators/${creator.slug}`,
    })),
    ...accounts.map<SearchHit>((account) => ({
      kind: 'Account',
      title: account.email,
      detail: `${account.name} · ${account.role.replace('_', ' ')}`,
      href: `/admin/users?q=${encodeURIComponent(account.email)}`,
    })),
    ...claims.map<SearchHit>((claim) => ({
      kind: 'Claim',
      title: claim.reference,
      detail: `${claim.creator.displayName} · ${claim.status.replace('_', ' ')}`,
      href: `/admin/claims/${claim.id}`,
    })),
    ...cases.map<SearchHit>((entry) => ({
      kind: 'Verification case',
      title: entry.reference,
      detail: `${entry.creator.displayName} · ${entry.status.replace('_', ' ')}`,
      href: `/admin/creators/${entry.creator.slug}`,
    })),
    ...achievements.map<SearchHit>((achievement) => ({
      kind: 'Honour',
      title: achievement.code,
      detail: `${achievement.creatorName} · ${achievement.kind} · ${achievement.categoryName} ${achievement.year}`,
      href: `/verify/${achievement.code}`,
    })),
    ...audit.map<SearchHit>((entry) => ({
      kind: 'Audit',
      title: entry.action.replace(/[._]/g, ' '),
      detail: entry.summary ?? entry.createdAt.toISOString().slice(0, 10),
      href: '/admin/audit',
    })),
  ];
}

export type ActivityEntry = {
  id: string;
  action: string;
  summary: string | null;
  actor: string | null;
  entityType: string;
  entityId: string;
  createdAt: string;
};

/** The live feed of what PALMA's staff have actually done. */
export async function recentActivity(limit = 40): Promise<ActivityEntry[]> {
  const rows = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      action: true,
      summary: true,
      actorLabel: true,
      entityType: true,
      entityId: true,
      createdAt: true,
    },
  });

  return rows.map((row) => ({
    id: row.id,
    action: row.action,
    summary: row.summary,
    actor: row.actorLabel,
    entityType: row.entityType,
    entityId: row.entityId,
    createdAt: row.createdAt.toISOString(),
  }));
}
