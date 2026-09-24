/*
 * Loan arithmetic. Pure functions, no database and no DOM, so the calculator in the browser, the
 * application form and the server re-quoting what was submitted all run the very same code — the
 * figure an officer sees on an application is the figure the customer saw when they sent it.
 *
 * Everything is in cents and every step rounds to a whole cent, because a repayment schedule that
 * does not add up to its own total is the first thing a careful borrower notices.
 *
 * The rates these functions are given are *indicative*: they come from the product row the admin
 * maintains, and the customer's actual rate is set in their offer letter after appraisal. Every
 * page that shows a result says so.
 */
import type { CalcMode, Cents, ProductTerms } from './types.ts';

export interface QuoteInput {
  amountCents: Cents;
  termMonths: number;
  /** RENT_ADVANCE only — the monthly rent Jukiwa collects on the property. */
  monthlyRentCents?: Cents | null;
}

export interface Quote {
  mode: CalcMode;
  /** What will actually be lent, after the product's limits (and, for an advance, the rent) apply. */
  principalCents: Cents;
  termMonths: number;
  monthlyCents: Cents;
  interestCents: Cents;
  feeCents: Cents;
  totalCents: Cents;
  /** RENT_ADVANCE: the largest advance this rent supports. Otherwise the product maximum. */
  ceilingCents: Cents;
  /** RENT_ADVANCE: the recovery as a share of the monthly rent, 0–1. Null otherwise. */
  rentShare: number | null;
  /** True when the amount asked for was brought down to a limit. */
  capped: boolean;
}

export const clamp = (n: number, min: number, max: number): number => Math.min(max, Math.max(min, n));

/** A term inside the product's range, in whole months. */
export const clampTerm = (terms: Pick<ProductTerms, 'min_term_months' | 'max_term_months'>, months: number): number =>
  clamp(Math.round(Number(months) || terms.min_term_months), terms.min_term_months, terms.max_term_months);

/** The ceiling for an advance: the product maximum, or the rent multiple if that is lower. */
export function ceilingFor(terms: ProductTerms, monthlyRentCents?: Cents | null): Cents {
  if (terms.calc_mode !== 'RENT_ADVANCE') return terms.max_amount_cents;
  const rent = Math.max(0, Number(monthlyRentCents) || 0);
  return Math.min(terms.max_amount_cents, rent * Math.max(1, terms.rent_multiple_max));
}

/** The level monthly payment on a reducing balance: P·r / (1 − (1 + r)^−n). */
export function annuity(principalCents: Cents, monthlyRate: number, months: number): Cents {
  if (months <= 0) return principalCents;
  if (monthlyRate <= 0) return Math.round(principalCents / months);
  return Math.round((principalCents * monthlyRate) / (1 - (1 + monthlyRate) ** -months));
}

export function quote(terms: ProductTerms, input: QuoteInput): Quote {
  const termMonths = clampTerm(terms, input.termMonths);
  const ceilingCents = ceilingFor(terms, input.monthlyRentCents);
  const asked = Math.max(0, Math.round(Number(input.amountCents) || 0));
  const principalCents = clamp(asked, Math.min(terms.min_amount_cents, ceilingCents), ceilingCents);
  const rate = terms.rate_pm_bp / 10_000;
  const feeCents = Math.round((principalCents * terms.fee_bp) / 10_000);

  let monthlyCents: Cents;
  let interestCents: Cents;
  if (terms.calc_mode === 'REDUCING') {
    monthlyCents = annuity(principalCents, rate, termMonths);
    interestCents = monthlyCents * termMonths - principalCents;
  } else {
    // FLAT and RENT_ADVANCE: interest on the original sum for every month of the term.
    interestCents = Math.round(principalCents * rate * termMonths);
    monthlyCents = Math.round((principalCents + interestCents) / termMonths);
  }

  const rent = Number(input.monthlyRentCents) || 0;
  return {
    mode: terms.calc_mode,
    principalCents,
    termMonths,
    monthlyCents,
    interestCents: Math.max(0, interestCents),
    feeCents,
    totalCents: principalCents + Math.max(0, interestCents) + feeCents,
    ceilingCents,
    rentShare: terms.calc_mode === 'RENT_ADVANCE' && rent > 0 ? monthlyCents / rent : null,
    capped: asked !== principalCents,
  };
}

export interface ScheduleRow {
  month: number;
  paymentCents: Cents;
  interestCents: Cents;
  principalCents: Cents;
  balanceCents: Cents;
}

/**
 * Month by month. The last row absorbs whatever rounding has accumulated, so the balance ends at
 * exactly zero rather than at a stray shilling that would confuse anybody reconciling it.
 */
export function schedule(terms: ProductTerms, q: Quote): ScheduleRow[] {
  const rows: ScheduleRow[] = [];
  const rate = terms.rate_pm_bp / 10_000;
  let balance = q.principalCents;
  const flatInterest = Math.round(q.interestCents / q.termMonths);
  const flatPrincipal = Math.round(q.principalCents / q.termMonths);

  for (let month = 1; month <= q.termMonths; month += 1) {
    const last = month === q.termMonths;
    let interest: number;
    let principal: number;
    if (q.mode === 'REDUCING') {
      interest = Math.round(balance * rate);
      principal = last ? balance : q.monthlyCents - interest;
    } else {
      interest = last ? q.interestCents - flatInterest * (q.termMonths - 1) : flatInterest;
      principal = last ? balance : flatPrincipal;
    }
    balance = Math.max(0, balance - principal);
    rows.push({ month, paymentCents: interest + principal, interestCents: interest, principalCents: principal, balanceCents: balance });
  }
  return rows;
}

/** A sensible starting amount for a calculator: a round figure a third of the way up the range. */
export function suggestedAmount(terms: ProductTerms): Cents {
  const span = terms.max_amount_cents - terms.min_amount_cents;
  const raw = terms.min_amount_cents + span / 3;
  const step = raw >= 100_000_000 ? 50_000_000 : raw >= 10_000_000 ? 5_000_000 : 1_000_000;
  return clamp(Math.round(raw / step) * step, terms.min_amount_cents, terms.max_amount_cents);
}

/** The slider step for a range: fine at the bottom, coarse at the top. */
export function amountStep(maxCents: Cents): Cents {
  if (maxCents >= 1_000_000_000) return 5_000_000; // KES 50,000
  if (maxCents >= 100_000_000) return 1_000_000; // KES 10,000
  return 100_000; // KES 1,000
}
