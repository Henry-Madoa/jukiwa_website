import Link from 'next/link';
import { requirePage } from '@/lib/auth.ts';
import { canAction } from '@/lib/permissions.ts';
import { adminPosts } from '@/lib/content.ts';
import { formatDateShort } from '@/lib/format.ts';
import { cdn } from '@/lib/cloudinary.ts';
import { POST_CATEGORIES } from '@/lib/types.ts';
import { RowFilter } from '../ui.tsx';

export const metadata = { title: 'Insights & news' };

export default async function NewsPage() {
  const user = await requirePage('NEWS');
  const posts = await adminPosts();
  const now = new Date().toISOString();

  return (
    <div className="panel">
      <header>
        <div>
          <h2>Insights & news</h2>
          <p>{posts.filter((p) => p.is_published).length} published · {posts.filter((p) => !p.is_published).length} drafts. Published articles appear at /insights and on the home page.</p>
        </div>
        <span style={{ flex: 1 }} />
        {canAction(user, 'NEWS_CREATE') ? <Link href="/admin/news/new" className="btn btn-primary">Write an article</Link> : null}
      </header>
      <div className="body">
        {posts.length === 0 ? (
          <div className="empty">
            <span className="big" aria-hidden="true">📰</span>
            <h3>Nothing written yet</h3>
            <p>Start with the question landlords ask most. A good guide brings in applications for years.</p>
          </div>
        ) : (
          <RowFilter placeholder="Search articles…">
            <div className="table-wrap">
              <table className="list">
                <thead><tr><th>Article</th><th>Kind</th><th>Date</th><th className="num">Reads</th><th>Status</th></tr></thead>
                <tbody>
                  {posts.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div className="who">
                          <span className="avatar" style={{ borderRadius: 8 }}>
                            {p.image_url ? <img src={cdn(p.image_url, { width: 80, height: 80 })} alt="" /> : '📰'}
                          </span>
                          <span style={{ minWidth: 0 }}>
                            <Link href={`/admin/news/${p.id}`} className="row-link">{p.title}</Link>
                            <span className="sub">{p.author ?? ''}{p.is_pinned ? ' · 📌 pinned' : ''}</span>
                          </span>
                        </div>
                      </td>
                      <td>{POST_CATEGORIES.find((c) => c.value === p.category)?.label}</td>
                      <td>{formatDateShort(p.published_at)}</td>
                      <td className="num">{p.views}</td>
                      <td>
                        {!p.is_published ? <span className="badge badge-warn">Draft</span>
                          : p.published_at > now ? <span className="badge badge-info">Scheduled</span>
                            : <span className="badge badge-ok">Live</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </RowFilter>
        )}
      </div>
    </div>
  );
}
