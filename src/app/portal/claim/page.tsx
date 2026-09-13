import { PortalShell } from '@/components/palma/PortalShell';
import { ClaimForm } from '@/components/account/PortalForms';
import { buildMetadata } from '@/lib/seo';
import { requireSession } from '@/lib/auth/guards';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Claim a profile',
  description: 'Claim your PALMA creator profile.',
  path: '/portal/claim',
  noIndex: true,
});

export default async function ClaimPage({
  searchParams,
}: {
  searchParams: Promise<{ creator?: string }>;
}) {
  const session = await requireSession('/portal/claim');
  const { creator } = await searchParams;

  return (
    <PortalShell title="PALMA Portal" subtitle="Claim a profile" userName={session.user.email}>
      <div className="max-w-140">
        <p className="text-taupe-deep mb-8 leading-relaxed">
          A PALMA profile is created the first time a creator is nominated. Claiming links that
          profile to your account so you can complete verification and manage the details PALMA
          publishes.
        </p>
        <ClaimForm creatorSlug={creator} />
      </div>
    </PortalShell>
  );
}
