'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { submitEnquiry, subscribeToNewsletter } from '@/app/actions/public.ts';
import { Icon } from './icons.tsx';

/*
 * The small forms a visitor fills in. Deliberately plain: no modal, no step a landlord on a phone
 * at nine in the evening has to think about. The one hidden field on each is the honeypot, which a
 * person never sees and a crude bot cannot resist.
 */

export interface Option { id: number; name: string }

const Req = () => <span className="req" aria-hidden="true">*</span>;
export const Honeypot = ({ id }: { id: string }) => (
  <div className="hp" aria-hidden="true">
    <label htmlFor={id}>Leave this empty</label>
    <input id={id} name="website_url" type="text" tabIndex={-1} autoComplete="off" />
  </div>
);

const COPY = {
  ENQUIRY: {
    done: 'Thank you — we have your question',
    body: 'A member of the team will reply by the next working day, usually much sooner.',
    button: 'Send my question',
  },
  CALLBACK: {
    done: 'We will call you shortly',
    body: 'During office hours a credit officer usually calls back within 30 minutes. Keep your phone close.',
    button: 'Call me back',
  },
  PARTNER: {
    done: 'Thank you for your interest',
    body: 'Our partnerships team will call you to arrange a meeting at our Nairobi headquarters.',
    button: 'Send my interest',
  },
} as const;

export function EnquiryForm({
  kind = 'ENQUIRY',
  sourcePage,
  products = [],
  branches = [],
  productId,
  dark = false,
}: {
  kind?: 'ENQUIRY' | 'CALLBACK' | 'PARTNER';
  sourcePage: string;
  products?: Option[];
  branches?: Option[];
  productId?: number;
  dark?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const copy = COPY[kind];
  const id = (name: string) => `${kind.toLowerCase()}-${name}`;

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const values = Object.fromEntries(new FormData(event.currentTarget).entries());
      const result = await submitEnquiry({ ...values, kind, source_page: sourcePage });
      if (!result.ok) { setError(result.error); return; }
      setReference(result.data.reference);
    } catch {
      setError('We could not send that just now. Please try again, or call us.');
    } finally {
      setBusy(false);
    }
  };

  if (reference) {
    return (
      <div className="done" role="status">
        <div className="tick" aria-hidden="true">✓</div>
        <h3 style={{ fontSize: '1.4rem' }}>{copy.done}</h3>
        <p className="small muted" style={{ maxWidth: '44ch' }}>{copy.body}</p>
        <p className="tiny muted" style={{ marginTop: 6 }}>Your reference</p>
        <div className="reference">{reference}</div>
      </div>
    );
  }

  return (
    <form className="form" onSubmit={onSubmit} style={dark ? { color: 'var(--ink)' } : undefined}>
      {error ? <div className="alert alert-bad" role="alert">{error}</div> : null}
      <Honeypot id={id('website')} />
      {productId && kind !== 'ENQUIRY' ? <input type="hidden" name="product_id" value={productId} /> : null}

      <div className="row">
        <div>
          <label htmlFor={id('name')}>Your name <Req /></label>
          <input id={id('name')} name="name" type="text" required autoComplete="name" maxLength={120} />
        </div>
        <div>
          <label htmlFor={id('phone')}>Phone number <Req /></label>
          <input id={id('phone')} name="phone" type="tel" required autoComplete="tel" inputMode="tel" placeholder="07xx xxx xxx" maxLength={30} />
        </div>
      </div>

      {kind === 'CALLBACK' ? (
        <div className="row">
          <div>
            <label htmlFor={id('time')}>Best time to call</label>
            <select id={id('time')} name="preferred_time" defaultValue="As soon as possible">
              {['As soon as possible', 'Morning (8–12)', 'Afternoon (12–3)', 'Late afternoon (3–5)', 'Saturday morning'].map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          {products.length && !productId ? (
            <div>
              <label htmlFor={id('product')}>Interested in</label>
              <select id={id('product')} name="product_id" defaultValue="">
                <option value="">Not sure yet</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          ) : <div />}
        </div>
      ) : null}

      {kind === 'ENQUIRY' ? (
        <>
          <div className="row">
            <div>
              <label htmlFor={id('email')}>Email <span className="optional">(optional)</span></label>
              <input id={id('email')} name="email" type="email" autoComplete="email" maxLength={160} />
            </div>
            <div>
              <label htmlFor={id('product')}>About</label>
              <select id={id('product')} name="product_id" defaultValue={productId ?? ''}>
                <option value="">Something general</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
          {branches.length ? (
            <div>
              <label htmlFor={id('branch')}>Nearest office <span className="optional">(optional)</span></label>
              <select id={id('branch')} name="branch_id" defaultValue="">
                <option value="">Any</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          ) : null}
          <div>
            <label htmlFor={id('message')}>Your question <Req /></label>
            <textarea id={id('message')} name="message" required maxLength={2000} placeholder="Tell us a little about your property and what you have in mind." />
          </div>
        </>
      ) : null}

      {kind === 'PARTNER' ? (
        <>
          <div className="row">
            <div>
              <label htmlFor={id('email')}>Email <span className="optional">(optional)</span></label>
              <input id={id('email')} name="email" type="email" autoComplete="email" maxLength={160} />
            </div>
            <div>
              <label htmlFor={id('location')}>County or country you would cover <Req /></label>
              <input id={id('location')} name="location" type="text" required maxLength={120} placeholder="e.g. Eldoret, Uasin Gishu" />
            </div>
          </div>
          <div>
            <label htmlFor={id('message')}>About you <span className="optional">(optional)</span></label>
            <textarea id={id('message')} name="message" maxLength={2000} placeholder="Your experience, and the landlords or properties you already work with." />
          </div>
        </>
      ) : null}

      <button type="submit" className={`btn ${dark ? 'btn-accent' : 'btn-primary'} btn-lg`} disabled={busy}>
        {busy ? 'Sending…' : <>{copy.button} <Icon name="arrow" size={18} data-arrow="" /></>}
      </button>
      <p className="tiny muted">
        We use these details only to reply to you. See our <Link href="/privacy">privacy notice</Link>.
      </p>
    </form>
  );
}

export function NewsletterForm({ sourcePage }: { sourcePage: string }) {
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setState('busy');
    setError(null);
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    const result = await subscribeToNewsletter({ ...values, source_page: sourcePage }).catch(() => null);
    if (!result || !result.ok) {
      setError(result && !result.ok ? result.error : 'That did not go through. Please try again.');
      setState('idle');
      return;
    }
    setState('done');
  };

  if (state === 'done') return <p style={{ color: 'var(--accent)', fontWeight: 700 }}>✓ You are on the list. Watch your inbox.</p>;

  return (
    <form onSubmit={onSubmit} aria-label="Newsletter sign-up">
      <div className="hp" aria-hidden="true"><input name="website_url" type="text" tabIndex={-1} autoComplete="off" /></div>
      <label htmlFor="newsletter-email" className="sr-only">Email address</label>
      <input id="newsletter-email" name="email" type="email" required placeholder="Your email address" autoComplete="email" />
      <button type="submit" className="btn btn-accent" disabled={state === 'busy'}>{state === 'busy' ? '…' : 'Subscribe'}</button>
      {error ? <p role="alert" style={{ color: '#ffb4ab', fontSize: '0.84rem', width: '100%' }}>{error}</p> : null}
    </form>
  );
}
