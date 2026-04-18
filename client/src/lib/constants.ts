/*
 * GrantKit — Unified Catalog Constants
 * Design: Structured Clarity
 * Single unified catalog combining grants + resources
 */

export const GRANT_COUNT_DISPLAY = "640+";

// ===== Unified Catalog Item =====
export interface CatalogItem {
  id: string;
  name: string;
  organization: string;
  description: string;
  category: string;
  type: "grant" | "resource";
  country: string;
  eligibility: string;
  website: string;
  phone: string;
  email: string;
  amount: string;
  status: string;
  // Enrichment fields
  applicationProcess: string;
  deadline: string;
  fundingType: string;
  targetDiagnosis: string;
  ageRange: string;
  geographicScope: string;
  documentsRequired: string;
  b2VisaEligible: string;
  state: string;
  city: string;
  // Optional: direct coordinates for Supabase resources
  latitude?: number;
  longitude?: number;
  // Optional: slug for linking to /resources/:slug detail page
  resourceSlug?: string;
  // Optional: Supabase resource type for map marker coloring
  resourceType?: 'GRANT' | 'SOCIAL' | 'MEDICAL';
}

// ===== Categories =====
export type CategoryValue =
  | "all"
  | "medical_treatment"
  | "financial_assistance"
  | "assistive_technology"
  | "social_services"
  | "scholarships"
  | "housing"
  | "travel_transport"
  | "international"
  | "food_basic_needs"
  | "startup"
  | "educational"
  | "research"
  | "community"
  | "individual"
  | "other";

export const CATEGORIES: { value: CategoryValue; icon: string }[] = [
  { value: "all", icon: "📋" },
  { value: "medical_treatment", icon: "🏥" },
  { value: "financial_assistance", icon: "💰" },
  { value: "assistive_technology", icon: "♿" },
  { value: "social_services", icon: "🤝" },
  { value: "scholarships", icon: "🎓" },
  { value: "housing", icon: "🏠" },
  { value: "travel_transport", icon: "✈️" },
  { value: "international", icon: "🌍" },
  { value: "food_basic_needs", icon: "🍽️" },
  { value: "startup", icon: "🚀" },
  { value: "educational", icon: "📚" },
  { value: "research", icon: "🔬" },
  { value: "community", icon: "🏘️" },
  { value: "individual", icon: "👤" },
  { value: "other", icon: "📁" },
];

// ===== Countries =====
export type CountryValue = "all" | "US" | "International";

export const COUNTRIES: { value: CountryValue; flag: string }[] = [
  { value: "all", flag: "🌐" },
  { value: "US", flag: "🇺🇸" },
  { value: "International", flag: "🌍" },
];

// ===== Geographic regions (filter panel top-level) =====

export type RegionCode = "US" | "EU" | "GB" | "";

export interface RegionDef {
  code: RegionCode;
  label: string;
  flag: string;
  /** countryCode to use in the data model (same as code for US/GB; "" for EU until a member is chosen) */
  isoCode: string;
}

export const REGIONS: RegionDef[] = [
  { code: "US", label: "United States", flag: "🇺🇸", isoCode: "US" },
  { code: "EU", label: "European Union", flag: "🇪🇺", isoCode: "" },
  { code: "GB", label: "United Kingdom", flag: "🇬🇧", isoCode: "GB" },
];

/** ISO-2 codes of the 27 EU member states (as of 2024) */
export const EU_MEMBER_CODES: string[] = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
  "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
  "PL", "PT", "RO", "SK", "SI", "ES", "SE",
];

/** Center of the European Union for flyTo */
export const EU_CENTER: { lat: number; lng: number; zoom: number } = {
  lat: 51.5, lng: 10.0, zoom: 3.5,
};

// ===== Type Filter =====
export type TypeValue = "all" | "grant" | "resource";

// ===== Sort Filter =====
export type SortValue = "name_asc" | "name_desc" | "category" | "country" | "state" | "newest";

// ===== Category Styles =====
const CATEGORY_STYLES: Record<string, { bg: string; text: string; border: string; borderLeft: string }> = {
  medical_treatment: {
    bg: "bg-blue-50 dark:bg-blue-900/20",
    text: "text-blue-700 dark:text-blue-400",
    border: "border-blue-200 dark:border-blue-800",
    borderLeft: "border-l-blue-500",
  },
  financial_assistance: {
    bg: "bg-amber-50 dark:bg-amber-900/20",
    text: "text-amber-700 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-800",
    borderLeft: "border-l-amber-500",
  },
  assistive_technology: {
    bg: "bg-violet-50 dark:bg-violet-900/20",
    text: "text-violet-700 dark:text-violet-400",
    border: "border-violet-200 dark:border-violet-800",
    borderLeft: "border-l-violet-500",
  },
  social_services: {
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    text: "text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-200 dark:border-emerald-800",
    borderLeft: "border-l-emerald-500",
  },
  scholarships: {
    bg: "bg-indigo-50 dark:bg-indigo-900/20",
    text: "text-indigo-700 dark:text-indigo-400",
    border: "border-indigo-200 dark:border-indigo-800",
    borderLeft: "border-l-indigo-500",
  },
  housing: {
    bg: "bg-orange-50 dark:bg-orange-900/20",
    text: "text-orange-700 dark:text-orange-400",
    border: "border-orange-200 dark:border-orange-800",
    borderLeft: "border-l-orange-500",
  },
  travel_transport: {
    bg: "bg-cyan-50 dark:bg-cyan-900/20",
    text: "text-cyan-700 dark:text-cyan-400",
    border: "border-cyan-200 dark:border-cyan-800",
    borderLeft: "border-l-cyan-500",
  },
  international: {
    bg: "bg-teal-50 dark:bg-teal-900/20",
    text: "text-teal-700 dark:text-teal-400",
    border: "border-teal-200 dark:border-teal-800",
    borderLeft: "border-l-teal-500",
  },
  food_basic_needs: {
    bg: "bg-rose-50 dark:bg-rose-900/20",
    text: "text-rose-700 dark:text-rose-400",
    border: "border-rose-200 dark:border-rose-800",
    borderLeft: "border-l-rose-500",
  },
  startup: {
    bg: "bg-fuchsia-50 dark:bg-fuchsia-900/20",
    text: "text-fuchsia-700 dark:text-fuchsia-400",
    border: "border-fuchsia-200 dark:border-fuchsia-800",
    borderLeft: "border-l-fuchsia-500",
  },
  educational: {
    bg: "bg-sky-50 dark:bg-sky-900/20",
    text: "text-sky-700 dark:text-sky-400",
    border: "border-sky-200 dark:border-sky-800",
    borderLeft: "border-l-sky-500",
  },
  research: {
    bg: "bg-lime-50 dark:bg-lime-900/20",
    text: "text-lime-700 dark:text-lime-400",
    border: "border-lime-200 dark:border-lime-800",
    borderLeft: "border-l-lime-500",
  },
  community: {
    bg: "bg-yellow-50 dark:bg-yellow-900/20",
    text: "text-yellow-700 dark:text-yellow-400",
    border: "border-yellow-200 dark:border-yellow-800",
    borderLeft: "border-l-yellow-500",
  },
  individual: {
    bg: "bg-pink-50 dark:bg-pink-900/20",
    text: "text-pink-700 dark:text-pink-400",
    border: "border-pink-200 dark:border-pink-800",
    borderLeft: "border-l-pink-500",
  },
  other: {
    bg: "bg-gray-50 dark:bg-gray-900/20",
    text: "text-gray-700 dark:text-gray-400",
    border: "border-gray-200 dark:border-gray-800",
    borderLeft: "border-l-gray-400",
  },
};

export function getCategoryStyle(category: string): string {
  const style = CATEGORY_STYLES[category] || CATEGORY_STYLES.other;
  return `${style.bg} ${style.text} ${style.border}`;
}

export function getCategoryBorderColor(category: string): string {
  const style = CATEGORY_STYLES[category] || CATEGORY_STYLES.other;
  return style.borderLeft;
}
