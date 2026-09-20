import Link from 'next/link';
import {
  Award,
  Trophy,
  ShieldCheck,
  Globe,
  User,
  Link as LinkIcon,
  Search,
  PenLine,
  ExternalLink,
  Eye,
  Sparkles,
} from 'lucide-react';
import {
  Card,
  CardLink,
  List,
  Row,
  RowText,
  SectionHead,
  Label,
  Tag,
  Dot,
  Glyph,
  Empty,
  Action,
  Notice,
} from './surface';
import { Masthead, Panel } from './blocks';

/* ───────────────────────────────────────────────────────────────────────────
   The creator portal

   Where a creator stands, in the order they care about it: what they hold,
   what they are in contention for, and then the machinery.

   The account's own details are not on this page. They are in the account
   menu in the chrome, which is where a person looks for them and where they
   stop taking up the page.
   ─────────────────────────────────────────────────────────────────────────── */

export type CreatorAchievement = {
  code: string;
  categoryName: string;
  kind: string;
  year: number;
  revoked: boolean;
  verifyHref: string;
};

export type CreatorCandidacy = {
  id: string;
  reference: string;
  categoryName: string;
  year: number;
  status: string;
  winner: boolean;
};

export function CreatorOverview({
  displayName,
  honours,
  candidacies,
  verificationStatus,
  verified,
  published,
  hasProfile,
  copySlot,
}: {
  displayName: string;
  honours: CreatorAchievement[];
  candidacies: CreatorCandidacy[];
  verificationStatus: string;
  verified: boolean;
  published: boolean;
  hasProfile: boolean;
  /** Renders a copy-link control for an honour code. Owns its own clipboard state. */
  copySlot?: (code: string) => React.ReactNode;
}) {
  const live = honours.filter((honour) => !honour.revoked).length;

  return (
    <div className="flex flex-col gap-6">
      <Masthead
        eyebrow="Creator portal"
        eyebrowIcon={Sparkles}
        title={displayName}
        statement={
          live > 0
            ? `You hold ${live} PALMA honour${live === 1 ? '' : 's'}. Each carries a permanent verification link that proves it, for as long as PALMA keeps the record.`
            : 'Your record, your candidacies and where you stand, kept in one place.'
        }
        figure={
          live > 0
            ? { value: live, caption: live === 1 ? 'honour held' : 'honours held' }
            : undefined
        }
      >
        {verified ? (
          <Tag tone="positive">
            <Dot />
            Verified
          </Tag>
        ) : (
          <Action href="/creator/verification" icon={ShieldCheck} tone="accent">
            Complete verification
          </Action>
        )}
        <Tag tone={published ? 'neutral' : 'accent'}>
          <Globe className="size-3.5" />
          {published ? 'Profile published' : 'Not yet published'}
        </Tag>
        <Tag>{candidacies.length} in contention</Tag>
      </Masthead>

      {/* ── No record yet ───────────────────────────────────────────────── */}
      {!hasProfile ? (
        <Card elevation="raised" className="glow overflow-hidden" data-lift="section">
          <div className="p-5">
            <Label icon={User} className="text-[color:var(--accent)]">
              No record yet
            </Label>
            <h2 className="font-display mt-2.5 text-xl leading-tight text-balance text-[color:var(--text)]">
              PALMA has not written a record for you, or you have not claimed it.
            </h2>
            <p className="mt-2.5 max-w-[62ch] text-[0.875rem] leading-relaxed text-[color:var(--text-soft)]">
              A record is usually written the first time a creator is nominated, so one may already
              exist. If it does not, you can start one: either write it yourself, or give PALMA the
              links and let the editorial desk write it from the work.
            </p>
          </div>
          <div className="h-px bg-[color:var(--line)]" />
          <div className="grid sm:grid-cols-2">
            <div className="flex flex-col gap-2.5 p-4">
              <Label icon={Search} className="text-[color:var(--accent)]">
                If it already exists
              </Label>
              <p className="text-[0.8125rem] leading-relaxed text-[color:var(--text-soft)]">
                Search the archive and claim it. PALMA reviews every claim by hand before the record
                is treated as yours.
              </p>
              <Action href="/creator/claim" icon={Search} className="mt-auto self-start">
                Claim a record
              </Action>
            </div>
            <div className="flex flex-col gap-2.5 border-[color:var(--line)] p-4 sm:border-l">
              <Label icon={PenLine} className="text-[color:var(--accent)]">
                If it does not
              </Label>
              <p className="text-[0.8125rem] leading-relaxed text-[color:var(--text-soft)]">
                Start one. Write it yourself or ask PALMA to write it from your links. Either way a
                moderator checks it before it is published.
              </p>
              <Action
                href="/creator/start"
                icon={PenLine}
                tone="accent"
                className="mt-auto self-start"
              >
                Start a record
              </Action>
            </div>
          </div>
        </Card>
      ) : null}

      {hasProfile && !published ? (
        <div data-lift="section">
          <Notice icon={Globe}>
            <strong className="text-[color:var(--text)]">Your record is with PALMA.</strong> It is
            held by your account and waiting on a moderator. Nothing is public until they publish
            it, and you can keep editing it in the meantime.
          </Notice>
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-12">
        <div className="flex min-w-0 flex-col gap-6 xl:col-span-7">
          {/* ── Honours ─────────────────────────────────────────────────── */}
          <section data-lift="section">
            <SectionHead icon={Award} title="Your PALMA record" />
            {honours.length === 0 ? (
              <Empty
                icon={Award}
                title="No honours yet"
                description="Honours appear here the moment they are conferred, each with its permanent verification link."
              />
            ) : (
              <List className="glow" data-lift="list">
                {honours.map((honour) => (
                  <Row key={honour.code} className={honour.revoked ? 'opacity-60' : undefined}>
                    <Glyph icon={Trophy} size="sm" tone={honour.revoked ? 'neutral' : 'accent'} />
                    <RowText
                      title={honour.categoryName}
                      note={`${honour.kind} · ${honour.year}`}
                      noteFromSm
                    />
                    <span className="ml-auto flex shrink-0 items-center gap-2">
                      {honour.revoked ? <Tag>Revoked</Tag> : copySlot?.(honour.code)}
                      <Link
                        href={honour.verifyHref}
                        className="tap inline-flex items-center gap-1 text-[0.6875rem] font-medium text-[color:var(--accent)] underline-offset-4 hover:underline"
                      >
                        <Eye className="size-3.5" />
                        View
                      </Link>
                    </span>
                  </Row>
                ))}
              </List>
            )}
          </section>

          {/* ── Candidacies ─────────────────────────────────────────────── */}
          <section data-lift="section">
            <SectionHead icon={Trophy} title="Where you are in contention" />
            {candidacies.length === 0 ? (
              <Empty
                icon={Trophy}
                title="No candidacies yet"
                description="A candidacy is created the first time someone nominates you in a category. Share your nomination link to let your audience put you forward."
              />
            ) : (
              <List className="glow" data-lift="list">
                {candidacies.map((candidacy) => (
                  <Row key={candidacy.id}>
                    <RowText
                      title={candidacy.categoryName}
                      note={
                        <>
                          <span className="font-mono tracking-wider">{candidacy.reference}</span>
                          {' · '}
                          {candidacy.year}
                        </>
                      }
                    />
                    <Tag tone={candidacy.winner ? 'accent' : 'neutral'} className="ml-auto">
                      {candidacy.winner ? <Trophy className="size-3.5" /> : null}
                      {candidacy.status}
                    </Tag>
                  </Row>
                ))}
              </List>
            )}
            <p className="mt-3 max-w-[68ch] text-[0.8125rem] leading-relaxed text-[color:var(--text-quiet)]">
              PALMA does not show you how many nominations you have received. Nomination numbers do
              not decide outcomes, and a running total would only invite you to campaign for one.
            </p>
          </section>
        </div>

        {/* ── The three jobs ──────────────────────────────────────────────
            Everything account-shaped, which is the dossier, email
            preferences, security and the other roles this person holds, has
            moved into the account menu. What is left here is the three
            things a creator comes to this desk to do. */}
        <aside className="flex min-w-0 flex-col gap-3.5 xl:col-span-5">
          <CardLink href="/creator/profile" className="glow sheen" data-lift="section">
            <div className="p-4">
              <div className="mb-2.5 flex items-center gap-2.5">
                <Glyph icon={User} size="sm" />
                <h3 className="font-display text-sm text-[color:var(--text)]">Your profile</h3>
                <PenLine className="ml-auto size-4 text-[color:var(--accent)] opacity-0 transition-opacity duration-400 group-hover:opacity-100" />
              </div>
              <p className="text-[0.8125rem] leading-relaxed text-[color:var(--text-soft)]">
                Your portrait, your details and the links the editorial desk reads your record from.
              </p>
            </div>
          </CardLink>

          <Panel
            icon={ShieldCheck}
            title="Verification"
            tone={verified ? 'positive' : 'accent'}
            badge={<Tag tone={verified ? 'positive' : 'accent'}>{verificationStatus}</Tag>}
          >
            <p className="mb-3.5">PALMA confers nothing on an unverified record.</p>
            <Action href="/creator/verification" icon={ShieldCheck}>
              {verified ? 'View verification' : 'Complete verification'}
            </Action>
          </Panel>

          <Panel icon={LinkIcon} title="Your links">
            <p className="mb-3.5">
              The link you share to be nominated, and the permanent one that proves what you hold.
              They do opposite jobs.
            </p>
            <Action href="/creator/share" icon={ExternalLink}>
              Open your links
            </Action>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
