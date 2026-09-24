'use server';

/*
 * Every write the admin makes — to the lending pipeline and to what the website publishes.
 *
 * Each action does the same four things in the same order, and the order matters:
 *
 *   1. `requireAction` — the page Execute right and every table right the operation needs. A
 *      Server Action is a POST endpoint the whole internet can reach; the screen that rendered
 *      the form having checked the right proves nothing about the request that arrives.
 *   2. Upload any image to Cloudinary, so a failed upload fails before the row is touched.
 *   3. Call the domain function in lib/content.ts or lib/inbox.ts, which validates, writes and
 *      audits.
 *   4. Return an ActionResult the form can render — never a thrown error across the wire.
 *
 * The signature is `(previousState, formData)`, which is what `useActionState` in the admin's
 * forms expects; the first argument is unused everywhere.
 */
import { revalidatePath } from 'next/cache';
import { requireAction } from '@/lib/auth.ts';
import { actionResult } from '@/lib/errors.ts';
import { uploadImage } from '@/lib/cloudinary-server.ts';
import * as content from '@/lib/content.ts';
import * as inbox from '@/lib/inbox.ts';
import type { ActionResult } from '@/lib/types.ts';

const id = (form: FormData, key = 'id'): number => Number(form.get(key) ?? 0);

/*
 * The public pages are prerendered, and nearly all of them show content from more than one table
 * (the layout reads the settings row and the products, the home page shows products, insights and
 * testimonials). So any change refreshes the whole site, admin included, rather than guessing
 * which pages it touches.
 */
const refresh = (): void => revalidatePath('/', 'layout');

/* =================================================================== applications */

export async function setApplicationStatus(_prev: unknown, form: FormData): Promise<ActionResult<{ ok: true }>> {
  return actionResult(async () => {
    const actor = await requireAction('APPLICATIONS_UPDATE');
    await inbox.setApplicationStatus(id(form), form.get('status'), form.get('note'), actor);
    revalidatePath('/admin', 'layout');
    return { ok: true as const };
  });
}

export async function deleteApplication(_prev: unknown, form: FormData): Promise<ActionResult<{ ok: true }>> {
  return actionResult(async () => {
    const actor = await requireAction('APPLICATIONS_DELETE');
    await inbox.deleteApplication(id(form), actor);
    revalidatePath('/admin', 'layout');
    return { ok: true as const };
  });
}

/* ====================================================================== enquiries */

export async function setEnquiryStatus(_prev: unknown, form: FormData): Promise<ActionResult<{ ok: true }>> {
  return actionResult(async () => {
    const actor = await requireAction('ENQUIRIES_UPDATE');
    await inbox.setEnquiryStatus(id(form), form.get('status'), form.get('notes'), actor);
    revalidatePath('/admin', 'layout');
    return { ok: true as const };
  });
}

export async function deleteEnquiry(_prev: unknown, form: FormData): Promise<ActionResult<{ ok: true }>> {
  return actionResult(async () => {
    const actor = await requireAction('ENQUIRIES_DELETE');
    await inbox.deleteEnquiry(id(form), actor);
    revalidatePath('/admin', 'layout');
    return { ok: true as const };
  });
}

/* ====================================================================== products */

export async function saveProduct(_prev: unknown, form: FormData): Promise<ActionResult<{ id: number }>> {
  return actionResult(async () => {
    const editing = id(form);
    const actor = await requireAction(editing ? 'PRODUCTS_UPDATE' : 'PRODUCTS_CREATE');
    const uploaded = await uploadImage(form.get('image'), 'products');
    const saved = await content.saveProduct(editing || null, {
      name: form.get('name'),
      tagline: form.get('tagline'),
      summary: form.get('summary'),
      body: form.get('body'),
      icon: form.get('icon'),
      audience: form.get('audience'),
      calcMode: form.get('calc_mode'),
      ratePm: form.get('rate_pm'),
      fee: form.get('fee'),
      minAmount: form.get('min_amount'),
      maxAmount: form.get('max_amount'),
      minTerm: form.get('min_term'),
      maxTerm: form.get('max_term'),
      rentMultiple: form.get('rent_multiple'),
      features: form.get('features'),
      requirements: form.get('requirements'),
      isFeatured: form.get('is_featured'),
      isPublished: form.get('is_published'),
      sort: form.get('sort'),
      imageUrl: uploaded?.url ?? null,
    }, actor);
    refresh();
    return { id: saved };
  });
}

export async function deleteProduct(_prev: unknown, form: FormData): Promise<ActionResult<{ ok: true }>> {
  return actionResult(async () => {
    const actor = await requireAction('PRODUCTS_DELETE');
    await content.deleteProduct(id(form), actor);
    refresh();
    return { ok: true as const };
  });
}

/* ========================================================================== posts */

export async function savePost(_prev: unknown, form: FormData): Promise<ActionResult<{ id: number }>> {
  return actionResult(async () => {
    const editing = id(form);
    const actor = await requireAction(editing ? 'NEWS_UPDATE' : 'NEWS_CREATE');
    const uploaded = await uploadImage(form.get('image'), 'insights');
    const saved = await content.savePost(editing || null, {
      title: form.get('title'),
      category: form.get('category'),
      excerpt: form.get('excerpt'),
      body: form.get('body'),
      isPublished: form.get('is_published'),
      isPinned: form.get('is_pinned'),
      publishedAt: form.get('published_at'),
      imageUrl: uploaded?.url ?? null,
    }, actor);
    refresh();
    return { id: saved };
  });
}

export async function deletePost(_prev: unknown, form: FormData): Promise<ActionResult<{ ok: true }>> {
  return actionResult(async () => {
    const actor = await requireAction('NEWS_DELETE');
    await content.deletePost(id(form), actor);
    refresh();
    return { ok: true as const };
  });
}

/* ================================================================== testimonials */

export async function saveTestimonial(_prev: unknown, form: FormData): Promise<ActionResult<{ id: number }>> {
  return actionResult(async () => {
    const editing = id(form);
    const actor = await requireAction(editing ? 'TESTIMONIALS_UPDATE' : 'TESTIMONIALS_CREATE');
    const uploaded = await uploadImage(form.get('photo'), 'testimonials');
    const saved = await content.saveTestimonial(editing || null, {
      name: form.get('name'),
      roleTitle: form.get('role_title'),
      quote: form.get('quote'),
      rating: form.get('rating'),
      sort: form.get('sort'),
      isPublished: form.get('is_published'),
      photoUrl: uploaded?.url ?? null,
    }, actor);
    refresh();
    return { id: saved };
  });
}

export async function deleteTestimonial(_prev: unknown, form: FormData): Promise<ActionResult<{ ok: true }>> {
  return actionResult(async () => {
    const actor = await requireAction('TESTIMONIALS_DELETE');
    await content.deleteTestimonial(id(form), actor);
    refresh();
    return { ok: true as const };
  });
}

/* =========================================================================== FAQ */

export async function saveFaq(_prev: unknown, form: FormData): Promise<ActionResult<{ id: number }>> {
  return actionResult(async () => {
    const editing = id(form);
    const actor = await requireAction(editing ? 'FAQS_UPDATE' : 'FAQS_CREATE');
    const saved = await content.saveFaq(editing || null, {
      question: form.get('question'),
      answer: form.get('answer'),
      category: form.get('category'),
      sort: form.get('sort'),
      isPublished: form.get('is_published'),
    }, actor);
    refresh();
    return { id: saved };
  });
}

export async function deleteFaq(_prev: unknown, form: FormData): Promise<ActionResult<{ ok: true }>> {
  return actionResult(async () => {
    const actor = await requireAction('FAQS_DELETE');
    await content.deleteFaq(id(form), actor);
    refresh();
    return { ok: true as const };
  });
}

/* ========================================================================== team */

export async function saveTeamMember(_prev: unknown, form: FormData): Promise<ActionResult<{ id: number }>> {
  return actionResult(async () => {
    const editing = id(form);
    const actor = await requireAction(editing ? 'TEAM_UPDATE' : 'TEAM_CREATE');
    const uploaded = await uploadImage(form.get('photo'), 'team');
    const saved = await content.saveTeamMember(editing || null, {
      name: form.get('name'),
      roleTitle: form.get('role_title'),
      category: form.get('category'),
      bio: form.get('bio'),
      email: form.get('email'),
      linkedinUrl: form.get('linkedin_url'),
      branchId: form.get('branch_id'),
      sort: form.get('sort'),
      isPublished: form.get('is_published'),
      photoUrl: uploaded?.url ?? null,
    }, actor);
    refresh();
    return { id: saved };
  });
}

export async function deleteTeamMember(_prev: unknown, form: FormData): Promise<ActionResult<{ ok: true }>> {
  return actionResult(async () => {
    const actor = await requireAction('TEAM_DELETE');
    await content.deleteTeamMember(id(form), actor);
    refresh();
    return { ok: true as const };
  });
}

/* ====================================================================== branches */

export async function saveBranch(_prev: unknown, form: FormData): Promise<ActionResult<{ id: number }>> {
  return actionResult(async () => {
    const editing = id(form);
    const actor = await requireAction(editing ? 'BRANCHES_UPDATE' : 'BRANCHES_CREATE');
    const saved = await content.saveBranch(editing || null, {
      name: form.get('name'),
      kind: form.get('kind'),
      town: form.get('town'),
      county: form.get('county'),
      country: form.get('country'),
      address: form.get('address'),
      phone: form.get('phone'),
      email: form.get('email'),
      hours: form.get('hours'),
      mapUrl: form.get('map_url'),
      manager: form.get('manager'),
      note: form.get('note'),
      sort: form.get('sort'),
      isPublished: form.get('is_published'),
    }, actor);
    refresh();
    return { id: saved };
  });
}

export async function deleteBranch(_prev: unknown, form: FormData): Promise<ActionResult<{ ok: true }>> {
  return actionResult(async () => {
    const actor = await requireAction('BRANCHES_DELETE');
    await content.deleteBranch(id(form), actor);
    refresh();
    return { ok: true as const };
  });
}

/* ===================================================================== vacancies */

export async function saveVacancy(_prev: unknown, form: FormData): Promise<ActionResult<{ id: number }>> {
  return actionResult(async () => {
    const editing = id(form);
    const actor = await requireAction(editing ? 'CAREERS_UPDATE' : 'CAREERS_CREATE');
    const saved = await content.saveVacancy(editing || null, {
      title: form.get('title'),
      department: form.get('department'),
      location: form.get('location'),
      employmentType: form.get('employment_type'),
      summary: form.get('summary'),
      body: form.get('body'),
      closesOn: form.get('closes_on'),
      isPublished: form.get('is_published'),
    }, actor);
    refresh();
    return { id: saved };
  });
}

export async function deleteVacancy(_prev: unknown, form: FormData): Promise<ActionResult<{ ok: true }>> {
  return actionResult(async () => {
    const actor = await requireAction('CAREERS_DELETE');
    await content.deleteVacancy(id(form), actor);
    refresh();
    return { ok: true as const };
  });
}

/* =================================================================== subscribers */

export async function setSubscriberStatus(_prev: unknown, form: FormData): Promise<ActionResult<{ ok: true }>> {
  return actionResult(async () => {
    const actor = await requireAction('SUBSCRIBERS_UPDATE');
    await inbox.setSubscriberStatus(id(form), form.get('status'), actor);
    revalidatePath('/admin/subscribers');
    return { ok: true as const };
  });
}

export async function deleteSubscriber(_prev: unknown, form: FormData): Promise<ActionResult<{ ok: true }>> {
  return actionResult(async () => {
    const actor = await requireAction('SUBSCRIBERS_DELETE');
    await inbox.deleteSubscriber(id(form), actor);
    revalidatePath('/admin/subscribers');
    return { ok: true as const };
  });
}

/* ====================================================================== settings */

export async function saveSettings(_prev: unknown, form: FormData): Promise<ActionResult<{ ok: true }>> {
  return actionResult(async () => {
    const actor = await requireAction('SETTINGS_MANAGE');
    const logo = await uploadImage(form.get('logo'), 'brand');
    const hero = await uploadImage(form.get('hero_image'), 'brand');
    const values: Record<string, unknown> = {};
    for (const [key, value] of form.entries()) if (typeof value === 'string') values[key] = value;
    await content.saveSettings(values, { logo: logo?.url ?? null, hero: hero?.url ?? null }, actor);
    refresh();
    return { ok: true as const };
  });
}
