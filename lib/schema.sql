-- ---------------------------------------------------------------------------
-- Jukiwa Credit Limited — the website's own database.
--
-- Every table is prefixed `web_` so this schema can share a PostgreSQL database
-- with the lending system without colliding with it — though a database of its
-- own is the better answer, and the reason this project is separate.
--
-- The file is idempotent: `pnpm db:setup` can be run against a live database as
-- often as you like. Dates and timestamps are stored as ISO-8601 TEXT, so a value
-- renders identically on the server and in the browser; money is stored in minor
-- units (cents) as an integer and rates in basis points, never as a float.
--
-- What this database deliberately does NOT hold: a loan account, a balance, a
-- repayment, an ID number or a KRA PIN. An application here is a lead — who wants
-- how much, for what, secured on what — and it becomes a loan in the lending
-- system, after KYC done in person. The website is the one thing the whole
-- internet can reach, and it is built so that there is nothing in it worth taking.
-- ---------------------------------------------------------------------------

-- ------------------------------------------------------------ the company
-- One row, id = 1. Everything the header, footer, contact page and structured
-- data need, plus the three colours the whole site is themed from.
CREATE TABLE IF NOT EXISTS web_setting (
  id                 INTEGER PRIMARY KEY DEFAULT 1,
  name               TEXT NOT NULL DEFAULT 'Our Company',
  short_name         TEXT,
  tagline            TEXT,
  about_intro        TEXT,
  about_story        TEXT,
  mission            TEXT,
  vision             TEXT,
  parent_name        TEXT,
  parent_url         TEXT,
  founded_year       TEXT,
  registration_no    TEXT,
  licence_no         TEXT,
  licence_note       TEXT,
  physical_address   TEXT,
  postal_address     TEXT,
  city               TEXT,
  country            TEXT DEFAULT 'Kenya',
  map_embed_url      TEXT,
  phone_primary      TEXT,
  phone_secondary    TEXT,
  email              TEXT,
  loans_email        TEXT,
  office_hours       TEXT,
  paybill_no         TEXT,
  paybill_note       TEXT,
  bank_details       TEXT,
  currency_symbol    TEXT NOT NULL DEFAULT 'KES',
  logo_url           TEXT,
  hero_image_url     TEXT,                -- retired: superseded by web_hero_image, read only by its one-off carry-over below
  hero_kicker        TEXT,
  hero_headline      TEXT,
  hero_body          TEXT,
  brand_primary      TEXT NOT NULL DEFAULT '#1e5c35',
  brand_accent       TEXT NOT NULL DEFAULT '#d4a94a',
  brand_deep         TEXT NOT NULL DEFAULT '#0b2a18',
  portal_url         TEXT,
  facebook_url       TEXT,
  instagram_url      TEXT,
  x_url              TEXT,
  youtube_url        TEXT,
  tiktok_url         TEXT,
  linkedin_url       TEXT,
  whatsapp_number    TEXT,
  diaspora_phone     TEXT,
  diaspora_email     TEXT,
  stat_years         TEXT,
  stat_clients       TEXT,
  stat_counties      TEXT,
  stat_turnaround    TEXT,
  indemnity_cover    TEXT,
  updated_at         TEXT
);
INSERT INTO web_setting (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------- the admin: users and permission sets
-- A Permission Set, in the Business Central sense: a named role whose access is a list of
-- lines, each granting rights on one object. is_system = TRUE is the System Administrator —
-- full access implied by the flag, with no lines at all.
CREATE TABLE IF NOT EXISTS web_role (
  id           SERIAL PRIMARY KEY,
  name         TEXT NOT NULL UNIQUE,
  description  TEXT,
  is_system    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TEXT NOT NULL,
  created_by   TEXT
);

-- One line of a Permission Set: rights on one Object, which is either a database TABLE
-- (Read / Insert / Modify / Delete) or an application PAGE (Execute — may this screen be
-- reached at all).
CREATE TABLE IF NOT EXISTS web_permission_line (
  id            SERIAL PRIMARY KEY,
  role_id       INTEGER NOT NULL REFERENCES web_role(id) ON DELETE CASCADE,
  object_type   TEXT NOT NULL,           -- 'TABLE' | 'PAGE'
  object_name   TEXT NOT NULL,           -- 'web_application' | 'APPLICATIONS'
  read_perm     BOOLEAN NOT NULL DEFAULT FALSE,
  insert_perm   BOOLEAN NOT NULL DEFAULT FALSE,
  modify_perm   BOOLEAN NOT NULL DEFAULT FALSE,
  delete_perm   BOOLEAN NOT NULL DEFAULT FALSE,
  execute_perm  BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (role_id, object_type, object_name)
);
CREATE INDEX IF NOT EXISTS ix_web_permission_line_role ON web_permission_line(role_id);

CREATE TABLE IF NOT EXISTS web_user (
  id             SERIAL PRIMARY KEY,
  name           TEXT NOT NULL,
  email          TEXT NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  -- The primary Permission Set. Further sets may be granted in web_user_role, and single
  -- objects overridden per user in web_user_permission_line.
  role_id        INTEGER REFERENCES web_role(id) ON DELETE SET NULL,
  status         TEXT NOT NULL DEFAULT 'ACTIVE',
  title          TEXT,
  avatar_url     TEXT,
  must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
  last_login_at  TEXT,
  created_at     TEXT NOT NULL,
  created_by     TEXT
);

-- Business Central "User Permission Sets": a user may hold more than one. Effective rights are
-- the union of the primary role and every set listed here.
CREATE TABLE IF NOT EXISTS web_user_role (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES web_user(id) ON DELETE CASCADE,
  role_id     INTEGER NOT NULL REFERENCES web_role(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL,
  created_by  TEXT,
  UNIQUE (user_id, role_id)
);
CREATE INDEX IF NOT EXISTS ix_web_user_role_user ON web_user_role(user_id);

-- A per-user override. A row here REPLACES whatever the user's roles say about that one object,
-- so one person can be restricted or enhanced without a Permission Set being edited for everyone.
CREATE TABLE IF NOT EXISTS web_user_permission_line (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES web_user(id) ON DELETE CASCADE,
  object_type   TEXT NOT NULL,
  object_name   TEXT NOT NULL,
  read_perm     BOOLEAN NOT NULL DEFAULT FALSE,
  insert_perm   BOOLEAN NOT NULL DEFAULT FALSE,
  modify_perm   BOOLEAN NOT NULL DEFAULT FALSE,
  delete_perm   BOOLEAN NOT NULL DEFAULT FALSE,
  execute_perm  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TEXT,
  created_by    TEXT,
  UNIQUE (user_id, object_type, object_name)
);
CREATE INDEX IF NOT EXISTS ix_web_user_permission_line_user ON web_user_permission_line(user_id);

CREATE TABLE IF NOT EXISTS web_session (
  token       TEXT PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES web_user(id) ON DELETE CASCADE,
  expires_at  TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  ip          TEXT,
  user_agent  TEXT
);
CREATE INDEX IF NOT EXISTS ix_web_session_user ON web_session(user_id);

CREATE TABLE IF NOT EXISTS web_audit (
  id          SERIAL PRIMARY KEY,
  actor_id    INTEGER,
  actor_name  TEXT NOT NULL,
  action      TEXT NOT NULL,
  entity      TEXT NOT NULL,
  entity_id   TEXT,
  detail      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_web_audit_created ON web_audit(created_at DESC);

-- ------------------------------------------------------------ places and people
-- Jukiwa Credit shares its offices and its people with Jukiwa General Agencies in every
-- satellite, so a branch here is the same door a landlord already walks through.
CREATE TABLE IF NOT EXISTS web_branch (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  kind          TEXT NOT NULL DEFAULT 'BRANCH',   -- HQ | BRANCH | SATELLITE | REGIONAL
  town          TEXT,
  county        TEXT,
  country       TEXT NOT NULL DEFAULT 'Kenya',
  address       TEXT,
  phone         TEXT,
  email         TEXT,
  hours         TEXT,
  map_url       TEXT,
  manager       TEXT,
  note          TEXT,
  sort          INTEGER NOT NULL DEFAULT 0,
  is_published  BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS web_team (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  role_title    TEXT NOT NULL,
  category      TEXT NOT NULL DEFAULT 'LEADERSHIP',   -- BOARD | LEADERSHIP | MANAGEMENT | BRANCH
  bio           TEXT,
  photo_url     TEXT,
  email         TEXT,
  linkedin_url  TEXT,
  branch_id     INTEGER REFERENCES web_branch(id) ON DELETE SET NULL,
  sort          INTEGER NOT NULL DEFAULT 0,
  is_published  BOOLEAN NOT NULL DEFAULT TRUE
);

-- ------------------------------------------------------------------ products
-- What Jukiwa Credit lends, on what indicative terms. The calculator, the product pages and
-- the application form all read their limits from here, so a change of rate made by the
-- Credit Manager is live on every page by the next request.
CREATE TABLE IF NOT EXISTS web_product (
  id                 SERIAL PRIMARY KEY,
  name               TEXT NOT NULL,
  slug               TEXT NOT NULL UNIQUE,
  tagline            TEXT,
  summary            TEXT,
  body               TEXT,
  icon               TEXT,
  image_url          TEXT,
  audience           TEXT NOT NULL DEFAULT 'LANDLORD',
  calc_mode          TEXT NOT NULL DEFAULT 'REDUCING',  -- REDUCING | FLAT | RENT_ADVANCE
  rate_pm_bp         INTEGER NOT NULL DEFAULT 0,        -- indicative monthly rate, basis points
  fee_bp             INTEGER NOT NULL DEFAULT 0,        -- one-off fee, basis points of the amount
  min_amount_cents   BIGINT NOT NULL DEFAULT 0,
  max_amount_cents   BIGINT NOT NULL DEFAULT 0,
  min_term_months    INTEGER NOT NULL DEFAULT 1,
  max_term_months    INTEGER NOT NULL DEFAULT 12,
  rent_multiple_max  INTEGER NOT NULL DEFAULT 0,
  features           TEXT,                              -- one per line
  requirements       TEXT,                              -- one per line
  is_featured        BOOLEAN NOT NULL DEFAULT FALSE,
  is_published       BOOLEAN NOT NULL DEFAULT TRUE,
  sort               INTEGER NOT NULL DEFAULT 0,
  created_at         TEXT NOT NULL,
  updated_at         TEXT
);

-- ---------------------------------------------------------------- what visitors send
-- A loan application is a LEAD. It carries enough to call the customer back with a real
-- answer, and nothing that would matter if it leaked: no ID number, no KRA PIN, no bank
-- statement. Those are collected in person, at the branch, into the lending system.
CREATE TABLE IF NOT EXISTS web_application (
  id                    SERIAL PRIMARY KEY,
  no                    TEXT NOT NULL UNIQUE,
  product_id            INTEGER REFERENCES web_product(id) ON DELETE SET NULL,
  amount_cents          BIGINT NOT NULL,
  term_months           INTEGER NOT NULL,
  monthly_income_cents  BIGINT,
  est_repayment_cents   BIGINT,
  purpose               TEXT,
  applicant_type        TEXT NOT NULL DEFAULT 'INDIVIDUAL',
  first_name            TEXT NOT NULL,
  last_name             TEXT NOT NULL,
  company_name          TEXT,
  phone                 TEXT NOT NULL,
  email                 TEXT,
  county                TEXT,
  country               TEXT,
  collateral            TEXT NOT NULL DEFAULT 'NONE',
  collateral_detail     TEXT,
  property_location     TEXT,
  branch_id             INTEGER REFERENCES web_branch(id) ON DELETE SET NULL,
  contact_preference    TEXT NOT NULL DEFAULT 'CALL',
  consent_contact       BOOLEAN NOT NULL DEFAULT FALSE,
  -- RECEIVED | REVIEWING | DOCUMENTS | APPRAISAL | APPROVED | DISBURSED | DECLINED | WITHDRAWN
  status                TEXT NOT NULL DEFAULT 'RECEIVED',
  notes                 TEXT,
  source_page           TEXT,
  created_at            TEXT NOT NULL,
  handled_by            TEXT,
  handled_at            TEXT
);
CREATE INDEX IF NOT EXISTS ix_web_application_status ON web_application(status);
CREATE INDEX IF NOT EXISTS ix_web_application_created ON web_application(created_at DESC);

CREATE TABLE IF NOT EXISTS web_enquiry (
  id              SERIAL PRIMARY KEY,
  kind            TEXT NOT NULL DEFAULT 'ENQUIRY',   -- ENQUIRY | CALLBACK | PARTNER
  name            TEXT NOT NULL,
  phone           TEXT NOT NULL,
  email           TEXT,
  product_id      INTEGER REFERENCES web_product(id) ON DELETE SET NULL,
  branch_id       INTEGER REFERENCES web_branch(id) ON DELETE SET NULL,
  location        TEXT,
  message         TEXT,
  preferred_time  TEXT,
  status          TEXT NOT NULL DEFAULT 'NEW',       -- NEW | CONTACTED | CONVERTED | CLOSED
  notes           TEXT,
  source_page     TEXT,
  created_at      TEXT NOT NULL,
  handled_by      TEXT,
  handled_at      TEXT
);
CREATE INDEX IF NOT EXISTS ix_web_enquiry_status ON web_enquiry(status);
CREATE INDEX IF NOT EXISTS ix_web_enquiry_created ON web_enquiry(created_at DESC);

CREATE TABLE IF NOT EXISTS web_subscriber (
  id          SERIAL PRIMARY KEY,
  email       TEXT NOT NULL UNIQUE,
  name        TEXT,
  status      TEXT NOT NULL DEFAULT 'ACTIVE',
  source_page TEXT,
  created_at  TEXT NOT NULL
);

-- ------------------------------------------------------------------ publishing
CREATE TABLE IF NOT EXISTS web_post (
  id            SERIAL PRIMARY KEY,
  title         TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  category      TEXT NOT NULL DEFAULT 'NEWS',   -- ANNOUNCEMENT | GUIDE | INSIGHT | NEWS
  excerpt       TEXT,
  body          TEXT NOT NULL,
  image_url     TEXT,
  is_published  BOOLEAN NOT NULL DEFAULT FALSE,
  is_pinned     BOOLEAN NOT NULL DEFAULT FALSE,
  published_at  TEXT NOT NULL,
  views         INTEGER NOT NULL DEFAULT 0,
  author        TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT
);
CREATE INDEX IF NOT EXISTS ix_web_post_published ON web_post(is_published, published_at DESC);

CREATE TABLE IF NOT EXISTS web_testimonial (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  role_title    TEXT,
  quote         TEXT NOT NULL,
  photo_url     TEXT,
  rating        INTEGER NOT NULL DEFAULT 5,
  sort          INTEGER NOT NULL DEFAULT 0,
  is_published  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS web_faq (
  id            SERIAL PRIMARY KEY,
  question      TEXT NOT NULL,
  answer        TEXT NOT NULL,
  category      TEXT NOT NULL DEFAULT 'GENERAL',
  sort          INTEGER NOT NULL DEFAULT 0,
  is_published  BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS web_vacancy (
  id               SERIAL PRIMARY KEY,
  title            TEXT NOT NULL,
  slug             TEXT NOT NULL UNIQUE,
  department       TEXT,
  location         TEXT,
  employment_type  TEXT,
  summary          TEXT,
  body             TEXT NOT NULL,
  closes_on        TEXT,
  is_published     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TEXT NOT NULL,
  updated_at       TEXT
);

-- Sequence used to number applications within a calendar year: JCL-2026-0001.
CREATE TABLE IF NOT EXISTS web_counter (
  key    TEXT PRIMARY KEY,
  value  INTEGER NOT NULL DEFAULT 0
);

-- The library of hero background pictures. Every page hero — the home page, Diaspora, Calculator,
-- Insights and the rest — shows one of the active ones, picked afresh in the visitor's browser on
-- each visit, so the site does not open on the same picture twice in a row.
CREATE TABLE IF NOT EXISTS web_hero_image (
  id          SERIAL PRIMARY KEY,
  image_url   TEXT NOT NULL,
  label       TEXT,                    -- what is in the picture, for the people running the site
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  sort        INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL,
  created_by  TEXT
);

-- The one picture chosen under Company profile before the library existed becomes its first entry.
-- Once only: the marker stops it coming back after somebody deliberately empties the library.
INSERT INTO web_hero_image (image_url, label, created_at, created_by)
SELECT hero_image_url, 'The original home page picture',
       to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), 'migration'
  FROM web_setting
 WHERE id = 1 AND hero_image_url IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM web_counter WHERE key = 'hero_library_started');
INSERT INTO web_counter (key, value) VALUES ('hero_library_started', 1) ON CONFLICT (key) DO NOTHING;

-- The brand moved from the launch green and yellow to the colours of the Jukiwa Credit logo. A
-- company still on the old defaults gets the new ones; one that has chosen its own keeps them.
UPDATE web_setting
   SET brand_primary = '#1e5c35', brand_accent = '#d4a94a', brand_deep = '#0b2a18'
 WHERE lower(brand_primary) = '#059652' AND lower(brand_accent) = '#f5b82e' AND lower(brand_deep) = '#04281d';
