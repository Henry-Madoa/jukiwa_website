import type { Metadata } from 'next';
import { getProductTerms, getSettings } from '@/lib/site.ts';
import { LoanCalculator } from '../calculator.tsx';
import { CtaBand, PageHero } from '../blocks.tsx';

export const metadata: Metadata = {
  title: 'Loan calculator',
  description: 'Work out the monthly repayment on any Jukiwa Credit loan, or how large a rent advance your property could support.',
  alternates: { canonical: '/calculator' },
};

export default async function CalculatorPage({ searchParams }: PageProps<'/calculator'>) {
  const [{ product }, products, company] = await Promise.all([searchParams, getProductTerms(), getSettings()]);

  return (
    <>
      <PageHero
        eyebrow="Loan calculator"
        title={<>Know the numbers <span className="hl">before</span> you call.</>}
        lead="Choose a product, move the sliders, and see the monthly repayment, the total cost and the full month-by-month schedule. Every figure uses our current published rates."
        crumbs={[{ href: '/calculator', label: 'Calculator' }]}
      />
      <section className="section">
        <div className="wrap product-hero-grid calc-page-grid">
          <LoanCalculator products={products} initial={typeof product === 'string' ? product : undefined} variant="full" />
          <div className="stack" style={{ '--stack': '22px' } as React.CSSProperties}>
            <span className="eyebrow">Reading the figures</span>
            <h2 className="display-3">Flat or reducing — why it matters.</h2>
            <p className="muted">
              On a <b>reducing balance</b>, interest is charged only on what you still owe, so each month more of your payment
              goes to the loan itself. It is the fairer way to borrow for a longer term, and paying early saves you interest.
            </p>
            <p className="muted">
              A <b>flat rate</b> charges interest on the original amount for the whole term. It is simple and predictable, and we
              use it only for short advances — recovered from rent, or from a sale — where the difference is small.
            </p>
            <p className="muted">
              With a <b>rent advance</b> you never make a payment yourself. The instalment comes out of the rent Jukiwa collects,
              and the rest is paid to you. The calculator shows how much of each month&rsquo;s rent that is.
            </p>
            <div className="card" style={{ background: 'var(--cream)' }}>
              <h3 style={{ marginBottom: 10 }}>Indicative, and honest about it</h3>
              <p className="small muted">
                These are our published rates for a typical loan of each kind. Your own rate depends on the property and your
                circumstances, and is written into your offer letter — with every fee and the total you will repay — before you sign.
              </p>
            </div>
          </div>
        </div>
      </section>
      <CtaBand phone={company.phone_primary} />
    </>
  );
}
