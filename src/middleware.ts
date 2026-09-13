import { NextResponse, type NextRequest } from 'next/server';

/**
 * The only thing this middleware does is tell a layout which page is rendering
 * beneath it, because Next does not. Authorisation happens in the layouts and
 * pages themselves, server-side — never here: middleware runs before the
 * session can be read from the database, and a gate that cannot see the
 * session is not a gate.
 */
export function middleware(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set('x-palma-pathname', request.nextUrl.pathname);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
};
