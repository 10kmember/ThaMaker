import Link from 'next/link';
import { PortalShell } from '@/components/palma/PortalShell';
import { Stat } from '@/components/ui/stat';
import { Badge } from '@/components/ui/badge';
import { Table, TBody, THead } from '@/components/ui/table';
import { EmptyState, Notice } from '@/components/ui/feedback';
import { Button } from '@/components/ui/button';
import { CopyLink } from '@/components/palma/CopyLink';
import {
  PreferencesForm,
  ProfileForm,
  VerificationForm,
} from '@/components/account/PortalForms';
import { buildMetadata, absoluteUrl } from '@/lib/seo';
import { requireSession } from '@/lib/auth/guards';
import { getCreatorPortal } from '@/server/data/portal';
import { getCreator } from '@/server/data/queries';
import { formatShortDate } from '@/lib/format';
import { titleCase } from '@/lib/utils';
import { isStaff } from '@/lib/auth/rbac';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Creator portal',
  description: 'Manage your PALMA creator record.',
  path: '/portal',
  noIndex: true,
});

export default async function PortalPage() {
  const session = await requireSession('/portal');
  const portal = await getCreatorPortal(session.user.id);
  const creator = session.user.creatorSlug ? await getCreator(session.user.creatorSlug) : null;

  if (!portal) {
    return (
      <PortalShell title="PALMA Portal" userName={session.user.name}>
        <Notice tone="warning" title="Archive mode">
          PALMA is running without a database in this environment, so the portal has nothing to
          show.
        </Notice>
      </PortalShell>
    );
  }

  const verified = portal.verification.status === 'verified';

  return (
    <PortalShell
      title="PALMA Portal"
      subtitle={portal.displayName ?? session.user.name}
      userName={session.user.email}
    >
      <div className="grid gap-10 border-b border-stone-deep pb-10 sm:grid-cols-4">
        <Stat label="PALMA honours" value={portal.achievements.length} />
        <Stat label="Nominations made" value={portal.nominations.length} />
        <Stat label="Verification" value={titleCase(portal.verification.status)} />
        <Stat label="Profile" value={portal.isPublished ? 'Published' : 'Unpublished'} />
      </div>

      {!portal.hasProfile ? (
        <Notice className="mt-10" tone="ceremonial" title="No creator profile yet">
          If a PALMA profile already exists for you, claim it — otherwise one is created the first
          time you are nominated.{' '}
          <Link href="/portal/claim" className="underline underline-offset-4">
            Claim a profile
          </Link>
          .
        </Notice>
      ) : null}

      <div className="mt-14 grid gap-14 lg:grid-cols-12">
        <div className="flex flex-col gap-14 lg:col-span-7">
          <section>
            <h2 className="palma-label mb-6 text-taupe-deep">Your PALMA record</h2>
            {portal.achievements.length === 0 ? (
              <EmptyState
                title="No honours yet"
                description="Honours appear here the moment they are conferred, each with its permanent verification link."
              />
            ) : (
              <ul className="flex flex-col">
                {portal.achievements.map((achievement) => (
                  <li
                    key={achievement.code}
                    className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-deep py-5"
                  >
                    <span className="flex flex-col gap-1">
                      <span className="font-display text-lg">{achievement.categoryName}</span>
                      <span className="palma-label text-taupe-deep">
                        {titleCase(achievement.kind)} · {achievement.year}
                      </span>
                    </span>
                    <span className="flex items-center gap-3">
                      {achievement.state === 'revoked' ? (
                        <Badge variant="muted">Revoked</Badge>
                      ) : (
                        <CopyLink
                          value={absoluteUrl(`/verify/${achievement.code}`)}
                          label="Copy verification link"
                        />
                      )}
                      <Link
                        href={`/verify/${achievement.code}`}
                        className="palma-label text-olive hover:text-ink"
                      >
                        View
                      </Link>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="palma-label mb-6 text-taupe-deep">Nominations you have submitted</h2>
            {portal.nominations.length === 0 ? (
              <EmptyState
                title="No nominations yet"
                description="Nominations you submit appear here with their current status."
                action={
                  <Button asChild size="sm" variant="outline">
                    <Link href="/nominate">Nominate a creator</Link>
                  </Button>
                }
              />
            ) : (
              <Table>
                <THead>
                  <tr>
                    <th scope="col">Reference</th>
                    <th scope="col">Creator</th>
                    <th scope="col">Category</th>
                    <th scope="col">Status</th>
                  </tr>
                </THead>
                <TBody>
                  {portal.nominations.map((nomination) => (
                    <tr key={nomination.id}>
                      <td className="font-mono text-xs tracking-wider">{nomination.reference}</td>
                      <td className="font-display text-lg">{nomination.creatorName}</td>
                      <td className="text-taupe-deep">
                        {nomination.categoryName} · {nomination.year}
                      </td>
                      <td>
                        <Badge variant={nomination.status === 'winner' ? 'champagne' : 'default'}>
                          {titleCase(nomination.status)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </TBody>
              </Table>
            )}
          </section>

          {portal.hasProfile && creator ? (
            <section>
              <h2 className="palma-label mb-6 text-taupe-deep">Profile details</h2>
              <ProfileForm
                defaults={{
                  displayName: creator.displayName,
                  pronouns: creator.pronouns ?? '',
                  countryCode: creator.countryCode,
                  city: creator.city ?? '',
                  headline: creator.headline ?? '',
                  biography: creator.biography ?? '',
                  websiteUrl: creator.websiteUrl ?? '',
                }}
              />
            </section>
          ) : null}
        </div>

        <aside className="flex flex-col gap-10 lg:col-span-5">
          <section className="border border-stone-deep p-7">
            <div className="flex items-center justify-between gap-4">
              <h2 className="palma-label text-taupe-deep">Verification</h2>
              <Badge variant={verified ? 'olive' : 'default'}>
                {titleCase(portal.verification.status)}
              </Badge>
            </div>
            <div className="mt-5">
              <VerificationForm status={portal.verification.status} />
            </div>
            {portal.verification.verifiedAt ? (
              <p className="mt-4 text-xs text-taupe-deep">
                Verified {formatShortDate(portal.verification.verifiedAt)}
                {portal.verification.expiresAt
                  ? ` · renews ${formatShortDate(portal.verification.expiresAt)}`
                  : ''}
              </p>
            ) : null}
          </section>

          <section className="border border-stone-deep p-7">
            <h2 className="palma-label mb-5 text-taupe-deep">PALMA assets</h2>
            <p className="mb-5 text-sm leading-relaxed text-taupe-deep">
              Winners and finalists may use the PALMA mark to state the honour they hold. Share
              cards are generated from the record, so they cannot misstate it.
            </p>
            {portal.achievements.length > 0 ? (
              <Button asChild variant="outline" size="sm">
                <a href={`/verify/${portal.achievements[0]!.code}/opengraph-image`} download>
                  Download share card
                </a>
              </Button>
            ) : (
              <p className="text-sm text-taupe">Available once you hold an honour.</p>
            )}
          </section>

          <section className="border border-stone-deep p-7">
            <h2 className="palma-label mb-5 text-taupe-deep">Notifications</h2>
            <PreferencesForm defaults={portal.preferences} />
          </section>

          {session.user.judgeId ? (
            <section className="border border-stone-deep p-7">
              <h2 className="palma-label mb-3 text-taupe-deep">Judging</h2>
              <p className="mb-4 text-sm text-taupe-deep">
                You are seated on a PALMA panel this season.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link href="/judging">Open the judge portal</Link>
              </Button>
            </section>
          ) : null}

          {isStaff(session.user.role) ? (
            <section className="border border-stone-deep p-7">
              <h2 className="palma-label mb-3 text-taupe-deep">Administration</h2>
              <Button asChild variant="outline" size="sm">
                <Link href="/admin">Open the admin portal</Link>
              </Button>
            </section>
          ) : null}
        </aside>
      </div>
    </PortalShell>
  );
}
