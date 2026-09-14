/**
 * PALMA seed.
 *
 * Loads the bundled cast into PostgreSQL: nine people, four categories, three
 * seasons, the Roll of Honour with signed verification records, the Journal and
 * two sponsors.
 *
 *   npm run db:push && npm run db:seed
 *
 * The seed is authoritative rather than additive. It clears the entities it
 * owns before writing them, so running it twice leaves exactly the dataset
 * described in `seed-data.ts` — a seed that only ever adds drifts away from its
 * own description on the second run, which is how a demonstration database ends
 * up with fourteen creators nobody chose.
 */
import { totalScore } from '../src/domain/judging';
import { PrismaClient } from '@prisma/client';
import { randomBytes, createHmac, scrypt as scryptCallback } from 'node:crypto';
import { promisify } from 'node:util';
import {
  articleCategories,
  articles,
  categorySeeds,
  citations,
  people,
  seasonSeeds,
  sponsors as sponsorSeeds,
  type Person,
} from './seed-data';

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

function clamp(value: number): number {
  return Math.max(0, Math.min(10, Math.round(value)));
}

/** Rough, and honest about it: 220 words a minute, never less than one. */
function readingMinutes(body: string): number {
  return Math.max(1, Math.round(body.trim().split(/\s+/).length / 220));
}

/**
 * Clear what the seed owns, in dependency order.
 *
 * Deliberately not a `TRUNCATE ... CASCADE` of the whole database: rows a
 * person created while testing — a claim, an internal note, an enforcement
 * proposal — are theirs, and a seed that silently destroyed them would make
 * the local database untrustworthy in exactly the way PALMA is built not to be.
 */
async function reset() {
  await prisma.verificationRecord.deleteMany();
  await prisma.achievement.deleteMany();
  await prisma.honour.deleteMany();
  await prisma.judgingScore.deleteMany();
  await prisma.judgingAssignment.deleteMany();
  await prisma.judgeConflict.deleteMany();
  await prisma.nomination.deleteMany();
  await prisma.nominator.deleteMany();
  await prisma.candidacyEvidence.deleteMany();
  await prisma.candidacy.deleteMany();
  await prisma.judgePanelMembership.deleteMany();
  await prisma.sponsorship.deleteMany();
  await prisma.sponsor.deleteMany();
  await prisma.article.deleteMany();
  await prisma.articleCategory.deleteMany();
  await prisma.category.deleteMany();
  await prisma.awardYear.deleteMany();

  // Creators the cast no longer names, and everything hanging off them.
  const keep = people.flatMap((person) => (person.creator ? [person.creator.slug] : []));
  await prisma.creatorLink.deleteMany({ where: { creator: { slug: { notIn: keep } } } });
  await prisma.creatorVerification.deleteMany({ where: { creator: { slug: { notIn: keep } } } });
  await prisma.creator.deleteMany({ where: { slug: { notIn: keep } } });

  // Judge profiles are rebuilt from the cast each run.
  await prisma.judge.deleteMany();

  // Staff and panel accounts are seed-owned: they live on palmaawards.com, and
  // the cast is the whole list of them. An account on any other domain belongs
  // to whoever made it and is left alone.
  const castEmails = people.flatMap((person) => (person.email ? [person.email] : []));
  await prisma.user.deleteMany({
    where: { email: { endsWith: '@palmaawards.com' }, AND: { email: { notIn: castEmails } } },
  });
}

async function main() {
  console.log('· Seeding PALMA');
  await reset();

  const passwordHash = await hashPassword(DEMO_PASSWORD);

  // ── Seasons ───────────────────────────────────────────────────────────────
  const seasonIds = new Map<number, string>();
  for (const season of seasonSeeds) {
    const record = await prisma.awardYear.create({
      data: {
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
  }
  console.log(`  seasons: ${seasonIds.size}`);

  // ── Categories, one set per season ────────────────────────────────────────
  const categoryIds = new Map<string, string>();
  for (const season of seasonSeeds) {
    const awardYearId = seasonIds.get(season.year)!;
    for (const [position, category] of categorySeeds.entries()) {
      const record = await prisma.category.create({
        data: {
          slug: category.slug,
          name: category.name,
          strapline: category.strapline,
          description: category.description,
          eligibility: category.eligibility,
          judgingCriteria: category.judgingCriteria,
          position,
          awardYearId,
          isOpen: season.stage === 'nominations_open',
        },
      });
      categoryIds.set(`${season.year}:${category.slug}`, record.id);
    }
  }
  console.log(`  categories: ${categorySeeds.length} × ${seasonIds.size} seasons`);

  // ── The cast ──────────────────────────────────────────────────────────────
  //
  // One pass over one list. An operator, a judge and a creator are made the
  // same way here because they are the same kind of thing to the database: a
  // person, and the facets PALMA knows them by.
  const accounts = new Map<string, string>();
  const creatorIds = new Map<string, string>();
  const judgeIds: string[] = [];
  let chairId: string | null = null;

  const roleFor = (person: Person) => (person.role === 'judge' ? 'judge' : person.role);

  for (const person of people) {
    let userId: string | null = null;

    if (person.email) {
      const user = await prisma.user.upsert({
        where: { email: person.email },
        update: { name: person.name, role: roleFor(person) },
        create: {
          email: person.email,
          name: person.name,
          role: roleFor(person),
          passwordHash,
          emailVerifiedAt: new Date(),
          notificationPrefs: { create: {} },
        },
      });
      userId = user.id;
      accounts.set(person.email, user.id);
    }

    if (person.creator) {
      const facet = person.creator;
      const profile = {
        displayName: person.name,
        countryCode: facet.countryCode,
        city: facet.city,
        pronouns: facet.pronouns,
        headline: facet.headline,
        biography: facet.biography,
        websiteUrl: facet.websiteUrl,
        isPublished: true,
        // A record is claimed when a User holds it, and not a moment before.
        isClaimed: Boolean(userId),
        userId,
        referralEnabled: facet.verified && Boolean(userId),
      };

      const creator = await prisma.creator.upsert({
        where: { slug: facet.slug },
        update: profile,
        create: { slug: facet.slug, ...profile },
      });
      creatorIds.set(facet.slug, creator.id);

      await prisma.creatorVerification.upsert({
        where: { creatorId: creator.id },
        update: {
          status: facet.verified ? 'verified' : 'pending',
          verifiedAt: facet.verified ? new Date('2026-02-10T10:00:00.000Z') : null,
        },
        create: {
          creatorId: creator.id,
          status: facet.verified ? 'verified' : 'pending',
          provider: 'stub',
          providerReference: `stub_${facet.slug}`,
          method: 'document_and_liveness',
          verifiedAt: facet.verified ? new Date('2026-02-10T10:00:00.000Z') : null,
          lastCheckedAt: new Date('2026-02-10T10:00:00.000Z'),
        },
      });

      await prisma.creatorLink.deleteMany({ where: { creatorId: creator.id } });
      for (const [position, link] of facet.links.entries()) {
        await prisma.creatorLink.create({
          data: { creatorId: creator.id, label: link.label, url: link.url, position },
        });
      }
    }

    if (person.judge && userId) {
      const facet = person.judge;
      const judge = await prisma.judge.create({
        data: {
          userId,
          displayName: person.name,
          title: facet.title,
          organisation: facet.organisation,
          countryCode: facet.countryCode,
          biography: facet.biography,
        },
      });
      judgeIds.push(judge.id);
      if (facet.isChair) chairId = judge.id;

      for (const awardYearId of seasonIds.values()) {
        await prisma.judgePanelMembership.create({
          data: { judgeId: judge.id, awardYearId, isChair: facet.isChair },
        });
      }
    }
  }

  const operators = people.filter((person) => !person.judge && !person.creator).length;
  console.log(
    `  people: ${people.length} — ${operators} operators, ${judgeIds.length} judges, ${creatorIds.size} creators`,
  );

  // ── The audience ──────────────────────────────────────────────────────────
  // Nominators are not cast: they are anonymous members of the public, and
  // PALMA holds nothing about them but an address it can verify once.
  const nominatorIds: string[] = [];
  for (let index = 1; index <= 18; index += 1) {
    const email = `nominator${index}@example.com`;
    const nominator = await prisma.nominator.create({
      data: { email, emailKey: email, verifiedAt: new Date('2025-02-01T00:00:00.000Z') },
    });
    nominatorIds.push(nominator.id);
  }

  const REASONS = [
    'Consistently excellent work all year, and generous with how they explain it.',
    'They raised the standard for everyone else working in this space.',
    'Six years of the same schedule without an agency behind them. That is the achievement.',
    'The research is real and the craft is obvious. Nobody else is doing this.',
    'They changed how I think about the work, and they credit everyone they collaborate with.',
    'Quietly brilliant, and completely uninterested in gaming anyone.',
  ];

  // ── Seasons judged ────────────────────────────────────────────────────────
  let candidacyCount = 0;
  let nominationCount = 0;
  let honourCount = 0;
  let declined = 0;

  const creatorName = (slug: string) =>
    people.find((person) => person.creator?.slug === slug)?.name ?? slug;

  for (const season of seasonSeeds) {
    const awardYearId = seasonIds.get(season.year)!;

    for (const category of categorySeeds) {
      const creatorSlugs = season.results[category.slug] ?? [];
      const categoryId = categoryIds.get(`${season.year}:${category.slug}`)!;

      // A contested category with no result was judged and not conferred.
      if (season.stage === 'archived' && creatorSlugs.length === 0) declined += 1;

      for (const [index, creatorSlug] of creatorSlugs.entries()) {
        const creatorId = creatorIds.get(creatorSlug)!;
        const kind = index === 0 ? 'winner' : 'finalist';
        const issuedAt = new Date(kind === 'winner' ? season.ceremonyAt! : season.finalistsAt!);

        const candidacy = await prisma.candidacy.create({
          data: {
            reference: `PC-${season.year}-${String(++candidacyCount).padStart(4, '0')}`,
            awardYearId,
            categoryId,
            creatorId,
            status: kind,
            reviewedAt: new Date(season.shortlistAt!),
            reviewNote: 'Eligibility confirmed by the screening team.',
            firstNominatedAt: new Date(season.nominationsOpenAt!),
            lastNominatedAt: new Date(season.nominationsCloseAt!),
            evidence: {
              create: [
                {
                  kind: 'external_link',
                  label: `${season.year} body of work`,
                  url: `https://example.com/${creatorSlug}/${season.year}`,
                  note: 'Gathered by PALMA and reviewed where it is published.',
                },
                {
                  kind: 'press_mention',
                  label: 'Independent coverage',
                  url: `https://example.com/press/${creatorSlug}-${season.year}`,
                  note: 'Third-party write-up from the qualifying year.',
                },
              ],
            },
          },
        });

        // Audience nominations. More for the winner — and the count never
        // reaches the judging path, which is the point of storing it at all.
        const volume = kind === 'winner' ? 7 : 4 - index;
        for (let n = 0; n < volume; n += 1) {
          const nominatorId = nominatorIds[(candidacyCount * 5 + n * 3) % nominatorIds.length]!;
          const already = await prisma.nomination.findUnique({
            where: { nominatorId_candidacyId: { nominatorId, candidacyId: candidacy.id } },
          });
          if (already) continue;

          await prisma.nomination.create({
            data: {
              reference: `PN-${season.year}-${String(++nominationCount).padStart(6, '0')}`,
              candidacyId: candidacy.id,
              nominatorId,
              source: n % 3 === 0 ? 'referral' : 'organic',
              referralSlug: n % 3 === 0 ? creatorSlug : null,
              status: 'counted',
              reason: REASONS[(candidacyCount + n) % REASONS.length]!,
              verifiedAt: new Date(season.nominationsOpenAt!),
              countedAt: new Date(season.nominationsOpenAt!),
            },
          });
        }

        await prisma.candidacy.update({
          where: { id: candidacy.id },
          data: {
            nominationCount: await prisma.nomination.count({
              where: { candidacyId: candidacy.id },
            }),
          },
        });

        // Panel scores. The chair sees the spread and scores nothing, so the
        // scoring judges are the panel minus the chair.
        const scoring = judgeIds.filter((id) => id !== chairId);
        const basis = kind === 'winner' ? 9 : 8 - index;

        for (const [position, judgeId] of scoring.entries()) {
          const assignment = await prisma.judgingAssignment.create({
            data: {
              judgeId,
              candidacyId: candidacy.id,
              categoryId,
              status: 'completed',
              completedAt: issuedAt,
            },
          });

          const spread = position - 1;
          const card = {
            achievement: clamp(basis + spread),
            quality: clamp(basis + 1),
            impact: clamp(basis - spread),
            consistency: clamp(basis),
            audience: clamp(basis),
            fit: clamp(basis + 1),
          };

          await prisma.judgingScore.create({
            data: {
              assignmentId: assignment.id,
              judgeId,
              candidacyId: candidacy.id,
              ...card,
              // The weighted total, as the domain computes it — a seed that
              // totals differently from the application is a seed that hides
              // a bug in the application.
              total: totalScore(card),
              remarks:
                'Assessed against the published criteria. Audience size discounted, as briefed.',
              submittedAt: issuedAt,
            },
          });
        }

        const honour = await prisma.honour.create({
          data: {
            awardYearId,
            categoryId,
            creatorId,
            candidacyId: candidacy.id,
            kind,
            position: index === 0 ? 1 : index,
            citation: kind === 'winner' ? (citations[category.slug] ?? null) : null,
            announcedAt: issuedAt,
          },
        });
        honourCount += 1;

        const code = deriveCode(season.year, honour.id);
        const { signature, canonical } = signAchievement({
          code,
          creatorSlug,
          creatorName: creatorName(creatorSlug),
          categoryName: category.name,
          year: season.year,
          kind,
          issuedAt: issuedAt.toISOString(),
        });

        const achievement = await prisma.achievement.create({
          data: {
            honourId: honour.id,
            creatorId,
            code,
            kind,
            year: season.year,
            categoryName: category.name,
            creatorName: creatorName(creatorSlug),
            issuedAt,
          },
        });

        await prisma.verificationRecord.create({
          data: {
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

  console.log(
    `  judged: ${candidacyCount} candidacies, ${nominationCount} nominations, ${honourCount} honours, ${declined} category declined`,
  );

  // ── Journal ───────────────────────────────────────────────────────────────
  const editorId = accounts.get('tom@palmaawards.com')!;
  const editorName = people.find((person) => person.email === 'tom@palmaawards.com')!.name;

  for (const [position, category] of articleCategories.entries()) {
    await prisma.articleCategory.create({
      data: { slug: category.slug, name: category.name, position },
    });
  }

  for (const article of articles) {
    const category = await prisma.articleCategory.findUnique({
      where: { slug: article.categorySlug },
    });

    await prisma.article.create({
      data: {
        slug: article.slug,
        title: article.title,
        standfirst: article.standfirst,
        body: article.body,
        status: 'published',
        categoryId: category?.id ?? null,
        authorId: editorId,
        authorName: editorName,
        readingMinutes: readingMinutes(article.body),
        publishedAt: new Date(article.publishedAt),
      },
    });
  }
  console.log(`  articles: ${articles.length}`);

  // ── Sponsors ──────────────────────────────────────────────────────────────
  const currentSeason = seasonSeeds.find((season) => season.isCurrent)!;
  const currentSeasonId = seasonIds.get(currentSeason.year)!;

  for (const sponsor of sponsorSeeds) {
    const record = await prisma.sponsor.create({
      data: {
        slug: sponsor.slug,
        name: sponsor.name,
        summary: sponsor.summary,
        websiteUrl: sponsor.websiteUrl,
      },
    });

    await prisma.sponsorship.create({
      data: {
        sponsorId: record.id,
        awardYearId: currentSeasonId,
        categoryId: sponsor.categorySlug
          ? (categoryIds.get(`${currentSeason.year}:${sponsor.categorySlug}`) ?? null)
          : null,
        tier: sponsor.tier,
      },
    });
  }
  console.log(`  sponsors: ${sponsorSeeds.length}`);

  const adminId = accounts.get('sarah@palmaawards.com')!;
  await prisma.auditLog.create({
    data: {
      action: 'season.stage_changed',
      entityType: 'AwardYear',
      entityId: currentSeasonId,
      actorId: adminId,
      actorRole: 'super_admin',
      actorLabel: 'sarah@palmaawards.com',
      summary: `${currentSeason.title} seeded and opened for nominations`,
    },
  });

  console.log(`\n  Accounts — password ${DEMO_PASSWORD}`);
  for (const person of people) {
    if (!person.email) {
      console.log(`    ${'—'.padEnd(26)} ${person.name} (creator record, unclaimed)`);
      continue;
    }
    const door =
      person.role === 'judge' ? '/judge' : person.role === 'creator' ? '/sign-in' : '/staff';
    console.log(
      `    ${person.email.padEnd(26)} ${roleFor(person).padEnd(12)} ${door.padEnd(9)} ${person.name}`,
    );
  }
  console.log('\n· Done');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
