import Link from 'next/link';
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  XCircle,
  Calendar,
  Bell,
  ArrowRight,
  ChevronRight,
  ShieldCheck,
  Play,
  Scale,
  Gavel,
} from 'lucide-react';
import { Card, List, Row, SectionHead, Tag, Dot, Glyph, Empty, Action, Notice } from './surface';
import { Counter } from './motion';
import { Masthead, ProgressRow, Panel, Dial } from './blocks';
import { cn } from '@/lib/utils';

/* ───────────────────────────────────────────────────────────────────────────
   The judging room

   A judge arrives with one question, which is what is left, so the dial
   answers it before anything else. The four counts sit under it, the
   categories are meters in one list, and the deadline is held in the corner
   where it can be glanced at without being alarming.
   ─────────────────────────────────────────────────────────────────────────── */

export type JudgeCategory = {
  categoryId: string;
  categoryName: string;
  assigned: number;
  completed: number;
  nextAssignmentId: string | null;
};

export type JudgeNotice = {
  id: string;
  subject: string;
  body: string;
  when: string;
  href?: string | null;
};

export function JudgeOverview({
  greeting,
  firstName,
  counts,
  season,
  categories,
  notifications,
  isChair,
  minJudges,
}: {
  greeting: string;
  firstName: string;
  counts: { assigned: number; completed: number; remaining: number; recused: number };
  season: { title: string; daysRemaining: number | null; closesAt: string | null };
  categories: JudgeCategory[];
  notifications: JudgeNotice[];
  isChair: boolean;
  minJudges: number;
}) {
  const nextId = categories.find((category) => category.nextAssignmentId)?.nextAssignmentId ?? null;
  const closingSoon =
    season.daysRemaining !== null && season.daysRemaining <= 7 && season.daysRemaining > 0;

  const stats = [
    { icon: ClipboardList, label: 'Assigned', value: counts.assigned, tone: 'neutral' as const },
    { icon: CheckCircle2, label: 'Completed', value: counts.completed, tone: 'positive' as const },
    { icon: Clock, label: 'Remaining', value: counts.remaining, tone: 'accent' as const },
    { icon: XCircle, label: 'Recused', value: counts.recused, tone: 'neutral' as const },
  ];

  return (
    <div className="flex flex-col gap-6">
      <Masthead
        eyebrow="The judging room"
        eyebrowIcon={Gavel}
        title={`${greeting}, ${firstName}.`}
        statement={
          counts.remaining === 0
            ? 'Your panel is clear. Every case assigned to you this season has been assessed.'
            : `${counts.remaining} case${counts.remaining === 1 ? '' : 's'} left to assess.`
        }
        aside={
          <Dial
            value={counts.completed}
            total={counts.assigned}
            caption="panel complete"
            tone={counts.remaining === 0 ? 'positive' : 'accent'}
          />
        }
      >
        {nextId ? (
          <Action href={`/judge/${nextId}`} icon={ArrowRight} tone="accent">
            Open the next case
          </Action>
        ) : null}
        {isChair ? (
          <Tag tone="accent">
            <ShieldCheck className="size-3.5" />
            You chair this panel
          </Tag>
        ) : null}
      </Masthead>

      {/* ── The four counts ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="glow flex flex-col gap-3 p-3.5" data-lift="figure">
            <div className="flex items-center gap-2">
              <Glyph icon={stat.icon} size="sm" tone={stat.value > 0 ? stat.tone : 'neutral'} />
              <span className="label text-[9.5px]">{stat.label}</span>
            </div>
            <Counter
              value={stat.value}
              className={cn(
                'figure text-[1.6rem]',
                stat.tone === 'accent' && stat.value > 0 && 'figure-accent',
              )}
            />
          </Card>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-12">
        <div className="flex min-w-0 flex-col gap-4 xl:col-span-8">
          <section data-lift="section">
            <SectionHead
              icon={ClipboardList}
              title="Your assignments"
              action={
                <Link
                  href="/judge/assignments"
                  className="tap inline-flex items-center gap-1 text-[0.8125rem] text-[color:var(--accent)] underline-offset-4 hover:underline"
                >
                  Open the workspace
                  <ChevronRight className="size-3.5" />
                </Link>
              }
            />

            {categories.length === 0 ? (
              <Empty
                icon={ClipboardList}
                title="Nothing assigned yet"
                description="Cases are assigned once screening closes. You will be notified."
              />
            ) : (
              <List className="glow" data-lift="list">
                {categories.map((category) => {
                  const done = category.completed >= category.assigned;
                  const started = category.completed > 0;

                  return (
                    <ProgressRow
                      key={category.categoryId}
                      title={category.categoryName}
                      done={category.completed}
                      total={category.assigned}
                      action={
                        done ? (
                          <Tag tone="positive">
                            <CheckCircle2 className="size-3.5" />
                            Complete
                          </Tag>
                        ) : category.nextAssignmentId ? (
                          <Link
                            href={`/judge/${category.nextAssignmentId}`}
                            className={cn(
                              'tap inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.6875rem] font-medium',
                              'text-[color:var(--accent)] ring-1 ring-[color:var(--accent)]/25 ring-inset',
                              'transition-transform duration-400 [transition-timing-function:var(--spring)] hover:-translate-y-0.5',
                            )}
                          >
                            {started ? (
                              <>
                                <Play className="size-3" />
                                Continue
                              </>
                            ) : (
                              <>
                                <ArrowRight className="size-3" />
                                Begin
                              </>
                            )}
                          </Link>
                        ) : null
                      }
                    />
                  );
                })}
              </List>
            )}
          </section>

          {closingSoon ? (
            <div data-lift="section">
              <Notice icon={Clock}>
                <strong className="text-[color:var(--text)]">
                  {season.daysRemaining} day{season.daysRemaining === 1 ? '' : 's'}
                </strong>{' '}
                remain before judging closes for {season.title}.
              </Notice>
            </div>
          ) : null}
        </div>

        <aside className="flex min-w-0 flex-col gap-3.5 xl:col-span-4">
          <Card elevation="raised" className="glow p-4" data-lift="section">
            <div className="mb-2.5 flex items-center gap-2.5">
              <Glyph icon={Calendar} size="sm" tone="accent" />
              <span className="label">{season.title}</span>
              {closingSoon ? <Dot tone="accent" /> : null}
            </div>
            <p className="font-display text-lg leading-tight text-[color:var(--text)]">
              {season.daysRemaining === null
                ? 'No deadline published yet'
                : season.daysRemaining === 0
                  ? 'Judging closes today'
                  : `Judging closes in ${season.daysRemaining} day${season.daysRemaining === 1 ? '' : 's'}`}
            </p>
            {season.closesAt ? (
              <p className="mt-1 text-[0.8125rem] text-[color:var(--text-quiet)]">
                {season.closesAt}
              </p>
            ) : null}

            {isChair ? (
              <p className="mt-3.5 border-t border-[color:var(--line)] pt-3.5 text-[0.75rem] leading-relaxed text-[color:var(--text-quiet)]">
                You chair this panel. You see the spread of scores before any list is confirmed, and
                you score nothing yourself.
              </p>
            ) : null}
          </Card>

          <section data-lift="section">
            <SectionHead
              icon={Bell}
              title="Notices"
              action={notifications.length > 0 ? <Tag>{notifications.length}</Tag> : null}
            />
            {notifications.length === 0 ? (
              <Card className="p-4">
                <p className="text-[0.8125rem] leading-relaxed text-[color:var(--text-quiet)]">
                  Nothing outstanding. PALMA only writes to you about assignments, reassignments,
                  conflict decisions, deadlines and the opening and closing of judging.
                </p>
              </Card>
            ) : (
              <List className="glow" data-lift="list">
                {notifications.map((notice) => (
                  <Row key={notice.id} className="flex-col items-stretch gap-1 py-3">
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="row-title">{notice.subject}</span>
                      <span className="label shrink-0 text-[10px]">{notice.when}</span>
                    </span>
                    <span className="row-note">{notice.body}</span>
                    {notice.href ? (
                      <Link
                        href={notice.href}
                        className="tap mt-0.5 inline-flex items-center gap-1 self-start text-[0.75rem] text-[color:var(--accent)] underline-offset-4 hover:underline"
                      >
                        Open <ChevronRight className="size-3" />
                      </Link>
                    ) : null}
                  </Row>
                ))}
              </List>
            )}
          </section>

          <Panel icon={Scale} title="How PALMA treats your work">
            Every case is scored independently by at least {minJudges} judges. You are never shown
            another judge&rsquo;s score, and never shown how many people nominated a creator.
            Submitted assessments are immutable.
          </Panel>
        </aside>
      </div>
    </div>
  );
}
