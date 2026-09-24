import 'server-only';

/*
 * The dashboard's numbers: what the website has brought in, and what became of it.
 *
 * A marketing site is judged on one thing — whether the people it reaches become borrowers — so
 * every figure here traces a visitor from the form they sent to the status an officer gave it.
 * All of it is aggregate: no name or phone number leaves this module.
 */
import { all, one } from './db.ts';
import { APPLICATION_STATUSES, type ApplicationStatus } from './types.ts';

export type Range = '30d' | '90d' | '12m';
export const RANGES: { value: Range; label: string; days: number; bucket: 'week' | 'month' }[] = [
  { value: '30d', label: '30 days', days: 30, bucket: 'week' },
  { value: '90d', label: '90 days', days: 90, bucket: 'week' },
  { value: '12m', label: '12 months', days: 365, bucket: 'month' },
];

export const parseRange = (value: string | undefined): Range =>
  RANGES.some((r) => r.value === value) ? (value as Range) : '90d';

export interface Bucket { label: string; start: string; applications: number; cents: number; enquiries: number }
export interface Slice { key: string; label: string; n: number; cents: number }

export interface LendingInsights {
  range: Range;
  buckets: Bucket[];
  funnel: Slice[];
  products: Slice[];
  counties: Slice[];
  totals: { applications: number; cents: number; enquiries: number; disbursed: number; disbursedCents: number; declined: number };
  previous: { applications: number; cents: number };
  /** Median hours from arrival to an officer's first status change, or null with nothing handled. */
  responseHours: number | null;
}

const startOf = (date: Date, bucket: 'week' | 'month'): Date => {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  if (bucket === 'month') return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  const weekday = (d.getUTCDay() + 6) % 7; // Monday = 0
  return new Date(d.getTime() - weekday * 86_400_000);
};

const labelFor = (date: Date, bucket: 'week' | 'month'): string =>
  bucket === 'month'
    ? date.toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' })
    : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

export async function lendingInsights(range: Range): Promise<LendingInsights> {
  const spec = RANGES.find((r) => r.value === range)!;
  const now = new Date();
  const since = new Date(now.getTime() - spec.days * 86_400_000);
  const before = new Date(since.getTime() - spec.days * 86_400_000);
  const sinceIso = since.toISOString();

  const [apps, enquiries, funnel, products, counties, previous, response] = await Promise.all([
    all<{ created_at: string; amount_cents: number }>(
      'SELECT created_at, amount_cents FROM web_application WHERE created_at >= ?', sinceIso,
    ),
    all<{ created_at: string }>('SELECT created_at FROM web_enquiry WHERE created_at >= ?', sinceIso),
    all<{ status: ApplicationStatus; n: number; cents: number }>(
      `SELECT status, COUNT(*)::int AS n, COALESCE(SUM(amount_cents),0)::bigint AS cents
       FROM web_application WHERE created_at >= ? GROUP BY status`, sinceIso,
    ),
    all<{ key: string; label: string; n: number; cents: number }>(
      `SELECT COALESCE(p.slug, 'none') AS key, COALESCE(p.name, 'Product removed') AS label,
              COUNT(*)::int AS n, COALESCE(SUM(a.amount_cents),0)::bigint AS cents
       FROM web_application a LEFT JOIN web_product p ON p.id = a.product_id
       WHERE a.created_at >= ? GROUP BY p.slug, p.name ORDER BY cents DESC`, sinceIso,
    ),
    all<{ key: string; label: string; n: number; cents: number }>(
      `SELECT COALESCE(NULLIF(a.county,''), a.country, 'Not given') AS key, COALESCE(NULLIF(a.county,''), a.country, 'Not given') AS label,
              COUNT(*)::int AS n, COALESCE(SUM(a.amount_cents),0)::bigint AS cents
       FROM web_application a WHERE a.created_at >= ? GROUP BY 1, 2 ORDER BY n DESC LIMIT 8`, sinceIso,
    ),
    one<{ applications: number; cents: number }>(
      `SELECT COUNT(*)::int AS applications, COALESCE(SUM(amount_cents),0)::bigint AS cents
       FROM web_application WHERE created_at >= ? AND created_at < ?`, before.toISOString(), sinceIso,
    ),
    one<{ hours: number | null }>(
      `SELECT percentile_cont(0.5) WITHIN GROUP (
                ORDER BY EXTRACT(EPOCH FROM (handled_at::timestamptz - created_at::timestamptz)) / 3600
              )::float AS hours
       FROM web_application WHERE handled_at IS NOT NULL AND created_at >= ?`, sinceIso,
    ),
  ]);

  /* Buckets: every week (or month) in the range, empty ones included, so the chart has no gaps. */
  const buckets: Bucket[] = [];
  for (let cursor = startOf(since, spec.bucket); cursor <= now;) {
    buckets.push({ label: labelFor(cursor, spec.bucket), start: cursor.toISOString(), applications: 0, cents: 0, enquiries: 0 });
    cursor = spec.bucket === 'month'
      ? new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1))
      : new Date(cursor.getTime() + 7 * 86_400_000);
  }
  const bucketOf = (iso: string): Bucket | undefined => {
    const key = startOf(new Date(iso), spec.bucket).toISOString();
    return buckets.find((b) => b.start === key);
  };
  for (const app of apps) {
    const b = bucketOf(app.created_at);
    if (b) { b.applications += 1; b.cents += Number(app.amount_cents); }
  }
  for (const enquiry of enquiries) {
    const b = bucketOf(enquiry.created_at);
    if (b) b.enquiries += 1;
  }

  const byStatus = new Map(funnel.map((row) => [row.status, row]));
  const statusSlices: Slice[] = APPLICATION_STATUSES.map((s) => ({
    key: s.value, label: s.label, n: byStatus.get(s.value)?.n ?? 0, cents: Number(byStatus.get(s.value)?.cents ?? 0),
  }));

  return {
    range,
    buckets,
    funnel: statusSlices,
    products: products.map((p) => ({ ...p, cents: Number(p.cents) })),
    counties: counties.map((c) => ({ ...c, cents: Number(c.cents) })),
    totals: {
      applications: apps.length,
      cents: apps.reduce((sum, a) => sum + Number(a.amount_cents), 0),
      enquiries: enquiries.length,
      disbursed: byStatus.get('DISBURSED')?.n ?? 0,
      disbursedCents: Number(byStatus.get('DISBURSED')?.cents ?? 0),
      declined: byStatus.get('DECLINED')?.n ?? 0,
    },
    previous: { applications: previous?.applications ?? 0, cents: Number(previous?.cents ?? 0) },
    responseHours: response?.hours ?? null,
  };
}
