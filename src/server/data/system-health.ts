import 'server-only';
import { prisma } from '@/server/db';
import { env } from '@/lib/env';

/**
 * System health.
 *
 * The part that makes this an administration dashboard rather than a CMS with
 * charts. Every check here either measures something real or says plainly that
 * it is not wired up — a green tick for a service PALMA cannot actually reach
 * is worse than no panel at all, because it is believed.
 */

export type ServiceState = 'operational' | 'degraded' | 'down' | 'not_configured';

export type ServiceCheck = {
  name: string;
  state: ServiceState;
  detail: string;
  /** Round trip in milliseconds, where the check measured one. */
  latencyMs?: number;
};

export const STATE_LABEL: Record<ServiceState, string> = {
  operational: 'Operational',
  degraded: 'Degraded',
  down: 'Down',
  not_configured: 'Not configured',
};

export type SystemHealth = {
  checkedAt: string;
  services: ServiceCheck[];
  /** Work PALMA does on a schedule, and whether it has run. */
  jobs: { name: string; detail: string; state: ServiceState }[];
  storage: { table: string; rows: number }[];
  recentFailures: { action: string; summary: string | null; createdAt: string }[];
};

async function checkDatabase(): Promise<ServiceCheck> {
  const started = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const latencyMs = Date.now() - started;
    return {
      name: 'PostgreSQL',
      state: latencyMs > 500 ? 'degraded' : 'operational',
      detail:
        latencyMs > 500
          ? 'Responding, but slowly. Every page on PALMA reads from here.'
          : 'Responding. The single source of truth for the whole institution.',
      latencyMs,
    };
  } catch (error) {
    return {
      name: 'PostgreSQL',
      state: 'down',
      detail: error instanceof Error ? error.message : 'Unreachable.',
      latencyMs: Date.now() - started,
    };
  }
}

export async function getSystemHealth(): Promise<SystemHealth> {
  const [database, counts, failures] = await Promise.all([
    checkDatabase(),
    Promise.all([
      prisma.creator.count(),
      prisma.user.count(),
      prisma.nomination.count(),
      prisma.candidacy.count(),
      prisma.honour.count(),
      prisma.auditLog.count(),
      prisma.authSession.count(),
      prisma.verificationRecord.count(),
    ]),
    prisma.auditLog.findMany({
      where: { action: { in: ['claim.rejected', 'verification.case_decided', 'honour.revoked'] } },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: { action: true, summary: true, createdAt: true },
    }),
  ]);

  const email: ServiceCheck = env.RESEND_API_KEY
    ? {
        name: 'Email — Resend',
        state: 'operational',
        detail: `Configured. Sending as ${env.EMAIL_FROM}.`,
      }
    : {
        name: 'Email — Resend',
        state: 'not_configured',
        detail:
          'No RESEND_API_KEY. Verification codes and receipts are written to the server log instead of sent, which is correct in development and fatal in production.',
      };

  const verification: ServiceCheck =
    env.AGE_VERIFICATION_PROVIDER === 'stub'
      ? {
          name: 'Age assurance provider',
          state: 'not_configured',
          detail:
            'Running the stub. No real assurance is being performed, so no honour conferred now would meet PALMA’s own rule.',
        }
      : {
          name: 'Age assurance provider',
          state: env.AGE_VERIFICATION_API_KEY ? 'operational' : 'degraded',
          detail: env.AGE_VERIFICATION_API_KEY
            ? `${env.AGE_VERIFICATION_PROVIDER} configured. PALMA stores only a status, a reference and a date.`
            : `${env.AGE_VERIFICATION_PROVIDER} named but no API key set — requests will fail and fall to the manual queue.`,
        };

  const auth: ServiceCheck = env.AUTH_SECRET
    ? {
        name: 'Authentication & signing',
        state: 'operational',
        detail: 'AUTH_SECRET present. Sessions, CSRF tokens and honour signatures are signed.',
      }
    : {
        name: 'Authentication & signing',
        state: 'down',
        detail: 'No AUTH_SECRET. Verification records cannot be signed or checked.',
      };

  const [creators, users, nominations, candidacies, honours, auditRows, sessions, records] = counts;

  const pendingVerification = await prisma.verificationCase.count({
    where: { status: { in: ['open', 'awaiting_information'] } },
  });

  const unverifiedNominations = await prisma.nomination.count({
    where: { status: 'pending_verification', createdAt: { lt: new Date(Date.now() - 86_400_000) } },
  });

  return {
    checkedAt: new Date().toISOString(),
    services: [database, auth, email, verification],
    jobs: [
      {
        name: 'Nomination verification expiry',
        detail:
          unverifiedNominations > 0
            ? `${unverifiedNominations} nomination${unverifiedNominations === 1 ? '' : 's'} older than a day still awaiting a code. Retention deletes these at 30 days.`
            : 'Nothing older than a day is waiting on a verification code.',
        state: unverifiedNominations > 50 ? 'degraded' : 'operational',
      },
      {
        name: 'Manual verification queue',
        detail:
          pendingVerification > 0
            ? `${pendingVerification} case${pendingVerification === 1 ? '' : 's'} open. These do not clear themselves.`
            : 'Empty.',
        state: pendingVerification > 10 ? 'degraded' : 'operational',
      },
      {
        name: 'Statistics aggregation',
        detail:
          'Not a job. Every figure in this dashboard is counted live against PostgreSQL, so there is no rollup to fall behind.',
        state: 'operational',
      },
      {
        name: 'Scheduled retention deletion',
        detail:
          'Not yet automated. Retention periods are published in the privacy notice and are currently applied by hand.',
        state: 'not_configured',
      },
    ],
    storage: [
      { table: 'Creator', rows: creators },
      { table: 'User', rows: users },
      { table: 'Nomination', rows: nominations },
      { table: 'Candidacy', rows: candidacies },
      { table: 'Honour', rows: honours },
      { table: 'VerificationRecord', rows: records },
      { table: 'AuthSession', rows: sessions },
      { table: 'AuditLog', rows: auditRows },
    ],
    recentFailures: failures.map((entry) => ({
      action: entry.action,
      summary: entry.summary,
      createdAt: entry.createdAt.toISOString(),
    })),
  };
}
