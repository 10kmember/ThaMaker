/**
 * PALMA seed.
 *
 * Loads the bundled cast into PostgreSQL: nine people, twelve categories, three
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
import { loadEnvConfig } from '@next/env';
import { deriveCode, payloadDigest, signAchievement } from '../src/lib/verification';
import { totalScore } from '../src/domain/judging';
import { publishObjections } from '../src/domain/product-library';
import { PrismaClient } from '@prisma/client';
import { randomBytes, scrypt as scryptCallback } from 'node:crypto';
import { promisify } from 'node:util';
import {
  articleCategories,
  articles,
  categorySeeds,
  productSeeds,
  citations,
  people,
  seasonSeeds,
  sponsors as sponsorSeeds,
  type Person,
} from './seed-data';

/**
 * The same environment the application reads, loaded the same way.
 *
 * This is not a convenience. Every verification record is signed with
 * `AUTH_SECRET`, and the site verifies it with whatever `AUTH_SECRET` Next
 * loads from `.env.local` at runtime. The seed used to read `process.env`
 * directly, which is only populated if somebody happened to export the
 * variable in the shell — so seeding and serving could disagree about the key
 * without anything saying so, and every honour on the site would then fail to
 * verify. The page reported that as a signature that does not match its
 * contents, which reads as tampering rather than as the misconfiguration it
 * actually was.
 *
 * Loading the env the way Next does removes the coincidence: the seed signs
 * with the key the site will check against, or both fall back to the same
 * development default together.
 */
loadEnvConfig(process.cwd());

const prisma = new PrismaClient();
const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: string,
  keylen: number,
) => Promise<Buffer>;

const SECRET =
  process.env.AUTH_SECRET ?? 'palma-development-signing-secret-do-not-use-in-production';

const DEMO_PASSWORD = process.env.SEED_PASSWORD ?? 'Palma-Development-2027';

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derived = await scrypt(password.normalize('NFKC'), salt, 64);
  return `scrypt$${salt}$${derived.toString('hex')}`;
}

/**
 * The seed used to carry its own copies of these three functions. They drifted,
 * as duplicated cryptography always does: the copy here wrote `payloadDigest`
 * as an HMAC keyed with the literal string 'digest', while the application
 * computes a plain SHA-256 of the same canonical string, so no seeded record's
 * digest could ever match what the verify page recomputed. The real
 * implementations are imported now, and there is one definition of what a
 * PALMA signature is.
 */

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
  // Proposals point at seasons and creators that are about to be deleted, so
  // they go first. Left behind, a proposal survives a reseed and reappears on
  // the desk pointing at an award year that no longer exists.
  // The Library is seeded with a unique slug per entry, so a second run
  // collides unless the previous one is cleared. Without this the seed died
  // part-way through and left the Journal unseeded, which is the kind of
  // failure that looks like a missing feature rather than a crash.
  await prisma.productEntry.deleteMany();
  await prisma.featureSetting.deleteMany();
  await prisma.consequentialAction.deleteMany({
    where: { kind: { in: ['the_palma_conferral', 'honour_revocation'] } },
  });
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
  const slateFor = (season: (typeof seasonSeeds)[number]) =>
    categorySeeds.filter((category) => season.categorySlugs.includes(category.slug));

  for (const season of seasonSeeds) {
    const awardYearId = seasonIds.get(season.year)!;
    for (const [position, category] of slateFor(season).entries()) {
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
  console.log(
    `  categories: ${categoryIds.size} across ${seasonIds.size} seasons (${seasonSeeds
      .map((season) => `${season.year}: ${season.categorySlugs.length}`)
      .join(', ')})`,
  );

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

    for (const category of slateFor(season)) {
      const creatorSlugs = season.results[category.slug] ?? [];
      const categoryId = categoryIds.get(`${season.year}:${category.slug}`)!;

      // A contested category with no result was judged and not conferred.
      if (season.stage === 'archived' && creatorSlugs.length === 0) declined += 1;

      for (const [index, creatorSlug] of creatorSlugs.entries()) {
        const creatorId = creatorIds.get(creatorSlug)!;
        const kind = index === 0 ? ('winner' as const) : ('finalist' as const);
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

        const code = deriveCode(SECRET, season.year, honour.id);
        const payload = {
          code,
          creatorSlug,
          creatorName: creatorName(creatorSlug),
          categoryName: category.name,
          year: season.year,
          kind,
          issuedAt: issuedAt.toISOString(),
        };
        const signature = signAchievement(SECRET, payload);

        const achievement = await prisma.achievement.create({
          data: {
            honourId: honour.id,
            creatorId,
            code,
            kind,
            year: season.year,
            categoryName: category.name,
            creatorName: creatorName(creatorSlug),
            creatorSlug,
            issuedAt,
          },
        });

        await prisma.verificationRecord.create({
          data: {
            achievementId: achievement.id,
            code,
            signature,
            payloadDigest: payloadDigest(payload),
            issuedAt,
          },
        });
      }
    }
  }

  // ── THE PALMA ─────────────────────────────────────────────────────────────
  //
  // Written separately from the loop above because it is not a category result.
  // No candidacy, no category, no finalists behind it: one creator a season,
  // named by the panel from the whole record.
  let palmas = 0;
  for (const season of seasonSeeds) {
    if (!season.thePalma) continue;

    const awardYearId = seasonIds.get(season.year)!;
    const creatorId = creatorIds.get(season.thePalma.creatorSlug)!;
    const issuedAt = new Date(season.ceremonyAt!);

    const honour = await prisma.honour.create({
      data: {
        awardYearId,
        categoryId: null,
        creatorId,
        candidacyId: null,
        kind: 'the_palma',
        position: 0,
        citation: season.thePalma.citation,
        announcedAt: issuedAt,
      },
    });

    const code = deriveCode(SECRET, season.year, honour.id);
    const categoryName = 'THE PALMA';
    const payload = {
      code,
      creatorSlug: season.thePalma.creatorSlug,
      creatorName: creatorName(season.thePalma.creatorSlug),
      categoryName,
      year: season.year,
      kind: 'the_palma' as const,
      issuedAt: issuedAt.toISOString(),
    };
    const signature = signAchievement(SECRET, payload);

    const achievement = await prisma.achievement.create({
      data: {
        honourId: honour.id,
        creatorId,
        code,
        kind: 'the_palma',
        year: season.year,
        categoryName,
        creatorName: creatorName(season.thePalma.creatorSlug),
        creatorSlug: season.thePalma.creatorSlug,
        issuedAt,
      },
    });

    await prisma.verificationRecord.create({
      data: {
        achievementId: achievement.id,
        code,
        signature,
        payloadDigest: payloadDigest(payload),
        issuedAt,
      },
    });

    palmas += 1;
  }

  console.log(
    `  judged: ${candidacyCount} candidacies, ${nominationCount} nominations, ${honourCount} honours, ${declined} category declined`,
  );
  console.log(`  THE PALMA: ${palmas} conferred, one a season`);

  // ── The Product Library ───────────────────────────────────────────────────
  //
  // Authored by the desk, because the Library is the desk's work: a verdict is
  // editorial, and the people who write verdicts own them.
  const deskId = accounts.get('tom@palmaawards.com')!;
  //
  // Run through `publishObjections` before writing, exactly as the desk's own
  // form does. Seed data that could not be published through the product is
  // seed data that is lying about what the product accepts, and this caught a
  // review under the 200-character minimum on the first run.
  for (const product of productSeeds) {
    const objections = publishObjections({
      name: product.name,
      brand: product.brand,
      category: product.category,
      verdict: product.verdict,
      bestFor: product.bestFor,
      strengths: product.strengths,
      limitations: product.limitations,
      review: product.review,
      externalUrl: product.externalUrl,
      sponsorId: null,
    });

    if (objections.length > 0) {
      throw new Error(`Seed product ${product.slug} cannot be published: ${objections.join(' ')}`);
    }

    await prisma.productEntry.create({
      data: {
        slug: product.slug,
        name: product.name,
        brand: product.brand,
        category: product.category,
        verdict: Math.round(product.verdict * 10),
        bestFor: product.bestFor,
        strengths: product.strengths,
        limitations: product.limitations,
        review: product.review,
        testedBy: product.testedBy,
        externalUrl: product.externalUrl,
        isPublished: true,
        publishedAt: new Date('2026-08-20T09:00:00.000Z'),
        createdById: deskId,
        updatedById: deskId,
      },
    });
  }
  // Switched on here and nowhere else.
  //
  // Every commercial feature ships dark: the code default is off and no
  // FeatureSetting row is created in production, so the Library 404s until an
  // operator throws the switch on the Features panel. This row exists only in
  // the seeded development database, because six reviewed entries behind a
  // closed door cannot be looked at, and the point of seeding them is that
  // somebody can look at them.
  await prisma.featureSetting.create({
    data: { key: 'product_library', awardYearId: null, enabled: true },
  });

  console.log(`  library: ${productSeeds.length} entries, none sponsored, feature on (dev only)`);

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
