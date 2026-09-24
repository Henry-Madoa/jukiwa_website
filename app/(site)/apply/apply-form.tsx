'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { submitApplication } from '@/app/actions/public.ts';
import { amountStep, clamp, quote, suggestedAmount } from '@/lib/loan-math.ts';
import { formatMoney, formatMoneyCompact, formatBp, formatTerm, whatsappHref } from '@/lib/format.ts';
import { APPLICANT_TYPES, COLLATERALS, COUNTIES, type ProductTerms } from '@/lib/types.ts';
import { Flag, Icon } from '../icons.tsx';
import { Honeypot } from '../forms.tsx';

/*
 * The online application, in four short steps: the loan, the applicant, the security, and a review.
 *
 * It asks for what a credit officer needs to call back with a real answer — and deliberately
 * nothing more. No ID number, no KRA PIN, no documents: those are collected in person, into the
 * lending system, and the form says so, because "why do they want my ID on a website?" is the
 * question that makes a careful borrower close the tab.
 *
 * Each step is checked before the next opens, using the browser's own validation on the fields
 * that are on screen; the server checks everything again, and re-quotes the loan from the product
 * row, when it arrives.
 */

interface Branch { id: number; name: string }

type Values = Record<string, string>;

const STEPS = [
  { title: 'Your loan', hint: 'What and how much' },
  { title: 'About you', hint: 'So we can call' },
  { title: 'Security', hint: 'What backs it' },
  { title: 'Review', hint: 'Check and send' },
];

const shillings = (text: string): number => Number(String(text).replace(/[^\d]/g, '')) || 0;

export function ApplyForm({
  products,
  branches,
  initial,
  whatsapp,
}: {
  products: ProductTerms[];
  branches: Branch[];
  initial: { product?: string; amount?: string; term?: string; rent?: string };
  whatsapp: string | null;
}) {
  const first = products.find((p) => p.slug === initial.product) ?? products[0]!;
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const [v, setV] = useState<Values>(() => ({
    product: first.slug,
    amount: initial.amount ?? String(Math.round((first.calc_mode === 'RENT_ADVANCE' ? Math.min(first.max_amount_cents, 40_000_000 * 5) : suggestedAmount(first)) / 100)),
    term: initial.term ?? String(clamp(12, first.min_term_months, first.max_term_months)),
    rent: initial.rent ?? (first.calc_mode === 'RENT_ADVANCE' ? '400000' : ''),
    purpose: '',
    applicant_type: 'INDIVIDUAL',
    first_name: '', last_name: '', company_name: '', phone: '', email: '', county: '', country: '',
    contact_preference: 'CALL',
    collateral: first.calc_mode === 'RENT_ADVANCE' ? 'RENTAL_PROPERTY' : 'TITLE_DEED',
    collateral_detail: '', property_location: '', branch_id: '',
    consent_privacy: '', consent_contact: '',
  }));
  const set = (key: string, value: string) => setV((current) => ({ ...current, [key]: value }));

  const product = products.find((p) => p.slug === v.product) ?? first;
  const isRent = product.calc_mode === 'RENT_ADVANCE';
  const q = useMemo(() => quote(product, {
    amountCents: shillings(v.amount) * 100,
    termMonths: Number(v.term),
    monthlyRentCents: isRent ? shillings(v.rent) * 100 : null,
  }), [product, v.amount, v.term, v.rent, isRent]);

  const chooseProduct = (slug: string) => {
    const next = products.find((p) => p.slug === slug)!;
    setV((current) => ({
      ...current,
      product: slug,
      amount: String(Math.round((next.calc_mode === 'RENT_ADVANCE'
        ? Math.min(next.max_amount_cents, shillings(current.rent || '400000') * 100 * Math.min(5, next.rent_multiple_max))
        : suggestedAmount(next)) / 100)),
      term: String(clamp(Number(current.term) || 12, next.min_term_months, next.max_term_months)),
      rent: next.calc_mode === 'RENT_ADVANCE' ? current.rent || '400000' : current.rent,
      collateral: next.calc_mode === 'RENT_ADVANCE' ? 'RENTAL_PROPERTY' : current.collateral === 'RENTAL_PROPERTY' ? 'TITLE_DEED' : current.collateral,
    }));
  };

  /** The browser's own validation, on whatever is on screen right now. */
  const stepIsValid = (): boolean => {
    const form = formRef.current;
    if (!form) return true;
    const fields = [...form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('[data-step="' + step + '"] :is(input, select, textarea)')];
    for (const field of fields) {
      if (!field.checkValidity()) { field.reportValidity(); return false; }
    }
    return true;
  };

  const next = () => { if (stepIsValid()) { setError(null); setStep((s) => Math.min(STEPS.length - 1, s + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); } };
  const back = () => { setError(null); setStep((s) => Math.max(0, s - 1)); };

  const submit = async () => {
    if (!stepIsValid()) return;
    setBusy(true);
    setError(null);
    try {
      const honeypot = String(new FormData(formRef.current!).get('website_url') ?? '');
      const result = await submitApplication({
        product_id: String(product.id),
        amount: String(Math.round(q.principalCents / 100)),
        term_months: String(q.termMonths),
        monthly_income: v.rent,
        purpose: v.purpose,
        applicant_type: v.applicant_type,
        first_name: v.first_name,
        last_name: v.last_name,
        company_name: v.company_name,
        phone: v.phone,
        email: v.email,
        county: v.county,
        country: v.country,
        collateral: v.collateral,
        collateral_detail: v.collateral_detail,
        property_location: v.property_location,
        branch_id: v.branch_id,
        contact_preference: v.contact_preference,
        consent_contact: v.consent_contact,
        consent_privacy: v.consent_privacy,
        source_page: '/apply',
        website_url: honeypot,
      });
      if (!result.ok) { setError(result.error); return; }
      setDone(result.data.no);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setError('We could not send your application just now. Please try again, or call us.');
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="form-card">
        <div className="done">
          <div className="tick" aria-hidden="true">✓</div>
          <h2 className="display-3">Application received, {v.first_name}.</h2>
          <p className="muted" style={{ maxWidth: '52ch' }}>
            A credit officer will {v.contact_preference === 'WHATSAPP' ? 'message you on WhatsApp' : v.contact_preference === 'EMAIL' ? 'email you' : 'call you'} on{' '}
            {v.contact_preference === 'EMAIL' ? v.email : v.phone} — usually within 30 minutes during office hours, and always by the next working day.
          </p>
          <p className="tiny muted" style={{ marginTop: 8 }}>Your application number</p>
          <div className="reference">{done}</div>
        </div>
        <ol className="ticks" style={{ marginTop: 30 }}>
          <li><span><b>We call you</b> to talk it through and confirm the figures.</span></li>
          <li><span><b>You bring your documents</b> to the branch — ID or passport, KRA PIN, and the title deed or rent roll. Nothing sensitive goes through a website.</span></li>
          <li><span><b>We value or inspect</b> the property, and send you an offer letter with your exact rate and fees.</span></li>
          <li><span><b>You sign, and the money is disbursed</b> to your account.</span></li>
        </ol>
        <div className="btn-row" style={{ marginTop: 28 }}>
          <Link href="/" className="btn btn-ghost">Back to the home page</Link>
          {whatsapp ? (
            <a href={whatsappHref(whatsapp, `Hello Jukiwa Credit, I have just applied online. My application number is ${done}.`)} target="_blank" rel="noreferrer" className="btn btn-primary">
              <Icon name="whatsapp" size={18} /> Message us on WhatsApp
            </a>
          ) : null}
        </div>
      </div>
    );
  }

  const minAmount = Math.min(product.min_amount_cents, q.ceilingCents) / 100;
  const maxAmount = Math.max(minAmount, q.ceilingCents / 100);

  return (
    <div className="apply-shell">
      <form ref={formRef} className="form-card" onSubmit={(e) => { e.preventDefault(); if (step < STEPS.length - 1) next(); else void submit(); }}>
        <ol className="progress" aria-label="Steps">
          {STEPS.map((s, index) => (
            <li key={s.title} data-state={index < step ? 'done' : index === step ? 'now' : 'todo'}>
              <button type="button" onClick={() => index < step && setStep(index)} aria-current={index === step ? 'step' : undefined} disabled={index > step}>
                {index + 1}. {s.title}<small>{s.hint}</small>
              </button>
            </li>
          ))}
        </ol>

        {error ? <div className="alert alert-bad" role="alert" style={{ marginBottom: 20 }}>{error}</div> : null}
        <Honeypot id="apply-website" />

        {/* ---------------------------------------------------------------- 1. the loan */}
        <div data-step="0" hidden={step !== 0} className="form">
          <div>
            <h2 className="display-3" style={{ marginBottom: 6 }}>What would you like to borrow?</h2>
            <p className="muted">Choose the kind of finance. You can change the figures with your credit officer later.</p>
          </div>
          <div className="choices" role="radiogroup" aria-label="Kind of finance">
            {products.map((p) => (
              <label key={p.slug} className="choice">
                <input type="radio" name="product" value={p.slug} checked={v.product === p.slug} onChange={() => chooseProduct(p.slug)} />
                <span><span className="ci" aria-hidden="true">{p.icon}</span><span><b>{p.name}</b><small>{p.tagline}</small></span></span>
              </label>
            ))}
          </div>

          {isRent ? (
            <div>
              <label htmlFor="rent">Monthly rent the property collects (KES) <span className="req">*</span></label>
              <input id="rent" type="text" inputMode="numeric" required value={Number(shillings(v.rent)).toLocaleString('en-GB')} onChange={(e) => set('rent', String(shillings(e.target.value)))} />
              <p className="hint">At this rent you could receive up to <b>{formatMoney(q.ceilingCents)}</b> ({product.rent_multiple_max}× the rent).</p>
            </div>
          ) : null}

          <div className="row">
            <div>
              <label htmlFor="amount">{isRent ? 'Advance you would like (KES)' : 'Amount (KES)'} <span className="req">*</span></label>
              <input
                id="amount"
                type="text"
                inputMode="numeric"
                required
                value={Number(shillings(v.amount)).toLocaleString('en-GB')}
                onChange={(e) => set('amount', String(shillings(e.target.value)))}
                onBlur={() => set('amount', String(Math.round(q.principalCents / 100)))}
              />
              <input
                className="range"
                type="range"
                aria-label="Amount"
                style={{ marginTop: 12, '--fill': `${maxAmount > minAmount ? ((clamp(shillings(v.amount), minAmount, maxAmount) - minAmount) / (maxAmount - minAmount)) * 100 : 0}%` } as React.CSSProperties}
                min={minAmount}
                max={maxAmount}
                step={amountStep(q.ceilingCents) / 100}
                value={clamp(shillings(v.amount), minAmount, maxAmount)}
                onChange={(e) => set('amount', e.target.value)}
              />
              <p className="hint">Between {formatMoneyCompact(minAmount * 100)} and {formatMoneyCompact(maxAmount * 100)}.</p>
            </div>
            <div>
              <label htmlFor="term">{isRent ? 'Recover it over' : 'Repay over'} <span className="req">*</span></label>
              <select id="term" required value={q.termMonths} onChange={(e) => set('term', e.target.value)}>
                {Array.from({ length: product.max_term_months - product.min_term_months + 1 }, (_, i) => product.min_term_months + i)
                  .filter((m) => m === product.min_term_months || m === product.max_term_months || m % 3 === 0)
                  .map((m) => <option key={m} value={m}>{formatTerm(m)}</option>)}
              </select>
              {!isRent ? (
                <>
                  <label htmlFor="income" style={{ marginTop: 16 }}>Monthly income (KES) <span className="optional">(optional)</span></label>
                  <input id="income" type="text" inputMode="numeric" value={v.rent ? Number(shillings(v.rent)).toLocaleString('en-GB') : ''} onChange={(e) => set('rent', String(shillings(e.target.value) || ''))} placeholder="Salary, business or rent" />
                </>
              ) : null}
            </div>
          </div>

          <div>
            <label htmlFor="purpose">What is it for? <span className="optional">(optional)</span></label>
            <textarea id="purpose" maxLength={600} value={v.purpose} onChange={(e) => set('purpose', e.target.value)} placeholder="e.g. To add a third floor to my building in Ruiru." style={{ minHeight: 90 }} />
          </div>
        </div>

        {/* --------------------------------------------------------------- 2. the person */}
        <div data-step="1" hidden={step !== 1} className="form">
          <div>
            <h2 className="display-3" style={{ marginBottom: 6 }}>About you</h2>
            <p className="muted">Just enough for a credit officer to reach you. We never ask for ID numbers online.</p>
          </div>
          <div className="choices compact" role="radiogroup" aria-label="You are applying as">
            {APPLICANT_TYPES.map((t) => (
              <label key={t.value} className="choice">
                <input type="radio" name="applicant_type" value={t.value} checked={v.applicant_type === t.value} onChange={() => set('applicant_type', t.value)} />
                <span><span className="ci" aria-hidden="true">{t.value === 'DIASPORA' ? '✈️' : t.value === 'COMPANY' ? '🏢' : <Flag country="ke" />}</span><b>{t.label}</b></span>
              </label>
            ))}
          </div>
          <div className="row">
            <div>
              <label htmlFor="first_name">First name <span className="req">*</span></label>
              <input id="first_name" type="text" required={step === 1} autoComplete="given-name" maxLength={80} value={v.first_name} onChange={(e) => set('first_name', e.target.value)} />
            </div>
            <div>
              <label htmlFor="last_name">Last name <span className="req">*</span></label>
              <input id="last_name" type="text" required={step === 1} autoComplete="family-name" maxLength={80} value={v.last_name} onChange={(e) => set('last_name', e.target.value)} />
            </div>
          </div>
          {v.applicant_type === 'COMPANY' ? (
            <div>
              <label htmlFor="company_name">Company name <span className="req">*</span></label>
              <input id="company_name" type="text" required={step === 1} maxLength={160} autoComplete="organization" value={v.company_name} onChange={(e) => set('company_name', e.target.value)} />
            </div>
          ) : null}
          <div className="row">
            <div>
              <label htmlFor="phone">Phone number <span className="req">*</span></label>
              <input id="phone" type="tel" required={step === 1} inputMode="tel" autoComplete="tel" maxLength={30} placeholder={v.applicant_type === 'DIASPORA' ? '+44 …' : '07xx xxx xxx'} value={v.phone} onChange={(e) => set('phone', e.target.value)} />
              <p className="hint">Include the country code if you are abroad.</p>
            </div>
            <div>
              <label htmlFor="email">Email <span className="optional">{v.contact_preference === 'EMAIL' ? '' : '(optional)'}</span>{v.contact_preference === 'EMAIL' ? <span className="req"> *</span> : null}</label>
              <input id="email" type="email" required={step === 1 && v.contact_preference === 'EMAIL'} autoComplete="email" maxLength={160} value={v.email} onChange={(e) => set('email', e.target.value)} />
            </div>
          </div>
          <div className="row">
            {v.applicant_type === 'DIASPORA' ? (
              <div>
                <label htmlFor="country">Country you live in <span className="req">*</span></label>
                <select id="country" required={step === 1} value={v.country} onChange={(e) => set('country', e.target.value)}>
                  <option value="">— choose —</option>
                  {['United Kingdom', 'United States', 'Canada', 'United Arab Emirates', 'Germany', 'Australia', 'Other'].map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
            ) : (
              <div>
                <label htmlFor="county">County you live in</label>
                <select id="county" value={v.county} onChange={(e) => set('county', e.target.value)}>
                  <option value="">— choose —</option>
                  {COUNTIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
            )}
            <div>
              <label>Best way to reach you</label>
              <div className="choices compact" role="radiogroup" aria-label="Best way to reach you" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
                {[['CALL', '📞', 'Call'], ['WHATSAPP', '💬', 'WhatsApp'], ['EMAIL', '✉️', 'Email']].map(([value, icon, label]) => (
                  <label key={value} className="choice">
                    <input type="radio" name="contact_preference" value={value} checked={v.contact_preference === value} onChange={() => set('contact_preference', value!)} />
                    <span style={{ justifyContent: 'center', padding: '12px 8px' }}><span aria-hidden="true">{icon}</span><b style={{ fontSize: '0.85rem' }}>{label}</b></span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* -------------------------------------------------------------- 3. the security */}
        <div data-step="2" hidden={step !== 2} className="form">
          <div>
            <h2 className="display-3" style={{ marginBottom: 6 }}>What would secure it?</h2>
            <p className="muted">Most of our finance is backed by property. Tell us roughly what you have — we check the detail in person.</p>
          </div>
          <div className="choices" role="radiogroup" aria-label="Security">
            {COLLATERALS.map((c) => (
              <label key={c.value} className="choice">
                <input type="radio" name="collateral" value={c.value} checked={v.collateral === c.value} onChange={() => set('collateral', c.value)} />
                <span><b>{c.label}</b></span>
              </label>
            ))}
          </div>
          <div className="row">
            <div>
              <label htmlFor="property_location">Where is the property?</label>
              <input id="property_location" type="text" maxLength={200} placeholder="e.g. Ruiru, Kiambu County" value={v.property_location} onChange={(e) => set('property_location', e.target.value)} />
            </div>
            <div>
              <label htmlFor="branch_id">Nearest Jukiwa office</label>
              <select id="branch_id" value={v.branch_id} onChange={(e) => set('branch_id', e.target.value)}>
                <option value="">— choose —</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="collateral_detail">Anything we should know? <span className="optional">(optional)</span></label>
            <textarea id="collateral_detail" maxLength={600} value={v.collateral_detail} onChange={(e) => set('collateral_detail', e.target.value)} placeholder={isRent ? 'e.g. 12 units, 11 occupied, already managed by Jukiwa.' : 'e.g. Quarter-acre plot with a ready title, no other loans on it.'} style={{ minHeight: 90 }} />
          </div>
        </div>

        {/* ----------------------------------------------------------------- 4. review */}
        <div data-step="3" hidden={step !== 3} className="form">
          <div>
            <h2 className="display-3" style={{ marginBottom: 6 }}>Check and send</h2>
            <p className="muted">Nothing is binding until you sign an offer letter.</p>
          </div>
          <dl className="review">
            <div><dt>Finance</dt><dd>{product.icon} {product.name}</dd></div>
            {isRent ? <div><dt>Monthly rent</dt><dd>{formatMoney(shillings(v.rent) * 100)}</dd></div> : null}
            <div><dt>{isRent ? 'Advance' : 'Amount'}</dt><dd>{formatMoney(q.principalCents)}</dd></div>
            <div><dt>Term</dt><dd>{formatTerm(q.termMonths)}</dd></div>
            <div><dt>Estimated monthly</dt><dd>{formatMoney(q.monthlyCents)}</dd></div>
            <div><dt>Name</dt><dd>{v.applicant_type === 'COMPANY' && v.company_name ? `${v.company_name} · ` : ''}{v.first_name} {v.last_name}</dd></div>
            <div><dt>Phone</dt><dd>{v.phone}</dd></div>
            {v.email ? <div><dt>Email</dt><dd>{v.email}</dd></div> : null}
            <div><dt>Security</dt><dd>{COLLATERALS.find((c) => c.value === v.collateral)?.label}</dd></div>
          </dl>
          <label className="check">
            <input type="checkbox" required={step === 3} checked={!!v.consent_privacy} onChange={(e) => set('consent_privacy', e.target.checked ? 'on' : '')} />
            <span>I agree that Jukiwa Credit may use these details to assess my application and contact me about it, as described in the <Link href="/privacy" target="_blank">privacy notice</Link>. <span className="req">*</span></span>
          </label>
          <label className="check">
            <input type="checkbox" checked={!!v.consent_contact} onChange={(e) => set('consent_contact', e.target.checked ? 'on' : '')} />
            <span>Tell me about other Jukiwa products and offers. (Optional — you can say no and still apply.)</span>
          </label>
        </div>

        <div className="step-actions">
          {step > 0 ? <button type="button" className="btn btn-ghost" onClick={back}>← Back</button> : <span />}
          {step < STEPS.length - 1 ? (
            <button type="button" className="btn btn-primary btn-lg" onClick={next}>Continue <Icon name="arrow" size={18} data-arrow="" /></button>
          ) : (
            <button type="button" className="btn btn-accent btn-lg" onClick={() => void submit()} disabled={busy}>
              {busy ? 'Sending…' : <>Send my application <Icon name="arrow" size={18} data-arrow="" /></>}
            </button>
          )}
        </div>
      </form>

      <aside className="apply-summary">
        <div className="summary-card">
          <h3>Your estimate</h3>
          <div>
            <div className="figure">{formatMoney(q.monthlyCents)}</div>
            <div style={{ fontSize: '0.84rem', color: 'rgb(255 255 255 / 0.65)', marginTop: 6 }}>{isRent ? 'recovered from the rent each month' : 'a month'}, for {formatTerm(q.termMonths)}</div>
          </div>
          <div className="row-kv"><span>{product.name}</span><b>{formatMoney(q.principalCents)}</b></div>
          <div className="row-kv"><span>Indicative rate</span><b>{formatBp(product.rate_pm_bp)} / month</b></div>
          <div className="row-kv"><span>Total incl. {formatBp(product.fee_bp)} fee</span><b>{formatMoney(q.totalCents)}</b></div>
          <div className="safe"><Icon name="lock" size={16} /><span>No ID numbers, PINs or documents online. You bring those to the branch, where they go straight into our lending system.</span></div>
          <div className="safe"><Icon name="clock" size={16} /><span>A credit officer calls back within 30 minutes during office hours.</span></div>
        </div>
      </aside>
    </div>
  );
}
