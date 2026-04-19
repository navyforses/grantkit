/*
 * CatalogToolbar — horizontal filter bar above the catalog map / list
 * (Phase 4A, Priya). Replaces FilterBar. Pixel-aligned to the dark
 * catalog split-view reference. Internally debounces the search input
 * so remote queries fire 300 ms after the user stops typing.
 */

import { useEffect, useState } from "react";
import { ChevronDown, Columns, Map as MapIcon, List as ListIcon, Search, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

export type ToolbarTypeValue = "all" | "grant" | "resource";
export type ToolbarViewMode = "split" | "map" | "list";

interface RegionOption {
  code: string;
  label: string;
  flag?: string;
  count?: number;
}

interface CategoryOption {
  id: string;
  label: string;
  count: number;
  icon?: string;
}

interface CountryOption {
  code: string;       // ISO code (US, GB, DE, …)
  label: string;      // localised country name
  count?: number;
}

interface PlaceOption {
  value: string;      // raw state name or city name
  label: string;
  count?: number;
}

export interface CatalogToolbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;

  regionFilter: string | null;
  onRegionChange: (r: string | null) => void;

  countryFilter: string | null;
  onCountryChange: (c: string | null) => void;

  stateFilter: string | null;
  onStateChange: (s: string | null) => void;

  cityFilter: string | null;
  onCityChange: (c: string | null) => void;

  categoryFilter: string | null;
  onCategoryChange: (c: string | null) => void;

  viewMode: ToolbarViewMode;
  onViewChange: (m: ToolbarViewMode) => void;

  availableRegions: RegionOption[];
  availableCountries: CountryOption[];
  availableStates: PlaceOption[];
  availableCities: PlaceOption[];
  availableCategories: CategoryOption[];
}

const SEARCH_DEBOUNCE_MS = 300;

export default function CatalogToolbar({
  searchQuery,
  onSearchChange,
  regionFilter,
  onRegionChange,
  countryFilter,
  onCountryChange,
  stateFilter,
  onStateChange,
  cityFilter,
  onCityChange,
  categoryFilter,
  onCategoryChange,
  viewMode,
  onViewChange,
  availableRegions,
  availableCountries,
  availableStates,
  availableCities,
  availableCategories,
}: CatalogToolbarProps) {
  const { t } = useLanguage();

  // Local mirror of the search query so typing is instant and the parent
  // only sees a debounced update. If the parent clears the query
  // (e.g. from another control), keep local in sync.
  const [localSearch, setLocalSearch] = useState(searchQuery);
  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    if (localSearch === searchQuery) return;
    const timer = setTimeout(() => onSearchChange(localSearch), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // onSearchChange is treated as stable; parent memoises filter state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localSearch]);

  const selectedRegion = regionFilter
    ? availableRegions.find((r) => r.code === regionFilter)
    : null;
  const regionLabel = selectedRegion?.label ?? t.toolbar.region.all;

  const selectedCountry = countryFilter
    ? availableCountries.find((c) => c.code === countryFilter)
    : null;
  const countryLabel = selectedCountry?.label ?? t.toolbar.country.all;

  const selectedState = stateFilter
    ? availableStates.find((s) => s.value === stateFilter)
    : null;
  const stateLabel = selectedState?.label ?? t.toolbar.state.all;

  const selectedCity = cityFilter
    ? availableCities.find((c) => c.value === cityFilter)
    : null;
  const cityLabel = selectedCity?.label ?? t.toolbar.city.all;

  const selectedCategory = categoryFilter
    ? availableCategories.find((c) => c.id === categoryFilter)
    : null;
  const categoryLabel = selectedCategory?.label ?? t.toolbar.category.all;

  // Cascade gates: a child dropdown is only meaningful once its parent is set.
  const stateEnabled = !!countryFilter && availableStates.length > 0;
  const cityEnabled = !!stateFilter && availableCities.length > 0;

  return (
    <div
      role="toolbar"
      aria-label="Catalog filters"
      className="h-12 px-6 flex items-center gap-3 bg-[#0F1419] border-b border-white/[0.06]"
    >
      {/* Search input */}
      <label className="relative flex-1 max-w-[480px]">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40"
          aria-hidden="true"
        />
        <input
          type="search"
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          placeholder={t.toolbar.search.placeholder}
          aria-label={t.toolbar.search.placeholder}
          className={cn(
            "w-full h-8 pl-9 pr-8 rounded-md text-[13px]",
            "bg-white/[0.04] border border-white/[0.08] text-white/90 placeholder:text-white/40",
            "focus:outline-none focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/30",
            "transition-colors",
          )}
        />
        {localSearch && (
          <button
            type="button"
            onClick={() => setLocalSearch("")}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </label>

      {/* Region dropdown — top of the location cascade. */}
      <ToolbarDropdown
        label={t.toolbar.region.label}
        value={regionLabel}
        active={!!regionFilter}
        ariaLabel={t.toolbar.region.label}
      >
        <DropdownMenuItem
          data-active={regionFilter === null}
          onSelect={() => onRegionChange(null)}
        >
          {t.toolbar.region.all}
        </DropdownMenuItem>
        {availableRegions.map((r) => (
          <DropdownMenuItem
            key={r.code}
            data-active={regionFilter === r.code}
            onSelect={() => onRegionChange(r.code)}
          >
            {r.flag ? <span className="mr-2">{r.flag}</span> : null}
            <span>{r.label}</span>
            {typeof r.count === "number" && (
              <span className="ml-auto text-xs text-white/40">{r.count}</span>
            )}
          </DropdownMenuItem>
        ))}
      </ToolbarDropdown>

      {/* Country dropdown — narrows by region when one is picked. */}
      <ToolbarDropdown
        label={t.toolbar.country.label}
        value={countryLabel}
        active={!!countryFilter}
        ariaLabel={t.toolbar.country.label}
      >
        <DropdownMenuItem
          data-active={countryFilter === null}
          onSelect={() => onCountryChange(null)}
        >
          {t.toolbar.country.all}
        </DropdownMenuItem>
        {availableCountries.map((c) => (
          <DropdownMenuItem
            key={c.code}
            data-active={countryFilter === c.code}
            onSelect={() => onCountryChange(c.code)}
          >
            <span>{c.label}</span>
            {typeof c.count === "number" && (
              <span className="ml-auto text-xs text-white/40">{c.count}</span>
            )}
          </DropdownMenuItem>
        ))}
      </ToolbarDropdown>

      {/* State dropdown — disabled until a country is picked. Most non-US
          countries have no per-state data, so the cascade gate keeps the UI
          honest about what's available. */}
      <ToolbarDropdown
        label={t.toolbar.state.label}
        value={stateLabel}
        active={!!stateFilter}
        ariaLabel={t.toolbar.state.label}
        disabled={!stateEnabled}
      >
        <DropdownMenuItem
          data-active={stateFilter === null}
          onSelect={() => onStateChange(null)}
        >
          {t.toolbar.state.all}
        </DropdownMenuItem>
        {availableStates.map((s) => (
          <DropdownMenuItem
            key={s.value}
            data-active={stateFilter === s.value}
            onSelect={() => onStateChange(s.value)}
          >
            <span>{s.label}</span>
            {typeof s.count === "number" && (
              <span className="ml-auto text-xs text-white/40">{s.count}</span>
            )}
          </DropdownMenuItem>
        ))}
      </ToolbarDropdown>

      {/* City dropdown — disabled until a state is picked. Picking a city
          drives the map's flyTo via useGoogleMapFlyTo. */}
      <ToolbarDropdown
        label={t.toolbar.city.label}
        value={cityLabel}
        active={!!cityFilter}
        ariaLabel={t.toolbar.city.label}
        disabled={!cityEnabled}
      >
        <DropdownMenuItem
          data-active={cityFilter === null}
          onSelect={() => onCityChange(null)}
        >
          {t.toolbar.city.all}
        </DropdownMenuItem>
        {availableCities.map((c) => (
          <DropdownMenuItem
            key={c.value}
            data-active={cityFilter === c.value}
            onSelect={() => onCityChange(c.value)}
          >
            <span>{c.label}</span>
            {typeof c.count === "number" && (
              <span className="ml-auto text-xs text-white/40">{c.count}</span>
            )}
          </DropdownMenuItem>
        ))}
      </ToolbarDropdown>

      {/* Category dropdown */}
      <ToolbarDropdown
        label={t.toolbar.category.label}
        value={categoryLabel}
        active={!!categoryFilter}
        ariaLabel={t.toolbar.category.label}
      >
        <DropdownMenuItem
          data-active={categoryFilter === null}
          onSelect={() => onCategoryChange(null)}
        >
          {t.toolbar.category.all}
        </DropdownMenuItem>
        {availableCategories.map((c) => (
          <DropdownMenuItem
            key={c.id}
            data-active={categoryFilter === c.id}
            onSelect={() => onCategoryChange(c.id)}
          >
            {c.icon ? <span className="mr-2">{c.icon}</span> : null}
            <span>{c.label}</span>
            <span className="ml-auto text-xs text-white/40">{c.count}</span>
          </DropdownMenuItem>
        ))}
      </ToolbarDropdown>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Segmented view toggle */}
      <div
        role="tablist"
        aria-label="View mode"
        className="inline-flex items-center rounded-md bg-white/[0.04] border border-white/[0.08] p-0.5 gap-0.5"
      >
        <ViewToggleButton
          active={viewMode === "split"}
          onClick={() => onViewChange("split")}
          label={t.toolbar.view.split}
          icon={<Columns className="w-3.5 h-3.5" aria-hidden="true" />}
        />
        <ViewToggleButton
          active={viewMode === "map"}
          onClick={() => onViewChange("map")}
          label={t.toolbar.view.map}
          icon={<MapIcon className="w-3.5 h-3.5" aria-hidden="true" />}
        />
        <ViewToggleButton
          active={viewMode === "list"}
          onClick={() => onViewChange("list")}
          label={t.toolbar.view.list}
          icon={<ListIcon className="w-3.5 h-3.5" aria-hidden="true" />}
        />
      </div>
    </div>
  );
}

// — Subcomponents ————————————————————————————————————————————————————————

interface ToolbarDropdownProps {
  label: string;
  value: string;
  active: boolean;
  ariaLabel: string;
  /** When true, the trigger renders muted and the menu does not open. */
  disabled?: boolean;
  children: React.ReactNode;
}

function ToolbarDropdown({
  label,
  value,
  active,
  ariaLabel,
  disabled,
  children,
}: ToolbarDropdownProps) {
  const [open, setOpen] = useState(false);
  return (
    <DropdownMenu open={open && !disabled} onOpenChange={(o) => !disabled && setOpen(o)}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          aria-disabled={disabled || undefined}
          disabled={disabled}
          className={cn(
            "h-8 inline-flex items-center gap-1.5 px-3 rounded-md text-[13px] whitespace-nowrap",
            "border transition-colors",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1D9E75]/60",
            disabled
              ? "bg-transparent text-white/25 border-white/[0.05] cursor-not-allowed"
              : active
                ? "bg-[#1D9E75]/15 text-[#5DCAA5] border-[#1D9E75]/30 font-medium"
                : "bg-transparent text-[#9CA3AF] border-white/[0.08] hover:bg-white/[0.04] hover:text-white/80",
          )}
        >
          <span className={cn(disabled ? "text-white/20" : "text-white/40")}>{label}:</span>
          <span
            className={cn(
              disabled ? "text-white/30" : active ? "text-[#5DCAA5]" : "text-white/80",
            )}
          >
            {value}
          </span>
          <ChevronDown
            className={cn("w-3.5 h-3.5 transition-transform", open && !disabled && "rotate-180")}
            aria-hidden="true"
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={6}
        className="min-w-[200px] max-h-[60vh] overflow-y-auto bg-[#0F1419] border border-white/[0.08] text-white/80"
      >
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface ViewToggleButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}

function ViewToggleButton({ active, onClick, label, icon }: ViewToggleButtonProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 h-7 px-2.5 rounded text-[12px] font-medium transition-colors",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1D9E75]/60",
        active
          ? "bg-[#1D9E75]/15 text-[#5DCAA5]"
          : "text-[#9CA3AF] hover:text-white/80",
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
