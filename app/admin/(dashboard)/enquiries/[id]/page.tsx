import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePage } from '@/lib/auth.ts';
import { canAction } from '@/lib/permissions.ts';
import { getEnquiry } from '@/lib/inbox.ts';
import { formatDateTime, telHref, whatsappHref } from '@/lib/format.ts';
import { ENQUIRY_KINDS, ENQUIRY_STATUSES } from '@/lib/types.ts';
import { setEnquiryStatus, deleteEnquiry } from '@/app/actions/content.ts';
import { ActionForm, ActionFormRedirect, ConfirmSubmit, Submit } from '../../ui.tsx';

export const metadata = { title: 'Enquiry' };

export default async function EnquiryCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePage('ENQUIRIES');
  const e = await getEnquiry(Number(id));
  if (!e) notFound();

  const kind = ENQUIRY_KINDS.find((k) => k.value === e.kind)?.label ?? e.kind;
  const status = ENQUIRY_STATUSES.find((s) => s.value === e.status);

  return (
    <>
      <div className="crumb">
        <Link href="/admin/enquiries">Enquiries & callbacks</Link><span aria-hidden="true">›</span>{e.name}
      </div>

      <div className="grid-side">
        <div className="panel">
          <header>
            <div>
              <h2>{e.name}</h2>
              <p>{kind} · received {formatDateTime(e.created_at)}{e.handled_by ? ` · last handled by ${e.handled_by}` : ''}</p>
            </div>
            <span style={{ flex: 1 }} />
            <span className={`badge ${status?.tone ?? ''}`}>{status?.label}</span>
          </header>
          <div className="body">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <a href={telHref(e.phone)} className="btn btn-primary">📞 Call {e.phone}</a>
              <a href={whatsappHref(e.phone, `Hello ${e.name.split(' ')[0]}, this is Jukiwa Credit returning your message.`)} target="_blank" rel="noreferrer" className="btn btn-ghost">💬 WhatsApp</a>
              {e.email ? <a href={`mailto:${e.email}`} className="btn btn-ghost">✉ Email</a> : null}
            </div>
            <dl className="facts">
              <div><dt>Kind</dt><dd>{kind}</dd></div>
              <div><dt>Phone</dt><dd>{e.phone}</dd></div>
              <div><dt>Email</dt><dd>{e.email ?? '—'}</dd></div>
              <div><dt>About</dt><dd>{e.product_name ?? '—'}</dd></div>
              <div><dt>{e.kind === 'PARTNER' ? 'Would represent' : 'Location'}</dt><dd>{e.location ?? '—'}</dd></div>
              <div><dt>Best time to call</dt><dd>{e.preferred_time ?? '—'}</dd></div>
              <div><dt>Branch</dt><dd>{e.branch_name ?? '—'}</dd></div>
              <div><dt>Came from</dt><dd>{e.source_page ?? '—'}</dd></div>
            </dl>
            {e.message ? <blockquote style={{ margin: 0, padding: '14px 16px', borderLeft: '3px solid var(--brand)', background: 'var(--surface-soft)', borderRadius: 8 }}>{e.message}</blockquote> : null}
          </div>
        </div>

        <aside style={{ display: 'grid', gap: 20 }}>
          {canAction(user, 'ENQUIRIES_UPDATE') ? (
            <ActionForm action={setEnquiryStatus} success="Saved.">
              <input type="hidden" name="id" value={e.id} />
              <div className="panel">
                <header><h2>Outcome</h2></header>
                <div className="body">
                  <div className="field">
                    <label htmlFor="status">Status</label>
                    <select id="status" name="status" defaultValue={e.status}>
                      {ENQUIRY_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="notes">Notes</label>
                    <textarea id="notes" name="notes" maxLength={2000} defaultValue={e.notes ?? ''} placeholder="Spoke to her — sending the rent advance checklist on WhatsApp." />
                  </div>
                  <Submit>Save</Submit>
                </div>
              </div>
            </ActionForm>
          ) : null}

          {canAction(user, 'ENQUIRIES_DELETE') ? (
            <div className="panel">
              <header><h2>Delete</h2></header>
              <div className="body">
                <p className="help" style={{ margin: 0 }}>For spam. A genuine enquiry should be Closed, so it still counts.</p>
                <ActionFormRedirect action={deleteEnquiry} to="/admin/enquiries">
                  <input type="hidden" name="id" value={e.id} />
                  <ConfirmSubmit message="Delete this enquiry?" className="btn btn-danger">Delete</ConfirmSubmit>
                </ActionFormRedirect>
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </>
  );
}
