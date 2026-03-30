export const GUMROAD_URL = "https://YOURUSERNAME.gumroad.com/l/grantkit";

// ── Grant Categories ──
export const CATEGORIES = [
  { value: "all", label: "All Grants", icon: "📋", color: "bg-gray-100 text-gray-700 border-gray-200" },
  { value: "Medical Treatment", label: "Medical Treatment", icon: "🏥", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "Equipment & Assistive Technology", label: "Equipment & Assistive Technology", icon: "♿", color: "bg-violet-100 text-violet-700 border-violet-200" },
  { value: "Financial Assistance", label: "Financial Assistance", icon: "💰", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "Services & Support", label: "Services & Support", icon: "🤝", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { value: "Academic Scholarships", label: "Academic Scholarships", icon: "🎓", color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
] as const;

export const COUNTRIES = [
  { value: "all", label: "All Countries", flag: "🌍" },
  { value: "USA", label: "United States", flag: "🇺🇸" },
  { value: "International", label: "International", flag: "🌐" },
  { value: "Canada", label: "Canada", flag: "🇨🇦" },
] as const;

export type CategoryValue = typeof CATEGORIES[number]["value"];
export type CountryValue = typeof COUNTRIES[number]["value"];

export interface Grant {
  id: number;
  name: string;
  organization: string;
  category: string;
  country: string;
  locations: string[];
  types: string[];
  situations: string[];
  description: string;
  awardDescription: string;
  eligibility: string;
  applicationUrl: string;
  contactEmail: string;
  sourceUrl: string;
  lastUpdated: string;
  minAge: number | null;
  maxAge: number | null;
}

export const getCategoryStyle = (category: string): string => {
  const cat = CATEGORIES.find(c => c.value === category);
  return cat?.color || "bg-gray-100 text-gray-700 border-gray-200";
};

export const getCategoryLabel = (category: string): string => {
  const cat = CATEGORIES.find(c => c.value === category);
  return cat?.label || category;
};

export const getCategoryIcon = (category: string): string => {
  const cat = CATEGORIES.find(c => c.value === category);
  return cat?.icon || "📋";
};

export const getCategoryBorderColor = (category: string): string => {
  const borderMap: Record<string, string> = {
    "Medical Treatment": "border-l-blue-500",
    "Equipment & Assistive Technology": "border-l-violet-500",
    "Financial Assistance": "border-l-amber-500",
    "Services & Support": "border-l-emerald-500",
    "Academic Scholarships": "border-l-indigo-500",
  };
  return borderMap[category] || "border-l-gray-400";
};

// ── Resource Categories ──
export const RESOURCE_CATEGORIES = [
  { value: "all", label: "All Resources", icon: "📋", color: "bg-gray-100 text-gray-700 border-gray-200" },
  { value: "medical", label: "Medical", icon: "🏥", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "duke_services", label: "Duke Services", icon: "🏛️", color: "bg-purple-100 text-purple-700 border-purple-200" },
  { value: "financial", label: "Financial", icon: "💰", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "assistive_tech", label: "Assistive Technology", icon: "♿", color: "bg-violet-100 text-violet-700 border-violet-200" },
  { value: "housing", label: "Housing", icon: "🏠", color: "bg-teal-100 text-teal-700 border-teal-200" },
  { value: "scholarships", label: "Scholarships", icon: "🎓", color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  { value: "travel", label: "Travel", icon: "✈️", color: "bg-sky-100 text-sky-700 border-sky-200" },
  { value: "international", label: "International", icon: "🌐", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { value: "social_services", label: "Social Services", icon: "🤝", color: "bg-rose-100 text-rose-700 border-rose-200" },
  { value: "other", label: "Other", icon: "📁", color: "bg-gray-100 text-gray-600 border-gray-200" },
] as const;

export type ResourceCategoryValue = typeof RESOURCE_CATEGORIES[number]["value"];

export interface Resource {
  id: string;
  name: string;
  category: string;
  description: string;
  eligibility: string;
  contact: {
    website?: string;
    email?: string;
    phone?: string;
    location?: string;
  };
  source: string;
}

export const getResourceCategoryStyle = (category: string): string => {
  const cat = RESOURCE_CATEGORIES.find(c => c.value === category);
  return cat?.color || "bg-gray-100 text-gray-700 border-gray-200";
};

export const getResourceCategoryIcon = (category: string): string => {
  const cat = RESOURCE_CATEGORIES.find(c => c.value === category);
  return cat?.icon || "📁";
};

export const getResourceCategoryBorderColor = (category: string): string => {
  const borderMap: Record<string, string> = {
    medical: "border-l-blue-500",
    duke_services: "border-l-purple-500",
    financial: "border-l-amber-500",
    assistive_tech: "border-l-violet-500",
    housing: "border-l-teal-500",
    scholarships: "border-l-indigo-500",
    travel: "border-l-sky-500",
    international: "border-l-emerald-500",
    social_services: "border-l-rose-500",
    other: "border-l-gray-400",
  };
  return borderMap[category] || "border-l-gray-400";
};
