import 'server-only';

/*
 * The admin's read and write layer for everything the website publishes.
 *
 * Unlike lib/site.ts, reads here include drafts and unpublished rows — this is what the people
 * running the site see. Every write validates its input, writes, and records itself in the audit
 * trail, in that order, and every one takes the actor explicitly so the trail always names the
 * person who actually made the request.
 */
import { all, one, run, value, audit, type Actor } from './db.ts';
import { AppError } from './errors.ts';
import { uniqueSlug } from './slugify.ts';
import * as v from './validate.ts';
import {
  AUDIENCES, BRANCH_KINDS, CALC_MODES, FAQ_CATEGORIES, POST_CATEGORIES, TEAM_CATEGORIES,
  type AuditEntry, type Branch, type Faq, type HeroImage, type Post, type Product, type Settings, type TeamMember, type Testimonial, type Vacancy,
} from './types.ts';

const now = (): string => new Date().toISOString();

/* ====================================================================== products */

export const adminProducts = (): Promise<(Product & { applications: number })[]> =>
  all(
    `SELECT p.*, (SELECT COUNT(*)::int FROM web_application a WHERE a.product_id = p.id) AS applications
     FROM web_product p ORDER BY p.sort, p.name`,
  );

export const adminProduct = (id: number): Promise<Product | undefined> => one<Product>('SELECT * FROM web_product WHERE id = ?', id);

export interface ProductInput {
  name: unknown; tagline: unknown; summary: unknown; body: unknown; icon: unknown; audience: unknown; calcMode: unknown;
  ratePm: unknown; fee: unknown; minAmount: unknown; maxAmount: unknown; minTerm: unknown; maxTerm: unknown;
  rentMultiple: unknown; features: unknown; requirements: unknown; isFeatured: unknown; isPublished: unknown; sort: unknown;
  imageUrl?: string | null;
}

/** A percentage typed into a form ("1.5") → basis points (150). */
const percentToBp = (value: unknown, label: string, max = 100): number => {
  const n = v.number(String(value ?? '').replace('%', ''));
  if (n === null || n < 0 || n > max) throw new AppError(`${label} must be a percentage between 0 and ${max}`, 'VALIDATION');
  return Math.round(n * 100);
};

function readProduct(input: ProductInput) {
  const calc_mode = v.choice(input.calcMode, CALC_MODES.map((m) => m.value), 'repayment method');
  const min_amount_cents = v.money(input.minAmount);
  const max_amount_cents = v.money(input.maxAmount);
  if (max_amount_cents <= 0) throw new AppError('Set the largest amount this product lends', 'VALIDATION');
  if (min_amount_cents > max_amount_cents) throw new AppError('The smallest amount cannot be more than the largest', 'VALIDATION');
  const min_term_months = v.integer(input.minTerm, 1, 360, 1)!;
  const max_term_months = v.integer(input.maxTerm, 1, 360, 12)!;
  if (min_term_months > max_term_months) throw new AppError('The shortest term cannot be longer than the longest', 'VALIDATION');
  const rent_multiple_max = v.integer(input.rentMultiple, 0, 50, 0)!;
  if (calc_mode === 'RENT_ADVANCE' && rent_multiple_max < 1) {
    throw new AppError('A rent advance needs a rent multiple — how many months of rent may be advanced', 'VALIDATION');
  }
  return {
    name: v.required(input.name, 'A name', 120),
    tagline: v.text(input.tagline, 160),
    summary: v.text(input.summary, 600),
    body: v.richText(input.body, 12_000),
    icon: v.text(input.icon, 8),
    audience: v.choice(input.audience, AUDIENCES.map((a) => a.value), 'audience'),
    calc_mode,
    rate_pm_bp: percentToBp(input.ratePm, 'The monthly rate', 20),
    fee_bp: percentToBp(input.fee, 'The fee', 20),
    min_amount_cents,
    max_amount_cents,
    min_term_months,
    max_term_months,
    rent_multiple_max,
    features: v.richText(input.features, 3_000),
    requirements: v.richText(input.requirements, 3_000),
    is_featured: v.boolean(input.isFeatured),
    is_published: v.boolean(input.isPublished),
    sort: v.integer(input.sort, 0, 9999, 0)!,
  };
}

export async function saveProduct(id: number | null, input: ProductInput, actor: Actor): Promise<number> {
  const row = readProduct(input);
  if (id) {
    const before = await adminProduct(id);
    if (!before) throw new AppError('That product no longer exists', 'NOT_FOUND');
    const slug = before.name === row.name ? before.slug : await uniqueSlug('web_product', row.name, id);
    await run(
      `UPDATE web_product SET name=@name, slug=@slug, tagline=@tagline, summary=@summary, body=@body, icon=@icon, image_url=@image,
         audience=@audience, calc_mode=@calc_mode, rate_pm_bp=@rate_pm_bp, fee_bp=@fee_bp,
         min_amount_cents=@min_amount_cents, max_amount_cents=@max_amount_cents, min_term_months=@min_term_months,
         max_term_months=@max_term_months, rent_multiple_max=@rent_multiple_max, features=@features, requirements=@requirements,
         is_featured=@is_featured, is_published=@is_published, sort=@sort, updated_at=@now
       WHERE id=@id`,
      { ...row, slug, image: input.imageUrl ?? before.image_url, now: now(), id },
    );
    // A change of rate is the one edit to a product somebody will later ask about.
    await audit(actor, 'PRODUCT_UPDATE', 'web_product', id, {
      name: row.name,
      rate: before.rate_pm_bp !== row.rate_pm_bp ? `${before.rate_pm_bp}→${row.rate_pm_bp} bp` : null,
      published: row.is_published,
    });
    return id;
  }
  const slug = await uniqueSlug('web_product', row.name);
  const { id: created } = await run(
    `INSERT INTO web_product (name, slug, tagline, summary, body, icon, image_url, audience, calc_mode, rate_pm_bp, fee_bp,
       min_amount_cents, max_amount_cents, min_term_months, max_term_months, rent_multiple_max, features, requirements,
       is_featured, is_published, sort, created_at)
     VALUES (@name,@slug,@tagline,@summary,@body,@icon,@image,@audience,@calc_mode,@rate_pm_bp,@fee_bp,
       @min_amount_cents,@max_amount_cents,@min_term_months,@max_term_months,@rent_multiple_max,@features,@requirements,
       @is_featured,@is_published,@sort,@now)`,
    { ...row, slug, image: input.imageUrl ?? null, now: now() },
  );
  await audit(actor, 'PRODUCT_CREATE', 'web_product', created, { name: row.name });
  return created;
}

export async function deleteProduct(id: number, actor: Actor): Promise<void> {
  const before = await adminProduct(id);
  if (!before) return;
  // Applications keep their row — the product link is set to null — so the pipeline stays whole.
  await run('DELETE FROM web_product WHERE id = ?', id);
  await audit(actor, 'PRODUCT_DELETE', 'web_product', id, { name: before.name });
}

/* ========================================================================== posts */

export const adminPosts = (): Promise<Post[]> =>
  all<Post>('SELECT * FROM web_post ORDER BY is_published, published_at DESC');

export const adminPost = (id: number): Promise<Post | undefined> => one<Post>('SELECT * FROM web_post WHERE id = ?', id);

export interface PostInput {
  title: unknown; category: unknown; excerpt: unknown; body: unknown; isPublished: unknown; isPinned: unknown;
  publishedAt: unknown; imageUrl?: string | null;
}

export async function savePost(id: number | null, input: PostInput, actor: Actor): Promise<number> {
  const title = v.required(input.title, 'A title', 200);
  const body = v.richText(input.body, 40_000);
  if (!body) throw new AppError('The article needs a body', 'VALIDATION');
  const row = {
    title,
    category: v.choice(input.category, POST_CATEGORIES.map((c) => c.value), 'category'),
    excerpt: v.text(input.excerpt, 400),
    body,
    is_published: v.boolean(input.isPublished),
    is_pinned: v.boolean(input.isPinned),
    published_at: v.isoDateTime(input.publishedAt, 'The publication date') ?? now(),
  };

  if (id) {
    const before = await adminPost(id);
    if (!before) throw new AppError('That article no longer exists', 'NOT_FOUND');
    const slug = before.title === title ? before.slug : await uniqueSlug('web_post', title, id);
    await run(
      `UPDATE web_post SET title=@title, slug=@slug, category=@category, excerpt=@excerpt, body=@body, image_url=@image,
         is_published=@is_published, is_pinned=@is_pinned, published_at=@published_at, updated_at=@now WHERE id=@id`,
      { ...row, slug, image: input.imageUrl ?? before.image_url, now: now(), id },
    );
    await audit(actor, 'POST_UPDATE', 'web_post', id, { title, published: row.is_published });
    return id;
  }
  const slug = await uniqueSlug('web_post', title);
  const { id: created } = await run(
    `INSERT INTO web_post (title, slug, category, excerpt, body, image_url, is_published, is_pinned, published_at, author, created_at)
     VALUES (@title,@slug,@category,@excerpt,@body,@image,@is_published,@is_pinned,@published_at,@author,@now)`,
    { ...row, slug, image: input.imageUrl ?? null, author: actor.name, now: now() },
  );
  await audit(actor, 'POST_CREATE', 'web_post', created, { title });
  return created;
}

export async function deletePost(id: number, actor: Actor): Promise<void> {
  const before = await adminPost(id);
  await run('DELETE FROM web_post WHERE id = ?', id);
  await audit(actor, 'POST_DELETE', 'web_post', id, { title: before?.title ?? null });
}

/* ================================================================== testimonials */

export const adminTestimonials = (): Promise<Testimonial[]> => all<Testimonial>('SELECT * FROM web_testimonial ORDER BY sort, id');

export interface TestimonialInput {
  name: unknown; roleTitle: unknown; quote: unknown; rating: unknown; sort: unknown; isPublished: unknown; photoUrl?: string | null;
}

export async function saveTestimonial(id: number | null, input: TestimonialInput, actor: Actor): Promise<number> {
  const row = {
    name: v.required(input.name, 'A name', 120),
    role_title: v.text(input.roleTitle, 120),
    quote: v.required(input.quote, 'The quote', 1_200),
    rating: v.integer(input.rating, 1, 5, 5)!,
    sort: v.integer(input.sort, 0, 9999, 0)!,
    is_published: v.boolean(input.isPublished),
  };
  if (id) {
    const before = await one<Testimonial>('SELECT * FROM web_testimonial WHERE id = ?', id);
    if (!before) throw new AppError('That testimonial no longer exists', 'NOT_FOUND');
    await run(
      'UPDATE web_testimonial SET name=@name, role_title=@role_title, quote=@quote, rating=@rating, sort=@sort, is_published=@is_published, photo_url=@photo WHERE id=@id',
      { ...row, photo: input.photoUrl ?? before.photo_url, id },
    );
    await audit(actor, 'TESTIMONIAL_UPDATE', 'web_testimonial', id, { name: row.name });
    return id;
  }
  const { id: created } = await run(
    'INSERT INTO web_testimonial (name, role_title, quote, rating, sort, is_published, photo_url, created_at) VALUES (@name,@role_title,@quote,@rating,@sort,@is_published,@photo,@now)',
    { ...row, photo: input.photoUrl ?? null, now: now() },
  );
  await audit(actor, 'TESTIMONIAL_CREATE', 'web_testimonial', created, { name: row.name });
  return created;
}

export async function deleteTestimonial(id: number, actor: Actor): Promise<void> {
  await run('DELETE FROM web_testimonial WHERE id = ?', id);
  await audit(actor, 'TESTIMONIAL_DELETE', 'web_testimonial', id, {});
}

/* ============================================================== hero backgrounds */

export const adminHeroImages = (): Promise<HeroImage[]> => all<HeroImage>('SELECT * FROM web_hero_image ORDER BY sort, id');

/** Adds a batch of freshly uploaded pictures to the end of the library, switched on. */
export async function addHeroImages(urls: string[], label: unknown, actor: Actor): Promise<number[]> {
  if (!urls.length) throw new AppError('Choose at least one picture to add', 'VALIDATION');
  const name = v.text(label, 120);
  let sort = Number(await value<number>('SELECT COALESCE(MAX(sort), -1) + 1 FROM web_hero_image')) || 0;
  const created: number[] = [];
  for (const url of urls) {
    const { id } = await run(
      'INSERT INTO web_hero_image (image_url, label, is_active, sort, created_at, created_by) VALUES (?,?,TRUE,?,?,?)',
      url, name, sort++, now(), actor.name,
    );
    await audit(actor, 'HERO_IMAGE_CREATE', 'web_hero_image', id, { label: name, url });
    created.push(id);
  }
  return created;
}

export interface HeroImageInput { label: unknown; sort: unknown; isActive: unknown }

export async function saveHeroImage(id: number, input: HeroImageInput, actor: Actor): Promise<number> {
  const before = await one<HeroImage>('SELECT * FROM web_hero_image WHERE id = ?', id);
  if (!before) throw new AppError('That picture is no longer in the library', 'NOT_FOUND');
  const row = {
    label: v.text(input.label, 120),
    sort: v.integer(input.sort, 0, 9999, 0)!,
    is_active: v.boolean(input.isActive),
  };
  await run('UPDATE web_hero_image SET label=@label, sort=@sort, is_active=@is_active WHERE id=@id', { ...row, id });
  await audit(actor, 'HERO_IMAGE_UPDATE', 'web_hero_image', id, {
    label: row.label, active: `${before.is_active} → ${row.is_active}`, sort: `${before.sort} → ${row.sort}`,
  });
  return id;
}

/** Removes a picture from the library and returns its address, so the caller can remove the file from Cloudinary too. */
export async function deleteHeroImage(id: number, actor: Actor): Promise<string | null> {
  const before = await one<HeroImage>('SELECT * FROM web_hero_image WHERE id = ?', id);
  if (!before) return null;
  await run('DELETE FROM web_hero_image WHERE id = ?', id);
  await audit(actor, 'HERO_IMAGE_DELETE', 'web_hero_image', id, { label: before.label, url: before.image_url });
  return before.image_url;
}

/* =========================================================================== FAQ */

export const adminFaqs = (): Promise<Faq[]> => all<Faq>('SELECT * FROM web_faq ORDER BY sort, id');

export interface FaqInput { question: unknown; answer: unknown; category: unknown; sort: unknown; isPublished: unknown }

export async function saveFaq(id: number | null, input: FaqInput, actor: Actor): Promise<number> {
  const row = {
    question: v.required(input.question, 'The question', 300),
    answer: v.required(input.answer, 'The answer', 4_000),
    category: v.choice(input.category, FAQ_CATEGORIES.map((c) => c.value), 'category'),
    sort: v.integer(input.sort, 0, 9999, 0)!,
    is_published: v.boolean(input.isPublished),
  };
  if (id) {
    const { rowCount } = await run(
      'UPDATE web_faq SET question=@question, answer=@answer, category=@category, sort=@sort, is_published=@is_published WHERE id=@id',
      { ...row, id },
    );
    if (!rowCount) throw new AppError('That question no longer exists', 'NOT_FOUND');
    await audit(actor, 'FAQ_UPDATE', 'web_faq', id, { question: row.question });
    return id;
  }
  const { id: created } = await run(
    'INSERT INTO web_faq (question, answer, category, sort, is_published) VALUES (@question,@answer,@category,@sort,@is_published)',
    row,
  );
  await audit(actor, 'FAQ_CREATE', 'web_faq', created, { question: row.question });
  return created;
}

export async function deleteFaq(id: number, actor: Actor): Promise<void> {
  await run('DELETE FROM web_faq WHERE id = ?', id);
  await audit(actor, 'FAQ_DELETE', 'web_faq', id, {});
}

/* ========================================================================== team */

export const adminTeam = (): Promise<(TeamMember & { branch_name: string | null })[]> =>
  all('SELECT t.*, b.name AS branch_name FROM web_team t LEFT JOIN web_branch b ON b.id = t.branch_id ORDER BY t.sort, t.name');

export const adminTeamMember = (id: number): Promise<TeamMember | undefined> => one<TeamMember>('SELECT * FROM web_team WHERE id = ?', id);

export interface TeamInput {
  name: unknown; roleTitle: unknown; category: unknown; bio: unknown; email: unknown; linkedinUrl: unknown;
  branchId: unknown; sort: unknown; isPublished: unknown; photoUrl?: string | null;
}

export async function saveTeamMember(id: number | null, input: TeamInput, actor: Actor): Promise<number> {
  const branchId = v.integer(input.branchId, 1, 1e9);
  if (branchId && !(await one('SELECT id FROM web_branch WHERE id = ?', branchId))) throw new AppError('That branch no longer exists', 'VALIDATION');
  const row = {
    name: v.required(input.name, 'A name', 120),
    role_title: v.required(input.roleTitle, 'A job title', 120),
    category: v.choice(input.category, TEAM_CATEGORIES.map((c) => c.value), 'group'),
    bio: v.richText(input.bio, 3_000),
    email: v.email(input.email),
    linkedin_url: v.url(input.linkedinUrl, 'The LinkedIn link'),
    branch_id: branchId,
    sort: v.integer(input.sort, 0, 9999, 0)!,
    is_published: v.boolean(input.isPublished),
  };
  if (id) {
    const before = await adminTeamMember(id);
    if (!before) throw new AppError('That profile no longer exists', 'NOT_FOUND');
    await run(
      `UPDATE web_team SET name=@name, role_title=@role_title, category=@category, bio=@bio, email=@email, linkedin_url=@linkedin_url,
         branch_id=@branch_id, sort=@sort, is_published=@is_published, photo_url=@photo WHERE id=@id`,
      { ...row, photo: input.photoUrl ?? before.photo_url, id },
    );
    await audit(actor, 'TEAM_UPDATE', 'web_team', id, { name: row.name });
    return id;
  }
  const { id: created } = await run(
    `INSERT INTO web_team (name, role_title, category, bio, email, linkedin_url, branch_id, sort, is_published, photo_url)
     VALUES (@name,@role_title,@category,@bio,@email,@linkedin_url,@branch_id,@sort,@is_published,@photo)`,
    { ...row, photo: input.photoUrl ?? null },
  );
  await audit(actor, 'TEAM_CREATE', 'web_team', created, { name: row.name });
  return created;
}

export async function deleteTeamMember(id: number, actor: Actor): Promise<void> {
  const before = await adminTeamMember(id);
  await run('DELETE FROM web_team WHERE id = ?', id);
  await audit(actor, 'TEAM_DELETE', 'web_team', id, { name: before?.name ?? null });
}

/* ====================================================================== branches */

export const adminBranches = (): Promise<Branch[]> => all<Branch>('SELECT * FROM web_branch ORDER BY sort, name');

export interface BranchInput {
  name: unknown; kind: unknown; town: unknown; county: unknown; country: unknown; address: unknown; phone: unknown;
  email: unknown; hours: unknown; mapUrl: unknown; manager: unknown; note: unknown; sort: unknown; isPublished: unknown;
}

/** Only a Google Maps embed may be framed — the Content-Security-Policy allows nothing else. */
function mapEmbed(value: unknown): string | null {
  const url = v.url(value, 'The map link');
  if (url && !/^https:\/\/(www\.)?google\.com\/maps/.test(url)) {
    throw new AppError('The map link must be a Google Maps embed link (https://www.google.com/maps/embed?…)', 'VALIDATION');
  }
  return url;
}

export async function saveBranch(id: number | null, input: BranchInput, actor: Actor): Promise<number> {
  const row = {
    name: v.required(input.name, 'A name', 120),
    kind: v.choice(input.kind, BRANCH_KINDS.map((k) => k.value), 'kind of office'),
    town: v.text(input.town, 80),
    county: v.text(input.county, 80),
    country: v.text(input.country, 80) ?? 'Kenya',
    address: v.richText(input.address, 400),
    phone: v.phone(input.phone),
    email: v.email(input.email),
    hours: v.text(input.hours, 200),
    map_url: mapEmbed(input.mapUrl),
    manager: v.text(input.manager, 120),
    note: v.text(input.note, 400),
    sort: v.integer(input.sort, 0, 9999, 0)!,
    is_published: v.boolean(input.isPublished),
  };
  if (id) {
    const before = await one<Branch>('SELECT * FROM web_branch WHERE id = ?', id);
    if (!before) throw new AppError('That branch no longer exists', 'NOT_FOUND');
    const slug = before.name === row.name ? before.slug : await uniqueSlug('web_branch', row.name, id);
    await run(
      `UPDATE web_branch SET name=@name, slug=@slug, kind=@kind, town=@town, county=@county, country=@country, address=@address,
         phone=@phone, email=@email, hours=@hours, map_url=@map_url, manager=@manager, note=@note, sort=@sort, is_published=@is_published
       WHERE id=@id`,
      { ...row, slug, id },
    );
    await audit(actor, 'BRANCH_UPDATE', 'web_branch', id, { name: row.name });
    return id;
  }
  const slug = await uniqueSlug('web_branch', row.name);
  const { id: created } = await run(
    `INSERT INTO web_branch (name, slug, kind, town, county, country, address, phone, email, hours, map_url, manager, note, sort, is_published)
     VALUES (@name,@slug,@kind,@town,@county,@country,@address,@phone,@email,@hours,@map_url,@manager,@note,@sort,@is_published)`,
    { ...row, slug },
  );
  await audit(actor, 'BRANCH_CREATE', 'web_branch', created, { name: row.name });
  return created;
}

export async function deleteBranch(id: number, actor: Actor): Promise<void> {
  const before = await one<Branch>('SELECT * FROM web_branch WHERE id = ?', id);
  await run('DELETE FROM web_branch WHERE id = ?', id);
  await audit(actor, 'BRANCH_DELETE', 'web_branch', id, { name: before?.name ?? null });
}

/* ===================================================================== vacancies */

export const adminVacancies = (): Promise<Vacancy[]> => all<Vacancy>('SELECT * FROM web_vacancy ORDER BY is_published DESC, created_at DESC');

export const adminVacancy = (id: number): Promise<Vacancy | undefined> => one<Vacancy>('SELECT * FROM web_vacancy WHERE id = ?', id);

export interface VacancyInput {
  title: unknown; department: unknown; location: unknown; employmentType: unknown; summary: unknown; body: unknown;
  closesOn: unknown; isPublished: unknown;
}

export async function saveVacancy(id: number | null, input: VacancyInput, actor: Actor): Promise<number> {
  const title = v.required(input.title, 'A job title', 160);
  const body = v.richText(input.body, 20_000);
  if (!body) throw new AppError('Describe the role — what it involves and who should apply', 'VALIDATION');
  const row = {
    title,
    department: v.text(input.department, 80),
    location: v.text(input.location, 120),
    employment_type: v.text(input.employmentType, 60),
    summary: v.text(input.summary, 400),
    body,
    closes_on: v.isoDate(input.closesOn, 'The closing date'),
    is_published: v.boolean(input.isPublished),
  };
  if (id) {
    const before = await adminVacancy(id);
    if (!before) throw new AppError('That vacancy no longer exists', 'NOT_FOUND');
    const slug = before.title === title ? before.slug : await uniqueSlug('web_vacancy', title, id);
    await run(
      `UPDATE web_vacancy SET title=@title, slug=@slug, department=@department, location=@location, employment_type=@employment_type,
         summary=@summary, body=@body, closes_on=@closes_on, is_published=@is_published, updated_at=@now WHERE id=@id`,
      { ...row, slug, now: now(), id },
    );
    await audit(actor, 'VACANCY_UPDATE', 'web_vacancy', id, { title });
    return id;
  }
  const slug = await uniqueSlug('web_vacancy', title);
  const { id: created } = await run(
    `INSERT INTO web_vacancy (title, slug, department, location, employment_type, summary, body, closes_on, is_published, created_at)
     VALUES (@title,@slug,@department,@location,@employment_type,@summary,@body,@closes_on,@is_published,@now)`,
    { ...row, slug, now: now() },
  );
  await audit(actor, 'VACANCY_CREATE', 'web_vacancy', created, { title });
  return created;
}

export async function deleteVacancy(id: number, actor: Actor): Promise<void> {
  const before = await adminVacancy(id);
  await run('DELETE FROM web_vacancy WHERE id = ?', id);
  await audit(actor, 'VACANCY_DELETE', 'web_vacancy', id, { title: before?.title ?? null });
}

/* ====================================================================== settings */

const HEX = /^#[0-9a-f]{6}$/i;
const colour = (value: unknown, label: string): string => {
  const cleaned = String(value ?? '').trim();
  if (!HEX.test(cleaned)) throw new AppError(`${label} must be a colour like #1e5c35`, 'VALIDATION');
  return cleaned.toLowerCase();
};

/** The text fields of the company profile, each with the longest value it will take. */
const SETTING_TEXT: Record<string, number> = {
  name: 160, short_name: 60, tagline: 200, founded_year: 10, registration_no: 80, licence_no: 120,
  licence_note: 400, physical_address: 300, postal_address: 120, city: 80, country: 80, phone_primary: 30,
  phone_secondary: 30, office_hours: 200, paybill_no: 20, paybill_note: 200, hero_kicker: 120, hero_headline: 160,
  whatsapp_number: 30, diaspora_phone: 30, stat_years: 20, stat_clients: 20, stat_counties: 20, stat_turnaround: 30,
  indemnity_cover: 60,
};
const SETTING_PROSE: Record<string, number> = {
  about_intro: 600, about_story: 6_000, mission: 800, vision: 800, bank_details: 600, hero_body: 600,
};
const SETTING_URLS = ['portal_url', 'facebook_url', 'instagram_url', 'x_url', 'youtube_url', 'tiktok_url', 'linkedin_url'];
const SETTING_EMAILS = ['email', 'loans_email', 'diaspora_email'];

export async function saveSettings(form: Record<string, unknown>, images: { logo?: string | null }, actor: Actor): Promise<void> {
  const row: Record<string, string | null> = {};
  for (const [key, max] of Object.entries(SETTING_TEXT)) row[key] = v.text(form[key], max);
  for (const [key, max] of Object.entries(SETTING_PROSE)) row[key] = v.richText(form[key], max);
  for (const key of SETTING_URLS) row[key] = v.url(form[key], key.replace(/_url$/, '').replace(/_/g, ' ') + ' link');
  for (const key of SETTING_EMAILS) row[key] = v.email(form[key]);
  if (!row.name) throw new AppError('The company needs a name', 'VALIDATION');

  row.map_embed_url = mapEmbed(form.map_embed_url);
  row.brand_primary = colour(form.brand_primary, 'The main colour');
  row.brand_accent = colour(form.brand_accent, 'The accent colour');
  row.brand_deep = colour(form.brand_deep, 'The deep colour');

  const before = await one<Settings>('SELECT * FROM web_setting WHERE id = 1');
  if (images.logo !== undefined) row.logo_url = images.logo ?? before?.logo_url ?? null;
  if (v.boolean(form.remove_logo)) row.logo_url = null;

  const keys = Object.keys(row);
  await run(
    `UPDATE web_setting SET ${keys.map((key) => `${key} = @${key}`).join(', ')}, updated_at = @updated_at WHERE id = 1`,
    { ...row, updated_at: now() },
  );
  const changed = keys.filter((key) => (before as Record<string, unknown> | undefined)?.[key] !== row[key]);
  await audit(actor, 'SETTINGS_UPDATE', 'web_setting', 1, { changed: changed.slice(0, 12).join(', ') || 'nothing' });
}

/* ========================================================================= audit */

export const adminAudit = (search = '', limit = 300): Promise<AuditEntry[]> =>
  all<AuditEntry>(
    `SELECT * FROM web_audit
     WHERE actor_name ILIKE @like OR action ILIKE @like OR entity ILIKE @like OR COALESCE(entity_id,'') ILIKE @like
     ORDER BY created_at DESC LIMIT ${Math.max(1, Math.min(2000, Math.round(limit)))}`,
    { like: `%${search.trim()}%` },
  );
