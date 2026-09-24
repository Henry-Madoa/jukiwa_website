import Link from 'next/link';
import type { Metadata } from 'next';
import { getProducts, getSettings } from '@/lib/site.ts';
import { formatBp, formatMoneyCompact } from '@/lib/format.ts';
import { AUDIENCES } from '@/lib/types.ts';
import { CtaBand, PageHero, ProductCard } from '../blocks.tsx';
import { Icon } from '../icons.tsx';

export const metadata: Metadata = {
  title: 'Loans',
  description: 'Rent advances, building advances, property purchase finance, diaspora advances, land loans and business loans from Jukiwa Credit.',
  alternates: { canonical: '/loans' },
};

/**
 * Every product, then the same products side by side — because the second question anybody asks
 * after "what do you offer" is "which one is for me".
 */
export default async function LoansPage() {
  const [company, products] = await Promise.all([getSettings(), getProducts()]);

  return (
    <>
      <PageHero
        eyebrow="Our loans"
        title={<>Finance for every stage of <span className="hl">owning property</span>.</>}
        lead="Buying land, finishing a building, letting it, or selling it — there is a Jukiwa product for each, and a person to talk it through with."
        crumbs={[{ href: '/loans', label: 'Loans' }]}
      >
        <div className="btn-row">
          <Link href="/calculator" className="btn btn-accent btn-lg"><Icon name="calculator" size={18} /> Compare the cost</Link>
          <Link href="/apply" className="btn btn-light btn-lg">Apply now</Link>
        </div>
      </PageHero>

      <section className="section">
        <div className="wrap">
          <div className="product-grid">
            {products.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      </section>

      <section className="section section-soft">
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">Side by side</span>
            <h2 className="display-2">Which one is for me?</h2>
            <p className="lead">Indicative terms. Your exact rate and fees are set out in your offer letter before you sign anything.</p>
          </div>
          <div className="schedule-scroll" style={{ maxHeight: 'none', background: '#fff' }}>
            <div className="schedule" style={{ marginTop: 0 }}>
              <table>
                <thead>
                  <tr><th>Loan</th><th>For</th><th>Amount</th><th>Term</th><th>Rate from</th><th>How it is repaid</th></tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id}>
                      <td><Link href={`/loans/${p.slug}`} style={{ color: 'var(--ink)', fontWeight: 700, textDecoration: 'none' }}>{p.icon} {p.name}</Link></td>
                      <td>{AUDIENCES.find((a) => a.value === p.audience)?.label}</td>
                      <td>{p.calc_mode === 'RENT_ADVANCE' ? `Up to ${p.rent_multiple_max}× rent` : `${formatMoneyCompact(p.min_amount_cents)} – ${formatMoneyCompact(p.max_amount_cents)}`}</td>
                      <td>{p.min_term_months}–{p.max_term_months} months</td>
                      <td>{formatBp(p.rate_pm_bp)} / month</td>
                      <td>{p.calc_mode === 'RENT_ADVANCE' ? 'From the rent we collect' : p.calc_mode === 'FLAT' ? 'On sale, or monthly' : 'Monthly, reducing balance'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <CtaBand phone={company.phone_primary} title={<>Not sure which fits? <span className="hl">Ask us.</span></>} body="Tell us about your property and what you want to do with it. A credit officer will tell you honestly which product suits — or whether none does." />
    </>
  );
}
