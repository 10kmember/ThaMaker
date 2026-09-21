import Link from 'next/link';
import { PortalShell } from '@/components/palma/PortalShell';
import {
  Card,
  List,
  Row,
  RowText,
  Facts,
  Empty,
  Tag,
  Glyph,
  SectionHead,
} from '@/components/desk/surface';
import { PageHead, Panel } from '@/components/desk/blocks';
import { buildMetadata } from '@/lib/seo';
import { requirePermission } from '@/lib/auth/guards';
import { getJudgeAccount } from '@/server/data/judging';
import { JUDGING_NAV } from '@/lib/judging-nav';
import { CONTACTS } from '@/lib/legal';
import { COUNTRIES } from '@/lib/countries';
import { formatDate } from '@/lib/format';
import {
  UserCog,
  Gavel,
  ShieldCheck,
  KeyRound,
  Monitor,
  Lock,
  BookOpen,
  Mail,
  ChevronRight,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Judge account',
  description: 'Your PALMA panel profile, security and confidentiality status.',
  path: '/judge/account',
  noIndex: true,
});

const POLICIES = [
  ['/about/judging', 'How judging works'],
  ['/legal/rules', 'Competition rules'],
  ['/about/policy', 'Content policy'],
  ['/legal/privacy', 'Privacy notice'],
  ['/legal/complaints', 'Complaints and appeals'],
] as const;

const DUTIES = [
  'Scores, rationales and deliberations are confidential permanently. They are not disclosed to nominees, sponsors, the press or the public.',
  'You may not discuss a candidacy outside the panel, or indicate an outcome before PALMA announces it.',
  'You may not accept anything of value from a nominee, or from anyone acting for one, during a season in which you sit.',
  'Declare a conflict the moment you recognise one. The chair decides, not you.',
  'A submitted assessment is immutable. Corrections are an administrative act with their own audit record.',
];

export default async function JudgeAccountPage() {
  const session = await requirePermission('judging:view_assignments', '/judge/account');
  const account = session.user.judgeId
    ? await getJudgeAccount(session.user.judgeId, session.user.id, session.sessionId ?? null)
    : null;

  if (!account) {
    return (
      <PortalShell title="PALMA Judging" session={session} desk="judge">
        <Empty
          icon={Gavel}
          title="No panel membership"
          description="This account is not currently seated on a PALMA panel."
        />
      </PortalShell>
    );
  }

  const country = account.countryCode
    ? (COUNTRIES.find((entry) => entry.code === account.countryCode)?.name ?? account.countryCode)
    : null;

  return (
    <PortalShell
      title="PALMA Judging"
      subtitle="Account"
      nav={JUDGING_NAV}
      activeHref="/judge/account"
      session={session}
      desk="judge"
    >
      <div className="flex flex-col gap-6">
        <PageHead
          eyebrow="Account"
          eyebrowIcon={UserCog}
          title="Your seat on the panel"
          statement="Who sat on a panel is public. What any judge did is never published."
          aside={
            <Tag tone="positive">
              <ShieldCheck className="size-3.5" />
              Seated {formatDate(account.seatedSince)}
            </Tag>
          }
        />

        <div className="grid gap-5 xl:grid-cols-12">
          <div className="flex min-w-0 flex-col gap-5 xl:col-span-7">
            {/* ── Profile ─────────────────────────────────────────────── */}
            <section data-lift="section">
              <SectionHead icon={UserCog} title="Profile" />
              <p className="mb-3 max-w-[68ch] text-[0.8125rem] leading-relaxed text-[color:var(--text-quiet)]">
                This is what appears on{' '}
                <Link
                  href="/about/judges"
                  className="tap font-medium text-[color:var(--accent)] underline-offset-4 hover:underline"
                >
                  the public panel page
                </Link>
                .
              </p>
              <Card className="glow overflow-hidden" data-lift="list">
                <Facts
                  items={[
                    { term: 'Name', value: account.displayName },
                    { term: 'Title', value: account.title ?? 'Not given' },
                    { term: 'Organisation', value: account.organisation ?? 'Not given' },
                    { term: 'Based', value: country ?? 'Not given' },
                    { term: 'Seated since', value: formatDate(account.seatedSince) },
                    {
                      term: 'Panels',
                      value:
                        account.seasons.length > 0
                          ? account.seasons
                              .map((season) => `${season.year}${season.isChair ? ' (chair)' : ''}`)
                              .join(', ')
                          : 'None yet',
                    },
                  ]}
                />
                {account.biography ? (
                  <p className="border-t border-[color:var(--line)] p-4 text-[0.8125rem] leading-relaxed text-[color:var(--text-soft)]">
                    {account.biography}
                  </p>
                ) : null}
              </Card>
              <p className="mt-3 text-[0.75rem] leading-relaxed text-[color:var(--text-quiet)]">
                To change any of this, write to{' '}
                <a
                  href={`mailto:${CONTACTS.general}`}
                  className="tap font-medium text-[color:var(--accent)] underline-offset-4 hover:underline"
                >
                  {CONTACTS.general}
                </a>
                . Panel profiles are edited by PALMA rather than self-served, so the public page and
                the record agree.
              </p>
            </section>

            {/* ── Security ────────────────────────────────────────────── */}
            <section data-lift="section">
              <SectionHead icon={KeyRound} title="Security" />
              <Card className="glow overflow-hidden" data-lift="list">
                <Facts
                  items={[
                    { term: 'Email', value: account.email },
                    {
                      term: 'Email verified',
                      value: account.emailVerified ? (
                        <Tag tone="positive">Yes</Tag>
                      ) : (
                        <Tag tone="accent">No</Tag>
                      ),
                    },
                    {
                      term: 'Last sign-in',
                      value: account.lastLoginAt ? formatDate(account.lastLoginAt) : 'Not recorded',
                    },
                    { term: 'Password', value: 'Hashed with scrypt. PALMA cannot read it.' },
                    {
                      term: 'Two-factor authentication',
                      value: 'Not yet available. Planned before judging opens.',
                    },
                  ]}
                />
              </Card>
            </section>

            {/* ── Sessions ────────────────────────────────────────────── */}
            <section data-lift="section">
              <SectionHead
                icon={Monitor}
                title="Active sessions"
                action={<Tag>{account.sessions.length}</Tag>}
              />
              <List className="glow" data-lift="list">
                {account.sessions.map((item) => (
                  <Row key={item.id}>
                    <Glyph
                      icon={Monitor}
                      size="sm"
                      tone={item.isCurrent ? 'positive' : 'neutral'}
                    />
                    <RowText
                      title={item.userAgent ?? 'Unrecorded device'}
                      note={`Since ${formatDate(item.createdAt)}`}
                    />
                    {item.isCurrent ? (
                      <Tag tone="positive" className="ml-auto">
                        This device
                      </Tag>
                    ) : null}
                  </Row>
                ))}
              </List>
              <p className="mt-3 text-[0.75rem] leading-relaxed text-[color:var(--text-quiet)]">
                Signing out ends the session on this device. To end every other session, write to{' '}
                <a
                  href={`mailto:${CONTACTS.security}`}
                  className="tap font-medium text-[color:var(--accent)] underline-offset-4 hover:underline"
                >
                  {CONTACTS.security}
                </a>
                .
              </p>
            </section>
          </div>

          <aside className="flex min-w-0 flex-col gap-5 xl:col-span-5">
            {/* ── Confidentiality ─────────────────────────────────────── */}
            <Card className="glow overflow-hidden" data-lift="section">
              <div className="flex items-center gap-2.5 p-4">
                <Glyph icon={Lock} size="sm" tone="accent" />
                <h2 className="font-display text-[0.9375rem] text-[color:var(--text)]">
                  Confidentiality
                </h2>
              </div>
              <ul className="flex flex-col gap-2.5 border-t border-[color:var(--line)] p-4">
                {DUTIES.map((duty) => (
                  <li
                    key={duty}
                    className="flex gap-2.5 text-[0.8125rem] leading-relaxed text-[color:var(--text-soft)]"
                  >
                    <span
                      className="mt-[0.45rem] size-1 shrink-0 rounded-full bg-[color:var(--accent)]"
                      aria-hidden
                    />
                    {duty}
                  </li>
                ))}
              </ul>
              <Facts
                className="border-t border-[color:var(--line)]"
                items={[
                  { term: 'Judge agreement', value: <Tag tone="positive">Accepted</Tag> },
                  { term: 'Confidentiality', value: <Tag tone="positive">In force</Tag> },
                ]}
              />
            </Card>

            {/* ── Policies ────────────────────────────────────────────── */}
            <section data-lift="section">
              <SectionHead icon={BookOpen} title="PALMA policies" />
              <List className="glow" data-lift="list">
                {POLICIES.map(([href, label]) => (
                  <Row key={href} href={href}>
                    <RowText title={label} />
                    <ChevronRight
                      className="ml-auto size-4 shrink-0 -translate-x-1 text-[color:var(--text-quiet)] opacity-0 transition-all duration-400 group-hover:translate-x-0 group-hover:opacity-100"
                      aria-hidden
                    />
                  </Row>
                ))}
              </List>
            </section>

            <Panel icon={Mail} title="What PALMA writes to you about">
              New assignments, reassignments, conflict decisions, deadline reminders, judging
              opening and closing, and administrative announcements. Nothing else. There is no feed
              here to subscribe to.
            </Panel>
          </aside>
        </div>
      </div>
    </PortalShell>
  );
}
