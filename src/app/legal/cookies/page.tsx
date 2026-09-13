import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Clauses,
  LegalDocumentPage,
  LegalTable,
  type LegalSection,
} from '@/components/palma/LegalDocument';
import { buildMetadata } from '@/lib/seo';
import { CONTACTS, legalDocument } from '@/lib/legal';

export const metadata = buildMetadata({
  title: 'Cookie Notice',
  description:
    'PALMA sets two cookies, both strictly necessary, and stores one display preference. There is no analytics, no advertising and no consent banner.',
  path: '/legal/cookies',
});

export default function CookiesPage() {
  const doc = legalDocument('cookies');
  if (!doc) notFound();

  const sections: LegalSection[] = [
    {
      heading: 'Why there is no banner',
      plainly:
        'Consent banners exist for tracking. PALMA does no tracking, so there is nothing to consent to.',
      body: (
        <>
          <p>
            Under the Privacy and Electronic Communications Regulations, consent is required for
            cookies that are not strictly necessary — analytics, advertising, personalisation,
            measurement. PALMA sets none of those, so it asks for no consent and shows no banner.
          </p>
          <p>
            This is not a loophole. It is a consequence of a decision made much earlier: PALMA has
            no advertising business, no growth-analytics practice and no third-party scripts. There
            is nothing following you around this site because nothing here was built to.
          </p>
        </>
      ),
    },
    {
      heading: 'Everything PALMA stores in your browser',
      plainly: 'Two cookies and one saved preference. That is the complete list.',
      body: (
        <>
          <LegalTable
            caption="Complete inventory"
            head={['Name', 'Kind', 'What it does', 'Lifetime']}
            rows={[
              [
                <code key="s">palma_session</code>,
                'Cookie — strictly necessary',
                'Identifies a signed-in creator, judge or administrator. HttpOnly, so scripts cannot read it; SameSite=Lax; Secure in production. Set only after you sign in.',
                '14 days, or until you sign out',
              ],
              [
                <code key="c">palma_csrf</code>,
                'Cookie — strictly necessary',
                'Carries a cross-site request forgery token, so a form submitted from another site cannot act as you. Readable by the page, because the page has to send it back.',
                '14 days, or until you sign out',
              ],
              [
                <code key="t">palma-theme</code>,
                'Local storage — preference',
                'Remembers whether you chose Paper, Ink or Archive, so the site does not flash the wrong theme on the next visit. Never sent to the server.',
                'Until you clear it',
              ],
            ]}
          />
          <p>
            A visitor who never signs in is served no cookies at all. Reading the entire public
            archive — every honour, every creator, every season — requires nothing to be stored in
            your browser.
          </p>
        </>
      ),
    },
    {
      heading: 'What PALMA does not set',
      plainly: 'No analytics, no pixels, no third-party anything.',
      body: (
        <Clauses
          items={[
            'No analytics of any kind — no Google Analytics, no privacy-preserving alternative, no self-hosted tracker.',
            'No advertising or conversion pixels. PALMA runs no advertising.',
            'No session recording, heatmaps or scroll tracking.',
            'No social embeds that set cookies. Links to a creator’s channels are ordinary links, and load nothing until you click them.',
            'No fingerprinting, and no attempt to identify a device across sessions.',
            'No third-party fonts, scripts or tag managers. Everything the page loads is served from palmaawards.com.',
          ]}
        />
      ),
    },
    {
      heading: 'Turning them off',
      plainly: 'You can block all of it. Signing in stops working; reading does not.',
      body: (
        <>
          <p>
            Every browser lets you block or clear cookies and site data. Blocking PALMA&rsquo;s will
            not degrade the public site in any way — the archive, the seasons, the categories and
            the nomination form all work without them.
          </p>
          <p>
            Two things do break: you will not be able to stay signed in to a portal, and the site
            will forget your theme between visits. There is no way to sign in without a session
            cookie, because the session cookie is what being signed in means.
          </p>
        </>
      ),
    },
    {
      heading: 'Questions',
      plainly: 'Ask us.',
      body: (
        <p>
          Write to{' '}
          <a href={`mailto:${CONTACTS.privacy}`} className="palma-link text-ink">
            {CONTACTS.privacy}
          </a>
          . The wider picture — what PALMA holds on a server rather than in your browser, and for
          how long — is in the{' '}
          <Link href="/legal/privacy" className="palma-link text-ink">
            privacy notice
          </Link>
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
          This is the complete inventory of what PALMA stores in your browser. It is short enough to
          read in full, which is the point: a cookie notice that needs a summary has already failed.
        </p>
      }
    />
  );
}
