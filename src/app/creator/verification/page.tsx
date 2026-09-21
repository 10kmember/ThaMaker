import { PortalShell } from '@/components/palma/PortalShell';
import { Card, Facts, Tag, Dot } from '@/components/desk/surface';
import { PageHead, Section } from '@/components/desk/blocks';
import { Panel } from '@/components/desk/blocks';
import { VerificationForm } from '@/components/account/PortalForms';
import { buildMetadata } from '@/lib/seo';
import { requireSession } from '@/lib/auth/guards';
import { getCreatorPortal } from '@/server/data/portal';
import { formatShortDate } from '@/lib/format';
import { titleCase } from '@/lib/utils';
import { CREATOR_NAV } from '@/lib/creator-nav';
import { ShieldCheck, Lock, FileClock } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Verification',
  description: 'Age and identity assurance on your PALMA record.',
  path: '/creator/verification',
  noIndex: true,
});

export default async function CreatorVerificationPage() {
  const session = await requireSession('/creator/verification');
  const portal = await getCreatorPortal(session.user.id);
  const status = portal?.verification.status ?? 'unverified';
  const verified = status === 'verified';

  return (
    <PortalShell
      title="PALMA Portal"
      subtitle="Verification"
      session={session}
      desk="creator"
      nav={CREATOR_NAV}
      activeHref="/creator/verification"
      verified={verified}
    >
      <div className="flex flex-col gap-5">
        <PageHead
          eyebrow="Verification"
          eyebrowIcon={ShieldCheck}
          title="Age and identity assurance"
          statement="PALMA confers nothing on an unverified record. Assurance is handled by a specialist provider, and PALMA keeps only the outcome, a reference and a date."
          aside={
            <Tag tone={verified ? 'positive' : 'accent'}>
              {verified ? <Dot /> : null}
              {titleCase(status)}
            </Tag>
          }
        />

        <div className="grid gap-5 xl:grid-cols-12">
          <Section
            icon={ShieldCheck}
            title={verified ? 'Your assurance' : 'Complete verification'}
            className="min-w-0 xl:col-span-7"
          >
            <VerificationForm status={status} />
          </Section>

          <div className="flex min-w-0 flex-col gap-5 xl:col-span-5">
            {/* What PALMA actually holds on this account, item by item. It is
                a short list on purpose: the shortness is the point the page
                is making, so it is shown rather than asserted. */}
            <Card className="glow overflow-hidden" data-lift="section">
              <div className="flex items-center gap-2.5 p-4 pb-1">
                <FileClock className="size-4 text-[color:var(--text-quiet)]" strokeWidth={1.75} />
                <h3 className="font-display text-sm text-[color:var(--text)]">
                  Everything on your record
                </h3>
              </div>
              <Facts
                items={[
                  { term: 'Outcome', value: titleCase(status) },
                  { term: 'Provider', value: portal?.verification.provider ?? 'Not yet assigned' },
                  {
                    term: 'Checked',
                    value: portal?.verification.verifiedAt
                      ? formatShortDate(portal.verification.verifiedAt)
                      : 'Not yet',
                  },
                  {
                    term: 'Renews',
                    value: portal?.verification.expiresAt
                      ? formatShortDate(portal.verification.expiresAt)
                      : 'Not applicable',
                  },
                ]}
              />
            </Card>

            <Panel icon={Lock} title="What PALMA keeps">
              No document, no date of birth, no identity number, and nothing a person could be
              re-identified from. Every creator PALMA honours is an adult, and the institution has
              to be able to say so without keeping a drawer full of identity papers. This is the
              whole of how it does that.
            </Panel>
          </div>
        </div>
      </div>
    </PortalShell>
  );
}
