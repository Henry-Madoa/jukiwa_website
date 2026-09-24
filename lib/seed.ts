import 'server-only';

/*
 * Creating the schema, and filling an empty database with Jukiwa Credit.
 *
 * The content is drawn from what Jukiwa General Agencies Ltd already publishes about itself —
 * the sister company shares Jukiwa Credit's directors, its offices and its staff in every
 * satellite — so the site can be looked at and signed off before a single word has been typed
 * into the admin. Everything seeded is ordinary content the admin can edit or delete.
 *
 * Two things are deliberately marked for confirmation rather than presented as settled: the
 * indicative rates and fees on each product (the Credit Manager sets the real ones), and the
 * demonstration applications in the pipeline, which exist only so the dashboard has something to
 * show and are skipped entirely with SEED_DEMO_DATA=false.
 *
 * Seeding only ever adds to an empty table. Run it twice and the second run does nothing, so it
 * is safe to leave wired into a deployment.
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { exec, one, run, value } from './db.ts';
import { hashPassword } from './password.ts';
import { expandActionsToLines, STANDARD_ROLES } from './permissions.ts';
import { slugify } from './slugify.ts';
import { quote } from './loan-math.ts';
import { toTerms } from './site.ts';
import type { Product } from './types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));

/** Applies lib/schema.sql. Idempotent — every statement is CREATE … IF NOT EXISTS. */
export async function applySchema(): Promise<void> {
  const sql = await readFile(join(HERE, 'schema.sql'), 'utf8');
  await exec(sql);
}

const isEmpty = async (table: string): Promise<boolean> =>
  Number(await value<number>(`SELECT COUNT(*)::int FROM ${table}`) ?? 0) === 0;

const iso = (date: Date): string => date.toISOString();
const daysAgo = (n: number, hour = 10): string => {
  const d = new Date(Date.now() - n * 86_400_000);
  d.setUTCHours(hour, (n * 7) % 60, 0, 0);
  return d.toISOString();
};
const kes = (shillings: number): number => Math.round(shillings * 100);

/* Unsplash photographs, used only as placeholder imagery. Replace them from the admin — every one
 * of these fields takes a Cloudinary upload. */
const photo = (id: string, w = 1600): string => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=75`;
/* The leadership portraits Jukiwa General Agencies already publishes, for the same people. */
const JUKIWA = (path: string): string => `https://www.jukiwa.co.ke/wp-content/uploads/${path}`;

export interface SeedResult {
  created: string[];
  adminEmail: string | null;
  adminPassword: string | null;
}

/**
 * Fills whatever is still empty. The first administrator's password comes from ADMIN_PASSWORD, or
 * is generated and returned once — it is never written to a log the company cannot see.
 */
export async function seedDatabase(options: { demo?: boolean } = {}): Promise<SeedResult> {
  const demo = options.demo ?? process.env.SEED_DEMO_DATA !== 'false';
  const created: string[] = [];
  let adminEmail: string | null = null;
  let adminPassword: string | null = null;

  /* --------------------------------------------------------- the Permission Sets */
  if (await isEmpty('web_role')) {
    for (const standard of STANDARD_ROLES) {
      const { id: roleId } = await run(
        'INSERT INTO web_role (name, description, is_system, created_at, created_by) VALUES (?,?,?,?,?)',
        standard.name, standard.description, !!standard.isSystem, iso(new Date()), 'seed',
      );
      for (const line of expandActionsToLines(standard.actions ?? [])) {
        await run(
          `INSERT INTO web_permission_line (role_id, object_type, object_name, read_perm, insert_perm, modify_perm, delete_perm, execute_perm)
           VALUES (?,?,?,?,?,?,?,?)`,
          roleId, line.object_type, line.object_name,
          line.read_perm, line.insert_perm, line.modify_perm, line.delete_perm, line.execute_perm,
        );
      }
    }
    created.push(`${STANDARD_ROLES.length} Permission Sets`);
  }

  /* ------------------------------------------------------------ the first admin */
  if (await isEmpty('web_user')) {
    const systemRole = await one<{ id: number }>('SELECT id FROM web_role WHERE is_system ORDER BY id LIMIT 1');
    adminEmail = (process.env.ADMIN_EMAIL ?? 'admin@jukiwa.co.ke').toLowerCase();
    adminPassword = process.env.ADMIN_PASSWORD ?? `jukiwa-${Math.random().toString(36).slice(2, 10)}`;
    await run(
      'INSERT INTO web_user (name, email, password_hash, role_id, status, title, created_at, created_by) VALUES (?,?,?,?,?,?,?,?)',
      process.env.ADMIN_NAME ?? 'Website Administrator', adminEmail, await hashPassword(adminPassword),
      systemRole?.id ?? null, 'ACTIVE', 'System administrator', iso(new Date()), 'seed',
    );
    created.push('a System Administrator account');
  }

  /* --------------------------------------------------------------- the company */
  const settings = await one<{ name: string }>('SELECT name FROM web_setting WHERE id = 1');
  if (!settings || settings.name === 'Our Company') {
    await run(
      `UPDATE web_setting SET
         name = @name, short_name = @short, tagline = @tagline, about_intro = @intro, about_story = @story,
         mission = @mission, vision = @vision, parent_name = @parent, parent_url = @parentUrl, founded_year = @founded,
         physical_address = @address, postal_address = @postal, city = @city, country = 'Kenya', map_embed_url = @map,
         phone_primary = @phone1, phone_secondary = @phone2, email = @email, loans_email = @loansEmail, office_hours = @hours,
         paybill_no = @paybill, paybill_note = @paybillNote, hero_kicker = @kicker, hero_headline = @headline, hero_body = @heroBody,
         whatsapp_number = @whatsapp, diaspora_phone = @diasporaPhone, diaspora_email = @diasporaEmail,
         facebook_url = @facebook, instagram_url = @instagram, x_url = @x, youtube_url = @youtube,
         stat_years = @years, stat_counties = @counties, stat_turnaround = @turnaround, indemnity_cover = @indemnity,
         updated_at = @now
       WHERE id = 1`,
      {
        name: 'Jukiwa Credit Limited',
        short: 'Jukiwa Credit',
        tagline: 'Property finance from the people who manage property.',
        intro: 'Jukiwa Credit is the lending arm of the Jukiwa group — rent advances, building finance and property loans from a team that has managed Kenyan property for more than two decades.',
        story:
          'For years, Jukiwa General Agencies Ltd has done something most property managers do not: it advances money to the landlords whose buildings it manages, and recovers it quietly from the rent it collects. Landlords used those advances to finish buildings, buy the next plot and reinvest in Kenya — many of them from London, Houston or Toronto.\n\n' +
          'Jukiwa Credit Limited was formed to do that properly, at scale: a dedicated company for financing property across Kenya, with its own credit team, its own processes and the same people behind it. The directors are the same. The offices are the same — Kilimani headquarters, the branches and every satellite. The staff you already know at Jukiwa are the staff you will meet here.\n\n' +
          'What that means for a borrower is simple. We already understand property: we value it, manage it, let it and sell it every day. So we can lend against it with confidence, decide quickly, and structure repayments around the rent a building actually earns.',
        mission: 'To empower our clients to achieve their property dreams through finance that is fair, fast and transparent — delivered with expertise and integrity.',
        vision: 'To be Kenya’s most trusted property finance partner, at home and across the diaspora.',
        parent: 'Jukiwa General Agencies Ltd',
        parentUrl: 'https://www.jukiwa.co.ke',
        founded: '2026',
        address: 'Tetu Apartments, Block C, Room 5\nStatehouse Avenue, off Ralph Bunche Road\nKilimani',
        postal: 'P.O. Box 21481–00100',
        city: 'Nairobi',
        map: 'https://www.google.com/maps?q=Ralph+Bunche+Road,+Kilimani,+Nairobi&output=embed',
        phone1: '+254 743 227 881',
        phone2: '+254 207 851 999',
        email: 'info@jukiwa.co.ke',
        loansEmail: 'info@jukiwa.co.ke',
        hours: 'Monday to Friday, 8.00 am – 5.00 pm · Saturday, 9.00 am – 1.00 pm',
        paybill: '4224534',
        paybillNote: 'Account number: your loan number',
        kicker: 'A Jukiwa General Agencies company',
        headline: 'Unlock the money in your property.',
        heroBody: 'Rent advances of up to 10× your monthly rent, finance to finish your building, and loans to buy land or a home — from the team that has managed Kenyan property for over 24 years.',
        whatsapp: '+254 743 227 881',
        diasporaPhone: '+44 7737 372706',
        diasporaEmail: 'jukiwageneralagencies@yahoo.com',
        facebook: 'https://www.facebook.com/jukiwageneralagencieslimited',
        instagram: 'https://www.instagram.com/jukiwaagencies',
        x: 'https://x.com/jukiwaagencies',
        youtube: 'https://www.youtube.com/@JukiwaGeneralAgenciesLtd',
        years: '24+',
        counties: '47',
        turnaround: '30 min',
        indemnity: 'KES 500M',
        now: iso(new Date()),
      },
    );
    created.push('company profile');
  }

  /* ------------------------------------------------------------------- branches */
  if (await isEmpty('web_branch')) {
    const branches: [name: string, kind: string, town: string, county: string | null, country: string, address: string | null,
      phone: string | null, email: string | null, hours: string | null, map: string | null, note: string | null][] = [
      [
        'Nairobi Headquarters', 'HQ', 'Kilimani', 'Nairobi', 'Kenya',
        'Tetu Apartments, Block C, Room 5\nStatehouse Avenue, off Ralph Bunche Road, Kilimani',
        '+254 207 851 999', 'info@jukiwa.co.ke', 'Mon–Fri 8.00 am – 5.00 pm · Sat 9.00 am – 1.00 pm',
        'https://www.google.com/maps?q=Ralph+Bunche+Road,+Kilimani,+Nairobi&output=embed',
        'Head office for Jukiwa Credit and Jukiwa General Agencies. Credit officers are here every working day.',
      ],
      [
        'Kitengela Branch', 'BRANCH', 'Kitengela', 'Kajiado', 'Kenya', null,
        '+254 743 227 881', 'info@jukiwa.co.ke', 'Mon–Fri 8.00 am – 5.00 pm',
        'https://www.google.com/maps?q=Kitengela,+Kajiado&output=embed',
        'Shared with Jukiwa General Agencies. Call ahead and a credit officer will meet you at the branch.',
      ],
      [
        'Nakuru Satellite', 'SATELLITE', 'Nakuru', 'Nakuru', 'Kenya', null,
        '+254 795 697 313', 'info@jukiwa.co.ke', 'Mon–Fri 8.00 am – 5.00 pm',
        'https://www.google.com/maps?q=Nakuru+Town&output=embed',
        'Serving landlords and developers across Nakuru County, from the Jukiwa satellite office.',
      ],
      [
        'Diaspora Regional Office', 'REGIONAL', 'London', null, 'United Kingdom',
        '169 Willesden Lane, Christchurch Terrace\nLondon NW6 7BG',
        '+44 7737 372706', 'jukiwageneralagencies@yahoo.com', 'By appointment',
        null,
        'For Kenyans in the United Kingdom, the United States and Canada.',
      ],
    ];
    let sort = 0;
    for (const [name, kind, town, county, country, address, phone, email, hours, map, note] of branches) {
      await run(
        `INSERT INTO web_branch (name, slug, kind, town, county, country, address, phone, email, hours, map_url, note, sort, is_published)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,TRUE)`,
        name, slugify(name), kind, town, county, country, address, phone, email, hours, map, note, sort++,
      );
    }
    created.push(`${branches.length} branches & offices`);
  }

  /* ----------------------------------------------------------------------- team */
  if (await isEmpty('web_team')) {
    const people: [name: string, title: string, category: string, photo: string | null][] = [
      ['Ann Kiburi', 'Deputy Chief Executive Officer', 'LEADERSHIP', JUKIWA('2024/04/3-768x767.jpg')],
      ['Julius Wambugu', 'Assistant Director', 'LEADERSHIP', JUKIWA('2024/04/8-1024x1024.jpg')],
      ['David Kiburi', 'Assistant Operations Manager', 'MANAGEMENT', JUKIWA('2024/04/4-768x767.jpg')],
      ['Morris Munene', 'Assistant IT Manager', 'MANAGEMENT', JUKIWA('2024/04/Gtrs-1024x712.jpg')],
      ['Rewel Munene', 'Assistant IT Support', 'MANAGEMENT', JUKIWA('2024/04/DDDD-1024x712.jpg')],
    ];
    let sort = 0;
    for (const [name, title, category, portrait] of people) {
      await run(
        'INSERT INTO web_team (name, role_title, category, bio, photo_url, sort, is_published) VALUES (?,?,?,?,?,?,TRUE)',
        name, title, category, 'Serves across the Jukiwa group — Jukiwa Credit and Jukiwa General Agencies.', portrait, sort++,
      );
    }
    created.push(`${people.length} leadership profiles`);
  }

  /* ------------------------------------------------------------------- products */
  if (await isEmpty('web_product')) {
    type P = {
      name: string; icon: string; audience: string; mode: string; rate: number; fee: number; min: number; max: number;
      minTerm: number; maxTerm: number; multiple?: number; featured?: boolean; tagline: string; summary: string;
      body: string; features: string[]; requirements: string[];
    };
    const products: P[] = [
      {
        name: 'Rent Advance', icon: '🏢', audience: 'LANDLORD', mode: 'RENT_ADVANCE', rate: 150, fee: 200,
        min: 100_000, max: 50_000_000, minTerm: 6, maxTerm: 24, multiple: 10, featured: true,
        tagline: 'Up to 10× your monthly rent, paid to you now.',
        summary: 'If Jukiwa manages your rental property, borrow up to ten times its monthly rent and repay out of the rent we collect — nothing to remember, no transfer to make.',
        body:
          'A rent advance turns the rent your building will earn over the next year or two into money you can use today — to finish another unit, buy the next plot, or clear an expensive loan.\n\n' +
          'Because Jukiwa already collects the rent, repayment takes care of itself. Each month we recover the agreed instalment from the rent collected, deduct our management fee, and deposit whatever remains into your account. You see every figure in real time on the Jukiwa property management system.\n\n' +
          'A worked example. Sarah’s apartment block collects KES 1,000,000 a month. With a rent advance she receives KES 5,000,000 at once and repays it over two years, out of the rent. She uses it to add a floor — and the building earns more than before.\n\n' +
          'Prefer something simpler? We can also advance the rent of every occupied unit in your building on a date you choose, and recover it from the rent as it comes in.',
        features: [
          'Up to 10× the property’s monthly rent',
          'Repaid from the rent Jukiwa collects — the balance is paid into your account',
          'Typically 12 or 24 months',
          'Available on full, hybrid and partial management packages',
          'Real-time statements on the Jukiwa property management system',
        ],
        requirements: [
          'A rental property managed by Jukiwa General Agencies — or one you are ready to submit for management',
          'Title deed or lease in your name',
          'National ID or passport, and KRA PIN',
          'A current tenancy schedule (rent roll)',
          'A bank account for your monthly balance',
        ],
      },
      {
        name: 'Building Advance', icon: '🏗️', audience: 'DEVELOPER', mode: 'REDUCING', rate: 175, fee: 250,
        min: 500_000, max: 30_000_000, minTerm: 6, maxTerm: 36, featured: true,
        tagline: 'Finish the last 25% of your building.',
        summary: 'Your building is at least 75% complete and the money has run out. We advance what it takes to finish, on the advice of our quantity surveyors — and let it for you once it is done.',
        body:
          'The last quarter of a building is where projects stall: the shell is up, the finishes are not, and a half-built block earns nothing. A building advance is designed for exactly that moment.\n\n' +
          'Once a building is at least 75% complete, our quantity surveyors assess what remains and what it will cost. We advance that amount in stages against the work, so the money goes into the building rather than sitting in an account.\n\n' +
          'When the building is finished, Jukiwa lets and manages it — and the advance is repaid on terms agreed with you, largely from the rent the building now earns.',
        features: [
          'For buildings at least 75% complete',
          'Amount set on the advice of Jukiwa’s quantity surveyors',
          'Released in stages against completed work',
          'Jukiwa lets and manages the building once finished',
          'Repayment terms agreed with you, largely from the new rent',
        ],
        requirements: [
          'Title deed for the plot, in your name',
          'Approved building plans',
          'National ID or passport, and KRA PIN',
          'Access to the site for a quantity surveyor’s assessment',
        ],
      },
      {
        name: 'Property Purchase Finance', icon: '🏡', audience: 'BUYER', mode: 'REDUCING', rate: 150, fee: 250,
        min: 500_000, max: 50_000_000, minTerm: 12, maxTerm: 60, featured: true,
        tagline: 'Buy the land, the home or the block you have found.',
        summary: 'Finance to buy land, a home or an income property anywhere in Kenya — with Jukiwa’s valuers, legal team and indemnity cover standing behind the purchase.',
        body:
          'Financing property acquisitions across Kenya is what Jukiwa Credit was founded to do. Whether it is a plot to build on, a family home or a block of flats that already earns rent, we can finance the purchase.\n\n' +
          'Because the Jukiwa group values, manages and sells property every day, we can do what a bank cannot: help you find the property, check it properly, and finance it in one place. Purchases made through Jukiwa are protected by professional indemnity cover of up to KES 500 million.\n\n' +
          'Buying an income property? We can manage it for you from the day you take the keys, and structure your repayments around the rent it earns.',
        features: [
          'Land, homes and income-earning property anywhere in Kenya',
          'Valuation and legal checks by the Jukiwa team',
          'Purchases protected by professional indemnity cover up to KES 500M',
          'Repayments structured around rental income where there is some',
          'For buyers in Kenya and in the diaspora',
        ],
        requirements: [
          'National ID or passport, and KRA PIN',
          'Proof of income — payslips, business records or a rent roll',
          'Six months’ bank statements',
          'Details of the property you intend to buy',
        ],
      },
      {
        name: 'Diaspora Landlord Advance', icon: '✈️', audience: 'DIASPORA', mode: 'RENT_ADVANCE', rate: 150, fee: 200,
        min: 200_000, max: 50_000_000, minTerm: 12, maxTerm: 24, multiple: 10, featured: true,
        tagline: 'Living abroad? Your Kenyan rent, advanced.',
        summary: 'For Kenyans in the United Kingdom, the United States and Canada: let Jukiwa manage your property at home and receive 5–10 times its monthly rent as an advance.',
        body:
          'Managing a building from abroad is hard — unreliable caretakers, missed rent and no clear picture of what is happening. Jukiwa manages it for you, and puts the rent it will earn to work now.\n\n' +
          'If your property earns KES 400,000 a month, we can advance KES 4,000,000, recoverable over 12 or 24 months. We recover the instalment from the rent collected and deposit the rest into your account, wherever you are.\n\n' +
          'Our diaspora regional office in London serves clients across the UK, the USA and Canada, and you can sign in to the Jukiwa property management system from any device to see your statements in real time.',
        features: [
          '5–10× the property’s monthly rent as an advance',
          'Recovered from the rent over 12 or 24 months',
          'Balance deposited to your account, in Kenya or abroad',
          'A dedicated diaspora line and a London regional office',
          'Real-time statements from anywhere',
        ],
        requirements: [
          'A rental property in Kenya, submitted to Jukiwa for management',
          'Passport and KRA PIN',
          'Title deed or lease in your name',
          'A current tenancy schedule',
        ],
      },
      {
        name: 'Sale Advance', icon: '🔑', audience: 'SELLER', mode: 'FLAT', rate: 200, fee: 200,
        min: 200_000, max: 20_000_000, minTerm: 3, maxTerm: 12,
        tagline: 'Need money now? Don’t sell cheap.',
        summary: 'An upfront deposit against the property you are selling, recovered when it sells — so you are never forced to take a low offer from a buyer who knows you are in a hurry.',
        body:
          'Sellers who need money urgently are the ones who sell cheaply. Buyers can tell, and they offer less.\n\n' +
          'A sale advance removes the hurry. List your property with Jukiwa and we advance part of its value up front. We market it to our network of ready buyers at a proper price, and recover the advance from the proceeds when it sells.',
        features: [
          'An upfront deposit before your property is sold',
          'Recovered from the sale proceeds',
          'Your property marketed to Jukiwa’s network of buyers',
          'Protects you from opportunistic low offers',
        ],
        requirements: [
          'Title deed in your name',
          'National ID or passport, and KRA PIN',
          'Property listed for sale with Jukiwa General Agencies',
        ],
      },
      {
        name: 'Land & Title Loan', icon: '📜', audience: 'LANDLORD', mode: 'REDUCING', rate: 200, fee: 300,
        min: 100_000, max: 20_000_000, minTerm: 6, maxTerm: 48,
        tagline: 'Borrow against land you already own.',
        summary: 'A loan secured on a clean title deed — for a project, a business, school fees or anything else — with the amount set by what the land is worth.',
        body:
          'Land is the asset most Kenyan families already have, and the one they can least afford to sell. A land and title loan lets it work for you without selling it.\n\n' +
          'We value the land, agree an amount against it, and register a charge on the title for the life of the loan. Repay monthly on a reducing balance; the charge is discharged when you finish.',
        features: [
          'Secured on land or a building you own',
          'Amount set by an independent valuation',
          'Reducing-balance repayments over up to four years',
          'Use it for anything — no need to explain',
        ],
        requirements: [
          'Title deed in your name, free of other charges',
          'National ID or passport, and KRA PIN',
          'Proof of income to show the repayments are affordable',
          'A recent official search',
        ],
      },
      {
        name: 'Biashara Loan', icon: '💼', audience: 'BUSINESS', mode: 'REDUCING', rate: 300, fee: 300,
        min: 50_000, max: 3_000_000, minTerm: 3, maxTerm: 24,
        tagline: 'Working capital for the business you run.',
        summary: 'A secured loan for traders, landlords’ service businesses and SMEs — stock, equipment or a second outlet — repaid monthly out of the business.',
        body:
          'A growing business usually needs money before it earns it: stock for the season, a machine, a second outlet. A Biashara loan provides it, secured on a logbook or a title deed, and repaid monthly from the business.',
        features: [
          'From KES 50,000 to KES 3,000,000',
          'Secured on a vehicle logbook or a title deed',
          'Monthly repayments over up to two years',
          'Top-up available after six good months',
        ],
        requirements: [
          'National ID and KRA PIN',
          'Business permit and six months’ records or M-Pesa statements',
          'Logbook or title deed as security',
        ],
      },
    ];
    let sort = 0;
    for (const p of products) {
      await run(
        `INSERT INTO web_product (name, slug, tagline, summary, body, icon, audience, calc_mode, rate_pm_bp, fee_bp,
           min_amount_cents, max_amount_cents, min_term_months, max_term_months, rent_multiple_max, features, requirements,
           is_featured, is_published, sort, created_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,TRUE,?,?)`,
        p.name, slugify(p.name), p.tagline, p.summary, p.body, p.icon, p.audience, p.mode, p.rate, p.fee,
        kes(p.min), kes(p.max), p.minTerm, p.maxTerm, p.multiple ?? 0, p.features.join('\n'), p.requirements.join('\n'),
        !!p.featured, sort++, iso(new Date()),
      );
    }
    created.push(`${products.length} loan products (indicative rates — confirm in the admin)`);
  }

  /* ----------------------------------------------------------------------- FAQs */
  if (await isEmpty('web_faq')) {
    const faqs: [category: string, question: string, answer: string][] = [
      ['GENERAL', 'How is Jukiwa Credit related to Jukiwa General Agencies?',
        'Jukiwa Credit Limited is a subsidiary of Jukiwa General Agencies Ltd, formed to finance property across Kenya. The two companies share their directors, their offices and their staff in every branch and satellite — so if you already know Jukiwa, you already know us.'],
      ['GENERAL', 'Is my information safe with you?',
        'This website only ever asks for what a credit officer needs to call you back with a real answer. We never ask for your ID number, KRA PIN or bank statements online — those are collected in person, at a branch, into our lending system. See our privacy notice for the detail.'],
      ['GENERAL', 'How soon will someone contact me?',
        'We aim to call you back within 30 minutes during office hours, and always by the next working day. If you asked us to use WhatsApp or email, we will reach you there instead.'],
      ['LOANS', 'What can I borrow against?',
        'Most of our finance is secured on property: the rent a building earns, a title deed, a building under construction or a property you are selling. The Biashara loan can also be secured on a vehicle logbook.'],
      ['LOANS', 'Are the rates on the calculator what I will pay?',
        'They are indicative — a fair guide to what a typical loan of that kind costs. Your actual rate and fees depend on the property, the security and your circumstances, and are set out in full in your offer letter before you sign anything.'],
      ['LOANS', 'What happens after I apply online?',
        'A credit officer reviews your application, calls you to talk it through and tells you which documents to bring. For property-backed loans we then value or inspect the property. Once approved, you receive an offer letter; once you accept and sign, the money is disbursed.'],
      ['RENT_ADVANCE', 'How does the rent advance work?',
        'If Jukiwa manages your rental property, we advance you up to ten times its monthly rent. Each month we recover the agreed instalment from the rent we collect, deduct our management fee and deposit the balance into your account — typically over 12 or 24 months.'],
      ['RENT_ADVANCE', 'Does my property have to be managed by Jukiwa?',
        'For a rent advance, yes — that is what makes it work, because repayment comes out of the rent we collect. If your property is not managed by Jukiwa yet, we can take it on under a full, hybrid or partial management package and advance you at the same time.'],
      ['RENT_ADVANCE', 'When does a building qualify for a building advance?',
        'When it is at least 75% complete. Our quantity surveyors assess what remains to be done and what it will cost, and we advance that amount in stages. Once finished, Jukiwa lets and manages the building.'],
      ['REPAYMENT', 'How do I make a repayment?',
        'Rent and diaspora advances repay themselves from the rent we collect. For other loans, pay by M-Pesa to Paybill 4224534, using your loan number as the account number, or by bank transfer to the account on your offer letter.'],
      ['REPAYMENT', 'Can I repay early?',
        'Yes. Tell your credit officer and we will give you a settlement figure. Paying off early on a reducing-balance loan means you pay less interest.'],
      ['DIASPORA', 'I live abroad. Can I still apply?',
        'Yes — Kenyans in the United Kingdom, the United States and Canada are among our longest-standing clients. Apply online, call our diaspora line on +44 7737 372706, or visit our regional office in London. Documents can be signed at a Kenyan mission or through an advocate.'],
    ];
    let sort = 0;
    for (const [category, question, answer] of faqs) {
      await run('INSERT INTO web_faq (question, answer, category, sort, is_published) VALUES (?,?,?,?,TRUE)', question, answer, category, sort++);
    }
    created.push(`${faqs.length} questions & answers`);
  }

  /* --------------------------------------------------------------- testimonials */
  if (await isEmpty('web_testimonial')) {
    const quotes: [name: string, role: string, quote: string][] = [
      ['Johnson Kamau', 'Apartment owner · Jukiwa client',
        'Jukiwa have done a great deal of work managing my apartments and I have the peace of mind I did not have before. I am also very happy that they gave me an advance of 2 million shillings that really helped me reinvest in Kenya.'],
      ['Joseph Wasilwa', 'Property investor · Jukiwa client',
        'Jukiwa introduced me to some apartments that were up for sale and guided me through the whole process. I am glad to say we closed the deal some months ago. I couldn’t be happier.'],
      ['Milkah Mutheu', 'Land owner · Jukiwa client',
        'I needed to purchase a piece of land where I can build a family home or some rentals in the near future. Jukiwa helped me along the journey and now I own it.'],
    ];
    let sort = 0;
    for (const [name, role, quote] of quotes) {
      await run(
        'INSERT INTO web_testimonial (name, role_title, quote, rating, sort, is_published, created_at) VALUES (?,?,?,5,?,TRUE,?)',
        name, role, quote, sort++, iso(new Date()),
      );
    }
    created.push(`${quotes.length} testimonials`);
  }

  /* ---------------------------------------------------------------------- posts */
  if (await isEmpty('web_post')) {
    const posts: [title: string, category: string, excerpt: string, body: string, image: string, age: number, pinned?: boolean][] = [
      [
        'Introducing Jukiwa Credit Limited', 'ANNOUNCEMENT',
        'The Jukiwa group has launched a dedicated finance company — built on two decades of lending to the landlords it manages.',
        'Jukiwa General Agencies Ltd is proud to introduce Jukiwa Credit Limited, a new subsidiary dedicated to financing property acquisitions across Kenya.\n\n' +
        'For years the agency has advanced money to the landlords whose properties it manages, recovering it from the rent it collects. Those advances helped clients finish buildings, buy land and reinvest in Kenya from abroad. Jukiwa Credit brings that work into a company of its own, with a dedicated credit team and a clear structure.\n\n' +
        'Nothing about who we are changes. Jukiwa Credit shares its directors with Jukiwa General Agencies, and its offices and staff in every branch and satellite. What changes is what we can offer: rent advances of up to ten times monthly rent, building advances to finish the last 25% of a project, finance to buy land and homes, and loans secured on the property you already own.\n\n' +
        'You can apply online in about five minutes, or visit us at our Kilimani headquarters.',
        photo('1486406146926-c627a92ad1ab'), 21, true,
      ],
      [
        'How a rent advance works — a worked example', 'GUIDE',
        'Ten times your monthly rent, repaid out of the rent itself. Here is exactly how the numbers work.',
        'A rent advance is the simplest finance we offer, and the one landlords ask about most.\n\n' +
        'Take Sarah, who owns an apartment block that collects KES 1,000,000 a month in rent and is managed by Jukiwa. She wants to add a floor. With a rent advance she receives KES 5,000,000 at once, and repays it over two years.\n\n' +
        'She never makes a repayment herself. Each month Jukiwa collects the rent as it always has, recovers the agreed instalment, deducts the management fee and deposits the balance into Sarah’s account. She can see every figure in real time on the Jukiwa property management system.\n\n' +
        'Advances now go up to ten times the monthly rent. To see what your property could support, try the rent advance calculator — put in your monthly rent and the term, and it shows the largest advance and what would be recovered each month.',
        photo('1560518883-ce09059eeffa'), 14,
      ],
      [
        'Finishing the last 25%: how a building advance works', 'GUIDE',
        'A half-finished building earns nothing. Here is how we finance the final stretch — and why it is released in stages.',
        'Most stalled buildings stall late. The foundations, the frame and the walls are up; the plumbing, wiring, finishes and fittings are not, and the money has run out.\n\n' +
        'A building advance is for exactly that point. Once a building is at least 75% complete, our quantity surveyors visit, assess what remains and cost it. We then advance the money in stages, each released against completed work, so it goes into the building rather than sitting in an account.\n\n' +
        'When the building is finished, Jukiwa lets and manages it. The advance is repaid on terms agreed at the start — largely from the rent the finished building now earns.',
        photo('1600585154340-be6161a56a0c'), 9,
      ],
      [
        'Six checks before you borrow against property', 'GUIDE',
        'A loan secured on property is a serious commitment. These are the six questions to ask any lender first — us included.',
        'Borrowing against property can be the cheapest money available to you, and the most dangerous if it is done badly. Before you sign with anyone, check these six things.\n\n' +
        '1. Is the lender real? Look for an established physical office you can visit. Avoid briefcase companies that exist only on a phone.\n\n' +
        '2. Are they insured? A reputable property firm carries professional indemnity insurance to protect clients against losses from errors or negligence. Jukiwa’s cover is KES 500 million.\n\n' +
        '3. What will it cost in total? Ask for the total amount repayable, not only the monthly figure — and whether the rate is flat or on a reducing balance.\n\n' +
        '4. What are the fees? Processing, valuation and legal fees should be set out in writing before you commit.\n\n' +
        '5. Can you repay early? You should be able to, and to know the settlement figure.\n\n' +
        '6. Does the repayment fit your income? Especially for rental property: does the rent comfortably cover the instalment, with room for a vacant unit?',
        photo('1554224155-6726b3ff858f'), 4,
      ],
    ];
    for (const [title, category, excerpt, body, image, age, pinned] of posts) {
      await run(
        `INSERT INTO web_post (title, slug, category, excerpt, body, image_url, is_published, is_pinned, published_at, author, created_at)
         VALUES (?,?,?,?,?,?,TRUE,?,?,?,?)`,
        title, slugify(title), category, excerpt, body, image, !!pinned, daysAgo(age), 'Jukiwa Credit', daysAgo(age),
      );
    }
    created.push(`${posts.length} insights & announcements`);
  }

  /* ------------------------------------------------------------------ vacancies */
  if (await isEmpty('web_vacancy')) {
    const roles: [title: string, department: string, experience: string, qualifications: string, skills: string][] = [
      ['Credit Manager', 'Credit',
        'At least 7 years in credit management or lending, preferably in property financing.',
        'Bachelor’s degree in Finance, Business or a related field. A professional certification in credit management is an advantage.',
        'Credit risk assessment, loan structuring and regulatory compliance.'],
      ['Chief Accountant', 'Finance',
        'At least 8 years in accounting, with at least 3 in a supervisory role.',
        'Bachelor’s degree in Accounting or Finance. CPA(K) or ACCA is required.',
        'Financial reporting, budgeting, tax compliance and accounting software such as QuickBooks or SAP.'],
      ['Operations Manager', 'Operations',
        'At least 8 years in operations management, preferably in financial services.',
        'Bachelor’s degree in Business Administration or a related field. A Master’s degree is a plus.',
        'Organisation, process improvement and team leadership.'],
      ['Marketing Manager', 'Marketing',
        'At least 7 years in marketing, with experience in financial services or real estate.',
        'Bachelor’s degree in Marketing, Business or a related field. A Master’s degree is a plus.',
        'A proven record in digital marketing, brand management and lead generation.'],
      ['Human Resource Manager', 'People',
        'At least 7 years in HR management, preferably in the financial or real estate sectors.',
        'Bachelor’s degree in HR Management or a related field. A Master’s degree or CHRP is an advantage.',
        'Recruitment, employee relations, performance management and compliance with Kenyan labour law.'],
      ['IT Manager', 'Technology',
        'At least 7 years in IT management, with experience of financial systems.',
        'Bachelor’s degree in IT, Computer Science or a related field. Certifications such as CISSP or ITIL are a plus.',
        'Network management, cybersecurity and implementing financial software.'],
      ['Legal Officer', 'Legal',
        'At least 7 years in legal practice, with experience of real estate or financial law.',
        'Bachelor of Laws (LLB), and admitted as an Advocate of the High Court of Kenya.',
        'Contract drafting, regulatory compliance and dispute resolution.'],
      ['Receptionist', 'Front office',
        'At least 3 years in a front-office or customer service role.',
        'Diploma in Business Administration, Secretarial Studies or a related field.',
        'Excellent communication, customer service and basic computer skills.'],
    ];
    for (const [title, department, experience, qualifications, skills] of roles) {
      const body =
        `Jukiwa Credit Limited, the new property finance subsidiary of Jukiwa General Agencies Ltd, is building its founding team.\n\n` +
        `Experience\n${experience}\n\nQualifications\n${qualifications}\n\nSkills\n${skills}\n\n` +
        `How to apply\nSend your CV, a cover letter and copies of your certificates to careers@jukiwa.co.ke, with "${title}" in the subject line. ` +
        `Only shortlisted candidates will be contacted. Jukiwa Credit Limited is an equal opportunity employer and welcomes applications from qualified people across Kenya.`;
      await run(
        `INSERT INTO web_vacancy (title, slug, department, location, employment_type, summary, body, is_published, created_at)
         VALUES (?,?,?,?,?,?,?,TRUE,?)`,
        title, slugify(title), department, 'Nairobi (Kilimani headquarters)', 'Full time',
        `Join Jukiwa Credit’s founding team as ${/^[AEIOU]/.test(title) ? 'an' : 'a'} ${title}.`, body, daysAgo(30),
      );
    }
    created.push(`${roles.length} vacancies`);
  }

  if (!demo) return { created, adminEmail, adminPassword };

  /* ----------------------------------------------------- a demonstration pipeline */
  // Only so the dashboard, the pipeline and the charts have something to show on day one.
  // Every row says what it is in its notes; delete them from the admin before going live.
  if (await isEmpty('web_application')) {
    const productFor = (slug: string): Promise<Product | undefined> => one<Product>('SELECT * FROM web_product WHERE slug = ?', slug);
    const hq = (await one<{ id: number }>("SELECT id FROM web_branch WHERE kind = 'HQ' LIMIT 1"))?.id ?? null;

    const rows: [first: string, last: string, product: string, amount: number, term: number, rent: number | null, county: string, type: string, status: string, age: number][] = [
      ['Grace', 'Wanjiru', 'rent-advance', 3_500_000, 24, 420_000, 'Kiambu', 'INDIVIDUAL', 'RECEIVED', 0],
      ['Peter', 'Otieno', 'building-advance', 6_000_000, 24, null, 'Kajiado', 'INDIVIDUAL', 'RECEIVED', 1],
      ['Esther', 'Njeri', 'diaspora-landlord-advance', 4_000_000, 12, 400_000, "Murang'a", 'DIASPORA', 'REVIEWING', 3],
      ['Samuel', 'Mwangi', 'property-purchase-finance', 8_500_000, 48, null, 'Nairobi', 'INDIVIDUAL', 'DOCUMENTS', 6],
      ['Faith', 'Achieng', 'land-and-title-loan', 1_200_000, 24, null, 'Kisumu', 'INDIVIDUAL', 'APPRAISAL', 9],
      ['Daniel', 'Kiprono', 'rent-advance', 2_000_000, 12, 250_000, 'Nakuru', 'INDIVIDUAL', 'APPROVED', 13],
      ['Mary', 'Wambui', 'sale-advance', 1_500_000, 6, null, 'Machakos', 'INDIVIDUAL', 'DISBURSED', 19],
      ['James', 'Kariuki', 'diaspora-landlord-advance', 6_000_000, 24, 650_000, 'Nyeri', 'DIASPORA', 'DISBURSED', 26],
      ['Lucy', 'Chebet', 'biashara-loan', 400_000, 12, null, 'Uasin Gishu', 'INDIVIDUAL', 'DECLINED', 33],
      ['Kevin', 'Omondi', 'property-purchase-finance', 12_000_000, 60, null, 'Nairobi', 'COMPANY', 'REVIEWING', 40],
      ['Ruth', 'Nyambura', 'rent-advance', 5_000_000, 24, 600_000, 'Kiambu', 'INDIVIDUAL', 'DISBURSED', 48],
      ['Joseph', 'Mutua', 'building-advance', 9_000_000, 36, null, 'Machakos', 'INDIVIDUAL', 'APPROVED', 57],
      ['Anne', 'Wairimu', 'biashara-loan', 800_000, 18, null, 'Kajiado', 'INDIVIDUAL', 'WITHDRAWN', 66],
      ['Moses', 'Kamau', 'rent-advance', 1_800_000, 12, 200_000, 'Nairobi', 'INDIVIDUAL', 'DISBURSED', 78],
    ];
    let n = 0;
    for (const [first, last, slug, amount, term, rent, county, type, status, age] of rows) {
      n += 1;
      const no = `JCL-${new Date(daysAgo(age)).getUTCFullYear()}-D${String(n).padStart(3, '0')}`;
      const handled = status === 'RECEIVED' ? null : daysAgo(Math.max(0, age - 1), 11);
      const product = await productFor(slug);
      // Quoted exactly as the website would have quoted it, so the officer's card shows the figure.
      const q = product ? quote(toTerms(product), { amountCents: kes(amount), termMonths: term, monthlyRentCents: rent ? kes(rent) : null }) : null;
      await run(
        `INSERT INTO web_application (no, product_id, amount_cents, term_months, monthly_income_cents, est_repayment_cents, purpose,
           applicant_type, first_name, last_name, phone, email, county, country, collateral, branch_id, contact_preference,
           consent_contact, status, notes, source_page, created_at, handled_by, handled_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'CALL',TRUE,?,?,?,?,?,?)`,
        no, product?.id ?? null, q?.principalCents ?? kes(amount), term, rent ? kes(rent) : null, q?.monthlyCents ?? null, 'Demonstration application',
        type, first, last, `+254 7${String(10_000_000 + n * 1_234_567).slice(0, 8)}`, null, county,
        type === 'DIASPORA' ? 'United Kingdom' : 'Kenya', rent ? 'RENTAL_PROPERTY' : 'TITLE_DEED', hq,
        status, 'Demonstration record — delete before going live.', '/apply', daysAgo(age), handled ? 'seed' : null, handled,
      );
    }
    created.push(`${rows.length} demonstration applications`);
  }

  if (await isEmpty('web_enquiry')) {
    const enquiries: [kind: string, name: string, location: string | null, message: string, status: string, age: number][] = [
      ['CALLBACK', 'Wilson Gitau', null, 'Please call me about the building advance — my block in Ruiru is nearly finished.', 'NEW', 0],
      ['ENQUIRY', 'Susan Atieno', null, 'Can I get a rent advance if only half of my units are occupied?', 'NEW', 1],
      ['PARTNER', 'Brian Koech', 'Eldoret, Uasin Gishu', 'I manage 40 units in Eldoret and would like to represent Jukiwa here.', 'CONTACTED', 5],
      ['CALLBACK', 'Caroline Muthoni', null, 'Calling from the UK — interested in the diaspora advance.', 'CONVERTED', 12],
      ['ENQUIRY', 'Tom Ouma', null, 'Do you finance the purchase of land in Kisumu?', 'CLOSED', 20],
    ];
    let n = 0;
    for (const [kind, name, location, message, status, age] of enquiries) {
      n += 1;
      await run(
        `INSERT INTO web_enquiry (kind, name, phone, location, message, status, notes, source_page, created_at)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        kind, name, `+254 72${String(1_000_000 + n * 765_431).slice(0, 7)}`, location, message, status,
        'Demonstration record — delete before going live.', '/contact', daysAgo(age, 9),
      );
    }
    created.push(`${enquiries.length} demonstration enquiries`);
  }

  return { created, adminEmail, adminPassword };
}
