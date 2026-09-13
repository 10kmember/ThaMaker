import Link from 'next/link';
import { Notice } from '@/components/ui/feedback';
import { Stat } from '@/components/ui/stat';
import { AdvanceSeasonForm } from '@/components/admin/AdminForms';
import { buildMetadata } from '@/lib/seo';
import { getAdminOverview } from '@/server/data/admin';
import { getQueueCounts } from '@/server/data/operations';
import { requirePermission } from '@/lib/auth/guards';
import { can } from '@/lib/auth/rbac';
import { greeting } from '@/lib/judging-nav';
import { STAGE_LABEL, type SeasonStage } from '@/domain/season';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Operations',
  description: 'PALMA operations.',
  path: '/admin',
  noIndex: true,
});

export default async function OperationsPage() {
  const session = await requirePermission('admin:view_dashboard', '/admin');
  const [queues, overview] = await Promise.all([getQueueCounts(), getAdminOverview()]);

  const firstName = session.user.name.split(' ')[0] ?? session.user.name;

  const needsAttention = [
    {
      href: '/admin/claims',
      label: 'Creator claim requests',
      count: queues.claims,
      note: 'People asking to control a PALMA record.',
      visible: can(session.user.role, 'claims:review'),
    },
    {
      href: '/admin/verification',
      label: 'Manual age verification cases',
      count: queues.verification,
      note: 'Cases the provider could not settle.',
      visible: can(session.user.role, 'verification:review_manual'),
    },
    {
      href: '/admin/creators?filter=unpublished',
      label: 'Records awaiting publication',
      count: queues.unpublishedRecords,
      note: 'Written by PALMA, not yet public.',
      visible: can(session.user.role, 'editorial:edit_creator'),
    },
    {
      href: '/admin/moderation',
      label: 'Reports',
      count: queues.reports,
      note: 'Open and under investigation.',
      visible: can(session.user.role, 'moderation:view_reports'),
    },
    {
      href: '/admin/claims?filter=escalated',
      label: 'Escalations',
      count: queues.escalations,
      note: 'Handed up for an administrator.',
      visible: can(session.user.role, 'claims:review'),
    },
  ].filter((item) => item.visible);

  const outstanding = needsAttention.reduce((sum, item) => sum + item.count, 0);

  return (
    <>
      <div className="flex flex-col gap-3">
        <span className="palma-label text-taupe-deep">PALMA Operations</span>
        <h2 className="text-4xl">
          {greeting()}, {firstName}.
        </h2>
        <p className="text-taupe-deep max-w-140 leading-relaxed">
          {outstanding === 0
            ? 'Nothing is waiting on a person. The queues are clear.'
            : `${outstanding} item${outstanding === 1 ? '' : 's'} need a decision.`}
        </p>
      </div>

      <section className="mt-12">
        <h3 className="palma-label text-taupe-deep border-stone-deep border-b pb-4">
          Needs attention
        </h3>

        <ul className="flex flex-col">
          {needsAttention.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="palma-row border-stone-deep flex flex-wrap items-baseline gap-x-6 gap-y-2 border-b py-5"
              >
                <span
                  className={cn(
                    'font-display w-14 shrink-0 text-4xl tabular-nums',
                    item.count > 0 ? 'text-ink' : 'text-stone-deep',
                  )}
                >
                  {item.count}
                </span>
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="palma-row-lead font-display text-xl">{item.label}</span>
                  <span className="text-taupe text-sm">{item.note}</span>
                </span>
                <span aria-hidden="true" className="text-taupe ml-auto shrink-0">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>

        {needsAttention.length === 0 ? (
          <p className="text-taupe mt-6 text-sm">
            Your role holds no queue permissions. Nothing here needs you.
          </p>
        ) : null}
      </section>

      {overview ? (
        <section className="mt-16">
          <div className="border-stone-deep flex flex-wrap items-baseline justify-between gap-4 border-b pb-4">
            <h3 className="palma-label text-taupe-deep">The season</h3>
            <span className="palma-label text-taupe">
              {overview.seasonTitle} · {STAGE_LABEL[overview.stage as SeasonStage]}
            </span>
          </div>

          <div className="mt-8 grid gap-8 sm:grid-cols-3 lg:grid-cols-6">
            <Stat label="Nominations" value={overview.counts.nominations} />
            <Stat label="Under review" value={overview.counts.underReview} />
            <Stat label="Eligible" value={overview.counts.eligible} />
            <Stat label="Judging" value={overview.counts.judging} />
            <Stat label="Finalists" value={overview.counts.finalists} />
            <Stat label="Winners" value={overview.counts.winners} />
          </div>

          <div className="border-stone-deep mt-10 grid gap-8 border-t pt-10 sm:grid-cols-3">
            <Stat label="Creator records" value={overview.counts.creators} />
            <Stat label="Unclaimed and public" value={queues.unclaimedRecords} />
            <Stat label="Awaiting publication" value={queues.unpublishedRecords} />
          </div>

          {can(session.user.role, 'admin:manage_seasons') ? (
            <div className="mt-12 max-w-140">
              <AdvanceSeasonForm stage={overview.stage as SeasonStage} year={overview.seasonYear} />
            </div>
          ) : null}
        </section>
      ) : (
        <Notice tone="warning" title="No current season" className="mt-16">
          No season is marked current. The queues above still work; the season machinery does not.
        </Notice>
      )}
    </>
  );
}
