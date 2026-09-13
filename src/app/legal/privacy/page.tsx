import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Clauses,
  LegalDocumentPage,
  LegalTable,
  type LegalSection,
} from '@/components/palma/LegalDocument';
import { buildMetadata } from '@/lib/seo';
import { CONTACTS, ENTITY, legalDocument } from '@/lib/legal';

export const metadata = buildMetadata({
  title: 'Privacy Notice',
  description:
    'What personal data PALMA holds, why, for how long, and the things it has deliberately chosen never to hold.',
  path: '/legal/privacy',
});

export default function PrivacyPage() {
  const doc = legalDocument('privacy');
  if (!doc) notFound();

  const sections: LegalSection[] = [
    {
      heading: 'Who is responsible',
      plainly: 'The company that runs PALMA is the data controller. Here is how to reach it.',
      body: (
        <>
          <p>
            {ENTITY.name}, trading as {ENTITY.tradingAs}, is the data controller for personal data
            processed through palmaawards.com. It is established in {ENTITY.jurisdiction} and
            processes personal data under UK GDPR and the Data Protection Act 2018.
          </p>
          <p>
            Data protection enquiries go to{' '}
            <a href={`mailto:${CONTACTS.privacy}`} className="palma-link text-ink">
              {CONTACTS.privacy}
            </a>
            . PALMA&rsquo;s ICO registration number is{' '}
            {ENTITY.icoRegistration ?? 'pending and will be published here once issued'}.
          </p>
        </>
      ),
    },
    {
      heading: 'What PALMA deliberately does not hold',
      plainly: 'Start here. The things we refuse to collect are the important part.',
      body: (
        <>
          <p>
            Most privacy notices begin with what is collected. PALMA&rsquo;s begins with what is
            not, because those decisions are structural: the data is not held anywhere, so it cannot
            be leaked, subpoenaed, sold or lost.
          </p>
          <Clauses
            items={[
              'Identity documents. PALMA never receives a passport, a driving licence or a selfie. Age assurance is performed by a third-party provider, and PALMA stores only a status, the provider’s opaque reference, and a date.',
              'IP addresses. Where an address is needed for abuse detection or audit, a salted one-way digest is stored and the address itself is discarded. The digest cannot be reversed into an address.',
              'Behavioural analytics. There is no advertising pixel, no cross-site tracker, no session recorder, no heatmap, and no third-party analytics script of any kind.',
              'Payment data. Nominating is free, and PALMA takes no consumer payments. Sponsorship is invoiced offline.',
              'Creator media. PALMA hosts no uploaded work. A nomination cites a public URL; PALMA stores the citation.',
              'Special category data. PALMA does not ask for, and does not want, data about health, beliefs, sexuality, ethnicity or politics.',
            ]}
          />
        </>
      ),
    },
    {
      heading: 'What PALMA holds, and why',
      plainly: 'Four groups of data, each with a lawful basis we can name.',
      body: (
        <>
          <LegalTable
            caption="Processing register"
            head={['Data', 'Why', 'Lawful basis']}
            rows={[
              [
                'Nominator email address (and a normalised form of it)',
                'To verify a nomination is from a real person and to enforce one nomination per person per creator per category',
                'Legitimate interests — running a credible award',
              ],
              [
                'Nomination content: category, creator, and the reason given',
                'Screening and judging',
                'Legitimate interests',
              ],
              [
                'Creator record: name, country, headline, biography, links, honours',
                'The public record of the award',
                'Legitimate interests; consent where a creator supplies it themselves',
              ],
              [
                'Verification status, provider reference, verified date',
                'To be able to show that an honoured creator was verified as an adult',
                'Legal obligation and legitimate interests',
              ],
              [
                'Account data for creators, judges and staff: email, hashed password, role',
                'Access control',
                'Contract and legitimate interests',
              ],
              [
                'Audit log entries: who did what, when, and the state before and after',
                'Integrity of the record',
                'Legitimate interests — an archive nobody can quietly edit',
              ],
              [
                'Reports and complaints, including anything you choose to write in one',
                'Investigating concerns',
                'Legitimate interests; legal obligation where a report concerns illegal content',
              ],
            ]}
          />
          <p>
            Where PALMA relies on legitimate interests, it has weighed those interests against your
            rights and concluded that a permanent, checkable record of a public honour, and a
            nomination process that cannot be faked, cannot be achieved with less data than this.
            You can object to any of it — see below.
          </p>
        </>
      ),
    },
    {
      heading: 'What is public and what is not',
      plainly: 'The honour is public forever. Everything behind it never is.',
      body: (
        <>
          <p>
            <strong>Public, and intended to be permanent:</strong> a creator&rsquo;s name, country,
            headline, biography, links, and the honours they hold, together with the season,
            category and verification code for each.
          </p>
          <p>
            <strong>Never public:</strong> judging scores, panel remarks, conflict declarations,
            nomination reasons, nominator identities and contact details, verification data,
            reports, and the audit log. Nominators are never named to the creator they nominated, to
            the public, or to sponsors.
          </p>
        </>
      ),
    },
    {
      heading: 'How long PALMA keeps things',
      plainly: 'Honours are kept forever. Almost everything else is deleted on a clock.',
      body: (
        <LegalTable
          caption="Retention schedule"
          head={['Data', 'Kept for']}
          rows={[
            [
              'Conferred honours and their verification records',
              'Indefinitely — this is the archive',
            ],
            [
              'Creator records attached to an honour',
              'Indefinitely, subject to a minimisation request',
            ],
            ['Nominator email addresses', '24 months after the season closes, then deleted'],
            ['Nomination reasons and screening notes', '24 months after the season closes'],
            ['Unverified nominations and expired verification codes', '30 days'],
            ['Judging scores and panel remarks', '7 years, then reduced to aggregate outcomes'],
            [
              'Verification status and provider reference',
              'For as long as the honour stands, plus 12 months',
            ],
            ['Rate-limit counters and hashed network digests', '30 days'],
            ['Audit log', '7 years'],
            ['Reports concerning illegal content', 'As long as the law requires, and no longer'],
          ]}
        />
      ),
    },
    {
      heading: 'Who PALMA shares data with',
      plainly: 'A short list of suppliers, and nobody else. We never sell anything.',
      body: (
        <>
          <p>PALMA does not sell personal data, and does not share it for advertising. Ever.</p>
          <Clauses
            items={[
              'A transactional email provider (Resend) sends verification codes and season notices. It receives an email address and the message.',
              'A managed PostgreSQL host stores the database. Data is held in the UK or the EEA.',
              'An application host serves the site.',
              'A third-party age and identity assurance provider, which receives what you give it directly and returns only a status and a reference to PALMA.',
              'Law enforcement, where PALMA is legally required to disclose, or where a report concerns child sexual abuse material or a credible threat to life — in which case PALMA reports without notifying the submitter.',
            ]}
          />
          <p>
            Sponsors are not on this list, and never will be. A sponsor receives no personal data
            from PALMA: not nominator addresses, not judging material, not a mailing list.
          </p>
        </>
      ),
    },
    {
      heading: 'Your rights',
      plainly: 'You can see it, correct it, object to it, and complain about us to the regulator.',
      body: (
        <>
          <p>Under UK GDPR you have the right to:</p>
          <Clauses
            items={[
              'ask what personal data PALMA holds about you, and receive a copy;',
              'have inaccurate data corrected;',
              'ask for data to be erased, where PALMA has no overriding reason to keep it;',
              'object to processing carried out on the basis of legitimate interests;',
              'ask for processing to be restricted while a dispute is resolved; and',
              'receive data you supplied in a portable form.',
            ]}
          />
          <p>
            Write to{' '}
            <a href={`mailto:${CONTACTS.privacy}`} className="palma-link text-ink">
              {CONTACTS.privacy}
            </a>
            . PALMA answers within one month and will not charge you for it.
          </p>
          <p>
            Requests to erase a conferred honour are treated seriously and are considered against
            PALMA&rsquo;s legitimate interest in an accurate permanent archive. PALMA will normally
            offer minimisation — reducing the entry to the name and the honour — rather than
            deletion, and will tell you in writing what it decided and why. You can challenge that
            decision under{' '}
            <Link href="/legal/complaints" className="palma-link text-ink">
              Complaints and Appeals
            </Link>
            .
          </p>
          <p>
            You may also complain to the Information Commissioner&rsquo;s Office at ico.org.uk, or
            by calling 0303 123 1113. PALMA would rather you came to it first, but you are not
            required to.
          </p>
        </>
      ),
    },
    {
      heading: 'Security',
      plainly: 'Passwords are hashed, honours are signed, and every privileged action is logged.',
      body: (
        <>
          <Clauses
            items={[
              'Passwords are hashed with scrypt and a per-user salt. PALMA cannot read them.',
              'Every verification record is signed with an HMAC, so a tampered honour fails verification rather than passing quietly.',
              'Every privileged action is authorised on the server. A role held in a browser grants nothing.',
              'Every state change to the record is written to an append-only audit log.',
              'Transport is TLS-only, with strict transport security, a content security policy, and no third-party scripts to weaken either.',
            ]}
          />
          <p>
            If you find a vulnerability, write to{' '}
            <a href={`mailto:${CONTACTS.security}`} className="palma-link text-ink">
              {CONTACTS.security}
            </a>
            . PALMA will acknowledge within two working days and will not pursue anyone who reports
            in good faith and does not exfiltrate data.
          </p>
        </>
      ),
    },
    {
      heading: 'Cookies',
      plainly: 'Three, all necessary, none watching. There is a whole page about it.',
      body: (
        <p>
          PALMA sets three cookies, all strictly necessary, and runs no analytics or advertising
          technology. That is why there is no consent banner. The detail is in the{' '}
          <Link href="/legal/cookies" className="palma-link text-ink">
            cookie notice
          </Link>
          .
        </p>
      ),
    },
    {
      heading: 'Changes to this notice',
      plainly: 'Version number goes up, effective date changes, and we say so.',
      body: (
        <p>
          This notice carries a version and an effective date at the top of the page. Material
          changes are announced in the Journal before they take effect. Previous versions are
          available on request from{' '}
          <a href={`mailto:${CONTACTS.privacy}`} className="palma-link text-ink">
            {CONTACTS.privacy}
          </a>
          .
        </p>
      ),
    },
  ];

  return (
    <LegalDocumentPage
      document={doc}
      sections={sections}
      intro={
        <p>
          PALMA holds the minimum it needs to run an awards season and keep a permanent record of
          its outcomes. Two things sit at opposite ends of that: honours, which are public and
          permanent by design, and everything else, which is operational and kept on a clock. This
          notice sets out both, and starts with the data PALMA has decided never to collect at all.
        </p>
      }
    />
  );
}
