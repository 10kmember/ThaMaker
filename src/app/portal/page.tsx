import Link from 'next/link';
import { Notice } from '@/components/ui/feedback';
import { buildMetadata } from '@/lib/seo';
import { requirePermission } from '@/lib/auth/guards';
import { can } from '@/lib/auth/rbac';
import { getQueueCounts } from '@/server/data/operations';
import { recentActivity } from '@/server/data/people';
import { greeting } from '@/lib/judging-nav';
import { formatShortDate } from '@/lib/format';
import { cn } from '@/lib/utils';

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

  const outstanding = work.reduce((sum, item) => sum + item.count, 0);

  return (
    <>
      <div className="flex flex-col gap-3">
        <span className="palma-label text-taupe-deep">Moderation</span>
        <h1 className="text-4xl">
          {greeting()}, {firstName}.
        </h1>
        <p className="text-taupe-deep max-w-160 leading-relaxed">
          {outstanding === 0
            ? 'Your queues are clear. Nothing is waiting on a person.'
            : `${outstanding} item${outstanding === 1 ? '' : 's'} need a decision.`}
        </p>
      </div>

      <section className="mt-12">
        <h2 className="palma-label text-taupe-deep border-stone-deep border-b pb-4">
          Needs attention
        </h2>

        <ul className="flex flex-col">
          {work.map((item) => (
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
      </section>

      <div className="mt-16 grid gap-14 lg:grid-cols-12 lg:gap-16">
        <section className="min-w-0 lg:col-span-7">
          <h2 className="palma-label text-taupe-deep border-stone-deep border-b pb-3">
            Recently recorded
          </h2>
          <ul className="flex flex-col">
            {activity.map((entry) => (
              <li
                key={entry.id}
                className="border-stone-deep/60 flex flex-wrap gap-x-5 gap-y-1 border-b py-3.5 last:border-none"
              >
                <span className="palma-label text-taupe w-24 shrink-0">
                  {formatShortDate(entry.createdAt)}
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-sm">{entry.action.replace(/[._]/g, ' ')}</span>
                  <span className="text-taupe text-xs leading-relaxed">
                    {entry.summary ?? `${entry.entityType} ${entry.entityId}`}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <aside className="flex min-w-0 flex-col gap-8 lg:col-span-5">
          <Notice title="What this desk decides">
            Whether a person should control a PALMA record, whether a creator has been verified as
            an adult, and whether something reported breaches the content policy. Each decision is
            recorded against the thing it concerns, with your name on it.
          </Notice>

          <Notice tone="warning" title="What it never decides">
            An outcome. Selection, revocation and score correction are administrator actions.
            Moderation maintains the accuracy of the record and never its results.
          </Notice>
        </aside>
      </div>
    </>
  );
}
