import { Suspense } from 'react';
import { Notice } from '@/components/ui/feedback';
import { StatGridSkeleton } from '@/components/admin/Skeletons';
import { PeriodFilter } from '@/components/admin/PeriodFilter';
import { AdvanceSeasonForm } from '@/components/admin/AdminForms';
import { AdminOverview, type AdminGroupBlock } from '@/components/desk/AdminOverview';
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
import {
  Users,
  Trophy,
  Workflow,
  Monitor,
  UserPlus,
  UserCheck,
  UserX,
  ShieldCheck,
  Hourglass,
  EyeOff,
  Ban,
  Layers,
  ScrollText,
  CheckCircle2,
  Medal,
  Crown,
  Stamp,
  FileCheck,
  AlertTriangle,
  Flag,
  Scale,
  ClipboardList,
  KeyRound,
  Activity,
  Send,
  BookOpen,
} from 'lucide-react';

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

  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-14">
          <StatGridSkeleton title="Creators" count={8} />
          <StatGridSkeleton title="Awards" count={6} />
          <StatGridSkeleton title="Operations" count={6} />
          <StatGridSkeleton title="Platform" count={6} />
        </div>
      }
    >
      <Figures period={period} role={session.user.role} firstName={firstName} />
    </Suspense>
  );
}

async function Figures({
  period,
  role,
  firstName,
}: {
  period: Period;
  role: Role;
  firstName: string;
}) {
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

  const degraded = (health?.services ?? [])
    .filter((service) => service.state !== 'operational')
    .map((service) => service.name);

  const groups: AdminGroupBlock[] = [
    {
      title: 'Creators',
      icon: Users,
      stats: [
        { icon: Layers, label: 'Total records', value: creators.total, href: '/portal/creators' },
        { icon: UserPlus, label: 'Added', value: creators.added, note: PERIOD_LABEL[period] },
        {
          icon: UserCheck,
          label: 'Claimed',
          value: creators.claimed,
          href: '/portal/creators?filter=claimed',
        },
        {
          icon: UserX,
          label: 'Unclaimed',
          value: creators.unclaimed,
          href: '/portal/creators?filter=unclaimed',
        },
        { icon: ShieldCheck, label: 'Verified', value: creators.verified },
        {
          icon: Hourglass,
          label: 'Verification pending',
          value: creators.verificationPending,
          tone: 'attention',
        },
        {
          icon: EyeOff,
          label: 'Unpublished',
          value: creators.unpublished,
          href: '/portal/creators?filter=unpublished',
        },
        { icon: Ban, label: 'Suspended', value: creators.suspended, tone: 'attention' },
      ],
    },
  ];

  if (awards) {
    groups.push({
      title: `Awards: ${awards.seasonTitle}, ${STAGE_LABEL[awards.stage as SeasonStage]}`,
      icon: Trophy,
      stats: [
        { icon: Layers, label: 'Categories', value: awards.categories },
        {
          icon: ScrollText,
          label: 'Nominations',
          value: awards.nominations,
          href: '/portal/nominations',
        },
        { icon: CheckCircle2, label: 'Eligible', value: awards.eligible },
        { icon: Medal, label: 'Finalists', value: awards.finalists, href: '/admin/selection' },
        {
          icon: Crown,
          label: 'Winners',
          value: awards.winners,
          href: '/admin/selection',
          tone: 'accent',
        },
        {
          icon: Stamp,
          label: 'Awaiting finalisation',
          value: awards.awaitingFinalisation,
          note: 'Scored, no honour conferred',
          tone: 'attention',
          href: '/admin/selection',
        },
      ],
    });
  }

  groups.push(
    {
      title: 'Operations',
      icon: Workflow,
      stats: [
        {
          icon: FileCheck,
          label: 'Open claims',
          value: operations.openClaims,
          href: '/portal/claims',
          tone: 'attention',
        },
        {
          icon: AlertTriangle,
          label: 'Escalations',
          value: operations.escalations,
          href: '/portal/claims?filter=escalated',
          tone: 'attention',
        },
        {
          icon: ShieldCheck,
          label: 'Verification queue',
          value: operations.verificationQueue,
          href: '/portal/verification',
          tone: 'attention',
        },
        {
          icon: Flag,
          label: 'Reports',
          value: operations.reports,
          href: '/portal/reports',
          tone: 'attention',
        },
        {
          icon: Scale,
          label: 'Declared conflicts',
          value: operations.openConflicts,
          href: '/admin/judging',
        },
        {
          icon: ClipboardList,
          label: 'Assessments outstanding',
          value: operations.unassignedJudging,
          href: '/admin/judging',
        },
      ],
    },
    {
      title: 'Platform',
      icon: Monitor,
      stats: [
        { icon: Users, label: 'Accounts', value: platform.accounts, href: '/admin/users' },
        {
          icon: UserPlus,
          label: 'New accounts',
          value: platform.newAccounts,
          note: PERIOD_LABEL[period],
        },
        { icon: KeyRound, label: 'Active sessions', value: platform.activeSessions },
        {
          icon: Send,
          label: 'Nomination activity',
          value: platform.nominationActivity,
          note: PERIOD_LABEL[period],
        },
        {
          icon: Activity,
          label: 'Claim activity',
          value: platform.claimActivity,
          note: PERIOD_LABEL[period],
        },
        {
          icon: BookOpen,
          label: 'Audited events',
          value: platform.auditEvents,
          note: PERIOD_LABEL[period],
          href: '/admin/audit',
        },
      ],
    },
  );

  return (
    <>
      <AdminOverview
        greeting={greeting()}
        firstName={firstName}
        periodLabel={PERIOD_LABEL[period]}
        outstanding={outstanding}
        since={centre.since ? formatDate(centre.since) : null}
        degraded={degraded}
        groups={groups}
        filter={<PeriodFilter period={period} basePath="/admin" variant="seg" />}
        seasonLine={
          awards ? `${awards.seasonTitle}, ${STAGE_LABEL[awards.stage as SeasonStage]}` : null
        }
        advance={
          awards && can(role, 'admin:manage_seasons') ? (
            <AdvanceSeasonForm stage={awards.stage as SeasonStage} year={awards.seasonYear} />
          ) : null
        }
      />

      {!awards ? (
        <div className="mt-10">
          <Notice tone="warning" title="No current season">
            No season is marked current. The queues still work; the season figures do not.
          </Notice>
        </div>
      ) : null}
    </>
  );
}
