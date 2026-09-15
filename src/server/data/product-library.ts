import 'server-only';
import { prisma } from '@/server/db';
import { disclosureFor, productCategory } from '@/domain/product-library';

/**
 * Reading the Product Library.
 *
 * Two shapes, and the difference between them is the firewall.
 *
 * `PublicEntry` carries the verdict and the disclosure line. `DeskEntry` adds
 * the draft state and the sponsor's identity for the editor working on it.
 * Neither ever hands a sponsor a route to an editorial field, because the write
 * path does not accept one.
 */

export type PublicEntry = {
  slug: string;
  name: string;
  brand: string;
  category: string;
  categoryLabel: string;
  /** Out of ten, to one decimal. Stored in tenths so it stays an integer. */
  verdict: number | null;
  bestFor: string;
  strengths: string[];
  limitations: string[];
  review: string;
  testedBy: string | null;
  externalUrl: string | null;
  /** Composed by PALMA, never typed by an editor or a partner. */
  disclosure: string | null;
  publishedAt: string | null;
};

export type DeskEntry = PublicEntry & {
  id: string;
  isPublished: boolean;
  sponsorId: string | null;
  sponsorName: string | null;
  updatedAt: string;
};

const SELECT = {
  id: true,
  slug: true,
  name: true,
  brand: true,
  category: true,
  verdict: true,
  bestFor: true,
  strengths: true,
  limitations: true,
  review: true,
  testedBy: true,
  externalUrl: true,
  isPublished: true,
  publishedAt: true,
  updatedAt: true,
  sponsorId: true,
  sponsor: { select: { name: true } },
} as const;

type Row = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  verdict: number | null;
  bestFor: string;
  strengths: string[];
  limitations: string[];
  review: string;
  testedBy: string | null;
  externalUrl: string | null;
  isPublished: boolean;
  publishedAt: Date | null;
  updatedAt: Date;
  sponsorId: string | null;
  sponsor: { name: string } | null;
};

function shape(row: Row): DeskEntry {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    brand: row.brand,
    category: row.category,
    categoryLabel: productCategory(row.category)?.label ?? row.category,
    verdict: row.verdict === null ? null : row.verdict / 10,
    bestFor: row.bestFor,
    strengths: row.strengths,
    limitations: row.limitations,
    review: row.review,
    testedBy: row.testedBy,
    externalUrl: row.externalUrl,
    // Always composed, never read from the database, so an edit to the stored
    // text cannot soften what a reader is told.
    disclosure: disclosureFor(row.sponsor?.name ?? null),
    publishedAt: row.publishedAt?.toISOString() ?? null,
    isPublished: row.isPublished,
    sponsorId: row.sponsorId,
    sponsorName: row.sponsor?.name ?? null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** What the public sees. Published entries only, best verdict first. */
export async function listPublishedProducts(category?: string): Promise<PublicEntry[]> {
  const rows = await prisma.productEntry.findMany({
    where: { isPublished: true, ...(category ? { category } : {}) },
    select: SELECT,
    orderBy: [{ verdict: 'desc' }, { name: 'asc' }],
    take: 200,
  });
  return rows.map(shape);
}

export async function getProduct(slug: string): Promise<PublicEntry | null> {
  const row = await prisma.productEntry.findUnique({ where: { slug }, select: SELECT });
  return row && row.isPublished ? shape(row) : null;
}

/** Everything, drafts included, for the desk. */
export async function listDeskProducts(): Promise<DeskEntry[]> {
  const rows = await prisma.productEntry.findMany({
    select: SELECT,
    orderBy: [{ isPublished: 'asc' }, { updatedAt: 'desc' }],
    take: 300,
  });
  return rows.map(shape);
}

export async function getDeskProduct(id: string): Promise<DeskEntry | null> {
  const row = await prisma.productEntry.findUnique({ where: { id }, select: SELECT });
  return row ? shape(row) : null;
}
