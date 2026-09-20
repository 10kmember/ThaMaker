import { PortalShell } from '@/components/palma/PortalShell';
import { Empty } from '@/components/desk/surface';
import { JudgeOverview } from '@/components/desk/JudgeOverview';
import { buildMetadata } from '@/lib/seo';
import { requirePermission } from '@/lib/auth/guards';
import { getJudgeOverview } from '@/server/data/judging';
import { JUDGING_NAV, greeting } from '@/lib/judging-nav';
import { formatDate, formatShortDate } from '@/lib/format';
import { MIN_JUDGES_PER_CANDIDACY } from '@/domain/selection';
import { Gavel } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Judging',
  description: 'The PALMA judging room.',
  path: '/judge',
  noIndex: true,
});

export default async function JudgingOverviewPage() {
  const session = await requirePermission('judging:view_assignments', '/judge');
  const overview = session.user.judgeId
    ? await getJudgeOverview(session.user.judgeId, session.user.id)
    : null;

  if (!overview) {
    return (
      <PortalShell title="PALMA Judging" session={session} desk="judge">
        <Empty
          icon={Gavel}
          title="No panel membership"
          description="This account is not currently seated on a PALMA panel."
        />
      </PortalShell>
    );
  }

  const firstName = overview.judgeName.split(' ')[0] ?? overview.judgeName;

  return (
    <PortalShell
      title="PALMA Judging"
      subtitle={overview.season.title}
      nav={JUDGING_NAV}
      activeHref="/judge"
      session={session}
      desk="judge"
    >
      <JudgeOverview
        greeting={greeting()}
        firstName={firstName}
        counts={overview.counts}
        season={{
          title: overview.season.title,
          daysRemaining: overview.season.daysRemaining,
          closesAt: overview.season.closesAt ? formatDate(overview.season.closesAt) : null,
        }}
        categories={overview.categories}
        notifications={overview.notifications.map((notification) => ({
          id: notification.id,
          subject: notification.subject,
          body: notification.body,
          when: formatShortDate(notification.createdAt),
          href: notification.href,
        }))}
        isChair={overview.isChair}
        minJudges={MIN_JUDGES_PER_CANDIDACY}
      />
    </PortalShell>
  );
}
