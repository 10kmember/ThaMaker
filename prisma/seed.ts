/**
 * PALMA seed.
 *
 * Loads the bundled reference dataset into PostgreSQL: three seasons, the full
 * category set, creators, the Roll of Honour with signed verification records,
 * the Journal, sponsors, and one account per role for local development.
 *
 *   npm run db:push && npm run db:seed
 */
import { PrismaClient, type Prisma } from '@prisma/client';
import { randomBytes, createHmac, scrypt as scryptCallback } from 'node:crypto';
import { promisify } from 'node:util';
import {
  articleCategories,
  articles,
  categorySeeds,
  creatorSeeds,
  seasonSeeds,
  sponsors as sponsorSeeds,
} from '../src/server/data/reference';

const prisma = new PrismaClient();
const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: string,
  keylen: number,
) => Promise<Buffer>;

const SECRET =
  process.env.AUTH_SECRET ?? 'palma-development-signing-secret-do-not-use-in-production';

const DEMO_PASSWORD = process.env.SEED_PASSWORD ?? 'Palma-Development-2027';

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derived = await scrypt(password.normalize('NFKC'), salt, 64);
  return `scrypt$${salt}$${derived.toString('hex')}`;
}

function hmac(value: string): string {
  return createHmac('sha256', SECRET).update(value).digest('base64url');
}

function deriveCode(year: number, honourId: string): string {
  const bytes = Buffer.from(hmac(`palma:code:v1:${year}:${honourId}`), 'base64url');
  let out = '';
  for (let i = 0; i < 6; i += 1) out += ALPHABET[(bytes[i] ?? 0) % ALPHABET.length];
  return `PM-${year}-${out}`;
}

function signAchievement(payload: {
  code: string;
  creatorSlug: string;
  creatorName: string;
  categoryName: string;
  year: number;
  kind: string;
  issuedAt: string;
}) {
  const canonical = [
    'palma:achievement:v1',
    payload.code,
    payload.creatorSlug,
    payload.creatorName,
    payload.categoryName,
    String(payload.year),
    payload.kind,
    payload.issuedAt,
  ].join('|');
  return { signature: hmac(canonical), canonical };
}

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

async function main() {
  console.log('· Seeding PALMA');

  // ── Accounts ──────────────────────────────────────────────────────────────
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@palmaawards.com' },
    update: {},
    create: {
      email: 'admin@palmaawards.com',
      name: 'PALMA Administrator',
      role: 'super_admin',
      passwordHash,
      emailVerifiedAt: new Date(),
      notificationPrefs: { create: {} },
    },
  });

  const editor = await prisma.user.upsert({
    where: { email: 'editor@palmaawards.com' },
    update: {},
    create: {
      email: 'editor@palmaawards.com',
      name: 'PALMA Editorial',
      role: 'editor',
      passwordHash,
      emailVerifiedAt: new Date(),
      notificationPrefs: { create: {} },
    },
  });

  // ── Seasons and categories ────────────────────────────────────────────────
  const seasonIds = new Map<number, string>();
  const categoryIds = new Map<string, string>();

  for (const season of seasonSeeds) {
    const record = await prisma.awardYear.upsert({
      where: { year: season.year },
      update: { stage: season.stage, isCurrent: season.isCurrent },
      create: {
        year: season.year,
        title: season.title,
        stage: season.stage,
        tagline: season.tagline,
        summary: season.summary,
        isCurrent: season.isCurrent,
        nominationsOpenAt: season.nominationsOpenAt ? new Date(season.nominationsOpenAt) : null,
        nominationsCloseAt: season.nominationsCloseAt ? new Date(season.nominationsCloseAt) : null,
        shortlistAt: season.shortlistAt ? new Date(season.shortlistAt) : null,
        finalistsAt: season.finalistsAt ? new Date(season.finalistsAt) : null,
        ceremonyAt: season.ceremonyAt ? new Date(season.ceremonyAt) : null,
      },
    });
    seasonIds.set(season.year, record.id);

    for (const [position, category] of categorySeeds.entries()) {
      const created = await prisma.category.upsert({
        where: { awardYearId_slug: { awardYearId: record.id, slug: category.slug } },
        update: { isOpen: season.stage === 'nominations_open' },
        create: {
          awardYearId: record.id,
          slug: category.slug,
          name: category.name,
          strapline: category.strapline,
          description: category.description,
          eligibility: category.eligibility,
          judgingCriteria: category.judgingCriteria,
          position,
          isOpen: season.stage === 'nominations_open',
        },
      });
      categoryIds.set(`${season.year}:${category.slug}`, created.id);
    }
  }
  console.log(`  seasons: ${seasonSeeds.length}, categories: ${categoryIds.size}`);

  // ── Creators ──────────────────────────────────────────────────────────────
  const creatorIds = new Map<string, string>();

  for (const seed of creatorSeeds) {
    const creator = await prisma.creator.upsert({
      where: { slug: seed.slug },
      update: {},
      create: {
        slug: seed.slug,
        displayName: seed.displayName,
        pronouns: seed.pronouns,
        countryCode: seed.countryCode,
        city: seed.city,
        headline: seed.headline,
        biography: seed.biography,
        websiteUrl: seed.websiteUrl,
        isPublished: true,
        isClaimed: true,
        verification: {
          create: {
            status: seed.verified ? 'verified' : 'pending',
            provider: 'stub',
            providerReference: seed.verified ? `stub_${seed.slug}` : null,
            method: 'document_and_liveness',
            verifiedAt: seed.verified ? new Date('2025-01-10T00:00:00.000Z') : null,
          },
        },
        ...(seed.websiteUrl
          ? { links: { create: [{ label: 'Website', url: seed.websiteUrl, position: 0 }] } }
          : {}),
      },
    });
    creatorIds.set(seed.slug, creator.id);
  }
  console.log(`  creators: ${creatorIds.size}`);

  // ── Judges ────────────────────────────────────────────────────────────────
  const judgeSeeds = [
    { email: 'chair@palmaawards.com', name: 'Panel Chair', title: 'Chair of the PALMA panel' },
    { email: 'judge.one@palmaawards.com', name: 'Frances Okonjo', title: 'Commissioning editor' },
    { email: 'judge.two@palmaawards.com', name: 'Daniel Whitlock', title: 'Studio founder' },
    { email: 'judge.three@palmaawards.com', name: 'Ines Barros', title: 'Creative director' },
  ];

  const judgeIds: string[] = [];
  for (const [index, seed] of judgeSeeds.entries()) {
    const user = await prisma.user.upsert({
      where: { email: seed.email },
      update: {},
      create: {
        email: seed.email,
        name: seed.name,
        role: 'judge',
        passwordHash,
        emailVerifiedAt: new Date(),
        notificationPrefs: { create: {} },
      },
    });

    const judge = await prisma.judge.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        displayName: seed.name,
        title: seed.title,
        countryCode: 'GB',
        biography: 'Seated on the PALMA panel for the current season.',
      },
    });
    judgeIds.push(judge.id);

    for (const [year, awardYearId] of seasonIds) {
      await prisma.judgePanelMembership.upsert({
        where: { judgeId_awardYearId: { judgeId: judge.id, awardYearId } },
        update: {},
        create: { judgeId: judge.id, awardYearId, isChair: index === 0 },
      });
      void year;
    }
  }
  console.log(`  judges: ${judgeIds.length}`);

  // ── Historic seasons: nominations, scores and honours ─────────────────────
  let nominationCount = 0;
  let honourCount = 0;

  for (const season of seasonSeeds) {
    const awardYearId = seasonIds.get(season.year)!;

    for (const [categorySlug, creatorSlugs] of Object.entries(season.results)) {
      const categoryId = categoryIds.get(`${season.year}:${categorySlug}`)!;
      const category = categorySeeds.find((entry) => entry.slug === categorySlug)!;

      for (const [index, creatorSlug] of creatorSlugs.entries()) {
        const creatorId = creatorIds.get(creatorSlug)!;
        const creator = creatorSeeds.find((entry) => entry.slug === creatorSlug)!;
        const kind = index === 0 ? 'winner' : 'finalist';
        const issuedAt = new Date(kind === 'winner' ? season.ceremonyAt! : season.finalistsAt!);

        const reference = `PN-${season.year}-${String(++nominationCount).padStart(6, '0')}`;

        const nomination = await prisma.nomination.upsert({
          where: {
            awardYearId_categoryId_creatorId: { awardYearId, categoryId, creatorId },
          },
          update: {},
          create: {
            reference,
            awardYearId,
            categoryId,
            creatorId,
            source: 'public_nominator',
            status: kind,
            statement: `${creator.displayName} was nominated for ${category.name} in the ${season.year} season on the strength of a full year of published work, reviewed by the panel against the category's criteria.`,
            nominatorEmail: 'nominations@palmaawards.com',
            eligibilityConfirmed: true,
            contentPolicyConfirmed: true,
            ageConfirmed: true,
            submittedAt: new Date(season.nominationsOpenAt!),
            reviewedAt: new Date(season.shortlistAt!),
            evidence: {
              create: [
                {
                  kind: 'external_link',
                  label: `${season.year} body of work`,
                  url: `https://example.com/${creatorSlug}/${season.year}`,
                  note: 'Reviewed by the panel on the platform where it is published.',
                },
              ],
            },
          },
        });

        // Panel scores, deterministic so the standings are reproducible.
        const basis = kind === 'winner' ? 9 : 8 - index;
        for (const [position, judgeId] of judgeIds.slice(0, 3).entries()) {
          const assignment = await prisma.judgingAssignment.upsert({
            where: { judgeId_nominationId: { judgeId, nominationId: nomination.id } },
            update: {},
            create: {
              judgeId,
              nominationId: nomination.id,
              categoryId,
              status: 'completed',
              completedAt: issuedAt,
            },
          });

          const spread = position - 1;
          const card = {
            originality: clamp(basis + spread),
            consistency: clamp(basis),
            professionalism: clamp(basis + 1),
            impact: clamp(basis - spread),
            brand: clamp(basis),
          };

          await prisma.judgingScore.upsert({
            where: { assignmentId: assignment.id },
            update: {},
            create: {
              assignmentId: assignment.id,
              judgeId,
              nominationId: nomination.id,
              ...card,
              total: Object.values(card).reduce((sum, value) => sum + value, 0),
              submittedAt: issuedAt,
            },
          });
        }

        const honour = await prisma.honour.upsert({
          where: {
            awardYearId_categoryId_creatorId_kind: { awardYearId, categoryId, creatorId, kind },
          },
          update: {},
          create: {
            awardYearId,
            categoryId,
            creatorId,
            nominationId: nomination.id,
            kind,
            position: index === 0 ? 1 : index,
            citation: kind === 'winner' ? (CITATIONS[categorySlug] ?? null) : null,
            announcedAt: issuedAt,
          },
        });
        honourCount += 1;

        const code = deriveCode(season.year, honour.id);
        const { signature, canonical } = signAchievement({
          code,
          creatorSlug,
          creatorName: creator.displayName,
          categoryName: category.name,
          year: season.year,
          kind,
          issuedAt: issuedAt.toISOString(),
        });

        const achievement = await prisma.achievement.upsert({
          where: { honourId: honour.id },
          update: {},
          create: {
            honourId: honour.id,
            creatorId,
            code,
            kind,
            year: season.year,
            categoryName: category.name,
            creatorName: creator.displayName,
            issuedAt,
          },
        });

        await prisma.verificationRecord.upsert({
          where: { code },
          update: {},
          create: {
            achievementId: achievement.id,
            code,
            signature,
            payloadDigest: createHmac('sha256', 'digest').update(canonical).digest('hex'),
            issuedAt,
          },
        });
      }
    }
  }
  console.log(`  nominations: ${nominationCount}, honours: ${honourCount}`);

  // ── Journal ───────────────────────────────────────────────────────────────
  for (const [position, category] of articleCategories.entries()) {
    await prisma.articleCategory.upsert({
      where: { slug: category.slug },
      update: {},
      create: { slug: category.slug, name: category.name, position },
    });
  }

  for (const article of articles) {
    const category = article.categorySlug
      ? await prisma.articleCategory.findUnique({ where: { slug: article.categorySlug } })
      : null;

    await prisma.article.upsert({
      where: { slug: article.slug },
      update: {},
      create: {
        slug: article.slug,
        title: article.title,
        standfirst: article.standfirst,
        body: article.body,
        status: 'published',
        categoryId: category?.id ?? null,
        authorId: editor.id,
        authorName: article.authorName,
        readingMinutes: article.readingMinutes,
        publishedAt: article.publishedAt ? new Date(article.publishedAt) : new Date(),
      },
    });
  }
  console.log(`  articles: ${articles.length}`);

  // ── Sponsors ──────────────────────────────────────────────────────────────
  const currentSeason = seasonSeeds.find((season) => season.isCurrent)!;
  const currentSeasonId = seasonIds.get(currentSeason.year)!;

  for (const sponsor of sponsorSeeds) {
    const record = await prisma.sponsor.upsert({
      where: { slug: sponsor.slug },
      update: {},
      create: {
        slug: sponsor.slug,
        name: sponsor.name,
        summary: sponsor.summary,
        websiteUrl: sponsor.websiteUrl,
      },
    });

    const categorySlug =
      sponsor.slug === 'holloway-finch'
        ? 'best-new-creator'
        : sponsor.slug === 'meridian-union'
          ? 'business-of-creating'
          : null;

    const categoryId = categorySlug
      ? (categoryIds.get(`${currentSeason.year}:${categorySlug}`) ?? null)
      : null;

    // A compound unique cannot be matched on a null member, so a sponsorship
    // with no category is looked up rather than upserted.
    const existing = await prisma.sponsorship.findFirst({
      where: { sponsorId: record.id, awardYearId: currentSeasonId, categoryId },
    });

    if (!existing) {
      await prisma.sponsorship.create({
        data: {
          sponsorId: record.id,
          awardYearId: currentSeasonId,
          categoryId,
          tier: sponsor.tier as Prisma.SponsorshipCreateInput['tier'],
        },
      });
    }
  }
  console.log(`  sponsors: ${sponsorSeeds.length}`);

  await prisma.auditLog.create({
    data: {
      action: 'season.stage_changed',
      entityType: 'AwardYear',
      entityId: currentSeasonId,
      actorId: admin.id,
      actorRole: 'super_admin',
      actorLabel: admin.email,
      summary: `${currentSeason.title} seeded and opened for nominations`,
    },
  });

  console.log('\n  Accounts (password from SEED_PASSWORD, default shown):');
  console.log(`    admin@palmaawards.com   super_admin   ${DEMO_PASSWORD}`);
  console.log(`    editor@palmaawards.com  editor        ${DEMO_PASSWORD}`);
  console.log(`    chair@palmaawards.com   judge         ${DEMO_PASSWORD}`);
  console.log('\n· Done');
}

function clamp(value: number): number {
  return Math.max(0, Math.min(10, Math.round(value)));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
