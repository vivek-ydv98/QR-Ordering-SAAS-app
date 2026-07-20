import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SKIP_PREFIXES = new Set([
  'admin', 'auth', 'super-admin', '_next', 'api', 'favicon.ico',
]);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ─── 301 LEGACY REDIRECTS ─────────────────────────────────────

  if (pathname === '/kitchen') {
    return NextResponse.redirect(new URL('/login', request.url), 301);
  }

  if (pathname === '/waiter') {
    return NextResponse.redirect(new URL('/login', request.url), 301);
  }

  if (pathname === '/auth/login') {
    return NextResponse.redirect(new URL('/login', request.url), 301);
  }

  const rMatch = pathname.match(/^\/r\/([^/]+)\/table\/([^/]+)$/);
  if (rMatch) {
    return NextResponse.redirect(
      new URL(`/${rMatch[1]}/table/${rMatch[2]}`, request.url),
      301,
    );
  }

  const rMenuMatch = pathname.match(/^\/r\/([^/]+)\/menu$/);
  if (rMenuMatch) {
    return NextResponse.redirect(
      new URL(`/${rMenuMatch[1]}/menu`, request.url),
      301,
    );
  }

  if (pathname === '/admin/dashboard') {
    return NextResponse.redirect(new URL('/login', request.url), 301);
  }

  const dashMatch = pathname.match(/^\/admin\/dashboard\/(.+)$/);
  if (dashMatch) {
    return NextResponse.redirect(new URL('/login', request.url), 301);
  }

  // ─── TENANT SLUG EXTRACTION ────────────────────────────────────
  // For customer routes /{tenant}/menu or /{tenant}/table/{tableId}

  const firstSegment = pathname.split('/')[1];
  if (firstSegment && !SKIP_PREFIXES.has(firstSegment)) {
    const isCustomerRoute = /^\/(?:[^/]+)\/(?:menu|table)\/?/.test(pathname);
    if (isCustomerRoute) {
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-tenant-slug', firstSegment);
      return NextResponse.next({ request: { headers: requestHeaders } });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|workbox-|.*\\.).*)',
  ],
};
