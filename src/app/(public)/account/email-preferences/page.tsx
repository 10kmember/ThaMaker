import Link from 'next/link';
import { PortalShell } from '@/components/palma/PortalShell';
import { Card, List, Row, RowText, Tag, Action, Glyph } from '@/components/desk/surface';
import { PageHead, Section, Panel } from '@/components/desk/blocks';
import { EmailPreferencesForm } from '@/components/account/EmailPreferencesForm';
import { PreferencesForm } from '@/components/account/PortalForms';
import { buildMetadata } from '@/lib/seo';
import { requireSession } from '@/lib/auth/guards';
import { homeForRole } from '@/lib/auth/entrances';
import { EMAIL_LIST_ORDER, emailList } from '@/domain/email-lists';
import { TEMPLATE_LIST } from '@/server/email/register';
import { sql } from '@/server/db/sql';
import { featureLive } from '@/server/features';
import { CONTACTS } from '@/lib/legal';
import {
  Mail,
  Lock,
  Megaphone,
  ListChecks,
  FileClock,
  Handshake,
  LifeBuoy,
  Settings,
  LayoutDashboard,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Email preferences',
  description: 'Choose which PALMA emails reach you.',
  path: '/account/email-preferences',
  noIndex: true,
});

/**
 * The preference centre.
 *
 * Two halves, and the distinction between them is the whole point.
 *
 * Above the rule: mail PALMA owes you. A decision on your own record, a
 * security notice, something you asked for thirty seconds ago. There is no
 * switch beside these because an account that could mute the news that its
 * honour was revoked is not being kept informed, it is being managed.
 *
 * Between them: the announcements. Mail PALMA would send you about your own
 * record and the season around it, which you can switch off one at a time.
 * These used to be a panel on the creator portal, two pages away from the
 * subscriptions they are constantly confused with, which meant nobody could
 * answer "what does PALMA send me" without visiting both.
 *
 * Below: five subscriptions, each opt-in on its own, none pre-ticked, and
 * leaving one leaving exactly one.
 */
export default async function EmailPreferencesPage() {
  const session = await requireSession('/account/email-preferences');

  const [subscriptions, prefRows] = await Promise.all([
    sql<
      {
        type: string;
        status: string;
        confirmedAt: string | null;
        consentAt: string | null;
        source: string;
      }[]
    >`
      SELECT
        "type",
        "status",
        to_char("confirmedAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "confirmedAt",
        to_char("consentAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "consentAt",
        "source"
      FROM "EmailSubscription"
      WHERE "email" = ${session.user.email}
    `,
    sql<
      {
        seasonAnnouncements: boolean;
        nominationUpdates: boolean;
        honourAnnouncements: boolean;
        journalDigest: boolean;
      }[]
    >`
      SELECT
        "seasonAnnouncements",
        "nominationUpdates",
        "honourAnnouncements",
        "journalDigest"
      FROM "NotificationPreference"
      WHERE "userId" = ${session.user.id}
      LIMIT 1
    `,
  ]);
  const prefs = prefRows[0] ?? null;

  // An account that has never touched these has no row, and the defaults are
  // the ones the portal used: on, except the digest, which is a publication
  // rather than news about you.
  const announcements = {
    seasonAnnouncements: prefs?.seasonAnnouncements ?? true,
    nominationUpdates: prefs?.nominationUpdates ?? true,
    honourAnnouncements: prefs?.honourAnnouncements ?? true,
    journalDigest: prefs?.journalDigest ?? false,
  };

  const availability = await Promise.all(
    EMAIL_LIST_ORDER.map(async (key) => {
      const required = emailList(key).requiresFeature;
      return [key, required ? await featureLive(required) : true] as const;
    }),
  );

  const lists = EMAIL_LIST_ORDER.map((key) => {
    const row = subscriptions.find((entry) => entry.type === key);
    return {
      ...emailList(key),
      subscribed: row?.status === 'confirmed',
      available: availability.find(([listKey]) => listKey === key)?.[1] ?? true,
      since: row?.confirmedAt ?? null,
      source: row?.source ?? null,
    };
  });

  const essential = TEMPLATE_LIST.filter((template) => template.gate === 'always');

  return (
    <PortalShell
      title="PALMA Account"
      subtitle="Email preferences"
      session={session}
      desk="creator"
    >
      <div className="flex flex-col gap-6">
        <PageHead
          eyebrow="Email preferences"
          eyebrowIcon={Mail}
          title="What reaches your inbox"
          statement={
            <>
              What PALMA sends to{' '}
              <strong className="text-[color:var(--text)]">{session.user.email}</strong>, and what
              it does not.
            </>
          }
        >
          <Action href="/account" icon={Settings}>
            Your account
          </Action>
          <Action href={homeForRole(session.user.role)} icon={LayoutDashboard}>
            Your portal
          </Action>
        </PageHead>

        <div className="grid gap-5 xl:grid-cols-12">
          <div className="flex min-w-0 flex-col gap-5 xl:col-span-7">
            {/* ── Essential ───────────────────────────────────────────── */}
            <section data-lift="section">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <Glyph icon={Lock} size="sm" />
                <h2 className="font-display text-[1.0625rem] tracking-tight text-[color:var(--text)]">
                  Essential communications
                </h2>
                <span
                  className="hidden h-px min-w-6 flex-1 bg-[color:var(--line)] sm:block"
                  aria-hidden
                />
                <Tag>Always on</Tag>
              </div>
              <p className="mb-3 max-w-[68ch] text-[0.8125rem] leading-relaxed text-[color:var(--text-quiet)]">
                These are not a subscription and there is nothing here to switch off. PALMA sends
                them because it owes them to you: a decision about your own record, or something
                concerning the safety of your account. An institution you can mute is not keeping
                you informed.
              </p>
              <List className="glow" data-lift="list">
                {essential.map((template) => (
                  <Row key={template.key}>
                    <RowText title={template.name} />
                    <Tag className="ml-auto">Always</Tag>
                  </Row>
                ))}
              </List>
              <p className="mt-3 text-[0.75rem] leading-relaxed text-[color:var(--text-quiet)]">
                Closing your account stops all of them.{' '}
                <Link
                  href="/account"
                  className="tap font-medium text-[color:var(--accent)] underline-offset-4 hover:underline"
                >
                  You can do that here
                </Link>
                .
              </p>
            </section>

            <Section
              icon={Megaphone}
              title="Announcements about you"
              note="News, rather than decisions. Switching one off is only ever a choice not to hear about it early: anything PALMA actually decides about your record still reaches you through the list above and is written into your Dossier either way."
            >
              <PreferencesForm defaults={announcements} />
            </Section>

            <Section
              icon={ListChecks}
              title="Your subscriptions"
              note="Five lists, each separately chosen. Nothing here was switched on by registering, nominating, claiming a record or accepting the Terms, and leaving one leaves exactly one."
            >
              <EmailPreferencesForm lists={lists} />
            </Section>
          </div>

          <aside className="flex min-w-0 flex-col gap-5 xl:col-span-5">
            {/* ── The consent record ──────────────────────────────────── */}
            <Card className="glow overflow-hidden" data-lift="section">
              <div className="flex items-center gap-2.5 p-4">
                <Glyph icon={FileClock} size="sm" tone="accent" />
                <h2 className="font-display text-[0.9375rem] text-[color:var(--text)]">
                  What PALMA records
                </h2>
              </div>
              <p className="border-t border-[color:var(--line)] p-4 text-[0.8125rem] leading-relaxed text-[color:var(--text-soft)]">
                For each subscription: what you agreed to, when, and where from. PALMA has to be
                able to demonstrate that rather than simply assert it, and you are entitled to see
                the same record.
              </p>
              {lists.some((list) => list.subscribed) ? (
                <div className="list border-t border-[color:var(--line)]" data-lift="list">
                  {lists
                    .filter((list) => list.subscribed)
                    .map((list) => (
                      <Row key={list.key}>
                        <RowText
                          title={list.name}
                          note={`Since ${
                            list.since ? new Date(list.since).toISOString().slice(0, 10) : 'unknown'
                          }${list.source ? `, from the ${list.source.replace(/-/g, ' ')}` : ''}`}
                        />
                      </Row>
                    ))}
                </div>
              ) : (
                <p className="border-t border-[color:var(--line)] p-4 text-[0.8125rem] text-[color:var(--text-quiet)]">
                  You are on none of them.
                </p>
              )}
            </Card>

            <Panel icon={Handshake} title="Partner offers are separate on purpose">
              Subscribing to anything else never puts you on the partner list, and a partner message
              is never folded into an awards announcement. When one does arrive it says so in the
              subject line.
            </Panel>

            <Panel icon={LifeBuoy} title="Anything else">
              If PALMA is writing to you and you cannot work out how to stop it, write to{' '}
              <a
                href={`mailto:${CONTACTS.privacy}`}
                className="tap font-medium text-[color:var(--accent)] underline-offset-4 hover:underline"
              >
                {CONTACTS.privacy}
              </a>{' '}
              and a person will sort it out. That is a failure on our side, not yours.
            </Panel>
          </aside>
        </div>
      </div>
    </PortalShell>
  );
}
