import Link from 'next/link';
import { requirePage } from '@/lib/auth.ts';
import { canAction } from '@/lib/permissions.ts';
import { adminProducts } from '@/lib/content.ts';
import { formatBp, formatMoneyCompact } from '@/lib/format.ts';
import { AUDIENCES, CALC_MODES } from '@/lib/types.ts';
import { RowFilter } from '../ui.tsx';

export const metadata = { title: 'Loan products' };

/**
 * What Jukiwa Credit lends, on what indicative terms.
 *
 * Every calculator, product page and the application form read their limits from these rows, so
 * this is the screen where a change of pricing happens — and the audit trail records the old and
 * new rate whenever one does.
 */
export default async function ProductsPage() {
  const user = await requirePage('PRODUCTS');
  const products = await adminProducts();

  return (
    <>
      <div className="panel">
        <header>
          <div>
            <h2>Loan products</h2>
            <p>{products.filter((p) => p.is_published).length} of {products.length} offered on the website. Rates shown to customers are labelled indicative everywhere they appear.</p>
          </div>
          <span style={{ flex: 1 }} />
          {canAction(user, 'PRODUCTS_CREATE') ? <Link href="/admin/products/new" className="btn btn-primary">New product</Link> : null}
        </header>
        <div className="body">
          <RowFilter placeholder="Search products…">
            <div className="table-wrap">
              <table className="list">
                <thead>
                  <tr><th>Product</th><th>Method</th><th className="num">Rate / month</th><th className="num">Range</th><th className="num">Term</th><th className="num">Applications</th><th>On the site</th></tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <Link href={`/admin/products/${p.id}`} className="row-link">{p.icon} {p.name}</Link>
                        <span className="sub">{AUDIENCES.find((a) => a.value === p.audience)?.label}{p.is_featured ? ' · featured' : ''}</span>
                      </td>
                      <td>
                        {CALC_MODES.find((m) => m.value === p.calc_mode)?.label}
                        {p.calc_mode === 'RENT_ADVANCE' ? <span className="sub">up to {p.rent_multiple_max}× rent</span> : null}
                      </td>
                      <td className="num">{formatBp(p.rate_pm_bp)}<span className="sub">{formatBp(p.fee_bp)} fee</span></td>
                      <td className="num money">{formatMoneyCompact(p.min_amount_cents)} – {formatMoneyCompact(p.max_amount_cents)}</td>
                      <td className="num">{p.min_term_months}–{p.max_term_months} mo</td>
                      <td className="num">
                        {p.applications ? <Link href={`/admin/applications?status=ALL&product=${p.id}`}>{p.applications}</Link> : 0}
                      </td>
                      <td>{p.is_published ? <span className="badge badge-ok">Published</span> : <span className="badge">Hidden</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </RowFilter>
        </div>
      </div>
    </>
  );
}
