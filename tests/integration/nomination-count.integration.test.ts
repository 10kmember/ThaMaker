/**
 * Integration coverage for counting a verified nomination automatically.
 *
 * Runs only when DATABASE_URL is set. Everything it creates is namespaced and
 * removed again, in FK-safe order.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { countVerifiedNomination } from '@/server/services/nomination-count';
import { createId } from '@/server/db/ids';
import { closeSql, sql } from '@/server/db/sql';

const hasDatabase = Boolean(process.env.DATABASE_URL);
const SUFFIX = `it-${Date.now()}`;
const actor = { id: null, role: 'super_admin' as const, label: 'integration-test' };

let seasonId = '';
let categoryId = '';
let creatorId = '';
let candidacyId = '';
let nominatorId = '';
let nominationId = '';

describe.skipIf(!hasDatabase)('counting a verified nomination (integration)', () => {
  beforeAll(async () => {
    const created = new Date();
    seasonId = createId();
    const year = 3000 + (Date.now() % 90);
    await sql`
      insert into "AwardYear" (id, year, title, stage, "createdAt", "updatedAt")
      values (${seasonId}, ${year}, ${`PALMA Auto-count ${SUFFIX}`}, 'nominations_open', ${created}, ${created})
    `;

    categoryId = createId();
    await sql`
      insert into "Category" (
        id, "awardYearId", slug, name, description, eligibility, "judgingCriteria", "createdAt", "updatedAt"
      ) values (
        ${categoryId},
        ${seasonId},
        ${`auto-count-${SUFFIX}`},
        'Auto-count Category',
        'x',
        'x',
        'x',
        ${created},
        ${created}
      )
    `;

    creatorId = createId();
    await sql`
      insert into "Creator" (id, slug, "displayName", "countryCode", "isPublished", "createdAt", "updatedAt")
      values (${creatorId}, ${`auto-count-${SUFFIX}`}, 'Auto Count Creator', 'GB', true, ${created}, ${created})
    `;

    candidacyId = createId();
    await sql`
      insert into "Candidacy" (id, reference, "awardYearId", "categoryId", "creatorId", "createdAt", "updatedAt")
      values (
        ${candidacyId},
        ${`PC-AUTO-${SUFFIX}`},
        ${seasonId},
        ${categoryId},
        ${creatorId},
        ${created},
        ${created}
      )
    `;

    nominatorId = createId();
    await sql`
      insert into "Nominator" (id, email, "emailKey", "createdAt", "updatedAt")
      values (${nominatorId}, ${`auto-${SUFFIX}@example.com`}, ${`auto-${SUFFIX}@example.com`}, ${created}, ${created})
    `;

    nominationId = createId();
    await sql`
      insert into "Nomination" (
        id, reference, "candidacyId", "nominatorId", reason, "verifiedAt"
      ) values (
        ${nominationId},
        ${`PN-AUTO-${SUFFIX}`},
        ${candidacyId},
        ${nominatorId},
        'A verified human nomination.',
        ${new Date()}
      )
    `;
  });

  afterAll(async () => {
    await sql`delete from "AuditLog" where "actorLabel" = 'integration-test'`;
    await sql`delete from "Nomination" where id = ${nominationId}`;
    await sql`delete from "Nominator" where id = ${nominatorId}`;
    await sql`delete from "Candidacy" where id = ${candidacyId}`;
    await sql`delete from "Category" where id = ${categoryId}`;
    await sql`delete from "AwardYear" where id = ${seasonId}`.catch(() => undefined);
    await sql`delete from "Creator" where id = ${creatorId}`;
    await closeSql();
  });

  it('counts a verified nomination and moves the candidacy out of review', async () => {
    const result = await countVerifiedNomination(nominationId, actor);
    expect(result).toMatchObject({ ok: true, already: false });

    const nomination = (
      await sql<{ status: string; countedAt: Date | null }[]>`
      select status, "countedAt" from "Nomination" where id = ${nominationId} limit 1
      `
    )[0];
    if (!nomination) throw new Error('nomination missing after count');
    expect(nomination.status).toBe('counted');
    expect(nomination.countedAt).not.toBeNull();

    const candidacy = (
      await sql<{ status: string; nominationCount: number }[]>`
      select status, "nominationCount" from "Candidacy" where id = ${candidacyId} limit 1
      `
    )[0];
    if (!candidacy) throw new Error('candidacy missing after count');
    expect(candidacy.status).toBe('eligible');
    expect(candidacy.nominationCount).toBe(1);

    const again = await countVerifiedNomination(nominationId, actor);
    expect(again).toMatchObject({ ok: true, already: true });

    const after = (
      await sql<{ nominationCount: number }[]>`
      select "nominationCount" from "Candidacy" where id = ${candidacyId} limit 1
      `
    )[0];
    if (!after) throw new Error('candidacy missing after idempotency check');
    expect(after.nominationCount).toBe(1);
  });
});
