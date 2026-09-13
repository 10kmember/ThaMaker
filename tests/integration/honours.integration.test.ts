/**
 * Integration coverage for conferring and revoking an honour.
 *
 * Runs only when DATABASE_URL is set — `npm run test:integration` after
 * `npm run db:push`. Everything it creates is namespaced and removed again.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { conferHonour, revokeHonour } from '@/server/services/honours';
import { verifyAchievement } from '@/lib/verification';
import { signingSecret } from '@/lib/env';

const hasDatabase = Boolean(process.env.DATABASE_URL);
const prisma = hasDatabase ? new PrismaClient() : null;

const SUFFIX = `it-${Date.now()}`;
const actor = { id: null, role: 'super_admin' as const, label: 'integration-test' };

let seasonId = '';
let categoryId = '';
let verifiedCreatorId = '';
let unverifiedCreatorId = '';
let nominationId = '';
let unverifiedNominationId = '';

describe.skipIf(!hasDatabase)('conferring an honour (integration)', () => {
  beforeAll(async () => {
    const db = prisma!;

    // Clear anything an interrupted earlier run left behind, so a failed
    // cleanup never leaks a fake season into the public record.
    const stale = await db.awardYear.findMany({
      where: { title: { startsWith: 'PALMA Integration' } },
      select: { id: true },
    });
    if (stale.length > 0) {
      const ids = stale.map((entry) => entry.id);
      await db.nomination.deleteMany({ where: { awardYearId: { in: ids } } });
      await db.awardYear.deleteMany({ where: { id: { in: ids } } });
      await db.creator.deleteMany({
        where: {
          OR: [
            { slug: { startsWith: 'verified-it-' } },
            { slug: { startsWith: 'unverified-it-' } },
          ],
        },
      });
    }

    const season = await db.awardYear.create({
      data: {
        year: 2900 + (Date.now() % 90),
        title: `PALMA Integration ${SUFFIX}`,
        stage: 'judging',
      },
    });
    seasonId = season.id;

    const category = await db.category.create({
      data: {
        awardYearId: season.id,
        slug: `integration-${SUFFIX}`,
        name: 'Integration Category',
        description: 'x',
        eligibility: 'x',
        judgingCriteria: 'x',
      },
    });
    categoryId = category.id;

    const verified = await db.creator.create({
      data: {
        slug: `verified-${SUFFIX}`,
        displayName: 'Verified Creator',
        countryCode: 'GB',
        verification: { create: { status: 'verified', verifiedAt: new Date() } },
      },
    });
    verifiedCreatorId = verified.id;

    const unverified = await db.creator.create({
      data: {
        slug: `unverified-${SUFFIX}`,
        displayName: 'Unverified Creator',
        countryCode: 'GB',
        verification: { create: { status: 'pending' } },
      },
    });
    unverifiedCreatorId = unverified.id;

    const nomination = await db.nomination.create({
      data: {
        reference: `PN-INT-${SUFFIX}-1`,
        awardYearId: season.id,
        categoryId: category.id,
        creatorId: verified.id,
        status: 'eligible',
        statement: 'x'.repeat(200),
        nominatorEmail: 'integration@example.com',
      },
    });
    nominationId = nomination.id;

    const second = await db.nomination.create({
      data: {
        reference: `PN-INT-${SUFFIX}-2`,
        awardYearId: season.id,
        categoryId: category.id,
        creatorId: unverified.id,
        status: 'eligible',
        statement: 'x'.repeat(200),
        nominatorEmail: 'integration@example.com',
      },
    });
    unverifiedNominationId = second.id;
  });

  afterAll(async () => {
    const db = prisma;
    if (!db) return;
    // Order matters: a season cannot be deleted while nominations reference it,
    // which is the behaviour an institution wants — seasons are not disposable.
    await db.auditLog.deleteMany({ where: { actorLabel: 'integration-test' } });
    await db.nomination.deleteMany({ where: { awardYearId: seasonId } });
    await db.awardYear.delete({ where: { id: seasonId } }).catch(() => undefined);
    await db.creator.deleteMany({
      where: { id: { in: [verifiedCreatorId, unverifiedCreatorId] } },
    });
    await db.$disconnect();
  });

  it('mints a signed, verifiable record when a PALMA is conferred', async () => {
    const result = await conferHonour({ nominationId, kind: 'winner', position: 1, actor });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.code).toMatch(/^PM-\d{4}-[0-9A-HJKMNP-TV-Z]{6}$/);

    const record = await prisma!.verificationRecord.findUnique({
      where: { code: result.code! },
      include: { achievement: { include: { creator: true, honour: true } } },
    });

    expect(record).not.toBeNull();
    expect(
      verifyAchievement(
        signingSecret(),
        {
          code: record!.code,
          creatorSlug: record!.achievement.creator.slug,
          creatorName: record!.achievement.creatorName,
          categoryName: record!.achievement.categoryName,
          year: record!.achievement.year,
          kind: 'winner',
          issuedAt: record!.achievement.issuedAt.toISOString(),
        },
        record!.signature,
      ),
    ).toBe(true);
  });

  it('publishes the creator and updates the nomination status', async () => {
    const creator = await prisma!.creator.findUnique({ where: { id: verifiedCreatorId } });
    const nomination = await prisma!.nomination.findUnique({ where: { id: nominationId } });
    expect(creator?.isPublished).toBe(true);
    expect(nomination?.status).toBe('winner');
  });

  it('writes the conferral to the audit log', async () => {
    const entries = await prisma!.auditLog.findMany({
      where: { actorLabel: 'integration-test', action: 'honour.winner_selected' },
    });
    expect(entries.length).toBeGreaterThan(0);
  });

  it('refuses to confer the same honour twice', async () => {
    const again = await conferHonour({ nominationId, kind: 'winner', actor });
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.reason).toContain('already been conferred');
  });

  it('refuses to confer an honour on an unverified creator', async () => {
    const result = await conferHonour({
      nominationId: unverifiedNominationId,
      kind: 'winner',
      actor,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('verification');
  });

  it('revokes without deleting, so the record still answers', async () => {
    const honour = await prisma!.honour.findFirst({ where: { categoryId, kind: 'winner' } });
    const result = await revokeHonour({
      honourId: honour!.id,
      reason: 'Integration test revocation with a sufficiently detailed reason.',
      actor,
    });
    expect(result.ok).toBe(true);

    const after = await prisma!.honour.findUnique({
      where: { id: honour!.id },
      include: { achievement: true },
    });
    expect(after?.state).toBe('revoked');
    expect(after?.achievement?.state).toBe('revoked');
    expect(after?.achievement).not.toBeNull();
  });

  it('refuses a revocation without an explanation', async () => {
    const honour = await prisma!.honour.findFirst({ where: { categoryId } });
    const result = await revokeHonour({ honourId: honour!.id, reason: 'no', actor });
    expect(result.ok).toBe(false);
  });
});
