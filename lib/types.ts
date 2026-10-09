/*
 * The shapes the website deals in. Rows come out of PostgreSQL exactly as the columns are named
 * (snake_case), because a row that is renamed on the way through is a row you then have to trace
 * back through two vocabularies whenever something looks wrong.
 */

/** "2026-09-22" */
export type IsoDate = string;
/** "2026-09-22T17:04:00.000Z" */
export type IsoDateTime = string;
/** Money in minor units. 150_000 is KES 1,500.00. */
export type Cents = number;
/** Rates in basis points. 250 is 2.5%. */
export type BasisPoints = number;

/* ------------------------------------------------- permission sets and accounts */

/** An object a Permission Set line may grant rights on. */
export type ObjectType = 'TABLE' | 'PAGE';
export type Right = 'read' | 'insert' | 'modify' | 'delete';

/** One stored line: rights on one table, or Execute on one page. */
export interface PermissionLine {
  object_type: ObjectType;
  object_name: string;
  read_perm: boolean;
  insert_perm: boolean;
  modify_perm: boolean;
  delete_perm: boolean;
  execute_perm: boolean;
}

/** Lines folded into the lookup every check uses. See lib/permissions.ts. */
export interface PermissionSet {
  tables: Record<string, { read?: boolean; insert?: boolean; modify?: boolean; delete?: boolean }>;
  pages: Record<string, boolean>;
}

export const EMPTY_PERMISSIONS: PermissionSet = { tables: {}, pages: {} };

/** A Permission Set: a named role whose access is its lines. */
export interface Role {
  id: number;
  name: string;
  description: string | null;
  is_system: boolean;
  created_at: IsoDateTime;
  created_by: string | null;
}

export interface RoleView extends Role {
  user_count: number;
  line_count: number;
}

export type UserStatus = 'ACTIVE' | 'DISABLED';

/** An account as the admin lists it. */
export interface User {
  id: number;
  name: string;
  email: string;
  role_id: number | null;
  role_name: string | null;
  /** Comes from the role: an unrestricted account, with no lines at all. */
  is_system: boolean;
  status: UserStatus;
  title: string | null;
  avatar_url: string | null;
  must_change_password: boolean;
  last_login_at: IsoDateTime | null;
  created_at: IsoDateTime;
  created_by: string | null;
}

/** The signed-in user, with their rights already resolved. */
export interface SessionUser extends User {
  permissions: PermissionSet;
  /** Every Permission Set they hold — the primary role plus any extras. */
  roles: { id: number; name: string; is_system: boolean }[];
}

/* -------------------------------------------------------------------- the company */

export interface Settings {
  id: number;
  name: string;
  short_name: string | null;
  tagline: string | null;
  about_intro: string | null;
  about_story: string | null;
  mission: string | null;
  vision: string | null;
  founded_year: string | null;
  registration_no: string | null;
  licence_no: string | null;
  licence_note: string | null;
  physical_address: string | null;
  postal_address: string | null;
  city: string | null;
  country: string | null;
  map_embed_url: string | null;
  phone_primary: string | null;
  phone_secondary: string | null;
  email: string | null;
  loans_email: string | null;
  office_hours: string | null;
  paybill_no: string | null;
  paybill_note: string | null;
  bank_details: string | null;
  currency_symbol: string;
  logo_url: string | null;
  hero_kicker: string | null;
  hero_headline: string | null;
  hero_body: string | null;
  brand_primary: string;
  brand_accent: string;
  brand_deep: string;
  portal_url: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  x_url: string | null;
  youtube_url: string | null;
  tiktok_url: string | null;
  linkedin_url: string | null;
  whatsapp_number: string | null;
  diaspora_phone: string | null;
  diaspora_email: string | null;
  stat_years: string | null;
  stat_clients: string | null;
  stat_counties: string | null;
  stat_turnaround: string | null;
  indemnity_cover: string | null;
  updated_at: IsoDateTime | null;
}

/* ----------------------------------------------------------------- loan products */

/**
 * How a product's repayments are worked out.
 *   REDUCING      interest on the balance still owed — the fair default for longer terms
 *   FLAT          interest on the original amount for the whole term — short advances
 *   RENT_ADVANCE  a multiple of the monthly rent Jukiwa collects, recovered out of that rent
 */
export type CalcMode = 'REDUCING' | 'FLAT' | 'RENT_ADVANCE';
export const CALC_MODES: { value: CalcMode; label: string; hint: string }[] = [
  { value: 'REDUCING', label: 'Reducing balance', hint: 'Interest charged on what is still owed' },
  { value: 'FLAT', label: 'Flat rate', hint: 'Interest on the original amount for the whole term' },
  { value: 'RENT_ADVANCE', label: 'Rent advance', hint: 'A multiple of monthly rent, recovered from the rent collected' },
];

export type Audience = 'LANDLORD' | 'DIASPORA' | 'BUYER' | 'DEVELOPER' | 'BUSINESS' | 'SELLER';
export const AUDIENCES: { value: Audience; label: string }[] = [
  { value: 'LANDLORD', label: 'Landlords' },
  { value: 'DIASPORA', label: 'Kenyans abroad' },
  { value: 'BUYER', label: 'Property buyers' },
  { value: 'DEVELOPER', label: 'Developers' },
  { value: 'SELLER', label: 'Property sellers' },
  { value: 'BUSINESS', label: 'Businesses' },
];

export interface Product {
  id: number;
  name: string;
  slug: string;
  tagline: string | null;
  summary: string | null;
  body: string | null;
  icon: string | null;
  image_url: string | null;
  audience: Audience;
  calc_mode: CalcMode;
  /** Indicative monthly rate. 150 is 1.5% a month. */
  rate_pm_bp: BasisPoints;
  /** One-off fee as a share of the amount. 300 is 3%. */
  fee_bp: BasisPoints;
  min_amount_cents: Cents;
  max_amount_cents: Cents;
  min_term_months: number;
  max_term_months: number;
  /** RENT_ADVANCE only: the most the advance may be, as a multiple of monthly rent. */
  rent_multiple_max: number;
  features: string | null;
  requirements: string | null;
  is_featured: boolean;
  is_published: boolean;
  sort: number;
  created_at: IsoDateTime;
  updated_at: IsoDateTime | null;
}

/** The fields the calculator needs — what a Server Component hands a client one. */
export type ProductTerms = Pick<Product,
  'id' | 'name' | 'slug' | 'calc_mode' | 'rate_pm_bp' | 'fee_bp' | 'min_amount_cents' | 'max_amount_cents'
  | 'min_term_months' | 'max_term_months' | 'rent_multiple_max' | 'icon' | 'tagline'>;

/* ------------------------------------------------------------------- applications */

export type ApplicantType = 'INDIVIDUAL' | 'COMPANY' | 'DIASPORA';
export const APPLICANT_TYPES: { value: ApplicantType; label: string }[] = [
  { value: 'INDIVIDUAL', label: 'An individual in Kenya' },
  { value: 'DIASPORA', label: 'A Kenyan living abroad' },
  { value: 'COMPANY', label: 'A company or partnership' },
];

export type Collateral = 'RENTAL_PROPERTY' | 'TITLE_DEED' | 'PROPERTY_UNDER_CONSTRUCTION' | 'PROPERTY_FOR_SALE' | 'LOGBOOK' | 'OTHER' | 'NONE';
export const COLLATERALS: { value: Collateral; label: string }[] = [
  { value: 'RENTAL_PROPERTY', label: 'A rental property (Jukiwa-managed or to be)' },
  { value: 'TITLE_DEED', label: 'A title deed — land or a building' },
  { value: 'PROPERTY_UNDER_CONSTRUCTION', label: 'A building under construction' },
  { value: 'PROPERTY_FOR_SALE', label: 'A property I am selling' },
  { value: 'LOGBOOK', label: 'A vehicle logbook' },
  { value: 'OTHER', label: 'Something else' },
  { value: 'NONE', label: 'Not sure yet' },
];

export type ContactPreference = 'CALL' | 'WHATSAPP' | 'EMAIL';

/**
 * RECEIVED → REVIEWING → DOCUMENTS → APPRAISAL → APPROVED → DISBURSED, or DECLINED / WITHDRAWN.
 * The website holds the lead; the lending system holds the loan. DISBURSED here is the moment the
 * lead has done its job and becomes somebody else's record.
 */
export type ApplicationStatus = 'RECEIVED' | 'REVIEWING' | 'DOCUMENTS' | 'APPRAISAL' | 'APPROVED' | 'DISBURSED' | 'DECLINED' | 'WITHDRAWN';
export const APPLICATION_STATUSES: { value: ApplicationStatus; label: string; tone: string }[] = [
  { value: 'RECEIVED', label: 'Received', tone: 'badge-bad' },
  { value: 'REVIEWING', label: 'Reviewing', tone: 'badge-info' },
  { value: 'DOCUMENTS', label: 'Awaiting documents', tone: 'badge-warn' },
  { value: 'APPRAISAL', label: 'Site visit & appraisal', tone: 'badge-info' },
  { value: 'APPROVED', label: 'Approved', tone: 'badge-ok' },
  { value: 'DISBURSED', label: 'Disbursed', tone: 'badge-brand' },
  { value: 'DECLINED', label: 'Declined', tone: '' },
  { value: 'WITHDRAWN', label: 'Withdrawn', tone: '' },
];
export const OPEN_APPLICATION_STATUSES: ApplicationStatus[] = ['RECEIVED', 'REVIEWING', 'DOCUMENTS', 'APPRAISAL', 'APPROVED'];

export interface Application {
  id: number;
  no: string;
  product_id: number | null;
  amount_cents: Cents;
  term_months: number;
  monthly_income_cents: Cents | null;
  est_repayment_cents: Cents | null;
  purpose: string | null;
  applicant_type: ApplicantType;
  first_name: string;
  last_name: string;
  company_name: string | null;
  phone: string;
  email: string | null;
  county: string | null;
  country: string | null;
  collateral: Collateral;
  collateral_detail: string | null;
  property_location: string | null;
  branch_id: number | null;
  contact_preference: ContactPreference;
  consent_contact: boolean;
  status: ApplicationStatus;
  notes: string | null;
  source_page: string | null;
  created_at: IsoDateTime;
  handled_by: string | null;
  handled_at: IsoDateTime | null;
}

export interface ApplicationView extends Application {
  product_name: string | null;
  branch_name: string | null;
  age_days: number;
}

/* ---------------------------------------------------------------------- enquiries */

export type EnquiryKind = 'ENQUIRY' | 'CALLBACK' | 'PARTNER';
export const ENQUIRY_KINDS: { value: EnquiryKind; label: string }[] = [
  { value: 'ENQUIRY', label: 'Question' },
  { value: 'CALLBACK', label: 'Callback request' },
  { value: 'PARTNER', label: 'Agent / partner' },
];

export type EnquiryStatus = 'NEW' | 'CONTACTED' | 'CONVERTED' | 'CLOSED';
export const ENQUIRY_STATUSES: { value: EnquiryStatus; label: string; tone: string }[] = [
  { value: 'NEW', label: 'New', tone: 'badge-bad' },
  { value: 'CONTACTED', label: 'Contacted', tone: 'badge-info' },
  { value: 'CONVERTED', label: 'Became an application', tone: 'badge-ok' },
  { value: 'CLOSED', label: 'Closed', tone: '' },
];
export const OPEN_ENQUIRY_STATUSES: EnquiryStatus[] = ['NEW', 'CONTACTED'];

export interface Enquiry {
  id: number;
  kind: EnquiryKind;
  name: string;
  phone: string;
  email: string | null;
  product_id: number | null;
  branch_id: number | null;
  location: string | null;
  message: string | null;
  preferred_time: string | null;
  status: EnquiryStatus;
  notes: string | null;
  source_page: string | null;
  created_at: IsoDateTime;
  handled_by: string | null;
  handled_at: IsoDateTime | null;
}

export interface EnquiryView extends Enquiry {
  product_name: string | null;
  branch_name: string | null;
  age_days: number;
}

/* ------------------------------------------------------------------ publishing */

export type PostCategory = 'ANNOUNCEMENT' | 'GUIDE' | 'INSIGHT' | 'NEWS';
export const POST_CATEGORIES: { value: PostCategory; label: string }[] = [
  { value: 'ANNOUNCEMENT', label: 'Announcement' },
  { value: 'GUIDE', label: 'Borrower guide' },
  { value: 'INSIGHT', label: 'Market insight' },
  { value: 'NEWS', label: 'Company news' },
];

export interface Post {
  id: number;
  title: string;
  slug: string;
  category: PostCategory;
  excerpt: string | null;
  body: string;
  image_url: string | null;
  is_published: boolean;
  is_pinned: boolean;
  published_at: IsoDateTime;
  views: number;
  author: string | null;
  created_at: IsoDateTime;
  updated_at: IsoDateTime | null;
}

export interface Testimonial {
  id: number;
  name: string;
  role_title: string | null;
  quote: string;
  photo_url: string | null;
  rating: number;
  sort: number;
  is_published: boolean;
  created_at: IsoDateTime;
}

/** One picture in the hero background library. */
export interface HeroImage {
  id: number;
  image_url: string;
  label: string | null;
  is_active: boolean;
  sort: number;
  created_at: IsoDateTime;
  created_by: string | null;
}

export type FaqCategory ='GENERAL' | 'LOANS' | 'RENT_ADVANCE' | 'REPAYMENT' | 'DIASPORA';
export const FAQ_CATEGORIES: { value: FaqCategory; label: string }[] = [
  { value: 'GENERAL', label: 'About Jukiwa Credit' },
  { value: 'LOANS', label: 'Loans & eligibility' },
  { value: 'RENT_ADVANCE', label: 'Rent & building advances' },
  { value: 'REPAYMENT', label: 'Repayment' },
  { value: 'DIASPORA', label: 'Kenyans abroad' },
];

export interface Faq {
  id: number;
  question: string;
  answer: string;
  category: FaqCategory;
  sort: number;
  is_published: boolean;
}

export type TeamCategory = 'BOARD' | 'LEADERSHIP' | 'MANAGEMENT' | 'BRANCH';
export const TEAM_CATEGORIES: { value: TeamCategory; label: string }[] = [
  { value: 'BOARD', label: 'Board of directors' },
  { value: 'LEADERSHIP', label: 'Leadership' },
  { value: 'MANAGEMENT', label: 'Management' },
  { value: 'BRANCH', label: 'Branch teams' },
];

export interface TeamMember {
  id: number;
  name: string;
  role_title: string;
  category: TeamCategory;
  bio: string | null;
  photo_url: string | null;
  email: string | null;
  linkedin_url: string | null;
  branch_id: number | null;
  sort: number;
  is_published: boolean;
}

export type BranchKind = 'HQ' | 'BRANCH' | 'SATELLITE' | 'REGIONAL';
export const BRANCH_KINDS: { value: BranchKind; label: string }[] = [
  { value: 'HQ', label: 'Headquarters' },
  { value: 'BRANCH', label: 'Branch' },
  { value: 'SATELLITE', label: 'Satellite office' },
  { value: 'REGIONAL', label: 'Diaspora regional office' },
];

export interface Branch {
  id: number;
  name: string;
  slug: string;
  kind: BranchKind;
  town: string | null;
  county: string | null;
  country: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  hours: string | null;
  map_url: string | null;
  manager: string | null;
  note: string | null;
  sort: number;
  is_published: boolean;
}

export interface Vacancy {
  id: number;
  title: string;
  slug: string;
  department: string | null;
  location: string | null;
  employment_type: string | null;
  summary: string | null;
  body: string;
  closes_on: IsoDate | null;
  is_published: boolean;
  created_at: IsoDateTime;
  updated_at: IsoDateTime | null;
}

export interface Subscriber {
  id: number;
  email: string;
  name: string | null;
  status: 'ACTIVE' | 'UNSUBSCRIBED';
  source_page: string | null;
  created_at: IsoDateTime;
}

export interface AuditEntry {
  id: number;
  actor_id: number | null;
  actor_name: string;
  action: string;
  entity: string;
  entity_id: string | null;
  detail: Record<string, unknown>;
  created_at: IsoDateTime;
}

/** What a Server Action hands back to a form. Never a thrown error across the wire. */
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/** The loose `Object.fromEntries(formData)` bag a client form posts. */
export type FormValues = Record<string, FormDataEntryValue | undefined>;

/** The 47 counties, for the application form and the branch list. */
export const COUNTIES = [
  'Baringo', 'Bomet', 'Bungoma', 'Busia', 'Elgeyo Marakwet', 'Embu', 'Garissa', 'Homa Bay', 'Isiolo', 'Kajiado',
  'Kakamega', 'Kericho', 'Kiambu', 'Kilifi', 'Kirinyaga', 'Kisii', 'Kisumu', 'Kitui', 'Kwale', 'Laikipia', 'Lamu',
  'Machakos', 'Makueni', 'Mandera', 'Marsabit', 'Meru', 'Migori', 'Mombasa', "Murang'a", 'Nairobi', 'Nakuru',
  'Nandi', 'Narok', 'Nyamira', 'Nyandarua', 'Nyeri', 'Samburu', 'Siaya', 'Taita Taveta', 'Tana River',
  'Tharaka Nithi', 'Trans Nzoia', 'Turkana', 'Uasin Gishu', 'Vihiga', 'Wajir', 'West Pokot',
] as const;
