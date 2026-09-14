import { NextResponse } from 'next/server';
import { prisma } from '@/server/db';

/**
 * Serving an approved portrait.
 *
 * The checksum is in the path rather than a query string, which buys two
 * things: the URL is immutable, so it can be cached for a year by anything
 * that sees it; and replacing a portrait produces a different URL, so no cache
 * anywhere is left holding an image the creator has taken down.
 *
 * Only an approved portrait is ever served. A pending one exists in the
 * database and is visible to the moderator reviewing it, and to nobody else.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; checksum: string }> },
): Promise<NextResponse> {
  const { slug, checksum } = await params;

  const portrait = await prisma.creatorPortrait.findFirst({
    where: {
      status: 'approved',
      checksum,
      creator: { slug, isPublished: true },
    },
    select: { data: true, contentType: true, byteSize: true },
  });

  // A mismatched checksum is a stale URL rather than an error worth explaining.
  if (!portrait || portrait.byteSize === 0) {
    return new NextResponse('Not found', { status: 404 });
  }

  return new NextResponse(Buffer.from(portrait.data), {
    headers: {
      'Content-Type': portrait.contentType,
      'Content-Length': String(portrait.byteSize),
      // Immutable: the checksum is part of the path, so these bytes can never
      // change at this URL.
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Security-Policy': "default-src 'none'; sandbox",
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
