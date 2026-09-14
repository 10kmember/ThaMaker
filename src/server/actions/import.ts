'use server';

import { revalidatePath } from 'next/cache';
import { assertSameOrigin } from '@/lib/auth/session';
import { authorise } from '@/lib/auth/guards';
import { isValidCountryCode } from '@/lib/countries';
import { slugify } from '@/lib/utils';
import { recordAudit } from '@/server/audit';
import { prisma } from '@/server/db';
import { MAX_IMPORT_ROWS, parseCreatorImport, type ImportRow } from '@/domain/creator-import';

/**
 * Presetting the archive.
 *
 * PALMA's records exist before their creators do — that is the whole premise
 * of the claim flow — and writing them one at a time stops being possible at
 * about thirty. This takes a pasted list and writes unclaimed, unpublished
 * records ready to be claimed.
 *
 * Two deliberate constraints. Nothing is published: an imported record is a
 * stub the editorial desk still has to finish, and a bulk route that could
 * publish would be a bulk route that eventually publishes something nobody
 * read. And nothing is overwritten: a name already in the archive is reported
 * and skipped, because "import" must never be a way to quietly rewrite a
 * record somebody holds.
 */

export type ImportState = {
  status: 'idle' | 'error' | 'preview' | 'success';
  message?: string;
  preview?: {
    rows: {
      line: number;
      displayName: string;
      countryCode: string;
      links: number;
      exists: boolean;
    }[];
    problems: { line: number; detail: string }[];
    writable: number;
  };
};

async function plan(text: string) {
  const parsed = parseCreatorImport(text, { isValidCountry: isValidCountryCode });

  // Which of these already exist, by the slug they would take.
  const slugs = parsed.rows.map((row) => slugify(row.displayName));
  const existing = slugs.length
    ? await prisma.creator.findMany({
        where: { slug: { in: slugs } },
        select: { slug: true },
      })
    : [];
  const taken = new Set(existing.map((row) => row.slug));

  return { parsed, taken };
}

export async function previewCreatorImport(
  _previous: ImportState,
  formData: FormData,
): Promise<ImportState> {
  await assertSameOrigin();

  try {
    await authorise('editorial:import_creators');
  } catch {
    return { status: 'error', message: 'You are not authorised to import records.' };
  }

  const text = String(formData.get('rows') ?? '');
  if (!text.trim()) {
    return { status: 'error', message: 'Paste a list first.' };
  }

  const { parsed, taken } = await plan(text);

  if (parsed.rows.length === 0) {
    return {
      status: 'error',
      message: 'Nothing readable in that list.',
      preview: { rows: [], problems: parsed.problems, writable: 0 },
    };
  }

  const rows = parsed.rows.map((row) => ({
    line: row.line,
    displayName: row.displayName,
    countryCode: row.countryCode,
    links: row.links.length,
    exists: taken.has(slugify(row.displayName)),
  }));

  const writable = rows.filter((row) => !row.exists).length;

  return {
    status: 'preview',
    message:
      writable === 0
        ? 'Every name in that list is already in the archive. Nothing would be written.'
        : `${writable} record${writable === 1 ? '' : 's'} would be created, unclaimed and unpublished.`,
    preview: { rows, problems: parsed.problems, writable },
  };
}

export async function commitCreatorImport(
  _previous: ImportState,
  formData: FormData,
): Promise<ImportState> {
  await assertSameOrigin();

  let session;
  try {
    session = await authorise('editorial:import_creators');
  } catch {
    return { status: 'error', message: 'You are not authorised to import records.' };
  }

  const text = String(formData.get('rows') ?? '');
  if (!text.trim()) return { status: 'error', message: 'Paste a list first.' };

  if (String(formData.get('confirm') ?? '') !== 'IMPORT') {
    return { status: 'error', message: 'Type IMPORT to confirm.' };
  }

  const { parsed, taken } = await plan(text);

  if (parsed.rows.length === 0) {
    return { status: 'error', message: 'Nothing readable in that list.' };
  }
  if (parsed.rows.length > MAX_IMPORT_ROWS) {
    return {
      status: 'error',
      message: `That is more than ${MAX_IMPORT_ROWS} rows. Split the list.`,
    };
  }

  const writable = parsed.rows.filter((row) => !taken.has(slugify(row.displayName)));

  if (writable.length === 0) {
    return { status: 'error', message: 'Every name in that list is already in the archive.' };
  }

  // Slugs are claimed as we go, so two new names that slugify the same way
  // inside one import do not collide with each other either.
  const claimed = new Set(taken);
  let written = 0;

  for (const row of writable) {
    const slug = await uniqueSlug(row, claimed);
    claimed.add(slug);

    await prisma.creator.create({
      data: {
        slug,
        displayName: row.displayName,
        countryCode: row.countryCode,
        city: row.city,
        headline: row.headline,
        isPublished: false,
        isClaimed: false,
        verification: { create: { status: 'unverified' } },
        links: {
          create: row.links.map((link, position) => ({ ...link, position })),
        },
        staffNotes: {
          create: {
            authorId: session.user.id,
            body: `Imported in bulk by ${session.user.email}. Unpublished stub: check the links and write the record before publishing it.`,
          },
        },
      },
    });

    written += 1;
  }

  await recordAudit({
    action: 'creators.imported',
    entityType: 'Creator',
    entityId: 'bulk',
    actor: { id: session.user.id, role: session.user.role, label: session.user.email },
    summary: `${written} record(s) imported, unclaimed and unpublished`,
    after: { written, skipped: parsed.rows.length - writable.length },
  });

  revalidatePath('/portal/creators');

  const skipped = parsed.rows.length - writable.length;

  return {
    status: 'success',
    message: `${written} record${written === 1 ? '' : 's'} created, unclaimed and unpublished.${
      skipped > 0
        ? ` ${skipped} already existed and ${skipped === 1 ? 'was' : 'were'} left alone.`
        : ''
    }`,
  };
}

async function uniqueSlug(row: ImportRow, claimed: Set<string>): Promise<string> {
  const base = slugify(row.displayName);
  let slug = base;

  for (let attempt = 2; ; attempt += 1) {
    if (!claimed.has(slug) && !(await prisma.creator.findUnique({ where: { slug } }))) {
      return slug;
    }
    slug = `${base}-${attempt}`;
  }
}
