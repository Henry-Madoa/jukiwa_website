import Link from 'next/link';
import { requirePage } from '@/lib/auth.ts';
import { canAction } from '@/lib/permissions.ts';
import { adminTeam } from '@/lib/content.ts';
import { cdn } from '@/lib/cloudinary.ts';
import { initials } from '@/lib/format.ts';
import { TEAM_CATEGORIES } from '@/lib/types.ts';
import { RowFilter } from '../ui.tsx';

export const metadata = { title: 'Leadership & team' };

/**
 * The people on the About page. Jukiwa Credit shares its directors and its staff with Jukiwa
 * General Agencies, so these are the same faces a landlord already knows — which is the point.
 */
export default async function TeamPage() {
  const user = await requirePage('TEAM');
  const team = await adminTeam();

  return (
    <div className="panel">
      <header>
        <div>
          <h2>Leadership & team</h2>
          <p>{team.filter((m) => m.is_published).length} shown on the website, of {team.length}.</p>
        </div>
        <span style={{ flex: 1 }} />
        {canAction(user, 'TEAM_CREATE') ? <Link href="/admin/team/new" className="btn btn-primary">Add a profile</Link> : null}
      </header>
      <div className="body">
        <RowFilter placeholder="Search by name, title or branch…">
          <div className="table-wrap">
            <table className="list">
              <thead><tr><th>Person</th><th>Group</th><th>Branch</th><th className="num">Order</th><th>On the site</th></tr></thead>
              <tbody>
                {team.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <div className="who">
                        <span className="avatar">{m.photo_url ? <img src={cdn(m.photo_url, { width: 80, height: 80 })} alt="" /> : initials(m.name)}</span>
                        <span>
                          <Link href={`/admin/team/${m.id}`} className="row-link">{m.name}</Link>
                          <span className="sub">{m.role_title}</span>
                        </span>
                      </div>
                    </td>
                    <td>{TEAM_CATEGORIES.find((c) => c.value === m.category)?.label}</td>
                    <td>{m.branch_name ?? 'Group-wide'}</td>
                    <td className="num">{m.sort}</td>
                    <td>{m.is_published ? <span className="badge badge-ok">Shown</span> : <span className="badge">Hidden</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </RowFilter>
      </div>
    </div>
  );
}
