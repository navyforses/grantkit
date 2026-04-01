/*
 * GrantKit — Unified Catalog Constants
 * Design: Structured Clarity
 * Single unified catalog combining grants + resources
 */


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

// ===== Type Filter =====
export type TypeValue = "all" | "grant" | "resource";

// ===== Category Styles =====
const CATEGORY_STYLES: Record<string, { bg: string; text: string; border: string; borderLeft: string }> = {
  medical_treatment: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    borderLeft: "border-l-blue-500",
  },
  financial_assistance: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    borderLeft: "border-l-amber-500",
  },
  assistive_technology: {
    bg: "bg-violet-50",
    text: "text-violet-700",
    border: "border-violet-200",
    borderLeft: "border-l-violet-500",
  },
  social_services: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    borderLeft: "border-l-emerald-500",
  },
  scholarships: {
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    border: "border-indigo-200",
    borderLeft: "border-l-indigo-500",
  },
  housing: {
    bg: "bg-orange-50",
    text: "text-orange-700",
    border: "border-orange-200",
    borderLeft: "border-l-orange-500",
  },
  travel_transport: {
    bg: "bg-cyan-50",
    text: "text-cyan-700",
    border: "border-cyan-200",
    borderLeft: "border-l-cyan-500",
  },
  international: {
    bg: "bg-teal-50",
    text: "text-teal-700",
    border: "border-teal-200",
    borderLeft: "border-l-teal-500",
  },
  food_basic_needs: {
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
    borderLeft: "border-l-rose-500",
  },
  startup: {
    bg: "bg-fuchsia-50",
    text: "text-fuchsia-700",
    border: "border-fuchsia-200",
    borderLeft: "border-l-fuchsia-500",
  },
  educational: {
    bg: "bg-sky-50",
    text: "text-sky-700",
    border: "border-sky-200",
    borderLeft: "border-l-sky-500",
  },
  research: {
    bg: "bg-lime-50",
    text: "text-lime-700",
    border: "border-lime-200",
    borderLeft: "border-l-lime-500",
  },
  community: {
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    border: "border-yellow-200",
    borderLeft: "border-l-yellow-500",
  },
  individual: {
    bg: "bg-pink-50",
    text: "text-pink-700",
    border: "border-pink-200",
    borderLeft: "border-l-pink-500",
  },
  other: {
    bg: "bg-gray-50",
    text: "text-gray-700",
    border: "border-gray-200",
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
