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

/**
 * The twelve Creator PALMAs.
 *
 * Twelve categories, and above them THE PALMA, which is not in this list
 * because it is not a category: it is conferred once a season on one creator
 * for a career rather than for a year, it cannot be nominated for, and its
 * rules live in `src/domain/the-palma.ts`.
 *
 * Every category recognises achievement in creator work. Several are genre or
 * identity categories, and those are self-declared at nomination: PALMA asks
 * for no documentation of anyone's gender, body or private life, and holds
 * none. That is the same rule the privacy architecture already applies to
 * verification, applied here so that entering a category never becomes a
 * reason to hand PALMA something it has no business keeping.
 */
export const categorySeeds: CategorySeed[] = [
  {
    slug: 'female-creator-of-the-year',
    name: 'Female Creator of the Year',
    strapline: 'The year defined by a woman in the industry.',
    description:
      'For the female creator whose work across the qualifying year set the standard, in craft, in consistency, and in what it led other creators to attempt.',
    eligibility:
      'Open to creators aged 18 or over who identify as women. Gender is self-declared at the point of nomination and PALMA requests no evidence of it. Work must have been published during the qualifying year.',
    judgingCriteria:
      'Achievement and creative quality lead. Judges are briefed to disregard follower and subscriber counts entirely, and to assess a full year of work rather than a single release.',
  },
  {
    slug: 'male-creator-of-the-year',
    name: 'Male Creator of the Year',
    strapline: 'The year defined by a man in the industry.',
    description:
      'For the male creator whose work across the qualifying year set the standard, judged on the same criteria and to the same weighting as every other Creator PALMA.',
    eligibility:
      'Open to creators aged 18 or over who identify as men. Gender is self-declared at the point of nomination and PALMA requests no evidence of it. Work must have been published during the qualifying year.',
    judgingCriteria:
      'Achievement and creative quality lead. Judges are briefed to disregard follower and subscriber counts entirely, and to assess a full year of work rather than a single release.',
  },
  {
    slug: 'trans-creator-of-the-year',
    name: 'Trans Creator of the Year',
    strapline: 'The year defined by a trans creator.',
    description:
      'For the trans creator whose work across the qualifying year set the standard. The category recognises the work, and it is judged against the same six criteria as every other Creator PALMA.',
    eligibility:
      'Open to creators aged 18 or over who identify as trans. Identity is self-declared at the point of nomination. PALMA requests no documentation, holds no record of transition or medical history, and will refuse such material if it is offered.',
    judgingCriteria:
      "Achievement and creative quality lead. Judges are briefed to disregard follower and subscriber counts, and to assess the work rather than the creator's biography.",
  },
  {
    slug: 'milf-creator-of-the-year',
    name: 'MILF Creator of the Year',
    strapline: "The standard-setter in one of the industry's largest genres.",
    description:
      'A genre PALMA. For the creator whose work in this category defined it across the qualifying year, judged on craft, consistency and the strength of the body of work like any other honour.',
    eligibility:
      'Open to creators aged 18 or over whose published work during the qualifying year sits substantially within this genre. Genre placement is self-declared at nomination, and a creator may be nominated in more than one category.',
    judgingCriteria:
      'Judges weigh production quality, range and consistency across the year. Genre popularity is not a criterion, and a category with a large audience is not thereby an easier one to win.',
  },
  {
    slug: 'bbw-creator-of-the-year',
    name: 'BBW Creator of the Year',
    strapline: "The year's strongest body of work in the category.",
    description:
      'A genre PALMA, recognising the creator whose work in this category most clearly set the standard across the qualifying year.',
    eligibility:
      'Open to creators aged 18 or over. Category placement is self-declared at nomination, PALMA asks for no physical description and records none, and a creator may be nominated in more than one category.',
    judgingCriteria:
      'Judges weigh production quality, range and consistency across the year, and are briefed to disregard follower and subscriber counts.',
  },
  {
    slug: 'fetish-creator-of-the-year',
    name: 'Fetish Creator of the Year',
    strapline: 'Specialist work, made properly.',
    description:
      'For the creator whose specialist work showed the clearest craft across the qualifying year: concept, production, presentation and an evident understanding of the audience it is made for.',
    eligibility:
      'Open to creators aged 18 or over whose published work during the qualifying year sits substantially within this category, and whose work is lawful and consistent with the PALMA content policy. Nominations point to work; nothing explicit is uploaded to PALMA.',
    judgingCriteria:
      'Judges weigh craft, originality and consistency. Shock is not a criterion. A judge who cannot assess a nomination without viewing material PALMA does not host assesses it externally or declares that they cannot.',
  },
  {
    slug: 'cosplay-creator-of-the-year',
    name: 'Cosplay Creator of the Year',
    strapline: 'Costume, character and production, held together.',
    description:
      'For the creator whose costume and character work was the most accomplished across the qualifying year. This is a craft category: construction, styling, lighting, staging and the discipline of staying in character.',
    eligibility:
      'Open to creators aged 18 or over who published costume or character work during the qualifying year. Costumes may be made or commissioned, and where commissioned the maker should be credited in the nomination.',
    judgingCriteria:
      'Judges weigh construction and finish, fidelity of character, and the quality of the photography or video around it. A commissioned costume worn well scores below one conceived and built by the creator.',
  },
  {
    slug: 'inked-creator-of-the-year',
    name: 'Inked Creator of the Year',
    strapline: 'A visual identity carried through the work.',
    description:
      'For the tattooed creator whose visual identity is a deliberate part of the work rather than incidental to it, and whose output across the qualifying year was the strongest in the category.',
    eligibility:
      'Open to creators aged 18 or over. Category placement is self-declared at nomination, and a creator may be nominated in more than one category.',
    judgingCriteria:
      'Judges weigh how coherently the visual identity runs through a body of work, alongside the usual criteria of craft and consistency. A tattoo is not an achievement; what is built around it can be.',
  },
  {
    slug: 'live-creator-of-the-year',
    name: 'Live Creator of the Year',
    strapline: 'Unedited, in real time, and still excellent.',
    description:
      'For the creator whose live work was the most accomplished across the qualifying year. Live is the hardest discipline in the industry because nothing can be fixed afterwards: the room, the pacing and the audience are handled once.',
    eligibility:
      'Open to creators aged 18 or over who broadcast live during the qualifying year on any platform. Hours streamed are recorded as context and are not a criterion.',
    judgingCriteria:
      'Judges weigh presence, pacing, technical quality and the handling of a live audience. Volume of streaming is not a criterion, and a creator who streams less but better scores higher.',
  },
  {
    slug: 'clip-creator-of-the-year',
    name: 'Clip Creator of the Year',
    strapline: 'Self-produced, start to finish.',
    description:
      'For the creator whose self-produced work was the strongest across the qualifying year: written, shot, performed, edited and released by the creator, usually alone.',
    eligibility:
      'Open to creators aged 18 or over who produced and published their own work during the qualifying year. Where a creator worked with a crew, the nomination should say so.',
    judgingCriteria:
      'Judges assess craft against the resources actually available, so a well-finished piece made alone can outscore a studio production. Sound is weighed as heavily as picture.',
  },
  {
    slug: 'creator-duo-of-the-year',
    name: 'Creator Duo of the Year',
    strapline: 'Two people, one body of work.',
    description:
      'For the pair whose collaborative work across the qualifying year was the strongest. The honour is held jointly and both names enter the Roll of Honour together.',
    eligibility:
      'Open to two creators aged 18 or over who published collaborative work together during the qualifying year. Both must consent to the nomination, and a duo that has since separated remains eligible for work published while it was together.',
    judgingCriteria:
      "Judges weigh the work the pair made together rather than either creator's separate output, and look for a partnership that produced something neither would have made alone.",
  },
  {
    slug: 'rising-creator-of-the-year',
    name: 'Rising Creator of the Year',
    strapline: 'The first years, done properly.',
    description:
      'For the creator who arrived with a point of view already formed. This is the category that most often predicts the rest of the Roll of Honour.',
    eligibility:
      'Open to creators aged 18 or over whose first published work appeared no earlier than three years before the start of the qualifying year. A creator may win this PALMA once.',
    judgingCriteria:
      'Originality carries the greatest weight, and judges assess the work on its own terms rather than against creators with a decade of practice behind them.',
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
   * The categories contested that season, in order.
   *
   * A season runs the slate it announced, not today's slate. PALMA opened with
   * six Creator PALMAs and has grown to twelve, so an archived season must show
   * the categories that actually existed then. Without this, adding a category
   * in 2027 would silently invent it into 2025 and either fabricate a winner or
   * imply the panel declined an honour it was never asked to confer.
   */
  categorySlugs: string[];
  /**
   * THE PALMA for this season, if it was conferred.
   *
   * Outside `results` on purpose. It is not a category result, it has no
   * finalists behind it, and putting it in that map would make it the
   * thirteenth key in a list of twelve.
   */
  thePalma?: { creatorSlug: string; citation: string };
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
      'The inaugural PALMA season. Six categories, an independent panel, and the first names entered into the Roll of Honour.',
    isCurrent: false,
    nominationsOpenAt: '2025-01-14T09:00:00.000Z',
    nominationsCloseAt: '2025-03-31T23:00:00.000Z',
    shortlistAt: '2025-05-06T09:00:00.000Z',
    finalistsAt: '2025-06-17T09:00:00.000Z',
    ceremonyAt: '2025-09-25T18:00:00.000Z',
    // The opening slate: six.
    categorySlugs: [
      'female-creator-of-the-year',
      'male-creator-of-the-year',
      'trans-creator-of-the-year',
      'live-creator-of-the-year',
      'clip-creator-of-the-year',
      'rising-creator-of-the-year',
    ],
    results: {
      'female-creator-of-the-year': ['maya-rivers', 'noor-haddad'],
      'male-creator-of-the-year': ['jordan-smith'],
      'trans-creator-of-the-year': ['noor-haddad', 'maya-rivers'],
      'live-creator-of-the-year': ['jordan-smith', 'maya-rivers', 'noor-haddad'],
      // Contested, judged, and not conferred: the panel found no candidacy that
      // met the standard. The public record says so.
      'clip-creator-of-the-year': [],
      'rising-creator-of-the-year': ['noor-haddad', 'jordan-smith'],
    },
    thePalma: {
      creatorSlug: 'maya-rivers',
      citation:
        'For a body of work that changed what the industry believed an independent creator could build alone, and for insisting on terms that others have since been able to ask for.',
    },
  },
  {
    year: 2026,
    title: 'PALMA 2026',
    stage: 'archived',
    tagline: 'The record holds.',
    summary:
      'A second season, nine categories, and the first repeat honour in the Roll of Honour. The point at which an archive starts being worth checking.',
    isCurrent: false,
    nominationsOpenAt: '2026-01-13T09:00:00.000Z',
    nominationsCloseAt: '2026-03-30T23:00:00.000Z',
    shortlistAt: '2026-05-05T09:00:00.000Z',
    finalistsAt: '2026-06-16T09:00:00.000Z',
    ceremonyAt: '2026-09-24T18:00:00.000Z',
    // Three added: the genre categories arrive.
    categorySlugs: [
      'female-creator-of-the-year',
      'male-creator-of-the-year',
      'trans-creator-of-the-year',
      'milf-creator-of-the-year',
      'fetish-creator-of-the-year',
      'cosplay-creator-of-the-year',
      'live-creator-of-the-year',
      'clip-creator-of-the-year',
      'rising-creator-of-the-year',
    ],
    results: {
      'female-creator-of-the-year': ['noor-haddad', 'maya-rivers'],
      'male-creator-of-the-year': ['jordan-smith', 'noor-haddad'],
      'trans-creator-of-the-year': ['maya-rivers', 'noor-haddad', 'jordan-smith'],
      'milf-creator-of-the-year': ['maya-rivers', 'jordan-smith'],
      'fetish-creator-of-the-year': ['jordan-smith', 'maya-rivers'],
      'cosplay-creator-of-the-year': ['noor-haddad', 'jordan-smith', 'maya-rivers'],
      'live-creator-of-the-year': ['maya-rivers', 'noor-haddad'],
      'clip-creator-of-the-year': ['jordan-smith', 'noor-haddad', 'maya-rivers'],
      // A second declined honour. Two across three seasons is the standard
      // being real rather than decorative.
      'rising-creator-of-the-year': [],
    },
    thePalma: {
      creatorSlug: 'jordan-smith',
      citation:
        'For fifteen years of work that never once coasted, and for a standard of production that quietly became the one everyone else is measured against.',
    },
  },
  {
    year: 2027,
    title: 'PALMA 2027',
    stage: 'nominations_open',
    tagline: 'Recognising the people shaping creator culture.',
    summary:
      'The third PALMA season. Nominations are open across all twelve Creator PALMAs, judged by an independent panel and announced in four stages. THE PALMA is conferred at the ceremony.',
    isCurrent: true,
    nominationsOpenAt: '2026-09-01T09:00:00.000Z',
    nominationsCloseAt: '2027-01-31T23:00:00.000Z',
    shortlistAt: '2027-03-10T09:00:00.000Z',
    finalistsAt: '2027-05-12T09:00:00.000Z',
    ceremonyAt: '2027-09-23T18:00:00.000Z',
    // The full slate for the first time.
    categorySlugs: categorySeeds.map((category) => category.slug),
    results: {},
  },
];

export const citations: Record<string, string> = {
  'female-creator-of-the-year': 'For a year of work that set the standard and held it.',
  'male-creator-of-the-year': 'For a year of work that set the standard and held it.',
  'trans-creator-of-the-year': 'For work that made the case on its own terms.',
  'milf-creator-of-the-year': 'For defining a category rather than occupying it.',
  'bbw-creator-of-the-year': 'For a body of work of uncommon range and consistency.',
  'fetish-creator-of-the-year': 'For specialist work made with unusual care.',
  'cosplay-creator-of-the-year': 'For character work built rather than bought.',
  'inked-creator-of-the-year': 'For a visual identity carried through every frame.',
  'live-creator-of-the-year': 'For work that could not be fixed afterwards and did not need to be.',
  'clip-creator-of-the-year': 'For writing, shooting, performing and cutting it alone, and well.',
  'creator-duo-of-the-year': 'For making together what neither would have made apart.',
  'rising-creator-of-the-year': 'For arriving with a point of view already fully formed.',
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
    categorySlug: 'rising-creator-of-the-year',
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
    standfirst: 'Twelve categories, one nomination each, and a closing date that will not move.',
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
