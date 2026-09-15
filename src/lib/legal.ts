/**
 * The PALMA legal register.
 *
 * These documents live in git rather than in the database, deliberately. The
 * database is the source of truth for the *record* — who was nominated, who
 * judged, who won. A legal document is different: it has to be diffable,
 * reviewable, attributable to a commit, and impossible to change without that
 * change being visible. Version control is the right store for it.
 *
 * Every document carries a version and an effective date, so a clause can be
 * cited in a complaint and the version that governed a past season can be
 * produced. `superseded` exists for when a document is replaced: the old text
 * stays readable at its own version rather than disappearing, because an
 * institution that quietly rewrites its terms has no terms.
 */

export type LegalStatus = 'in-force' | 'superseded';

export type LegalDocument = {
  slug: string;
  title: string;
  /** Used in navigation and breadcrumbs. */
  shortTitle: string;
  /** One sentence, for the register and for search results. */
  summary: string;
  /** What this document is *for*, in the plainest words available. */
  plainly: string;
  version: string;
  effective: string;
  status: LegalStatus;
};

export const LEGAL_DOCUMENTS: LegalDocument[] = [
  {
    slug: 'terms',
    title: 'Terms of Service',
    shortTitle: 'Terms',
    summary:
      'The terms on which PALMA accepts nominations, confers honours and maintains the record.',
    plainly:
      'What you agree to by using PALMA, what PALMA agrees to, and what happens when either of us gets it wrong.',
    version: '1.0',
    effective: '2026-09-01',
    status: 'in-force',
  },
  {
    slug: 'privacy',
    title: 'Privacy Notice',
    shortTitle: 'Privacy',
    summary:
      'What personal data PALMA holds, why, for how long, and the things it has deliberately chosen not to hold.',
    plainly:
      'What we know about you, why we know it, how long we keep it, and how to make us stop.',
    version: '1.1',
    effective: '2026-09-14',
    status: 'in-force',
  },
  {
    slug: 'how-we-got-your-information',
    title: 'How PALMA got your information',
    shortTitle: 'Where this came from',
    summary:
      'The Article 14 notice: what PALMA holds about a creator who never gave it anything, where each field came from, and how to have the record removed.',
    plainly:
      'We wrote a record about you without asking. Here is everything in it, where we got it, and how to make it go away.',
    version: '1.0',
    effective: '2026-09-01',
    status: 'in-force',
  },
  {
    slug: 'cookies',
    title: 'Cookie Notice',
    shortTitle: 'Cookies',
    summary:
      'The two cookies PALMA sets, both strictly necessary, the single preference it stores, how pages are counted without identifying anyone, and why there is no consent banner.',
    plainly:
      'We set two cookies and remember one preference. We count pages, never people. None of it watches you, which is why there is no banner.',
    version: '1.1',
    effective: '2026-09-14',
    status: 'in-force',
  },
  {
    slug: 'rules',
    title: 'Competition Rules',
    shortTitle: 'Rules',
    summary:
      'The rules of a PALMA season: eligibility, nomination, screening, judging, selection and announcement.',
    plainly: 'How a PALMA is actually decided, start to finish.',
    version: '1.0',
    effective: '2026-09-01',
    status: 'in-force',
  },
  {
    slug: 'complaints',
    title: 'Complaints and Appeals',
    shortTitle: 'Complaints',
    summary:
      'How to challenge a decision, report a concern about the record, or complain about PALMA itself.',
    plainly: 'How to tell us we got it wrong, and what we have to do about it.',
    version: '1.0',
    effective: '2026-09-01',
    status: 'in-force',
  },
  {
    slug: 'mark',
    title: 'Use of the PALMA Mark',
    shortTitle: 'The mark',
    summary:
      'How finalists, winners, sponsors and the press may use the PALMA name, mark and seal — and how they may not.',
    plainly: 'You won one. Here is exactly what you are allowed to say and show.',
    version: '1.0',
    effective: '2026-09-01',
    status: 'in-force',
  },
  {
    slug: 'accessibility',
    title: 'Accessibility Statement',
    shortTitle: 'Accessibility',
    summary:
      'What PALMA has built to WCAG 2.2 AA, what is known to fall short, and how to tell us about a barrier.',
    plainly: 'What works, what does not yet, and how to report something that stops you.',
    version: '1.0',
    effective: '2026-09-01',
    status: 'in-force',
  },
];

export function legalDocument(slug: string): LegalDocument | undefined {
  return LEGAL_DOCUMENTS.find((document) => document.slug === slug);
}

/**
 * Addresses printed across the legal register and the contact page.
 *
 * These collapse onto the four mailboxes PALMA actually reads (see
 * `src/server/email/addresses.ts`). Seven published addresses where three are
 * aspirational is worse than four that are staffed: a person writing to an
 * inbox nobody opens has been refused without being told so. The keys stay
 * distinct because the *reason* someone is writing still differs, and the page
 * should name it.
 *
 * There is no noreply@ here either. Every address PALMA prints accepts replies.
 */
export const CONTACTS = {
  /** The desk: accounts, records, claims, anything in progress. */
  general: 'concierge@palmaawards.com',
  /** Data protection, complaints and appeals. */
  privacy: 'concerns@palmaawards.com',
  /** Vulnerabilities and account safety. */
  security: 'security@palmaawards.com',
  /** Integrity of the record — forged verification, manipulated nominations. */
  integrity: 'concerns@palmaawards.com',
  press: 'concierge@palmaawards.com',
  partnerships: 'concierge@palmaawards.com',
  accessibility: 'concierge@palmaawards.com',
} as const;

export const ENTITY = {
  name: 'Palma Awards Ltd',
  tradingAs: 'PALMA',
  jurisdiction: 'England and Wales',
  /** Placeholders until the company is registered. Marked as such on the page. */
  companyNumber: null as string | null,
  registeredOffice: null as string | null,
  icoRegistration: null as string | null,
  /**
   * The parent.
   *
   * Named here rather than in the pages that mention it, because who owns
   * PALMA is a fact about the institution and appears in the footer, the legal
   * register, the machine-readable files and the metadata. One spelling, in
   * one place, with the macron on the o: One Cō Ltd, not One Co Ltd.
   *
   * The number is null until it is supplied, and every surface that shows it
   * says "not yet supplied" rather than quietly omitting the row. An ownership
   * claim with a blank space where its registration should be is worse than one
   * that admits the registration is outstanding.
   */
  parent: {
    name: 'One Cō Ltd',
    companyNumber: null as string | null,
  },
} as const;
