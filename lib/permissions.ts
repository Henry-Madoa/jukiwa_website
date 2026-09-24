import 'server-only';

/*
 * Permission Sets, in the Business Central style — so the people who administer an ERP
 * administer the website with the same vocabulary.
 *
 * A role's access is a list of lines, each granting rights on one Object:
 *   - a TABLE  (web_application, web_product …) with Read / Insert / Modify / Delete
 *   - a PAGE   (APPLICATIONS, PRODUCTS …) with Execute — may this screen be reached at all
 *
 * Business operations are rarely one table right. "Move an application along" modifies
 * web_application and has to be reachable from the Applications page; "change a product's rate"
 * modifies web_product from the Products page. ACTIONS below is the bridge: one named grant of
 * (owning page, table rights[]) per operation, built from what the Server Actions actually read and
 * write. A call site asks for one action — `requireAction('APPLICATIONS_UPDATE')` — and the page
 * Execute right and every table right it lists are checked together.
 *
 * The admin-configurable unit, in the Permission Set editor, remains the table and the page.
 * ACTIONS is a registry for the code, not a third kind of object for the administrator.
 */
import { all } from './db.ts';
import type { ObjectType, PermissionLine, PermissionSet, Right } from './types.ts';

export type { ObjectType, PermissionLine, PermissionSet, Right };

/** The shape every check below needs — lib/auth.ts's SessionUser satisfies it. */
export interface PermissionHolder {
  is_system: boolean;
  permissions: PermissionSet;
}

const humanize = (identifier: string): string =>
  identifier.replace(/^web_/, '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

/*
 * Tables that must never appear in the Permission Set line editor: the session store, and the
 * permission engine's own storage. Granting raw Insert/Modify on web_permission_line would be a
 * privilege-escalation hole — anyone with it could write themselves any right they liked.
 */
const EXCLUDED_TABLES = new Set([
  'web_session', 'web_permission_line', 'web_user_permission_line', 'web_user_role', 'web_counter',
]);

/**
 * The live set of tables a Permission Set line may target, read from the database itself rather
 * than a hand-kept list — so a table added to lib/schema.sql appears in the editor with no code
 * change. Only this application's own `web_` tables are offered: a database shared with the
 * lending system must not expose its tables here.
 */
export async function listPermissionTables(): Promise<{ name: string; label: string }[]> {
  const rows = await all<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = current_schema() AND table_type = 'BASE TABLE' AND table_name LIKE 'web\\_%'
     ORDER BY table_name`,
  );
  return rows.filter((r) => !EXCLUDED_TABLES.has(r.table_name)).map((r) => ({ name: r.table_name, label: humanize(r.table_name) }));
}

/* ============================================================================ pages */

export interface PageObject {
  code: string;
  label: string;
  route: string;
  icon?: string;
  /**
   * The module this screen sits inside. Execute on the parent opens the module; Execute on the
   * child opens that screen. A seeded role granted the parent gets every child with it, so a
   * Permission Set starts with the whole module and the administrator takes screens away.
   */
  parent?: string;
  /** Hidden from the sidebar — reached from inside another screen. */
  nested?: boolean;
}

/** Pages are compiled routes, not database rows, so this catalogue is maintained by hand. */
export const PAGES: PageObject[] = [
  { code: 'DASHBOARD', label: 'Dashboard', route: '/admin', icon: '◆' },

  { code: 'APPLICATIONS', label: 'Loan applications', route: '/admin/applications', icon: '📝' },
  { code: 'ENQUIRIES', label: 'Enquiries & callbacks', route: '/admin/enquiries', icon: '📞' },
  { code: 'PRODUCTS', label: 'Loan products', route: '/admin/products', icon: '💳' },

  { code: 'NEWS', label: 'Insights & news', route: '/admin/news', icon: '📰' },
  { code: 'TESTIMONIALS', label: 'Testimonials', route: '/admin/testimonials', icon: '💬' },
  { code: 'FAQS', label: 'Questions customers ask', route: '/admin/faqs', icon: '❓' },

  { code: 'TEAM', label: 'Leadership & team', route: '/admin/team', icon: '👥' },
  { code: 'BRANCHES', label: 'Branches & offices', route: '/admin/branches', icon: '📍' },
  { code: 'CAREERS', label: 'Careers', route: '/admin/careers', icon: '💼' },
  { code: 'SUBSCRIBERS', label: 'Newsletter list', route: '/admin/subscribers', icon: '✉' },

  { code: 'SETTINGS', label: 'Company profile & theme', route: '/admin/settings', icon: '⚙' },

  { code: 'SECURITY', label: 'Security', route: '/admin/security', icon: '🔐' },
  { code: 'SECURITY_USERS', label: 'Security › Users', route: '/admin/security/users', parent: 'SECURITY' },
  { code: 'SECURITY_ROLES', label: 'Security › Permission Sets', route: '/admin/security/roles', parent: 'SECURITY' },
  { code: 'SECURITY_AUDIT', label: 'Security › Audit trail', route: '/admin/security/audit', parent: 'SECURITY' },
];

export const pageByCode = (code: string): PageObject | undefined => PAGES.find((p) => p.code === code);

/** The screens inside a module — the tabs of Security. */
export const childPages = (parent: string): PageObject[] => PAGES.filter((p) => p.parent === parent);

/* ========================================================================== actions */

export interface ActionGrant {
  /** The screen the operation is reached from. */
  page: string;
  /** Every table right the operation needs, as the Server Action actually uses them. */
  tables: readonly (readonly [table: string, right: Right])[];
}

export const ACTIONS = {
  /* The lending pipeline */
  APPLICATIONS_READ: { page: 'APPLICATIONS', tables: [['web_application', 'read'], ['web_product', 'read'], ['web_branch', 'read']] },
  APPLICATIONS_UPDATE: { page: 'APPLICATIONS', tables: [['web_application', 'modify']] },
  APPLICATIONS_DELETE: { page: 'APPLICATIONS', tables: [['web_application', 'delete']] },

  ENQUIRIES_READ: { page: 'ENQUIRIES', tables: [['web_enquiry', 'read'], ['web_product', 'read'], ['web_branch', 'read']] },
  ENQUIRIES_UPDATE: { page: 'ENQUIRIES', tables: [['web_enquiry', 'modify']] },
  ENQUIRIES_DELETE: { page: 'ENQUIRIES', tables: [['web_enquiry', 'delete']] },

  /* What is offered, and on what indicative terms */
  PRODUCTS_READ: { page: 'PRODUCTS', tables: [['web_product', 'read']] },
  PRODUCTS_CREATE: { page: 'PRODUCTS', tables: [['web_product', 'insert']] },
  PRODUCTS_UPDATE: { page: 'PRODUCTS', tables: [['web_product', 'modify']] },
  PRODUCTS_DELETE: { page: 'PRODUCTS', tables: [['web_product', 'delete']] },

  /* Publishing */
  NEWS_READ: { page: 'NEWS', tables: [['web_post', 'read']] },
  NEWS_CREATE: { page: 'NEWS', tables: [['web_post', 'insert']] },
  NEWS_UPDATE: { page: 'NEWS', tables: [['web_post', 'modify']] },
  NEWS_DELETE: { page: 'NEWS', tables: [['web_post', 'delete']] },

  TESTIMONIALS_READ: { page: 'TESTIMONIALS', tables: [['web_testimonial', 'read']] },
  TESTIMONIALS_CREATE: { page: 'TESTIMONIALS', tables: [['web_testimonial', 'insert']] },
  TESTIMONIALS_UPDATE: { page: 'TESTIMONIALS', tables: [['web_testimonial', 'modify']] },
  TESTIMONIALS_DELETE: { page: 'TESTIMONIALS', tables: [['web_testimonial', 'delete']] },

  FAQS_READ: { page: 'FAQS', tables: [['web_faq', 'read']] },
  FAQS_CREATE: { page: 'FAQS', tables: [['web_faq', 'insert']] },
  FAQS_UPDATE: { page: 'FAQS', tables: [['web_faq', 'modify']] },
  FAQS_DELETE: { page: 'FAQS', tables: [['web_faq', 'delete']] },

  /* People and places */
  TEAM_READ: { page: 'TEAM', tables: [['web_team', 'read'], ['web_branch', 'read']] },
  TEAM_CREATE: { page: 'TEAM', tables: [['web_team', 'insert']] },
  TEAM_UPDATE: { page: 'TEAM', tables: [['web_team', 'modify']] },
  TEAM_DELETE: { page: 'TEAM', tables: [['web_team', 'delete']] },

  BRANCHES_READ: { page: 'BRANCHES', tables: [['web_branch', 'read']] },
  BRANCHES_CREATE: { page: 'BRANCHES', tables: [['web_branch', 'insert']] },
  BRANCHES_UPDATE: { page: 'BRANCHES', tables: [['web_branch', 'modify']] },
  BRANCHES_DELETE: { page: 'BRANCHES', tables: [['web_branch', 'delete']] },

  CAREERS_READ: { page: 'CAREERS', tables: [['web_vacancy', 'read']] },
  CAREERS_CREATE: { page: 'CAREERS', tables: [['web_vacancy', 'insert']] },
  CAREERS_UPDATE: { page: 'CAREERS', tables: [['web_vacancy', 'modify']] },
  CAREERS_DELETE: { page: 'CAREERS', tables: [['web_vacancy', 'delete']] },

  SUBSCRIBERS_READ: { page: 'SUBSCRIBERS', tables: [['web_subscriber', 'read']] },
  SUBSCRIBERS_UPDATE: { page: 'SUBSCRIBERS', tables: [['web_subscriber', 'modify']] },
  SUBSCRIBERS_DELETE: { page: 'SUBSCRIBERS', tables: [['web_subscriber', 'delete']] },

  /* The company's own record and the site's theme */
  SETTINGS_READ: { page: 'SETTINGS', tables: [['web_setting', 'read']] },
  SETTINGS_MANAGE: { page: 'SETTINGS', tables: [['web_setting', 'modify']] },

  /* Security */
  USERS_READ: { page: 'SECURITY_USERS', tables: [['web_user', 'read'], ['web_role', 'read']] },
  USERS_MANAGE: { page: 'SECURITY_USERS', tables: [['web_user', 'insert'], ['web_user', 'modify'], ['web_user', 'delete']] },
  ROLES_READ: { page: 'SECURITY_ROLES', tables: [['web_role', 'read']] },
  ROLES_MANAGE: { page: 'SECURITY_ROLES', tables: [['web_role', 'insert'], ['web_role', 'modify'], ['web_role', 'delete']] },
  AUDIT_READ: { page: 'SECURITY_AUDIT', tables: [['web_audit', 'read']] },
} as const satisfies Record<string, ActionGrant>;

export type ActionKey = keyof typeof ACTIONS;

/* =========================================================================== checks */

export function canTable(user: PermissionHolder | null | undefined, table: string, right: Right): boolean {
  if (!user) return false;
  if (user.is_system) return true;
  return !!user.permissions.tables[table]?.[right];
}

export function canPage(user: PermissionHolder | null | undefined, page: string): boolean {
  if (!user) return false;
  if (user.is_system) return true;
  return !!user.permissions.pages[page];
}

/**
 * The check a Server Action and a page both make. Both halves matter: a Permission Set that
 * grants Modify on web_application but not Execute on the Applications page has given nobody
 * anything, and a set that grants the page without the table right opens a screen that cannot save.
 */
export function canAction(user: PermissionHolder | null | undefined, key: ActionKey): boolean {
  if (!user) return false;
  if (user.is_system) return true;
  const grant: ActionGrant = ACTIONS[key];
  return canPage(user, grant.page) && grant.tables.every(([table, right]) => canTable(user, table, right));
}

/**
 * The "can open and actually read this screen" action for a page — its `*_READ` action, where one
 * exists. Screens with only a `*_MANAGE` action need page Execute alone.
 */
const PAGE_READ_ACTION: Partial<Record<string, ActionKey>> = (() => {
  const map: Partial<Record<string, ActionKey>> = {};
  const keys = Object.keys(ACTIONS) as ActionKey[];
  for (const { code } of PAGES) {
    const read = keys.find((k) => (ACTIONS[k] as ActionGrant).page === code && /_READ$/.test(k));
    if (read) map[code] = read;
  }
  return map;
})();

/**
 * Whether a sidebar entry should appear. Stricter than a bare `canPage`: where a screen has a
 * read action, the user must satisfy that too — so a Permission Set granting page Execute but not
 * the underlying table Read no longer surfaces a module the user cannot use.
 */
export function canNav(user: PermissionHolder | null | undefined, pages: string | string[]): boolean {
  if (!user) return false;
  if (user.is_system) return true;
  const codes = Array.isArray(pages) ? pages : [pages];
  return codes.some((code) => {
    if (!canPage(user, code)) return false;
    const read = PAGE_READ_ACTION[code];
    return read ? canAction(user, read) : true;
  });
}

/** Every top-level sidebar entry this user may see, in catalogue order. */
export const visiblePages = (user: PermissionHolder | null | undefined): PageObject[] =>
  PAGES.filter((p) => !p.parent && !p.nested && canNav(user, p.code));

/* ===================================================================== line building */

/**
 * Resolves a list of ACTIONS keys into the deduplicated lines an administrator clicking through
 * the Permission Set editor would have produced by hand. Used by the seed, and by the "grant
 * everything this role needs" button in the editor.
 */
export function expandActionsToLines(actionKeys: readonly ActionKey[]): PermissionLine[] {
  const pages = new Set<string>();
  const tables = new Map<string, Record<Right, boolean>>();

  for (const key of actionKeys) {
    const grant: ActionGrant = ACTIONS[key];
    pages.add(grant.page);
    // A module's screens come with the module, so a seeded role opens every tab of it.
    for (const child of childPages(grant.page)) pages.add(child.code);
    // …and a child screen needs its parent module to be reachable at all.
    const parent = pageByCode(grant.page)?.parent;
    if (parent) pages.add(parent);
    for (const [table, right] of grant.tables) {
      const row = tables.get(table) ?? { read: false, insert: false, modify: false, delete: false };
      row[right] = true;
      // Anything you may change, you may look at.
      row.read = true;
      tables.set(table, row);
    }
  }

  return [
    ...[...pages].map((page): PermissionLine => ({
      object_type: 'PAGE', object_name: page,
      read_perm: false, insert_perm: false, modify_perm: false, delete_perm: false, execute_perm: true,
    })),
    ...[...tables.entries()].map(([table, rights]): PermissionLine => ({
      object_type: 'TABLE', object_name: table,
      read_perm: rights.read, insert_perm: rights.insert, modify_perm: rights.modify, delete_perm: rights.delete,
      execute_perm: false,
    })),
  ];
}

/** Folds a set of stored lines into the lookup the checks above use. */
export function linesToPermissions(lines: PermissionLine[]): PermissionSet {
  const permissions: PermissionSet = { tables: {}, pages: {} };
  for (const line of lines) {
    if (line.object_type === 'PAGE') {
      if (line.execute_perm) permissions.pages[line.object_name] = true;
      continue;
    }
    const table = permissions.tables[line.object_name] ?? {};
    if (line.read_perm) table.read = true;
    if (line.insert_perm) table.insert = true;
    if (line.modify_perm) table.modify = true;
    if (line.delete_perm) table.delete = true;
    permissions.tables[line.object_name] = table;
  }
  return permissions;
}

/* ================================================================== the standard sets */

const READ_EVERYTHING: readonly ActionKey[] = [
  'APPLICATIONS_READ', 'ENQUIRIES_READ', 'PRODUCTS_READ', 'NEWS_READ', 'TESTIMONIALS_READ', 'FAQS_READ',
  'TEAM_READ', 'BRANCHES_READ', 'CAREERS_READ', 'SUBSCRIBERS_READ', 'SETTINGS_READ',
];

/**
 * The Permission Sets the seed creates, named after the jobs in a credit company. They are
 * ordinary rows: an administrator can edit any of them line by line, or build their own from
 * scratch. `SYSTEM` has no lines — full access comes from the flag.
 */
export const STANDARD_ROLES: { name: string; description: string; isSystem?: boolean; actions?: readonly ActionKey[] }[] = [
  {
    name: 'System Administrator',
    description: 'Unrestricted access, including users, Permission Sets and the audit trail.',
    isSystem: true,
  },
  {
    name: 'Credit Manager',
    description: 'Owns the lending pipeline end to end, and sets the indicative rates, limits and terms of every product.',
    actions: [
      'APPLICATIONS_READ', 'APPLICATIONS_UPDATE', 'APPLICATIONS_DELETE',
      'ENQUIRIES_READ', 'ENQUIRIES_UPDATE', 'ENQUIRIES_DELETE',
      'PRODUCTS_READ', 'PRODUCTS_CREATE', 'PRODUCTS_UPDATE', 'PRODUCTS_DELETE',
      'BRANCHES_READ', 'FAQS_READ', 'FAQS_CREATE', 'FAQS_UPDATE',
      'SETTINGS_READ',
    ],
  },
  {
    name: 'Credit Officer',
    description: 'Works the applications and callbacks the website brings in. Sees the products but cannot change their terms.',
    actions: [
      'APPLICATIONS_READ', 'APPLICATIONS_UPDATE',
      'ENQUIRIES_READ', 'ENQUIRIES_UPDATE',
      'PRODUCTS_READ', 'BRANCHES_READ', 'FAQS_READ', 'SETTINGS_READ',
    ],
  },
  {
    name: 'Customer Care',
    description: 'Answers questions and callback requests, and keeps the public answers current. Sees applications, cannot move them.',
    actions: [
      'ENQUIRIES_READ', 'ENQUIRIES_UPDATE',
      'APPLICATIONS_READ',
      'FAQS_READ', 'FAQS_CREATE', 'FAQS_UPDATE', 'FAQS_DELETE',
      'PRODUCTS_READ', 'BRANCHES_READ', 'SUBSCRIBERS_READ', 'SETTINGS_READ',
    ],
  },
  {
    name: 'Marketing & Communications',
    description: 'The company’s voice: insights, testimonials, the team, branches, careers and the newsletter list. Cannot see applications.',
    actions: [
      'NEWS_READ', 'NEWS_CREATE', 'NEWS_UPDATE', 'NEWS_DELETE',
      'TESTIMONIALS_READ', 'TESTIMONIALS_CREATE', 'TESTIMONIALS_UPDATE', 'TESTIMONIALS_DELETE',
      'FAQS_READ', 'FAQS_CREATE', 'FAQS_UPDATE',
      'TEAM_READ', 'TEAM_CREATE', 'TEAM_UPDATE', 'TEAM_DELETE',
      'BRANCHES_READ', 'BRANCHES_CREATE', 'BRANCHES_UPDATE',
      'CAREERS_READ', 'CAREERS_CREATE', 'CAREERS_UPDATE', 'CAREERS_DELETE',
      'SUBSCRIBERS_READ', 'SUBSCRIBERS_UPDATE', 'SUBSCRIBERS_DELETE',
      'PRODUCTS_READ', 'SETTINGS_READ',
    ],
  },
  {
    name: 'Auditor (Read Only)',
    description: 'Sees every screen and the audit trail, and changes nothing. For a director, an internal auditor or the compliance officer.',
    actions: [...READ_EVERYTHING, 'AUDIT_READ'],
  },
];
