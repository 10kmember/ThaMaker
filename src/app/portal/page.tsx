import { buildMetadata } from '@/lib/seo';
import { requirePermission } from '@/lib/auth/guards';
import { can } from '@/lib/auth/rbac';
import { getQueueCounts } from '@/server/data/operations';
import { recentActivity } from '@/server/data/people';
import { greeting } from '@/lib/judging-nav';
import { formatShortDate } from '@/lib/format';
import { PortalOverview } from '@/components/desk/PortalOverview';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Moderation',
  description: 'The PALMA moderation queues.',
  path: '/portal',
  noIndex: true,
});

export default async function ModerationOverviewPage() {
  const session = await requirePermission('operations:view_dashboard', '/portal');
  const [queues, activity] = await Promise.all([getQueueCounts(), recentActivity(8)]);

  const firstName = session.user.name.split(' ')[0] ?? session.user.name;

  const work = [
    {
      href: '/portal/claims',
      label: 'Creator claim requests',
      count: queues.claims,
      note: 'People asking to control a PALMA record.',
      visible: can(session.user.role, 'claims:review'),
    },
    {
      href: '/portal/verification',
      label: 'Manual age verification',
      count: queues.verification,
      note: 'Cases the provider could not settle.',
      visible: can(session.user.role, 'verification:review_manual'),
    },
    {
      href: '/portal/reports',
      label: 'Reports',
      count: queues.reports,
      note: 'Open and under investigation.',
      visible: can(session.user.role, 'moderation:view_reports'),
    },
    {
      href: '/portal/claims?filter=escalated',
      label: 'Escalations',
      count: queues.escalations,
      note: 'Handed up for an administrator.',
      visible: can(session.user.role, 'claims:review'),
    },
    {
      href: '/portal/creators?filter=unpublished',
      label: 'Records awaiting publication',
      count: queues.unpublishedRecords,
      note: 'Written by PALMA, not yet public.',
      visible: can(session.user.role, 'editorial:edit_creator'),
    },
  ].filter((item) => item.visible);

  return (
    <PortalOverview
      greeting={greeting()}
      firstName={firstName}
      work={work.map(({ href, label, count, note }) => ({ href, label, count, note }))}
      activity={activity.map((entry) => ({
        id: entry.id,
        when: formatShortDate(entry.createdAt),
        title: entry.action.replace(/[._]/g, ' '),
        detail: entry.summary ?? `${entry.entityType} ${entry.entityId}`,
      }))}
    />
  );
}
