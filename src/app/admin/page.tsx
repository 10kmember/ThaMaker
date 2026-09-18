import { Suspense } from 'react';
import Link from 'next/link';
import { Notice } from '@/components/ui/feedback';
import { StatGrid } from '@/components/admin/StatGrid';
import { StatGridSkeleton } from '@/components/admin/Skeletons';
import { PeriodFilter } from '@/components/admin/PeriodFilter';
import { AdvanceSeasonForm } from '@/components/admin/AdminForms';
import { buildMetadata } from '@/lib/seo';
import { requirePermission } from '@/lib/auth/guards';
import { can, type Role } from '@/lib/auth/rbac';
import {
  getCommandCentre,
  isPeriod,
  PERIOD_LABEL,
  type Period,
} from '@/server/data/command-centre';
import { getSystemHealth } from '@/server/data/system-health';
import { greeting } from '@/lib/judging-nav';
import { STAGE_LABEL, type SeasonStage } from '@/domain/season';
import { formatDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Command centre',
  description: 'PALMA administration.',
  path: '/admin',
  noIndex: true,
});

export default async function CommandCentrePage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const session = await requirePermission('admin:view_dashboard', '/admin');
  const { period: raw } = await searchParams;
  const period = isPeriod(raw) ? raw : '30d';

  const firstName = session.user.name.split(' ')[0] ?? session.user.name;

  // The greeting and the period filter do not wait on a single count. The
  // figures stream in behind them, shaped by skeletons so nothing reflows.
  return (
    <>
      <div className="flex flex-col gap-3">
        <span className="palma-label text-taupe-deep">Command centre</span>
        <h1 className="text-4xl">
          {greeting()}, {firstName}.
        </h1>
        <p className="text-taupe-deep max-w-160 leading-relaxed">
          Figures below cover{' '}
          <strong className="text-ink">{PERIOD_LABEL[period].toLowerCase()}</strong>.
        </p>
      </div>

      <div className="border-stone-deep mt-10 border-b pb-5">
        <PeriodFilter period={period} basePath="/admin" />
      </div>

      <Suspense
        fallback={
          <div className="mt-12 flex flex-col gap-14">
            <StatGridSkeleton title="Creators" count={8} />
            <StatGridSkeleton title="Awards" count={6} />
            <StatGridSkeleton title="Operations" count={6} />
            <StatGridSkeleton title="Platform" count={6} />
          </div>
        }
      >
        <Figures period={period} role={session.user.role} />
      </Suspense>
    </>
  );
}

async function Figures({ period, role }: { period: Period; role: Role }) {
  const [centre, health] = await Promise.all([
    getCommandCentre(period),
    can(role, 'admin:manage_system') ? getSystemHealth() : Promise.resolve(null),
  ]);

  const { creators, awards, operations, platform } = centre;

  const outstanding =
    operations.openClaims +
    operations.escalations +
    operations.verificationQueue +
    operations.reports;

  const degraded = health?.services.filter((service) => service.state !== 'operational') ?? [];

  return (
    <>
      <p className="text-taupe-deep mt-10 max-w-160 leading-relaxed">
        {outstanding === 0
          ? 'Nothing is waiting on a person across the institution.'
          : `${outstanding} item${outstanding === 1 ? '' : 's'} across the queues need a decision.`}
        {centre.since ? ` Counted since ${formatDate(centre.since)}.` : ''}
      </p>

      {degraded.length > 0 ? (
        <Notice tone="warning" title="A service is not healthy" className="mt-8">
          {degraded.map((service) => service.name).join(', ')},{' '}
          <Link href="/admin/health" className="palma-link text-ink">
            system health
          </Link>
          .
        </Notice>
      ) : null}

      <div className="mt-12 flex flex-col gap-14">
        <StatGrid
          title="Creators"
          stats={[
            { label: 'Total records', value: creators.total, href: '/portal/creators' },
            { label: 'Added', value: creators.added, note: PERIOD_LABEL[period] },
            {
              label: 'Claimed',
              value: creators.claimed,
              href: '/portal/creators?filter=claimed',
            },
            {
              label: 'Unclaimed',
              value: creators.unclaimed,
              href: '/portal/creators?filter=unclaimed',
            },
            { label: 'Verified', value: creators.verified },
            {
              label: 'Verification pending',
              value: creators.verificationPending,
              tone: 'attention',
            },
            {
              label: 'Unpublished',
              value: creators.unpublished,
              href: '/portal/creators?filter=unpublished',
            },
            { label: 'Suspended', value: creators.suspended, tone: 'attention' },
          ]}
        />

        {awards ? (
          <StatGrid
            title={`Awards, ${awards.seasonTitle}, ${STAGE_LABEL[awards.stage as SeasonStage]}`}
            stats={[
              { label: 'Categories', value: awards.categories },
              { label: 'Nominations', value: awards.nominations, href: '/portal/nominations' },
              { label: 'Eligible', value: awards.eligible },
              { label: 'Finalists', value: awards.finalists, href: '/admin/selection' },
              { label: 'Winners', value: awards.winners, href: '/admin/selection' },
              {
                label: 'Awaiting finalisation',
                value: awards.awaitingFinalisation,
                note: 'Scored, no honour conferred',
                tone: 'attention',
                href: '/admin/selection',
              },
            ]}
          />
        ) : (
          <Notice tone="warning" title="No current season">
            No season is marked current. The queues still work; the season figures do not.
          </Notice>
        )}

        <StatGrid
          title="Operations"
          stats={[
            {
              label: 'Open claims',
              value: operations.openClaims,
              href: '/portal/claims',
              tone: 'attention',
            },
            {
              label: 'Escalations',
              value: operations.escalations,
              href: '/portal/claims?filter=escalated',
              tone: 'attention',
            },
            {
              label: 'Verification queue',
              value: operations.verificationQueue,
              href: '/portal/verification',
              tone: 'attention',
            },
            {
              label: 'Reports',
              value: operations.reports,
              href: '/portal/reports',
              tone: 'attention',
            },
            {
              label: 'Declared conflicts',
              value: operations.openConflicts,
              href: '/admin/judging',
            },
            {
              label: 'Assessments outstanding',
              value: operations.unassignedJudging,
              href: '/admin/judging',
            },
          ]}
        />

        <StatGrid
          title="Platform"
          stats={[
            { label: 'Accounts', value: platform.accounts, href: '/admin/users' },
            { label: 'New accounts', value: platform.newAccounts, note: PERIOD_LABEL[period] },
            { label: 'Active sessions', value: platform.activeSessions },
            {
              label: 'Nomination activity',
              value: platform.nominationActivity,
              note: PERIOD_LABEL[period],
            },
            { label: 'Claim activity', value: platform.claimActivity, note: PERIOD_LABEL[period] },
            {
              label: 'Audited events',
              value: platform.auditEvents,
              note: PERIOD_LABEL[period],
              href: '/admin/audit',
            },
          ]}
        />
      </div>

      {awards && can(role, 'admin:manage_seasons') ? (
        <section className="border-stone-deep mt-16 border-t pt-10">
          <h3 className="palma-label text-taupe-deep mb-6">Advance the season</h3>
          <div className="max-w-140">
            <AdvanceSeasonForm stage={awards.stage as SeasonStage} year={awards.seasonYear} />
          </div>
        </section>
      ) : null}
    </>
  );
}
