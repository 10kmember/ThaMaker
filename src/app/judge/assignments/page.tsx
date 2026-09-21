import Link from 'next/link';
import { PortalShell } from '@/components/palma/PortalShell';
import { Card, Row, RowText, SectionHead, Empty, Tag, Glyph } from '@/components/desk/surface';
import { PageHead } from '@/components/desk/blocks';
import { buildMetadata } from '@/lib/seo';
import { requirePermission } from '@/lib/auth/guards';
import { getJudgeOverview, type AssignmentSummary } from '@/server/data/judging';
import { JUDGING_NAV } from '@/lib/judging-nav';
import { formatShortDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  Gavel,
  Inbox,
  Play,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Lock,
  type LucideIcon,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'My judging',
  description: 'Cases awaiting assessment.',
  path: '/judge/assignments',
  noIndex: true,
});

export default async function MyJudgingPage() {
  const session = await requirePermission('judging:view_assignments', '/judge/assignments');
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

  const outstanding = overview.toReview.length + overview.inProgress.length;

  return (
    <PortalShell
      title="PALMA Judging"
      subtitle="My judging"
      nav={JUDGING_NAV}
      activeHref="/judge/assignments"
      session={session}
      desk="judge"
    >
      <div className="flex flex-col gap-6">
        <PageHead
          eyebrow="My judging"
          eyebrowIcon={Gavel}
          title="The workspace"
          statement="Three states, and a case can only move forwards through them. Opening a case means declaring you have no conflict; submitting an assessment locks it."
          aside={
            <Tag tone={outstanding > 0 ? 'accent' : 'positive'}>
              {outstanding > 0 ? `${outstanding} outstanding` : 'All clear'}
            </Tag>
          }
        />

        <Group
          icon={Inbox}
          tone="accent"
          title="To review"
          note="Cases PALMA has prepared and assigned to you. Nothing has been opened yet."
          assignments={overview.toReview}
          emptyTitle="Nothing waiting"
          emptyDescription="Every case assigned to you has been opened."
          action="Begin"
        />

        <Group
          icon={Play}
          tone="accent"
          title="In progress"
          note="Opened, no conflict declared, assessment not yet submitted."
          assignments={overview.inProgress}
          emptyTitle="Nothing in progress"
          emptyDescription="You have no half-finished assessments."
          action="Continue"
        />

        <Group
          icon={CheckCircle2}
          tone="positive"
          title="Completed"
          note="Submitted and locked. These cannot be edited."
          assignments={overview.completed}
          emptyTitle="Nothing completed yet"
          emptyDescription="Submitted assessments appear here."
        />

        {overview.recused.length > 0 ? (
          <Group
            icon={XCircle}
            tone="neutral"
            title="Recused"
            note="You declared a conflict. An administrator reassigns these; you cannot see them again."
            assignments={overview.recused}
            emptyTitle=""
            emptyDescription=""
          />
        ) : null}
      </div>
    </PortalShell>
  );
}

/**
 * One state of the workspace, grouped by category.
 *
 * A category is a card and its candidates are the rows inside it, rather than
 * every candidate being a card of its own. A judge works a category at a
 * time, so that is the unit the page is built from.
 */
function Group({
  icon,
  tone,
  title,
  note,
  assignments,
  emptyTitle,
  emptyDescription,
  action,
}: {
  icon: LucideIcon;
  tone: 'accent' | 'positive' | 'neutral';
  title: string;
  note: string;
  assignments: AssignmentSummary[];
  emptyTitle: string;
  emptyDescription: string;
  action?: string;
}) {
  const byCategory = new Map<string, AssignmentSummary[]>();
  for (const assignment of assignments) {
    byCategory.set(assignment.categoryName, [
      ...(byCategory.get(assignment.categoryName) ?? []),
      assignment,
    ]);
  }

  return (
    <section data-lift="section">
      <SectionHead
        icon={icon}
        title={title}
        action={
          assignments.length > 0 ? (
            <Tag tone={tone === 'neutral' ? 'neutral' : tone}>{assignments.length}</Tag>
          ) : null
        }
      />
      <p className="mb-3 max-w-[68ch] text-[0.8125rem] leading-relaxed text-[color:var(--text-quiet)]">
        {note}
      </p>

      {assignments.length === 0 ? (
        <Empty icon={icon} title={emptyTitle} description={emptyDescription} />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
          {[...byCategory.entries()].map(([categoryName, group]) => {
            const remaining = group.filter((entry) => entry.status !== 'completed').length;
            const first = group[0];
            if (!first) return null;

            return (
              <Card key={categoryName} className="glow list overflow-hidden" data-lift="list">
                <div className="flex flex-wrap items-center gap-2.5 p-4">
                  <Glyph icon={icon} size="sm" tone={tone === 'neutral' ? 'neutral' : tone} />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="row-title">{categoryName}</span>
                    <span className="row-note">
                      PALMA {first.year} · {group.length} candidate{group.length === 1 ? '' : 's'}
                      {action
                        ? `, ${remaining} remaining`
                        : first.completedAt
                          ? `, submitted ${formatShortDate(first.completedAt)}`
                          : ''}
                    </span>
                  </span>
                </div>

                {group.map((assignment) => (
                  <Row key={assignment.id}>
                    <RowText title={assignment.creatorName} />
                    {action ? (
                      <Link
                        href={`/judge/${assignment.id}`}
                        className={cn(
                          'tap ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1',
                          'text-[0.6875rem] font-medium text-[color:var(--accent)]',
                          'ring-1 ring-[color:var(--accent)]/25 ring-inset',
                          'transition-transform duration-400 [transition-timing-function:var(--spring)] hover:-translate-y-0.5',
                        )}
                      >
                        {action === 'Continue' ? (
                          <Play className="size-3" />
                        ) : (
                          <ArrowRight className="size-3" />
                        )}
                        {action}
                      </Link>
                    ) : (
                      <Tag className="ml-auto">
                        {assignment.status === 'completed' ? (
                          <>
                            <Lock className="size-3" />
                            Locked
                          </>
                        ) : (
                          'Recused'
                        )}
                      </Tag>
                    )}
                  </Row>
                ))}
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
