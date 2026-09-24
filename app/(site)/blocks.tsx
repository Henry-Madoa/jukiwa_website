import type { ReactNode } from 'react';
import Link from 'next/link';
import { cdn } from '@/lib/cloudinary.ts';
import { formatDate, formatMoneyCompact, initials, telHref } from '@/lib/format.ts';
import { AUDIENCES, POST_CATEGORIES, type Faq, type Post, type Product, type Testimonial } from '@/lib/types.ts';
import { Icon } from './icons.tsx';

/*
 * The pieces every public page is assembled from. Server components throughout: nothing here
 * needs the browser, so none of it costs the visitor a byte of JavaScript.
 */

export function PageHero({ eyebrow, title, lead, crumbs, children }: {
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  crumbs?: { href: string; label: string }[];
  children?: ReactNode;
}) {
  return (
    <section className="page-hero">
      <div className="wrap">
        {crumbs ? (
          <nav className="crumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            {crumbs.map((c) => <span key={c.href}><span aria-hidden="true">/ </span><Link href={c.href}>{c.label}</Link></span>)}
          </nav>
        ) : null}
        {eyebrow ? <div style={{ marginTop: crumbs ? 22 : 0 }}><span className="eyebrow">{eyebrow}</span></div> : null}
        <h1 className="display-2">{title}</h1>
        {lead ? <p className="lead">{lead}</p> : null}
        {children}
      </div>
    </section>
  );
}

export function ProductCard({ product }: { product: Product }) {
  const audience = AUDIENCES.find((a) => a.value === product.audience)?.label;
  return (
    <Link href={`/loans/${product.slug}`} className={`product-card ${product.is_featured ? 'featured' : ''}`} data-reveal="">
      <span className="product-ico" aria-hidden="true">{product.icon}</span>
      <div>
        <span className="tiny muted" style={{ fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{audience}</span>
        <h3 style={{ marginTop: 6 }}>{product.name}</h3>
      </div>
      <p>{product.summary}</p>
      <div className="product-meta">
        {product.calc_mode === 'RENT_ADVANCE'
          ? <span className="chip chip-accent">Up to {product.rent_multiple_max}× rent</span>
          : <span className="chip chip-brand">Up to {formatMoneyCompact(product.max_amount_cents)}</span>}
        <span className="chip">{product.min_term_months}–{product.max_term_months} months</span>
      </div>
      <span className="link-arrow">See how it works <Icon name="arrow" size={18} /></span>
    </Link>
  );
}

export function PostCard({ post }: { post: Post }) {
  return (
    <Link href={`/insights/${post.slug}`} className="post-card" data-reveal="">
      <div className="media">
        {post.image_url ? <img src={cdn(post.image_url, { width: 720, height: 450 })} alt="" loading="lazy" /> : null}
      </div>
      <div className="body">
        <div className="post-meta">
          <span className="chip chip-brand">{POST_CATEGORIES.find((c) => c.value === post.category)?.label}</span>
          <span>{formatDate(post.published_at)}</span>
        </div>
        <h3>{post.title}</h3>
        {post.excerpt ? <p>{post.excerpt}</p> : null}
      </div>
    </Link>
  );
}

export function QuoteCard({ t }: { t: Testimonial }) {
  return (
    <figure className="quote" style={{ margin: 0 }}>
      <div className="stars" aria-label={`${t.rating} out of 5`}>
        {Array.from({ length: t.rating }, (_, i) => <Icon key={i} name="star" size={18} />)}
      </div>
      <blockquote>{t.quote}</blockquote>
      <figcaption>
        <span className="avatar-round">{t.photo_url ? <img src={cdn(t.photo_url, { width: 96, height: 96 })} alt="" /> : initials(t.name)}</span>
        <span><b>{t.name}</b>{t.role_title ? <small>{t.role_title}</small> : null}</span>
      </figcaption>
    </figure>
  );
}

export function FaqList({ faqs, open = 0 }: { faqs: Faq[]; open?: number }) {
  return (
    <div className="faq">
      {faqs.map((faq, index) => (
        <details key={faq.id} open={index < open}>
          <summary>{faq.question}<span className="pm" aria-hidden="true" /></summary>
          <div className="answer">{faq.answer}</div>
        </details>
      ))}
    </div>
  );
}

/** The last word on most pages: apply, or talk to a person. */
export function CtaBand({ title, body, phone }: { title?: ReactNode; body?: string; phone?: string | null }) {
  return (
    <section className="section-tight">
      <div className="wrap">
        <div className="cta-band" data-reveal="">
          <div className="stack">
            <h2 className="display-2">{title ?? <>Ready when <span className="hl">you</span> are.</>}</h2>
            <p className="lead">{body ?? 'Apply online in about five minutes. A credit officer calls you back — usually within 30 minutes during office hours.'}</p>
          </div>
          <div className="btn-row" style={{ justifyContent: 'flex-end' }}>
            <Link href="/apply" className="btn btn-accent btn-lg">Start my application <Icon name="arrow" size={18} data-arrow="" /></Link>
            {phone ? <a href={telHref(phone)} className="btn btn-light btn-lg"><Icon name="phone" size={18} /> {phone}</a> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
