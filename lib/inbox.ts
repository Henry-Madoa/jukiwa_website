import 'server-only';

/*
 * What visitors send Jukiwa Credit: loan applications, questions, callback requests, agent and
 * partner enquiries, and newsletter sign-ups.
 *
 * These are the only tables an anonymous visitor can insert into, so this module is the site's
 * exposed surface and is written that way — every field validated, every write audited against a
 * synthetic `website` actor rather than a login, nothing read back to the caller except a
 * reference number.
 *
 * An application is worked as a pipeline — RECEIVED → REVIEWING → DOCUMENTS → APPRAISAL →
 * APPROVED → DISBURSED, or DECLINED / WITHDRAWN — so at the end of a quarter the company can say
 * how many applications the website produced and how much of what was asked for was lent. That is
 * the number the website is actually judged on.
 */
import { all, one, run, audit, value, transaction, type Actor } from './db.ts';
import { AppError } from './errors.ts';
import * as v from './validate.ts';
import { quote } from './loan-math.ts';
import { toTerms } from './site.ts';
import {
  APPLICATION_STATUSES, APPLICANT_TYPES, COLLATERALS, ENQUIRY_STATUSES, OPEN_APPLICATION_STATUSES, OPEN_ENQUIRY_STATUSES,
  type ApplicationStatus, type ApplicationView, type EnquiryKind, type EnquiryStatus, type EnquiryView, type Product, type Subscriber,
} from './types.ts';

/** Nobody is signed in when the website writes, so the trail records the form, not a person. */
export const WEBSITE: Actor = { id: 0, name: 'website', email: '' };

const now = (): string => new Date().toISOString();

/** The next number in a yearly sequence, taken inside the insert's own transaction. */
async function nextNumber(prefix: string): Promise<string> {
  const year = new Date().getUTCFullYear();
  const key = `${prefix}-${year}`;
  const n = await transaction(async (client) => {
    const { rows } = await client.query<{ value: number }>(
      `INSERT INTO web_counter (key, value) VALUES ($1, 1)
       ON CONFLICT (key) DO UPDATE SET value = web_counter.value + 1
       RETURNING value`,
      [key],
    );
    return rows[0]!.value;
  });
  return `${prefix}-${year}-${String(n).padStart(4, '0')}`;
}

/* =================================================================== applications */

const APPLICATION_SELECT = `
  SELECT a.*, p.name AS product_name, b.name AS branch_name,
         GREATEST(0, (CURRENT_DATE - a.created_at::date))::int AS age_days
  FROM web_application a
  LEFT JOIN web_product p ON p.id = a.product_id
  LEFT JOIN web_branch b ON b.id = a.branch_id`;

export const listApplications = (status?: ApplicationStatus | 'OPEN' | '' | null, search = '', productId?: number | null): Promise<ApplicationView[]> =>
  all<ApplicationView>(
    `${APPLICATION_SELECT}
     WHERE (a.no ILIKE @like OR a.first_name ILIKE @like OR a.last_name ILIKE @like OR COALESCE(a.company_name,'') ILIKE @like
            OR a.phone ILIKE @like OR COALESCE(a.email,'') ILIKE @like OR COALESCE(a.county,'') ILIKE @like)
       ${status === 'OPEN' ? 'AND a.status = ANY(@open)' : status ? 'AND a.status = @status' : ''}
       ${productId ? 'AND a.product_id = @product' : ''}
     ORDER BY (a.status = 'RECEIVED') DESC, a.created_at DESC LIMIT 500`,
    { like: `%${search.trim()}%`, status: status || null, open: OPEN_APPLICATION_STATUSES, product: productId ?? null },
  );

export const getApplication = (id: number): Promise<ApplicationView | undefined> =>
  one<ApplicationView>(`${APPLICATION_SELECT} WHERE a.id = ?`, id);

export const applicationCounts = (): Promise<{ status: ApplicationStatus; n: number; cents: number }[]> =>
  all('SELECT status, COUNT(*)::int AS n, COALESCE(SUM(amount_cents),0)::bigint AS cents FROM web_application GROUP BY status');

export interface ApplicationInput {
  productId: unknown; amount: unknown; termMonths: unknown; monthlyIncome?: unknown; purpose?: unknown;
  applicantType: unknown; firstName: unknown; lastName: unknown; companyName?: unknown;
  phone: unknown; email?: unknown; county?: unknown; country?: unknown;
  collateral?: unknown; collateralDetail?: unknown; propertyLocation?: unknown; branchId?: unknown;
  contactPreference?: unknown; consentContact?: unknown; consentPrivacy?: unknown; sourcePage?: unknown;
}

/**
 * Takes a loan application from the public site and returns its number.
 *
 * The amount, the term and the estimated repayment are worked out again here from the product row,
 * not taken from the browser: a figure an officer calls the customer about must be one the company
 * actually quoted, whatever was posted.
 */
export async function createApplication(input: ApplicationInput): Promise<{ id: number; no: string }> {
  if (!v.boolean(input.consentPrivacy)) {
    throw new AppError('Please confirm you have read how we use your information', 'VALIDATION');
  }

  const productId = v.integer(input.productId, 1, 1e9);
  const product = productId ? await one<Product>('SELECT * FROM web_product WHERE id = ? AND is_published', productId) : undefined;
  if (!product) throw new AppError('Choose the kind of finance you are applying for', 'VALIDATION');

  const asked = v.money(input.amount);
  if (asked <= 0) throw new AppError('Tell us how much you would like to borrow', 'VALIDATION');
  const rent = product.calc_mode === 'RENT_ADVANCE' ? v.money(input.monthlyIncome) : (v.money(input.monthlyIncome) || null);
  if (product.calc_mode === 'RENT_ADVANCE' && !rent) {
    throw new AppError('Tell us the monthly rent the property collects — the advance is worked out from it', 'VALIDATION');
  }
  const q = quote(toTerms(product), { amountCents: asked, termMonths: Number(input.termMonths), monthlyRentCents: rent });

  const applicantType = v.choice(input.applicantType ?? 'INDIVIDUAL', APPLICANT_TYPES.map((t) => t.value), 'kind of applicant');
  const firstName = v.required(input.firstName, 'Your first name', 80);
  const lastName = v.required(input.lastName, 'Your last name', 80);
  const companyName = v.text(input.companyName, 160);
  if (applicantType === 'COMPANY' && !companyName) throw new AppError('The company’s name is required', 'VALIDATION');

  const phone = v.phone(input.phone);
  if (!phone) throw new AppError('A phone number is required — it is how a credit officer reaches you', 'VALIDATION');
  const email = v.email(input.email);
  const country = applicantType === 'DIASPORA' ? v.required(input.country, 'The country you live in', 80) : 'Kenya';

  const collateral = v.choice(input.collateral ?? 'NONE', COLLATERALS.map((c) => c.value), 'security');
  const branchId = v.integer(input.branchId, 1, 1e9);
  if (branchId && !(await one('SELECT id FROM web_branch WHERE id = ? AND is_published', branchId))) {
    throw new AppError('Pick a branch from the list', 'VALIDATION');
  }
  const contact = v.choice(input.contactPreference ?? 'CALL', ['CALL', 'WHATSAPP', 'EMAIL'] as const, 'way to reach you');
  if (contact === 'EMAIL' && !email) throw new AppError('Give an email address if you would like us to email you', 'VALIDATION');

  const no = await nextNumber('JCL');
  const { id } = await run(
    `INSERT INTO web_application (
       no, product_id, amount_cents, term_months, monthly_income_cents, est_repayment_cents, purpose,
       applicant_type, first_name, last_name, company_name, phone, email, county, country,
       collateral, collateral_detail, property_location, branch_id, contact_preference, consent_contact,
       status, source_page, created_at)
     VALUES (?,?,?,?,?,?,?, ?,?,?,?,?,?,?,?, ?,?,?,?,?,?, 'RECEIVED',?,?)`,
    no, product.id, q.principalCents, q.termMonths, rent, q.monthlyCents, v.text(input.purpose, 600),
    applicantType, firstName, lastName, companyName, phone, email, v.text(input.county, 60), country,
    collateral, v.text(input.collateralDetail, 600), v.text(input.propertyLocation, 200), branchId, contact,
    v.boolean(input.consentContact), v.text(input.sourcePage, 200), now(),
  );
  await audit(WEBSITE, 'APPLICATION_RECEIVED', 'web_application', id, {
    no, product: product.name, amount: q.principalCents / 100, term: q.termMonths,
  });
  return { id, no };
}

export async function setApplicationStatus(id: number, status: unknown, note: unknown, actor: Actor): Promise<void> {
  const next = v.choice(status, APPLICATION_STATUSES.map((s) => s.value), 'status');
  const noteText = v.richText(note, 4_000);
  const { rowCount } = await run(
    `UPDATE web_application
     SET status = ?, handled_by = ?, handled_at = ?,
         notes = CASE WHEN ?::text IS NULL THEN notes
                      ELSE COALESCE(notes || E'\\n\\n', '') || ? END
     WHERE id = ?`,
    next, actor.name, now(), noteText, `${now().slice(0, 10)} · ${actor.name}: ${noteText ?? ''}`, id,
  );
  if (!rowCount) throw new AppError('That application no longer exists', 'NOT_FOUND');
  await audit(actor, 'APPLICATION_STATUS', 'web_application', id, { status: next, note: noteText ? 'added' : null });
}

export async function deleteApplication(id: number, actor: Actor): Promise<void> {
  const before = await one<{ no: string }>('SELECT no FROM web_application WHERE id = ?', id);
  await run('DELETE FROM web_application WHERE id = ?', id);
  await audit(actor, 'APPLICATION_DELETE', 'web_application', id, { no: before?.no ?? null });
}

/* ===================================================================== enquiries */

const ENQUIRY_SELECT = `
  SELECT e.*, p.name AS product_name, b.name AS branch_name,
         GREATEST(0, (CURRENT_DATE - e.created_at::date))::int AS age_days
  FROM web_enquiry e
  LEFT JOIN web_product p ON p.id = e.product_id
  LEFT JOIN web_branch b ON b.id = e.branch_id`;

export const listEnquiries = (status?: EnquiryStatus | 'OPEN' | '' | null, search = '', kind?: EnquiryKind | '' | null): Promise<EnquiryView[]> =>
  all<EnquiryView>(
    `${ENQUIRY_SELECT}
     WHERE (e.name ILIKE @like OR e.phone ILIKE @like OR COALESCE(e.email,'') ILIKE @like OR COALESCE(e.message,'') ILIKE @like
            OR COALESCE(e.location,'') ILIKE @like)
       ${status === 'OPEN' ? 'AND e.status = ANY(@open)' : status ? 'AND e.status = @status' : ''}
       ${kind ? 'AND e.kind = @kind' : ''}
     ORDER BY (e.status = 'NEW') DESC, e.created_at DESC LIMIT 500`,
    { like: `%${search.trim()}%`, status: status || null, open: OPEN_ENQUIRY_STATUSES, kind: kind || null },
  );

export const getEnquiry = (id: number): Promise<EnquiryView | undefined> =>
  one<EnquiryView>(`${ENQUIRY_SELECT} WHERE e.id = ?`, id);

export interface EnquiryInput {
  kind?: unknown; name: unknown; phone: unknown; email?: unknown; productId?: unknown; branchId?: unknown;
  location?: unknown; message?: unknown; preferredTime?: unknown; sourcePage?: unknown;
}

const KIND_OF = (value: unknown): EnquiryKind => {
  const upper = String(value ?? '').toUpperCase();
  return upper === 'CALLBACK' || upper === 'PARTNER' ? upper : 'ENQUIRY';
};

/** A question, a callback request or a partner enquiry. Returns its reference. */
export async function createEnquiry(input: EnquiryInput): Promise<{ id: number; reference: string }> {
  const kind = KIND_OF(input.kind);
  const name = v.required(input.name, 'Your name', 120);
  const phone = v.phone(input.phone);
  if (!phone) throw new AppError('A phone number is required — it is how we reply', 'VALIDATION');
  const email = v.email(input.email);
  const message = v.text(input.message, 2_000);
  if (kind === 'ENQUIRY' && !message) throw new AppError('Tell us what you would like to know', 'VALIDATION');
  const location = v.text(input.location, 120);
  if (kind === 'PARTNER' && !location) throw new AppError('Tell us which county or town you would represent us in', 'VALIDATION');

  const productId = v.integer(input.productId, 1, 1e9);
  if (productId && !(await one('SELECT id FROM web_product WHERE id = ? AND is_published', productId))) {
    throw new AppError('Pick a product from the list', 'VALIDATION');
  }
  const branchId = v.integer(input.branchId, 1, 1e9);
  if (branchId && !(await one('SELECT id FROM web_branch WHERE id = ? AND is_published', branchId))) {
    throw new AppError('Pick a branch from the list', 'VALIDATION');
  }

  const { id } = await run(
    `INSERT INTO web_enquiry (kind, name, phone, email, product_id, branch_id, location, message, preferred_time, source_page, status, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,'NEW',?)`,
    kind, name, phone, email, productId, branchId, location, message, v.text(input.preferredTime, 40),
    v.text(input.sourcePage, 200), now(),
  );
  await audit(WEBSITE, `${kind}_RECEIVED`, 'web_enquiry', id, { name, phone });
  const prefix = kind === 'CALLBACK' ? 'CB' : kind === 'PARTNER' ? 'PT' : 'ENQ';
  return { id, reference: `${prefix}-${String(id).padStart(4, '0')}` };
}

export async function setEnquiryStatus(id: number, status: unknown, note: unknown, actor: Actor): Promise<void> {
  const next = v.choice(status, ENQUIRY_STATUSES.map((s) => s.value), 'status');
  const { rowCount } = await run(
    'UPDATE web_enquiry SET status = ?, notes = COALESCE(?, notes), handled_by = ?, handled_at = ? WHERE id = ?',
    next, v.richText(note, 2_000), actor.name, now(), id,
  );
  if (!rowCount) throw new AppError('That enquiry no longer exists', 'NOT_FOUND');
  await audit(actor, 'ENQUIRY_STATUS', 'web_enquiry', id, { status: next });
}

export async function deleteEnquiry(id: number, actor: Actor): Promise<void> {
  await run('DELETE FROM web_enquiry WHERE id = ?', id);
  await audit(actor, 'ENQUIRY_DELETE', 'web_enquiry', id, {});
}

/* ==================================================================== newsletter */

export async function subscribe(input: { email: unknown; name?: unknown; sourcePage?: unknown }): Promise<{ email: string }> {
  const email = v.email(input.email);
  if (!email) throw new AppError('An email address is required', 'VALIDATION');
  // Signing up twice is not an error worth showing anybody — and saying "already subscribed"
  // would tell a stranger whose address is on the list.
  await run(
    `INSERT INTO web_subscriber (email, name, status, source_page, created_at) VALUES (?,?,'ACTIVE',?,?)
     ON CONFLICT (email) DO UPDATE SET status = 'ACTIVE' RETURNING id`,
    email, v.text(input.name, 120), v.text(input.sourcePage, 200), now(),
  );
  return { email };
}

export const listSubscribers = (search = ''): Promise<Subscriber[]> =>
  all<Subscriber>(
    `SELECT * FROM web_subscriber WHERE email ILIKE @like OR COALESCE(name,'') ILIKE @like ORDER BY created_at DESC LIMIT 2000`,
    { like: `%${search.trim()}%` },
  );

export async function setSubscriberStatus(id: number, status: unknown, actor: Actor): Promise<void> {
  const next = v.choice(status, ['ACTIVE', 'UNSUBSCRIBED'] as const, 'status');
  await run('UPDATE web_subscriber SET status = ? WHERE id = ?', next, id);
  await audit(actor, 'SUBSCRIBER_STATUS', 'web_subscriber', id, { status: next });
}

export async function deleteSubscriber(id: number, actor: Actor): Promise<void> {
  await run('DELETE FROM web_subscriber WHERE id = ?', id);
  await audit(actor, 'SUBSCRIBER_DELETE', 'web_subscriber', id, {});
}

/* ======================================================================= summary */

export interface InboxSummary {
  applications_new: number;
  applications_open: number;
  applications_week: number;
  pipeline_cents: number;
  approved_cents: number;
  disbursed_cents: number;
  enquiries_new: number;
  enquiries_open: number;
  callbacks_new: number;
  partners_new: number;
  posts_published: number;
  posts_draft: number;
  subscribers: number;
}

/** The numbers beside the sidebar entries and on the dashboard tiles, in one round trip. */
export async function inboxSummary(): Promise<InboxSummary> {
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const row = await one<InboxSummary>(
    `SELECT
       (SELECT COUNT(*)::int FROM web_application WHERE status = 'RECEIVED') AS applications_new,
       (SELECT COUNT(*)::int FROM web_application WHERE status = ANY(@open)) AS applications_open,
       (SELECT COUNT(*)::int FROM web_application WHERE created_at >= @week) AS applications_week,
       (SELECT COALESCE(SUM(amount_cents),0)::bigint FROM web_application WHERE status = ANY(@open)) AS pipeline_cents,
       (SELECT COALESCE(SUM(amount_cents),0)::bigint FROM web_application WHERE status = 'APPROVED') AS approved_cents,
       (SELECT COALESCE(SUM(amount_cents),0)::bigint FROM web_application WHERE status = 'DISBURSED') AS disbursed_cents,
       (SELECT COUNT(*)::int FROM web_enquiry WHERE status = 'NEW' AND kind = 'ENQUIRY') AS enquiries_new,
       (SELECT COUNT(*)::int FROM web_enquiry WHERE status = ANY(@openEnq)) AS enquiries_open,
       (SELECT COUNT(*)::int FROM web_enquiry WHERE status = 'NEW' AND kind = 'CALLBACK') AS callbacks_new,
       (SELECT COUNT(*)::int FROM web_enquiry WHERE status = 'NEW' AND kind = 'PARTNER') AS partners_new,
       (SELECT COUNT(*)::int FROM web_post WHERE is_published) AS posts_published,
       (SELECT COUNT(*)::int FROM web_post WHERE NOT is_published) AS posts_draft,
       (SELECT COUNT(*)::int FROM web_subscriber WHERE status = 'ACTIVE') AS subscribers`,
    { open: OPEN_APPLICATION_STATUSES, openEnq: OPEN_ENQUIRY_STATUSES, week: weekAgo },
  );
  return row!;
}

/** For the integrity suite and db:check — how many applications exist at all. */
export const applicationTotal = async (): Promise<number> =>
  Number(await value<number>('SELECT COUNT(*)::int FROM web_application') ?? 0);
