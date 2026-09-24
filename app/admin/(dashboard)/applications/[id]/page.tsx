import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePage } from '@/lib/auth.ts';
import { canAction } from '@/lib/permissions.ts';
import { getApplication } from '@/lib/inbox.ts';
import { adminProduct } from '@/lib/content.ts';
import { toTerms } from '@/lib/site.ts';
import { quote } from '@/lib/loan-math.ts';
import { formatDateTime, formatMoney, formatBp, telHref, whatsappHref } from '@/lib/format.ts';
import { APPLICANT_TYPES, APPLICATION_STATUSES, COLLATERALS } from '@/lib/types.ts';
import { setApplicationStatus, deleteApplication } from '@/app/actions/content.ts';
import { ActionForm, ActionFormRedirect, ConfirmSubmit, Submit } from '../../ui.tsx';

export const metadata = { title: 'Loan application' };

/** The happy path, in order. DECLINED and WITHDRAWN are exits from it, not steps on it. */
const PATH = APPLICATION_STATUSES.filter((s) => s.value !== 'DECLINED' && s.value !== 'WITHDRAWN');

export default async function ApplicationCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePage('APPLICATIONS');
  const a = await getApplication(Number(id));
  if (!a) notFound();

  const product = a.product_id ? await adminProduct(a.product_id) : undefined;
  // The quote as the product stands today — if a rate has changed since, the officer can see it.
  const today = product
    ? quote(toTerms(product), { amountCents: a.amount_cents, termMonths: a.term_months, monthlyRentCents: a.monthly_income_cents })
    : null;
  const mayUpdate = canAction(user, 'APPLICATIONS_UPDATE');
  const mayDelete = canAction(user, 'APPLICATIONS_DELETE');
  const at = PATH.findIndex((s) => s.value === a.status);
  const exited = at === -1;
  const status = APPLICATION_STATUSES.find((s) => s.value === a.status);
  const name = a.company_name ?? `${a.first_name} ${a.last_name}`;
  const greeting = `Hello ${a.first_name}, this is Jukiwa Credit about your application ${a.no}.`;

  return (
    <>
      <div className="crumb">
        <Link href="/admin/applications">Loan applications</Link><span aria-hidden="true">›</span>{a.no}
      </div>

      <div className="panel">
        <header>
          <div>
            <h2>{name}</h2>
            <p>{a.no} · received {formatDateTime(a.created_at)}{a.handled_by ? ` · last worked by ${a.handled_by}` : ''}</p>
          </div>
          <span style={{ flex: 1 }} />
          <span className={`badge ${status?.tone ?? ''}`} style={{ fontSize: '0.8rem', padding: '5px 12px' }}>{status?.label ?? a.status}</span>
        </header>
        <div className="body">
          {exited ? (
            <div className="note">This application was <strong>{status?.label.toLowerCase()}</strong>. Move it back into the pipeline below if that was a mistake.</div>
          ) : (
            <ol className="stepper stepper-wrap" aria-label="Progress">
              {PATH.map((step, index) => (
                <li key={step.value} data-state={index < at ? 'done' : index === at ? 'now' : 'todo'} aria-current={index === at ? 'step' : undefined}>
                  {step.label}
                </li>
              ))}
            </ol>
          )}

          <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <div className="help" style={{ marginBottom: 4 }}>Amount requested</div>
              <div className="big-figure">{formatMoney(a.amount_cents)}<small>over {a.term_months} months</small></div>
            </div>
            {a.est_repayment_cents ? (
              <div>
                <div className="help" style={{ marginBottom: 4 }}>Quoted to the customer</div>
                <div className="big-figure" style={{ fontSize: '1.5rem' }}>{formatMoney(a.est_repayment_cents)}<small>a month</small></div>
              </div>
            ) : null}
            {today && a.est_repayment_cents && today.monthlyCents !== a.est_repayment_cents ? (
              <div className="note note-warn" style={{ flex: '1 1 260px' }}>
                The product&rsquo;s terms have changed since this was quoted. Today it would be {formatMoney(today.monthlyCents)} a month.
              </div>
            ) : null}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <a href={telHref(a.phone)} className="btn btn-primary">📞 Call {a.phone}</a>
            <a href={whatsappHref(a.phone, greeting)} target="_blank" rel="noreferrer" className="btn btn-ghost">💬 WhatsApp</a>
            {a.email ? <a href={`mailto:${a.email}?subject=${encodeURIComponent(`Your application ${a.no}`)}`} className="btn btn-ghost">✉ Email</a> : null}
          </div>
          <p className="help" style={{ margin: 0 }}>
            Prefers: <strong>{a.contact_preference === 'WHATSAPP' ? 'WhatsApp' : a.contact_preference === 'EMAIL' ? 'email' : 'a phone call'}</strong>
            {a.consent_contact ? ' · agreed to hear about other Jukiwa products' : ''}
          </p>
        </div>
      </div>

      <div className="grid-side">
        <div style={{ display: 'grid', gap: 20 }}>
          <div className="panel">
            <header><h2>The application</h2></header>
            <div className="body">
              <dl className="facts">
                <div><dt>Product</dt><dd>{product ? <Link href={`/admin/products/${product.id}`}>{product.name}</Link> : a.product_name ?? 'Removed'}</dd></div>
                <div><dt>Applicant</dt><dd>{APPLICANT_TYPES.find((t) => t.value === a.applicant_type)?.label}</dd></div>
                <div><dt>Name</dt><dd>{a.first_name} {a.last_name}</dd></div>
                {a.company_name ? <div><dt>Company</dt><dd>{a.company_name}</dd></div> : null}
                <div><dt>Phone</dt><dd>{a.phone}</dd></div>
                <div><dt>Email</dt><dd>{a.email ?? '—'}</dd></div>
                <div><dt>Lives in</dt><dd>{a.applicant_type === 'DIASPORA' ? a.country : [a.county, a.country].filter(Boolean).join(', ') || '—'}</dd></div>
                <div><dt>Nearest branch</dt><dd>{a.branch_name ?? '—'}</dd></div>
                <div><dt>{product?.calc_mode === 'RENT_ADVANCE' ? 'Monthly rent' : 'Monthly income'}</dt><dd>{a.monthly_income_cents ? formatMoney(a.monthly_income_cents) : '—'}</dd></div>
                <div><dt>Security offered</dt><dd>{COLLATERALS.find((c) => c.value === a.collateral)?.label ?? a.collateral}</dd></div>
                <div><dt>Property location</dt><dd>{a.property_location ?? '—'}</dd></div>
                <div><dt>Came from</dt><dd>{a.source_page ?? '—'}</dd></div>
              </dl>
              {a.purpose ? <div><div className="help">What it is for</div><p style={{ margin: '4px 0 0' }}>{a.purpose}</p></div> : null}
              {a.collateral_detail ? <div><div className="help">About the security</div><p style={{ margin: '4px 0 0' }}>{a.collateral_detail}</p></div> : null}
              {product ? (
                <p className="help">
                  Indicative terms today: {formatBp(product.rate_pm_bp)} a month ({product.calc_mode === 'REDUCING' ? 'reducing balance' : 'flat'})
                  {product.fee_bp ? `, ${formatBp(product.fee_bp)} fee` : ''}.
                  {today ? ` Total repayable about ${formatMoney(today.totalCents)}.` : ''}
                </p>
              ) : null}
            </div>
          </div>

          <div className="panel">
            <header><h2>Notes</h2></header>
            <div className="body">
              {a.notes ? <pre className="notes-log">{a.notes}</pre> : <p className="help" style={{ margin: 0 }}>No notes yet. Every status change below can carry one.</p>}
            </div>
          </div>
        </div>

        <aside style={{ display: 'grid', gap: 20 }}>
          {mayUpdate ? (
            <ActionForm action={setApplicationStatus} success="Saved.">
              <input type="hidden" name="id" value={a.id} />
              <div className="panel">
                <header><h2>Move it along</h2></header>
                <div className="body">
                  <div className="field">
                    <label htmlFor="status">Status</label>
                    <select id="status" name="status" defaultValue={a.status}>
                      {APPLICATION_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="note">Add a note</label>
                    <textarea id="note" name="note" maxLength={4000} style={{ minHeight: 110 }} placeholder="Called — coming in on Thursday with the title deed and rent roll." />
                    <p className="help">Notes are added to the log with today&rsquo;s date and your name; nothing is overwritten.</p>
                  </div>
                  <Submit>Save</Submit>
                </div>
              </div>
            </ActionForm>
          ) : (
            <div className="note note-info">Your Permission Set lets you see applications but not change them.</div>
          )}

          {mayDelete ? (
            <div className="panel">
              <header><h2>Delete</h2></header>
              <div className="body">
                <p className="help" style={{ margin: 0 }}>
                  For spam and duplicates. A real application that went nowhere should be marked Declined or Withdrawn
                  instead, so the numbers stay true.
                </p>
                <ActionFormRedirect action={deleteApplication} to="/admin/applications">
                  <input type="hidden" name="id" value={a.id} />
                  <ConfirmSubmit message={`Delete application ${a.no}? This cannot be undone.`} className="btn btn-danger">Delete application</ConfirmSubmit>
                </ActionFormRedirect>
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </>
  );
}
