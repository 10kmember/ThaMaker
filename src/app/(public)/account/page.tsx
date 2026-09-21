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
  Action,
} from '@/components/desk/surface';
import { PageHead, Section, Panel } from '@/components/desk/blocks';
import {
  ChangeEmailForm,
  ChangePasswordForm,
  CloseAccountForm,
  RevokeSessionsForm,
} from '@/components/account/AccountForms';
import { buildMetadata } from '@/lib/seo';
import { requireSession } from '@/lib/auth/guards';
import { homeForRole } from '@/lib/auth/entrances';
import { sql } from '@/server/db/sql';
import { formatShortDate } from '@/lib/format';
import { titleCase } from '@/lib/utils';
import { CONTACTS } from '@/lib/legal';
import {
  Settings,
  KeyRound,
  Mail,
  Monitor,
  UserX,
  Inbox,
  LayoutDashboard,
  ShieldAlert,
  Trash2,
  MessageSquare,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Your account',
  description: 'Your PALMA sign-in, address and sessions.',
  path: '/account',
  noIndex: true,
});

/**
 * The account, not the record.
 *
 * Like the Dossier, this is role-neutral — a judge's password works the same
 * way a creator's does — so it asks only whether there is a session.
 */
export default async function AccountPage() {
  const session = await requireSession('/account');

  const [userRows, sessions] = await Promise.all([
    sql<
      {
        email: string;
        name: string;
        role: string;
        createdAt: string;
        lastLoginAt: string | null;
        creatorDisplayName: string | null;
        creatorSlug: string | null;
      }[]
    >`
      SELECT
        u."email",
        u."name",
        u."role",
        to_char(u."createdAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "createdAt",
        to_char(u."lastLoginAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "lastLoginAt",
        c."displayName" AS "creatorDisplayName",
        c."slug" AS "creatorSlug"
      FROM "User" u
      LEFT JOIN "Creator" c ON c."userId" = u."id"
      WHERE u."id" = ${session.user.id}
      LIMIT 1
    `,
    sql<{ id: string; createdAt: string; userAgent: string | null }[]>`
      SELECT
        "id",
        to_char("createdAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "createdAt",
        "userAgent"
      FROM "AuthSession"
      WHERE "userId" = ${session.user.id}
        AND "revokedAt" IS NULL
        AND "expiresAt" > now()
      ORDER BY "createdAt" DESC
    `,
  ]);

  const row = userRows[0];
  const user = row
    ? {
        ...row,
        creator: row.creatorSlug
          ? { displayName: row.creatorDisplayName ?? '', slug: row.creatorSlug }
          : null,
      }
    : null;

  if (!user) {
    return (
      <PortalShell title="PALMA Account" session={session} desk="creator">
        <Empty
          icon={UserX}
          title="Account not found"
          description="This account could not be loaded. Sign out and in again, or contact PALMA."
        />
      </PortalShell>
    );
  }

  const others = sessions.filter((row) => row.id !== session.sessionId).length;

  return (
    <PortalShell title="PALMA Account" subtitle="Your account" session={session} desk="creator">
      <div className="flex flex-col gap-6">
        <PageHead
          eyebrow="Account"
          eyebrowIcon={Settings}
          title="Your sign-in and your sessions"
          statement={
            <>
              Your sign-in, your address and your sessions. Your <em>record</em>, how you are
              described and what PALMA says happened, lives in your portal.
            </>
          }
          aside={<Tag>{titleCase(user.role.replace('_', ' '))}</Tag>}
        >
          <Action href="/dossier" icon={Inbox}>
            Your Dossier
          </Action>
          <Action href={homeForRole(session.user.role)} icon={LayoutDashboard}>
            Your portal
          </Action>
        </PageHead>

        <Card className="glow overflow-hidden" data-lift="list">
          <Facts
            items={[
              { term: 'Name', value: user.name },
              { term: 'Address', value: user.email },
              { term: 'Role', value: titleCase(user.role.replace('_', ' ')) },
              { term: 'Member since', value: formatShortDate(user.createdAt) },
            ]}
          />
        </Card>

        <div className="grid gap-5 xl:grid-cols-12">
          <div className="flex min-w-0 flex-col gap-5 xl:col-span-7">
            <Section
              icon={KeyRound}
              title="Password"
              note="Changing it signs out every other session but this one. Your current password is required even though you are signed in: a borrowed unlocked laptop proves possession too, and this is the control that stops it becoming a stolen account."
            >
              <ChangePasswordForm />
            </Section>

            <Section
              icon={Mail}
              title="Email address"
              note="The new address confirms before anything moves, and the old one is told it was asked for. Losing an inbox should not silently lose you the account."
            >
              <ChangeEmailForm current={user.email} />
            </Section>

            <Section icon={Trash2} title="Closing your account">
              <CloseAccountForm heldRecord={user.creator?.displayName ?? null} />
            </Section>
          </div>

          <aside className="flex min-w-0 flex-col gap-5 xl:col-span-5">
            <section data-lift="section">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <Glyph icon={Monitor} size="sm" />
                <h2 className="font-display text-[1.0625rem] tracking-tight text-[color:var(--text)]">
                  Sessions
                </h2>
                <span
                  className="hidden h-px min-w-6 flex-1 bg-[color:var(--line)] sm:block"
                  aria-hidden
                />
                <Tag>{sessions.length}</Tag>
              </div>
              <p className="mb-3 text-[0.8125rem] leading-relaxed text-[color:var(--text-quiet)]">
                {sessions.length === 1
                  ? 'This is your only signed-in session.'
                  : `${sessions.length} sessions are signed in, including this one.`}
              </p>
              <List className="glow" data-lift="list">
                {sessions.slice(0, 6).map((row) => (
                  <Row key={row.id}>
                    <Glyph
                      icon={Monitor}
                      size="sm"
                      tone={row.id === session.sessionId ? 'positive' : 'neutral'}
                    />
                    <RowText
                      title={row.userAgent ? row.userAgent.slice(0, 48) : 'Unknown device'}
                      note={`Since ${formatShortDate(row.createdAt)}`}
                      noteFromSm
                    />
                    {row.id === session.sessionId ? (
                      <Tag tone="positive" className="ml-auto">
                        This one
                      </Tag>
                    ) : null}
                  </Row>
                ))}
              </List>
              <div className="mt-3">
                <RevokeSessionsForm others={others} />
              </div>
            </section>

            <Panel icon={ShieldAlert} title="Two-factor authentication">
              Not offered yet. When it is, it will be required for accounts that can confer or
              revoke an honour rather than merely suggested, and PALMA would rather say that plainly
              than show a switch that does nothing.
            </Panel>

            <Panel icon={MessageSquare} title="Something else">
              A correction to the record, an appeal, or anything a form cannot settle:{' '}
              <a
                href={`mailto:${CONTACTS.general}`}
                className="tap font-medium text-[color:var(--accent)] underline-offset-4 hover:underline"
              >
                {CONTACTS.general}
              </a>
              . A person reads it.
            </Panel>
          </aside>
        </div>
      </div>
    </PortalShell>
  );
}
