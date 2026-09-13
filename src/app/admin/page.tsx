import Link from 'next/link';
import { Stat } from '@/components/ui/stat';
import { Notice } from '@/components/ui/feedback';
import { AdvanceSeasonForm } from '@/components/admin/AdminForms';
import { buildMetadata } from '@/lib/seo';
import { getAdminOverview } from '@/server/data/admin';
import { STAGE_LABEL, type SeasonStage } from '@/domain/season';

export const metadata = buildMetadata({
  title: 'Admin',
  description: 'PALMA administration.',
  path: '/admin',
  noIndex: true,
});

const MODULES = [
  { href: '/admin/nominations', label: 'Nominations', description: 'Review eligibility and integrity.' },
  { href: '/admin/judging', label: 'Judging', description: 'Assign panels and track completion.' },
  { href: '/admin/selection', label: 'Finalists & winners', description: 'Confirm the record.' },
  { href: '/admin/moderation', label: 'Moderation', description: 'Reports and actions taken.' },
  { href: '/admin/audit', label: 'Audit log', description: 'Everything of consequence, in order.' },
  { href: '/paroh', label: 'PaROH', description: 'The public archive as it stands.' },
];

export default async function AdminPage() {
  const overview = await getAdminOverview();

  if (!overview) {
    return (
      <Notice tone="warning" title="No live season">
        PALMA is either running without a database or has no season marked current. Seed a season to
        use the administration portal.
      </Notice>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        <span className="palma-label text-taupe-deep">{STAGE_LABEL[overview.stage as SeasonStage]}</span>
        <h2 className="text-4xl">{overview.seasonTitle}</h2>
      </div>

      <div className="mt-10 grid gap-8 border-y border-stone-deep py-10 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Nominations" value={overview.counts.nominations} />
        <Stat label="Under review" value={overview.counts.underReview} />
        <Stat label="Eligible" value={overview.counts.eligible} />
        <Stat label="Judging" value={overview.counts.judging} />
        <Stat label="Finalists" value={overview.counts.finalists} />
        <Stat label="Winners" value={overview.counts.winners} />
      </div>

      <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Creators" value={overview.counts.creators} />
        <Stat label="Active judges" value={overview.counts.judges} />
        <Stat label="Open reports" value={overview.counts.openReports} />
        <Stat label="Open conflicts" value={overview.counts.openConflicts} />
      </div>

      <section className="mt-14 border border-stone-deep p-7">
        <h3 className="palma-label mb-5 text-taupe-deep">Season stage</h3>
        <AdvanceSeasonForm year={overview.seasonYear} stage={overview.stage as SeasonStage} />
      </section>

      <section className="mt-14">
        <h3 className="palma-label mb-6 text-taupe-deep">Modules</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((module) => (
            <Link
              key={module.href}
              href={module.href}
              className="flex flex-col gap-2 border border-stone-deep p-6 transition-colors hover:border-ink/40"
            >
              <span className="font-display text-xl">{module.label}</span>
              <span className="text-sm text-taupe-deep">{module.description}</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
