'use server';

/*
 * Everything an anonymous visitor may write: a loan application, a question, a callback request,
 * an agent or partner enquiry, and a newsletter sign-up. Nothing else on this site accepts a POST
 * from someone who is not signed in.
 *
 * Each one is rate-limited by address, validated in the domain layer, screened by a honeypot and
 * recorded against a synthetic `website` actor rather than a login. Nothing here reads or returns
 * anybody's personal data: the caller gets a reference number and no more.
 */
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { actionResult, AppError } from '@/lib/errors.ts';
import { rateLimit, clientIp } from '@/lib/rate-limit.ts';
import { createApplication, createEnquiry, subscribe } from '@/lib/inbox.ts';
import type { ActionResult, FormValues } from '@/lib/types.ts';

/**
 * Two windows per form: a burst, so a double-tap on a slow connection cannot file two
 * applications, and an hourly ceiling so one address cannot flood the credit team.
 */
async function guard(kind: string, perHour: number): Promise<void> {
  const ip = clientIp(await headers());
  if (!rateLimit(`site:${kind}:burst:${ip}`, 3, 60_000).ok) {
    throw new AppError('Please wait a moment before sending another — we already have your first one.', 'RATE_LIMITED');
  }
  if (!rateLimit(`site:${kind}:hour:${ip}`, perHour, 3_600_000).ok) {
    throw new AppError('Too many submissions from this connection. Please call us instead.', 'RATE_LIMITED');
  }
}

/**
 * A honeypot: a field no person sees and every crude bot fills. Cheaper than a puzzle, and a
 * landlord applying on a phone should not be asked to identify traffic lights.
 *
 * A bot that is told it failed simply tries again, so a filled honeypot is accepted silently and
 * thrown away.
 */
const looksAutomated = (values: FormValues): boolean => !!String(values.website_url ?? '').trim();

/* ------------------------------------------------------------------ application */

export async function submitApplication(values: FormValues): Promise<ActionResult<{ no: string }>> {
  return actionResult(async () => {
    await guard('application', 5);
    if (looksAutomated(values)) return { no: 'JCL-0000-0000' };

    const { no } = await createApplication({
      productId: values.product_id,
      amount: values.amount,
      termMonths: values.term_months,
      monthlyIncome: values.monthly_income,
      purpose: values.purpose,
      applicantType: values.applicant_type,
      firstName: values.first_name,
      lastName: values.last_name,
      companyName: values.company_name,
      phone: values.phone,
      email: values.email,
      county: values.county,
      country: values.country,
      collateral: values.collateral,
      collateralDetail: values.collateral_detail,
      propertyLocation: values.property_location,
      branchId: values.branch_id,
      contactPreference: values.contact_preference,
      consentContact: values.consent_contact,
      consentPrivacy: values.consent_privacy,
      sourcePage: values.source_page,
    });
    revalidatePath('/admin', 'layout');
    return { no };
  });
}

/* -------------------------------------------------- questions, callbacks, partners */

export async function submitEnquiry(values: FormValues): Promise<ActionResult<{ reference: string }>> {
  return actionResult(async () => {
    await guard('enquiry', 10);
    if (looksAutomated(values)) return { reference: 'ENQ-0000' };

    const { reference } = await createEnquiry({
      kind: values.kind,
      name: values.name,
      phone: values.phone,
      email: values.email,
      productId: values.product_id,
      branchId: values.branch_id,
      location: values.location,
      message: values.message,
      preferredTime: values.preferred_time,
      sourcePage: values.source_page,
    });
    revalidatePath('/admin', 'layout');
    return { reference };
  });
}

/* ------------------------------------------------------------------ newsletter */

export async function subscribeToNewsletter(values: FormValues): Promise<ActionResult<{ email: string }>> {
  return actionResult(async () => {
    await guard('subscribe', 10);
    if (looksAutomated(values)) return { email: String(values.email ?? '') };

    const { email } = await subscribe({ email: values.email, name: values.name, sourcePage: values.source_page });
    revalidatePath('/admin/subscribers');
    return { email };
  });
}
