import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { after } from 'next/server';
import { countView, getPost, getPosts, getSettings } from '@/lib/site.ts';
import { cdn } from '@/lib/cloudinary.ts';
import { formatDate } from '@/lib/format.ts';
import { siteUrl } from '@/lib/urls.ts';
import { POST_CATEGORIES } from '@/lib/types.ts';
import { CtaBand, PostCard } from '../../blocks.tsx';
import { Icon } from '../../icons.tsx';
import { JsonLd, Prose } from '../../prose.tsx';

export async function generateMetadata({ params }: PageProps<'/insights/[slug]'>): Promise<Metadata> {
  const post = await getPost((await params).slug);
  if (!post) return { title: 'Article not found' };
  return {
    title: post.title,
    description: post.excerpt ?? undefined,
    alternates: { canonical: `/insights/${post.slug}` },
    openGraph: { type: 'article', title: post.title, description: post.excerpt ?? undefined, images: post.image_url ? [{ url: cdn(post.image_url, { width: 1200, height: 630 }) }] : undefined },
  };
}

export default async function ArticlePage({ params }: PageProps<'/insights/[slug]'>) {
  const { slug } = await params;
  const [post, company] = await Promise.all([getPost(slug), getSettings()]);
  if (!post) notFound();
  const more = (await getPosts({ limit: 4 })).filter((p) => p.id !== post.id).slice(0, 3);
  // Counted after the response is sent, so a slow database never slows the reader down.
  after(() => countView(post.id));
  const url = `${siteUrl()}/insights/${post.slug}`;

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: post.title,
          description: post.excerpt,
          datePublished: post.published_at,
          dateModified: post.updated_at ?? post.published_at,
          image: post.image_url ? [post.image_url] : undefined,
          author: { '@type': 'Organization', name: company.name },
          publisher: { '@type': 'Organization', name: company.name },
          mainEntityOfPage: url,
        }}
      />
      <article>
        <header className="article-hero">
          <div className="wrap wrap-narrow">
            <nav className="crumbs" aria-label="Breadcrumb" style={{ color: 'var(--muted)' }}>
              <Link href="/">Home</Link><span aria-hidden="true">/</span><Link href="/insights">Insights</Link>
            </nav>
            <div className="post-meta" style={{ marginTop: 24 }}>
              <span className="chip chip-brand">{POST_CATEGORIES.find((c) => c.value === post.category)?.label}</span>
              <span>{formatDate(post.published_at)}</span>
              {post.author ? <span>· {post.author}</span> : null}
            </div>
            <h1 className="display-2" style={{ marginTop: 18 }}>{post.title}</h1>
            {post.excerpt ? <p className="lead" style={{ marginTop: 18 }}>{post.excerpt}</p> : null}
          </div>
          {post.image_url ? (
            <div className="wrap">
              <div className="article-cover"><img src={cdn(post.image_url, { width: 1600, height: 686 })} alt="" /></div>
            </div>
          ) : null}
        </header>
        <div className="section-tight">
          <div className="wrap wrap-narrow">
            <Prose text={post.body} />
            <div className="btn-row" style={{ marginTop: 40, paddingTop: 28, borderTop: '1px solid var(--line)' }}>
              <span className="muted small">Share:</span>
              <a className="btn btn-ghost btn-sm" href={`https://wa.me/?text=${encodeURIComponent(`${post.title} ${url}`)}`} target="_blank" rel="noreferrer"><Icon name="whatsapp" size={16} /> WhatsApp</a>
              <a className="btn btn-ghost btn-sm" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target="_blank" rel="noreferrer"><Icon name="facebook" size={16} /> Facebook</a>
              <a className="btn btn-ghost btn-sm" href={`https://x.com/intent/post?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(url)}`} target="_blank" rel="noreferrer"><Icon name="x" size={16} /> X</a>
            </div>
          </div>
        </div>
      </article>

      {more.length ? (
        <section className="section section-cream">
          <div className="wrap">
            <div className="section-head"><span className="eyebrow">Keep reading</span><h2 className="display-2">More insights.</h2></div>
            <div className="post-grid">{more.map((p) => <PostCard key={p.id} post={p} />)}</div>
          </div>
        </section>
      ) : null}
      <CtaBand phone={company.phone_primary} />
    </>
  );
}
