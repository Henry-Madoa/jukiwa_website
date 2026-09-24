import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePage } from '@/lib/auth.ts';
import { canAction } from '@/lib/permissions.ts';
import { adminProduct } from '@/lib/content.ts';
import { toTerms } from '@/lib/site.ts';
import { quote, suggestedAmount } from '@/lib/loan-math.ts';
import { formatMoney } from '@/lib/format.ts';
import { saveProduct, deleteProduct } from '@/app/actions/content.ts';
import { ActionForm, ActionFormRedirect, ConfirmSubmit, Submit } from '../../ui.tsx';
import { ProductFields } from '../product-fields.tsx';

export const metadata = { title: 'Loan product' };

export default async function ProductCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePage('PRODUCTS');
  const product = await adminProduct(Number(id));
  if (!product) notFound();

  const mayEdit = canAction(user, 'PRODUCTS_UPDATE');
  const terms = toTerms(product);
  // A worked example at the current terms — what a customer on the website sees for a typical loan.
  const exampleRent = product.calc_mode === 'RENT_ADVANCE' ? Math.round(suggestedAmount(terms) / Math.max(1, product.rent_multiple_max)) : null;
  const example = quote(terms, {
    amountCents: suggestedAmount(terms),
    termMonths: Math.round((product.min_term_months + product.max_term_months) / 2),
    monthlyRentCents: exampleRent,
  });

  return (
    <>
      <div className="crumb"><Link href="/admin/products">Loan products</Link><span aria-hidden="true">›</span>{product.name}</div>

      <div className="panel">
        <header>
          <div>
            <h2>{product.icon} {product.name}</h2>
            <p>
              At today&rsquo;s terms, {formatMoney(example.principalCents)} over {example.termMonths} months
              {exampleRent ? ` (against rent of ${formatMoney(exampleRent)})` : ''} is {formatMoney(example.monthlyCents)} a month,
              {' '}{formatMoney(example.totalCents)} in total including the fee.
            </p>
          </div>
          <span style={{ flex: 1 }} />
          <Link href={`/loans/${product.slug}`} target="_blank" className="btn btn-ghost btn-xs">View on the site ↗</Link>
        </header>
      </div>

      <ActionForm action={saveProduct} success="Saved. The website is using the new terms.">
        <input type="hidden" name="id" value={product.id} />
        <fieldset disabled={!mayEdit} style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 20 }}>
          <ProductFields product={product} />
          {mayEdit ? <div><Submit>Save product</Submit></div> : null}
        </fieldset>
      </ActionForm>

      {canAction(user, 'PRODUCTS_DELETE') ? (
        <div className="panel">
          <header><h2>Delete this product</h2></header>
          <div className="body" style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <p className="help" style={{ margin: 0, flex: '1 1 320px' }}>
              Unpublishing is nearly always better — it withdraws the product from the site and keeps its history.
              Deleting keeps the applications but they lose the link to the product.
            </p>
            <ActionFormRedirect action={deleteProduct} to="/admin/products">
              <input type="hidden" name="id" value={product.id} />
              <ConfirmSubmit message={`Delete ${product.name}?`} className="btn btn-danger">Delete product</ConfirmSubmit>
            </ActionFormRedirect>
          </div>
        </div>
      ) : null}
    </>
  );
}
