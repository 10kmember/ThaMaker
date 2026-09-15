import { ThePalmaForm } from '@/components/admin/AdminForms';
import { Notice } from '@/components/ui/feedback';
import { buildMetadata } from '@/lib/seo';
import { requirePermission } from '@/lib/auth/guards';
import { prisma } from '@/server/db';
import { CONSIDERATIONS, NOT_MEASURED, THE_PALMA_CRITERION } from '@/domain/the-palma';

export const metadata = buildMetadata({
  title: 'THE PALMA',
  description: 'Confer the institution’s highest honour.',
  path: '/admin/the-palma',
  noIndex: true,
});

/**
 * Conferring THE PALMA has its own screen.
 *
 * Not a panel at the bottom of the standings page. The standings page is about
 * ranking candidacies within categories, and THE PALMA has no ranking, no
 * category and no candidacy. Putting it there would have made it the
 * thirteenth row of that screen, which is the same mistake in the back office
 * that the public pages are careful not to make.
 */
export default async function AdminThePalmaPage() {
  await requirePermission('admin:confer_the_palma', '/admin/the-palma');

  const [seasons, creators, conferred] = await Promise.all([
    prisma.awardYear.findMany({
      orderBy: { year: 'desc' },
      select: { id: true, year: true, title: true },
    }),
    prisma.creator.findMany({
      where: { isPublished: true, isSuspended: false },
      orderBy: { displayName: 'asc' },
      select: { id: true, displayName: true },
      take: 500,
    }),
    prisma.honour.findMany({
      where: { kind: 'the_palma', state: 'active' },
      orderBy: { awardYear: { year: 'desc' } },
      select: {
        id: true,
        citation: true,
        awardYear: { select: { year: true } },
        creator: { select: { displayName: true } },
        achievement: { select: { code: true } },
      },
    }),
  ]);

  const taken = new Set(conferred.map((honour) => honour.awardYear.year));
  const open = seasons.filter((season) => !taken.has(season.year));

  return (
    <>
      <h1 className="text-3xl">THE PALMA</h1>

      <Notice className="mt-5" title="What this screen does">
        {THE_PALMA_CRITERION} It is conferred once a season, never shared, and never given to the
        same creator twice. There is no nomination behind it and no shortlist it comes through.
      </Notice>

      <section className="border-stone-deep mt-12 border p-7">
        <h2 className="font-display text-2xl">Conferred</h2>
        {conferred.length === 0 ? (
          <p className="text-taupe-deep mt-4 text-sm">None yet.</p>
        ) : (
          <ul className="mt-6 flex flex-col gap-6">
            {conferred.map((honour) => (
              <li key={honour.id} className="border-stone-deep flex flex-col gap-2 border-t pt-5">
                <div className="flex flex-wrap items-baseline gap-x-4">
                  <span className="font-display text-xl">{honour.creator.displayName}</span>
                  <span className="palma-label text-taupe-deep tabular-nums">
                    {honour.awardYear.year}
                  </span>
                  {honour.achievement ? (
                    <span className="text-taupe-deep font-mono text-xs">
                      {honour.achievement.code}
                    </span>
                  ) : null}
                </div>
                {honour.citation ? (
                  <p className="text-taupe-deep max-w-160 text-sm leading-relaxed">
                    {honour.citation}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border-stone-deep mt-10 border p-7">
        <h2 className="font-display text-2xl">Confer</h2>

        {open.length === 0 ? (
          <Notice className="mt-5" tone="warning">
            Every season on record already holds THE PALMA. There is one a year.
          </Notice>
        ) : (
          <div className="mt-7 grid gap-12 lg:grid-cols-2">
            <ThePalmaForm seasons={open} creators={creators} />

            <div className="flex flex-col gap-8">
              <div>
                <h3 className="palma-label text-taupe-deep">What the panel weighs</h3>
                <ul className="mt-4 flex flex-col gap-2">
                  {CONSIDERATIONS.map((consideration) => (
                    <li key={consideration.key} className="text-sm leading-relaxed">
                      <span className="font-medium">{consideration.title}.</span>{' '}
                      <span className="text-taupe-deep">{consideration.detail}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="palma-label text-taupe-deep">What it is not</h3>
                <ul className="mt-4 flex flex-col gap-2">
                  {NOT_MEASURED.map((entry) => (
                    <li key={entry.term} className="text-sm leading-relaxed">
                      <span className="font-medium">{entry.term}.</span>{' '}
                      <span className="text-taupe-deep">{entry.why}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
