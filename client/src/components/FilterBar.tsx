/*
 * FilterBar Component
 * Design: Structured Clarity — pill-shaped category tabs + country dropdown + type filter + sort
 * Sticky on scroll, clean horizontal layout with enhanced search UX
 */

import { ArrowUpDown, Search, X } from "lucide-react";
import { CATEGORIES, COUNTRIES, type CategoryValue, type CountryValue, type TypeValue } from "@/lib/constants";
import { useLanguage } from "@/contexts/LanguageContext";

export type SortValue = "name_asc" | "name_desc" | "category" | "country" | "newest";

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
  sortBy?: SortValue;
  onSortChange?: (sort: SortValue) => void;
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
  sortBy,
  onSortChange,
}: FilterBarProps) {
  const { t, tCategory, tCountry } = useLanguage();

  return (
    <div className="sticky top-16 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-200">
      <div className="container py-4">
        {/* Search bar with icon and clear button */}
        {onSearchChange && (
          <div className="mb-3">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery || ""}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={t.catalog.searchPlaceholder}
                className="w-full text-sm border border-gray-200 rounded-lg pl-9 pr-9 py-2.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] placeholder:text-gray-400 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {/* Search result summary */}
            {searchQuery && (
              <p className="mt-1.5 text-xs text-gray-500">
                {itemCount > 0
                  ? `${itemCount} result${itemCount !== 1 ? "s" : ""} for "${searchQuery}"`
                  : `No results for "${searchQuery}"`}
              </p>
            )}
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

          {/* Type filter + Country filter + Sort + count */}
          <div className="flex items-center gap-3 flex-wrap">
            {!searchQuery && (
              <span className="text-sm text-gray-500 whitespace-nowrap">
                <span className="font-semibold text-[#0f172a]">{itemCount}</span> {t.catalog.itemsCount}
              </span>
            )}

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

            {/* Sort */}
            {onSortChange && (
              <select
                value={sortBy || "name_asc"}
                onChange={(e) => onSortChange(e.target.value as SortValue)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
              >
                <option value="name_asc">A → Z</option>
                <option value="name_desc">Z → A</option>
                <option value="newest">Newest</option>
                <option value="category">Category</option>
                <option value="country">Country</option>
              </select>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
