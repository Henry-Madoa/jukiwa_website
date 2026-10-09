import 'server-only';

/*
 * The public website's read layer.
 *
 * Every page under app/(site) reads through this module and nowhere else. Three rules are
 * enforced here rather than trusted to each page:
 *
 *   1. Published only. Nothing draft, unpublished or closed escapes these queries, so a page
 *      cannot accidentally render a product the Credit Manager has withdrawn.
 *   2. Read only. The site's writes (application, enquiry, callback, partner, newsletter) go
 *      through lib/inbox.ts, which validates and rate-limits them.
 *   3. No personal data, ever. This database holds the applications visitors send, and nothing
 *      here reads them.
 */
import { cache } from 'react';
import { all, one, run } from './db.ts';
import type { Branch, Faq, Post, Product, ProductTerms, Settings, TeamMember, Testimonial, Vacancy } from './types.ts';

/* ------------------------------------------------------------------ the company */

/**
 * The company's own record: name, tagline, contacts, colours. Read by every single page, so
 * React's `cache` dedupes it to one query per request — the header, the footer and the page body
 * all ask for it, and all three get the same row.
 */
export const getSettings = cache(async (): Promise<Settings> => {
  const row = await one<Settings>('SELECT * FROM web_setting WHERE id = 1');
  if (row) return row;
  // A database that has been created but not set up yet still has to render a page.
  return {
    id: 1, name: 'Jukiwa Credit Limited', currency_symbol: 'KES',
    brand_primary: '#1e5c35', brand_accent: '#d4a94a', brand_deep: '#0b2a18',
  } as Settings;
});

/* ---------------------------------------------------------------------- products */

export const getProducts = cache((): Promise<Product[]> =>
  all<Product>('SELECT * FROM web_product WHERE is_published ORDER BY sort, name'));

export async function getProduct(slug: string): Promise<Product | undefined> {
  return (await getProducts()).find((p) => p.slug === slug);
}

/** Just what the calculator needs, so a client bundle never carries a product's long copy. */
export const toTerms = (p: Product): ProductTerms => ({
  id: p.id, name: p.name, slug: p.slug, calc_mode: p.calc_mode, rate_pm_bp: p.rate_pm_bp, fee_bp: p.fee_bp,
  min_amount_cents: p.min_amount_cents, max_amount_cents: p.max_amount_cents,
  min_term_months: p.min_term_months, max_term_months: p.max_term_months,
  rent_multiple_max: p.rent_multiple_max, icon: p.icon, tagline: p.tagline,
});

export async function getProductTerms(): Promise<ProductTerms[]> {
  return (await getProducts()).map(toTerms);
}

/** One product's features or requirements, which the admin types one per line. */
export const lines = (value: string | null | undefined): string[] =>
  String(value ?? '').split('\n').map((line) => line.replace(/^[-•*]\s*/, '').trim()).filter(Boolean);

/* --------------------------------------------------------------- places and people */

export const getBranches = cache((): Promise<Branch[]> =>
  all<Branch>('SELECT * FROM web_branch WHERE is_published ORDER BY sort, name'));

export const getTeam = cache((): Promise<(TeamMember & { branch_name: string | null })[]> =>
  all(
    `SELECT t.*, b.name AS branch_name FROM web_team t LEFT JOIN web_branch b ON b.id = t.branch_id
     WHERE t.is_published ORDER BY t.sort, t.name`,
  ));

/* ---------------------------------------------------------------------- publishing */

export const getTestimonials = cache((): Promise<Testimonial[]> =>
  all<Testimonial>('SELECT * FROM web_testimonial WHERE is_published ORDER BY sort, id'));

export const getFaqs = cache((): Promise<Faq[]> =>
  all<Faq>('SELECT * FROM web_faq WHERE is_published ORDER BY sort, id'));

const nowIso = (): string => new Date().toISOString();

export async function getPosts(options: { category?: string | null; search?: string; limit?: number } = {}): Promise<Post[]> {
  const limit = Math.max(1, Math.min(100, Math.round(options.limit ?? 30)));
  return all<Post>(
    `SELECT * FROM web_post
     WHERE is_published AND published_at <= @now
       ${options.category ? 'AND category = @category' : ''}
       AND (title ILIKE @like OR COALESCE(excerpt,'') ILIKE @like OR body ILIKE @like)
     ORDER BY is_pinned DESC, published_at DESC LIMIT ${limit}`,
    { now: nowIso(), category: options.category ?? null, like: `%${(options.search ?? '').trim()}%` },
  );
}

export const getPost = (slug: string): Promise<Post | undefined> =>
  one<Post>('SELECT * FROM web_post WHERE slug = ? AND is_published AND published_at <= ?', slug, nowIso());

/** A read is counted, never trusted: the number is for the editor's curiosity, not a metric. */
export async function countView(id: number): Promise<void> {
  try { await run('UPDATE web_post SET views = views + 1 WHERE id = ?', id); } catch { /* never block a read */ }
}

/** Open vacancies: published, and either undated or not yet closed. */
export const getVacancies = cache((): Promise<Vacancy[]> =>
  all<Vacancy>(
    `SELECT * FROM web_vacancy
     WHERE is_published AND (closes_on IS NULL OR closes_on >= ?)
     ORDER BY created_at DESC`,
    nowIso().slice(0, 10),
  ));

export const getVacancy = (slug: string): Promise<Vacancy | undefined> =>
  one<Vacancy>('SELECT * FROM web_vacancy WHERE slug = ? AND is_published', slug);
