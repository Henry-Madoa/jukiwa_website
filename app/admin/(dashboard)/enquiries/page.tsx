import Link from 'next/link';
import { requirePage } from '@/lib/auth.ts';
import { listEnquiries } from '@/lib/inbox.ts';
import { formatDateShort, relativeDays, truncate } from '@/lib/format.ts';
import { ENQUIRY_KINDS, ENQUIRY_STATUSES, type EnquiryKind, type EnquiryStatus } from '@/lib/types.ts';

export const metadata = { title: 'Enquiries & callbacks' };

/**
 * Questions, callback requests and people who want to represent Jukiwa in their county.
 *
 * A callback is a promise the website made on the company's behalf — "we'll call you" — so the
 * oldest unanswered one is always at the top, and anything older than a day is marked.
 */
export default async function EnquiriesPage({ searchParams }: { searchParams: Promise<{ status?: string; kind?: string; q?: string }> }) {
  await requirePage('ENQUIRIES');
  const { status = 'OPEN', kind = '', q = '' } = await searchParams;
  const statusFilter = (status === 'ALL' ? '' : status === 'OPEN' || ENQUIRY_STATUSES.some((s) => s.value === status) ? status : 'OPEN') as EnquiryStatus | 'OPEN' | '';
  const kindFilter = (ENQUIRY_KINDS.some((k) => k.value === kind) ? kind : '') as EnquiryKind | '';
  const [enquiries, all] = await Promise.all([listEnquiries(statusFilter, q, kindFilter), listEnquiries('', '', kindFilter)]);

  const n = (value: string) => all.filter((e) => e.status === value).length;
  const href = (next: { status?: string; kind?: string }) => {
    const params = new URLSearchParams({ status: next.status ?? status, ...(next.kind ?? kind ? { kind: next.kind ?? kind } : {}), ...(q ? { q } : {}) });
    return `/admin/enquiries?${params}`;
  };

  return (
    <div className="panel">
      <header>
        <div>
          <h2>Enquiries & callbacks</h2>
          <p>{enquiries.length} shown. Aim to call every callback request within 30 minutes during office hours.</p>
        </div>
      </header>
      <div className="body">
        <nav className="stage-strip" aria-label="Filter by kind">
          <Link href={href({ kind: '' })} aria-current={!kindFilter ? 'true' : undefined}>Everything</Link>
          {ENQUIRY_KINDS.map((k) => (
            <Link key={k.value} href={href({ kind: k.value })} aria-current={kindFilter === k.value ? 'true' : undefined}>{k.label}s</Link>
          ))}
        </nav>
        <nav className="stage-strip" aria-label="Filter by status">
          <Link href={href({ status: 'OPEN' })} aria-current={statusFilter === 'OPEN' ? 'true' : undefined}>Open <b>{n('NEW') + n('CONTACTED')}</b></Link>
          {ENQUIRY_STATUSES.map((s) => (
            <Link key={s.value} href={href({ status: s.value })} aria-current={statusFilter === s.value ? 'true' : undefined}>{s.label} <b>{n(s.value)}</b></Link>
          ))}
          <Link href={href({ status: 'ALL' })} aria-current={statusFilter === '' ? 'true' : undefined}>All <b>{all.length}</b></Link>
        </nav>
        <form method="get" className="toolbar">
          <input type="hidden" name="status" value={status} />
          {kindFilter ? <input type="hidden" name="kind" value={kindFilter} /> : null}
          <div className="grow">
            <label htmlFor="q" className="sr-only">Search</label>
            <input id="q" name="q" type="search" defaultValue={q} placeholder="Name, phone, email, place or message…" />
          </div>
          <button type="submit" className="btn btn-ghost">Search</button>
        </form>
      </div>

      {enquiries.length === 0 ? (
        <div className="empty">
          <span className="big" aria-hidden="true">☎️</span>
          <h3>Nothing here</h3>
          <p>{q ? 'Nothing matches that search.' : 'Nobody is waiting at this stage.'}</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="list">
            <thead><tr><th>From</th><th>Kind</th><th>Message</th><th>Received</th><th>Status</th></tr></thead>
            <tbody>
              {enquiries.map((e) => {
                const s = ENQUIRY_STATUSES.find((x) => x.value === e.status);
                return (
                  <tr key={e.id}>
                    <td>
                      <Link href={`/admin/enquiries/${e.id}`} className="row-link">{e.name}</Link>
                      <span className="sub">{e.phone}{e.email ? ` · ${e.email}` : ''}</span>
                    </td>
                    <td>
                      {ENQUIRY_KINDS.find((k) => k.value === e.kind)?.label}
                      <span className="sub">{e.product_name ?? e.location ?? e.branch_name ?? ''}</span>
                    </td>
                    <td className="help" style={{ maxWidth: 360 }}>{truncate(e.message ?? '', 110) || '—'}</td>
                    <td>
                      {formatDateShort(e.created_at)}
                      <span className="sub">
                        {e.status === 'NEW'
                          ? <span className={`badge ${e.age_days >= 1 ? 'badge-warn' : 'badge-bad'}`}>{relativeDays(e.created_at)}</span>
                          : e.handled_by ? `by ${e.handled_by}` : ''}
                      </span>
                    </td>
                    <td><span className={`badge ${s?.tone ?? ''}`}>{s?.label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
