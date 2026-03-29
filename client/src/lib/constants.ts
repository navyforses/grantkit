export const GUMROAD_URL = "https://YOURUSERNAME.gumroad.com/l/grantkit";

export const CATEGORIES = [
  { value: "all", label: "All Grants", icon: "📋", color: "bg-gray-100 text-gray-700 border-gray-200" },
  { value: "medical-treatment", label: "Medical Treatment", icon: "🏥", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "rehabilitation", label: "Rehabilitation", icon: "♿", color: "bg-violet-100 text-violet-700 border-violet-200" },
  { value: "rare-disease", label: "Rare Disease", icon: "🧬", color: "bg-red-100 text-red-700 border-red-200" },
  { value: "pediatric", label: "Pediatric", icon: "👶", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "startup", label: "Startup", icon: "🚀", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
] as const;

export const COUNTRIES = [
  { value: "all", label: "All Countries", flag: "🌍" },
  { value: "US", label: "United States", flag: "🇺🇸" },
  { value: "EU", label: "European Union", flag: "🇪🇺" },
  { value: "France", label: "France", flag: "🇫🇷" },
  { value: "Germany", label: "Germany", flag: "🇩🇪" },
  { value: "UK", label: "United Kingdom", flag: "🇬🇧" },
  { value: "Georgia", label: "Georgia", flag: "🇬🇪" },
] as const;

export type CategoryValue = typeof CATEGORIES[number]["value"];
export type CountryValue = typeof COUNTRIES[number]["value"];

export interface Grant {
  id: string;
  name: string;
  organization: string;
  country: string;
  countryFlag: string;
  category: string;
  amount: string;
  eligibility: string;
  deadline: string;
  url: string;
  description: string;
  featured: boolean;
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
