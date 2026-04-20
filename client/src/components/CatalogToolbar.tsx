/*
 * CatalogToolbar — horizontal filter bar above the catalog map / list
 * (Phase 4A, Priya). Replaces FilterBar. Pixel-aligned to the dark
 * catalog split-view reference. Location cascade (region / country /
 * state / city) + layout switch — free-text search removed per user
 * request, 2026-04-20.
 */

import { useEffect, useState } from "react";
import { ChevronDown, Columns, Map as MapIcon, List as ListIcon, Sparkles, X } from "lucide-react";
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
  smartQuery: string;
  onSmartQueryChange: (q: string) => void;

  regionFilter: string | null;
  onRegionChange: (r: string | null) => void;

  countryFilter: string | null;
  onCountryChange: (c: string | null) => void;

  stateFilter: string | null;
  onStateChange: (s: string | null) => void;

  cityFilter: string | null;
  onCityChange: (c: string | null) => void;

  viewMode: ToolbarViewMode;
  onViewChange: (m: ToolbarViewMode) => void;

  availableRegions: RegionOption[];
  availableCountries: CountryOption[];
  availableStates: PlaceOption[];
  availableCities: PlaceOption[];
}

const SMART_DEBOUNCE_MS = 600;

export default function CatalogToolbar({
  smartQuery,
  onSmartQueryChange,
  regionFilter,
  onRegionChange,
  countryFilter,
  onCountryChange,
  stateFilter,
  onStateChange,
  cityFilter,
  onCityChange,
  viewMode,
  onViewChange,
  availableRegions,
  availableCountries,
  availableStates,
  availableCities,
}: CatalogToolbarProps) {
  const { t } = useLanguage();

  // Local mirror of the AI query so typing feels instant; parent only sees
  // a debounced update, which gates the expensive smartSearch RPC call.
  const [localSmart, setLocalSmart] = useState(smartQuery);
  useEffect(() => {
    setLocalSmart(smartQuery);
  }, [smartQuery]);
  useEffect(() => {
    if (localSmart === smartQuery) return;
    const timer = setTimeout(() => onSmartQueryChange(localSmart), SMART_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localSmart]);

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

  // Cascade gates: a child dropdown is only meaningful once its parent is set.
  const stateEnabled = !!countryFilter && availableStates.length > 0;
  // City enables once a state is set (US flow) OR once a non-US country
  // is picked (EU / other — we populate from country-state-city so the
  // dropdown is usable before a DB grant exists for that country).
  const cityEnabled = availableCities.length > 0 && (
    !!stateFilter || (!!countryFilter && countryFilter !== "US")
  );

  return (
    <div
      role="toolbar"
      aria-label={t.toolbar.ariaLabel}
      className="h-12 px-2 sm:px-6 flex items-center gap-2 sm:gap-3 bg-background border-b border-border overflow-x-auto scrollbar-hide"
    >
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
              <span className="ml-auto text-xs text-muted-foreground/70">{r.count}</span>
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
              <span className="ml-auto text-xs text-muted-foreground/70">{c.count}</span>
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
              <span className="ml-auto text-xs text-muted-foreground/70">{s.count}</span>
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
              <span className="ml-auto text-xs text-muted-foreground/70">{c.count}</span>
            )}
          </DropdownMenuItem>
        ))}
      </ToolbarDropdown>

      {/* Smart Search — AI-powered search across all grants in the DB. */}
      <label className="relative flex-shrink-0 w-44 sm:w-64 md:w-80">
        <Sparkles
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[color:var(--brand-green)]"
          aria-hidden="true"
        />
        <input
          type="search"
          value={localSmart}
          onChange={(e) => setLocalSmart(e.target.value)}
          placeholder={t.smartSearch.placeholder}
          aria-label={t.smartSearch.tab}
          className={cn(
            "w-full h-8 pl-8 pr-7 rounded-md text-[13px]",
            "bg-[color:var(--brand-green)]/[0.06] border border-[var(--brand-green)]/25 text-foreground placeholder:text-muted-foreground/70",
            "focus:outline-none focus:border-[var(--brand-green)] focus:ring-2 focus:ring-[var(--brand-green)]/30",
            "transition-colors",
          )}
        />
        {localSmart && (
          <button
            type="button"
            onClick={() => setLocalSmart("")}
            aria-label={t.filters.clearAll}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/70 hover:text-foreground/90"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </label>

      {/* Push view toggle to the right on large screens */}
      <div className="hidden sm:flex flex-1" />

      {/* Segmented view toggle */}
      <div
        role="tablist"
        aria-label={t.toolbar.view.ariaLabel}
        className="inline-flex items-center rounded-md bg-muted/60 border border-border p-0.5 gap-0.5 flex-shrink-0"
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
          disabled={disabled}
          className={cn(
            "h-8 inline-flex items-center gap-1.5 px-3 rounded-md text-[13px] whitespace-nowrap flex-shrink-0",
            "border transition-colors",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-green)]/60",
            disabled
              ? "bg-transparent text-muted-foreground/40 border-border/60 cursor-not-allowed"
              : active
                ? "bg-[color:var(--brand-green)]/15 text-[color:var(--brand-green)] border-[var(--brand-green)]/30 font-medium"
                : "bg-transparent text-[#9CA3AF] border-border hover:bg-muted/60 hover:text-foreground/90",
          )}
        >
          <span className={cn(disabled ? "text-muted-foreground/30" : "text-muted-foreground/70")}>{label}:</span>
          <span
            className={cn(
              disabled ? "text-muted-foreground/50" : active ? "text-[color:var(--brand-green)]" : "text-foreground/90",
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
        className="min-w-[200px] max-h-[60vh] overflow-y-auto bg-background border border-border text-foreground/90"
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
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-green)]/60",
        active
          ? "bg-[color:var(--brand-green)]/15 text-[color:var(--brand-green)]"
          : "text-[#9CA3AF] hover:text-foreground/90",
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
