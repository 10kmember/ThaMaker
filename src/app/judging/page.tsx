import Link from 'next/link';
import { PortalShell } from '@/components/palma/PortalShell';
import { Stat } from '@/components/ui/stat';
import { Table, TBody, THead } from '@/components/ui/table';
import { EmptyState, Notice } from '@/components/ui/feedback';
import { Badge } from '@/components/ui/badge';
import { buildMetadata } from '@/lib/seo';
import { requirePermission } from '@/lib/auth/guards';
import { getJudgeDashboard } from '@/server/data/judging';
import { formatShortDate } from '@/lib/format';
import { titleCase } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Judging',
  description: 'The PALMA judge portal.',
  path: '/judging',
  noIndex: true,
});

export default async function JudgingPage() {
  const session = await requirePermission('judging:view_assignments', '/judging');
  const dashboard = session.user.judgeId ? await getJudgeDashboard(session.user.judgeId) : null;

  if (!dashboard) {
    return (
      <PortalShell title="PALMA Judging" userName={session.user.name}>
        <EmptyState
          title="No panel membership"
          description="This account is not currently seated on a PALMA panel."
        />
      </PortalShell>
    );
  }

  const pending = dashboard.assigned.length;

  return (
    <PortalShell
      title="PALMA Judging"
      subtitle={dashboard.seasonTitle}
      userName={dashboard.judgeName}
    >
      <div className="grid gap-10 border-b border-stone-deep pb-10 sm:grid-cols-4">
        <Stat label="Assigned" value={dashboard.assigned.length + dashboard.completed.length} />
        <Stat label="Pending" value={pending} />
        <Stat label="Completed" value={dashboard.completed.length} />
        <Stat label="Conflicts" value={dashboard.conflicts.length} />
      </div>

      <section className="mt-12">
        <h2 className="palma-label mb-6 text-taupe-deep">Awaiting your score</h2>
        {pending === 0 ? (
          <EmptyState title="Nothing awaiting you" description="Every assigned nomination has been scored." />
        ) : (
          <Table>
            <THead>
              <tr>
                <th scope="col">Reference</th>
                <th scope="col">Creator</th>
                <th scope="col">Category</th>
                <th scope="col">Assigned</th>
                <th scope="col" className="text-right">
                  Action
                </th>
              </tr>
            </THead>
            <TBody>
              {dashboard.assigned.map((assignment) => (
                <tr key={assignment.id}>
                  <td className="font-mono text-xs tracking-wider">{assignment.reference}</td>
                  <td className="font-display text-lg">{assignment.creatorName}</td>
                  <td className="text-taupe-deep">{assignment.categoryName}</td>
                  <td className="text-taupe-deep">{formatShortDate(assignment.assignedAt)}</td>
                  <td className="text-right">
                    <Link
                      href={`/judging/${assignment.id}`}
                      className="palma-label text-olive hover:text-ink"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </TBody>
          </Table>
        )}
      </section>

      {dashboard.completed.length > 0 ? (
        <section className="mt-16">
          <h2 className="palma-label mb-6 text-taupe-deep">Completed</h2>
          <Table>
            <THead>
              <tr>
                <th scope="col">Reference</th>
                <th scope="col">Creator</th>
                <th scope="col">Category</th>
                <th scope="col">Submitted</th>
              </tr>
            </THead>
            <TBody>
              {dashboard.completed.map((assignment) => (
                <tr key={assignment.id}>
                  <td className="font-mono text-xs tracking-wider">{assignment.reference}</td>
                  <td className="font-display text-lg">{assignment.creatorName}</td>
                  <td className="text-taupe-deep">{assignment.categoryName}</td>
                  <td className="text-taupe-deep">{formatShortDate(assignment.completedAt)}</td>
                </tr>
              ))}
            </TBody>
          </Table>
        </section>
      ) : null}

      {dashboard.conflicts.length > 0 ? (
        <section className="mt-16">
          <h2 className="palma-label mb-6 text-taupe-deep">Declared conflicts</h2>
          <ul className="flex flex-col gap-3">
            {dashboard.conflicts.map((conflict) => (
              <li
                key={conflict.id}
                className="flex flex-wrap items-center justify-between gap-4 border border-stone-deep p-5"
              >
                <span className="font-display text-lg">{titleCase(conflict.kind)}</span>
                <Badge variant={conflict.status === 'dismissed' ? 'muted' : 'olive'}>
                  {titleCase(conflict.status)}
                </Badge>
                <span className="palma-label text-taupe-deep">
                  {formatShortDate(conflict.declaredAt)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <Notice className="mt-16" title="How PALMA treats your scores">
        Scores are submitted independently and are immutable once submitted. They are never shown to
        creators, sponsors or the public. A declared conflict removes you from a nomination
        immediately.
      </Notice>
    </PortalShell>
  );
}
