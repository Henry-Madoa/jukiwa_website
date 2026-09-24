import Link from 'next/link';
import type { Metadata } from 'next';
import { getPosts, getSettings } from '@/lib/site.ts';
import { POST_CATEGORIES } from '@/lib/types.ts';
import { CtaBand, PageHero, PostCard } from '../blocks.tsx';

export const metadata: Metadata = {
  title: 'Insights',
  description: 'Guides to rent advances, building finance and borrowing against property in Kenya, and news from Jukiwa Credit.',
  alternates: { canonical: '/insights' },
};

export default async function InsightsPage({ searchParams }: PageProps<'/insights'>) {
  const { category, q } = await searchParams;
  const active = POST_CATEGORIES.some((c) => c.value === category) ? String(category) : null;
  const search = typeof q === 'string' ? q.slice(0, 80) : '';
  const [posts, company] = await Promise.all([getPosts({ category: active, search, limit: 60 }), getSettings()]);

  return (
    <>
      <PageHero
        eyebrow="Insights"
        title={<>Property money, <span className="hl">explained</span>.</>}
        lead="Plain-English guides to borrowing against property, market insight, and news from Jukiwa Credit."
        crumbs={[{ href: '/insights', label: 'Insights' }]}
      />
      <section className="section">
        <div className="wrap">
          <div className="section-head-row" style={{ alignItems: 'center' }}>
            <nav className="faq-cats" aria-label="Filter by kind" style={{ margin: 0 }}>
              <Link href="/insights" className={`chip ${!active ? 'chip-brand' : ''}`} style={{ padding: '9px 16px', textDecoration: 'none' }}>Everything</Link>
              {POST_CATEGORIES.map((c) => (
                <Link key={c.value} href={`/insights?category=${c.value}`} className={`chip ${active === c.value ? 'chip-brand' : ''}`} style={{ padding: '9px 16px', textDecoration: 'none' }}>{c.label}</Link>
              ))}
            </nav>
            <form method="get" className="form" style={{ display: 'flex', gap: 8, flex: '0 1 360px' }}>
              {active ? <input type="hidden" name="category" value={active} /> : null}
              <label htmlFor="q" className="sr-only">Search insights</label>
              <input id="q" name="q" type="text" defaultValue={search} placeholder="Search guides…" style={{ minHeight: 46 }} />
              <button type="submit" className="btn btn-primary btn-sm">Search</button>
            </form>
          </div>
          {posts.length ? (
            <div className="post-grid">{posts.map((post) => <PostCard key={post.id} post={post} />)}</div>
          ) : (
            <p className="lead">Nothing matches that yet. <Link href="/insights">See everything</Link>.</p>
          )}
        </div>
      </section>
      <CtaBand phone={company.phone_primary} />
    </>
  );
}
