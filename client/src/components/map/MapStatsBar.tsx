/*
 * MapStatsBar — Thin info bar rendered between the Navbar and the map.
 *
 * Shows:
 *   Left  — total grant count + unique country count
 *   Middle — active filter chips (each removable with ×)
 *   Right  — "Clear all" button when any filter is active
 *
 * Inspired by Candid Foundation Maps top bar pattern.
 */

import { X } from "lucide-react";
import { Country, State } from "country-state-city";
import { CATEGORIES, type CategoryValue, type TypeValue } from "@/lib/constants";
import { useLanguage } from "@/contexts/LanguageContext";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface StatsBarFilters {
  searchQuery: string;
  category: CategoryValue;
  type: TypeValue;
  countryCode: string;
  stateCode: string;
  cityName: string;
  fundingType: string;
  targetDiagnosis: string;
  b2VisaEligible: string;
  hasDeadline: boolean;
}

export type FilterKey = keyof StatsBarFilters;

interface Props {
  /** Total grants currently visible on the map */
  totalCount: number;
  /** Number of unique countries in the result set */
  countryCount: number;
  filters: StatsBarFilters;
  /** Called with the filter key to clear; parent resets that filter to its default */
  onClearFilter: (key: FilterKey) => void;
  onClearAll: () => void;
}

// ── Sub-component ─────────────────────────────────────────────────────────────

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-medium whitespace-nowrap">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove filter: ${label}`}
        className="flex-shrink-0 hover:text-primary/60 transition-colors"
      >
        <X className="w-2.5 h-2.5" />
      </button>
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function MapStatsBar({
  totalCount,
  countryCount,
  filters,
  onClearFilter,
  onClearAll,
}: Props) {
  const { t, tCategory } = useLanguage();

  const hasAnyFilter =
    !!filters.searchQuery ||
    filters.category !== "all" ||
    filters.type !== "all" ||
    !!filters.countryCode ||
    filters.fundingType !== "all" ||
    filters.targetDiagnosis !== "all" ||
    filters.b2VisaEligible !== "all" ||
    filters.hasDeadline;

  // Resolve human-readable labels for location codes
  const countryName = filters.countryCode
    ? Country.getCountryByCode(filters.countryCode)?.name ?? filters.countryCode
    : null;
  const stateName =
    filters.countryCode && filters.stateCode
      ? (State.getStateByCodeAndCountry(filters.stateCode, filters.countryCode)?.name ?? filters.stateCode)
      : null;

  // Resolve category label + icon
  const categoryMeta = filters.category !== "all"
    ? CATEGORIES.find((c) => c.value === filters.category)
    : null;

  return (
    <div className="h-10 bg-background/95 backdrop-blur-sm border-b border-border flex items-center px-3 gap-2 overflow-hidden flex-shrink-0">

      {/* ── Left: stats ── */}
      <div className="flex-shrink-0 flex items-center gap-1.5 text-sm select-none">
        <span className="font-semibold text-foreground tabular-nums">
          {totalCount.toLocaleString()}
        </span>
        <span className="text-muted-foreground hidden sm:inline">
          {totalCount === 1 ? "grant" : "grants"}
        </span>
        {countryCount > 1 && (
          <>
            <span className="text-border mx-0.5">·</span>
            <span className="font-semibold text-foreground tabular-nums">{countryCount}</span>
            <span className="text-muted-foreground hidden sm:inline">countries</span>
          </>
        )}
      </div>

      {/* ── Divider ── */}
      {hasAnyFilter && (
        <div className="w-px h-4 bg-border flex-shrink-0" />
      )}

      {/* ── Middle: active filter chips (horizontally scrollable) ── */}
      <div className="flex-1 flex items-center gap-1.5 overflow-x-auto min-w-0 py-1"
           style={{ scrollbarWidth: "none" }}>
        {filters.searchQuery && (
          <Chip
            label={`"${filters.searchQuery}"`}
            onRemove={() => onClearFilter("searchQuery")}
          />
        )}
        {categoryMeta && (
          <Chip
            label={`${categoryMeta.icon} ${tCategory(filters.category)}`}
            onRemove={() => onClearFilter("category")}
          />
        )}
        {filters.type !== "all" && (
          <Chip
            label={filters.type === "grant" ? t.catalog.typeGrant : t.catalog.typeResource}
            onRemove={() => onClearFilter("type")}
          />
        )}
        {countryName && (
          <Chip
            label={countryName}
            onRemove={() => onClearFilter("countryCode")}
          />
        )}
        {stateName && (
          <Chip
            label={stateName}
            onRemove={() => onClearFilter("stateCode")}
          />
        )}
        {filters.cityName && (
          <Chip
            label={filters.cityName}
            onRemove={() => onClearFilter("cityName")}
          />
        )}
        {filters.fundingType !== "all" && (
          <Chip
            label={filters.fundingType}
            onRemove={() => onClearFilter("fundingType")}
          />
        )}
        {filters.targetDiagnosis !== "all" && (
          <Chip
            label={filters.targetDiagnosis}
            onRemove={() => onClearFilter("targetDiagnosis")}
          />
        )}
        {filters.b2VisaEligible !== "all" && (
          <Chip
            label={t.filters.b2Visa}
            onRemove={() => onClearFilter("b2VisaEligible")}
          />
        )}
        {filters.hasDeadline && (
          <Chip
            label={t.filters.deadline}
            onRemove={() => onClearFilter("hasDeadline")}
          />
        )}
      </div>

      {/* ── Right: clear all ── */}
      {hasAnyFilter && (
        <button
          type="button"
          onClick={onClearAll}
          className="flex-shrink-0 text-[11px] text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
        >
          {t.filters.clearAll}
        </button>
      )}
    </div>
  );
}
