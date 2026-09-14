import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Notice } from '@/components/ui/feedback';
import { FeatureSwitch } from '@/components/operations/FeatureSwitch';
import { buildMetadata } from '@/lib/seo';
import { requirePermission } from '@/lib/auth/guards';
import { FEATURE_GROUPS, FEATURE_LIST } from '@/domain/features';
import { featureStates, seasonOverrides } from '@/server/features';
import { prisma } from '@/server/db';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Features & commercial',
  description: 'What PALMA is currently selling, and what it is not.',
  path: '/admin/settings/features',
  noIndex: true,
});

/**
 * The control room.
 *
 * Everything here ships off. A feature that defaults on is a feature somebody
 * has to remember to turn off before launch, and nobody ever does.
 *
 * Two things this page insists on saying. Each switch carries its prerequisite,
 * because a feature turned on before the thing it needs is how a public page
 * ends up advertising something that does not exist. And every change is
 * audited with the actor and the reason, because "when did we start selling
 * that, and who decided?" is a question an institution has to be able to answer
 * about itself.
 */
export default async function FeaturesPage() {
  await requirePermission('commercial:manage_features', '/admin/settings/features');

  const [states, seasons] = await Promise.all([
    featureStates(),
    prisma.awardYear.findMany({
      select: { id: true, year: true, title: true },
      orderBy: { year: 'desc' },
      take: 6,
    }),
  ]);

  const overrides = await Promise.all(
    FEATURE_LIST.filter((entry) => entry.seasonAware).map(async (entry) => ({
      key: entry.key,
      rows: await seasonOverrides(entry.key),
    })),
  );

  const live = states.filter((state) => state.live).length;

  return (
    <>
      <div className="flex flex-col gap-3">
        <Link href="/admin/settings" className="palma-label text-taupe-deep hover:text-ink">
          ← Settings
        </Link>
        <span className="palma-label text-taupe-deep">System</span>
        <h1 className="text-4xl">Features &amp; commercial</h1>
        <p className="text-taupe-deep max-w-160 leading-relaxed">
          What PALMA is selling, and what it is not. Everything here ships switched off: build the
          rails now, turn the trains on when PALMA is ready.
        </p>
      </div>

      <Notice className="mt-8" title="The line none of these crosses">
        PALMA never sells recognition. A sponsor buys visibility, association, hospitality and
        editorial presence — never a nomination, a score, a finalist or a winner. That separation is
        enforced in the permission matrix and asserted by tests, not left to this page to remember.
      </Notice>

      <div className="border-stone-deep mt-10 flex flex-wrap items-baseline gap-x-8 gap-y-3 border-y py-6">
        <span className="palma-label text-taupe-deep">
          {live} of {states.length} live
        </span>
        {live === 0 ? (
          <span className="text-taupe-deep text-sm">
            PALMA is operating as an institution and selling nothing. That is a valid, and current,
            configuration.
          </span>
        ) : null}
      </div>

      <div className="mt-14 flex flex-col gap-16">
        {FEATURE_GROUPS.map((group) => {
          const entries = FEATURE_LIST.filter((entry) => entry.group === group);
          if (entries.length === 0) return null;

          return (
            <section key={group}>
              <h2 className="palma-label text-taupe-deep border-stone-deep border-b pb-3">
                {group}
              </h2>

              <div className="mt-8 flex flex-col gap-10">
                {entries.map((entry) => {
                  const state = states.find((row) => row.key === entry.key);
                  const rows = overrides.find((row) => row.key === entry.key)?.rows ?? [];

                  return (
                    <div key={entry.key} className="border-stone-deep border p-7">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex min-w-0 flex-col gap-2">
                          <h3 className="font-display text-2xl">{entry.name}</h3>
                          <p className="text-taupe-deep max-w-140 text-sm leading-relaxed">
                            {entry.purpose}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {entry.publicFacing ? <Badge variant="muted">Public</Badge> : null}
                          {entry.seasonAware ? <Badge variant="muted">Per season</Badge> : null}
                          <Badge variant={state?.live ? 'olive' : 'default'}>
                            {state?.live ? 'Live' : 'Off'}
                          </Badge>
                        </div>
                      </div>

                      <p className="text-taupe mt-4 max-w-140 text-xs leading-relaxed">
                        <strong className="text-taupe-deep">Needs first:</strong> {entry.requires}
                      </p>

                      <div className="border-stone-deep mt-6 border-t pt-6">
                        <FeatureSwitch
                          featureKey={entry.key}
                          name={entry.name}
                          seasonAware={entry.seasonAware}
                          seasons={seasons}
                          state={{
                            enabled: state?.enabled ?? false,
                            launchAt: state?.launchAt ?? null,
                            endAt: state?.endAt ?? null,
                          }}
                          overrides={rows.map((row) => ({
                            awardYearId: row.awardYearId,
                            title: row.title,
                            enabled: row.state.enabled,
                          }))}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
