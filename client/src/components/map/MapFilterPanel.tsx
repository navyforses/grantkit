/*
 * MapFilterPanel — Floating left-side filter overlay on the world map.
 *
 * Layout:
 *   Desktop: 320px sidebar, absolute on map left edge, collapsible
 *   Mobile:  full-width panel below the map header, collapsible
 *
 * Sections (cascading top-to-bottom):
 *   1. Country   — all ISO 3166-1 countries
 *   2. Region    — states/provinces for selected country
 *   3. City      — cities for selected region
 *   4. Category  — grant category
 *   5. Type      — Grant | Resource | All
 *
 * Phase 3 wires onCountryChange / onStateChange / onCityChange → flyTo.
 */

import { useMemo, useState } from "react";
import { Country, State, City } from "country-state-city";
import { SlidersHorizontal, X, ChevronRight } from "lucide-react";
import { CATEGORIES, type CategoryValue, type TypeValue } from "@/lib/constants";
import { useLanguage } from "@/contexts/LanguageContext";
import SearchableSelect, { type SelectOption } from "./SearchableSelect";

// ── Static data computed once ────────────────────────────────────────────────

/** Built once — labels are in English; dynamic label for "All" is added at render. */
const COUNTRY_LIST: SelectOption[] = Country.getAllCountries()
  .sort((a, b) => a.name.localeCompare(b.name))
  .map((c) => ({ value: c.isoCode, label: c.name, secondary: c.flag }));

// ── Props ────────────────────────────────────────────────────────────────────

export interface MapFilterPanelProps {
  // ISO-code based location (drives map navigation in Phase 3)
  countryCode: string;
  stateCode: string;
  cityName: string;
  onCountryChange: (code: string) => void;
  onStateChange: (code: string) => void;
  onCityChange: (name: string) => void;

  // Grant filters (shared with catalog query)
  selectedCategory: CategoryValue;
  onCategoryChange: (v: CategoryValue) => void;
  selectedType: TypeValue;
  onTypeChange: (v: TypeValue) => void;

  /** Total matching grant/resource count */
  totalItems: number;

  onClearAll: () => void;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function MapFilterPanel({
  countryCode,
  stateCode,
  cityName,
  onCountryChange,
  onStateChange,
  onCityChange,
  selectedCategory,
  onCategoryChange,
  selectedType,
  onTypeChange,
  totalItems,
  onClearAll,
}: MapFilterPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { t, tCategory } = useLanguage();

  // Build translated country options
  const allCountries: SelectOption[] = useMemo(
    () => [{ value: "", label: t.filters.allCountries, secondary: "🌐" }, ...COUNTRY_LIST],
    [t.filters.allCountries],
  );

  // Derive state/city options from selected country/state
  const stateOptions: SelectOption[] = useMemo(() => {
    if (!countryCode) return [];
    return [
      { value: "", label: t.filters.allRegions },
      ...State.getStatesOfCountry(countryCode)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((s) => ({ value: s.isoCode, label: s.name })),
    ];
  }, [countryCode, t.filters.allRegions]);

  const cityOptions: SelectOption[] = useMemo(() => {
    if (!countryCode || !stateCode) return [];
    return [
      { value: "", label: t.filters.allCities },
      ...City.getCitiesOfState(countryCode, stateCode)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((c) => ({ value: c.name, label: c.name })),
    ];
  }, [countryCode, stateCode, t.filters.allCities]);

  const categoryOptions: SelectOption[] = useMemo(
    () =>
      CATEGORIES.map((c) => ({
        value: c.value,
        label: tCategory(c.value),
        secondary: c.icon,
      })),
    [tCategory]
  );

  // Count active filters (excluding "all" / empty values)
  const activeCount = [
    countryCode,
    stateCode,
    cityName,
    selectedCategory !== "all" ? selectedCategory : "",
    selectedType !== "all" ? selectedType : "",
  ].filter(Boolean).length;

  const handleCountryChange = (code: string) => {
    onCountryChange(code);
    onStateChange("");
    onCityChange("");
  };

  const handleStateChange = (code: string) => {
    onStateChange(code);
    onCityChange("");
  };

  // ── Collapsed state — floating toggle pill ────────────────────────────────
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
        // Positioning
        "absolute top-0 left-0 z-10",
        "h-full",
        // Width: 320px desktop, full-width mobile
        "w-full sm:w-80",
        // Background — semi-transparent, backdrop blur
        "bg-background/90 backdrop-blur-xl",
        // Border on right side
        "border-r border-border/40",
        // Shadow
        "shadow-2xl",
        // Slide-in animation
        "transition-transform duration-300 ease-out",
      ].join(" ")}
    >
      {/* Inner scroll container */}
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
            {/* Results count */}
            <span className="text-xs text-muted-foreground mr-2">
              {t.filters.nFound.replace("{count}", totalItems.toLocaleString())}
            </span>
            {/* Collapse button */}
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

          {/* 🌍 Country */}
          <FilterSection label={t.filters.country} emoji="🌍">
            <SearchableSelect
              options={allCountries}
              value={countryCode}
              onChange={handleCountryChange}
              placeholder={t.filters.allCountries}
              searchPlaceholder={t.filters.searchCountries}
              noResultsLabel={t.filters.noResults}
              typeMoreLabel={t.filters.typeMore}
            />
          </FilterSection>

          {/* 📍 Region / State */}
          <FilterSection label={t.filters.stateLocation} emoji="📍">
            <SearchableSelect
              options={stateOptions.length > 0 ? stateOptions : [{ value: "", label: t.filters.allRegions }]}
              value={stateCode}
              onChange={handleStateChange}
              placeholder={t.filters.allRegions}
              searchPlaceholder={t.filters.searchRegions}
              noResultsLabel={t.filters.noResults}
              typeMoreLabel={t.filters.typeMore}
              disabled={!countryCode}
            />
          </FilterSection>

          {/* 🏙️ City */}
          <FilterSection label={t.filters.city} emoji="🏙️">
            <SearchableSelect
              options={cityOptions.length > 0 ? cityOptions : [{ value: "", label: t.filters.allCities }]}
              value={cityName}
              onChange={onCityChange}
              placeholder={t.filters.allCities}
              searchPlaceholder={t.filters.searchCities}
              noResultsLabel={t.filters.noResults}
              typeMoreLabel={t.filters.typeMore}
              disabled={!stateCode}
            />
          </FilterSection>

          {/* 📂 Category */}
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

          {/* 📋 Type */}
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
        </div>

        {/* ── Footer — Clear All ── */}
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

// ── Helpers ──────────────────────────────────────────────────────────────────

function FilterSection({
  label,
  emoji,
  children,
}: {
  label: string;
  emoji: string;
  children: React.ReactNode;
}) {
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
