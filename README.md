# Jukiwa Credit — Website

The public website of **Jukiwa Credit Limited** and the admin its team runs it from. Jukiwa Credit
is the property-finance subsidiary of [Jukiwa General Agencies Ltd](https://www.jukiwa.co.ke): the
same directors, the same offices and the same staff in every satellite, now lending — rent
advances, building advances, property purchase finance, diaspora advances, land loans and business
loans.

The website is deliberately a **separate application** from the lending system, with its own
database, its own logins and its own deployment. It is the one thing the whole internet can reach,
so it holds no loan account, no balance, no repayment, no ID number and no KRA PIN. An application
here is a *lead* — who wants how much, for what, secured on what — and it becomes a loan in the
lending system after KYC done in person at a branch.

Built with **Next.js 16 (App Router) and TypeScript**. Pages are React Server Components that
query the domain layer directly and every mutation is a Server Action, so there is no REST layer
between the screen and the business logic. **PostgreSQL** holds the content, **Cloudinary** holds
the images.

---

## Running it

```bash
pnpm install
cp .env.local.example .env.local   # then fill in DATABASE_URL and the Cloudinary keys
pnpm db:setup                      # creates the schema and Jukiwa Credit's content
pnpm dev
```

Then open **http://localhost:3000**, and the admin at **/admin/login**.

`db:setup` creates the first administrator from `ADMIN_EMAIL` and `ADMIN_PASSWORD` (or generates a
password and prints it once). It is not stored anywhere and is not recoverable — if you lose it, a
System Administrator can reset it, or run `pnpm db:setup` against an empty `web_user` table.

### Every command

```bash
pnpm dev         # development server
pnpm build       # production build
pnpm start       # run the production build
pnpm test        # the integrity suite — 123 checks against the live database
pnpm typecheck   # tsc --noEmit
pnpm lint        # eslint
pnpm db:setup    # apply the schema, then seed whatever is empty
pnpm db:check    # is the database reachable, and what is in it?
pnpm seed        # seed only (for a schema managed elsewhere)
pnpm db:reset    # DESTROYS every web_ table and rebuilds — needs CONFIRM_RESET=yes
```

### Configuration

| Variable | What it is for |
|---|---|
| `DATABASE_URL` | PostgreSQL. **Required.** |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Image uploads. Without them the admin still runs; the upload fields say so. |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | The same cloud name, for building delivery URLs in the browser. |
| `CLOUDINARY_FOLDER` | Where uploads land. Defaults to `jukiwa_website`. |
| `NEXT_PUBLIC_SITE_URL` | This site's own address — canonical URLs, the sitemap, Open Graph tags. |
| `NEXT_PUBLIC_PORTAL_URL` | A customer portal, if there is one. Overridden by the portal link in Admin → Company profile. |
| `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | The first administrator, used by `db:setup` on an empty database. |
| `SEED_DEMO_DATA=false` | Seed the real content and the first account, without the demonstration applications. |

---

## What the seed puts in

Everything is drawn from what Jukiwa General Agencies already publishes, and every row is ordinary
content the admin can edit or delete:

- **The company** — Kilimani head office (Tetu Apartments, Block C, Room 5), P.O. Box 21481–00100,
  the group's phone lines, Paybill 4224534, the London diaspora office and line, social accounts,
  mission and values.
- **Offices** — Nairobi HQ, Kitengela, Nakuru and the London diaspora regional office.
- **Leadership** — the group's published leadership, with the portraits the group already uses.
- **Seven loan products** — rent advance (up to 10× rent, repaid from the rent), building advance
  (75%-complete buildings, QS-assessed), property purchase finance, diaspora landlord advance, sale
  advance, land & title loan and a Biashara loan.
- **Twelve FAQs, three testimonials, four insight articles and the eight Jukiwa Credit vacancies.**
- **A demonstration pipeline** — 14 applications and 5 enquiries, each marked *Demonstration
  record* in its notes, so the dashboard has something to show. Delete them before going live, or
  seed with `SEED_DEMO_DATA=false`.

> **Confirm before launch:** every product's *indicative* rate, fee, limits and terms (Admin → Loan
> products); the licence and registration lines for the footer (Admin → Company profile); office
> hours and the Kitengela/Nakuru addresses; and the retention period promised in the privacy notice.

---

## The public website

| Page | What it is |
|---|---|
| `/` | Hero with a live loan calculator, the group's figures, products, how it works, the rent-advance statement, why Jukiwa, diaspora, testimonials, insights, FAQs and a callback form |
| `/loans` · `/loans/[slug]` | Every product, a side-by-side comparison, and a page per product with its own calculator |
| `/calculator` | Every product, with the full month-by-month repayment schedule |
| `/apply` | The four-step online application — loan, applicant, security, review — with a live estimate |
| `/diaspora` | For Kenyans in the UK, USA and Canada, with the London office and a time-zone-aware callback |
| `/about` · `/branches` · `/careers` | The story, values and leadership; every office with a map, and the agent/partner form; vacancies |
| `/insights` · `/faqs` · `/contact` · `/privacy` · `/terms` | Guides and news; answers with FAQ structured data; how to reach us; the Data Protection Act notice; website terms |

Phone-first throughout. Every page carries `schema.org` structured data — `FinancialService`,
`LoanOrCredit`, `FAQPage`, `Article`, `JobPosting` — so a search engine or an assistant can answer
"what does Jukiwa Credit lend" without the visitor clicking. Motion is scroll-driven CSS with no
script, and none at all for a visitor whose system asks for stillness.

### The calculator tells the truth

`lib/loan-math.ts` is pure arithmetic — reducing balance, flat rate, and the rent advance (a multiple
of the rent, recovered from the rent). The calculator in the browser, the application form and the
server all run the **same functions**: when an application arrives, the server re-quotes it from
the product row rather than trusting the browser, so the figure a credit officer calls about is the
figure the customer was shown. Change a product's rate in the admin, and every calculator on the
site follows by the next request.

### What a visitor may write

Five things, and nothing else on the site accepts a POST from somebody who is not signed in: a loan
application, a question, a callback request, an agent/partner enquiry and a newsletter sign-up.
Each is validated server-side, rate-limited by address (a burst limit and an hourly ceiling),
screened by a honeypot, and recorded against a synthetic `website` actor rather than a login.

---

## The admin

`/admin`, behind a sign-in. Records are edited **in place on their card** rather than in pop-ups.

| Section | Screens |
|---|---|
| **Overview** | Dashboard — new applications, open pipeline value, approvals, callbacks waiting, and *what the website brought in*: volume by week or month, the pipeline by stage, the product mix, where applicants are, and the median time to first response |
| **Lending** | Loan applications worked as a pipeline (Received → Reviewing → Awaiting documents → Site visit & appraisal → Approved → Disbursed, or Declined / Withdrawn), with one-tap call, WhatsApp and email, and an append-only notes log · Enquiries & callbacks · Loan products and their indicative terms |
| **Publishing** | Insights & news · Testimonials · Questions customers ask |
| **Company** | Leadership & team · Branches & offices · Careers · Newsletter list |
| **Setup** | Company profile & theme (colours, logo, compliance lines, Paybill) · Security |
| **Security** | Users · Permission Sets · Audit trail |

### Permission Sets

Access follows the **Business Central Permission Set** model. A role's access is a list of lines,
each granting rights on one object — a **TABLE** (Read / Insert / Modify / Delete) or a **PAGE**
(Execute). Both are needed. `lib/permissions.ts` carries an **ACTIONS** registry — one named grant
per operation — so a call site asks for `requireAction('APPLICATIONS_UPDATE')` and both halves are
checked together.

Six sets are seeded, each an ordinary row an administrator can edit line by line:

| Set | For |
|---|---|
| **System Administrator** | Unrestricted, from a flag rather than lines. |
| **Credit Manager** | The whole pipeline, and every product's rates, limits and terms. |
| **Credit Officer** | Works applications and callbacks. Sees products, cannot change their terms. |
| **Customer Care** | Questions and callbacks, and the public answers. Sees applications, cannot move them. |
| **Marketing & Communications** | Insights, testimonials, team, branches, careers, newsletter. Cannot see applications. |
| **Auditor (Read Only)** | Every screen and the audit trail; changes nothing. |

Three rules are enforced in the domain layer, not in the UI: only a System Administrator may change
who can do what; the last active System Administrator cannot be demoted, disabled or deleted; and
every Server Action re-checks its right, because a Server Action is a POST endpoint the whole
internet can reach.

### The audit trail

Every create, change and delete, every sign-in and every failed sign-in. A product's rate change is
recorded with the old and new rate, because it is the one edit somebody will later ask about.

---

## How it is put together

```
app/
  (site)/              the public website — its own layout, navigation and stylesheet
    calculator.tsx     the live loan calculator (client) — runs lib/loan-math.ts
    apply/             the four-step application
  admin/
    login/             sign-in, outside the guarded layout
    (dashboard)/       everything behind the sign-in: guard, sidebar, screens, insights
  actions/
    public.ts          the five things a visitor may write
    content.ts         every write the admin makes
    security.ts        Permission Sets and accounts
    auth.ts            sign in, sign out, change your own password
  brand.tsx            the Jukiwa Credit mark — the Jukiwa roof over rising bars, themed at runtime
lib/
  db.ts                a pg pool, three query helpers, BIGINT parsing, the audit trail
  schema.sql           the whole schema, idempotent
  seed.ts              schema application and Jukiwa Credit's content
  loan-math.ts         reducing, flat and rent-advance arithmetic and schedules — pure, shared
  auth.ts              sessions, and the guards every page and action calls
  permissions.ts       the pages catalogue, the ACTIONS registry, the standard sets
  roles.ts             Permission Sets and accounts
  site.ts              the public read layer — published content only
  content.ts           the admin read/write layer — drafts included
  inbox.ts             applications, enquiries, subscribers, and the pipelines
  insights.ts          the dashboard's lending analytics
proxy.ts               security headers, and the pathname for the layouts
test/verify.ts         the integrity suite
```

### Decisions worth knowing about

**SQL, not an ORM.** `?` and `@named` placeholders are rewritten to `$1..$n`; values are always
bound, never interpolated.

**Money as integer cents in BIGINT, rates in basis points.** A KES 50M loan is five billion cents,
past 32 bits — so the amount columns are BIGINT, parsed back to numbers once in `lib/db.ts`. No
figure is ever a float.

**Sessions in the database, not a JWT.** Revoking a session, disabling an account or removing a
right takes effect on the very next request.

**Nothing sensitive online.** The application form has no field for an ID number, a PIN or a
document, and the schema has no column for one. The form says so — it is the question that makes a
careful borrower close the tab.

**Runtime theming.** The three brand colours live in the settings row and are applied as CSS custom
properties per request, across the website *and* the admin, including the logo.

---

## Deploying

An ordinary Next.js application: `pnpm build`, then `pnpm start` behind a reverse proxy, or any host
that runs Next 16. Before going live:

1. Point `DATABASE_URL` at the production database and run `pnpm db:setup` once, with
   `SEED_DEMO_DATA=false`.
2. Set `NEXT_PUBLIC_SITE_URL` to the real address, or the sitemap and every Open Graph tag will
   advertise `localhost`.
3. **Host the app in the same region as the database.** Every page is a few queries; across an
   ocean each one costs a quarter of a second.
4. Confirm the product terms, licence line and office details listed above.

`proxy.ts` sets the security headers — a Content-Security-Policy naming Cloudinary, Google Fonts,
Unsplash and the sister company's site explicitly, `X-Frame-Options`, `Referrer-Policy`, and
`no-store` on everything behind the sign-in.

---

## Testing

```bash
pnpm test
```

123 checks against the live database — SQL binding and BIGINT handling, validation, the loan
arithmetic against textbook figures, schedules that end at exactly zero, the Permission Sets job by
job, password hashing, rate limiting, every public write path including the server's re-quote, the
published-content rules, the audit trail. Everything it creates carries a marker and is deleted
again at the end.
