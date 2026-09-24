import type { Metadata } from 'next';
import { getFaqs, getProducts, getSettings } from '@/lib/site.ts';
import { FAQ_CATEGORIES } from '@/lib/types.ts';
import { EnquiryForm } from '../forms.tsx';
import { FaqList, PageHero } from '../blocks.tsx';
import { JsonLd } from '../prose.tsx';

export const metadata: Metadata = {
  title: 'Questions & answers',
  description: 'How rent advances, building advances and property loans from Jukiwa Credit work — eligibility, repayment, and borrowing from abroad.',
  alternates: { canonical: '/faqs' },
};

/**
 * Every question the credit team answers on the phone, answered once in public — with FAQPage
 * structured data, so a search engine can show the answer before anybody has to call.
 */
export default async function FaqsPage() {
  const [faqs, products, company] = await Promise.all([getFaqs(), getProducts(), getSettings()]);
  const groups = FAQ_CATEGORIES.filter((c) => faqs.some((f) => f.category === c.value));

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })),
        }}
      />
      <PageHero
        eyebrow="Questions & answers"
        title={<>Straight answers, <span className="hl">before you ask</span>.</>}
        lead={`How our loans work, who qualifies, and how repayment works. Anything else — ask us, and we will add it here.`}
        crumbs={[{ href: '/faqs', label: 'FAQs' }]}
      >
        <nav className="faq-cats" aria-label="Jump to a topic" style={{ marginTop: 26, marginBottom: 0 }}>
          {groups.map((g) => <a key={g.value} href={`#${g.value.toLowerCase()}`} className="flag" style={{ textDecoration: 'none', color: '#fff' }}>{g.label}</a>)}
        </nav>
      </PageHero>

      <section className="section">
        <div className="wrap product-hero-grid">
          <div className="stack" style={{ '--stack': '48px' } as React.CSSProperties}>
            {groups.map((g) => (
              <div key={g.value} id={g.value.toLowerCase()} className="stack">
                <h2 className="display-3">{g.label}</h2>
                <FaqList faqs={faqs.filter((f) => f.category === g.value)} />
              </div>
            ))}
          </div>
          <aside className="side-sticky">
            <div className="form-card">
              <h3 className="display-3" style={{ marginBottom: 8 }}>Still have a question?</h3>
              <p className="muted" style={{ marginBottom: 20 }}>
                Ask it here{company.phone_primary ? `, or call ${company.phone_primary}` : ''}. We reply by the next working day, usually much sooner.
              </p>
              <EnquiryForm kind="ENQUIRY" sourcePage="/faqs" products={products.map((p) => ({ id: p.id, name: p.name }))} />
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
