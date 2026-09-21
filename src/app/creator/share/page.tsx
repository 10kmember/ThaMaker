import Link from 'next/link';
import { PortalShell } from '@/components/palma/PortalShell';
import { Card, SectionHead, Snippet, Action, Glyph, Tag } from '@/components/desk/surface';
import { PageHead, Panel } from '@/components/desk/blocks';
import { CopyLink, CopyMark } from '@/components/palma/CopyLink';
import { buildMetadata, absoluteUrl } from '@/lib/seo';
import { requireSession } from '@/lib/auth/guards';
import { getCreatorPortal } from '@/server/data/portal';
import { CREATOR_NAV } from '@/lib/creator-nav';
import { Link as LinkIcon, Megaphone, BadgeCheck, Award, Eye, Download, Scale } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Your links',
  description: 'The link you share to be nominated, and the one that proves what you hold.',
  path: '/creator/share',
  noIndex: true,
});

/**
 * A creator has two addresses, and they do opposite jobs.
 *
 * The nomination link asks for something: it opens a form with the creator
 * already chosen, and it only matters while nominations are open. The record
 * link proves something: it is permanent, it leads with the most recent
 * honour, and it keeps working as more are won, so the one printed in a press
 * kit never has to be reissued.
 *
 * They were previously two cards in a column of nine, which is why nobody
 * could tell them apart. Here they are the page, side by side, each said
 * plainly, and each one's tone says which job it does.
 */
export default async function CreatorSharePage() {
  const session = await requireSession('/creator/share');
  const portal = await getCreatorPortal(session.user.id);

  const recordPath = portal?.creatorSlug ? `/c/${portal.creatorSlug}` : null;
  const newest = portal?.achievements[0] ?? null;

  return (
    <PortalShell
      title="PALMA Portal"
      subtitle="Your links"
      session={session}
      desk="creator"
      nav={CREATOR_NAV}
      activeHref="/creator/share"
    >
      <div className="flex flex-col gap-6">
        <PageHead
          eyebrow="Your links"
          eyebrowIcon={LinkIcon}
          title="Two addresses, opposite jobs"
          statement="One asks your audience to put you forward. The other proves what you already hold. Neither is a substitute for the other, so they are kept apart."
        />

        <div className="grid gap-4 lg:grid-cols-2">
          {/* ── The link that asks ──────────────────────────────────────── */}
          <Card className="glow flex flex-col gap-3 p-5" data-lift="figure">
            <div className="flex items-center gap-2.5">
              <Glyph icon={Megaphone} size="sm" tone="accent" />
              <h2 className="font-display text-[0.9375rem] text-[color:var(--text)]">
                The link you share
              </h2>
              <Tag className="ml-auto">While nominations are open</Tag>
            </div>
            <p className="text-[0.8125rem] leading-relaxed text-[color:var(--text-soft)]">
              Put this in a bio or a post. It opens a nomination page with you already chosen, so
              nobody has to search for you. It carries no extra weight with the panel, and the
              number of nominations it brings in decides nothing.
            </p>

            {portal?.referralPath ? (
              <>
                <Snippet
                  value={absoluteUrl(portal.referralPath)}
                  action={
                    <CopyMark
                      value={absoluteUrl(portal.referralPath)}
                      label="Copy your nomination link"
                    />
                  }
                />
                <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
                  <CopyLink
                    value={absoluteUrl(portal.referralPath)}
                    label="Copy link"
                    className="rounded-full"
                  />
                  <Action href={portal.referralPath} icon={Eye}>
                    Preview
                  </Action>
                </div>
              </>
            ) : (
              <p className="text-[0.8125rem] leading-relaxed text-[color:var(--text-quiet)]">
                Issued once your record is claimed and verified. Finish{' '}
                <Link
                  href="/creator/verification"
                  className="tap font-medium text-[color:var(--accent)] underline-offset-4 hover:underline"
                >
                  verification
                </Link>{' '}
                and it appears here.
              </p>
            )}
          </Card>

          {/* ── The link that proves ────────────────────────────────────── */}
          <Card className="glow flex flex-col gap-3 p-5" data-lift="figure">
            <div className="flex items-center gap-2.5">
              <Glyph icon={BadgeCheck} size="sm" tone="positive" />
              <h2 className="font-display text-[0.9375rem] text-[color:var(--text)]">
                The link that proves it
              </h2>
              <Tag tone="positive" className="ml-auto">
                Permanent
              </Tag>
            </div>
            <p className="text-[0.8125rem] leading-relaxed text-[color:var(--text-soft)]">
              One address, for good. It leads with your most recent honour and keeps working as you
              win more, so it never has to be reissued. This is the one for a press kit, a CV or a
              profile that outlives a season.
            </p>

            {recordPath ? (
              <>
                <Snippet
                  value={absoluteUrl(recordPath)}
                  action={
                    <CopyMark value={absoluteUrl(recordPath)} label="Copy your record link" />
                  }
                />
                <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
                  <CopyLink
                    value={absoluteUrl(recordPath)}
                    label="Copy link"
                    className="rounded-full"
                  />
                  <Action href={recordPath} icon={Eye}>
                    Preview
                  </Action>
                </div>
              </>
            ) : (
              <p className="text-[0.8125rem] leading-relaxed text-[color:var(--text-quiet)]">
                Your record link appears once PALMA holds a record for you.
              </p>
            )}
          </Card>
        </div>

        {/* The code and the policy that governs it sit together: the page has
            two halves above, and this keeps the lower half from running the
            full width as a single band. */}
        <div className="grid gap-5 xl:grid-cols-12">
          {/* ── A single honour ─────────────────────────────────────────── */}
          <section data-lift="section" className="min-w-0 xl:col-span-7">
            <SectionHead icon={Award} title="A single honour, on its own" />
            <Card className="glow p-5">
              <p className="mb-4 max-w-[68ch] text-[0.8125rem] leading-relaxed text-[color:var(--text-soft)]">
                Each honour also has its own permanent page and verification code, for when you are
                citing one specifically rather than the whole record. Anyone can check it without an
                account.
              </p>

              {newest ? (
                <div className="flex flex-wrap items-center gap-2.5">
                  <Snippet
                    value={newest.code}
                    className="w-auto"
                    action={<CopyMark value={newest.code} label="Copy the verification code" />}
                  />
                  <Action href={`/verify/${newest.code}`} icon={Eye}>
                    Open the verification page
                  </Action>
                  <a
                    href={`/verify/${newest.code}/opengraph-image`}
                    download
                    className="tap inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[0.8125rem] font-medium text-[color:var(--accent)] ring-1 ring-[color:var(--accent)]/25 transition-transform duration-400 [transition-timing-function:var(--spring)] ring-inset hover:-translate-y-0.5"
                  >
                    <Download className="size-3.5" />
                    Share card
                  </a>
                </div>
              ) : (
                <p className="text-[0.8125rem] text-[color:var(--text-quiet)]">
                  Available once you hold an honour.
                </p>
              )}
            </Card>
          </section>

          <Panel icon={Scale} title="On using the mark" className="min-w-0 xl:col-span-5">
            Winners and finalists may state the honour they hold anywhere. Share cards are generated
            from the record itself, so they cannot misstate it. What the mark may and may not sit
            beside is in the{' '}
            <Link
              href="/legal/mark"
              className="tap font-medium text-[color:var(--accent)] underline-offset-4 hover:underline"
            >
              mark policy
            </Link>
            .
          </Panel>
        </div>
      </div>
    </PortalShell>
  );
}
