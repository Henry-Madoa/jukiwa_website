import Link from 'next/link';
import { requirePage } from '@/lib/auth.ts';
import { applicationCounts, listApplications } from '@/lib/inbox.ts';
import { adminProducts } from '@/lib/content.ts';
import { formatDateShort, formatMoney, formatMoneyCompact } from '@/lib/format.ts';
import { APPLICATION_STATUSES, OPEN_APPLICATION_STATUSES, type ApplicationStatus } from '@/lib/types.ts';

export const metadata = { title: 'Loan applications' };

/**
 * The lending pipeline the website feeds.
 *
 * Received applications sort to the top and show how long they have waited, because the one
 * number a customer remembers is how long it took somebody to call. Filtering is a GET form, so a
 * filtered list is a link a Credit Manager can send to an officer.
 */
export default async function ApplicationsPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; product?: string }> }) {
  await requirePage('APPLICATIONS');
  const { status = 'OPEN', q = '', product = '' } = await searchParams;
  const filter = status === 'ALL' ? '' : (status === 'OPEN' || APPLICATION_STATUSES.some((s) => s.value === status) ? status : 'OPEN') as ApplicationStatus | 'OPEN' | '';
  const productId = Number(product) || null;

  const [applications, counts, products] = await Promise.all([
    listApplications(filter, q, productId),
    applicationCounts(),
    adminProducts(),
  ]);

  const count = (value: string): number => counts.find((c) => c.status === value)?.n ?? 0;
  const openCount = counts.filter((c) => OPEN_APPLICATION_STATUSES.includes(c.status)).reduce((sum, c) => sum + c.n, 0);
  const total = counts.reduce((sum, c) => sum + c.n, 0);
  const shownCents = applications.reduce((sum, a) => sum + a.amount_cents, 0);
  const href = (next: string) => `/admin/applications?status=${next}${q ? `&q=${encodeURIComponent(q)}` : ''}${productId ? `&product=${productId}` : ''}`;

  return (
    <>
      <div className="panel">
        <header>
          <div>
            <h2>Loan applications</h2>
            <p>
              {applications.length} shown · {formatMoneyCompact(shownCents)} requested. An application is a lead: KYC and
              documents are taken at the branch, into the lending system.
            </p>
          </div>
        </header>
        <div className="body">
          <nav className="stage-strip" aria-label="Filter by status">
            <Link href={href('OPEN')} aria-current={filter === 'OPEN' ? 'true' : undefined}>In progress <b>{openCount}</b></Link>
            {APPLICATION_STATUSES.map((s) => (
              <Link key={s.value} href={href(s.value)} aria-current={filter === s.value ? 'true' : undefined}>
                {s.label} <b>{count(s.value)}</b>
              </Link>
            ))}
            <Link href={href('ALL')} aria-current={filter === '' ? 'true' : undefined}>Everything <b>{total}</b></Link>
          </nav>

          <form method="get" className="toolbar">
            <input type="hidden" name="status" value={status} />
            <div className="grow">
              <label htmlFor="q" className="sr-only">Search applications</label>
              <input id="q" name="q" type="search" defaultValue={q} placeholder="Name, number, phone, email or county…" />
            </div>
            <div>
              <label htmlFor="product" className="sr-only">Product</label>
              <select id="product" name="product" defaultValue={product}>
                <option value="">Every product</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <button type="submit" className="btn btn-ghost">Filter</button>
            {q || productId ? <Link href={`/admin/applications?status=${status}`} className="btn btn-quiet">Clear</Link> : null}
          </form>
        </div>

        {applications.length === 0 ? (
          <div className="empty">
            <span className="big" aria-hidden="true">📭</span>
            <h3>Nothing here</h3>
            <p>{q || productId ? 'Nothing matches that search.' : 'No application is at this stage right now.'}</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="list">
              <thead>
                <tr><th>Applicant</th><th>Product</th><th className="num">Amount</th><th className="num">Est. monthly</th><th>Received</th><th>Status</th></tr>
              </thead>
              <tbody>
                {applications.map((a) => {
                  const s = APPLICATION_STATUSES.find((x) => x.value === a.status);
                  return (
                    <tr key={a.id}>
                      <td>
                        <Link href={`/admin/applications/${a.id}`} className="row-link">
                          {a.company_name ?? `${a.first_name} ${a.last_name}`}
                        </Link>
                        <span className="sub">
                          {a.no} · {a.phone}
                          {a.applicant_type === 'DIASPORA' ? ` · ✈️ ${a.country ?? 'abroad'}` : a.county ? ` · ${a.county}` : ''}
                        </span>
                      </td>
                      <td>{a.product_name ?? '—'}<span className="sub">{a.term_months} months</span></td>
                      <td className="num money">{formatMoney(a.amount_cents)}</td>
                      <td className="num money">{a.est_repayment_cents ? formatMoney(a.est_repayment_cents) : '—'}</td>
                      <td>
                        {formatDateShort(a.created_at)}
                        <span className="sub">
                          {a.status === 'RECEIVED'
                            ? <span className={`badge ${a.age_days >= 1 ? 'badge-warn' : ''}`}>{a.age_days === 0 ? 'today' : `waiting ${a.age_days}d`}</span>
                            : a.handled_by ? `by ${a.handled_by}` : ''}
                        </span>
                      </td>
                      <td><span className={`badge ${s?.tone ?? ''}`}>{s?.label ?? a.status}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
