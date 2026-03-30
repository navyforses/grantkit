/*
 * FilterBar Component
 * Design: Structured Clarity — pill-shaped category tabs + country dropdown + type filter
 * Sticky on scroll, clean horizontal layout
 */

import { CATEGORIES, COUNTRIES, type CategoryValue, type CountryValue, type TypeValue } from "@/lib/constants";
import { useLanguage } from "@/contexts/LanguageContext";

interface FilterBarProps {
  selectedCategory: CategoryValue;
  selectedCountry: CountryValue;
  selectedType: TypeValue;
  onCategoryChange: (category: CategoryValue) => void;
  onCountryChange: (country: CountryValue) => void;
  onTypeChange: (type: TypeValue) => void;
  itemCount: number;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export default function FilterBar({
  selectedCategory,
  selectedCountry,
  selectedType,
  onCategoryChange,
  onCountryChange,
  onTypeChange,
  itemCount,
  searchQuery,
  onSearchChange,
}: FilterBarProps) {
  const { t, tCategory, tCountry } = useLanguage();

  return (
    <div className="sticky top-16 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-200">
      <div className="container py-4">
        {/* Search bar */}
        {onSearchChange && (
          <div className="mb-3">
            <input
              type="text"
              value={searchQuery || ""}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t.catalog.searchPlaceholder}
              className="w-full sm:max-w-md text-sm border border-gray-200 rounded-lg px-4 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] placeholder:text-gray-400"
            />
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Category tabs */}
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => {
              const label = cat.value === "all" ? t.categories.all : tCategory(cat.value);
              return (
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
                  <span className="hidden sm:inline">{label}</span>
                </button>
              );
            })}
          </div>

          {/* Type filter + Country filter + count */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 whitespace-nowrap">
              <span className="font-semibold text-[#0f172a]">{itemCount}</span> {t.catalog.itemsCount}
            </span>

            {/* Type filter */}
            <select
              value={selectedType}
              onChange={(e) => onTypeChange(e.target.value as TypeValue)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
            >
              <option value="all">{t.catalog.typeAll}</option>
              <option value="grant">{t.catalog.typeGrant}</option>
              <option value="resource">{t.catalog.typeResource}</option>
            </select>

            {/* Country filter */}
            <select
              value={selectedCountry}
              onChange={(e) => onCountryChange(e.target.value as CountryValue)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
            >
              {COUNTRIES.map((country) => {
                const label = country.value === "all" ? t.countries.all : tCountry(country.value);
                return (
                  <option key={country.value} value={country.value}>
                    {country.flag} {label}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
