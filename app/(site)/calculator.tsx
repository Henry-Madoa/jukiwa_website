'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { amountStep, clamp, quote, schedule, suggestedAmount } from '@/lib/loan-math.ts';
import { formatMoney, formatMoneyCompact, formatBp, formatTerm } from '@/lib/format.ts';
import type { ProductTerms } from '@/lib/types.ts';
import { Icon } from './icons.tsx';

/*
 * The loan calculator.
 *
 * It runs lib/loan-math.ts — the very same functions the server uses to re-quote an application
 * when it arrives — so the figure a customer sees here is the figure a credit officer sees on
 * their application. The terms come from the product rows the Credit Manager maintains, so a
 * change of rate in the admin is a change here by the next page load.
 *
 * For a rent advance the question is different, and so is the calculator: you tell it the rent,
 * and it tells you the most you can have and how much of each month's rent will go to repaying it.
 */

const cents = (shillings: number): number => Math.round(shillings * 100);
const digits = (text: string): number => Number(text.replace(/[^\d]/g, '')) || 0;
const fill = (value: number, min: number, max: number): string => `${max > min ? ((value - min) / (max - min)) * 100 : 0}%`;

/** Where the amount slider starts: five months' rent for an advance, a third of the range otherwise. */
const startingAmount = (p: ProductTerms, rentCents: number): number =>
  p.calc_mode === 'RENT_ADVANCE' ? Math.min(rentCents * Math.min(5, p.rent_multiple_max), p.max_amount_cents) : suggestedAmount(p);

export function LoanCalculator({
  products,
  initial,
  variant = 'full',
  title = 'What would it cost?',
}: {
  products: ProductTerms[];
  initial?: string;
  /** hero: tabs and the essentials. full: everything, including the repayment schedule. single: one product, no switching. */
  variant?: 'hero' | 'full' | 'single';
  title?: string;
}) {
  const start = products.find((p) => p.slug === initial) ?? products[0];
  const [slug, setSlug] = useState(start?.slug ?? '');
  const product = products.find((p) => p.slug === slug) ?? start;

  const [rent, setRent] = useState<number>(cents(400_000));
  const [amount, setAmount] = useState<number>(() => (start ? startingAmount(start, cents(400_000)) : 0));
  const [term, setTerm] = useState<number>(() => (start ? Math.min(start.max_term_months, Math.max(start.min_term_months, 12)) : 12));
  const [showSchedule, setShowSchedule] = useState(false);

  const q = useMemo(
    () => (product ? quote(product, { amountCents: amount, termMonths: term, monthlyRentCents: rent }) : null),
    [product, amount, term, rent],
  );
  const rows = useMemo(() => (product && q && showSchedule ? schedule(product, q) : []), [product, q, showSchedule]);

  if (!product || !q) return null;

  const isRent = product.calc_mode === 'RENT_ADVANCE';
  const minAmount = Math.min(product.min_amount_cents, q.ceilingCents);
  const maxAmount = Math.max(minAmount, q.ceilingCents);
  const step = amountStep(maxAmount);

  const choose = (next: ProductTerms) => {
    setSlug(next.slug);
    setAmount(startingAmount(next, rent));
    setTerm(clamp(12, next.min_term_months, next.max_term_months));
    setShowSchedule(false);
  };

  /* A change of rent keeps the multiple the customer had chosen, so "5× my rent" stays 5×. */
  const changeRent = (next: number) => {
    const multiple = clamp(amount / Math.max(rent, 1), 1, product.rent_multiple_max);
    setRent(next);
    setAmount(Math.min(product.max_amount_cents, Math.round((next * multiple) / 100_000) * 100_000));
  };

  const applyHref =`/apply?product=${product.slug}&amount=${Math.round(q.principalCents / 100)}&term=${q.termMonths}${isRent ? `&rent=${Math.round(rent / 100)}` : ''}`;

  return (
    <div className={`calc ${variant === 'full' ? 'calc-plain' : variant === 'hero' ? 'calc-hero' : ''}`}>
      <div className="calc-head">
        <h3>{title}</h3>
        <span className="badge-live">Live figures</span>
      </div>

      {variant === 'single' ? null : variant === 'hero' ? (
        <div className="calc-tabs" role="group" aria-label="Kind of finance">
          {products.map((p) => (
            <button key={p.slug} type="button" aria-pressed={p.slug === product.slug} onClick={() => choose(p)}>
              <span aria-hidden="true">{p.icon}</span>{p.name}
            </button>
          ))}
        </div>
      ) : (
        <>
          <label htmlFor="calc-product" className="sr-only">Kind of finance</label>
          <select id="calc-product" className="calc-select" value={product.slug} onChange={(e) => choose(products.find((p) => p.slug === e.target.value)!)}>
            {products.map((p) => <option key={p.slug} value={p.slug}>{p.icon} {p.name}</option>)}
          </select>
        </>
      )}

      {isRent ? (
        <div className="calc-field">
          <div className="calc-field-top">
            <label htmlFor="calc-rent">Monthly rent the property collects</label>
            <span className="calc-value">
              <small>KES</small>
              <input
                id="calc-rent"
                inputMode="numeric"
                value={(rent / 100).toLocaleString('en-GB')}
                onChange={(e) => changeRent(cents(digits(e.target.value)))}
              />
            </span>
          </div>
          <input
            className="range"
            type="range"
            aria-label="Monthly rent"
            min={cents(20_000)}
            max={cents(2_000_000)}
            step={cents(5_000)}
            value={clamp(rent, cents(20_000), cents(2_000_000))}
            style={{ '--fill': fill(rent, cents(20_000), cents(2_000_000)) } as React.CSSProperties}
            onChange={(e) => changeRent(Number(e.target.value))}
          />
          <div className="calc-range-labels"><span>KES 20K</span><span>KES 2M</span></div>
        </div>
      ) : null}

      {isRent ? (
        <div className="calc-ceiling">
          <Icon name="zap" size={18} />
          <span>At that rent you could receive up to <b>{formatMoney(q.ceilingCents)}</b> — {product.rent_multiple_max}× the monthly rent.</span>
        </div>
      ) : null}

      <div className="calc-field">
        <div className="calc-field-top">
          <label htmlFor="calc-amount">{isRent ? 'Advance you would like' : 'How much you need'}</label>
          <span className="calc-value">
            <small>KES</small>
            <input
              id="calc-amount"
              inputMode="numeric"
              value={(Math.round(amount / 100)).toLocaleString('en-GB')}
              onChange={(e) => setAmount(cents(digits(e.target.value)))}
              onBlur={() => setAmount(q.principalCents)}
            />
          </span>
        </div>
        <input
          className="range"
          type="range"
          aria-label="Amount"
          min={minAmount}
          max={maxAmount}
          step={step}
          value={clamp(amount, minAmount, maxAmount)}
          style={{ '--fill': fill(clamp(amount, minAmount, maxAmount), minAmount, maxAmount) } as React.CSSProperties}
          onChange={(e) => setAmount(Number(e.target.value))}
        />
        <div className="calc-range-labels"><span>{formatMoneyCompact(minAmount)}</span><span>{formatMoneyCompact(maxAmount)}</span></div>
      </div>

      <div className="calc-field">
        <div className="calc-field-top">
          <label htmlFor="calc-term">{isRent ? 'Recovered over' : 'Repay over'}</label>
          <span className="calc-value">{formatTerm(q.termMonths)}</span>
        </div>
        <input
          id="calc-term"
          className="range"
          type="range"
          min={product.min_term_months}
          max={product.max_term_months}
          step={1}
          value={q.termMonths}
          style={{ '--fill': fill(q.termMonths, product.min_term_months, product.max_term_months) } as React.CSSProperties}
          onChange={(e) => setTerm(Number(e.target.value))}
        />
        <div className="calc-range-labels"><span>{product.min_term_months} months</span><span>{product.max_term_months} months</span></div>
      </div>

      <div className="calc-result" aria-live="polite">
        <div className="calc-result-main">
          <div>
            <div className="k">{isRent ? 'Recovered from the rent each month' : 'Estimated monthly repayment'}</div>
            <div className="v">{formatMoney(q.monthlyCents)}<small>/ month</small></div>
          </div>
          <span className="chip chip-accent" style={{ background: 'rgb(255 255 255 / 0.12)', color: 'var(--accent)' }}>
            {formatBp(product.rate_pm_bp)} a month · {product.calc_mode === 'REDUCING' ? 'reducing' : 'flat'}
          </span>
        </div>
        <div className="calc-breakdown">
          <div><span>{isRent ? 'Advance' : 'Loan'}</span><b>{formatMoney(q.principalCents)}</b></div>
          <div><span>Interest</span><b>{formatMoney(q.interestCents)}</b></div>
          <div><span>Total incl. fee</span><b>{formatMoney(q.totalCents)}</b></div>
        </div>
        {isRent && q.rentShare !== null ? (
          <div className="calc-meter">
            <div className="calc-meter-track"><div className="calc-meter-fill" style={{ width: `${Math.min(100, q.rentShare * 100)}%` }} /></div>
            <p>
              {q.rentShare <= 1
                ? `${Math.round(q.rentShare * 100)}% of the rent goes to the advance; the other ${formatMoney(Math.max(0, rent - q.monthlyCents))} still comes to you (before management fees).`
                : 'The recovery is more than the rent — choose a longer term or a smaller advance.'}
            </p>
          </div>
        ) : null}
        <div className="calc-cta">
          <Link href={applyHref} className="btn btn-accent btn-block">
            Apply for {formatMoneyCompact(q.principalCents)} <Icon name="arrow" size={18} data-arrow="" />
          </Link>
        </div>
      </div>

      <p className="calc-note">
        Indicative figures at our published rate for {product.name.toLowerCase()}, including a {formatBp(product.fee_bp)} one-off fee.
        Your actual rate is confirmed in your offer letter after appraisal.
      </p>

      {variant === 'full' ? (
        <div className="schedule">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowSchedule(!showSchedule)} aria-expanded={showSchedule}>
            <Icon name="file" size={16} /> {showSchedule ? 'Hide' : 'Show'} the month-by-month schedule
          </button>
          {showSchedule ? (
            <div className="schedule-scroll" style={{ marginTop: 14 }}>
              <table>
                <thead><tr><th>Month</th><th>Payment</th><th>Interest</th><th>Principal</th><th>Balance</th></tr></thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.month}>
                      <td>{row.month}</td>
                      <td>{formatMoney(row.paymentCents)}</td>
                      <td>{formatMoney(row.interestCents)}</td>
                      <td>{formatMoney(row.principalCents)}</td>
                      <td>{formatMoney(row.balanceCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
