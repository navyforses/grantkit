/*
 * FilterBar Component
 * Mobile: compact inline chips + expandable bottom sheet for advanced filters
 * Desktop: sticky horizontal bar with category pills + advanced panel
 */

import { ArrowUpDown, ChevronDown, ChevronUp, Filter, MapPin, Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useState } from "react";
import { CATEGORIES, COUNTRIES, type CategoryValue, type CountryValue, type TypeValue } from "@/lib/constants";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";

export type SortValue = "name_asc" | "name_desc" | "category" | "country" | "state" | "newest";

// Diagnosis option values (labels come from i18n)
const DIAGNOSIS_VALUES = [
  "all", "Cancer", "Rare Disease", "Autism", "Cerebral Palsy", "Epilepsy",
  "Down Syndrome", "Hearing", "Vision", "Diabetes", "Mental Health",
  "Spinal", "Kidney", "Heart", "Multiple Sclerosis", "Alzheimer", "General",
] as const;

// Funding type option values
const FUNDING_TYPE_VALUES = ["all", "one_time", "recurring", "reimbursement", "varies"] as const;

// B-2 Visa option values
const B2_VISA_VALUES = ["all", "yes", "no", "uncertain"] as const;

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
  // State filter
  selectedState?: string;
  onStateChange?: (v: string) => void;
  // City filter (cascading from state)
  selectedCity?: string;
  onCityChange?: (v: string) => void;
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
  selectedState,
  onStateChange,
  selectedCity,
  onCityChange,
}: FilterBarProps) {
  const { t, tCategory, tCountry } = useLanguage();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showMobileSheet, setShowMobileSheet] = useState(false);

  // Build translated option arrays from i18n
  const diagnosisLabelMap: Record<string, string> = {
    all: t.filters.allConditions,
    Cancer: t.filters.cancer,
    "Rare Disease": t.filters.rareDisease,
    Autism: t.filters.autismASD,
    "Cerebral Palsy": t.filters.cerebralPalsy,
    Epilepsy: t.filters.epilepsy,
    "Down Syndrome": t.filters.downSyndrome,
    Hearing: t.filters.hearingLoss,
    Vision: t.filters.visionImpairment,
    Diabetes: t.filters.diabetes,
    "Mental Health": t.filters.mentalHealth,
    Spinal: t.filters.spinalCordInjury,
    Kidney: t.filters.kidneyDisease,
    Heart: t.filters.heartDisease,
    "Multiple Sclerosis": t.filters.multipleSclerosis,
    Alzheimer: t.filters.alzheimers,
    General: t.filters.generalAny,
  };

  const fundingTypeLabelMap: Record<string, string> = {
    all: t.filters.allFundingTypes,
    one_time: t.filters.oneTime,
    recurring: t.filters.recurring,
    reimbursement: t.filters.reimbursement,
    varies: t.filters.varies,
  };

  const b2VisaLabelMap: Record<string, string> = {
    all: t.filters.all,
    yes: t.filters.b2Eligible,
    no: t.filters.usResidentsOnly,
    uncertain: t.filters.contactToConfirm,
  };

  // Fetch distinct states for the filter dropdown
  const { data: statesData } = trpc.catalog.states.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // cache for 5 minutes
  });

  // Fetch distinct cities for the selected state (cascading filter)
  const isStateSelected = selectedState && selectedState !== "all" && selectedState !== "Nationwide" && selectedState !== "International";
  const { data: citiesData } = trpc.catalog.cities.useQuery(
    { state: selectedState || "" },
    {
      enabled: !!isStateSelected,
      staleTime: 5 * 60 * 1000,
    }
  );

  // Count active advanced filters
  const activeAdvancedCount = [
    fundingType && fundingType !== "all",
    targetDiagnosis && targetDiagnosis !== "all",
    b2VisaEligible && b2VisaEligible !== "all",
    hasDeadline,
    selectedState && selectedState !== "all",
    selectedCity && selectedCity !== "all",
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
    onStateChange?.("all");
    onCityChange?.("all");
  };

  // Helper for search result text
  const searchResultText = (count: number, query: string) => {
    if (count > 0) {
      return t.filters.resultsFor.replace("{count}", String(count)).replace("{query}", query);
    }
    return t.filters.noResultsFor.replace("{query}", query);
  };

  return (
    <>
      {/* ===== MOBILE FILTER BAR ===== */}
      <div className="md:hidden sticky top-14 z-20 bg-white/95 backdrop-blur-sm border-b border-border">
        <div className="px-4 py-3">
          {/* Search bar — full width on mobile */}
          {onSearchChange && (
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 pointer-events-none" />
              <input
                type="text"
                value={searchQuery || ""}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={t.catalog.searchPlaceholder}
                className="w-full text-sm border border-border rounded-xl pl-9 pr-9 py-2.5 bg-secondary text-foreground/80 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-muted-foreground/60"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 active:text-muted-foreground"
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
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-muted-foreground border-border active:bg-secondary"
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
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border active:bg-secondary"
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                {t.filters.filters}
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
                  className="text-xs border border-border rounded-lg px-2.5 py-2 bg-card text-foreground/80 focus:outline-none"
                >
                  <option value="name_asc">{t.filters.sortAZ}</option>
                  <option value="name_desc">{t.filters.sortZA}</option>
                  <option value="newest">{t.filters.sortNewest}</option>
                  <option value="category">{t.filters.sortCategory}</option>
                  <option value="country">{t.filters.sortCountry}</option>
                  <option value="state">{t.filters.sortState}</option>
                </select>
              )}
            </div>

            {/* Result count */}
            <span className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{itemCount}</span> {t.catalog.itemsCount}
            </span>
          </div>

          {/* Search result summary */}
          {searchQuery && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              {searchResultText(itemCount, searchQuery)}
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
          <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-2xl max-h-[60vh] overflow-y-auto animate-slide-up safe-area-bottom">
            {/* Handle */}
            <div className="sticky top-0 bg-card pt-3 pb-2 px-5 border-b border-border rounded-t-2xl z-10">
              <div className="w-10 h-1 bg-muted-foreground/40 rounded-full mx-auto mb-3" />
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-foreground">{t.filters.filters}</h3>
                <div className="flex items-center gap-3">
                  {totalActiveFilters > 0 && (
                    <button
                      onClick={clearAllFilters}
                      className="text-xs text-red-500 font-medium"
                    >
                      {t.filters.clearAll}
                    </button>
                  )}
                  <button
                    onClick={() => setShowMobileSheet(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-muted active:bg-muted"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
            </div>

            <div className="px-5 py-4 space-y-5 pb-8">
              {/* Type */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">{t.filters.type}</label>
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
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-secondary text-muted-foreground border-border active:bg-muted"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Country */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">{t.filters.country}</label>
                <select
                  value={selectedCountry}
                  onChange={(e) => onCountryChange(e.target.value as CountryValue)}
                  className="w-full text-sm border border-border rounded-xl px-4 py-3 bg-secondary text-foreground/80 focus:outline-none focus:ring-2 focus:ring-primary/20"
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

              {/* State / Location */}
              {onStateChange && statesData && statesData.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                    <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" /> {t.filters.stateLocation}</span>
                  </label>
                  <select
                    value={selectedState || "all"}
                    onChange={(e) => onStateChange(e.target.value)}
                    className="w-full text-sm border border-border rounded-xl px-4 py-3 bg-secondary text-foreground/80 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="all">{t.filters.allStates}</option>
                    <option value="Nationwide">🇺🇸 {t.filters.nationwide}</option>
                    {statesData
                      .filter(s => s.state !== "Nationwide" && s.state !== "International")
                      .map((s) => (
                        <option key={s.state} value={s.state}>
                          {s.state} ({s.count})
                        </option>
                      ))}
                    <option value="International">🌐 {t.filters.international}</option>
                  </select>
                </div>
              )}

              {/* City (appears when a specific state is selected) */}
              {onCityChange && isStateSelected && citiesData && citiesData.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                    <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" /> {t.filters.city}</span>
                  </label>
                  <select
                    value={selectedCity || "all"}
                    onChange={(e) => onCityChange(e.target.value)}
                    className="w-full text-sm border border-border rounded-xl px-4 py-3 bg-secondary text-foreground/80 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="all">{t.filters.allCitiesIn.replace("{state}", selectedState || "")}</option>
                    {citiesData.map((c) => (
                      <option key={c.city} value={c.city}>
                        {c.city} ({c.count})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Condition / Diagnosis */}
              {onTargetDiagnosisChange && (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">{t.filters.condition}</label>
                  <select
                    value={targetDiagnosis || "all"}
                    onChange={(e) => onTargetDiagnosisChange(e.target.value)}
                    className="w-full text-sm border border-border rounded-xl px-4 py-3 bg-secondary text-foreground/80 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {DIAGNOSIS_VALUES.map((val) => (
                      <option key={val} value={val}>{diagnosisLabelMap[val]}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Funding Type */}
              {onFundingTypeChange && (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">{t.filters.fundingType}</label>
                  <div className="flex flex-wrap gap-2">
                    {FUNDING_TYPE_VALUES.map((val) => (
                      <button
                        key={val}
                        onClick={() => onFundingTypeChange(val)}
                        className={`px-3.5 py-2 rounded-xl text-sm font-medium border transition-all ${
                          fundingType === val
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-secondary text-muted-foreground border-border active:bg-muted"
                        }`}
                      >
                        {fundingTypeLabelMap[val]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* B-2 Visa */}
              {onB2VisaChange && (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">{t.filters.b2Visa}</label>
                  <div className="flex flex-wrap gap-2">
                    {B2_VISA_VALUES.map((val) => (
                      <button
                        key={val}
                        onClick={() => onB2VisaChange(val)}
                        className={`px-3.5 py-2 rounded-xl text-sm font-medium border transition-all ${
                          b2VisaEligible === val
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-secondary text-muted-foreground border-border active:bg-muted"
                        }`}
                      >
                        {b2VisaLabelMap[val]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Has Deadline */}
              {onHasDeadlineChange && (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">{t.filters.deadline}</label>
                  <button
                    onClick={() => onHasDeadlineChange(!hasDeadline)}
                    className={`w-full py-3 rounded-xl text-sm font-medium border transition-all ${
                      hasDeadline
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-secondary text-muted-foreground border-border active:bg-muted"
                    }`}
                  >
                    {hasDeadline ? t.filters.onlyWithDeadline : t.filters.anyDeadline}
                  </button>
                </div>
              )}

              {/* Apply button */}
              <button
                onClick={() => setShowMobileSheet(false)}
                className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold active:bg-primary transition-colors"
              >
                {t.filters.showResults.replace("{count}", String(itemCount))}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== DESKTOP FILTER BAR ===== */}
      <div className="hidden md:block sticky top-16 z-20 bg-white/95 backdrop-blur-sm border-b border-border">
        <div className="container py-4">
          {/* Category tabs + inline search */}
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="flex flex-wrap gap-2 flex-1 min-w-0">
              {CATEGORIES.map((cat) => {
                const label = cat.value === "all" ? t.categories.all : tCategory(cat.value);
                return (
                  <button
                    key={cat.value}
                    onClick={() => onCategoryChange(cat.value)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border ${
                      selectedCategory === cat.value
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-card text-muted-foreground border-border hover:border-border hover:bg-secondary"
                    }`}
                  >
                    <span className="text-sm">{cat.icon}</span>
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>

            {/* Inline search */}
            {onSearchChange && (
              <div className="relative w-full max-w-[280px] shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery || ""}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder={t.catalog.searchPlaceholder}
                  className="w-full text-sm border border-border rounded-lg pl-9 pr-9 h-9 bg-card text-foreground/80 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-muted-foreground/60 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => onSearchChange("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>

          {searchQuery && (
            <p className="mb-2 text-xs text-muted-foreground">
              {searchResultText(itemCount, searchQuery)}
            </p>
          )}

          <div className="flex items-center justify-between gap-3 flex-wrap">
            {/* Type + State + Sort + count + Advanced toggle */}
            <div className="flex items-center gap-3 flex-wrap">
              {!searchQuery && (
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  <span className="font-semibold text-foreground">{itemCount}</span> {t.catalog.itemsCount}
                </span>
              )}

              <select
                value={selectedType}
                onChange={(e) => onTypeChange(e.target.value as TypeValue)}
                className="text-sm border border-border rounded-lg px-3 py-1.5 bg-card text-foreground/80 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="all">{t.catalog.typeAll}</option>
                <option value="grant">{t.catalog.typeGrant}</option>
                <option value="resource">{t.catalog.typeResource}</option>
              </select>

              {/* State filter (replaces Country — 99% US data) */}
              {onStateChange && (
                <select
                  value={selectedState || "all"}
                  onChange={(e) => onStateChange(e.target.value)}
                  className="text-sm border border-border rounded-lg px-3 py-1.5 bg-card text-foreground/80 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="all">{t.filters.allStates}</option>
                  <option value="Nationwide">{t.filters.nationwide}</option>
                  {statesData?.states?.map((s: string) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              )}

              {onSortChange && (
                <select
                  value={sortBy || "name_asc"}
                  onChange={(e) => onSortChange(e.target.value as SortValue)}
                  className="text-sm border border-border rounded-lg px-3 py-1.5 bg-card text-foreground/80 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="name_asc">{t.filters.sortAZ}</option>
                  <option value="name_desc">{t.filters.sortZA}</option>
                  <option value="newest">{t.filters.sortNewest}</option>
                  <option value="category">{t.filters.sortCategory}</option>
                  <option value="state">{t.filters.sortState}</option>
                </select>
              )}
            </div>

            {/* Advanced Filters Toggle */}
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-all ${
                activeAdvancedCount > 0
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:border-border hover:bg-secondary"
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              {t.filters.filters}
              {activeAdvancedCount > 0 && (
                <span className="bg-white/20 text-white text-xs px-1.5 py-0.5 rounded-full ml-0.5">
                  {activeAdvancedCount}
                </span>
              )}
              {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Advanced Filters Panel — desktop */}
          {showAdvanced && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="flex flex-wrap gap-3 items-center">
                {/* State filter */}
                {onStateChange && statesData && statesData.length > 0 && (
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">{t.filters.state}</label>
                    <select
                      value={selectedState || "all"}
                      onChange={(e) => onStateChange(e.target.value)}
                      className="text-sm border border-border rounded-lg px-3 py-1.5 bg-card text-foreground/80 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      <option value="all">{t.filters.allStates}</option>
                      <option value="Nationwide">🇺🇸 {t.filters.nationwide}</option>
                      {statesData
                        .filter(s => s.state !== "Nationwide" && s.state !== "International")
                        .map((s) => (
                          <option key={s.state} value={s.state}>
                            {s.state} ({s.count})
                          </option>
                        ))}
                      <option value="International">🌐 {t.filters.international}</option>
                    </select>
                  </div>
                )}

                {/* City (cascading from state) */}
                {onCityChange && isStateSelected && citiesData && citiesData.length > 0 && (
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">{t.filters.city}</label>
                    <select
                      value={selectedCity || "all"}
                      onChange={(e) => onCityChange(e.target.value)}
                      className="text-sm border border-border rounded-lg px-3 py-1.5 bg-card text-foreground/80 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      <option value="all">{t.filters.allCities}</option>
                      {citiesData.map((c) => (
                        <option key={c.city} value={c.city}>
                          {c.city} ({c.count})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {onTargetDiagnosisChange && (
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">{t.filters.condition}</label>
                    <select
                      value={targetDiagnosis || "all"}
                      onChange={(e) => onTargetDiagnosisChange(e.target.value)}
                      className="text-sm border border-border rounded-lg px-3 py-1.5 bg-card text-foreground/80 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      {DIAGNOSIS_VALUES.map((val) => (
                        <option key={val} value={val}>{diagnosisLabelMap[val]}</option>
                      ))}
                    </select>
                  </div>
                )}

                {onFundingTypeChange && (
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">{t.filters.fundingType}</label>
                    <select
                      value={fundingType || "all"}
                      onChange={(e) => onFundingTypeChange(e.target.value)}
                      className="text-sm border border-border rounded-lg px-3 py-1.5 bg-card text-foreground/80 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      {FUNDING_TYPE_VALUES.map((val) => (
                        <option key={val} value={val}>{fundingTypeLabelMap[val]}</option>
                      ))}
                    </select>
                  </div>
                )}

                {onB2VisaChange && (
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">{t.filters.b2Visa}</label>
                    <select
                      value={b2VisaEligible || "all"}
                      onChange={(e) => onB2VisaChange(e.target.value)}
                      className="text-sm border border-border rounded-lg px-3 py-1.5 bg-card text-foreground/80 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      {B2_VISA_VALUES.map((val) => (
                        <option key={val} value={val}>{b2VisaLabelMap[val]}</option>
                      ))}
                    </select>
                  </div>
                )}

                {onHasDeadlineChange && (
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">{t.filters.deadline}</label>
                    <button
                      onClick={() => onHasDeadlineChange(!hasDeadline)}
                      className={`text-sm px-3 py-1.5 rounded-lg border transition-all ${
                        hasDeadline
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card text-muted-foreground border-border hover:border-border"
                      }`}
                    >
                      {hasDeadline ? t.filters.hasDeadline : t.filters.anyDeadline}
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
                        onStateChange?.("all");
                        onCityChange?.("all");
                      }}
                      className="text-sm text-red-500 hover:text-red-700 px-3 py-1.5 rounded-lg border border-red-200 hover:border-red-300 transition-all flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" />
                      {t.filters.clearFilters}
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
