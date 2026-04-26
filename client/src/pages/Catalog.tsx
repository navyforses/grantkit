/*
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║ 🚫 DO NOT TOUCH — FROZEN FILE                                     ║
 * ║                                                                  ║
 * ║ This file has been explicitly frozen by the project owner.       ║
 * ║ Do NOT modify it — not for refactoring, style cleanup, unused    ║
 * ║ imports, rename cascades, or any other "incidental" reason.      ║
 * ║                                                                  ║
 * ║ If a change is genuinely required (e.g. an upstream API break),  ║
 * ║ ASK THE USER FIRST for explicit permission.                      ║
 * ║                                                                  ║
 * ║ See CLAUDE.md → "🚫 DO NOT TOUCH" for the full freeze list.      ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * Catalog Page — Interactive World Map View (Phase 5)
 * Replaces the card grid with a full-screen Mapbox GL world map.
 * Filter state & data fetching are preserved here for use in later phases
 * (filter panel overlays, map markers, side panel, AI chat).
 *
 * Layout:
 *   Desktop (md+): Navbar (h-16) + map fills remaining viewport
 *   Mobile:        MobileHeader from App.tsx (h-14) + map fills remaining viewport
 */

import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import SmartSearchPanel from "@/components/SmartSearchPanel";
import CatalogToolbar, { type ToolbarViewMode } from "@/components/CatalogToolbar";
import GrantGrid from "@/components/GrantGrid";
import CatalogSidebar from "@/components/CatalogSidebar";
import MobileCatalogView, { type MobileCatalogTab } from "@/components/MobileCatalogView";
import { useIsMobile } from "@/hooks/useMobile";
import { type CatalogItem, type CategoryValue, type TypeValue, type RegionCode, type SortValue, REGIONS, CATEGORIES, EU_MEMBER_CODES } from "@/lib/constants";
import { Country, City } from "country-state-city";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLocation, useSearch } from "wouter";
import SEO from "@/components/SEO";
import MapPanel from "@/components/MapPanel";
import MapStatsBar, { type FilterKey } from "@/components/map/MapStatsBar";
import { useSaveEntity } from "@/hooks/useSaveEntity";
const MapFilterPanel  = lazy(() => import("@/components/map/MapFilterPanel"));
const GrantDetailPanel = lazy(() => import("@/components/map/GrantDetailPanel"));
import { useGoogleMapFlyTo } from "@/hooks/useGoogleMapFlyTo";

const PAGE_SIZE = 30;
const PREVIEW_ITEMS = 3;
const SEARCH_DEBOUNCE_MS = 300;

function readFiltersFromURL(search: string) {
  const params = new URLSearchParams(search);
  return {
    category: (params.get("category") || "all") as CategoryValue,
    type: (params.get("type") || "all") as TypeValue,
    search: params.get("q") || "",
    sortBy: (params.get("sort") || "name_asc") as SortValue,
    page: parseInt(params.get("page") || "1", 10) || 1,
    fundingType: params.get("funding") || "all",
    targetDiagnosis: params.get("diagnosis") || "all",
    b2VisaEligible: params.get("b2visa") || "all",
    hasDeadline: params.get("deadline") === "1",
    mapRegionCode: (params.get("region") || "") as RegionCode,
    mapCountryCode: params.get("mc") || "",
    mapStateCode: params.get("ms") || "",
    mapCityName: params.get("mcity") || "",
  };
}

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

export default function Catalog() {
  const search = useSearch();
  const [, navigate] = useLocation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initial = useMemo(() => readFiltersFromURL(search), []);

  // ── Filter state (used in Phase 2 filter panel & Phase 4 markers) ──
  const [selectedCategory, setSelectedCategory] = useState<CategoryValue>(initial.category);
  const [selectedType, setSelectedType] = useState<TypeValue>(initial.type);
  const [searchQuery, setSearchQuery] = useState(initial.search);
  // Smart Search — AI-powered natural-language query that hits the full
  // 640-grant DB (server expands multilingual → terms, then
  // searchGrantsMultiTerm ranks across name/desc/eligibility).
  const [smartQuery, setSmartQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortValue>(initial.sortBy);
  const [page, setPage] = useState(initial.page);
  const [fundingType, setFundingType] = useState(initial.fundingType);
  const [targetDiagnosis, setTargetDiagnosis] = useState(initial.targetDiagnosis);
  const [b2VisaEligible, setB2VisaEligible] = useState(initial.b2VisaEligible);
  const [hasDeadline, setHasDeadline] = useState(initial.hasDeadline);

  // ── Map location state ───────────────────────────────────────────────────
  const [mapRegionCode, setMapRegionCode] = useState<RegionCode>(initial.mapRegionCode);
  const [mapCountryCode, setMapCountryCode] = useState(initial.mapCountryCode);
  const [mapStateCode, setMapStateCode] = useState(initial.mapStateCode);
  const [mapCityName, setMapCityName] = useState(initial.mapCityName);

  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();

  // View mode: map (default) or smart search
  const [viewMode, setViewMode] = useState<"map" | "search">("map");

  // Phase 4A — toolbar-driven layout mode (consumed by Phase 4B renderers).
  const [layoutMode, setLayoutMode] = useState<ToolbarViewMode>("map");
  // Phase 4B — mobile tab switcher state (list | map). Only used below 768 px.
  const [mobileTab, setMobileTab] = useState<MobileCatalogTab>("list");
  const isMobile = useIsMobile();

  // Sync filter state to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedCategory !== "all") params.set("category", selectedCategory);
    if (selectedType !== "all") params.set("type", selectedType);
    if (searchQuery) params.set("q", searchQuery);
    if (sortBy !== "name_asc") params.set("sort", sortBy);
    if (page > 1) params.set("page", String(page));
    if (fundingType !== "all") params.set("funding", fundingType);
    if (targetDiagnosis !== "all") params.set("diagnosis", targetDiagnosis);
    if (b2VisaEligible !== "all") params.set("b2visa", b2VisaEligible);
    if (hasDeadline) params.set("deadline", "1");
    if (mapRegionCode) params.set("region", mapRegionCode);
    if (mapCountryCode) params.set("mc", mapCountryCode);
    if (mapStateCode) params.set("ms", mapStateCode);
    if (mapCityName) params.set("mcity", mapCityName);
    const qs = params.toString();
    navigate(qs ? `/catalog?${qs}` : "/catalog", { replace: true });
  }, [
    selectedCategory, selectedType, searchQuery, sortBy, page,
    fundingType, targetDiagnosis, b2VisaEligible, hasDeadline,
    mapRegionCode, mapCountryCode, mapStateCode, mapCityName, navigate,
  ]);

  const debouncedSearch = useDebouncedValue(searchQuery, SEARCH_DEBOUNCE_MS);

  const { data: subStatus } = trpc.subscription.status.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });

  // Catalog now sources from the organizations tables — the toolbar
  // (region / country / state / city / category / smart search / sort)
  // drives both the list and the map off this single query.
  const orgSortBy = useMemo(() => {
    switch (sortBy) {
      case "name_desc": return "name-desc";
      case "name_asc":  return "name-asc";
      default:          return "name-asc";
    }
  }, [sortBy]);

  const orgInput = useMemo(
    () => ({
      search:   debouncedSearch || undefined,
      category: selectedCategory !== "all" ? selectedCategory : undefined,
      region:   mapRegionCode || undefined,
      country:  mapCountryCode || undefined,
      state:    mapStateCode || undefined,
      city:     mapCityName || undefined,
      sortBy:   orgSortBy,
      page:     subStatus?.isActive ? page : 1,
      pageSize: subStatus?.isActive ? PAGE_SIZE : PREVIEW_ITEMS,
    }),
    [
      debouncedSearch, selectedCategory, orgSortBy,
      page, subStatus?.isActive,
      mapRegionCode, mapCountryCode, mapStateCode, mapCityName,
    ]
  );

  const { data: catalogData } = trpc.organizations.list.useQuery(orgInput, {
    retry: false,
    placeholderData: (prev: any) => prev,
  });

  // Smart Search — enabled once the user types >=2 chars. Server expands
  // the query (multilingual → English terms) and ranks full-text matches
  // across all 538 active organizations, so location/category dropdowns are
  // respected as a pre-filter but the query itself owns the ordering.
  const smartQueryTrimmed = smartQuery.trim();
  const smartEnabled = smartQueryTrimmed.length >= 2;
  const { data: smartData } = trpc.organizations.smartSearch.useQuery(
    {
      query: smartQueryTrimmed,
      country: mapCountryCode || undefined,
      category: selectedCategory !== "all" ? selectedCategory : undefined,
      limit: 30,
    },
    {
      enabled: smartEnabled,
      retry: false,
      staleTime: 60_000,
    },
  );

  // Phase 4A — toolbar data: regions & per-category counts (aggregated server-side).
  const { data: regionCounts } = trpc.organizations.regions.useQuery(undefined, { retry: false });
  const { data: categoryCounts } = trpc.organizations.categoryCounts.useQuery(undefined, { retry: false });

  // Cascading location dropdowns:
  //   Region → Country → State → City. Each query is keyed on the parent
  //   value so options auto-narrow whenever the user picks a higher level.
  //   `enabled` flags skip the network round-trip for empty parents.
  const { data: countryRows } = trpc.organizations.countries.useQuery(
    { region: mapRegionCode || undefined },
    { retry: false },
  );
  const { data: stateRows } = trpc.organizations.states.useQuery(
    { country: mapCountryCode || undefined },
    { retry: false, enabled: !!mapCountryCode },
  );
  const { data: cityRows } = trpc.organizations.cities.useQuery(
    { state: mapStateCode || "" },
    { retry: false, enabled: !!mapStateCode },
  );

  const availableRegions = useMemo(() => {
    const countByCode = new Map<string, number>();
    (regionCounts ?? []).forEach((r) => countByCode.set(r.code, r.count));
    return REGIONS.map((r) => ({
      code: r.code,
      label: r.label,
      flag: r.flag,
      count: countByCode.get(r.code) ?? 0,
    }));
  }, [regionCounts]);

  const availableCategories = useMemo(() => {
    const countById = new Map<string, number>();
    (categoryCounts ?? []).forEach((c) => countById.set(c.category, c.count));
    // Map known admin-panel labels to category values; fall back to a humanised form.
    const labelFor = (value: string): string => {
      const adminKey: Record<string, keyof typeof t.admin | undefined> = {
        medical_treatment:     "catMedicalTreatment",
        financial_assistance:  "catFinancialAssistance",
        assistive_technology:  "catAssistiveTechnology",
        social_services:       "catSocialServices",
        scholarships:          "catScholarships",
        housing:               "catHousing",
        travel_transport:      "catTravelTransport",
        international:         "catInternational",
        business_funding:      "catBusinessFunding",
        other:                 "catOther",
      };
      const key = adminKey[value];
      if (key) return t.admin[key] as string;
      return value.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());
    };
    return CATEGORIES
      .filter((c) => c.value !== "all")
      .map((c) => ({
        id: c.value,
        label: labelFor(c.value),
        count: countById.get(c.value) ?? 0,
        icon: c.icon,
      }))
      .sort((a, b) => b.count - a.count);
  }, [categoryCounts, t.admin]);

  // Country dropdown options. When region === "EU" we intentionally show
  // all 27 EU member states (even those with zero active grants) so the
  // user can filter / flyTo any of them. Non-EU regions stay DB-driven.
  // Labels come from t.country first, then country-state-city's name,
  // then the raw ISO code.
  const availableCountries = useMemo(() => {
    const countryNames = t.country as Record<string, string | undefined>;
    const dbCounts = new Map<string, number>();
    (countryRows ?? []).forEach((r) => dbCounts.set(r.country, r.count));

    const labelFor = (code: string): string => {
      if (countryNames[code]) return countryNames[code] as string;
      return Country.getCountryByCode(code)?.name ?? code;
    };

    if (mapRegionCode === "EU") {
      return EU_MEMBER_CODES.map((code) => ({
        code,
        label: labelFor(code),
        count: dbCounts.get(code) ?? 0,
      })).sort((a, b) => a.label.localeCompare(b.label));
    }

    return (countryRows ?? []).map((r) => ({
      code: r.country,
      label: labelFor(r.country),
      count: r.count,
    }));
  }, [countryRows, t.country, mapRegionCode]);

  // State dropdown options — `state` strings come straight from the DB
  // (e.g. "California"). Pseudo-locations like "Nationwide"/"International"
  // are filtered server-side.
  const availableStates = useMemo(() => {
    return (stateRows ?? []).map((r) => ({
      value: r.state,
      label: r.state,
      count: r.count,
    }));
  }, [stateRows]);

  // City dropdown options.
  //   • US: DB-driven, keyed on the selected state (existing flow).
  //   • Non-US / EU: fall back to country-state-city so the user can pick
  //     a city in a country with no DB grants yet. Capped at 50 alphabetic
  //     results; the map's Google Maps Geocoder resolves the flyTo target.
  const availableCities = useMemo(() => {
    if (mapStateCode && (cityRows?.length ?? 0) > 0) {
      return cityRows!.map((r) => ({ value: r.city, label: r.city, count: r.count }));
    }
    if (mapCountryCode && mapCountryCode !== "US") {
      const all = City.getCitiesOfCountry(mapCountryCode) ?? [];
      // De-duplicate by name (csc sometimes has repeated entries across regions),
      // then sort alphabetically and cap to keep the dropdown usable.
      const seen = new Set<string>();
      const unique: { value: string; label: string; count: number }[] = [];
      for (const c of all) {
        if (!c.name || seen.has(c.name)) continue;
        seen.add(c.name);
        unique.push({ value: c.name, label: c.name, count: 0 });
      }
      return unique
        .sort((a, b) => a.label.localeCompare(b.label))
        .slice(0, 50);
    }
    return [];
  }, [cityRows, mapStateCode, mapCountryCode]);

  const { data: savedData } = trpc.grants.savedList.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });
  const savedSet = useMemo(() => new Set(savedData?.grantIds || []), [savedData]);

  const { toggleSave } = useSaveEntity();

  // When Smart Search is active, map its results to CatalogItem and use
  // them as the display + map source, bypassing the regular list query.
  // Location/category filters still narrow the query server-side.
  const smartItems: CatalogItem[] | null = useMemo(() => {
    if (!smartEnabled || !smartData?.results) return null;
    return smartData.results.map((r) => {
      const firstCategory = (r.categories ?? "")
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean)[0] || "other";
      return {
        id: r.orgId,
        orgId: r.orgId,
        name: r.name,
        organization: r.name,
        description: r.description || "",
        category: firstCategory,
        type: "grant" as const,
        country: r.country,
        eligibility: "",
        website: r.website || "",
        phone: "",
        email: "",
        amount: "",
        status: "",
        applicationProcess: "",
        deadline: "",
        fundingType: "",
        targetDiagnosis: "",
        ageRange: "",
        geographicScope: "",
        documentsRequired: "",
        b2VisaEligible: "",
        state: r.state || "",
        city: r.city || "",
        latitude: r.latitude ?? undefined,
        longitude: r.longitude ?? undefined,
      };
    });
  }, [smartEnabled, smartData]);

  // Adapt organizations rows to CatalogItem. Every catalog card + map
  // marker + detail panel reads from this array, so the shape must match
  // the old grant-based contract even when the underlying data doesn't
  // have deadlines/eligibility/etc. (those stay empty strings).
  const displayItems: CatalogItem[] = useMemo(() => {
    if (smartItems) return smartItems;
    if (catalogData?.organizations) {
      return catalogData.organizations.map((o) => {
        const firstCategory = (o.categories ?? "")
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean)[0] || "other";
        return {
          id: o.orgId,
          orgId: o.orgId,
          name: o.name,
          organization: o.name,
          description: o.description || "",
          category: firstCategory,
          type: "grant" as const,
          country: o.country,
          eligibility: "",
          website: o.website || "",
          phone: o.phone || "",
          email: o.email || "",
          amount: "",
          status: "",
          applicationProcess: "",
          deadline: "",
          fundingType: "",
          targetDiagnosis: "",
          ageRange: "",
          geographicScope: o.serviceArea || "",
          documentsRequired: "",
          b2VisaEligible: "",
          state: o.state || "",
          city: o.city || "",
          latitude: o.latitude ?? undefined,
          longitude: o.longitude ?? undefined,
        };
      });
    }
    return [];
  }, [smartItems, catalogData]);

  // Map markers — fetch ALL matching branches (HQ + Branch rows) from the
  // dedicated mapPoints endpoint so the map stays in sync with the list
  // even when pagination caps displayItems at 30/page.
  const mapPointsInput = useMemo(
    () => ({
      search:   debouncedSearch || undefined,
      category: selectedCategory !== "all" ? selectedCategory : undefined,
      region:   mapRegionCode || undefined,
      country:  mapCountryCode || undefined,
      state:    mapStateCode || undefined,
      city:     mapCityName || undefined,
      limit: 3000,
    }),
    [
      debouncedSearch, selectedCategory,
      mapRegionCode, mapCountryCode, mapStateCode, mapCityName,
    ]
  );
  const { data: mapPointsData } = trpc.organizations.mapPoints.useQuery(
    smartEnabled ? undefined : mapPointsInput,
    { retry: false, enabled: !smartEnabled, placeholderData: (prev: any) => prev },
  );

  const mapItems: CatalogItem[] = useMemo(() => {
    // Smart search: show only ranked results on the map.
    if (smartItems) return smartItems;
    // Default: every matching branch, each as its own marker.
    if (mapPointsData?.points) {
      return mapPointsData.points.map((p: any) => ({
        id: p.branchId,
        orgId: p.orgId,
        name: p.name,
        organization: p.name,
        description: "",
        category: "other",
        type: "grant" as const,
        country: p.country,
        eligibility: "",
        website: "",
        phone: "",
        email: "",
        amount: "",
        status: "",
        applicationProcess: "",
        deadline: "",
        fundingType: "",
        targetDiagnosis: "",
        ageRange: "",
        geographicScope: "",
        documentsRequired: "",
        b2VisaEligible: "",
        state: "",
        city: "",
        latitude: p.latitude,
        longitude: p.longitude,
      }));
    }
    return displayItems;
  }, [smartItems, mapPointsData, displayItems]);

  // Stats bar — number of unique countries in the current result set
  const countryCount = useMemo(
    () => new Set(mapItems.map((g) => g.country).filter(Boolean)).size,
    [mapItems],
  );

  // Stats bar — distinct organizations represented on the map.
  // Map markers are branches (one org can have several branches) so we
  // deduplicate by orgId to avoid double-counting.
  const organizationCount = useMemo(
    () => new Set(mapItems.map((g) => (g as any).orgId).filter(Boolean)).size,
    [mapItems],
  );

  // Stats bar — total active grants + resources in the catalog (global, unfiltered).
  // Surfaces the headline "how many grants are in GrantKit" number that users
  // expect to see alongside organization / location counts.
  const { data: grantStatsData } = trpc.catalog.count.useQuery(undefined, {
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
  const grantCount = grantStatsData?.total;

  const resetFilters = useCallback(() => {
    setSelectedCategory("all");
    setSelectedType("all");
    setSearchQuery("");
    setFundingType("all");
    setTargetDiagnosis("all");
    setB2VisaEligible("all");
    setHasDeadline(false);
    setPage(1);
    setMapRegionCode("");
    setMapCountryCode("");
    setMapStateCode("");
    setMapCityName("");
  }, []);

  // Stats bar — clear a single filter chip
  const handleClearFilter = useCallback((key: FilterKey) => {
    switch (key) {
      case "searchQuery":      setSearchQuery(""); setPage(1); break;
      case "category":         setSelectedCategory("all"); setPage(1); break;
      case "type":             setSelectedType("all"); setPage(1); break;
      case "countryCode":
        setMapRegionCode(""); setMapCountryCode(""); setMapStateCode(""); setMapCityName(""); break;
      case "stateCode":        setMapStateCode(""); setMapCityName(""); break;
      case "cityName":         setMapCityName(""); break;
      case "fundingType":      setFundingType("all"); setPage(1); break;
      case "targetDiagnosis":  setTargetDiagnosis("all"); setPage(1); break;
      case "b2VisaEligible":   setB2VisaEligible("all"); setPage(1); break;
      case "hasDeadline":      setHasDeadline(false); setPage(1); break;
    }
  }, []);

  // Map instance state — used by useGoogleMapFlyTo (country/state/city → camera).
  // MapPanel owns the markers/clustering/hover itself, so we no longer need the
  // old useMapMarkers/useMapHighlight hooks.
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const handleMapReady = useCallback((map: google.maps.Map) => {
    setMapInstance(map);
  }, []);

  // Fly the camera when the user picks a region / country / state / city.
  // Pass `mapItems` so the hook can fitBounds the actually-filtered markers
  // (capped per-filter) instead of falling back to a fixed COUNTRY/STATE/CITY
  // zoom that often left the map looser than the data warranted.
  useGoogleMapFlyTo(
    mapInstance,
    mapRegionCode,
    mapCountryCode,
    mapStateCode,
    mapCityName,
    mapItems,
  );

  // Phase 5 — the currently-selected grant that powers GrantDetailPanel.
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const activeMapItems = mapItems;

  // MapPanel accepts items with direct lat/lng only. Items without coordinates
  // are simply skipped, matching the old useMapMarkers fallback behaviour for
  // non-geocoded grants (until the daily geocoding job fills them in).
  const handleMarkerClick = useCallback(
    (grant: { id: string }) => setSelectedItemId(grant.id),
    [],
  );

  // Phase 4B — split/list/mobile click handlers. Full-item navigation.
  // Items sourced from the organizations table carry an `orgId`; route those
  // clicks to the /organizations/:orgId detail page (with animation + org-scoped
  // AI chat). Legacy grant rows without orgId keep the old /grant/:id route.
  const handleCardNavigate = useCallback(
    (item: CatalogItem) =>
      navigate(item.orgId ? `/organizations/${item.orgId}` : `/grant/${item.id}`),
    [navigate],
  );

  // Phase 5 — detail panel for the selected marker.
  // Prefer displayItems (may carry translations) then fall back to mapItems (full catalog).
  const selectedItem = useMemo(
    () =>
      displayItems.find((g) => g.id === selectedItemId) ??
      mapItems.find((g) => g.id === selectedItemId) ??
      null,
    [displayItems, mapItems, selectedItemId]
  );
  const handleToggleSave = useCallback(() => {
    if (!selectedItemId || !isAuthenticated) return;
    toggleSave(selectedItemId);
  }, [selectedItemId, isAuthenticated, toggleSave]);
  const handleClosePanel = useCallback(() => setSelectedItemId(null), []);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="bg-background">
      <SEO
        title={t.seo.catalogTitle}
        description={t.seo.catalogDescription}
        canonicalPath="/catalog"
        keywords="grant catalog, search grants, medical grants, startup funding, scholarships, financial aid"
      />

      {/* Skip navigation — keyboard users can jump straight to the grant list/map */}
      <a
        href="#catalog-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-[color:var(--brand-green)] focus:text-white focus:rounded-lg focus:text-sm focus:font-medium"
      >
        Skip to catalog
      </a>

      {/* Desktop navbar — h-16 (4rem / 64px). Hidden on mobile; MobileHeader comes from App.tsx. */}
      <Navbar />

      {/*
       * Phase 4A — horizontal catalog toolbar + quick category chips.
       * These sit above the existing filter/view tabs. The segmented
       * Split/Map/List selector is wired to `layoutMode`; Phase 4B will
       * use that value to render the actual layout split.
       */}
      <CatalogToolbar
        smartQuery={smartQuery}
        onSmartQueryChange={(q) => { setSmartQuery(q); setPage(1); }}
        regionFilter={mapRegionCode || null}
        onRegionChange={(code) => {
          setMapRegionCode((code ?? "") as RegionCode);
          // Reset everything below in the cascade — the previously picked
          // country may not belong to the new region.
          setMapCountryCode("");
          setMapStateCode("");
          setMapCityName("");
          setPage(1);
        }}
        countryFilter={mapCountryCode || null}
        onCountryChange={(code) => {
          setMapCountryCode(code ?? "");
          setMapStateCode("");
          setMapCityName("");
          setPage(1);
        }}
        stateFilter={mapStateCode || null}
        onStateChange={(value) => {
          setMapStateCode(value ?? "");
          setMapCityName("");
          setPage(1);
        }}
        cityFilter={mapCityName || null}
        onCityChange={(value) => {
          setMapCityName(value ?? "");
          setPage(1);
        }}
        viewMode={layoutMode}
        onViewChange={setLayoutMode}
        availableRegions={availableRegions}
        availableCountries={availableCountries}
        availableStates={availableStates}
        availableCities={availableCities}
      />

      {/* Smart Search view — replaces map when "Smart Search" tab is active */}
      {viewMode === "search" && (
        <main id="catalog-main" className="min-h-[calc(100dvh-12.25rem)] md:min-h-[calc(100dvh-8.75rem)] bg-background p-4 md:p-6 pb-24 md:pb-8 overflow-auto">
          <SmartSearchPanel />
        </main>
      )}

      {/* Map view — default */}
      {viewMode === "map" && (<>
      {/*
       * Stats bar — h-10 (2.5rem) — shows grant count, country count, active filter chips.
       * Rendered on both mobile and desktop.
       */}
      <MapStatsBar
        totalCount={mapItems.length}
        countryCount={countryCount}
        organizationCount={organizationCount}
        grantCount={grantCount}
        filters={{
          searchQuery,
          category: selectedCategory,
          type: selectedType,
          countryCode: mapCountryCode,
          stateCode: mapStateCode,
          cityName: mapCityName,
          fundingType,
          targetDiagnosis,
          b2VisaEligible,
          hasDeadline,
        }}
        onClearFilter={handleClearFilter}
        onClearAll={resetFilters}
      />

      {/*
       * Phase 4B — layoutMode branching. The outer div owns the height so every
       * layout variant fills the same viewport footprint below the top bars.
       * Mobile always gets the MobileCatalogView tab switcher regardless of
       * layoutMode.
       */}
      <main id="catalog-main" className="relative h-[calc(100dvh-12.25rem)] md:h-[calc(100dvh-8.75rem)]">
        {isMobile ? (
          <MobileCatalogView
            grants={activeMapItems}
            tab={mobileTab}
            onTabChange={setMobileTab}
            onCardClick={handleCardNavigate}
            onMarkerClick={handleCardNavigate}
            onMapReady={handleMapReady}
          />
        ) : layoutMode === "list" ? (
          <div className="flex h-full w-full bg-background">
            <CatalogSidebar
              categoryFilter={selectedCategory}
              onCategoryChange={(c) => { setSelectedCategory(c); setPage(1); }}
              typeFilter={selectedType}
              onTypeChange={(t) => { setSelectedType(t); setPage(1); }}
              availableCategories={availableCategories}
              totalCount={availableCategories.reduce((acc, c) => acc + c.count, 0)}
            />
            <GrantGrid
              grants={activeMapItems}
              onCardClick={handleCardNavigate}
              emptyLabel={t.catalog.noResults}
              className="flex-1"
            />
          </div>
        ) : (
          <>
            <MapPanel
              className="absolute inset-0 w-full h-full"
              grants={activeMapItems as unknown as import("@/components/MapPanel").MapPanelGrant[]}
              highlightedId={selectedItemId}
              onMarkerClick={handleMarkerClick}
              onMapReady={handleMapReady}
            />

            {/* Phase 2 — cascading filter panel overlay (map-only; list view relies on the toolbar) */}
            <Suspense fallback={null}>
              <MapFilterPanel
                regionCode={mapRegionCode}
                countryCode={mapCountryCode}
                stateCode={mapStateCode}
                cityName={mapCityName}
                onRegionChange={setMapRegionCode}
                onCountryChange={setMapCountryCode}
                onStateChange={setMapStateCode}
                onCityChange={setMapCityName}
                selectedCategory={selectedCategory}
                onCategoryChange={(c) => { setSelectedCategory(c); setPage(1); }}
                selectedType={selectedType}
                onTypeChange={(t) => { setSelectedType(t); setPage(1); }}
                totalItems={mapItems.length}
                onClearAll={resetFilters}
                searchQuery={searchQuery}
              />
            </Suspense>

            {/* Phase 5 — detail slide-in panel for map markers. List view card clicks navigate
                to /organizations/:orgId when the row carries orgId, falling back to /grant/:id. */}
            <Suspense fallback={null}>
              <GrantDetailPanel
                item={selectedItem}
                isSaved={selectedItemId ? savedSet.has(selectedItemId) : false}
                onToggleSave={handleToggleSave}
                onClose={handleClosePanel}
              />
            </Suspense>
          </>
        )}
      </main>
      </>)}
    </div>
  );
}
