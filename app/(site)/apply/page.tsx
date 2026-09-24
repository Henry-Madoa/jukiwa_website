import type { Metadata } from 'next';
import { getBranches, getProductTerms, getSettings } from '@/lib/site.ts';
import { ApplyForm } from './apply-form.tsx';

export const metadata: Metadata = {
  title: 'Apply online',
  description: 'Apply for a Jukiwa Credit loan in about five minutes. A credit officer calls you back — no documents uploaded online.',
  alternates: { canonical: '/apply' },
};

/** Query-string values are only ever hints for the form's starting position; the server re-quotes. */
const one = (value: string | string[] | undefined): string | undefined => (typeof value === 'string' ? value.replace(/[^\w.-]/g, '').slice(0, 60) : undefined);

export default async function ApplyPage({ searchParams }: PageProps<'/apply'>) {
  const [params, products, branches, company] = await Promise.all([searchParams, getProductTerms(), getBranches(), getSettings()]);

  return (
    <>
      <section className="page-hero" style={{ paddingBottom: 140 }}>
        <div className="wrap">
          <span className="eyebrow">Apply online · about 5 minutes</span>
          <h1 className="display-2">Let&rsquo;s get you <span className="hl">funded</span>.</h1>
          <p className="lead">Four short steps. No documents, no ID numbers — just enough for a credit officer to call you with a real answer.</p>
        </div>
      </section>
      <section style={{ marginTop: -110, paddingBottom: 96, position: 'relative' }}>
        <div className="wrap">
          {products.length ? (
            <ApplyForm
              products={products}
              branches={branches.map((b) => ({ id: b.id, name: b.name }))}
              initial={{ product: one(params.product), amount: one(params.amount), term: one(params.term), rent: one(params.rent) }}
              whatsapp={company.whatsapp_number}
            />
          ) : (
            <div className="form-card"><p>Applications open soon. Please call us on {company.phone_primary}.</p></div>
          )}
        </div>
      </section>
    </>
  );
}
