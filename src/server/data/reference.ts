import { signingSecret } from '@/lib/env';
import { deriveCode, signAchievement } from '@/lib/verification';
import type {
  AchievementRecord,
  ArticleDetail,
  CategoryView,
  CreatorProfile,
  HonourEntry,
  SeasonView,
  SponsorView,
} from './types';

/**
 * The PALMA reference dataset.
 *
 * This is the institution's shape expressed as data: three seasons, a full
 * category set, a populated Roll of Honour and the editorial voice of the
 * Journal. It backs archive mode (no DATABASE_URL) and seeds a new database,
 * so the same content is used for design review, tests and first launch.
 */

type Seed = {
  slug: string;
  displayName: string;
  countryCode: string;
  city: string | null;
  pronouns: string | null;
  headline: string;
  biography: string;
  websiteUrl: string | null;
  verified: boolean;
};

const CREATOR_SEEDS: Seed[] = [
  {
    slug: 'maya-rivers',
    displayName: 'Maya Rivers',
    countryCode: 'GB',
    city: 'London',
    pronouns: 'she/her',
    headline: 'Long-form video essayist working on labour and the internet.',
    biography:
      'Maya Rivers makes long-form video about how people actually earn a living online. Her work is researched like journalism and cut like film, and she has published to the same schedule for six years without an agency behind her.',
    websiteUrl: 'https://example.com/maya-rivers',
    verified: true,
  },
  {
    slug: 'jordan-smith',
    displayName: 'Jordan Smith',
    countryCode: 'GB',
    city: 'Manchester',
    pronouns: 'they/them',
    headline: 'Audio documentarian turning local archives into serialised work.',
    biography:
      'Jordan Smith builds serialised audio from municipal archives, court records and the people still living in the streets those records describe. Their first season was made on a borrowed interface in a spare room.',
    websiteUrl: null,
    verified: true,
  },
  {
    slug: 'alex-taylor',
    displayName: 'Alex Taylor',
    countryCode: 'IE',
    city: 'Dublin',
    pronouns: 'he/him',
    headline: 'Independent games critic and preservationist.',
    biography:
      'Alex Taylor writes and films about games that publishers no longer sell. His preservation work has been cited by two national archives, and he funds it entirely through direct support from readers.',
    websiteUrl: 'https://example.com/alex-taylor',
    verified: true,
  },
  {
    slug: 'noor-haddad',
    displayName: 'Noor Haddad',
    countryCode: 'GB',
    city: 'Birmingham',
    pronouns: 'she/her',
    headline: 'Food writer and cook documenting diaspora kitchens.',
    biography:
      'Noor Haddad records the recipes of Birmingham kitchens before the people who hold them stop cooking. Her newsletter runs to 40,000 readers and has never carried a paid placement.',
    websiteUrl: null,
    verified: true,
  },
  {
    slug: 'elliot-quaye',
    displayName: 'Elliot Quaye',
    countryCode: 'GB',
    city: 'London',
    pronouns: 'he/him',
    headline: 'Creative director building identity systems for independent studios.',
    biography:
      'Elliot Quaye designs the visual language of small studios and then publishes the reasoning behind it. His open case studies have become a de facto curriculum for designers entering the industry without a degree.',
    websiteUrl: 'https://example.com/elliot-quaye',
    verified: true,
  },
  {
    slug: 'sofia-marchetti',
    displayName: 'Sofia Marchetti',
    countryCode: 'IT',
    city: 'Milan',
    pronouns: 'she/her',
    headline: 'Fashion historian publishing serialised research to camera.',
    biography:
      'Sofia Marchetti reads couture archives on camera with the patience of a lecture and the pacing of a series. She has turned primary-source research into one of the most cited independent fashion channels in Europe.',
    websiteUrl: null,
    verified: true,
  },
  {
    slug: 'theo-lindqvist',
    displayName: 'Theo Lindqvist',
    countryCode: 'SE',
    city: 'Gothenburg',
    pronouns: 'he/him',
    headline: 'Documentary photographer and slow-publishing newsletter writer.',
    biography:
      'Theo Lindqvist publishes four photo essays a year and nothing else. Each is reported over months, printed before it is posted, and sold as a limited edition to fund the next.',
    websiteUrl: 'https://example.com/theo-lindqvist',
    verified: true,
  },
  {
    slug: 'priya-raman',
    displayName: 'Priya Raman',
    countryCode: 'GB',
    city: 'Leeds',
    pronouns: 'she/her',
    headline: 'Science communicator working with research institutions.',
    biography:
      'Priya Raman translates published research into work that specialists still recognise. She writes with named researchers rather than about them, and credits every collaborator on the face of the work.',
    websiteUrl: null,
    verified: true,
  },
  {
    slug: 'callum-beattie',
    displayName: 'Callum Beattie',
    countryCode: 'GB',
    city: 'Glasgow',
    pronouns: 'he/him',
    headline: 'Music producer documenting the making of records in public.',
    biography:
      'Callum Beattie records the process of making records — the failures included — and releases it alongside the finished work. Three of the artists he has documented have since signed to independent labels.',
    websiteUrl: null,
    verified: true,
  },
  {
    slug: 'imani-okafor',
    displayName: 'Imani Okafor',
    countryCode: 'NG',
    city: 'Lagos',
    pronouns: 'she/her',
    headline: 'Business journalist covering the African creator economy.',
    biography:
      'Imani Okafor reports on how creators across West Africa are paid, taxed and contracted. Her rate-card survey is now used as a reference by agencies she has never worked with.',
    websiteUrl: 'https://example.com/imani-okafor',
    verified: true,
  },
  {
    slug: 'rosa-delgado',
    displayName: 'Rosa Delgado',
    countryCode: 'ES',
    city: 'Valencia',
    pronouns: 'she/her',
    headline: 'Illustrator and process-teacher working in public.',
    biography:
      'Rosa Delgado teaches illustration by finishing commissions on camera, unedited. Her students have gone on to publish in three national newspapers.',
    websiteUrl: null,
    verified: true,
  },
  {
    slug: 'wren-ashby',
    displayName: 'Wren Ashby',
    countryCode: 'GB',
    city: 'Bristol',
    pronouns: 'they/them',
    headline: 'Community organiser building tooling for independent creators.',
    biography:
      'Wren Ashby builds and gives away the administrative tooling independent creators need — invoices, contracts, rate benchmarks — and runs the clinic that teaches people to use it.',
    websiteUrl: 'https://example.com/wren-ashby',
    verified: true,
  },
  {
    slug: 'kai-tanaka',
    displayName: 'Kai Tanaka',
    countryCode: 'JP',
    city: 'Kyoto',
    pronouns: 'he/him',
    headline: 'Craft documentarian filming workshops that are closing.',
    biography:
      'Kai Tanaka films the last working days of craft workshops across Japan, and publishes each film with a full transcript in two languages so the record survives the platform.',
    websiteUrl: null,
    verified: true,
  },
  {
    slug: 'dara-ellison',
    displayName: 'Dara Ellison',
    countryCode: 'GB',
    city: 'Cardiff',
    pronouns: 'she/her',
    headline: 'Newsletter writer covering the economics of independent media.',
    biography:
      'Dara Ellison publishes the numbers behind independent media — hers included. Her annual disclosure of her own accounts has been copied by dozens of writers since.',
    websiteUrl: null,
    verified: true,
  },
];

type CategorySeed = {
  slug: string;
  name: string;
  strapline: string;
  description: string;
  eligibility: string;
  judgingCriteria: string;
};

const CATEGORY_SEEDS: CategorySeed[] = [
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
      'For creators who began publishing within two years of the qualifying season and have already established a recognisable standard.',
    eligibility:
      'First public work must have been published no earlier than 1 January two years before the qualifying year. A creator may win this PALMA once.',
    judgingCriteria:
      'Judges look for a defined point of view arriving early, and for professionalism that exceeds the creator’s time in the industry.',
  },
  {
    slug: 'creative-direction',
    name: 'Creative Direction',
    strapline: 'The eye behind the work.',
    description:
      'For sustained excellence in the visual and editorial direction of a body of work — the identity, the craft decisions, and the discipline to hold both.',
    eligibility:
      'Open to creators and to creative directors whose direction of another creator’s work is publicly credited.',
    judgingCriteria:
      'Brand coherence and originality dominate. Judges assess a full body of work, never a single piece.',
  },
  {
    slug: 'community-impact',
    name: 'Community Impact',
    strapline: 'Work that left people better off.',
    description:
      'For creators whose work has produced a demonstrable benefit to a community — professional, local or otherwise — beyond their own audience.',
    eligibility:
      'Nominations must include evidence of outcome, not intent. Fundraising totals alone are not sufficient.',
    judgingCriteria:
      'Impact is the dominant criterion, evidenced and specific. Judges discount reach entirely.',
  },
  {
    slug: 'business-of-creating',
    name: 'Business of Creating',
    strapline: 'Building something that lasts.',
    description:
      'For creators who have built a durable business around their work, and who have been candid enough about how to make the industry more navigable for others.',
    eligibility:
      'Open to creators operating as sole traders, partnerships or limited companies. Financial evidence is reviewed by judges in confidence and never published.',
    judgingCriteria:
      'Professionalism and impact lead. Judges consider transparency and treatment of collaborators.',
  },
  {
    slug: 'craft-in-video',
    name: 'Craft in Video',
    strapline: 'Shot, cut, and finished with intent.',
    description:
      'For excellence in the making of video work — direction, cinematography, edit, sound and the discipline of finishing.',
    eligibility:
      'At least three published video works during the qualifying year. Collaborative work is eligible where the nominee’s role is publicly credited.',
    judgingCriteria:
      'Originality and consistency lead, assessed on the work as delivered rather than on production budget.',
  },
  {
    slug: 'industry-contribution',
    name: 'Contribution to the Industry',
    strapline: 'For the people who made the road.',
    description:
      'For sustained service to the creator industry: the standards, tooling, teaching, advocacy and plain generosity that make the work of others possible.',
    eligibility:
      'No minimum publishing requirement. Open to creators, organisers, educators and advocates aged 18 or over.',
    judgingCriteria:
      'Impact over time is the only dominant criterion. Judges consider a body of service, not a single season.',
  },
];

type SeasonSeed = {
  year: number;
  title: string;
  stage: SeasonView['stage'];
  tagline: string;
  summary: string;
  isCurrent: boolean;
  nominationsOpenAt: string | null;
  nominationsCloseAt: string | null;
  shortlistAt: string | null;
  finalistsAt: string | null;
  ceremonyAt: string | null;
  /** category slug → [winner, ...finalists] creator slugs */
  results: Record<string, string[]>;
};

const SEASON_SEEDS: SeasonSeed[] = [
  {
    year: 2025,
    title: 'PALMA 2025',
    stage: 'archived',
    tagline: 'The first record.',
    summary:
      'The inaugural PALMA season. Eight categories, a panel of nineteen judges, and the first names entered into the Roll of Honour.',
    isCurrent: false,
    nominationsOpenAt: '2025-01-14T09:00:00.000Z',
    nominationsCloseAt: '2025-03-31T23:00:00.000Z',
    shortlistAt: '2025-05-06T09:00:00.000Z',
    finalistsAt: '2025-06-17T09:00:00.000Z',
    ceremonyAt: '2025-09-25T18:00:00.000Z',
    results: {
      'creator-of-the-year': ['maya-rivers', 'theo-lindqvist', 'imani-okafor', 'kai-tanaka'],
      'best-independent-creator': ['alex-taylor', 'noor-haddad', 'dara-ellison', 'callum-beattie'],
      'best-new-creator': ['rosa-delgado', 'priya-raman', 'wren-ashby', 'jordan-smith'],
      'creative-direction': ['elliot-quaye', 'sofia-marchetti', 'theo-lindqvist', 'rosa-delgado'],
      'community-impact': ['wren-ashby', 'noor-haddad', 'priya-raman', 'imani-okafor'],
      'business-of-creating': ['dara-ellison', 'imani-okafor', 'elliot-quaye', 'maya-rivers'],
      'craft-in-video': ['kai-tanaka', 'maya-rivers', 'sofia-marchetti', 'callum-beattie'],
      'industry-contribution': ['imani-okafor', 'wren-ashby', 'dara-ellison', 'alex-taylor'],
    },
  },
  {
    year: 2026,
    title: 'PALMA 2026',
    stage: 'archived',
    tagline: 'The record holds.',
    summary:
      'A second season, a panel of twenty-eight judges, and the first repeat honours in the Roll of Honour.',
    isCurrent: false,
    nominationsOpenAt: '2026-01-13T09:00:00.000Z',
    nominationsCloseAt: '2026-03-30T23:00:00.000Z',
    shortlistAt: '2026-05-05T09:00:00.000Z',
    finalistsAt: '2026-06-16T09:00:00.000Z',
    ceremonyAt: '2026-09-24T18:00:00.000Z',
    results: {
      'creator-of-the-year': ['jordan-smith', 'maya-rivers', 'sofia-marchetti', 'noor-haddad'],
      'best-independent-creator': ['maya-rivers', 'alex-taylor', 'theo-lindqvist', 'rosa-delgado'],
      'best-new-creator': ['callum-beattie', 'kai-tanaka', 'priya-raman', 'dara-ellison'],
      'creative-direction': ['sofia-marchetti', 'elliot-quaye', 'theo-lindqvist', 'kai-tanaka'],
      'community-impact': ['priya-raman', 'wren-ashby', 'noor-haddad', 'jordan-smith'],
      'business-of-creating': ['imani-okafor', 'dara-ellison', 'wren-ashby', 'elliot-quaye'],
      'craft-in-video': ['sofia-marchetti', 'kai-tanaka', 'maya-rivers', 'rosa-delgado'],
      'industry-contribution': ['dara-ellison', 'imani-okafor', 'alex-taylor', 'priya-raman'],
    },
  },
  {
    year: 2027,
    title: 'PALMA 2027',
    stage: 'nominations_open',
    tagline: 'Recognising the people shaping creator culture.',
    summary:
      'The third PALMA season. Nominations are open across eight categories, judged by an independent panel and announced in four stages.',
    isCurrent: true,
    nominationsOpenAt: '2026-09-01T09:00:00.000Z',
    nominationsCloseAt: '2027-01-31T23:00:00.000Z',
    shortlistAt: '2027-03-10T09:00:00.000Z',
    finalistsAt: '2027-05-12T09:00:00.000Z',
    ceremonyAt: '2027-09-23T18:00:00.000Z',
    results: {},
  },
];

const CITATIONS: Record<string, string> = {
  'creator-of-the-year': 'For a body of work that set the standard of the season.',
  'best-independent-creator': 'For sustained, independent work held to an uncommon standard.',
  'best-new-creator': 'For arriving with a point of view already fully formed.',
  'creative-direction': 'For direction of rare coherence across a full body of work.',
  'community-impact': 'For work whose consequence was felt well beyond its audience.',
  'business-of-creating': 'For building something durable, and saying plainly how.',
  'craft-in-video': 'For craft sustained across every frame of the qualifying year.',
  'industry-contribution': 'For service to the industry, given freely and over years.',
};

// ── Derivation ───────────────────────────────────────────────────────────────

export const seasons: SeasonView[] = SEASON_SEEDS.map((seed) => ({
  id: `season-${seed.year}`,
  year: seed.year,
  title: seed.title,
  stage: seed.stage,
  tagline: seed.tagline,
  summary: seed.summary,
  nominationsOpenAt: seed.nominationsOpenAt,
  nominationsCloseAt: seed.nominationsCloseAt,
  shortlistAt: seed.shortlistAt,
  finalistsAt: seed.finalistsAt,
  ceremonyAt: seed.ceremonyAt,
  isCurrent: seed.isCurrent,
  categoryCount: CATEGORY_SEEDS.length,
}));

const PARTNERS: Record<string, { name: string; slug: string }> = {
  'best-new-creator': { name: 'Holloway & Finch', slug: 'holloway-finch' },
  'business-of-creating': { name: 'Meridian Union', slug: 'meridian-union' },
};

export const categories: CategoryView[] = SEASON_SEEDS.flatMap((season) =>
  CATEGORY_SEEDS.map((category, index) => ({
    id: `category-${season.year}-${category.slug}`,
    slug: category.slug,
    name: category.name,
    strapline: category.strapline,
    description: category.description,
    eligibility: category.eligibility,
    judgingCriteria: category.judgingCriteria,
    isOpen: season.stage === 'nominations_open',
    position: index,
    year: season.year,
    stage: season.stage,
    partner: PARTNERS[category.slug] ?? null,
  })),
);

type InternalHonour = HonourEntry & { creatorSlug: string };

const honourRecords: InternalHonour[] = [];

for (const season of SEASON_SEEDS) {
  for (const [categorySlug, creatorSlugs] of Object.entries(season.results)) {
    const category = CATEGORY_SEEDS.find((entry) => entry.slug === categorySlug);
    if (!category) continue;

    creatorSlugs.forEach((creatorSlug, index) => {
      const kind = index === 0 ? 'winner' : 'finalist';
      const id = `honour-${season.year}-${categorySlug}-${creatorSlug}-${kind}`;
      honourRecords.push({
        id,
        creatorSlug,
        kind,
        state: 'active',
        year: season.year,
        categoryName: category.name,
        categorySlug,
        citation: kind === 'winner' ? (CITATIONS[categorySlug] ?? null) : null,
        announcedAt:
          kind === 'winner' ? (season.ceremonyAt ?? null) : (season.finalistsAt ?? null),
        code: deriveCode(signingSecret(), season.year, id),
        position: index === 0 ? 1 : index,
      });
    });
  }
}

function honoursFor(slug: string): HonourEntry[] {
  return honourRecords
    .filter((honour) => honour.creatorSlug === slug)
    .sort((a, b) => (b.year !== a.year ? b.year - a.year : a.categoryName.localeCompare(b.categoryName)))
    .map(({ creatorSlug: _creatorSlug, ...entry }) => entry);
}

export const creators: CreatorProfile[] = CREATOR_SEEDS.map((seed) => {
  const record = honoursFor(seed.slug);
  return {
    id: `creator-${seed.slug}`,
    slug: seed.slug,
    displayName: seed.displayName,
    countryCode: seed.countryCode,
    city: seed.city,
    pronouns: seed.pronouns,
    headline: seed.headline,
    biography: seed.biography,
    portraitUrl: null,
    portraitAlt: null,
    websiteUrl: seed.websiteUrl,
    links: seed.websiteUrl ? [{ label: 'Website', url: seed.websiteUrl }] : [],
    verificationStatus: seed.verified ? 'verified' : 'pending',
    isClaimed: true,
    record,
    honourCount: record.filter((entry) => entry.state === 'active').length,
    winCount: record.filter((entry) => entry.kind === 'winner' && entry.state === 'active').length,
  };
});

export const achievements: AchievementRecord[] = honourRecords.map((honour) => {
  const creator = creators.find((entry) => entry.slug === honour.creatorSlug)!;
  const issuedAt = honour.announcedAt ?? `${honour.year}-09-25T18:00:00.000Z`;
  const payload = {
    code: honour.code!,
    creatorSlug: creator.slug,
    creatorName: creator.displayName,
    categoryName: honour.categoryName,
    year: honour.year,
    kind: honour.kind,
    issuedAt,
  };
  return {
    ...payload,
    categorySlug: honour.categorySlug,
    creatorCountry: creator.countryCode,
    state: honour.state,
    citation: honour.citation,
    revokedAt: null,
    signature: signAchievement(signingSecret(), payload),
  };
});

export const sponsors: SponsorView[] = [
  {
    slug: 'holloway-finch',
    name: 'Holloway & Finch',
    summary: 'A London production house supporting the Best New Creator PALMA.',
    websiteUrl: null,
    tier: 'category_partner',
    categoryName: 'Best New Creator',
  },
  {
    slug: 'meridian-union',
    name: 'Meridian Union',
    summary: 'Business banking for independent creators. Category partner, Business of Creating.',
    websiteUrl: null,
    tier: 'category_partner',
    categoryName: 'Business of Creating',
  },
  {
    slug: 'the-standing-press',
    name: 'The Standing Press',
    summary: 'Media partner to the PALMA Journal.',
    websiteUrl: null,
    tier: 'media',
    categoryName: null,
  },
];

export const articles: ArticleDetail[] = [
  {
    slug: 'what-a-palma-is-for',
    title: 'What a PALMA is for',
    standfirst:
      'Recognition is not marketing. An honour is only worth holding if the record behind it can be checked.',
    category: 'PALMA Essays',
    categorySlug: 'essays',
    authorName: 'The PALMA Editorial Board',
    publishedAt: '2026-09-02T08:00:00.000Z',
    readingMinutes: 6,
    heroImageUrl: null,
    heroImageAlt: null,
    body: [
      'An award is a claim about the past made durable enough to be useful in the future. That is the whole of it. Everything else — the ceremony, the seal, the photograph at the end of the night — is presentation. The substance is the record, and whether anyone can check it.',
      'PALMA was built backwards from that sentence. Before the first category was written, we built the Roll of Honour and the verification page, because those are the parts that have to survive the institution\'s own enthusiasm. A winner should be able to put a PALMA on a profile in ten years and have it still resolve to a page that says who judged it, in what category, and in which season.',
      'That is also why judging is separated from everything commercial by more than a policy. Sponsors are recorded against a season and a category. They do not see nominations, they do not meet judges through us, and they cannot change an outcome. The permission model in the software enforces this, not the goodwill of whoever is running the season.',
      'The industry PALMA recognises has been poorly served by recognition. Its awards have tended to measure audience, which is a measure of distribution, not of work. We are not interested in who was seen most. We are interested in who did the work, and whether the record of it can be trusted a decade from now.',
    ].join('\n\n'),
  },
  {
    slug: 'how-judging-works',
    title: 'How PALMA judging actually works',
    standfirst:
      'Five criteria, a trimmed mean, and a conflict rule that removes a judge the moment they declare.',
    category: 'Category Explainers',
    categorySlug: 'explainers',
    authorName: 'The PALMA Editorial Board',
    publishedAt: '2026-09-08T08:00:00.000Z',
    readingMinutes: 5,
    heroImageUrl: null,
    heroImageAlt: null,
    body: [
      'Every eligible nomination is scored by at least three judges against five criteria: originality, consistency, professionalism, impact and brand. Each is scored out of ten. Nothing is weighted by audience size, and judges are told so explicitly in their briefing.',
      'Once four or more judges have scored a nomination, the highest and lowest scores are removed before ranking. Panels disagree, and a single outlier — enthusiastic or hostile — should not decide a PALMA. Where judges disagree sharply, the chair is shown the spread before any finalist list is confirmed.',
      'Conflicts are declared, not adjudicated after the fact. The moment a judge declares a relationship with a creator or a nomination, they are removed from it. Only an explicit dismissal by an administrator restores them, and both the declaration and the dismissal are written to the audit log.',
      'Scores are immutable once submitted. If a genuine error is found, an administrator performs a controlled correction which records the original score, the corrected score, the person who made the change and their reason. Nothing in PALMA can be quietly edited.',
    ].join('\n\n'),
  },
  {
    slug: 'the-record-not-the-event',
    title: 'PALMA is the record, not the event',
    standfirst: 'Why the archive was built before the ceremony.',
    category: 'PALMA Essays',
    categorySlug: 'essays',
    authorName: 'The PALMA Editorial Board',
    publishedAt: '2026-06-19T08:00:00.000Z',
    readingMinutes: 4,
    heroImageUrl: null,
    heroImageAlt: null,
    body: [
      'Most awards are an evening. The institution behind them exists to produce that evening, and the record of who won is a by-product, kept about as carefully as a guest list.',
      'We inverted it. The PALMA Roll of Honour is the product. A season is one year\'s worth of additions to it. The ceremony is the moment those additions are read aloud.',
      'This has a practical consequence: the archive has to be good on the day it is empty. Its filters, its permanence, its citation format and its verification had to be designed as though they already held twenty years of honours, because the only way to eventually hold twenty years is to behave that way from the first.',
    ].join('\n\n'),
  },
  {
    slug: 'interview-maya-rivers',
    title: 'Maya Rivers on making six years of work look effortless',
    standfirst:
      'The 2025 Creator of the Year on research, schedules, and refusing to grow faster than she can film.',
    category: 'Interviews',
    categorySlug: 'interviews',
    authorName: 'The PALMA Journal',
    publishedAt: '2026-02-11T08:00:00.000Z',
    readingMinutes: 8,
    heroImageUrl: null,
    heroImageAlt: null,
    body: [
      '“People assume the research is the hard part,” Maya Rivers says. “The research is the pleasure. The hard part is publishing on the day you said you would, for six years, when nobody is checking.”',
      'Rivers won the first Creator of the Year PALMA in 2025 and took Best Independent Creator the following season — the first creator to hold PALMAs from consecutive years. She works with one editor, no agency, and a publishing schedule she describes as “deliberately slightly too slow”.',
      'On independence: “I have turned down the kind of deal that would have doubled the budget, because it came with a note about tone. Independence is not a brand. It is a set of specific things you say no to, usually in writing, usually on a Tuesday.”',
      'On recognition: “An award does not change the work. What it changes is the conversation before the work — whether you have to explain yourself first. That is not nothing.”',
    ].join('\n\n'),
  },
  {
    slug: 'palma-2027-nominations-open',
    title: 'Nominations open for PALMA 2027',
    standfirst: 'Eight categories. Four stages. Nominations close on 31 January 2027.',
    category: 'Announcements',
    categorySlug: 'announcements',
    authorName: 'PALMA',
    publishedAt: '2026-09-01T09:00:00.000Z',
    readingMinutes: 3,
    heroImageUrl: null,
    heroImageAlt: null,
    body: [
      'Nominations for the third PALMA season are open. Eight categories are contested, including Creator of the Year, Best Independent Creator and Contribution to the Industry.',
      'Creators may nominate themselves or be nominated by anyone who can evidence the work. Nominations close on 31 January 2027; the shortlist is published on 10 March, the finalists on 12 May, and the winners at the ceremony on 23 September.',
      'A nomination costs nothing and cannot be bought. Volume of nominations does not advance a creator: the shortlist is produced by judges, from evidence.',
    ].join('\n\n'),
  },
  {
    slug: 'evidence-not-exposure',
    title: 'Evidence, not exposure',
    standfirst:
      'Why PALMA points at a creator’s work instead of publishing it, and what that means for nominators.',
    category: 'Category Explainers',
    categorySlug: 'explainers',
    authorName: 'The PALMA Editorial Board',
    publishedAt: '2026-04-22T08:00:00.000Z',
    readingMinutes: 5,
    heroImageUrl: null,
    heroImageAlt: null,
    body: [
      'PALMA does not host a creator\'s work. A nomination carries references — links, credits, published outcomes — which authorised judges review on the platform where the work already lives.',
      'This is partly a legal position and mostly an editorial one. An institution that recognises work does not need to republish it, and the moment it starts to, it takes on the obligations of a platform and loses the detachment that makes its judgement worth anything.',
      'For nominators, the practical rule is short: point, do not publish. The strongest nominations we see are three or four precise references and a statement that explains why those particular pieces matter.',
    ].join('\n\n'),
  },
];

export const articleCategories = [
  { slug: 'essays', name: 'PALMA Essays' },
  { slug: 'interviews', name: 'Interviews' },
  { slug: 'explainers', name: 'Category Explainers' },
  { slug: 'announcements', name: 'Announcements' },
];

export const honours = honourRecords;
export const categorySeeds = CATEGORY_SEEDS;
export const seasonSeeds = SEASON_SEEDS;
export const creatorSeeds = CREATOR_SEEDS;
