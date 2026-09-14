export type NavItem = {
  href: string;
  label: string;
  /** Labels whose casing is part of the name, such as PaROH. */
  preserveCase?: boolean;
};

/**
 * Six destinations, not eight.
 *
 * Finalists and Winners are *states of a season*, not permanent places: they
 * live inside the Awards experience and are reached from the season rail. The
 * navigation names what PALMA is, rather than listing its database tables.
 */
export const PUBLIC_NAV: NavItem[] = [
  { href: '/awards', label: 'Awards' },
  { href: '/categories', label: 'Categories' },
  { href: '/nominate', label: 'Nominate' },
  { href: '/paroh', label: 'PaROH', preserveCase: true },
  { href: '/journal', label: 'Journal' },
  { href: '/about', label: 'About' },
];

export const FOOTER_NAV: { title: string; items: NavItem[] }[] = [
  {
    title: 'The Honours',
    items: [
      { href: '/awards', label: 'Awards' },
      { href: '/categories', label: 'Categories' },
      { href: '/finalists', label: 'Finalists' },
      { href: '/winners', label: 'Winners' },
      { href: '/paroh', label: 'PALMA Roll of Honour' },
    ],
  },
  {
    title: 'Take part',
    items: [
      { href: '/nominate', label: 'Nominate a creator' },
      { href: '/creators', label: 'Creators' },
      { href: '/verify', label: 'Verify an honour' },
      { href: '/report', label: 'Report a concern' },
    ],
  },
  {
    title: 'Institution',
    items: [
      { href: '/about', label: 'About PALMA' },
      { href: '/about/judging', label: 'How judging works' },
      { href: '/about/judges', label: 'The panel' },
      { href: '/about/sponsors', label: 'Partners' },
      { href: '/about/policy', label: 'Content policy' },
      { href: '/gazette', label: 'The Gazette' },
      { href: '/press', label: 'Press' },
      { href: '/contact', label: 'Contact' },
    ],
  },
  {
    title: 'Account',
    items: [
      { href: '/creator', label: 'Creators' },
      { href: '/judge', label: 'Judges' },
      { href: '/portal', label: 'Moderation' },
      { href: '/admin', label: 'Administration' },
      { href: '/humans.txt', label: 'humans.txt' },
    ],
  },
];

/**
 * The legal register, rendered as a fourth footer row rather than inside a
 * column. A reader looking for the terms is not browsing; they want the list.
 */
export const LEGAL_NAV: NavItem[] = [
  { href: '/legal', label: 'Legal register' },
  { href: '/legal/terms', label: 'Terms' },
  { href: '/legal/privacy', label: 'Privacy' },
  { href: '/legal/how-we-got-your-information', label: 'Where this came from' },
  { href: '/legal/cookies', label: 'Cookies' },
  { href: '/legal/rules', label: 'Competition rules' },
  { href: '/legal/complaints', label: 'Complaints' },
  { href: '/legal/mark', label: 'Use of the mark' },
  { href: '/legal/accessibility', label: 'Accessibility' },
];
