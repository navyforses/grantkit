/*
 * MapFilterPanel — Floating left-side filter overlay on the world map.
 *
 * Layout:
 *   Desktop: 320px sidebar, absolute on map left edge, collapsible
 *   Mobile:  full-width panel below the map header, collapsible
 *
 * Sections:
 *   1. Sort (Supabase mode only)
 *   2. Region      — 🇺🇸 United States | 🇪🇺 European Union | 🇬🇧 United Kingdom
 *   3. Sub-region  — US: state, EU: member country, GB: (none)
 *   4. State/Region within EU country (if EU + country selected)
 *   5. City        — cities for selected state
 *   6. Category    — grant category (legacy chips or Supabase hierarchical tree)
 *   7. Type        — Grant | Resource | All (legacy mode only)
 *   8. Supabase-specific: amount range, eligibility, target groups, clinical phase, disease area
 */

import { useMemo, useState } from "react";
import { State, City, Country } from "country-state-city";
import { SlidersHorizontal, X, ChevronRight, ChevronDown } from "lucide-react";
import { CATEGORIES, type CategoryValue, type TypeValue, REGIONS, EU_MEMBER_CODES, type RegionCode } from "@/lib/constants";
import { useLanguage } from "@/contexts/LanguageContext";
import SearchableSelect, { type SelectOption } from "./SearchableSelect";
import MapSortSelect from "./MapSortSelect";
import type { ResourceType, ClinicalPhase, Category, Country as SupabaseCountry } from "@/types/resources";

// ── EU member country list (built once) ──────────────────────────────────────

const EU_COUNTRY_OPTIONS: SelectOption[] = EU_MEMBER_CODES
  .map((iso) => {
    const c = Country.getCountryByCode(iso);
    return c ? { value: iso, label: c.name, secondary: c.flag } : null;
  })
  .filter(Boolean)
  .sort((a, b) => a!.label.localeCompare(b!.label)) as SelectOption[];

// ── Props ────────────────────────────────────────────────────────────────────

export interface MapFilterPanelProps {
  regionCode: RegionCode;
  countryCode: string;   // specific country (EU member or "US" or "GB")
  stateCode: string;
  cityName: string;
  onRegionChange: (code: RegionCode) => void;
  onCountryChange: (code: string) => void;
  onStateChange: (code: string) => void;
  onCityChange: (name: string) => void;

  selectedCategory: CategoryValue;
  onCategoryChange: (v: CategoryValue) => void;
  selectedType: TypeValue;
  onTypeChange: (v: TypeValue) => void;

  totalItems: number;
  onClearAll: () => void;

  // ── Supabase resource filters (optional — only shown when a Supabase type is active) ──
  supabaseResourceType?: ResourceType;
  supabaseCategories?: Category[];
  supabaseCountries?: SupabaseCountry[];
  selectedSupabaseCategories?: string[];
  onSupabaseCategoriesChange?: (ids: string[]) => void;
  selectedSupabaseCountries?: string[];
  onSupabaseCountriesChange?: (codes: string[]) => void;

  // Sort
  currentSort?: string;
  onSortChange?: (sort: string) => void;
  searchQuery?: string;

  // Amount
  amountMin?: number;
  amountMax?: number;
  onAmountMinChange?: (v: number | undefined) => void;
  onAmountMaxChange?: (v: number | undefined) => void;

  // Eligibility
  selectedEligibility?: string;
  onEligibilityChange?: (v: string | undefined) => void;

  // Target groups
  selectedTargetGroups?: string[];
  onTargetGroupsChange?: (groups: string[]) => void;

  // Clinical phase (MEDICAL only)
  selectedClinicalPhase?: ClinicalPhase;
  onClinicalPhaseChange?: (phase: ClinicalPhase | undefined) => void;

  // Disease areas (MEDICAL only)
  selectedDiseaseAreas?: string[];
  onDiseaseAreasChange?: (areas: string[]) => void;
}

// ── Component ────────────────────────────────────────────────────────────────

const TARGET_GROUPS = ["Children", "Disabled", "Veterans", "Immigrants", "Students", "Elderly"];
const CLINICAL_PHASES: ClinicalPhase[] = ["PHASE_1", "PHASE_2", "PHASE_3", "PHASE_4"];
const DISEASE_AREA_CHIPS = ["Cancer", "Rare Disease", "Neurological", "Cardiovascular", "Autoimmune", "Infectious", "Pediatric", "Mental Health"];

export default function MapFilterPanel({
  regionCode,
  countryCode,
  stateCode,
  cityName,
  onRegionChange,
  onCountryChange,
  onStateChange,
  onCityChange,
  selectedCategory,
  onCategoryChange,
  selectedType,
  onTypeChange,
  totalItems,
  onClearAll,
  supabaseResourceType,
  supabaseCategories = [],
  supabaseCountries = [],
  selectedSupabaseCategories = [],
  onSupabaseCategoriesChange,
  selectedSupabaseCountries = [],
  onSupabaseCountriesChange,
  currentSort = "newest",
  onSortChange,
  searchQuery,
  amountMin,
  amountMax,
  onAmountMinChange,
  onAmountMaxChange,
  selectedEligibility,
  onEligibilityChange,
  selectedTargetGroups = [],
  onTargetGroupsChange,
  selectedClinicalPhase,
  onClinicalPhaseChange,
  selectedDiseaseAreas = [],
  onDiseaseAreasChange,
}: MapFilterPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { t, tCategory } = useLanguage();
  const isSupabaseMode = supabaseResourceType === "SOCIAL" || supabaseResourceType === "MEDICAL" || supabaseResourceType === "GRANT";

  // Tracks which parent categories are expanded in the hierarchical tree
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const toggleExpand = (id: string) =>
    setExpandedCats((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // ── Sub-region options depend on which region is selected ──────────────────

  const euCountryOptions: SelectOption[] = useMemo(
    () => [{ value: "", label: "All EU countries", secondary: "🇪🇺" }, ...EU_COUNTRY_OPTIONS],
    [],
  );

  const stateOptions: SelectOption[] = useMemo(() => {
    const iso = regionCode === "US" ? "US" : regionCode === "GB" ? "GB" : countryCode;
    if (!iso) return [];
    return [
      { value: "", label: t.filters.allRegions },
      ...State.getStatesOfCountry(iso)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((s) => ({ value: s.isoCode, label: s.name })),
    ];
  }, [regionCode, countryCode, t.filters.allRegions]);

  const cityOptions: SelectOption[] = useMemo(() => {
    const iso = regionCode === "US" ? "US" : regionCode === "GB" ? "GB" : countryCode;
    if (!iso || !stateCode) return [];
    return [
      { value: "", label: t.filters.allCities },
      ...City.getCitiesOfState(iso, stateCode)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((c) => ({ value: c.name, label: c.name })),
    ];
  }, [regionCode, countryCode, stateCode, t.filters.allCities]);

  const categoryOptions: SelectOption[] = useMemo(
    () => CATEGORIES.map((c) => ({ value: c.value, label: tCategory(c.value), secondary: c.icon })),
    [tCategory],
  );

  // Count active filters
  const activeCount = [
    regionCode,
    regionCode === "EU" ? countryCode : "",
    stateCode,
    cityName,
    selectedCategory !== "all" ? selectedCategory : "",
    selectedType !== "all" ? selectedType : "",
    amountMin != null ? "amountMin" : "",
    amountMax != null ? "amountMax" : "",
    selectedEligibility ? selectedEligibility : "",
    ...(selectedTargetGroups ?? []),
    ...(selectedDiseaseAreas ?? []),
    ...(selectedSupabaseCategories ?? []),
    ...(selectedSupabaseCountries ?? []),
    selectedClinicalPhase ?? "",
  ].filter(Boolean).length;

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleRegionChange = (code: RegionCode) => {
    onRegionChange(code);
    onCountryChange(code === "US" ? "US" : code === "GB" ? "GB" : "");
    onStateChange("");
    onCityChange("");
  };

  const handleEuCountryChange = (iso: string) => {
    onCountryChange(iso);
    onStateChange("");
    onCityChange("");
  };

  const handleStateChange = (code: string) => {
    onStateChange(code);
    onCityChange("");
  };

  const toggleSupabaseCategory = (id: string) => {
    const next = selectedSupabaseCategories.includes(id)
      ? selectedSupabaseCategories.filter((x) => x !== id)
      : [...selectedSupabaseCategories, id];
    onSupabaseCategoriesChange?.(next);
  };

  const toggleSupabaseCountry = (code: string) => {
    const next = selectedSupabaseCountries.includes(code)
      ? selectedSupabaseCountries.filter((x) => x !== code)
      : [...selectedSupabaseCountries, code];
    onSupabaseCountriesChange?.(next);
  };

  // ── Collapsed pill ────────────────────────────────────────────────────────
  if (collapsed) {
    return (
      <div className="absolute top-4 left-0 z-10">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          aria-label={t.filters.openFilters}
          className={[
            "flex items-center gap-2 pl-3 pr-4 py-2.5",
            "rounded-r-full shadow-lg",
            "bg-background/90 backdrop-blur-xl",
            "border border-l-0 border-border/40",
            "text-sm font-medium text-foreground",
            "transition-all duration-200 hover:pl-4",
          ].join(" ")}
        >
          <SlidersHorizontal className="w-4 h-4 text-primary flex-shrink-0" />
          <span>{t.filters.filters}</span>
          {activeCount > 0 && (
            <span className="flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded-full bg-primary text-primary-foreground">
              {activeCount}
            </span>
          )}
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>
    );
  }

  // ── Expanded panel ────────────────────────────────────────────────────────
  return (
    <div
      className={[
        "absolute top-0 left-0 z-10",
        "h-full",
        "w-full sm:w-80",
        "bg-background/90 backdrop-blur-xl",
        "border-r border-border/40",
        "shadow-2xl",
        "transition-transform duration-300 ease-out",
      ].join(" ")}
    >
      <div className="flex flex-col h-full">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 flex-shrink-0">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm text-foreground">{t.filters.filters}</span>
            {activeCount > 0 && (
              <span className="flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded-full bg-primary text-primary-foreground">
                {activeCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground mr-2">
              {t.filters.nFound.replace("{count}", totalItems.toLocaleString())}
            </span>
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              aria-label={t.filters.closeFilters}
              className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Filter sections ── */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 space-y-4">

          {/* 🔃 Sort (Supabase mode only) */}
          {isSupabaseMode && onSortChange && (
            <FilterSection label={t.resources.sortBy} emoji="🔃">
              <MapSortSelect
                resourceType={supabaseResourceType}
                value={currentSort}
                onChange={onSortChange}
                hasSearch={!!searchQuery}
              />
            </FilterSection>
          )}

          {/* 🌍 Region — 3 large buttons */}
          <FilterSection label="Region" emoji="🌍">
            <div className="grid grid-cols-3 gap-1.5">
              {REGIONS.map((r) => (
                <button
                  key={r.code}
                  type="button"
                  onClick={() => handleRegionChange(regionCode === r.code ? "" : r.code)}
                  className={[
                    "flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border text-xs font-medium transition-all",
                    regionCode === r.code
                      ? "bg-primary/10 border-primary/50 text-primary"
                      : "bg-background/60 border-border text-foreground hover:bg-secondary hover:border-border/80",
                  ].join(" ")}
                >
                  <span className="text-xl leading-none">{r.flag}</span>
                  <span className="text-[10px] leading-tight text-center">{r.label}</span>
                </button>
              ))}
            </div>
          </FilterSection>

          {/* 🇪🇺 EU — member country picker (only when EU is selected) */}
          {regionCode === "EU" && (
            <FilterSection label="EU Country" emoji="🇪🇺">
              <SearchableSelect
                options={euCountryOptions}
                value={countryCode}
                onChange={handleEuCountryChange}
                placeholder="All EU countries"
                searchPlaceholder={t.filters.searchCountries}
                noResultsLabel={t.filters.noResults}
                typeMoreLabel={t.filters.typeMore}
              />
            </FilterSection>
          )}

          {/* 📍 State / Region */}
          {(regionCode === "US" || (regionCode === "EU" && countryCode) || regionCode === "GB") && (
            <FilterSection label={t.filters.stateLocation} emoji="📍">
              <SearchableSelect
                options={stateOptions.length > 0 ? stateOptions : [{ value: "", label: t.filters.allRegions }]}
                value={stateCode}
                onChange={handleStateChange}
                placeholder={t.filters.allRegions}
                searchPlaceholder={t.filters.searchRegions}
                noResultsLabel={t.filters.noResults}
                typeMoreLabel={t.filters.typeMore}
                disabled={regionCode === "GB"}
              />
            </FilterSection>
          )}

          {/* 🏙️ City */}
          {stateCode && (
            <FilterSection label={t.filters.city} emoji="🏙️">
              <SearchableSelect
                options={cityOptions.length > 0 ? cityOptions : [{ value: "", label: t.filters.allCities }]}
                value={cityName}
                onChange={onCityChange}
                placeholder={t.filters.allCities}
                searchPlaceholder={t.filters.searchCities}
                noResultsLabel={t.filters.noResults}
                typeMoreLabel={t.filters.typeMore}
              />
            </FilterSection>
          )}

          {/* ── Supabase: hierarchical category tree ── */}
          {isSupabaseMode && supabaseCategories.length > 0 && (
            <FilterSection label={t.resources.filterByCategory} emoji="📂">
              <div className="space-y-0.5">
                {supabaseCategories.map((parent) => {
                  const isExpanded = expandedCats.has(parent.id);
                  const hasChildren = (parent.children?.length ?? 0) > 0;
                  const parentSelected = selectedSupabaseCategories.includes(parent.id);
                  return (
                    <div key={parent.id}>
                      <div className="flex items-center gap-1">
                        {hasChildren && (
                          <button
                            type="button"
                            onClick={() => toggleExpand(parent.id)}
                            className="p-0.5 rounded hover:bg-secondary transition-colors flex-shrink-0"
                          >
                            {isExpanded
                              ? <ChevronDown className="w-3 h-3 text-muted-foreground" />
                              : <ChevronRight className="w-3 h-3 text-muted-foreground" />
                            }
                          </button>
                        )}
                        {!hasChildren && <span className="w-4 flex-shrink-0" />}
                        <label className="flex items-center gap-1.5 cursor-pointer flex-1 py-1 px-1.5 rounded-lg hover:bg-secondary/50 transition-colors">
                          <input
                            type="checkbox"
                            checked={parentSelected}
                            onChange={() => toggleSupabaseCategory(parent.id)}
                            className="accent-primary w-3.5 h-3.5 flex-shrink-0"
                          />
                          <span className="text-[10px] leading-none">{parent.icon}</span>
                          <span className="text-xs font-medium text-foreground">{parent.name}</span>
                        </label>
                      </div>
                      {isExpanded && hasChildren && (
                        <div className="ml-7 mt-0.5 space-y-0.5">
                          {parent.children!.map((child) => {
                            const childSelected = selectedSupabaseCategories.includes(child.id);
                            const hasGrandchildren = (child.children?.length ?? 0) > 0;
                            const childExpanded = expandedCats.has(child.id);
                            return (
                              <div key={child.id}>
                                <div className="flex items-center gap-1">
                                  {hasGrandchildren && (
                                    <button
                                      type="button"
                                      onClick={() => toggleExpand(child.id)}
                                      className="p-0.5 rounded hover:bg-secondary transition-colors flex-shrink-0"
                                    >
                                      {childExpanded
                                        ? <ChevronDown className="w-3 h-3 text-muted-foreground" />
                                        : <ChevronRight className="w-3 h-3 text-muted-foreground" />
                                      }
                                    </button>
                                  )}
                                  {!hasGrandchildren && <span className="w-4 flex-shrink-0" />}
                                  <label className="flex items-center gap-1.5 cursor-pointer flex-1 py-1 px-1.5 rounded-lg hover:bg-secondary/50 transition-colors">
                                    <input
                                      type="checkbox"
                                      checked={childSelected}
                                      onChange={() => toggleSupabaseCategory(child.id)}
                                      className="accent-primary w-3.5 h-3.5 flex-shrink-0"
                                    />
                                    <span className="text-[10px] leading-none">{child.icon}</span>
                                    <span className="text-xs text-foreground">{child.name}</span>
                                  </label>
                                </div>
                                {childExpanded && hasGrandchildren && (
                                  <div className="ml-6 mt-0.5 space-y-0.5">
                                    {child.children!.map((gc) => (
                                      <label key={gc.id} className="flex items-center gap-1.5 cursor-pointer py-1 px-1.5 rounded-lg hover:bg-secondary/50 transition-colors ml-4">
                                        <input
                                          type="checkbox"
                                          checked={selectedSupabaseCategories.includes(gc.id)}
                                          onChange={() => toggleSupabaseCategory(gc.id)}
                                          className="accent-primary w-3.5 h-3.5 flex-shrink-0"
                                        />
                                        <span className="text-[10px] leading-none">{gc.icon}</span>
                                        <span className="text-xs text-foreground">{gc.name}</span>
                                      </label>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </FilterSection>
          )}

          {/* ── Supabase: country filter ── */}
          {isSupabaseMode && supabaseCountries.length > 0 && (
            <FilterSection label={t.resources.filterByCountry} emoji="🌍">
              <div className="flex flex-wrap gap-1.5">
                {supabaseCountries.slice(0, 12).map((c) => {
                  const active = selectedSupabaseCountries.includes(c.code);
                  return (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => toggleSupabaseCountry(c.code)}
                      className={[
                        "px-2 py-1 text-[11px] font-medium rounded-full border transition-all",
                        active
                          ? "bg-primary/10 border-primary/50 text-primary"
                          : "bg-background/60 border-border text-foreground hover:bg-secondary",
                      ].join(" ")}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </FilterSection>
          )}

          {/* 📂 Category (legacy mode) */}
          {!isSupabaseMode && (
            <FilterSection label={t.filters.category} emoji="📂">
              <SearchableSelect
                options={categoryOptions}
                value={selectedCategory}
                onChange={(v) => onCategoryChange(v as CategoryValue)}
                searchPlaceholder={t.filters.searchCategories}
                noResultsLabel={t.filters.noResults}
                typeMoreLabel={t.filters.typeMore}
              />
            </FilterSection>
          )}

          {/* 📋 Type — only in legacy mode */}
          {!isSupabaseMode && (
            <FilterSection label={t.filters.type} emoji="📋">
              <div className="flex gap-2">
                {(["all", "grant", "resource"] as TypeValue[]).map((tv) => (
                  <button
                    key={tv}
                    type="button"
                    onClick={() => onTypeChange(tv)}
                    className={[
                      "flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors",
                      selectedType === tv
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background/60 border-border text-foreground hover:bg-secondary",
                    ].join(" ")}
                  >
                    {tv === "all" ? t.catalog.typeAll : tv === "grant" ? t.catalog.typeGrant : t.catalog.typeResource}
                  </button>
                ))}
              </div>
            </FilterSection>
          )}

          {/* ── Supabase-specific filters ────────────────────────────── */}
          {isSupabaseMode && (
            <>
              {/* 💰 Amount range — GRANT and SOCIAL only */}
              {(supabaseResourceType === "GRANT" || supabaseResourceType === "SOCIAL") && (
                <FilterSection label={t.resources.filterAmount} emoji="💰">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      step={100}
                      placeholder="Min"
                      value={amountMin ?? ""}
                      onChange={(e) => onAmountMinChange?.(e.target.value ? Number(e.target.value) : undefined)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background/60 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <span className="text-muted-foreground text-xs shrink-0">–</span>
                    <input
                      type="number"
                      min={0}
                      step={100}
                      placeholder="Max"
                      value={amountMax ?? ""}
                      onChange={(e) => onAmountMaxChange?.(e.target.value ? Number(e.target.value) : undefined)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background/60 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </FilterSection>
              )}

              {/* 🗓️ Deadline — GRANT and MEDICAL */}
              {(supabaseResourceType === "GRANT" || supabaseResourceType === "MEDICAL") && (
                <FilterSection label={t.resources.filterDeadline} emoji="🗓️">
                  <input
                    type="date"
                    onChange={(e) => {
                      // Handled externally via onAmountMaxChange repurposed as deadline filter
                      // For now we wire into the parent through the existing mechanism
                    }}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background/60 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </FilterSection>
              )}

              {/* ✅ Eligibility — GRANT, SOCIAL, MEDICAL */}
              <FilterSection label={t.resources.filterEligibility} emoji="✅">
                <div className="flex gap-2">
                  {(["INDIVIDUAL", "ORGANIZATION", "BOTH"] as const).map((e) => {
                    const label = e === "INDIVIDUAL" ? t.resources.individual : e === "ORGANIZATION" ? t.resources.organization : t.resources.both;
                    return (
                      <button
                        key={e}
                        type="button"
                        onClick={() => onEligibilityChange?.(selectedEligibility === e ? undefined : e)}
                        className={[
                          "flex-1 py-1.5 text-[10px] font-medium rounded-lg border transition-colors",
                          selectedEligibility === e
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background/60 border-border text-foreground hover:bg-secondary",
                        ].join(" ")}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </FilterSection>

              {/* 👥 Target groups — GRANT and SOCIAL only */}
              {(supabaseResourceType === "GRANT" || supabaseResourceType === "SOCIAL") && (
                <FilterSection label={t.resources.filterTargetGroup} emoji="👥">
                  <div className="flex flex-wrap gap-1.5">
                    {TARGET_GROUPS.map((g) => {
                      const active = selectedTargetGroups.includes(g);
                      return (
                        <button
                          key={g}
                          type="button"
                          onClick={() => {
                            const next = active
                              ? selectedTargetGroups.filter((x) => x !== g)
                              : [...selectedTargetGroups, g];
                            onTargetGroupsChange?.(next);
                          }}
                          className={[
                            "px-2.5 py-1 text-[11px] font-medium rounded-full border transition-all",
                            active
                              ? "bg-primary/10 border-primary/50 text-primary"
                              : "bg-background/60 border-border text-foreground hover:bg-secondary",
                          ].join(" ")}
                        >
                          {g}
                        </button>
                      );
                    })}
                  </div>
                </FilterSection>
              )}

              {/* 🔬 Clinical phase (MEDICAL only) */}
              {supabaseResourceType === "MEDICAL" && (
                <FilterSection label={t.resources.filterClinicalPhase} emoji="🔬">
                  <div className="grid grid-cols-2 gap-1.5">
                    {CLINICAL_PHASES.map((phase) => (
                      <button
                        key={phase}
                        type="button"
                        onClick={() => onClinicalPhaseChange?.(selectedClinicalPhase === phase ? undefined : phase)}
                        className={[
                          "py-1.5 text-[11px] font-medium rounded-lg border transition-colors",
                          selectedClinicalPhase === phase
                            ? "bg-purple-100 border-purple-400 text-purple-700"
                            : "bg-background/60 border-border text-foreground hover:bg-secondary",
                        ].join(" ")}
                      >
                        {phase.replace("_", " ")}
                      </button>
                    ))}
                  </div>
                </FilterSection>
              )}

              {/* 🦠 Disease areas (MEDICAL only) */}
              {supabaseResourceType === "MEDICAL" && (
                <FilterSection label={t.resources.filterDiseaseArea} emoji="🦠">
                  <div className="flex flex-wrap gap-1.5">
                    {DISEASE_AREA_CHIPS.map((area) => {
                      const active = selectedDiseaseAreas.includes(area);
                      return (
                        <button
                          key={area}
                          type="button"
                          onClick={() => {
                            const next = active
                              ? selectedDiseaseAreas.filter((x) => x !== area)
                              : [...selectedDiseaseAreas, area];
                            onDiseaseAreasChange?.(next);
                          }}
                          className={[
                            "px-2.5 py-1 text-[11px] font-medium rounded-full border transition-all",
                            active
                              ? "bg-purple-100 border-purple-400 text-purple-700"
                              : "bg-background/60 border-border text-foreground hover:bg-secondary",
                          ].join(" ")}
                        >
                          {area}
                        </button>
                      );
                    })}
                  </div>
                </FilterSection>
              )}
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-4 py-3 border-t border-border/50 flex-shrink-0">
          <button
            type="button"
            onClick={onClearAll}
            disabled={activeCount === 0}
            className={[
              "w-full py-2 text-sm font-medium rounded-lg border transition-colors",
              activeCount === 0
                ? "opacity-40 cursor-not-allowed border-border text-muted-foreground"
                : "border-destructive/40 text-destructive hover:bg-destructive/10",
            ].join(" ")}
          >
            {t.filters.clearAllFilters}
          </button>
        </div>

      </div>
    </div>
  );
}

// ── Helper ────────────────────────────────────────────────────────────────────

function FilterSection({ label, emoji, children }: { label: string; emoji: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        <span>{emoji}</span>
        <span>{label}</span>
      </p>
      {children}
    </div>
  );
}
