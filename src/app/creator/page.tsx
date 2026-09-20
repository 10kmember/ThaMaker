import { PortalShell } from '@/components/palma/PortalShell';
import { CreatorOverview } from '@/components/desk/CreatorOverview';
import { Empty } from '@/components/desk/surface';
import { CopyLink } from '@/components/palma/CopyLink';
import { buildMetadata, absoluteUrl } from '@/lib/seo';
import { requireSession } from '@/lib/auth/guards';
import { getCreatorPortal } from '@/server/data/portal';
import { titleCase } from '@/lib/utils';
import { CREATOR_NAV } from '@/lib/creator-nav';
import { UserX } from 'lucide-react';

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
      <PortalShell title="PALMA Portal" session={session}>
        <Empty
          icon={UserX}
          title="Account not found"
          description="This account could not be loaded. Sign out and in again, or contact PALMA."
        />
      </PortalShell>
    );
  }

  const verified = portal.verification.status === 'verified';

  return (
    <PortalShell
      title="PALMA Portal"
      subtitle="Your record, your standing"
      nav={CREATOR_NAV}
      activeHref="/creator"
      session={session}
      verified={verified}
    >
      <CreatorOverview
        displayName={portal.displayName ?? session.user.name}
        honours={portal.achievements.map((achievement) => ({
          code: achievement.code,
          categoryName: achievement.categoryName,
          kind: titleCase(achievement.kind),
          year: achievement.year,
          revoked: achievement.state === 'revoked',
          verifyHref: `/verify/${achievement.code}`,
        }))}
        candidacies={portal.candidacies.map((candidacy) => ({
          id: candidacy.id,
          reference: candidacy.reference,
          categoryName: candidacy.categoryName,
          year: candidacy.year,
          status: titleCase(candidacy.status),
          winner: candidacy.status === 'winner',
        }))}
        verificationStatus={titleCase(portal.verification.status)}
        verified={verified}
        published={portal.isPublished}
        hasProfile={portal.hasProfile}
        copySlot={(code: string) => (
          <CopyLink
            value={absoluteUrl(`/verify/${code}`)}
            label="Copy link"
            compact
            className="rounded-full border-[color:var(--line)] px-2.5 py-1 text-[0.625rem] max-sm:size-11 max-sm:px-0 sm:pointer-coarse:min-h-11 sm:pointer-coarse:px-3"
          />
        )}
      />
    </PortalShell>
  );
}
