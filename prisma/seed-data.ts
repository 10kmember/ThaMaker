/**
 * The PALMA seed cast.
 *
 * Nine people, and every one of them declares here what they are: an operator,
 * a judge, a creator, or more than one of those. There is no second list of
 * names anywhere — the accounts, the panel, the archive and the claim states
 * are all derived from this array, so the cast cannot drift out of step with
 * itself the way three parallel lists would.
 *
 * Read by `prisma/seed.ts` and by nothing else. It is not part of the
 * application: PostgreSQL is the single source of truth, and a name appears on
 * the site because it is in the database, never because it is in this file.
 *
 * Deliberately small. A demonstration dataset is easier to trust when a person
 * can hold all of it in their head — and a thin archive is an honest picture of
 * a young institution rather than a fake picture of a busy one.
 */

export type PersonRole = 'super_admin' | 'moderator' | 'judge' | 'creator';

export type CreatorFacet = {
  slug: string;
  countryCode: string;
  city: string | null;
  pronouns: string | null;
  headline: string;
  biography: string;
  websiteUrl: string | null;
  /** Age and identity assurance completed with the provider. */
  verified: boolean;
  links: { label: string; url: string }[];
};

export type JudgeFacet = {
  title: string;
  organisation: string;
  countryCode: string;
  biography: string;
  isChair: boolean;
};

export type Person = {
  name: string;
  /** `null` for a creator PALMA wrote a record for who has never signed in. */
  email: string | null;
  role: PersonRole;
  judge?: JudgeFacet;
  creator?: CreatorFacet;
};

export const people: Person[] = [
  // ── Operators ─────────────────────────────────────────────────────────────
  {
    name: 'Sarah Okonkwo',
    email: 'sarah@palmaawards.com',
    role: 'super_admin',
  },
  {
    name: 'Tom Ashworth',
    email: 'tom@palmaawards.com',
    role: 'moderator',
  },
  {
    name: 'Nadia Bello',
    email: 'nadia@palmaawards.com',
    role: 'moderator',
  },

  // ── The panel ─────────────────────────────────────────────────────────────
  {
    name: 'Adaeze Mbeki',
    email: 'adaeze@palmaawards.com',
    role: 'judge',
    judge: {
      title: 'Chair of the PALMA panel',
      organisation: 'Formerly Channel 4',
      countryCode: 'GB',
      biography:
        'Twenty years commissioning factual and documentary work, latterly as head of digital commissioning. Chairs the panel, sees every score spread before a list is confirmed, and scores nothing.',
      isChair: true,
    },
  },
  {
    name: 'Frances Okonjo',
    email: 'frances@palmaawards.com',
    role: 'judge',
    judge: {
      title: 'Commissioning editor',
      organisation: 'Independent',
      countryCode: 'GB',
      biography:
        'Commissions long-form video and audio for independent publishers. Writes and teaches about editorial standards in creator-made journalism.',
      isChair: false,
    },
  },
  {
    name: 'Marcus Hale',
    email: 'marcus@palmaawards.com',
    role: 'judge',
    judge: {
      title: 'Head of audio',
      organisation: 'Northbank Audio',
      countryCode: 'GB',
      biography:
        'Producer and studio head. Twelve years in podcasting, from three-person shows to network commissions, and a persistent sceptic of download numbers as a measure of anything.',
      isChair: false,
    },
  },

  // ── Creators ──────────────────────────────────────────────────────────────
  {
    name: 'Maya Rivers',
    email: 'maya@example.com',
    role: 'creator',
    creator: {
      slug: 'maya-rivers',
      countryCode: 'GB',
      city: 'London',
      pronouns: 'she/her',
      headline: 'Long-form video essayist working on labour and the internet.',
      biography:
        'Maya Rivers makes long-form video about how people actually earn a living online. Her work is researched like journalism and cut like film, and she has published to the same schedule for six years without an agency behind her. She writes her own scripts, does her own archival research, and credits every contributor on screen.',
      websiteUrl: 'https://example.com/maya-rivers',
      verified: true,
      links: [
        { label: 'Channel', url: 'https://example.com/maya-rivers/video' },
        { label: 'Written work', url: 'https://example.com/maya-rivers/writing' },
      ],
    },
  },
  {
    name: 'Jordan Smith',
    email: 'jordan@example.com',
    role: 'creator',
    creator: {
      slug: 'jordan-smith',
      countryCode: 'GB',
      city: 'Manchester',
      pronouns: 'they/them',
      headline: 'Audio documentarian turning local archives into serialised work.',
      biography:
        'Jordan Smith builds serialised audio from municipal archives, court records and the people still living in the streets those records describe. Their first season was made on a borrowed interface in a spare room, and the fourth was licensed by a national broadcaster without changing a line of it.',
      websiteUrl: null,
      verified: true,
      links: [{ label: 'The series', url: 'https://example.com/jordan-smith/audio' }],
    },
  },
  {
    name: 'Noor Haddad',
    // No account. PALMA wrote this record when Noor was first nominated, and it
    // sits unclaimed — which is the ordinary state of a record in a young
    // archive, and what the claim flow exists to resolve.
    email: null,
    role: 'creator',
    creator: {
      slug: 'noor-haddad',
      countryCode: 'JO',
      city: 'Amman',
      pronouns: 'she/her',
      headline: 'Documentary photographer publishing serialised photo essays.',
      biography:
        'Noor Haddad publishes photo essays in instalments, each one reported over months and captioned at the length of an article. She works almost entirely in daylight and almost entirely alone, and has refused every offer that came with editorial conditions.',
      websiteUrl: 'https://example.com/noor-haddad',
      verified: false,
      links: [{ label: 'Portfolio', url: 'https://example.com/noor-haddad/work' }],
    },
  },
];

export type CategorySeed = {
  slug: string;
  name: string;
  strapline: string;
  description: string;
  eligibility: string;
  judgingCriteria: string;
};

export const categorySeeds: CategorySeed[] = [
  {
    slug: 'creator-of-the-year',
    name: 'Creator of the Year',
    strapline: 'The defining body of work of the season.',
    description:
      'The highest PALMA. Awarded to the creator whose work has most clearly defined the year — in craft, in consequence, and in how it changed what other creators believed was possible.',
    eligibility:
      'Open to any creator aged 18 or over who published work between 1 January and 31 December of the qualifying year. Nominees may work in any medium and any territory. Previous winners may be nominated again after two seasons.',
    judgingCriteria:
      'Judges weigh originality and impact most heavily, with consistency of output across the full qualifying year treated as a threshold rather than a bonus.',
  },
  {
    slug: 'best-independent-creator',
    name: 'Best Independent Creator',
    strapline: 'Work made without a network behind it.',
    description:
      'For creators operating without a studio, network, label or agency holding editorial control. Independence is judged on control of the work, not on scale of audience.',
    eligibility:
      'Nominees must retain editorial and commercial control of their primary output, and must not be under an exclusive content agreement with a studio, network or label during the qualifying year.',
    judgingCriteria:
      'Originality, consistency and professionalism carry equal weight. Judges are asked explicitly to discount audience size.',
  },
  {
    slug: 'best-new-creator',
    name: 'Best New Creator',
    strapline: 'The first two years, done properly.',
    description:
      'For a creator whose first published work appeared within two years of the qualifying period, and who arrived with a point of view already formed.',
    eligibility:
      'First public work must have been published no earlier than two years before the start of the qualifying year. A creator may win this PALMA once.',
    judgingCriteria:
      'Originality carries the greatest weight. Judges are asked to assess the work on its own terms rather than against creators with a decade of practice behind them.',
  },
  {
    slug: 'community-impact',
    name: 'Community Impact',
    strapline: 'Work whose consequence outlived its audience.',
    description:
      'For work that changed something outside itself — a practice other creators adopted, a subject taken seriously, a standard raised for everyone working in the same field.',
    eligibility:
      'Open to any creator aged 18 or over. The impact claimed must be evidenced and must have occurred during the qualifying year.',
    judgingCriteria:
      'Impact is weighed most heavily, and reach is explicitly not impact. Judges are asked what changed because this work exists.',
  },
];

export type SeasonSeed = {
  year: number;
  title: string;
  stage:
    | 'announced'
    | 'nominations_open'
    | 'nominations_closed'
    | 'shortlisting'
    | 'shortlist_announced'
    | 'judging'
    | 'finalists_announced'
    | 'winners_announced'
    | 'archived';
  tagline: string;
  summary: string;
  isCurrent: boolean;
  nominationsOpenAt: string | null;
  nominationsCloseAt: string | null;
  shortlistAt: string | null;
  finalistsAt: string | null;
  ceremonyAt: string | null;
  /**
   * category slug → [winner, ...finalists] creator slugs.
   *
   * A category absent from this map, or present with an empty list, was
   * contested but not conferred — which is a published rule rather than a gap
   * in the data: PALMA declines a category rather than lower the standard.
   */
  results: Record<string, string[]>;
};

export const seasonSeeds: SeasonSeed[] = [
  {
    year: 2025,
    title: 'PALMA 2025',
    stage: 'archived',
    tagline: 'The first record.',
    summary:
      'The inaugural PALMA season. Four categories, an independent panel, and the first names entered into the Roll of Honour.',
    isCurrent: false,
    nominationsOpenAt: '2025-01-14T09:00:00.000Z',
    nominationsCloseAt: '2025-03-31T23:00:00.000Z',
    shortlistAt: '2025-05-06T09:00:00.000Z',
    finalistsAt: '2025-06-17T09:00:00.000Z',
    ceremonyAt: '2025-09-25T18:00:00.000Z',
    results: {
      'creator-of-the-year': ['maya-rivers', 'jordan-smith', 'noor-haddad'],
      'best-independent-creator': ['noor-haddad', 'maya-rivers', 'jordan-smith'],
      'best-new-creator': ['jordan-smith', 'noor-haddad'],
      // Contested, judged, and not conferred: the panel found no candidacy that
      // met the standard. The public record says so.
      'community-impact': [],
    },
  },
  {
    year: 2026,
    title: 'PALMA 2026',
    stage: 'archived',
    tagline: 'The record holds.',
    summary:
      'A second season, and the first repeat honour in the Roll of Honour — the point at which an archive starts being worth checking.',
    isCurrent: false,
    nominationsOpenAt: '2026-01-13T09:00:00.000Z',
    nominationsCloseAt: '2026-03-30T23:00:00.000Z',
    shortlistAt: '2026-05-05T09:00:00.000Z',
    finalistsAt: '2026-06-16T09:00:00.000Z',
    ceremonyAt: '2026-09-24T18:00:00.000Z',
    results: {
      'creator-of-the-year': ['jordan-smith', 'maya-rivers', 'noor-haddad'],
      'best-independent-creator': ['maya-rivers', 'noor-haddad', 'jordan-smith'],
      'best-new-creator': ['noor-haddad', 'jordan-smith'],
      'community-impact': ['maya-rivers', 'jordan-smith', 'noor-haddad'],
    },
  },
  {
    year: 2027,
    title: 'PALMA 2027',
    stage: 'nominations_open',
    tagline: 'Recognising the people shaping creator culture.',
    summary:
      'The third PALMA season. Nominations are open across four categories, judged by an independent panel and announced in four stages.',
    isCurrent: true,
    nominationsOpenAt: '2026-09-01T09:00:00.000Z',
    nominationsCloseAt: '2027-01-31T23:00:00.000Z',
    shortlistAt: '2027-03-10T09:00:00.000Z',
    finalistsAt: '2027-05-12T09:00:00.000Z',
    ceremonyAt: '2027-09-23T18:00:00.000Z',
    results: {},
  },
];

export const citations: Record<string, string> = {
  'creator-of-the-year': 'For a body of work that set the standard of the season.',
  'best-independent-creator': 'For sustained, independent work held to an uncommon standard.',
  'best-new-creator': 'For arriving with a point of view already fully formed.',
  'community-impact': 'For work whose consequence was felt well beyond its audience.',
};

export const sponsors = [
  {
    slug: 'holloway-finch',
    name: 'Holloway & Finch',
    summary:
      'A London accountancy practice working almost entirely with self-employed creative people.',
    websiteUrl: 'https://example.com/holloway-finch',
    tier: 'headline' as const,
    categorySlug: null,
  },
  {
    slug: 'northbank-audio',
    name: 'Northbank Audio',
    summary: 'An independent audio studio and post house.',
    websiteUrl: 'https://example.com/northbank-audio',
    tier: 'category_partner' as const,
    categorySlug: 'best-new-creator',
  },
];

export const articleCategories = [
  { slug: 'announcements', name: 'Announcements', position: 0 },
  { slug: 'the-institution', name: 'The institution', position: 1 },
  { slug: 'craft', name: 'Craft', position: 2 },
];

export const articles = [
  {
    slug: 'palma-2027-nominations-open',
    title: 'Nominations for PALMA 2027 are open',
    standfirst: 'Four categories, one nomination each, and a closing date that will not move.',
    categorySlug: 'announcements',
    status: 'published' as const,
    publishedAt: '2026-09-01T09:00:00.000Z',
    body: `Nominations for the 2027 season open today and close at 23:00 on 31 January 2027. That date is published now, before a single nomination has been made, and it will not move to accommodate a campaign.

Nominating takes under a minute. You need a creator, a category, a sentence about why, and an email address you can receive a code at. There is no account to create and nothing to upload.

One nomination per person, per creator, per category. That is enforced in the database rather than discouraged in the interface, so a second attempt is refused rather than quietly discarded.

We publish no nomination counts. Not during the season, not after it, and not to the panel — who are shown the argument the audience made and never how many people made it. The audience identifies. PALMA judges.`,
  },
  {
    slug: 'what-a-palma-is-for',
    title: 'What a PALMA is for',
    standfirst: 'The archive came before the ceremony, and that order is the whole argument.',
    categorySlug: 'the-institution',
    status: 'published' as const,
    publishedAt: '2026-08-12T09:00:00.000Z',
    body: `Most awards in this industry measure distribution and call it merit. They hand out something shaped like a trophy, publish a list, and let the list rot quietly into a dead page two years later.

PALMA was built the other way round. The Roll of Honour existed before the first ceremony did, because the record is the product and the evening is an expression of it. Every honour carries a signed verification record that anyone can check, without an account and without asking us.

That has a consequence we accept: an honour conferred today has to still be defensible in ten years. It is why the panel is published, why the criteria are published before nominations open, and why a revoked honour stays on the record marked revoked rather than vanishing.

An archive you can quietly edit is not an archive. It is a marketing page with a date on it.`,
  },
  {
    slug: 'why-we-declined-a-category',
    title: 'Why we declined a category in 2025',
    standfirst: 'Community Impact was contested, judged, and not conferred. Here is the reasoning.',
    categorySlug: 'the-institution',
    status: 'published' as const,
    publishedAt: '2025-09-26T09:00:00.000Z',
    body: `In the inaugural season, the panel judged Community Impact and recommended that no PALMA be conferred in it.

The rule permitting that is published: where a category receives too few eligible candidacies to judge credibly, PALMA may decline to confer an honour, and will say so publicly rather than lower the standard.

It is an uncomfortable thing to do in a first season, when the institution has every incentive to look busy. It is also the single clearest signal we could send about what the other honours mean. A PALMA that is conferred every year regardless is a participation medal with better typography.

The category returned in 2026 and was conferred.`,
  },
  {
    slug: 'how-judging-works',
    title: 'How judging actually works',
    standfirst: 'Five criteria, ten points each, and audience size explicitly excluded.',
    categorySlug: 'craft',
    status: 'published' as const,
    publishedAt: '2026-06-03T09:00:00.000Z',
    body: `Every eligible candidacy is scored independently by at least three judges against five published criteria, each out of ten.

Judges are briefed in writing to discount audience size. It is not a criterion, it is not shown to them, and it never will be. What they are shown is a prepared case: the eligibility checks PALMA has already completed, a sample of what the audience said, the evidence our team gathered, and the category's own criteria.

A judge cannot reach the scale without declaring whether they have a conflict, and declaring removes the candidate from their assignments immediately. The chair decides whether it mattered, not the judge.

Where four or more judges have scored a candidacy, the highest and lowest scores are dropped before ranking. Panels disagree, and one outlier — enthusiastic or hostile — should not decide a PALMA.

A submitted assessment cannot be edited. If PALMA needs a correction it goes through an administrator, and the state before and after is written to the audit log.`,
  },
];
