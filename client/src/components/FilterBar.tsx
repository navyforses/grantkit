/*
 * FilterBar Component
 * Design: Structured Clarity — pill-shaped category tabs + advanced filters + sort
 * Sticky on scroll, clean horizontal layout with enhanced search UX
 */

import { ArrowUpDown, ChevronDown, ChevronUp, Filter, Search, X } from "lucide-react";
import { useState } from "react";
import { CATEGORIES, COUNTRIES, type CategoryValue, type CountryValue, type TypeValue } from "@/lib/constants";
import { useLanguage } from "@/contexts/LanguageContext";

export type SortValue = "name_asc" | "name_desc" | "category" | "country" | "newest";

// Diagnosis options for filtering
const DIAGNOSIS_OPTIONS = [
  { value: "all", label: "All Conditions" },
  { value: "Cancer", label: "Cancer" },
  { value: "Rare Disease", label: "Rare Disease" },
  { value: "Autism", label: "Autism / ASD" },
  { value: "Cerebral Palsy", label: "Cerebral Palsy" },
  { value: "Epilepsy", label: "Epilepsy" },
  { value: "Down Syndrome", label: "Down Syndrome" },
  { value: "Hearing", label: "Hearing Loss" },
  { value: "Vision", label: "Vision Impairment" },
  { value: "Diabetes", label: "Diabetes" },
  { value: "Mental Health", label: "Mental Health" },
  { value: "Spinal", label: "Spinal Cord Injury" },
  { value: "Kidney", label: "Kidney Disease" },
  { value: "Heart", label: "Heart Disease" },
  { value: "Multiple Sclerosis", label: "Multiple Sclerosis" },
  { value: "Alzheimer", label: "Alzheimer's" },
  { value: "General", label: "General / Any" },
];

// Funding type options
const FUNDING_TYPE_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "one_time", label: "One-Time" },
  { value: "recurring", label: "Recurring" },
  { value: "reimbursement", label: "Reimbursement" },
  { value: "varies", label: "Varies" },
];

// B-2 Visa options
const B2_VISA_OPTIONS = [
  { value: "all", label: "All" },
  { value: "yes", label: "B-2 Visa Eligible" },
  { value: "no", label: "US Residents Only" },
  { value: "uncertain", label: "Contact to Confirm" },
];

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
  // New enrichment filters
  fundingType?: string;
  onFundingTypeChange?: (v: string) => void;
  targetDiagnosis?: string;
  onTargetDiagnosisChange?: (v: string) => void;
  b2VisaEligible?: string;
  onB2VisaChange?: (v: string) => void;
  hasDeadline?: boolean;
  onHasDeadlineChange?: (v: boolean) => void;
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
  fundingType,
  onFundingTypeChange,
  targetDiagnosis,
  onTargetDiagnosisChange,
  b2VisaEligible,
  onB2VisaChange,
  hasDeadline,
  onHasDeadlineChange,
}: FilterBarProps) {
  const { t, tCategory, tCountry } = useLanguage();
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Count active advanced filters
  const activeAdvancedCount = [
    fundingType && fundingType !== "all",
    targetDiagnosis && targetDiagnosis !== "all",
    b2VisaEligible && b2VisaEligible !== "all",
    hasDeadline,
  ].filter(Boolean).length;

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

            {/* Advanced Filters Toggle */}
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-all ${
                activeAdvancedCount > 0
                  ? "bg-[#1e3a5f] text-white border-[#1e3a5f]"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              Filters
              {activeAdvancedCount > 0 && (
                <span className="bg-white/20 text-white text-xs px-1.5 py-0.5 rounded-full ml-0.5">
                  {activeAdvancedCount}
                </span>
              )}
              {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Advanced Filters Panel */}
        {showAdvanced && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex flex-wrap gap-3 items-center">
              {/* Diagnosis filter */}
              {onTargetDiagnosisChange && (
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Condition</label>
                  <select
                    value={targetDiagnosis || "all"}
                    onChange={(e) => onTargetDiagnosisChange(e.target.value)}
                    className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
                  >
                    {DIAGNOSIS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Funding Type filter */}
              {onFundingTypeChange && (
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Funding</label>
                  <select
                    value={fundingType || "all"}
                    onChange={(e) => onFundingTypeChange(e.target.value)}
                    className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
                  >
                    {FUNDING_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* B-2 Visa filter */}
              {onB2VisaChange && (
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">B-2 Visa</label>
                  <select
                    value={b2VisaEligible || "all"}
                    onChange={(e) => onB2VisaChange(e.target.value)}
                    className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
                  >
                    {B2_VISA_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Has Deadline toggle */}
              {onHasDeadlineChange && (
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Deadline</label>
                  <button
                    onClick={() => onHasDeadlineChange(!hasDeadline)}
                    className={`text-sm px-3 py-1.5 rounded-lg border transition-all ${
                      hasDeadline
                        ? "bg-[#1e3a5f] text-white border-[#1e3a5f]"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {hasDeadline ? "Has Deadline ✓" : "Any Deadline"}
                  </button>
                </div>
              )}

              {/* Clear all advanced filters */}
              {activeAdvancedCount > 0 && (
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-medium text-transparent">Clear</label>
                  <button
                    onClick={() => {
                      onFundingTypeChange?.("all");
                      onTargetDiagnosisChange?.("all");
                      onB2VisaChange?.("all");
                      onHasDeadlineChange?.(false);
                    }}
                    className="text-sm text-red-500 hover:text-red-700 px-3 py-1.5 rounded-lg border border-red-200 hover:border-red-300 transition-all flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    Clear Filters
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
