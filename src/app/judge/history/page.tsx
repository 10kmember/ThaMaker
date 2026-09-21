import { PortalShell } from '@/components/palma/PortalShell';
import { Card, Row, RowText, Empty, Tag, Meter } from '@/components/desk/surface';
import { PageHead } from '@/components/desk/blocks';
import { buildMetadata } from '@/lib/seo';
import { requirePermission } from '@/lib/auth/guards';
import { getJudgeHistory } from '@/server/data/judging';
import { JUDGING_NAV } from '@/lib/judging-nav';
import { History, CheckCircle2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Judging history',
  description: 'Your institutional record as a PALMA judge.',
  path: '/judge/history',
  noIndex: true,
});

export default async function JudgingHistoryPage() {
  const session = await requirePermission('judging:view_assignments', '/judge/history');
  const history = session.user.judgeId ? await getJudgeHistory(session.user.judgeId) : [];

  return (
    <PortalShell
      title="PALMA Judging"
      subtitle="My judging history"
      nav={JUDGING_NAV}
      activeHref="/judge/history"
      session={session}
      desk="judge"
    >
      <div className="flex flex-col gap-6">
        <PageHead
          eyebrow="History"
          eyebrowIcon={History}
          title="Your service record"
          statement="It is not a trophy cabinet. It shows what you were asked to judge and whether you finished it, and never what you scored."
          aside={
            history.length > 0 ? (
              <Tag>
                {history.length} season{history.length === 1 ? '' : 's'}
              </Tag>
            ) : null
          }
        />

        {history.length === 0 ? (
          <Empty
            icon={History}
            title="No seasons yet"
            description="Your first season appears here once cases are assigned to you."
          />
        ) : (
          <div className="grid gap-5 xl:grid-cols-2">
            {history.map((season) => {
              const complete = season.completed >= season.assigned;

              return (
                /* One season, one card. The heading carries its own meter, so
                   a year reads as finished or not before any category below it
                   is looked at, and the categories are rules inside the same
                   card rather than a second card stacked under the first. */
                <Card key={season.year} className="glow list overflow-hidden" data-lift="section">
                  <div className="flex flex-wrap items-center gap-4 p-4">
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="font-display text-[1.0625rem] text-[color:var(--text)]">
                        {season.title}
                      </span>
                      <span className="row-note">
                        {season.completed} of {season.assigned} assessed
                      </span>
                    </span>
                    <span className="ml-auto flex items-center gap-3">
                      <Meter
                        value={season.completed}
                        total={season.assigned}
                        className="hidden w-28 sm:block"
                      />
                      <Tag tone={complete ? 'positive' : 'accent'}>
                        {complete ? (
                          <>
                            <CheckCircle2 className="size-3.5" />
                            Complete
                          </>
                        ) : (
                          'Outstanding'
                        )}
                      </Tag>
                    </span>
                  </div>

                  <div data-lift="list">
                    {season.categories.map((category) => {
                      const done = category.completed >= category.assigned;
                      return (
                        <Row key={category.categoryName}>
                          <RowText title={category.categoryName} />
                          <span className="ml-auto flex shrink-0 items-center gap-3">
                            <span className="label text-[10px] tabular-nums">
                              {category.completed}/{category.assigned}
                            </span>
                            <Tag tone={done ? 'positive' : 'neutral'}>
                              {done ? 'Completed' : 'Outstanding'}
                            </Tag>
                          </span>
                        </Row>
                      );
                    })}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </PortalShell>
  );
}
