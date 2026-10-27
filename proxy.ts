import { NextResponse, type NextRequest } from 'next/server';

/*
 * The request proxy — Next 16's successor to middleware.
 *
 * Deliberately tiny and database-free. It does two things:
 *
 *   1. Sets the security headers every response should carry. They belong here rather than in
 *      next.config.ts because the Content-Security-Policy differs between the public site and the
 *      admin, and this is the one place that knows which is being asked for.
 *   2. Passes the pathname down in a header, so a layout can know which page it is wrapping
 *      without every page having to tell it. The admin uses it to send somebody who must change
 *      their password to the one screen where they can.
 *
 * No session is read and no authorisation decision is made here. Proxy runs before the request
 * reaches the application and is not the place to decide who may see what — lib/auth.ts does
 * that, on every request, against the database.
 */

/**
 * Cloudinary serves every uploaded image; Google Fonts serves the two typefaces; Unsplash and the
 * sister company's site serve the seed imagery until it is replaced. Each is named explicitly
 * rather than allowed by a wildcard, so a compromised dependency cannot quietly introduce another
 * origin. `unsafe-inline` for styles is required by the runtime theming (the brand colours are
 * injected as a <style> element) and by React's inline styles.
 */
function contentSecurityPolicy(isAdmin: boolean, nonce: string | null): string {
  // Next's runtime needs eval in development; production builds do not.
  const evalInDev = process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : '';
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    /*
     * The admin runs only the scripts this request's nonce vouches for, so injected markup cannot
     * run script where a session can act. Its pages read the session, so they render per request
     * anyway and the nonce costs nothing. The public pages are prerendered and cached — no request
     * to stamp a nonce from — and keep 'unsafe-inline' for Next's inline payload scripts.
     */
    nonce
      ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${evalInDev}`
      : `script-src 'self' 'unsafe-inline'${evalInDev}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https://res.cloudinary.com https://images.unsplash.com https://www.jukiwa.co.ke",
    "connect-src 'self' https://res.cloudinary.com",
    // The branches and contact pages embed a Google map; the admin never embeds anything.
    isAdmin ? "frame-src 'none'" : "frame-src https://www.google.com https://maps.google.com",
    'upgrade-insecure-requests',
  ].join('; ');
}

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const isAdmin = pathname === '/admin' || pathname.startsWith('/admin/');

  const nonce = isAdmin ? Buffer.from(crypto.randomUUID()).toString('base64') : null;
  const csp = contentSecurityPolicy(isAdmin, nonce);

  const headers = new Headers(request.headers);
  headers.set('x-pathname', pathname);
  // Next reads the nonce from the request's policy and stamps it on every script it renders.
  if (nonce) headers.set('Content-Security-Policy', csp);

  const response = NextResponse.next({ request: { headers } });

  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');
  // HTTPS only from here on, so a sign-in cannot be downgraded on a hostile Wi-Fi. Production
  // only: a browser remembers it for localhost too, which would break plain-http development.
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  if (isAdmin) {
    // Nothing behind the sign-in should ever be held by a shared cache or a proxy.
    response.headers.set('Cache-Control', 'no-store, must-revalidate');
  }

  return response;
}

export const config = {
  // Everything except Next's own static output and the files served straight from /public.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)'],
};
