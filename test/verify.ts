/*
 * The integrity suite.
 *
 * It exercises the layers the browser cannot easily be pointed at: the SQL, the loan arithmetic,
 * the validation, the permission engine, and every path an anonymous visitor can write through.
 * Everything it creates carries a recognisable marker and is deleted again at the end, so it is
 * safe to run against the live database — which is the only way to test SQL that is worth anything.
 *
 *   pnpm test
 *
 * It is not a unit test suite and does not pretend to be one. It answers the question a
 * deployment actually needs answered: does this build work against this database?
 */
import { pool, all, one, run, value } from '../lib/db.ts';
import * as v from '../lib/validate.ts';
import { slugify, uniqueSlug } from '../lib/slugify.ts';
import { formatBp, formatMoney, formatMoneyCompact, formatTerm, initials, whatsappHref } from '../lib/format.ts';
import { rateLimit } from '../lib/rate-limit.ts';
import { annuity, quote, schedule, ceilingFor } from '../lib/loan-math.ts';
import {
  ACTIONS, STANDARD_ROLES, canAction, canPage, expandActionsToLines, linesToPermissions, listPermissionTables, visiblePages,
  type ActionKey,
} from '../lib/permissions.ts';
import { mergeLines } from '../lib/roles.ts';
import {
  createApplication, createEnquiry, subscribe, setApplicationStatus, setEnquiryStatus, inboxSummary, getApplication,
} from '../lib/inbox.ts';
import { saveProduct, savePost, saveBranch, saveVacancy, type ProductInput } from '../lib/content.ts';
import { hashPassword, verifyPassword } from '../lib/password.ts';
import { getProducts, getPosts, getVacancies, getSettings, toTerms } from '../lib/site.ts';
import type { Actor } from '../lib/db.ts';
import type { Product, ProductTerms } from '../lib/types.ts';

const MARKER = `verify-${Date.now()}`;
const TESTER: Actor = { id: 0, name: 'verify', email: 'verify@test' };

let passed = 0;
const failures: string[] = [];

function check(name: string, condition: unknown, detail = ''): void {
  if (condition) {
    passed += 1;
    return;
  }
  failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
}

async function throws(name: string, fn: () => Promise<unknown> | unknown, expect?: string): Promise<void> {
  try {
    await fn();
    failures.push(`${name} — expected it to be rejected, but it was accepted`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (expect && !message.toLowerCase().includes(expect.toLowerCase())) {
      failures.push(`${name} — rejected, but for the wrong reason: ${message}`);
      return;
    }
    passed += 1;
  }
}

async function section(title: string, fn: () => Promise<void>): Promise<void> {
  process.stdout.write(`  ${title.padEnd(36)}`);
  const before = failures.length;
  const started = Date.now();
  try {
    await fn();
  } catch (error) {
    failures.push(`${title} — threw: ${error instanceof Error ? error.message : String(error)}`);
  }
  const broke = failures.length - before;
  console.log(`${broke ? '✗' : '✓'} ${String(Date.now() - started).padStart(5)} ms`);
}

/** A product row as the admin would type it, for the write-path checks. */
const productInput = (overrides: Partial<ProductInput> = {}): ProductInput => ({
  name: `Test product ${MARKER}`, tagline: 'x', summary: 'x', body: 'x', icon: '🧪', audience: 'LANDLORD', calcMode: 'REDUCING',
  ratePm: '2', fee: '1', minAmount: '10000', maxAmount: '1000000', minTerm: '3', maxTerm: '24', rentMultiple: '0',
  features: 'a\nb', requirements: 'c', isFeatured: '', isPublished: 'on', sort: '999', ...overrides,
});

/* ============================================================================ run */

console.log('\n  Jukiwa Credit integrity suite\n');

/* ------------------------------------------------------------------ the database */
await section('Connection and schema', async () => {
  const version = await value<string>('SELECT version()');
  check('database reachable', typeof version === 'string' && version.includes('PostgreSQL'));
  const tables = (await all<{ tablename: string }>(
    "SELECT tablename FROM pg_tables WHERE schemaname = current_schema() AND tablename LIKE 'web%'",
  )).map((row) => row.tablename);
  for (const table of ['web_setting', 'web_role', 'web_user', 'web_product', 'web_application', 'web_enquiry', 'web_branch', 'web_audit']) {
    check(`${table} exists`, tables.includes(table), 'run `pnpm db:setup`');
  }
  const offered = await listPermissionTables();
  check('permission tables are web_ only', offered.every((table) => table.name.startsWith('web_')));
  check('the session store is not grantable', !offered.some((table) => table.name === 'web_session'));
  check('permission lines are not grantable', !offered.some((table) => table.name === 'web_permission_line'));
  const settings = await getSettings();
  check('the company profile is seeded', settings.name.length > 0 && settings.brand_primary.startsWith('#'));
});

/* ------------------------------------------------------------ placeholder binding */
await section('SQL binding', async () => {
  check('positional', (await one<{ n: number }>('SELECT ?::int + ?::int AS n', 2, 3))?.n === 5);
  check('named', (await one<{ s: string }>('SELECT @a::text || @b::text AS s', { a: 'x', b: 'y' }))?.s === 'xy');
  check('named, repeated', (await one<{ n: number }>('SELECT @a::int * @a::int AS n', { a: 4 }))?.n === 16);
  check('BIGINT comes back a number', typeof (await one<{ n: number }>('SELECT 5000000000::bigint AS n'))?.n === 'number');
  check('BIGINT keeps its value', (await one<{ n: number }>('SELECT 5000000000::bigint AS n'))?.n === 5_000_000_000);
  await throws('a missing named parameter is refused', () => one('SELECT @missing AS x', { other: 1 }), 'Missing bound parameter');
  const injection = "x'; DROP TABLE web_audit; --";
  check('values are bound, never interpolated', (await one<{ s: string }>('SELECT ?::text AS s', injection))?.s === injection);
});

/* -------------------------------------------------------------------- validation */
await section('Validation', async () => {
  check('text trims and collapses', v.text('  a \t  b  ') === 'a b');
  check('text strips control characters', v.text('a\u0000b\u0007c') === 'abc');
  check('empty text is null', v.text('   ') === null);
  check('money from "1,500"', v.money('1,500') === 150_000);
  check('money from "KES 2,000,000"', v.money('KES 2,000,000') === 200_000_000);
  check('Kenyan mobile accepted', v.phone('0712 345 678') === '0712 345 678');
  check('international accepted', v.phone('+44 7737 372706') === '+44 7737 372706');
  await throws('a word is not a phone number', () => v.phone('call me'));
  check('email lower-cased', v.email('Info@Jukiwa.CO.KE') === 'info@jukiwa.co.ke');
  await throws('javascript: link refused', () => v.url('javascript:alert(1)'), 'http');
  await throws('short password refused', () => v.password('short'), '10 characters');
  check('choice upper-cases', v.choice('received', ['RECEIVED', 'DECLINED'] as const, 'status') === 'RECEIVED');
  await throws('an unknown choice is refused', () => v.choice('LOL', ['A', 'B'] as const, 'status'));
  check('slugify ampersand', slugify('Land & Title Loan') === 'land-and-title-loan');
  check('a unique slug avoids an existing one', (await uniqueSlug('web_product', 'Rent Advance')) !== 'rent-advance');
});

/* -------------------------------------------------------------------- formatting */
await section('Formatting', async () => {
  check('money', formatMoney(123_456_700) === 'KES 1,234,567');
  check('compact millions', formatMoneyCompact(450_000_000) === 'KES 4.5M');
  check('compact thousands', formatMoneyCompact(25_000_000) === 'KES 250K');
  check('basis points', formatBp(150) === '1.5%');
  check('term in years', formatTerm(24) === '2 years' && formatTerm(18) === '18 months' && formatTerm(1) === '1 month');
  check('initials', initials('Ann Wanjiru Kiburi') === 'AW');
  check('WhatsApp link from a local number', whatsappHref('0743 227 881').startsWith('https://wa.me/254743227881'));
});

/* ------------------------------------------------------------------- loan maths */
await section('Loan arithmetic', async () => {
  const reducing: ProductTerms = {
    id: 1, name: 'R', slug: 'r', calc_mode: 'REDUCING', rate_pm_bp: 150, fee_bp: 200,
    min_amount_cents: 10_000_000, max_amount_cents: 5_000_000_000, min_term_months: 6, max_term_months: 60, rent_multiple_max: 0, icon: null, tagline: null,
  };
  // KES 1,000,000 at 1.5% a month for 12 months: 91,679.99 a month (standard annuity).
  const a = annuity(100_000_000, 0.015, 12);
  check('annuity matches the textbook figure', Math.abs(a - 9_167_999) <= 1, `got ${a}`);
  const q = quote(reducing, { amountCents: 100_000_000, termMonths: 12 });
  check('reducing monthly', q.monthlyCents === a);
  check('reducing interest = payments − principal', q.interestCents === a * 12 - 100_000_000);
  check('fee is 2% of the amount', q.feeCents === 2_000_000);
  check('total = principal + interest + fee', q.totalCents === q.principalCents + q.interestCents + q.feeCents);

  const rows = schedule(reducing, q);
  check('schedule has one row a month', rows.length === 12);
  check('schedule ends at exactly zero', rows.at(-1)?.balanceCents === 0);
  check('schedule principal adds up', rows.reduce((s, r) => s + r.principalCents, 0) === 100_000_000);

  const flat: ProductTerms = { ...reducing, calc_mode: 'FLAT', rate_pm_bp: 200 };
  const f = quote(flat, { amountCents: 100_000_000, termMonths: 10 });
  check('flat interest is rate × months × principal', f.interestCents === 20_000_000);
  check('flat monthly', f.monthlyCents === 12_000_000);
  const fr = schedule(flat, f);
  check('flat schedule ends at zero', fr.at(-1)?.balanceCents === 0);
  check('flat schedule interest adds up', fr.reduce((s, r) => s + r.interestCents, 0) === f.interestCents);

  const rent: ProductTerms = { ...reducing, calc_mode: 'RENT_ADVANCE', rent_multiple_max: 10, max_amount_cents: 5_000_000_000 };
  check('the ceiling is rent × multiple', ceilingFor(rent, 40_000_000) === 400_000_000);
  const r = quote(rent, { amountCents: 900_000_000, termMonths: 24, monthlyRentCents: 40_000_000 });
  check('an advance above the ceiling is brought down to it', r.principalCents === 400_000_000 && r.capped);
  check('the rent share is reported', r.rentShare !== null && r.rentShare > 0 && r.rentShare < 1);

  const clamped = quote(reducing, { amountCents: 100_000_000, termMonths: 999 });
  check('a term beyond the maximum is clamped', clamped.termMonths === 60);
  const tiny = quote(reducing, { amountCents: 1, termMonths: 12 });
  check('an amount below the minimum is raised to it', tiny.principalCents === 10_000_000);
});

/* -------------------------------------------------------------- permission engine */
await section('Permission Sets', async () => {
  const keys = Object.keys(ACTIONS) as ActionKey[];
  check('every action names a real page', keys.every((key) => /^[A-Z_]+$/.test(ACTIONS[key].page)));

  const setFor = (name: string) => {
    const role = STANDARD_ROLES.find((r) => r.name === name)!;
    return { is_system: !!role.isSystem, permissions: linesToPermissions(expandActionsToLines(role.actions ?? [])) };
  };
  const officer = setFor('Credit Officer');
  check('a credit officer can move an application', canAction(officer, 'APPLICATIONS_UPDATE'));
  check('a credit officer cannot change a rate', !canAction(officer, 'PRODUCTS_UPDATE'));
  check('a credit officer cannot delete an application', !canAction(officer, 'APPLICATIONS_DELETE'));

  const marketing = setFor('Marketing & Communications');
  check('marketing publishes insights', canAction(marketing, 'NEWS_CREATE'));
  check('marketing cannot see applications', !canAction(marketing, 'APPLICATIONS_READ') && !canPage(marketing, 'APPLICATIONS'));
  check('marketing has no Applications entry', !visiblePages(marketing).some((p) => p.code === 'APPLICATIONS'));

  const auditor = setFor('Auditor (Read Only)');
  check('the auditor reads the audit trail', canAction(auditor, 'AUDIT_READ'));
  check('the auditor changes nothing', keys.filter((k) => !/_READ$/.test(k)).every((k) => !canAction(auditor, k)));

  const system = setFor('System Administrator');
  check('the System Administrator can do everything', keys.every((key) => canAction(system, key)));

  const merged = mergeLines(
    [{ object_type: 'TABLE', object_name: 'web_post', read_perm: true, insert_perm: false, modify_perm: false, delete_perm: false, execute_perm: false }],
    [{ object_type: 'TABLE', object_name: 'web_post', read_perm: false, insert_perm: true, modify_perm: false, delete_perm: false, execute_perm: false }],
  );
  check('merging lines is a union', merged.length === 1 && merged[0]!.read_perm && merged[0]!.insert_perm);

  const seeded = await all<{ name: string }>('SELECT name FROM web_role');
  check('every standard set is seeded', STANDARD_ROLES.every((r) => seeded.some((s) => s.name === r.name)));
  const admins = await value<number>(
    `SELECT COUNT(*)::int FROM web_user u JOIN web_role r ON r.id = u.role_id WHERE r.is_system AND u.status = 'ACTIVE'`,
  );
  check('there is an active System Administrator', Number(admins) >= 1);
});

/* ------------------------------------------------------------------- passwords */
await section('Passwords and rate limits', async () => {
  const hash = await hashPassword('correct horse battery');
  check('bcrypt hash', hash.startsWith('$2'));
  check('right password verifies', await verifyPassword('correct horse battery', hash));
  check('wrong password does not', !(await verifyPassword('wrong horse battery', hash)));
  check('no account still takes a comparison', !(await verifyPassword('anything', null)));
  const key = `verify:${MARKER}`;
  const results = [1, 2, 3, 4].map(() => rateLimit(key, 3, 60_000).ok);
  check('the fourth attempt in the window is refused', results.join() === 'true,true,true,false');
});

/* ------------------------------------------------------------- public: applications */
await section('Public: loan applications', async () => {
  const products = await getProducts();
  const rent = products.find((p) => p.calc_mode === 'RENT_ADVANCE') as Product;
  const loan = products.find((p) => p.calc_mode === 'REDUCING') as Product;
  check('a rent advance product is published', !!rent);

  const base = {
    productId: rent.id, amount: '99,000,000', termMonths: '24', monthlyIncome: '400,000', purpose: 'Integrity check',
    applicantType: 'INDIVIDUAL', firstName: MARKER, lastName: 'Tester', phone: '0712 000 000', email: '',
    collateral: 'RENTAL_PROPERTY', consentPrivacy: 'on', sourcePage: '/apply',
  };
  const created = await createApplication(base);
  check('an application gets a yearly number', /^JCL-\d{4}-\d{4}$/.test(created.no), created.no);
  const row = await getApplication(created.id);
  const expected = quote(toTerms(rent), { amountCents: 9_900_000_000, termMonths: 24, monthlyRentCents: 40_000_000 });
  check('the server re-quotes: amount capped at 10× rent', row?.amount_cents === expected.principalCents, `${row?.amount_cents}`);
  check('the server re-quotes: the repayment stored', row?.est_repayment_cents === expected.monthlyCents);
  check('it arrives as RECEIVED', row?.status === 'RECEIVED');
  const second = await createApplication({ ...base, lastName: 'Second' });
  check('numbers are sequential', Number(second.no.slice(-4)) === Number(created.no.slice(-4)) + 1);

  await throws('privacy consent is required', () => createApplication({ ...base, consentPrivacy: '' }), 'confirm');
  await throws('a phone number is required', () => createApplication({ ...base, phone: '' }), 'phone');
  await throws('a rent advance needs the rent', () => createApplication({ ...base, monthlyIncome: '' }), 'rent');
  await throws('an unknown product is refused', () => createApplication({ ...base, productId: 999_999 }), 'finance');
  await throws('the diaspora need a country', () => createApplication({ ...base, applicantType: 'DIASPORA', country: '' }), 'country');
  await throws('a company needs its name', () => createApplication({ ...base, applicantType: 'COMPANY', companyName: '' }), 'company');
  await throws('email contact needs an email', () => createApplication({ ...base, contactPreference: 'EMAIL' }), 'email');
  if (loan) {
    const ok = await createApplication({ ...base, productId: loan.id, amount: '1,000,000', termMonths: '12', monthlyIncome: '', collateral: 'TITLE_DEED' });
    check('a loan needs no rent', ok.no.startsWith('JCL-'));
  }

  await setApplicationStatus(created.id, 'reviewing', 'Called, coming in Thursday', TESTER);
  await setApplicationStatus(created.id, 'DOCUMENTS', 'Title deed seen', TESTER);
  const worked = await getApplication(created.id);
  check('status moves', worked?.status === 'DOCUMENTS');
  check('notes are appended, not replaced', !!worked?.notes?.includes('Called') && !!worked?.notes?.includes('Title deed'));
  check('handled by is recorded', worked?.handled_by === 'verify');
  await throws('an unknown status is refused', () => setApplicationStatus(created.id, 'PAID', null, TESTER));
});

/* ------------------------------------------------------ public: enquiries & friends */
await section('Public: enquiries and sign-ups', async () => {
  const q = await createEnquiry({ kind: 'ENQUIRY', name: MARKER, phone: '0712 000 001', message: 'A question' });
  check('a question gets an ENQ reference', q.reference.startsWith('ENQ-'));
  const cb = await createEnquiry({ kind: 'CALLBACK', name: MARKER, phone: '0712 000 002', preferredTime: 'Morning' });
  check('a callback gets a CB reference', cb.reference.startsWith('CB-'));
  const pt = await createEnquiry({ kind: 'PARTNER', name: MARKER, phone: '0712 000 003', location: 'Eldoret' });
  check('a partner enquiry gets a PT reference', pt.reference.startsWith('PT-'));
  await throws('a question needs a question', () => createEnquiry({ kind: 'ENQUIRY', name: MARKER, phone: '0712 000 004' }), 'know');
  await throws('a partner needs a county', () => createEnquiry({ kind: 'PARTNER', name: MARKER, phone: '0712 000 005' }), 'county');
  await throws('an enquiry needs a phone', () => createEnquiry({ kind: 'CALLBACK', name: MARKER, phone: '' }), 'phone');
  await setEnquiryStatus(cb.id, 'CONTACTED', 'Spoke to them', TESTER);
  const status = await value<string>('SELECT status FROM web_enquiry WHERE id = ?', cb.id);
  check('an enquiry status moves', status === 'CONTACTED');

  const email = `${MARKER}@example.com`;
  await subscribe({ email });
  await subscribe({ email: email.toUpperCase() });
  check('subscribing twice is one row', Number(await value('SELECT COUNT(*)::int FROM web_subscriber WHERE email = ?', email)) === 1);

  const summary = await inboxSummary();
  check('the summary counts new applications', summary.applications_new >= 1);
  check('the pipeline value is a number', typeof summary.pipeline_cents === 'number' && summary.pipeline_cents > 0);
});

/* -------------------------------------------------- admin writes and publishing rules */
await section('Admin writes, published only', async () => {
  await throws('min above max is refused', () => saveProduct(null, productInput({ minAmount: '5000000', maxAmount: '1000' }), TESTER), 'smallest');
  await throws('a rent advance needs a multiple', () => saveProduct(null, productInput({ calcMode: 'RENT_ADVANCE', rentMultiple: '0' }), TESTER), 'multiple');
  await throws('a silly rate is refused', () => saveProduct(null, productInput({ ratePm: '55' }), TESTER), 'percentage');

  const hidden = await saveProduct(null, productInput({ isPublished: '' }), TESTER);
  check('a hidden product is not on the site', !(await getProducts()).some((p) => p.id === hidden));
  await saveProduct(hidden, productInput({ isPublished: 'on', ratePm: '2.5' }), TESTER);
  const shown = (await getProducts()).find((p) => p.id === hidden);
  check('publishing it puts it on the site', !!shown);
  check('the rate is stored in basis points', shown?.rate_pm_bp === 250);
  check('amounts are stored in cents', shown?.min_amount_cents === 1_000_000 && shown?.max_amount_cents === 100_000_000);
  const rateAudit = await one<{ detail: { rate?: string } }>("SELECT detail FROM web_audit WHERE action = 'PRODUCT_UPDATE' AND entity_id = ? ORDER BY id DESC LIMIT 1", String(hidden));
  check('a rate change is audited with old and new', rateAudit?.detail?.rate === '200→250 bp');

  const draft = await savePost(null, { title: `Draft ${MARKER}`, category: 'GUIDE', excerpt: '', body: 'x', isPublished: '', isPinned: '', publishedAt: '' }, TESTER);
  const future = await savePost(null, { title: `Future ${MARKER}`, category: 'NEWS', excerpt: '', body: 'x', isPublished: 'on', isPinned: '', publishedAt: '2099-01-01T09:00' }, TESTER);
  const posts = await getPosts({ limit: 100 });
  check('a draft is not published', !posts.some((p) => p.id === draft));
  check('a future article waits for its date', !posts.some((p) => p.id === future));

  await throws('a map link must be Google Maps', () => saveBranch(null, {
    name: `Branch ${MARKER}`, kind: 'SATELLITE', town: 'X', county: 'Y', country: 'Kenya', address: '', phone: '', email: '', hours: '',
    mapUrl: 'https://evil.example.com/embed', manager: '', note: '', sort: '0', isPublished: '',
  }, TESTER), 'Google Maps');

  const closed = await saveVacancy(null, { title: `Closed ${MARKER}`, department: '', location: '', employmentType: '', summary: '', body: 'x', closesOn: '2020-01-01', isPublished: 'on' }, TESTER);
  check('a closed vacancy is not advertised', !(await getVacancies()).some((v) => v.id === closed));
});

/* ---------------------------------------------------------------------- the trail */
await section('Audit trail', async () => {
  const rows = await all<{ action: string; actor_name: string }>(
    "SELECT action, actor_name FROM web_audit WHERE actor_name IN ('website', 'verify') ORDER BY id DESC LIMIT 60",
  );
  check('the website actor is recorded', rows.some((row) => row.actor_name === 'website'));
  check('an application is audited', rows.some((row) => row.action === 'APPLICATION_RECEIVED'));
  check('a callback is audited', rows.some((row) => row.action === 'CALLBACK_RECEIVED'));
  check('a status change is audited', rows.some((row) => row.action === 'APPLICATION_STATUS'));
  check('a product change is audited', rows.some((row) => row.action === 'PRODUCT_UPDATE'));
});

/* ------------------------------------------------------------------------ cleanup */
await section('Cleanup', async () => {
  const like = `%${MARKER}%`;
  const apps = await all<{ id: number }>('SELECT id FROM web_application WHERE first_name ILIKE ?', like);
  await run('DELETE FROM web_application WHERE first_name ILIKE ?', like);
  await run('DELETE FROM web_enquiry WHERE name ILIKE ?', like);
  await run('DELETE FROM web_subscriber WHERE email ILIKE ?', like);
  await run('DELETE FROM web_post WHERE title ILIKE ?', like);
  await run('DELETE FROM web_vacancy WHERE title ILIKE ?', like);
  await run('DELETE FROM web_branch WHERE name ILIKE ?', like);
  await run('DELETE FROM web_product WHERE name ILIKE ?', like);
  await run("DELETE FROM web_audit WHERE actor_name = 'verify'");
  if (apps.length) {
    await run(
      `DELETE FROM web_audit WHERE actor_name = 'website' AND entity = 'web_application' AND entity_id = ANY(?::text[])`,
      apps.map((a) => String(a.id)),
    );
  }
  await run("DELETE FROM web_audit WHERE actor_name = 'website' AND entity = 'web_enquiry' AND detail->>'name' ILIKE ?", like);
  // The numbering sequence is not wound back: a real application may have arrived meanwhile, and a
  // skipped number is harmless where a repeated one is not.

  const leftovers = await value<number>(
    `SELECT (SELECT COUNT(*) FROM web_application WHERE first_name ILIKE @like)
          + (SELECT COUNT(*) FROM web_enquiry WHERE name ILIKE @like)
          + (SELECT COUNT(*) FROM web_product WHERE name ILIKE @like)
          + (SELECT COUNT(*) FROM web_post WHERE title ILIKE @like)`,
    { like },
  );
  check('nothing this suite created is left behind', Number(leftovers) === 0, `${leftovers} rows remain`);
});

/* ---------------------------------------------------------------------- the score */
console.log('');
if (failures.length) {
  console.log(`  ${failures.length} failure(s):\n`);
  for (const failure of failures) console.log(`    ✗ ${failure}`);
  console.log(`\n  ${passed} passed, ${failures.length} failed.\n`);
  await pool.end();
  process.exit(1);
}

console.log(`  ${passed} checks passed.\n`);
await pool.end();
