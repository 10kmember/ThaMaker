import Link from 'next/link';
import { PortalShell } from '@/components/palma/PortalShell';
import { Stat } from '@/components/ui/stat';
import { Badge } from '@/components/ui/badge';
import { Table, TBody, THead } from '@/components/ui/table';
import { EmptyState, Notice } from '@/components/ui/feedback';
import { Button } from '@/components/ui/button';
import { CopyLink } from '@/components/palma/CopyLink';
import { PortraitForm } from '@/components/account/PortraitForm';
import {
  LinksForm,
  PreferencesForm,
  ProfileForm,
  VerificationForm,
} from '@/components/account/PortalForms';
import { buildMetadata, absoluteUrl } from '@/lib/seo';
import { requireSession } from '@/lib/auth/guards';
import { getCreatorPortal } from '@/server/data/portal';
import { formatShortDate } from '@/lib/format';
import { titleCase } from '@/lib/utils';
import { isStaff } from '@/lib/auth/rbac';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Creator portal',
  description: 'Manage your PALMA creator record.',
  path: '/creator',
  noIndex: true,
});

export default async function PortalPage() {
  const session = await requireSession('/creator');
  const portal = await getCreatorPortal(session.user.id);

  if (!portal) {
    return (
      <PortalShell title="PALMA Portal" userName={session.user.name}>
        <Notice tone="warning" title="Account not found">
          This account could not be loaded. Sign out and in again, or contact PALMA.
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
      <div className="border-stone-deep grid gap-10 border-b pb-10 sm:grid-cols-4">
        <Stat label="PALMA honours" value={portal.achievements.length} />
        <Stat label="Candidacies" value={portal.candidacies.length} />
        <Stat label="Verification" value={titleCase(portal.verification.status)} />
        <Stat label="Profile" value={portal.isPublished ? 'Published' : 'Unpublished'} />
      </div>

      {/* An account with no record is the ordinary state of somebody who has
          just signed up. Three routes out of it, and none is a dead end. */}
      {!portal.hasProfile ? (
        <section className="border-stone-deep mt-12 border p-8">
          <span className="palma-label text-taupe-deep">No record yet</span>
          <h2 className="mt-3 text-3xl leading-tight">
            PALMA has not written a record for you, or you have not claimed it.
          </h2>
          <p className="text-taupe-deep mt-4 max-w-160 leading-relaxed">
            A record is usually written the first time a creator is nominated, so one may already
            exist. If it does not, you can start one: either write it yourself, or give PALMA the
            links and let the editorial desk write it from the work.
          </p>

          <div className="mt-8 grid gap-px sm:grid-cols-2">
            <div className="border-stone-deep flex flex-col gap-3 border p-6">
              <span className="palma-label text-champagne-deep">If it already exists</span>
              <p className="text-taupe-deep text-sm leading-relaxed">
                Search the archive and claim it. PALMA reviews every claim by hand before the record
                is treated as yours.
              </p>
              <Button asChild variant="outline" size="sm" className="mt-auto self-start">
                <Link href="/creator/claim">Claim a record</Link>
              </Button>
            </div>

            <div className="border-stone-deep flex flex-col gap-3 border p-6">
              <span className="palma-label text-champagne-deep">If it does not</span>
              <p className="text-taupe-deep text-sm leading-relaxed">
                Start one. Write it yourself or ask PALMA to write it from your links. Either way a
                moderator checks it before it is published.
              </p>
              <Button asChild size="sm" className="mt-auto self-start">
                <Link href="/creator/start">Start a record</Link>
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      {portal.hasProfile && !portal.isPublished ? (
        <Notice className="mt-10" tone="ceremonial" title="Your record is with PALMA">
          It is held by your account and waiting on a moderator. Nothing is public until they
          publish it, and you can keep editing it in the meantime.
        </Notice>
      ) : null}

      <div className="mt-14 grid gap-14 lg:grid-cols-12">
        <div className="flex min-w-0 flex-col gap-14 lg:col-span-7">
          <section>
            <h2 className="palma-label text-taupe-deep mb-6">Your PALMA record</h2>
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
                    className="border-stone-deep flex flex-wrap items-center justify-between gap-4 border-b py-5"
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
            <h2 className="palma-label text-taupe-deep mb-6">Where you are in contention</h2>
            {portal.candidacies.length === 0 ? (
              <EmptyState
                title="No candidacies yet"
                description="A candidacy is created the first time someone nominates you in a category. Share your nomination link to let your audience put you forward."
              />
            ) : (
              <Table>
                <THead>
                  <tr>
                    <th scope="col">Reference</th>
                    <th scope="col">Category</th>
                    <th scope="col">Season</th>
                    <th scope="col">Status</th>
                  </tr>
                </THead>
                <TBody>
                  {portal.candidacies.map((candidacy) => (
                    <tr key={candidacy.id}>
                      <td className="font-mono text-xs tracking-wider">{candidacy.reference}</td>
                      <td className="font-display text-lg">{candidacy.categoryName}</td>
                      <td className="text-taupe-deep">{candidacy.year}</td>
                      <td>
                        <Badge variant={candidacy.status === 'winner' ? 'champagne' : 'default'}>
                          {titleCase(candidacy.status)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </TBody>
              </Table>
            )}
            <p className="text-taupe-deep mt-5 text-sm leading-relaxed">
              PALMA does not show you how many nominations you have received. Nomination numbers do
              not decide outcomes, and a running total would only invite you to campaign for one.
            </p>
          </section>

          {/* Editable whether or not the record is published, the person
              waiting on a moderator is exactly the one who needs to fix it. */}
          {portal.profile ? (
            <>
              <section>
                <h2 className="palma-label text-taupe-deep mb-2">Your portrait</h2>
                <p className="text-taupe-deep mb-6 max-w-140 text-sm leading-relaxed">
                  One picture, shown on your record, on your nomination link and wherever PALMA
                  names you. Without one your record carries the PALMA plate, which is a deliberate
                  design rather than a gap, but the plate is not you.
                </p>
                <PortraitForm
                  standing={portal.portrait}
                  name={portal.displayName ?? session.user.name}
                />
              </section>

              <section>
                <h2 className="palma-label text-taupe-deep mb-6">Profile details</h2>
                <ProfileForm defaults={portal.profile} />
              </section>

              <section>
                <h2 className="palma-label text-taupe-deep mb-2">Where your work lives</h2>
                <p className="text-taupe-deep mb-6 max-w-140 text-sm leading-relaxed">
                  The editorial desk reads your record from these. Keep them current: a dead link is
                  worse than no link, and PALMA will not publish a record it cannot check.
                </p>
                <LinksForm defaults={portal.links} />
              </section>
            </>
          ) : null}
        </div>

        <aside className="flex min-w-0 flex-col gap-10 lg:col-span-5">
          <section className="border-stone-deep border p-7">
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
              <p className="text-taupe-deep mt-4 text-xs">
                Verified {formatShortDate(portal.verification.verifiedAt)}
                {portal.verification.expiresAt
                  ? ` · renews ${formatShortDate(portal.verification.expiresAt)}`
                  : ''}
              </p>
            ) : null}
          </section>

          <section className="border-stone-deep border p-7">
            <h2 className="palma-label text-taupe-deep mb-5">Your nomination link</h2>
            {portal.referralPath ? (
              <>
                <p className="text-taupe-deep mb-4 text-sm leading-relaxed">
                  Share this with your audience. It opens a nomination page with you already chosen
                  . Nothing more. It carries no extra weight with the panel, and the number of
                  nominations it brings in does not decide anything.
                </p>
                <p className="border-stone-deep bg-stone/25 mb-4 border px-4 py-3 font-mono text-sm break-all">
                  {absoluteUrl(portal.referralPath)}
                </p>
                <div className="flex flex-wrap gap-2">
                  <CopyLink value={absoluteUrl(portal.referralPath)} label="Copy nomination link" />
                  <Button asChild size="sm" variant="ghost">
                    <Link href={portal.referralPath}>Preview it</Link>
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-taupe-deep text-sm leading-relaxed">
                Your nomination link is issued once your profile is claimed and verified. Complete
                verification above to receive it.
              </p>
            )}
          </section>

          <section className="border-stone-deep border p-7">
            <h2 className="palma-label text-taupe-deep mb-5">PALMA assets</h2>
            <p className="text-taupe-deep mb-5 text-sm leading-relaxed">
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
              <p className="text-taupe text-sm">Available once you hold an honour.</p>
            )}
          </section>

          <section className="border-stone-deep border p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="palma-label text-taupe-deep">Your Dossier</h2>
              {portal.dossier.unread > 0 ? (
                <Badge variant={portal.dossier.important > 0 ? 'champagne' : 'default'}>
                  {portal.dossier.unread} unread
                </Badge>
              ) : null}
            </div>
            <p className="text-taupe-deep mt-4 text-sm leading-relaxed">
              Everything PALMA has told you, kept. Decisions on your record, honours, and changes to
              your account. Entries are written whether or not the email reached you.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button asChild variant="outline" size="sm">
                <Link href="/dossier">Open your Dossier</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/account">Account & security</Link>
              </Button>
            </div>

            <div className="border-stone-deep mt-7 border-t pt-6">
              <h3 className="palma-label text-taupe-deep mb-2">What reaches your inbox</h3>
              <p className="text-taupe mb-5 text-xs leading-relaxed">
                These govern announcements only. Decisions about your record, and anything
                concerning the safety of your account, are sent regardless, an institution you can
                mute is not keeping you informed.
              </p>
              <PreferencesForm defaults={portal.preferences} />
            </div>

            <div className="border-stone-deep mt-7 border-t pt-6">
              <h3 className="palma-label text-taupe-deep mb-2">PALMA lists</h3>
              <p className="text-taupe mb-4 text-xs leading-relaxed">
                Five separate subscriptions, each opt-in on its own. Nothing above puts you on any
                of them.
              </p>
              <p className="text-taupe-deep mb-4 text-sm">
                {portal.subscriptions.length === 0
                  ? 'You are on none of them.'
                  : `You are on ${portal.subscriptions.length} of 5.`}
              </p>
              <Button asChild variant="outline" size="sm">
                <Link href="/account/email-preferences">Choose what reaches you</Link>
              </Button>
            </div>
          </section>

          {session.user.judgeId ? (
            <section className="border-stone-deep border p-7">
              <h2 className="palma-label text-taupe-deep mb-3">Judging</h2>
              <p className="text-taupe-deep mb-4 text-sm">
                You are seated on a PALMA panel this season.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link href="/judge">Open the judge portal</Link>
              </Button>
            </section>
          ) : null}

          {isStaff(session.user.role) ? (
            <section className="border-stone-deep border p-7">
              <h2 className="palma-label text-taupe-deep mb-3">Administration</h2>
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
