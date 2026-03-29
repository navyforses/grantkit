/*
 * FilterBar Component
 * Design: Structured Clarity — pill-shaped category tabs + country dropdown
 * Sticky on scroll, clean horizontal layout
 */

import { CATEGORIES, COUNTRIES, type CategoryValue, type CountryValue } from "@/lib/constants";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Translations } from "@/i18n/types";

const categoryTranslationKeys: Record<string, keyof Translations["categories"]> = {
  all: "all",
  "medical-treatment": "medicalTreatment",
  rehabilitation: "rehabilitation",
  "rare-disease": "rareDisease",
  pediatric: "pediatric",
  startup: "startup",
};

const countryTranslationKeys: Record<string, keyof Translations["countries"]> = {
  all: "all",
  US: "us",
  EU: "eu",
  France: "france",
  Germany: "germany",
  UK: "uk",
  Georgia: "georgia",
};

interface FilterBarProps {
  selectedCategory: CategoryValue;
  selectedCountry: CountryValue;
  onCategoryChange: (category: CategoryValue) => void;
  onCountryChange: (country: CountryValue) => void;
  grantCount: number;
}

export default function FilterBar({
  selectedCategory,
  selectedCountry,
  onCategoryChange,
  onCountryChange,
  grantCount,
}: FilterBarProps) {
  const { t } = useLanguage();

  return (
    <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-200">
      <div className="container py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Category tabs */}
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => onCategoryChange(cat.value)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border ${
                  selectedCategory === cat.value
                    ? "bg-[#1e3a5f] text-white border-[#1e3a5f] shadow-sm"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <span className="text-sm">{cat.icon}</span>
                <span className="hidden sm:inline">
                  {t.categories[categoryTranslationKeys[cat.value]] || cat.label}
                </span>
              </button>
            ))}
          </div>

          {/* Country filter + count */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 whitespace-nowrap">
              <span className="font-semibold text-[#0f172a]">{grantCount}</span> {t.grants.grantsCount}
            </span>
            <select
              value={selectedCountry}
              onChange={(e) => onCountryChange(e.target.value as CountryValue)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
            >
              {COUNTRIES.map((country) => (
                <option key={country.value} value={country.value}>
                  {country.flag} {t.countries[countryTranslationKeys[country.value]] || country.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
