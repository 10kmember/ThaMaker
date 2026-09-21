import { PortalShell } from '@/components/palma/PortalShell';
import { Empty, Action } from '@/components/desk/surface';
import { PageHead, Section } from '@/components/desk/blocks';
import { PortraitForm } from '@/components/account/PortraitForm';
import { LinksForm, ProfileForm } from '@/components/account/PortalForms';
import { buildMetadata } from '@/lib/seo';
import { requireSession } from '@/lib/auth/guards';
import { getCreatorPortal } from '@/server/data/portal';
import { CREATOR_NAV } from '@/lib/creator-nav';
import { User, Camera, FileText, LinkIcon, ArrowLeft, UserX } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Your profile',
  description: 'The portrait, the details and the links on your PALMA record.',
  path: '/creator/profile',
  noIndex: true,
});

/**
 * Everything a creator writes about themselves, on one page.
 *
 * Editable whether or not the record is published: somebody waiting on the
 * desk is exactly the person who needs to fix what the desk is waiting on.
 */
export default async function CreatorProfilePage() {
  const session = await requireSession('/creator/profile');
  const portal = await getCreatorPortal(session.user.id);

  if (!portal?.profile) {
    return (
      <PortalShell
        title="PALMA Portal"
        subtitle="Your profile"
        session={session}
        desk="creator"
        nav={CREATOR_NAV}
        activeHref="/creator/profile"
      >
        <div className="flex max-w-2xl flex-col gap-5">
          <Empty
            icon={UserX}
            title="No record yet"
            description="PALMA has not written a record for you, or you have not claimed one. There is nothing to edit until there is."
          />
          <Action href="/creator" icon={ArrowLeft} className="self-start">
            Back to the overview
          </Action>
        </div>
      </PortalShell>
    );
  }

  return (
    <PortalShell
      title="PALMA Portal"
      subtitle="Your profile"
      session={session}
      desk="creator"
      nav={CREATOR_NAV}
      activeHref="/creator/profile"
    >
      <div className="flex flex-col gap-6">
        <PageHead
          eyebrow="Your profile"
          eyebrowIcon={User}
          title="What PALMA publishes about you"
          statement="Your portrait, your details and the links the editorial desk reads your record from. Everything here is editable whether or not the record is published."
        />

        {/* Words on the left, the picture on the right. The two forms that are
            mostly typing keep a reading measure; the portrait, which is mostly
            looking, sits beside them rather than pushing them down the page. */}
        <div className="grid gap-5 xl:grid-cols-12">
          <div className="flex min-w-0 flex-col gap-5 xl:col-span-7">
            <Section icon={FileText} title="Profile details">
              <ProfileForm defaults={portal.profile} />
            </Section>

            <Section
              icon={LinkIcon}
              title="Where your work lives"
              note="The editorial desk reads your record from these. Keep them current: a dead link is worse than no link, and PALMA will not publish a record it cannot check."
            >
              <LinksForm defaults={portal.links} />
            </Section>
          </div>

          <aside className="flex min-w-0 flex-col gap-5 xl:col-span-5">
            <Section
              icon={Camera}
              title="Your portrait"
              note="One picture, shown on your record, on your nomination link and wherever PALMA names you. Without one your record carries the PALMA plate, which is a deliberate design rather than a gap, but the plate is not you."
            >
              <PortraitForm
                standing={portal.portrait}
                name={portal.displayName ?? session.user.name}
              />
            </Section>
          </aside>
        </div>
      </div>
    </PortalShell>
  );
}
