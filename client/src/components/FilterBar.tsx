/*
 * FilterBar Component
 * Mobile: compact inline chips + expandable bottom sheet for advanced filters
 * Desktop: sticky horizontal bar with category pills + advanced panel
 */

import { ArrowUpDown, ChevronDown, ChevronUp, Filter, Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useState } from "react";
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
  const [showMobileSheet, setShowMobileSheet] = useState(false);

  // Count active advanced filters
  const activeAdvancedCount = [
    fundingType && fundingType !== "all",
    targetDiagnosis && targetDiagnosis !== "all",
    b2VisaEligible && b2VisaEligible !== "all",
    hasDeadline,
  ].filter(Boolean).length;

  // Count total active filters (including basic)
  const totalActiveFilters = activeAdvancedCount +
    (selectedCategory !== "all" ? 1 : 0) +
    (selectedCountry !== "all" ? 1 : 0) +
    (selectedType !== "all" ? 1 : 0);

  // Lock body scroll when mobile sheet is open
  useEffect(() => {
    if (showMobileSheet) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [showMobileSheet]);

  const clearAllFilters = () => {
    onCategoryChange("all");
    onCountryChange("all");
    onTypeChange("all");
    onFundingTypeChange?.("all");
    onTargetDiagnosisChange?.("all");
    onB2VisaChange?.("all");
    onHasDeadlineChange?.(false);
  };

  return (
    <>
      {/* ===== MOBILE FILTER BAR ===== */}
      <div className="md:hidden sticky top-14 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="px-4 py-3">
          {/* Search bar — full width on mobile */}
          {onSearchChange && (
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery || ""}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={t.catalog.searchPlaceholder}
                className="w-full text-sm border border-gray-200 rounded-xl pl-9 pr-9 py-2.5 bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] placeholder:text-gray-400"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 active:text-gray-600"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* Horizontal scrollable category chips */}
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {CATEGORIES.map((cat) => {
              const label = cat.value === "all" ? t.categories.all : tCategory(cat.value);
              return (
                <button
                  key={cat.value}
                  onClick={() => onCategoryChange(cat.value)}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border flex-shrink-0 ${
                    selectedCategory === cat.value
                      ? "bg-[#1e3a5f] text-white border-[#1e3a5f]"
                      : "bg-white text-gray-600 border-gray-200 active:bg-gray-50"
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          {/* Filter + Sort row */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              {/* Filter button — opens bottom sheet */}
              <button
                onClick={() => setShowMobileSheet(true)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-all ${
                  totalActiveFilters > 0
                    ? "bg-[#1e3a5f] text-white border-[#1e3a5f]"
                    : "bg-white text-gray-600 border-gray-200 active:bg-gray-50"
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Filters
                {totalActiveFilters > 0 && (
                  <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                    {totalActiveFilters}
                  </span>
                )}
              </button>

              {/* Sort dropdown — compact */}
              {onSortChange && (
                <select
                  value={sortBy || "name_asc"}
                  onChange={(e) => onSortChange(e.target.value as SortValue)}
                  className="text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white text-gray-700 focus:outline-none"
                >
                  <option value="name_asc">A → Z</option>
                  <option value="name_desc">Z → A</option>
                  <option value="newest">Newest</option>
                  <option value="category">Category</option>
                  <option value="country">Country</option>
                </select>
              )}
            </div>

            {/* Result count */}
            <span className="text-xs text-gray-500">
              <span className="font-semibold text-[#0f172a]">{itemCount}</span> {t.catalog.itemsCount}
            </span>
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
      </div>

      {/* ===== MOBILE FILTER BOTTOM SHEET ===== */}
      {showMobileSheet && (
        <div className="md:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowMobileSheet(false)}
          />
          {/* Sheet */}
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[85vh] overflow-y-auto animate-slide-up safe-area-bottom">
            {/* Handle */}
            <div className="sticky top-0 bg-white pt-3 pb-2 px-5 border-b border-gray-100 rounded-t-2xl z-10">
              <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-3" />
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-[#0f172a]">Filters</h3>
                <div className="flex items-center gap-3">
                  {totalActiveFilters > 0 && (
                    <button
                      onClick={clearAllFilters}
                      className="text-xs text-red-500 font-medium"
                    >
                      Clear All
                    </button>
                  )}
                  <button
                    onClick={() => setShowMobileSheet(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 active:bg-gray-200"
                  >
                    <X className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>
            </div>

            <div className="px-5 py-4 space-y-5 pb-8">
              {/* Type */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Type</label>
                <div className="flex gap-2">
                  {[
                    { value: "all", label: t.catalog.typeAll },
                    { value: "grant", label: t.catalog.typeGrant },
                    { value: "resource", label: t.catalog.typeResource },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => onTypeChange(opt.value as TypeValue)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                        selectedType === opt.value
                          ? "bg-[#1e3a5f] text-white border-[#1e3a5f]"
                          : "bg-gray-50 text-gray-600 border-gray-200 active:bg-gray-100"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Country */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Country</label>
                <select
                  value={selectedCountry}
                  onChange={(e) => onCountryChange(e.target.value as CountryValue)}
                  className="w-full text-sm border border-gray-200 rounded-xl px-4 py-3 bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20"
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

              {/* Condition / Diagnosis */}
              {onTargetDiagnosisChange && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Condition</label>
                  <select
                    value={targetDiagnosis || "all"}
                    onChange={(e) => onTargetDiagnosisChange(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-xl px-4 py-3 bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20"
                  >
                    {DIAGNOSIS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Funding Type */}
              {onFundingTypeChange && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Funding Type</label>
                  <div className="flex flex-wrap gap-2">
                    {FUNDING_TYPE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => onFundingTypeChange(opt.value)}
                        className={`px-3.5 py-2 rounded-xl text-sm font-medium border transition-all ${
                          fundingType === opt.value
                            ? "bg-[#1e3a5f] text-white border-[#1e3a5f]"
                            : "bg-gray-50 text-gray-600 border-gray-200 active:bg-gray-100"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* B-2 Visa */}
              {onB2VisaChange && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">B-2 Visa</label>
                  <div className="flex flex-wrap gap-2">
                    {B2_VISA_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => onB2VisaChange(opt.value)}
                        className={`px-3.5 py-2 rounded-xl text-sm font-medium border transition-all ${
                          b2VisaEligible === opt.value
                            ? "bg-[#1e3a5f] text-white border-[#1e3a5f]"
                            : "bg-gray-50 text-gray-600 border-gray-200 active:bg-gray-100"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Has Deadline */}
              {onHasDeadlineChange && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Deadline</label>
                  <button
                    onClick={() => onHasDeadlineChange(!hasDeadline)}
                    className={`w-full py-3 rounded-xl text-sm font-medium border transition-all ${
                      hasDeadline
                        ? "bg-[#1e3a5f] text-white border-[#1e3a5f]"
                        : "bg-gray-50 text-gray-600 border-gray-200 active:bg-gray-100"
                    }`}
                  >
                    {hasDeadline ? "Only with Deadline ✓" : "Any Deadline"}
                  </button>
                </div>
              )}

              {/* Apply button */}
              <button
                onClick={() => setShowMobileSheet(false)}
                className="w-full py-3.5 bg-[#1e3a5f] text-white rounded-xl text-sm font-semibold active:bg-[#0f172a] transition-colors"
              >
                Show {itemCount} Results
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== DESKTOP FILTER BAR ===== */}
      <div className="hidden md:block sticky top-16 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="container py-4">
          {/* Search bar */}
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
                    <span>{label}</span>
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

              <select
                value={selectedType}
                onChange={(e) => onTypeChange(e.target.value as TypeValue)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
              >
                <option value="all">{t.catalog.typeAll}</option>
                <option value="grant">{t.catalog.typeGrant}</option>
                <option value="resource">{t.catalog.typeResource}</option>
              </select>

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

          {/* Advanced Filters Panel — desktop */}
          {showAdvanced && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex flex-wrap gap-3 items-center">
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
    </>
  );
}
