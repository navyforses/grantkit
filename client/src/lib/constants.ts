export const GUMROAD_URL = "https://YOURUSERNAME.gumroad.com/l/grantkit";

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
