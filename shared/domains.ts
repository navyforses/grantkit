/**
 * Integration domains — the 11-domain taxonomy from the integration pivot
 * (MASTER-PLAN v1 §1.3 / v2 §1, Ager & Strang framework).
 *
 * Phase 1 rule (Simplicity First): the taxonomy is a mapping table in code.
 * No schema change — organizations keep their legacy `categories` CSV and
 * France `mainCategory`; these functions translate both to a domain.
 * Phase 2 makes `services.domain` a first-class column.
 *
 * Shared between client (filter UI, i18n keys) and server (SQL filters).
 */

export const DOMAIN_KEYS = [
  "legal_status",
  "housing",
  "health",
  "mental_health",
  "language_education",
  "work_income",
  "money_benefits",
  "family_children",
  "community_social",
  "safety_rights",
  "daily_life",
] as const;

export type Domain = (typeof DOMAIN_KEYS)[number];

export function isDomain(value: unknown): value is Domain {
  return typeof value === "string" && (DOMAIN_KEYS as readonly string[]).includes(value);
}

// ── Legacy `categories` (client/src/lib/constants.ts CATEGORIES, 17 values) ──

/** Legacy category → domain. Source: MASTER-PLAN v1 §1.3 + 04-product-ux-data §4.3. */
export const CATEGORY_TO_DOMAIN: Readonly<Record<string, Domain>> = {
  medical_treatment: "health",
  assistive_technology: "health",
  financial_assistance: "money_benefits",
  food_basic_needs: "money_benefits",
  housing: "housing",
  social_services: "community_social",
  community: "community_social",
  scholarships: "language_education",
  educational: "language_education",
  research: "language_education",
  startup: "work_income",
  business_funding: "work_income",
  individual: "work_income",
  travel_transport: "daily_life",
};

/**
 * Category values that are deliberately NOT domains: `all` is a UI sentinel,
 * `international` becomes `country` / `isNational` (v1 §1.3), and `other`
 * needs LLM classification + review before it can be placed.
 */
export const NON_DOMAIN_CATEGORIES = ["all", "international", "other"] as const;

export function categoryToDomain(category: string | null | undefined): Domain | null {
  if (!category) return null;
  return CATEGORY_TO_DOMAIN[normalizeKey(category)] ?? null;
}

// ── France import `mainCategory` (9 distinct values, PLAN-france-orgs-import) ──

/**
 * France `mainCategory` → domain. The Excel source is not in the repo, so the
 * table covers the domain keys themselves, the legacy category keys and the
 * French / English labels the import is expected to carry. Lookup is
 * accent-insensitive and case-insensitive (see `normalizeKey`).
 * Unverified values are reported by `mainCategoryToDomain` returning null.
 */
export const MAIN_CATEGORY_TO_DOMAIN: Readonly<Record<string, Domain>> = {
  // legal_status
  legal_status: "legal_status", legal: "legal_status", juridique: "legal_status",
  droit: "legal_status", droits_demarches: "legal_status", asile: "legal_status",
  asylum: "legal_status", titre_de_sejour: "legal_status", administratif: "legal_status",
  demarches_administratives: "legal_status",
  // housing
  housing: "housing", logement: "housing", hebergement: "housing", shelter: "housing",
  // health
  health: "health", sante: "health", medical: "health", soins: "health",
  medical_treatment: "health", assistive_technology: "health", handicap: "health",
  // mental_health
  mental_health: "mental_health", sante_mentale: "mental_health", psychologique: "mental_health",
  // language_education
  language_education: "language_education", education: "language_education",
  formation: "language_education", langue: "language_education", language: "language_education",
  francais: "language_education", scholarships: "language_education",
  educational: "language_education", research: "language_education",
  // work_income
  work_income: "work_income", emploi: "work_income", employment: "work_income",
  travail: "work_income", insertion_professionnelle: "work_income",
  startup: "work_income", business_funding: "work_income", individual: "work_income",
  // money_benefits
  money_benefits: "money_benefits", financial_assistance: "money_benefits",
  aides_financieres: "money_benefits", finances: "money_benefits",
  food_basic_needs: "money_benefits", alimentation: "money_benefits", food: "money_benefits",
  besoins_de_base: "money_benefits",
  // family_children
  family_children: "family_children", famille: "family_children", family: "family_children",
  enfants: "family_children", children: "family_children", femmes: "family_children",
  // community_social
  community_social: "community_social", social: "community_social",
  social_services: "community_social", community: "community_social",
  communaute: "community_social", accompagnement_social: "community_social",
  accompagnement: "community_social", culture: "community_social",
  // safety_rights
  safety_rights: "safety_rights", securite: "safety_rights", violence: "safety_rights",
  discrimination: "safety_rights",
  // daily_life
  daily_life: "daily_life", vie_quotidienne: "daily_life", transport: "daily_life",
  travel_transport: "daily_life", mobilite: "daily_life", traduction: "daily_life",
  interpretariat: "daily_life",
};

export function mainCategoryToDomain(mainCategory: string | null | undefined): Domain | null {
  if (!mainCategory) return null;
  return MAIN_CATEGORY_TO_DOMAIN[normalizeKey(mainCategory)] ?? null;
}

// ── Onboarding `Need` (shared/profileTypes.ts) ──

export const NEED_TO_DOMAIN = {
  VISA: "legal_status",
  LEGAL: "legal_status",
  HOUSING: "housing",
  FOOD: "money_benefits",
  BANKING: "money_benefits",
  TRANSPORT: "daily_life",
  LANGUAGE: "language_education",
} as const satisfies Record<string, Domain>;

export type NeedKey = keyof typeof NEED_TO_DOMAIN;

export function needToDomain(need: string | null | undefined): Domain | null {
  if (!need) return null;
  return (NEED_TO_DOMAIN as Record<string, Domain>)[need.toUpperCase()] ?? null;
}

// ── Organization → domains ──

export interface DomainSourceOrg {
  mainCategory?: string | null;
  /** Comma-separated legacy categories column (`organizations.categories`). */
  categories?: string | null;
}

/** All domains an organization belongs to — `mainCategory` first, then
 *  every mapped `categories` token, de-duplicated, in that order. */
export function domainsForOrganization(org: DomainSourceOrg): Domain[] {
  const out: Domain[] = [];
  const push = (d: Domain | null) => { if (d && !out.includes(d)) out.push(d); };
  push(mainCategoryToDomain(org.mainCategory));
  for (const token of splitCsv(org.categories)) push(categoryToDomain(token));
  return out;
}

/** Primary domain (first of `domainsForOrganization`) or null when nothing maps. */
export function domainForOrganization(org: DomainSourceOrg): Domain | null {
  return domainsForOrganization(org)[0] ?? null;
}

/** Inverse mapping — the raw column values that place an org in `domain`.
 *  Used by the server to build `WHERE` clauses without a schema change. */
export function sourceValuesForDomain(domain: Domain): { categories: string[]; mainCategories: string[] } {
  const pick = (table: Readonly<Record<string, Domain>>) =>
    Object.keys(table).filter((k) => table[k] === domain);
  return { categories: pick(CATEGORY_TO_DOMAIN), mainCategories: pick(MAIN_CATEGORY_TO_DOMAIN) };
}

// ── No-monetization zone (MASTER-PLAN v2 §2.5, PIVOT §6 rule 4) ──

/**
 * Where a partner / paid / Pro surface may NEVER render. Export only in
 * Phase 1 — the consumer (`server/offers/placement.ts`) arrives in 2.9 and
 * must ship with its "never" tests. Sub-domain keys are `<domain>.<sub>`.
 */
export const NEVER_MONETIZE = {
  domains: ["legal_status", "mental_health", "safety_rights"],
  subdomains: [
    "health.emergency",
    "health.free_clinic",
    "health.insurance_access_asylum",
    "housing.emergency_shelter",
    "family_children.women_gbv",
  ],
  /** Org-level hard exclusions regardless of allowlist (§2.5 b). */
  organizations: {
    providerType: ["public", "nonprofit"],
    acceptsUndocumented: ["yes"],
  },
  /** Client-only statuses (D6) that switch every surface off (§2.5 c). */
  viewerStatus: ["asylum_seeker", "undocumented"],
} as const;

export function isNeverMonetizeDomain(domain: string): boolean {
  return (NEVER_MONETIZE.domains as readonly string[]).includes(domain);
}

// ── helpers ──

/** lower-case, strip accents, collapse separators to `_` — so "Santé mentale",
 *  "sante-mentale" and "SANTE_MENTALE" hit the same key. */
export function normalizeKey(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[\s\-/&']+/g, "_")
    .replace(/_+/g, "_");
}

function splitCsv(csv: string | null | undefined): string[] {
  if (!csv) return [];
  return csv.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
}
