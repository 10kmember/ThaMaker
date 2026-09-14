import 'server-only';
import { headers } from 'next/headers';
import { hashIdentifier } from '@/lib/crypto';
import { signingSecret } from '@/lib/env';
import { prisma } from '@/server/db';
import type { Role } from '@/lib/auth/rbac';

/**
 * The audited vocabulary. Adding an action here is a deliberate act: if an
 * operation changes the institutional record, it belongs in this list.
 */
export const AUDIT_ACTIONS = [
  'nomination.counted',
  'nomination.rejected',
  'nomination.withdrawn',
  'nominator.blocked',
  'candidacy.created',
  'candidacy.eligibility_changed',
  'candidacy.integrity_flagged',
  'candidacy.evidence_added',
  'judge.assigned',
  'judge.unassigned',
  'judge.conflict_declared',
  'judge.no_conflict_confirmed',
  'judge.conflict_resolved',
  'score.submitted',
  'score.corrected',
  'honour.shortlisted',
  'honour.finalist_selected',
  'honour.winner_selected',
  'honour.revoked',
  'achievement.issued',
  'creator.record_created',
  'creator.record_requested',
  'creator.record_updated',
  'creator.internal_note_added',
  'creator.profile_claimed',
  'creator.profile_updated',
  'creator.verification_updated',
  'claim.requested',
  'claim.information_requested',
  'claim.escalated',
  'claim.approved',
  'claim.rejected',
  'claim.invitation_issued',
  'verification.case_opened',
  'verification.case_decided',
  'verification.media_deleted',
  'moderation.action_taken',
  'report.filed',
  'report.resolved',
  'season.stage_changed',
  'category.created',
  'category.updated',
  'sponsor.created',
  'sponsorship.created',
  'article.published',
  'user.role_changed',
  'user.suspended',
  'user.restored',
  'user.sessions_revoked',
  'action.proposed',
  'action.approved',
  'action.cancelled',
  'user.signed_in',
  'user.signed_out',
  'user.registered',
  'user.wrong_entrance',
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export type AuditActor = {
  id?: string | null;
  role?: Role | null;
  label?: string | null;
};

export type AuditInput = {
  action: AuditAction;
  entityType: string;
  entityId: string;
  actor?: AuditActor;
  summary?: string;
  before?: unknown;
  after?: unknown;
};

/**
 * Append-only. Audit failures must never take down the action being audited,
 * but they are loud in the server log — a silent audit gap is a governance bug.
 */
export async function recordAudit(input: AuditInput): Promise<void> {
  const db = prisma;
  if (!db) return;

  let ipHash: string | null = null;
  let userAgent: string | null = null;
  try {
    const headerList = await headers();
    const forwarded = headerList.get('x-forwarded-for');
    const ip = forwarded?.split(',')[0]?.trim() ?? headerList.get('x-real-ip') ?? '';
    ipHash = ip ? hashIdentifier(ip, signingSecret()) : null;
    userAgent = headerList.get('user-agent')?.slice(0, 255) ?? null;
  } catch {
    // Outside a request scope (scripts, jobs) — metadata is simply absent.
  }

  try {
    await db.auditLog.create({
      data: {
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        actorId: input.actor?.id ?? null,
        actorRole: input.actor?.role ?? null,
        actorLabel: input.actor?.label ?? null,
        summary: input.summary ?? null,
        before: serialise(input.before),
        after: serialise(input.after),
        ipHash,
        userAgent,
      },
    });
  } catch (error) {
    console.error('[palma:audit] failed to write audit entry', input.action, error);
  }
}

function serialise(value: unknown) {
  if (value === undefined || value === null) return undefined;
  return JSON.parse(JSON.stringify(value)) as object;
}
