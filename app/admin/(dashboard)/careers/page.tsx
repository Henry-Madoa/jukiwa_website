import Link from 'next/link';
import { requirePage } from '@/lib/auth.ts';
import { canAction } from '@/lib/permissions.ts';
import { adminVacancies } from '@/lib/content.ts';
import { formatDateShort } from '@/lib/format.ts';

export const metadata = { title: 'Careers' };

export default async function CareersPage() {
  const user = await requirePage('CAREERS');
  const vacancies = await adminVacancies();
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="panel">
      <header>
        <div>
          <h2>Careers</h2>
          <p>{vacancies.filter((v) => v.is_published && (!v.closes_on || v.closes_on >= today)).length} open on the website. Applications go to careers@jukiwa.co.ke, as each advert says.</p>
        </div>
        <span style={{ flex: 1 }} />
        {canAction(user, 'CAREERS_CREATE') ? <Link href="/admin/careers/new" className="btn btn-primary">Advertise a vacancy</Link> : null}
      </header>
      {vacancies.length === 0 ? (
        <div className="empty"><span className="big" aria-hidden="true">💼</span><h3>No vacancies</h3><p>Nothing advertised at the moment.</p></div>
      ) : (
        <div className="table-wrap">
          <table className="list">
            <thead><tr><th>Role</th><th>Department</th><th>Closes</th><th>Status</th></tr></thead>
            <tbody>
              {vacancies.map((v) => (
                <tr key={v.id}>
                  <td><Link href={`/admin/careers/${v.id}`} className="row-link">{v.title}</Link><span className="sub">{v.location}</span></td>
                  <td>{v.department ?? '—'}</td>
                  <td>{v.closes_on ? formatDateShort(v.closes_on) : 'Rolling'}</td>
                  <td>
                    {!v.is_published ? <span className="badge">Hidden</span>
                      : v.closes_on && v.closes_on < today ? <span className="badge badge-warn">Closed</span>
                        : <span className="badge badge-ok">Open</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
