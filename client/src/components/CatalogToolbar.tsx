/*
 * CatalogToolbar — horizontal filter bar above the catalog map / list
 * (Phase 4A, Priya). Replaces FilterBar. Pixel-aligned to the dark
 * catalog split-view reference. Location cascade (region / country /
 * state / city) + layout switch — free-text search removed per user
 * request, 2026-04-20.
 */

import { useEffect, useState } from "react";
import { ChevronDown, Map as MapIcon, List as ListIcon, Sparkles, X, SlidersHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerClose,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/useMobile";
import { LANGUAGES, useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { DOMAIN_KEYS, type Domain } from "@shared/domains";

// Phase 1 (1.4) — accessibility filter values, mirrors organizations enums
// (`"unknown"` is not offered — it means "we don't know", not a preference).
export const COST_OPTIONS = ["free", "sliding_scale", "paid", "insurance", "mixed"] as const;
export const STATUS_OPTIONS = ["yes", "case_by_case", "no"] as const;
export type CostValue = (typeof COST_OPTIONS)[number];
export type StatusValue = (typeof STATUS_OPTIONS)[number];

export type ToolbarTypeValue = "all" | "grant" | "resource";
export type ToolbarViewMode = "map" | "list";

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

  // Phase 1 (1.4) — domain × language × cost × status
  domainFilter: Domain | null;
  onDomainChange: (d: Domain | null) => void;
  languageFilter: string | null;
  onLanguageChange: (l: string | null) => void;
  costFilter: CostValue | null;
  onCostChange: (c: CostValue | null) => void;
  statusFilter: StatusValue | null;           // acceptsUndocumented
  onStatusChange: (s: StatusValue | null) => void;
  // Health-only sub-filter (diagnosis / B-2) — rendered only when domain=health
  b2VisaFilter: string;                       // "all" | "yes"
  onB2VisaChange: (v: string) => void;
  diagnosisFilter: string;                    // "all" | free text
  onDiagnosisChange: (v: string) => void;

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
  domainFilter,
  onDomainChange,
  languageFilter,
  onLanguageChange,
  costFilter,
  onCostChange,
  statusFilter,
  onStatusChange,
  b2VisaFilter,
  onB2VisaChange,
  diagnosisFilter,
  onDiagnosisChange,
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

  const isMobile = useIsMobile();
  const isHealth = domainFilter === "health";
  // Active filters — used to badge the mobile "Filters" button so users see
  // at a glance how many dimensions are narrowing the list.
  const activeFilterCount = [
    regionFilter, countryFilter, stateFilter, cityFilter,
    domainFilter, languageFilter, costFilter, statusFilter,
    isHealth && b2VisaFilter !== "all" ? b2VisaFilter : null,
    isHealth && diagnosisFilter !== "all" ? diagnosisFilter : null,
  ].filter(Boolean).length;

  const domainLabel = domainFilter ? t.domains[domainFilter].label : t.toolbar.domain.all;
  const languageLabel = languageFilter
    ? (LANGUAGES.find((l) => l.code === languageFilter)?.nativeName ?? languageFilter)
    : t.toolbar.language.all;
  const costLabel = costFilter ? t.toolbar.cost[costFilter] : t.toolbar.cost.all;
  const statusLabel = statusFilter ? t.toolbar.status[statusFilter] : t.toolbar.status.all;

  // Smart search input — shared between mobile and desktop layouts.
  const smartSearchInput = (
    <label className={cn("relative flex-shrink-0", isMobile ? "flex-1 min-w-0" : "w-44 sm:w-64 md:w-80")}>
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
          "w-full pl-8 pr-7 rounded-md",
          // Use 16px text on mobile so iOS Safari doesn't auto-zoom on focus.
          isMobile ? "h-10 text-base" : "h-8 text-[13px]",
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
  );

  // Segmented view toggle — same component on both layouts, slightly larger
  // on mobile to keep tap targets honest.
  const viewToggle = (
    <div
      role="tablist"
      aria-label={t.toolbar.view.ariaLabel}
      className={cn(
        "inline-flex items-center rounded-md bg-muted/60 border border-border gap-0.5 flex-shrink-0",
        isMobile ? "p-1" : "p-0.5",
      )}
    >
      <ViewToggleButton
        active={viewMode === "map"}
        onClick={() => onViewChange("map")}
        label={t.toolbar.view.map}
        icon={<MapIcon className="w-4 h-4" aria-hidden="true" />}
        large={isMobile}
      />
      <ViewToggleButton
        active={viewMode === "list"}
        onClick={() => onViewChange("list")}
        label={t.toolbar.view.list}
        icon={<ListIcon className="w-4 h-4" aria-hidden="true" />}
        large={isMobile}
      />
    </div>
  );

  // Single dropdown definitions — reused inside both desktop toolbar and the
  // mobile drawer (where they render full-width).
  const regionDropdown = (
    <ToolbarDropdown
      label={t.toolbar.region.label}
      value={regionLabel}
      active={!!regionFilter}
      ariaLabel={t.toolbar.region.label}
      fullWidth={isMobile}
    >
      <DropdownMenuItem data-active={regionFilter === null} onSelect={() => onRegionChange(null)}>
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
  );

  const countryDropdown = (
    <ToolbarDropdown
      label={t.toolbar.country.label}
      value={countryLabel}
      active={!!countryFilter}
      ariaLabel={t.toolbar.country.label}
      fullWidth={isMobile}
    >
      <DropdownMenuItem data-active={countryFilter === null} onSelect={() => onCountryChange(null)}>
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
  );

  const stateDropdown = (
    <ToolbarDropdown
      label={t.toolbar.state.label}
      value={stateLabel}
      active={!!stateFilter}
      ariaLabel={t.toolbar.state.label}
      disabled={!stateEnabled}
      disabledHint={t.toolbar.state.disabledHint}
      fullWidth={isMobile}
    >
      <DropdownMenuItem data-active={stateFilter === null} onSelect={() => onStateChange(null)}>
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
  );

  const cityDropdown = (
    <ToolbarDropdown
      label={t.toolbar.city.label}
      value={cityLabel}
      active={!!cityFilter}
      ariaLabel={t.toolbar.city.label}
      disabled={!cityEnabled}
      disabledHint={t.toolbar.city.disabledHint}
      fullWidth={isMobile}
    >
      <DropdownMenuItem data-active={cityFilter === null} onSelect={() => onCityChange(null)}>
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
  );

  // ── Phase 1 (1.4) — domain × language × cost × status dropdowns.
  const domainDropdown = (
    <ToolbarDropdown
      label={t.toolbar.domain.label}
      value={domainLabel}
      active={!!domainFilter}
      ariaLabel={t.toolbar.domain.label}
      fullWidth={isMobile}
    >
      <DropdownMenuItem data-active={domainFilter === null} onSelect={() => onDomainChange(null)}>
        {t.toolbar.domain.all}
      </DropdownMenuItem>
      {DOMAIN_KEYS.map((d) => (
        <DropdownMenuItem
          key={d}
          data-active={domainFilter === d}
          onSelect={() => onDomainChange(d)}
          title={t.domains[d].description}
        >
          <span>{t.domains[d].label}</span>
        </DropdownMenuItem>
      ))}
    </ToolbarDropdown>
  );

  const languageDropdown = (
    <ToolbarDropdown
      label={t.toolbar.language.label}
      value={languageLabel}
      active={!!languageFilter}
      ariaLabel={t.toolbar.language.label}
      fullWidth={isMobile}
    >
      <DropdownMenuItem data-active={languageFilter === null} onSelect={() => onLanguageChange(null)}>
        {t.toolbar.language.all}
      </DropdownMenuItem>
      {LANGUAGES.map((l) => (
        <DropdownMenuItem
          key={l.code}
          data-active={languageFilter === l.code}
          onSelect={() => onLanguageChange(l.code)}
        >
          <span className="mr-2">{l.flag}</span>
          <span>{l.nativeName}</span>
        </DropdownMenuItem>
      ))}
    </ToolbarDropdown>
  );

  const costDropdown = (
    <ToolbarDropdown
      label={t.toolbar.cost.label}
      value={costLabel}
      active={!!costFilter}
      ariaLabel={t.toolbar.cost.label}
      fullWidth={isMobile}
    >
      <DropdownMenuItem data-active={costFilter === null} onSelect={() => onCostChange(null)}>
        {t.toolbar.cost.all}
      </DropdownMenuItem>
      {COST_OPTIONS.map((c) => (
        <DropdownMenuItem key={c} data-active={costFilter === c} onSelect={() => onCostChange(c)}>
          {t.toolbar.cost[c]}
        </DropdownMenuItem>
      ))}
    </ToolbarDropdown>
  );

  const statusDropdown = (
    <ToolbarDropdown
      label={t.toolbar.status.label}
      value={statusLabel}
      active={!!statusFilter}
      ariaLabel={t.toolbar.status.label}
      fullWidth={isMobile}
    >
      <DropdownMenuItem data-active={statusFilter === null} onSelect={() => onStatusChange(null)}>
        {t.toolbar.status.all}
      </DropdownMenuItem>
      {STATUS_OPTIONS.map((s) => (
        <DropdownMenuItem key={s} data-active={statusFilter === s} onSelect={() => onStatusChange(s)}>
          {t.toolbar.status[s]}
        </DropdownMenuItem>
      ))}
    </ToolbarDropdown>
  );

  // Diagnosis / B-2 visa are medical-grant concepts — kept only as a
  // sub-filter of the `health` domain (MASTER-PLAN v1 §1.3 row 3).
  const healthSubFilter = isHealth ? (
    <div
      data-testid="health-subfilter"
      className={cn("flex items-center gap-2", isMobile ? "flex-col items-stretch" : "flex-shrink-0")}
    >
      <ToolbarDropdown
        label={t.toolbar.health.b2Label}
        value={b2VisaFilter === "yes" ? t.toolbar.health.b2Yes : t.toolbar.health.b2All}
        active={b2VisaFilter === "yes"}
        ariaLabel={t.toolbar.health.b2Label}
        fullWidth={isMobile}
      >
        <DropdownMenuItem data-active={b2VisaFilter === "all"} onSelect={() => onB2VisaChange("all")}>
          {t.toolbar.health.b2All}
        </DropdownMenuItem>
        <DropdownMenuItem data-active={b2VisaFilter === "yes"} onSelect={() => onB2VisaChange("yes")}>
          {t.toolbar.health.b2Yes}
        </DropdownMenuItem>
      </ToolbarDropdown>
      <input
        type="search"
        value={diagnosisFilter === "all" ? "" : diagnosisFilter}
        onChange={(e) => onDiagnosisChange(e.target.value.trim() || "all")}
        placeholder={t.toolbar.health.diagnosisPlaceholder}
        aria-label={t.filters.condition}
        className={cn(
          "rounded-md border border-border bg-transparent px-3 text-foreground placeholder:text-muted-foreground/70",
          "focus:outline-none focus:border-[var(--brand-green)] focus:ring-2 focus:ring-[var(--brand-green)]/30",
          isMobile ? "h-12 text-base w-full" : "h-8 text-[13px] w-40",
        )}
      />
    </div>
  ) : null;

  // ── Mobile layout — search + Filters drawer + view toggle, no overflow.
  if (isMobile) {
    const clearAllFilters = () => {
      onRegionChange(null);
      onCountryChange(null);
      onStateChange(null);
      onCityChange(null);
      onDomainChange(null);
      onLanguageChange(null);
      onCostChange(null);
      onStatusChange(null);
      onB2VisaChange("all");
      onDiagnosisChange("all");
    };

    return (
      <div
        role="toolbar"
        aria-label={t.toolbar.ariaLabel}
        className="px-3 py-2 flex items-center gap-2 bg-background border-b border-border"
      >
        {smartSearchInput}

        <Drawer>
          <DrawerTrigger asChild>
            <button
              type="button"
              aria-label={t.filters.filters}
              className={cn(
                "relative h-10 inline-flex items-center justify-center gap-1.5 px-3 rounded-md text-sm font-medium flex-shrink-0",
                "border transition-colors",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-green)]/60",
                activeFilterCount > 0
                  ? "bg-[color:var(--brand-green)]/15 text-[color:var(--brand-green)] border-[var(--brand-green)]/30"
                  : "bg-transparent text-foreground/80 border-border",
              )}
            >
              <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
              {activeFilterCount > 0 && (
                <span
                  aria-hidden="true"
                  className="inline-flex items-center justify-center rounded-full bg-[color:var(--brand-green)] text-white min-w-[18px] h-[18px] px-1 text-[11px] font-semibold"
                >
                  {activeFilterCount}
                </span>
              )}
            </button>
          </DrawerTrigger>
          <DrawerContent className="max-h-[85dvh]">
            <DrawerHeader className="flex flex-row items-center justify-between border-b border-border pb-3">
              <DrawerTitle className="text-base font-semibold">
                {t.filters.filters}
              </DrawerTitle>
              <DrawerClose asChild>
                <button
                  type="button"
                  aria-label={t.filters.clearAll}
                  className="h-9 w-9 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-secondary"
                >
                  <X className="w-5 h-5" />
                </button>
              </DrawerClose>
            </DrawerHeader>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {domainDropdown}
              {healthSubFilter}
              {regionDropdown}
              {countryDropdown}
              {stateDropdown}
              {cityDropdown}
              {languageDropdown}
              {costDropdown}
              {statusDropdown}
            </div>

            {activeFilterCount > 0 && (
              <div className="flex-shrink-0 border-t border-border p-3">
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="w-full h-11 inline-flex items-center justify-center rounded-md bg-secondary text-foreground text-sm font-medium hover:bg-secondary/80 transition-colors"
                >
                  {t.filters.clearAllFilters}
                </button>
              </div>
            )}
          </DrawerContent>
        </Drawer>

        {viewToggle}
      </div>
    );
  }

  // ── Desktop layout — original horizontal toolbar.
  return (
    <div
      role="toolbar"
      aria-label={t.toolbar.ariaLabel}
      className="h-12 px-2 sm:px-6 flex items-center gap-2 sm:gap-3 bg-background border-b border-border overflow-x-auto scrollbar-hide"
    >
      {domainDropdown}
      {healthSubFilter}
      {regionDropdown}
      {countryDropdown}
      {stateDropdown}
      {cityDropdown}
      {languageDropdown}
      {costDropdown}
      {statusDropdown}
      {smartSearchInput}

      {/* Push view toggle to the right on large screens */}
      <div className="hidden sm:flex flex-1" />

      {viewToggle}
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
  /** Tooltip shown on hover when the dropdown is disabled — explains why. */
  disabledHint?: string;
  /** Mobile drawer mode — taller trigger, full-width row, label above value. */
  fullWidth?: boolean;
  children: React.ReactNode;
}

function ToolbarDropdown({
  label,
  value,
  active,
  ariaLabel,
  disabled,
  disabledHint,
  fullWidth,
  children,
}: ToolbarDropdownProps) {
  const [open, setOpen] = useState(false);
  return (
    <DropdownMenu open={open && !disabled} onOpenChange={(o) => !disabled && setOpen(o)}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          title={disabled ? disabledHint : undefined}
          disabled={disabled}
          className={cn(
            "inline-flex items-center rounded-md transition-colors",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-green)]/60",
            "border",
            fullWidth
              ? "w-full h-12 justify-between gap-2 px-3 text-sm"
              : "h-8 gap-1.5 px-3 text-[13px] whitespace-nowrap flex-shrink-0",
            disabled
              ? "bg-transparent text-muted-foreground/40 border-border/60 cursor-not-allowed"
              : active
                ? "bg-[color:var(--brand-green)]/15 text-[color:var(--brand-green)] border-[var(--brand-green)]/30 font-medium"
                : "bg-transparent text-[#9CA3AF] border-border hover:bg-muted/60 hover:text-foreground/90",
          )}
        >
          <span className={cn("inline-flex items-center gap-1.5 min-w-0", fullWidth && "flex-1 truncate")}>
            <span className={cn("flex-shrink-0", disabled ? "text-muted-foreground/30" : "text-muted-foreground/70")}>
              {label}:
            </span>
            <span
              className={cn(
                "truncate",
                disabled ? "text-muted-foreground/50" : active ? "text-[color:var(--brand-green)]" : "text-foreground/90",
              )}
            >
              {value}
            </span>
          </span>
          <ChevronDown
            className={cn("w-4 h-4 flex-shrink-0 transition-transform", open && !disabled && "rotate-180")}
            aria-hidden="true"
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={6}
        // High z-index keeps the menu visible above the mobile filters Drawer
        // (which uses z-50 from vaul).
        className="z-[60] min-w-[200px] max-h-[60vh] overflow-y-auto bg-background border border-border text-foreground/90"
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
  /** Mobile mode — taller button + 16px text for tap accuracy. */
  large?: boolean;
}

function ViewToggleButton({ active, onClick, label, icon, large }: ViewToggleButtonProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded font-medium transition-colors",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-green)]/60",
        large ? "h-9 px-3 text-sm" : "h-7 px-2.5 text-[12px]",
        active
          ? "bg-[color:var(--brand-green)]/15 text-[color:var(--brand-green)]"
          : "text-[#9CA3AF] hover:text-foreground/90",
      )}
    >
      {icon}
      <span className={large ? "" : "hidden sm:inline"}>{label}</span>
    </button>
  );
}
