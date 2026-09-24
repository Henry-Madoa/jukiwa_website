import Link from 'next/link';
import type { Metadata } from 'next';
import { getBranches, getFaqs, getProducts, getSettings, toTerms } from '@/lib/site.ts';
import { telHref, whatsappHref } from '@/lib/format.ts';
import { LoanCalculator } from '../calculator.tsx';
import { EnquiryForm } from '../forms.tsx';
import { CtaBand, FaqList, PageHero } from '../blocks.tsx';
import { Flag, Icon } from '../icons.tsx';

export const metadata: Metadata = {
  title: 'For Kenyans abroad',
  description: 'Kenyans in the UK, USA and Canada: let Jukiwa manage your property at home and receive 5–10 times its monthly rent as an advance.',
  alternates: { canonical: '/diaspora' },
};

export default async function DiasporaPage() {
  const [company, products, branches, faqs] = await Promise.all([getSettings(), getProducts(), getBranches(), getFaqs()]);
  const diasporaProducts = products.filter((p) => p.audience === 'DIASPORA' || p.slug === 'property-purchase-finance' || p.slug === 'building-advance');
  const regional = branches.filter((b) => b.kind === 'REGIONAL');

  return (
    <>
      <PageHero
         eyebrow="Kenyans abroad"
        title={<>Your property at home, <span className="hl">working for you abroad</span>.</>}
        lead="From the UK, the USA or Canada: we manage your Kenyan property, advance you 5–10 times its rent, finish the building you started, or buy the plot you have been saving for — and deposit the balance wherever you are."
        crumbs={[{ href: '/diaspora', label: 'Diaspora' }]}
      >
        <div className="flags" style={{ marginTop: 26 }}>
          <span className="flag"><Flag country="gb" /> United Kingdom</span>
          <span className="flag"><Flag country="us" /> United States</span>
          <span className="flag"><Flag country="ca" /> Canada</span>
        </div>
        <div className="btn-row">
          <Link href="/apply?product=diaspora-landlord-advance" className="btn btn-accent btn-lg">Apply from abroad <Icon name="arrow" size={18} data-arrow="" /></Link>
          {company.diaspora_phone ? <a href={telHref(company.diaspora_phone)} className="btn btn-light btn-lg"><Icon name="phone" size={18} /> {company.diaspora_phone}</a> : null}
        </div>
      </PageHero>

      <section className="section">
        <div className="wrap split">
          <div className="stack" style={{ '--stack': '22px' } as React.CSSProperties}>
            <span className="eyebrow">The problem we solve</span>
            <h2 className="display-2">Managing a building from 7,000 km away is hard.</h2>
            <p className="lead">Unreliable caretakers, rent that arrives late or not at all, and no clear picture of what is happening. We have heard it from Kenyans abroad for twenty years — and built our services around it.</p>
            <ul className="ticks">
              <li><span><b>We manage it properly.</b> Rent collection, maintenance and bills, with invoices and receipts for everything.</span></li>
              <li><span><b>You see it in real time.</b> Sign in from any device, in any time zone, to your statements.</span></li>
              <li><span><b>Your rent, advanced.</b> 5–10× the monthly rent as a single advance, recovered from the rent over 12 or 24 months.</span></li>
              <li><span><b>Building and buying, on your behalf.</b> Construction through trusted partners, and purchases protected by KES 500M indemnity cover.</span></li>
            </ul>
          </div>
          {diasporaProducts.length ? (
            <LoanCalculator products={diasporaProducts.map(toTerms)} initial="diaspora-landlord-advance" variant="full" title="Try it with your rent" />
          ) : null}
        </div>
      </section>

      <section className="section section-dark">
        <div className="wrap split" style={{ alignItems: 'start' }}>
          <div className="stack" style={{ '--stack': '22px' } as React.CSSProperties}>
            <span className="eyebrow">Your diaspora desk</span>
            <h2 className="display-2" style={{ color: '#fff' }}>A London office, and a line that answers.</h2>
            <p className="lead">Our diaspora regional office serves the UK, the USA and Canada. Call, message or visit — and sign documents at a Kenyan mission or through an advocate, without flying home.</p>
            <div className="diaspora-card">
              <dl>
                {company.diaspora_phone ? <div><dt>Diaspora line (calls & WhatsApp)</dt><dd><a href={telHref(company.diaspora_phone)}>{company.diaspora_phone}</a></dd></div> : null}
                {company.diaspora_email ? <div><dt>Email</dt><dd><a href={`mailto:${company.diaspora_email}`}>{company.diaspora_email}</a></dd></div> : null}
                {regional.map((b) => <div key={b.id}><dt>{b.name}</dt><dd>{b.address?.split('\n').join(', ')}{b.hours ? ` · ${b.hours}` : ''}</dd></div>)}
              </dl>
              {company.diaspora_phone ? (
                <a href={whatsappHref(company.diaspora_phone, 'Hello Jukiwa, I live abroad and would like to know about the diaspora advance.')} target="_blank" rel="noreferrer" className="btn btn-accent" style={{ marginTop: 22 }}>
                  <Icon name="whatsapp" size={18} /> WhatsApp the diaspora desk
                </a>
              ) : null}
            </div>
          </div>
          <div className="form-card">
            <h3 className="display-3" style={{ marginBottom: 8 }}>We will call you — in your time zone</h3>
            <p className="muted" style={{ marginBottom: 20 }}>Include your country code, and tell us the best time where you are.</p>
            <EnquiryForm kind="CALLBACK" sourcePage="/diaspora" products={diasporaProducts.map((p) => ({ id: p.id, name: p.name }))} />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap wrap-narrow stack">
          <div className="section-head"><span className="eyebrow">Questions</span><h2 className="display-2">From Kenyans abroad.</h2></div>
          <FaqList faqs={faqs.filter((f) => f.category === 'DIASPORA' || f.category === 'RENT_ADVANCE')} open={1} />
        </div>
      </section>

      <CtaBand phone={company.diaspora_phone ?? company.phone_primary} />
    </>
  );
}
