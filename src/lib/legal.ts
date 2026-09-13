/**
 * The PALMA legal register.
 *
 * These documents live in git rather than in the database, deliberately. The
 * database is the source of truth for the *record* — who was nominated, who
 * judged, who won. A legal document is different: it has to be diffable,
 * reviewable, attributable to a commit, and impossible to change without that
 * change being visible. Version control is the right store for it.
 *
 * Every document carries a version and an effective date, and says plainly
 * whether it is in force or still awaiting review by UK counsel. PALMA would
 * rather publish a document marked "draft" than imply a review that has not
 * happened.
 */

export type LegalStatus = 'in-force' | 'draft';

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
    status: 'draft',
  },
  {
    slug: 'privacy',
    title: 'Privacy Notice',
    shortTitle: 'Privacy',
    summary:
      'What personal data PALMA holds, why, for how long, and the things it has deliberately chosen not to hold.',
    plainly:
      'What we know about you, why we know it, how long we keep it, and how to make us stop.',
    version: '1.0',
    effective: '2026-09-01',
    status: 'draft',
  },
  {
    slug: 'cookies',
    title: 'Cookie Notice',
    shortTitle: 'Cookies',
    summary:
      'The two cookies PALMA sets, both strictly necessary, the single preference it stores, and why there is no consent banner.',
    plainly:
      'We set two cookies and remember one preference. None of them watch you. That is why there is no banner.',
    version: '1.0',
    effective: '2026-09-01',
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
    status: 'draft',
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
    status: 'draft',
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
    status: 'draft',
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

/** Addresses printed across the legal register and the contact page. */
export const CONTACTS = {
  general: 'honours@palmaawards.com',
  privacy: 'privacy@palmaawards.com',
  security: 'security@palmaawards.com',
  integrity: 'integrity@palmaawards.com',
  press: 'press@palmaawards.com',
  partnerships: 'partnerships@palmaawards.com',
  accessibility: 'access@palmaawards.com',
} as const;

export const ENTITY = {
  name: 'Palma Awards Ltd',
  tradingAs: 'PALMA',
  jurisdiction: 'England and Wales',
  /** Placeholders until the company is registered. Marked as such on the page. */
  companyNumber: null as string | null,
  registeredOffice: null as string | null,
  icoRegistration: null as string | null,
} as const;
