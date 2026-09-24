import type { MetadataRoute } from 'next';
import { getPosts, getProducts, getVacancies } from '@/lib/site.ts';
import { siteUrl } from '@/lib/urls.ts';

/**
 * Every public page, built from the database so a new product or article is in the sitemap the
 * moment it is published. The loan pages carry the highest priority: they are what people search for.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const [products, posts, vacancies] = await Promise.all([getProducts(), getPosts({ limit: 100 }), getVacancies()]);
  const now = new Date();

  const fixed: [path: string, priority: number, change: 'daily' | 'weekly' | 'monthly' | 'yearly'][] = [
    ['/', 1, 'weekly'], ['/loans', 0.9, 'weekly'], ['/calculator', 0.8, 'monthly'], ['/apply', 0.9, 'monthly'],
    ['/diaspora', 0.8, 'monthly'], ['/about', 0.6, 'monthly'], ['/branches', 0.6, 'monthly'], ['/insights', 0.7, 'weekly'],
    ['/faqs', 0.6, 'monthly'], ['/careers', 0.5, 'weekly'], ['/contact', 0.6, 'yearly'], ['/privacy', 0.2, 'yearly'], ['/terms', 0.2, 'yearly'],
  ];

  return [
    ...fixed.map(([path, priority, changeFrequency]) => ({ url: `${base}${path}`, lastModified: now, changeFrequency, priority })),
    ...products.map((p) => ({ url: `${base}/loans/${p.slug}`, lastModified: new Date(p.updated_at ?? p.created_at), changeFrequency: 'monthly' as const, priority: 0.9 })),
    ...posts.map((p) => ({ url: `${base}/insights/${p.slug}`, lastModified: new Date(p.updated_at ?? p.published_at), changeFrequency: 'yearly' as const, priority: 0.6 })),
    ...vacancies.map((v) => ({ url: `${base}/careers/${v.slug}`, lastModified: new Date(v.updated_at ?? v.created_at), changeFrequency: 'weekly' as const, priority: 0.4 })),
  ];
}
