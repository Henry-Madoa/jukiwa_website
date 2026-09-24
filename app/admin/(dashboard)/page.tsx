import Link from 'next/link';
import { requireUser } from '@/lib/auth.ts';
import { canNav, canAction, pageByCode } from '@/lib/permissions.ts';
import { inboxSummary, listApplications, listEnquiries } from '@/lib/inbox.ts';
import { adminPosts } from '@/lib/content.ts';
import { getSettings } from '@/lib/site.ts';
import { formatMoney, formatMoneyCompact, relativeDays, truncate } from '@/lib/format.ts';
import { parseRange } from '@/lib/insights.ts';
import { APPLICATION_STATUSES, ENQUIRY_KINDS } from '@/lib/types.ts';
import { Insights } from './insights.tsx';

/*
 * The dashboard.
 *
 * Built out of what this particular person may actually see: a marketing officer who cannot open
 * Applications gets no pipeline figures, and every query behind a tile is skipped unless the tile
 * will be rendered. That keeps the screen honest and keeps it fast.
 */

export const metadata = { title: 'Dashboard' };

const tone = (status: string): string => APPLICATION_STATUSES.find((s) => s.value === status)?.tone ?? '';
const statusLabel = (status: string): string => APPLICATION_STATUSES.find((s) => s.value === status)?.label ?? status;

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ denied?: string; range?: string }> }) {
  const [user, { denied, range }] = await Promise.all([requireUser(), searchParams]);
  const company = await getSettings();

  const mayApplications = canNav(user, 'APPLICATIONS');
  const mayEnquiries = canNav(user, 'ENQUIRIES');
  const mayNews = canNav(user, 'NEWS');

  const [summary, applications, enquiries, posts] = await Promise.all([
    mayApplications || mayEnquiries || mayNews ? inboxSummary() : null,
    mayApplications ? listApplications('OPEN') : [],
    mayEnquiries ? listEnquiries('NEW') : [],
    mayNews ? adminPosts() : [],
  ]);

  const drafts = posts.filter((post) => !post.is_published);
  const deniedPage = denied ? pageByCode(denied) : null;
  const hour = Number(new Date().toLocaleString('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Africa/Nairobi' }));
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <>
      {deniedPage ? (
        <div className="note note-warn">
          Your Permission Set does not include <strong>{deniedPage.label}</strong>. If you need it, ask a System
          Administrator to add it to your set.
        </div>
      ) : null}

      <div className="panel">
        <header>
          <div>
            <h2>{greeting}, {user.name.split(' ')[0]}</h2>
            <p>
              {user.is_system
                ? 'You hold the System Administrator set — every screen, including Permission Sets and the audit trail.'
                : `You hold ${user.roles.map((role) => role.name).join(' and ') || 'no Permission Set'}.`}
            </p>
          </div>
          <span style={{ flex: 1 }} />
          <Link href="/" target="_blank" className="btn btn-ghost btn-xs">View the website ↗</Link>
        </header>
      </div>

      {summary ? (
        <div className="tiles">
          {mayApplications ? (
            <>
              <Link href="/admin/applications?status=RECEIVED" className={`tile-stat ${summary.applications_new ? 'alert' : ''}`}>
                <div className="k">New applications</div>
                <div className="v">{summary.applications_new}</div>
                <div className="n">{summary.applications_week} arrived this week</div>
              </Link>
              <Link href="/admin/applications?status=OPEN" className="tile-stat">
                <div className="k">Open pipeline</div>
                <div className="v">{formatMoneyCompact(summary.pipeline_cents)}</div>
                <div className="n">{summary.applications_open} applications being worked</div>
              </Link>
              <Link href="/admin/applications?status=APPROVED" className="tile-stat">
                <div className="k">Approved, awaiting disbursement</div>
                <div className="v">{formatMoneyCompact(summary.approved_cents)}</div>
                <div className="n">{formatMoneyCompact(summary.disbursed_cents)} disbursed to date</div>
              </Link>
            </>
          ) : null}

          {mayEnquiries ? (
            <Link href="/admin/enquiries?status=NEW" className={`tile-stat ${summary.callbacks_new + summary.enquiries_new ? 'alert' : ''}`}>
              <div className="k">Waiting for a call</div>
              <div className="v">{summary.callbacks_new + summary.enquiries_new + summary.partners_new}</div>
              <div className="n">{summary.callbacks_new} callbacks · {summary.enquiries_new} questions · {summary.partners_new} partners</div>
            </Link>
          ) : null}

          {mayNews ? (
            <Link href="/admin/news" className="tile-stat">
              <div className="k">Published insights</div>
              <div className="v">{summary.posts_published}</div>
              <div className="n">{summary.posts_draft} draft{summary.posts_draft === 1 ? '' : 's'} waiting</div>
            </Link>
          ) : null}

          {canNav(user, 'SUBSCRIBERS') ? (
            <Link href="/admin/subscribers" className="tile-stat">
              <div className="k">Newsletter</div>
              <div className="v">{summary.subscribers}</div>
              <div className="n">active subscribers</div>
            </Link>
          ) : null}
        </div>
      ) : null}

      {mayApplications ? <Insights range={parseRange(range)} /> : null}

      <div className="grid-side">
        <div style={{ display: 'grid', gap: 20 }}>
          {mayApplications ? (
            <div className="panel">
              <header>
                <h2>Applications in progress</h2>
                <span style={{ flex: 1 }} />
                <Link href="/admin/applications" className="btn btn-ghost btn-xs">All applications</Link>
              </header>
              {applications.length === 0 ? (
                <div className="empty">
                  <span className="big" aria-hidden="true">📭</span>
                  <h3>Nothing in progress</h3>
                  <p>Every application the website has produced has been decided.</p>
                </div>
              ) : (
                <div className="table-wrap">
                  <table className="list">
                    <thead>
                      <tr><th>Applicant</th><th>Product</th><th className="num">Amount</th><th>Waiting</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {applications.slice(0, 8).map((a) => (
                        <tr key={a.id}>
                          <td>
                            <Link href={`/admin/applications/${a.id}`} className="row-link">{a.first_name} {a.last_name}</Link>
                            <span className="sub">{a.no} · {a.county ?? a.country ?? '—'}</span>
                          </td>
                          <td>{a.product_name ?? '—'}<span className="sub">{a.term_months} months</span></td>
                          <td className="num money">{formatMoney(a.amount_cents)}</td>
                          <td><span className={`badge ${a.age_days >= 2 && a.status === 'RECEIVED' ? 'badge-warn' : ''}`}>{a.age_days === 0 ? 'today' : `${a.age_days}d`}</span></td>
                          <td><span className={`badge ${tone(a.status)}`}>{statusLabel(a.status)}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : null}

          {mayEnquiries ? (
            <div className="panel">
              <header>
                <h2>Waiting for a call back</h2>
                <span style={{ flex: 1 }} />
                <Link href="/admin/enquiries" className="btn btn-ghost btn-xs">All enquiries</Link>
              </header>
              {enquiries.length === 0 ? (
                <div className="empty">
                  <span className="big" aria-hidden="true">☎️</span>
                  <h3>Nobody waiting</h3>
                  <p>Every question and callback request has been answered.</p>
                </div>
              ) : (
                <div className="table-wrap">
                  <table className="list">
                    <tbody>
                      {enquiries.slice(0, 6).map((e) => (
                        <tr key={e.id}>
                          <td>
                            <Link href={`/admin/enquiries/${e.id}`} className="row-link">{e.name}</Link>
                            <span className="sub">{e.phone}</span>
                          </td>
                          <td>
                            {ENQUIRY_KINDS.find((k) => k.value === e.kind)?.label}
                            <span className="sub">{truncate(e.message ?? '', 70) || '—'}</span>
                          </td>
                          <td className="num"><span className={`badge ${e.age_days >= 1 ? 'badge-warn' : 'badge-bad'}`}>{relativeDays(e.created_at)}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : null}

          {mayNews && drafts.length ? (
            <div className="panel">
              <header>
                <h2>Drafts not yet published</h2>
                <span style={{ flex: 1 }} />
                <Link href="/admin/news" className="btn btn-ghost btn-xs">All articles</Link>
              </header>
              <div className="table-wrap">
                <table className="list">
                  <tbody>
                    {drafts.slice(0, 5).map((post) => (
                      <tr key={post.id}>
                        <td>
                          <Link href={`/admin/news/${post.id}`} className="row-link">{post.title}</Link>
                          <span className="sub">{truncate(post.excerpt ?? post.body, 70)}</span>
                        </td>
                        <td className="num"><span className="badge badge-warn">Draft</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>

        <aside style={{ display: 'grid', gap: 20 }}>
          <div className="panel">
            <header><h2>Quick actions</h2></header>
            <div className="body" style={{ display: 'grid', gap: 8 }}>
              {mayApplications ? <Link href="/admin/applications?status=RECEIVED" className="btn btn-primary">📝 Work new applications</Link> : null}
              {canAction(user, 'PRODUCTS_UPDATE') ? <Link href="/admin/products" className="btn btn-ghost">💳 Update product terms</Link> : null}
              {canAction(user, 'NEWS_CREATE') ? <Link href="/admin/news/new" className="btn btn-ghost">📰 Write an insight</Link> : null}
              {canAction(user, 'CAREERS_CREATE') ? <Link href="/admin/careers/new" className="btn btn-ghost">💼 Advertise a vacancy</Link> : null}
              {canAction(user, 'TEAM_CREATE') ? <Link href="/admin/team/new" className="btn btn-ghost">👥 Add a team profile</Link> : null}
            </div>
          </div>

          <div className="panel">
            <header><h2>This website</h2></header>
            <div className="body">
              <table className="kv">
                <tbody>
                  <tr><th scope="row">Company</th><td>{company.name}</td></tr>
                  <tr><th scope="row">Brand colours</th><td>
                    <span className="badge" style={{ background: company.brand_primary, color: '#fff' }}>{company.brand_primary}</span>{' '}
                    <span className="badge" style={{ background: company.brand_accent, color: '#1d1606' }}>{company.brand_accent}</span>
                  </td></tr>
                  <tr><th scope="row">Licence shown</th><td>{company.licence_no ? <span className="badge badge-ok">Yes</span> : <span className="badge badge-warn">Not yet set</span>}</td></tr>
                  <tr><th scope="row">Image uploads</th><td>{process.env.CLOUDINARY_API_KEY ? <span className="badge badge-ok">Cloudinary ready</span> : <span className="badge badge-bad">Not configured</span>}</td></tr>
                </tbody>
              </table>
              {canNav(user, 'SETTINGS') ? (
                <Link href="/admin/settings" className="btn btn-ghost" style={{ width: '100%' }}>Company profile &amp; theme</Link>
              ) : null}
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
