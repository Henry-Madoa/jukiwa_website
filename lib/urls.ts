/*
 * The two addresses the site links out to, decided in one place.
 */

const isLocal = (url: string): boolean => /\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(url);

/**
 * The site's own public address, for canonical links, the sitemap and structured data. An address
 * copied from a developer's .env (localhost) is ignored on Vercel, where the project's production
 * domain is used instead — search engines must never be pointed at somebody's laptop.
 */
export function siteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  const onVercel = !!process.env.VERCEL;
  if (configured && !(onVercel && isLocal(configured))) return configured.replace(/\/$/, '');
  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  return vercelHost ? `https://${vercelHost}` : 'http://localhost:3000';
}

/**
 * The customer portal's address, or null when there is none — its buttons are then hidden. The
 * lending system is the record of every balance; the website only ever links to it.
 */
export function portalUrl(company: { portal_url: string | null }): string | null {
  return company.portal_url || process.env.NEXT_PUBLIC_PORTAL_URL || null;
}
