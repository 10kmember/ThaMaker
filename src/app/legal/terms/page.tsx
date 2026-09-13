import Link from 'next/link';
import { Clauses, LegalDocumentPage, type LegalSection } from '@/components/palma/LegalDocument';
import { buildMetadata } from '@/lib/seo';
import { CONTACTS, ENTITY, legalDocument } from '@/lib/legal';
import { notFound } from 'next/navigation';

export const metadata = buildMetadata({
  title: 'Terms of Service',
  description:
    'The terms on which PALMA accepts nominations, confers honours and maintains the permanent record.',
  path: '/legal/terms',
});

export default function TermsPage() {
  const doc = legalDocument('terms');
  if (!doc) notFound();

  const sections: LegalSection[] = [
    {
      heading: 'Who you are agreeing with',
      plainly:
        'PALMA is run by a company in England. These terms are between you and that company.',
      body: (
        <>
          <p>
            PALMA — The Creator Honours is operated by {ENTITY.name}, a company incorporated in{' '}
            {ENTITY.jurisdiction}
            {ENTITY.companyNumber ? ` under number ${ENTITY.companyNumber}` : ''}. In these terms,
            &ldquo;PALMA&rdquo;, &ldquo;we&rdquo; and &ldquo;us&rdquo; mean that company, and
            &ldquo;you&rdquo; means anyone using palmaawards.com or taking part in a PALMA season.
          </p>
          <p>
            By nominating a creator, claiming a creator record, sitting on a panel, or otherwise
            using the site, you accept these terms. If you do not accept them, do not use the site.
            Nothing here removes rights you have as a consumer under the laws of{' '}
            {ENTITY.jurisdiction}.
          </p>
        </>
      ),
    },
    {
      heading: 'What PALMA is, and is not',
      plainly: 'PALMA is an awards body and an archive. It is not a platform, a shop or a network.',
      body: (
        <>
          <p>
            PALMA is an awards institution and a permanent public record of the honours it confers.
            It is deliberately narrow, and the following are not services PALMA offers — under any
            plan, tier or arrangement:
          </p>
          <Clauses
            items={[
              'PALMA is not a content platform. It hosts no creator work, and provides no means of uploading media for publication.',
              'PALMA is not a social network. There are no feeds, followers, direct messages or reactions.',
              'PALMA is not a marketplace or an agency. It brokers no services, bookings, sponsorships between third parties, or transactions of any kind between creators and audiences.',
              'PALMA is not an adult content service. It does not host, index, link out to, or accept as evidence any pornographic or sexually explicit material, and it never will.',
            ]}
          />
          <p>
            The operating principle is short: <strong>you point, we don&rsquo;t publish</strong>. A
            nomination cites work that already exists somewhere else. PALMA records the citation and
            the judgement, not the work.
          </p>
        </>
      ),
    },
    {
      heading: 'Eligibility and age',
      plainly: 'Everyone honoured by PALMA must be 18 or over, and we check before conferring.',
      body: (
        <>
          <Clauses
            items={[
              'Creators recognised by PALMA must be 18 years of age or older. There is no junior category and there will not be one.',
              'Age and identity assurance is carried out by a specialist third-party provider before an honour is conferred. PALMA never receives, requests or stores identity documents; it records only a status, the provider’s reference and a date.',
              'PALMA may decline to confer, or may withhold, an honour where verification is incomplete, has failed, or has been revoked.',
              'Nominators must be 16 or over to submit a nomination, because submitting one requires giving us an email address.',
            ]}
          />
          <p>
            Verification data is never shown publicly. What is shown publicly is whether a creator
            record is verified — nothing about how, by whom, or on the strength of what.
          </p>
        </>
      ),
    },
    {
      heading: 'Nominations',
      plainly:
        'Nominating is free, takes a minute, and cannot be bought. Volume does not win anything.',
      body: (
        <>
          <Clauses
            items={[
              'Anyone may nominate, including a creator nominating themselves. Nominating is free and always will be.',
              'One valid nomination per person, per creator, per category, per season. This is enforced in the database, not merely discouraged.',
              'A nomination is a signal, not a vote. PALMA does not publish nomination counts as a leaderboard, and a higher count confers no advantage at judging.',
              'Nominations must be about work that has actually been published. A nomination containing fabricated claims, another person’s work, or material that breaches the content policy will be rejected.',
              'PALMA may refuse, withdraw or reject any nomination, and may decline to say why where saying why would help someone game the process.',
            ]}
          />
          <p>
            Encouraging your audience to nominate you is legitimate and expected. Manufacturing
            nominations — through purchased submissions, automation, or addresses that do not belong
            to real people — is not, and is handled under the{' '}
            <Link href="/legal/rules" className="palma-link text-ink">
              competition rules
            </Link>
            .
          </p>
        </>
      ),
    },
    {
      heading: 'Judging and honours',
      plainly: 'A panel decides, against published criteria. Sponsors have nothing to do with it.',
      body: (
        <>
          <Clauses
            items={[
              'Honours are conferred by PALMA on the recommendation of an independent panel, judged against criteria published in advance at /about/judging.',
              'An honour recognises specific work, in a stated category, in a stated season. It says nothing beyond that, and implies no endorsement of a recipient’s other activities, opinions or commercial arrangements.',
              'Judging scores, panel deliberations and nomination evidence are confidential and are not published, disclosed to recipients, or made available to sponsors.',
              'Sponsorship is a commercial relationship with PALMA alone. A sponsor cannot see a score, contact a judge through PALMA, alter a shortlist, or influence an outcome. A sponsorship that attempts to purchase any of those is refused.',
              'PALMA’s decisions are final, subject only to the appeal route in Complaints and Appeals.',
            ]}
          />
        </>
      ),
    },
    {
      heading: 'The permanent record',
      plainly:
        'An honour, once conferred, is meant to stay checkable forever. That permanence is the point.',
      body: (
        <>
          <p>
            The PALMA Roll of Honour (PaROH) is intended to remain publicly verifiable indefinitely.
            Each honour carries a signed verification record that can be checked at{' '}
            <Link href="/verify" className="palma-link text-ink">
              /verify
            </Link>{' '}
            without an account.
          </p>
          <Clauses
            items={[
              'Entries are corrected, not deleted. A correction is written to the audit log with the state before and after it.',
              'A revoked honour remains on the record, marked revoked, with the date. Removing it entirely would make the archive a worse record of what happened.',
              'A creator may ask for their record to be reduced to the minimum an honour requires — a name and the honour itself. PALMA will consider that against its legitimate interest in an accurate archive, and will say what it decided and why.',
            ]}
          />
        </>
      ),
    },
    {
      heading: 'Revocation',
      plainly: 'We can take an honour back, and the record will show that we did.',
      body: (
        <>
          <p>PALMA may revoke an honour where:</p>
          <Clauses
            items={[
              'it was obtained through fabricated evidence, impersonation, or manipulation of the nomination or judging process;',
              'the work honoured was not the recipient’s own;',
              'verification is subsequently found to have been false, or the recipient is found to have been under 18 at the time; or',
              'the recipient’s conduct is such that PALMA’s continued association with it is untenable.',
            ]}
          />
          <p>
            Except where the law or a safeguarding concern requires otherwise, PALMA will put the
            case to the recipient and give them ten working days to respond before a revocation
            takes effect. A revocation may be appealed once.
          </p>
        </>
      ),
    },
    {
      heading: 'Conduct',
      plainly: 'Do not use PALMA to attack people, fake things, or break the law.',
      body: (
        <>
          <p>You must not use PALMA, or anything submitted through it, to:</p>
          <Clauses
            items={[
              'submit sexual content, sexual services advertising, escort or brokerage material, or any link to such material;',
              'submit child sexual abuse material or non-consensual intimate imagery — both of which are reported to the relevant authorities, immediately and without notice to the submitter;',
              'threaten, harass, stalk, blackmail, extort or dox any person;',
              'impersonate a person or organisation, or nominate using an identity that is not yours;',
              'conduct fraud, or attempt to buy, sell or trade a nomination, a shortlist place or an honour;',
              'abuse a person or group on the basis of a protected characteristic; or',
              'attempt to access judging material, another person’s account, or any part of the system you have not been granted.',
            ]}
          />
          <p>
            The full standard is set out in the{' '}
            <Link href="/about/policy" className="palma-link text-ink">
              content policy
            </Link>
            , which forms part of these terms.
          </p>
        </>
      ),
    },
    {
      heading: 'Intellectual property',
      plainly: 'We own PALMA’s name and mark. You keep everything you make.',
      body: (
        <>
          <Clauses
            items={[
              'The PALMA name, wordmark, palm mark and seal are owned by ' +
                ENTITY.name +
                '. Use of them is governed by Use of the PALMA Mark.',
              'Creators retain every right in their own work. PALMA claims no licence over it, because PALMA does not host it.',
              'By submitting a nomination you grant PALMA permission to use its contents internally for screening and judging, and to quote a short citation publicly if the creator is honoured. Your name is not published alongside a nomination.',
              'Editorial content in the PALMA Journal is PALMA’s, and may be quoted with attribution and a link.',
            ]}
          />
        </>
      ),
    },
    {
      heading: 'Availability and liability',
      plainly: 'The site may go down. We are liable for what the law says we are liable for.',
      body: (
        <>
          <p>
            PALMA is provided as-is. We aim to keep the archive available continuously, and treat
            loss of the record as the most serious failure possible, but we do not guarantee
            uninterrupted access.
          </p>
          <p>
            Nothing in these terms limits our liability for death or personal injury caused by
            negligence, for fraud, or for anything else that cannot lawfully be limited. Subject to
            that, PALMA is not liable for indirect or consequential loss, loss of profit, or loss of
            opportunity arising from a nomination not being accepted, an honour not being conferred,
            or the site being unavailable.
          </p>
          <p>
            Taking part in a PALMA season is free. Where PALMA has a paid relationship with you — a
            sponsorship, for example — liability is governed by that agreement, and its terms
            prevail over this section.
          </p>
        </>
      ),
    },
    {
      heading: 'Changes to these terms',
      plainly: 'When we change this, the version number changes and you can see the diff.',
      body: (
        <>
          <p>
            These terms carry a version number and an effective date, both shown at the top of this
            page. Material changes are announced in the Journal before they take effect, and a
            change never applies retrospectively to a season already judged.
          </p>
        </>
      ),
    },
    {
      heading: 'Law and contact',
      plainly: 'English law. Write to us here.',
      body: (
        <>
          <p>
            These terms are governed by the law of {ENTITY.jurisdiction}, and the courts of{' '}
            {ENTITY.jurisdiction} have exclusive jurisdiction.
          </p>
          <p>
            Write to{' '}
            <a href={`mailto:${CONTACTS.general}`} className="palma-link text-ink">
              {CONTACTS.general}
            </a>{' '}
            for anything about these terms, or to{' '}
            <a href={`mailto:${CONTACTS.integrity}`} className="palma-link text-ink">
              {CONTACTS.integrity}
            </a>{' '}
            about the integrity of a season.
          </p>
        </>
      ),
    },
  ];

  return (
    <LegalDocumentPage
      document={doc}
      sections={sections}
      intro={
        <p>
          PALMA runs an awards season and keeps a permanent record of its outcomes. These terms
          describe what that means for the people who take part in it: nominators, creators, judges
          and sponsors. They are written to be read, and each clause below opens with a sentence
          saying what it does.
        </p>
      }
    />
  );
}
