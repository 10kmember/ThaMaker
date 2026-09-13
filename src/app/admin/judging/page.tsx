import { AssignJudgesForm } from '@/components/admin/AdminForms';
import { EmptyState, Notice } from '@/components/ui/feedback';
import { buildMetadata } from '@/lib/seo';
import { requirePermission } from '@/lib/auth/guards';
import { prisma } from '@/server/db';

export const metadata = buildMetadata({
  title: 'Judging',
  description: 'Assign PALMA judging panels.',
  path: '/admin/judging',
  noIndex: true,
});

export default async function AdminJudgingPage() {
  await requirePermission('admin:assign_judging', '/admin/judging');

  const db = prisma;

  const categories = await db.category.findMany({
    where: { awardYear: { isCurrent: true } },
    orderBy: { position: 'asc' },
    include: {
      _count: { select: { assignments: true } },
      candidacies: { where: { status: 'eligible' }, select: { id: true } },
    },
  });

  const conflicts = await db.judgeConflict.findMany({
    where: { status: 'declared' },
    include: { judge: true },
    orderBy: { declaredAt: 'desc' },
    take: 20,
  });

  return (
    <>
      <h2 className="text-3xl">Panel assignment</h2>
      <p className="text-taupe-deep mt-3 max-w-160 leading-relaxed">
        Assignment is deterministic and conflict-aware: each eligible candidacy is placed with three
        judges, load is spread evenly, and any judge with a declared conflict is excluded before
        placement. Running it twice adds only what is missing.
      </p>

      {categories.length === 0 ? (
        <EmptyState className="mt-10" title="No categories in the current season" />
      ) : (
        <div className="mt-10 flex flex-col gap-4">
          {categories.map((category) => (
            <AssignJudgesForm
              key={category.id}
              categoryId={category.id}
              categoryName={category.name}
              eligibleCount={category.candidacies.length}
              assignedCount={category._count.assignments}
            />
          ))}
        </div>
      )}

      {conflicts.length > 0 ? (
        <section className="mt-14">
          <h3 className="palma-label text-taupe-deep mb-5">Conflicts awaiting resolution</h3>
          <ul className="flex flex-col gap-3">
            {conflicts.map((conflict) => (
              <li
                key={conflict.id}
                className="border-stone-deep flex flex-wrap items-center justify-between gap-4 border p-5"
              >
                <span className="font-display text-lg">{conflict.judge.displayName}</span>
                <span className="palma-label text-taupe-deep">{conflict.kind}</span>
                <span className="text-taupe-deep text-sm">
                  {conflict.candidacyId ?? conflict.creatorId}
                </span>
              </li>
            ))}
          </ul>
          <Notice className="mt-6">
            A declared conflict has already removed the judge from the nomination. Dismissing one is
            a deliberate act and is written to the audit log.
          </Notice>
        </section>
      ) : null}
    </>
  );
}
