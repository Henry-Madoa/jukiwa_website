/*
 * A small in-memory rate limiter for the handful of things an anonymous visitor can POST: an enquiry,
 * a loan application, a callback request, a partner enquiry and a newsletter sign-up.
 *
 * In-process and therefore per-instance — on several instances a determined flooder gets a
 * multiple of the allowance. That is the right trade here: the job is to stop a crude script and
 * an accidental double-submit, not to survive a deliberate attack, and the alternative (a shared
 * store) is a dependency the company would then have to run. Put a CDN or WAF in front for the rest.
 */
const HITS = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const entry = HITS.get(key);

  if (!entry || entry.resetAt <= now) {
    HITS.set(key, { count: 1, resetAt: now + windowMs });
    if (HITS.size > 5_000) sweep(now);
    return { ok: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  entry.count += 1;
  return { ok: entry.count <= limit, remaining: Math.max(0, limit - entry.count), resetAt: entry.resetAt };
}

function sweep(now: number): void {
  for (const [key, entry] of HITS) if (entry.resetAt <= now) HITS.delete(key);
}

/**
 * The caller's address, as the proxy in front of us reports it. It gates a form, never an
 * authorisation decision.
 *
 * Only what a proxy writes is believed. The *first* X-Forwarded-For entry is whatever the client
 * sent, so trusting it let a script pick a fresh address per request and walk past every limit.
 * x-real-ip (Vercel, nginx) and cf-connecting-ip (Cloudflare) are set by the platform, and the
 * *last* X-Forwarded-For entry is the one our nearest proxy appended. CLIENT_IP_HEADER names a
 * different header where the host documents one.
 */
export function clientIp(headers: Headers): string {
  const configured = process.env.CLIENT_IP_HEADER;
  if (configured) return headers.get(configured)?.trim() || 'unknown';
  const trusted = headers.get('x-real-ip') ?? headers.get('cf-connecting-ip');
  if (trusted) return trusted.trim();
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',').at(-1)!.trim() || 'unknown';
  return 'unknown';
}
