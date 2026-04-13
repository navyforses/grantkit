/*
 * MapFilterPanel — Floating left-side filter overlay on the world map.
 *
 * Layout:
 *   Desktop: 320px sidebar, absolute on map left edge, collapsible
 *   Mobile:  full-width panel below the map header, collapsible
 *
 * Sections:
 *   1. Region      — 🇺🇸 United States | 🇪🇺 European Union | 🇬🇧 United Kingdom
 *   2. Sub-region  — US: state, EU: member country, GB: (none)
 *   3. State/Region within EU country (if EU + country selected)
 *   4. City        — cities for selected state
 *   5. Category    — grant category
 *   6. Type        — Grant | Resource | All
 */

import { useMemo, useState } from "react";
import { State, City, Country } from "country-state-city";
import { SlidersHorizontal, X, ChevronRight } from "lucide-react";
import { CATEGORIES, type CategoryValue, type TypeValue, REGIONS, EU_MEMBER_CODES, type RegionCode } from "@/lib/constants";
import { useLanguage } from "@/contexts/LanguageContext";
import SearchableSelect, { type SelectOption } from "./SearchableSelect";

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
}

// ── Component ────────────────────────────────────────────────────────────────

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
}: MapFilterPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { t, tCategory } = useLanguage();

  // ── Sub-region options depend on which region is selected ──────────────────

  // EU member country sub-selection (with "All EU" first)
  const euCountryOptions: SelectOption[] = useMemo(
    () => [{ value: "", label: "All EU countries", secondary: "🇪🇺" }, ...EU_COUNTRY_OPTIONS],
    [],
  );

  // US / EU-country → states; GB → empty
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

          {/* 📍 State / Region — US states or EU-country regions */}
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
