import { EmptyState } from '@/components/ui/feedback';
import { Badge } from '@/components/ui/badge';
import { buildMetadata } from '@/lib/seo';
import { requirePermission } from '@/lib/auth/guards';
import { listReports } from '@/server/data/admin';
import { formatShortDate } from '@/lib/format';
import { titleCase } from '@/lib/utils';

export const metadata = buildMetadata({
  title: 'Moderation',
  description: 'PALMA moderation queue.',
  path: '/admin/moderation',
  noIndex: true,
});

export default async function AdminModerationPage() {
  await requirePermission('moderation:view_reports', '/admin/moderation');
  const reports = await listReports();

  return (
    <>
      <h2 className="text-3xl">Moderation</h2>
      <p className="mt-3 max-w-160 leading-relaxed text-taupe-deep">
        Reports of impersonation, fabricated achievements, explicit content and nomination
        manipulation. Every action taken here is recorded against the entity it affects.
      </p>

      {reports.length === 0 ? (
        <EmptyState className="mt-10" title="Nothing reported" description="The queue is empty." />
      ) : (
        <ul className="mt-10 flex flex-col gap-4">
          {reports.map((report) => (
            <li key={report.id} className="border border-stone-deep p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <span className="font-display text-xl">{titleCase(report.reason)}</span>
                <div className="flex items-center gap-3">
                  <Badge variant={report.status === 'open' ? 'olive' : 'muted'}>
                    {titleCase(report.status)}
                  </Badge>
                  <span className="palma-label text-taupe-deep">
                    {formatShortDate(report.createdAt)}
                  </span>
                </div>
              </div>
              <p className="mt-3 palma-label text-taupe-deep">Subject · {report.subject}</p>
              <p className="mt-4 leading-relaxed text-ink/85">{report.detail}</p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
