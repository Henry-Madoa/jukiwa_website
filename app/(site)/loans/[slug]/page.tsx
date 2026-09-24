import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getFaqs, getProduct, getProducts, getSettings, lines, toTerms } from '@/lib/site.ts';
import { formatBp, formatMoneyCompact } from '@/lib/format.ts';
import { AUDIENCES } from '@/lib/types.ts';
import { siteUrl } from '@/lib/urls.ts';
import { LoanCalculator } from '../../calculator.tsx';
import { EnquiryForm } from '../../forms.tsx';
import { CtaBand, FaqList, PageHero, ProductCard } from '../../blocks.tsx';
import { Icon } from '../../icons.tsx';
import { JsonLd, Prose } from '../../prose.tsx';

export async function generateStaticParams() {
  return (await getProducts()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<'/loans/[slug]'>): Promise<Metadata> {
  const product = await getProduct((await params).slug);
  if (!product) return { title: 'Loan not found' };
  return {
    title: product.name,
    description: product.summary ?? product.tagline ?? undefined,
    alternates: { canonical: `/loans/${product.slug}` },
    openGraph: { title: `${product.name} — ${product.tagline ?? ''}`, description: product.summary ?? undefined },
  };
}

/** Which questions belong beside which product. */
const FAQ_FOR: Record<string, string[]> = {
  RENT_ADVANCE: ['RENT_ADVANCE', 'REPAYMENT'],
  REDUCING: ['LOANS', 'REPAYMENT'],
  FLAT: ['LOANS', 'REPAYMENT'],
};

export default async function ProductPage({ params }: PageProps<'/loans/[slug]'>) {
  const { slug } = await params;
  const [product, products, faqs, company] = await Promise.all([getProduct(slug), getProducts(), getFaqs(), getSettings()]);
  if (!product) notFound();

  const isRent = product.calc_mode === 'RENT_ADVANCE';
  const features = lines(product.features);
  const requirements = lines(product.requirements);
  const related = faqs.filter((f) => FAQ_FOR[product.calc_mode]?.includes(f.category) || (product.audience === 'DIASPORA' && f.category === 'DIASPORA')).slice(0, 5);
  const others = products.filter((p) => p.id !== product.id).slice(0, 3);

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'LoanOrCredit',
          name: product.name,
          description: product.summary,
          url: `${siteUrl()}/loans/${product.slug}`,
          currency: 'KES',
          amount: { '@type': 'MonetaryAmount', currency: 'KES', minValue: product.min_amount_cents / 100, maxValue: product.max_amount_cents / 100 },
          loanTerm: { '@type': 'QuantitativeValue', minValue: product.min_term_months, maxValue: product.max_term_months, unitCode: 'MON' },
          provider: { '@type': 'FinancialService', name: company.name },
        }}
      />

      <PageHero
        eyebrow={`${product.icon ?? ''} ${AUDIENCES.find((a) => a.value === product.audience)?.label ?? 'Loan'}`}
        title={product.name}
        lead={product.tagline}
        crumbs={[{ href: '/loans', label: 'Loans' }, { href: `/loans/${product.slug}`, label: product.name }]}
      >
        <div className="facts-row">
          <div className="fact"><span>{isRent ? 'Advance' : 'Amount'}</span><b>{isRent ? `Up to ${product.rent_multiple_max}× rent` : `${formatMoneyCompact(product.min_amount_cents)} – ${formatMoneyCompact(product.max_amount_cents)}`}</b></div>
          <div className="fact"><span>Term</span><b>{product.min_term_months}–{product.max_term_months} months</b></div>
          <div className="fact"><span>Indicative rate</span><b>{formatBp(product.rate_pm_bp)} a month</b></div>
          <div className="fact"><span>Repaid</span><b>{isRent ? 'From the rent' : product.calc_mode === 'FLAT' ? 'Flat rate' : 'Reducing balance'}</b></div>
        </div>
        <div className="btn-row">
          <Link href={`/apply?product=${product.slug}`} className="btn btn-accent btn-lg">Apply for {product.name.toLowerCase()} <Icon name="arrow" size={18} data-arrow="" /></Link>
          <a href="#calculator" className="btn btn-light btn-lg"><Icon name="calculator" size={18} /> Work out the cost</a>
        </div>
      </PageHero>

      <section className="section">
        <div className="wrap product-hero-grid">
          <div className="stack" style={{ '--stack': '36px' } as React.CSSProperties}>
            <div className="stack">
              <span className="eyebrow">How it works</span>
              <p className="lead" style={{ color: 'var(--ink)' }}>{product.summary}</p>
              <Prose text={product.body} />
            </div>
            <div className="two-col">
              {features.length ? (
                <div className="card">
                  <h3>What you get</h3>
                  <ul className="ticks">{features.map((f) => <li key={f}>{f}</li>)}</ul>
                </div>
              ) : null}
              {requirements.length ? (
                <div className="card" style={{ background: 'var(--cream)' }}>
                  <h3>What to bring to the branch</h3>
                  <ul className="ticks">{requirements.map((r) => <li key={r}>{r}</li>)}</ul>
                  <p className="tiny muted" style={{ marginTop: 16 }}>Documents are seen in person — never uploaded to this website.</p>
                </div>
              ) : null}
            </div>
          </div>

          <div id="calculator" className="side-sticky">
            <LoanCalculator products={[toTerms(product)]} initial={product.slug} variant="single" title={isRent ? 'What could your rent unlock?' : 'What would it cost?'} />
          </div>
        </div>
      </section>

      {related.length ? (
        <section className="section section-soft">
          <div className="wrap split" style={{ alignItems: 'start' }}>
            <div className="stack">
              <span className="eyebrow">Questions</span>
              <h2 className="display-2">About the {product.name.toLowerCase()}.</h2>
              <FaqList faqs={related} open={1} />
            </div>
            <div className="form-card">
              <h3 className="display-3" style={{ marginBottom: 8 }}>Talk to a credit officer</h3>
              <p className="muted" style={{ marginBottom: 20 }}>Leave your number and we will call you about the {product.name.toLowerCase()}.</p>
              <EnquiryForm kind="CALLBACK" sourcePage={`/loans/${product.slug}`} productId={product.id} />
            </div>
          </div>
        </section>
      ) : null}

      {others.length ? (
        <section className="section">
          <div className="wrap">
            <div className="section-head"><span className="eyebrow">Also from Jukiwa Credit</span><h2 className="display-2">Other ways we can help.</h2></div>
            <div className="product-grid">{others.map((p) => <ProductCard key={p.id} product={p} />)}</div>
          </div>
        </section>
      ) : null}

      <CtaBand phone={company.phone_primary} />
    </>
  );
}
