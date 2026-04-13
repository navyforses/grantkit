/*
 * Catalog Page — Interactive World Map View (Phase 5)
 * Replaces the card grid with a full-screen Mapbox GL world map.
 * Filter state & data fetching are preserved here for use in later phases
 * (filter panel overlays, map markers, side panel, AI chat).
 *
 * Layout:
 *   Desktop (md+): Navbar (h-16) + map fills remaining viewport
 *   Mobile:        MobileHeader from App.tsx (h-14) + map fills remaining viewport
 */

import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Navbar from "@/components/Navbar";
import { type SortValue } from "@/components/FilterBar";
import { type CatalogItem, type CategoryValue, type TypeValue, type RegionCode, EU_MEMBER_CODES } from "@/lib/constants";
import { catalogItems } from "@/data/catalogData";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLocation, useSearch } from "wouter";
import SEO from "@/components/SEO";
import MapView from "@/components/map/MapView";
import MapStatsBar, { type FilterKey } from "@/components/map/MapStatsBar";
import ResourceTypeTabs from "@/components/ResourceTypeTabs";
import { useResources } from "@/hooks/useResources";
import type { ResourceType } from "@/types/resources";
const MapFilterPanel  = lazy(() => import("@/components/map/MapFilterPanel"));
const GrantDetailPanel = lazy(() => import("@/components/map/GrantDetailPanel"));
import { useMapFlyTo } from "@/hooks/useMapFlyTo";
import { useMapHighlight } from "@/hooks/useMapHighlight";
import { useMapMarkers } from "@/components/map/useMapMarkers";
import type mapboxgl from "mapbox-gl";

const PAGE_SIZE = 30;
const PREVIEW_ITEMS = 3;
const SEARCH_DEBOUNCE_MS = 300;

const STATIC_CATALOG = catalogItems;
const HAS_STATIC_DATA = STATIC_CATALOG.length > 0;

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

  const { t, language } = useLanguage();
  const { isAuthenticated } = useAuth();

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
  const staticFilteredRef = useRef(STATIC_CATALOG.length);

  // ── Supabase resource type switcher ─────────────────────────────────────────
  // undefined means default grant view (existing data); SOCIAL/MEDICAL → Supabase
  const [supabaseResourceType, setSupabaseResourceType] = useState<ResourceType | undefined>(undefined);
  const isSupabaseView = supabaseResourceType === "SOCIAL" || supabaseResourceType === "MEDICAL";

  const { data: supabaseResources, loading: supabaseLoading } = useResources(
    isSupabaseView ? supabaseResourceType : undefined
  );

  // Convert Supabase ResourceFull → CatalogItem-compatible shape for map markers
  const supabaseMapItems: CatalogItem[] = useMemo(() => {
    if (!isSupabaseView) return [];
    return supabaseResources.map((r): CatalogItem => ({
      id: r.id,
      name: r.title,
      organization: r.source_name ?? "",
      description: r.description,
      category: r.categories?.[0]?.id ?? "other",
      type: "resource" as const,
      country: r.locations?.[0]?.country_code ?? "",
      eligibility: r.eligibility_details ?? "",
      website: r.source_url ?? "",
      phone: "",
      email: "",
      amount: r.amount_min != null ? `${r.amount_min}` : "",
      status: r.status === "OPEN" ? "Open" : r.status,
      applicationProcess: "",
      deadline: r.deadline ?? "",
      fundingType: "",
      targetDiagnosis: "",
      ageRange: "",
      geographicScope: "",
      documentsRequired: "",
      b2VisaEligible: "",
      state: r.locations?.[0]?.region_name ?? "",
      city: "",
      latitude: r.latitude,
      longitude: r.longitude,
      resourceSlug: r.slug,
      resourceType: r.resource_type,
    }));
  }, [isSupabaseView, supabaseResources]);

  const { data: subStatus } = trpc.subscription.status.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });

  const catalogInput = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      language: debouncedSearch ? language : undefined,
      category: selectedCategory !== "all" ? selectedCategory : undefined,
      country: mapCountryCode || undefined,
      state:   mapStateCode   || undefined,
      city:    mapCityName    || undefined,
      type: selectedType !== "all" ? selectedType : undefined,
      sortBy,
      fundingType: fundingType !== "all" ? fundingType : undefined,
      targetDiagnosis: targetDiagnosis !== "all" ? targetDiagnosis : undefined,
      b2VisaEligible: b2VisaEligible !== "all" ? b2VisaEligible : undefined,
      hasDeadline: hasDeadline || undefined,
      page: (subStatus?.isActive || HAS_STATIC_DATA) ? page : 1,
      pageSize: (subStatus?.isActive || HAS_STATIC_DATA) ? PAGE_SIZE : PREVIEW_ITEMS,
    }),
    [
      debouncedSearch, language, selectedCategory, selectedType,
      sortBy, fundingType, targetDiagnosis, b2VisaEligible, hasDeadline,
      page, subStatus?.isActive,
      mapCountryCode, mapStateCode, mapCityName,
    ]
  );

  const { data: catalogData } = trpc.catalog.list.useQuery(catalogInput, {
    retry: false,
    placeholderData: (prev: any) => prev,
  });

  const { data: savedData } = trpc.grants.savedList.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });
  const savedSet = useMemo(() => new Set(savedData?.grantIds || []), [savedData]);

  const utils = trpc.useUtils();
  const toggleSave = trpc.grants.toggleSave.useMutation({
    onMutate: async ({ grantId }) => {
      await utils.grants.savedList.cancel();
      const prev = utils.grants.savedList.getData();
      utils.grants.savedList.setData(undefined, (old) => {
        if (!old) return { grantIds: [grantId] };
        const ids = old.grantIds.includes(grantId)
          ? old.grantIds.filter((id) => id !== grantId)
          : [...old.grantIds, grantId];
        return { grantIds: ids };
      });
      return { prev };
    },
    onError: (_err: unknown, _vars: unknown, ctx: { prev?: { grantIds: string[] } } | undefined) => {
      if (ctx?.prev) utils.grants.savedList.setData(undefined, ctx.prev);
    },
    onSettled: () => utils.grants.savedList.invalidate(),
  });

  // Map items to CatalogItem shape (used in Phase 4 for map markers)
  const displayItems: CatalogItem[] = useMemo(() => {
    if (catalogData?.grants) {
      return catalogData.grants.map((g) => {
        const trans = (g as any).translations?.[language];
        return {
          id: g.id,
          name: trans?.name || g.name,
          organization: g.organization,
          description: trans?.description || g.description,
          category: g.category,
          type: g.type as "grant" | "resource",
          country: g.country,
          eligibility: trans?.eligibility || g.eligibility,
          website: g.website,
          phone: g.phone,
          email: g.email,
          amount: g.amount,
          status: g.status,
          applicationProcess: g.applicationProcess,
          deadline: g.deadline,
          fundingType: g.fundingType,
          targetDiagnosis: g.targetDiagnosis,
          ageRange: g.ageRange,
          geographicScope: g.geographicScope,
          documentsRequired: g.documentsRequired,
          b2VisaEligible: g.b2VisaEligible,
          state: g.state,
          city: g.city,
        };
      });
    }
    if (STATIC_CATALOG) {
      let filtered: any[] = STATIC_CATALOG;
      if (selectedCategory !== "all") filtered = filtered.filter((g: any) => g.category === selectedCategory);
      if (selectedType !== "all") filtered = filtered.filter((g: any) => g.type === selectedType);
      if (mapCountryCode) filtered = filtered.filter((g: any) => g.country === mapCountryCode);
      if (mapStateCode) filtered = filtered.filter((g: any) => !g.state || g.state === "Nationwide" || g.state === mapStateCode);
      if (mapCityName) filtered = filtered.filter((g: any) => !g.city || g.city.toLowerCase() === mapCityName.toLowerCase());
      if (targetDiagnosis !== "all") filtered = filtered.filter((g: any) => g.targetDiagnosis === targetDiagnosis || g.targetDiagnosis === "General");
      if (fundingType !== "all") filtered = filtered.filter((g: any) => g.fundingType === fundingType);
      if (b2VisaEligible !== "all") filtered = filtered.filter((g: any) => g.b2VisaEligible === b2VisaEligible);
      if (hasDeadline) filtered = filtered.filter((g: any) => g.deadline && g.deadline !== "");
      if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase();
        filtered = filtered.filter((g: any) =>
          (g.name || "").toLowerCase().includes(q) ||
          (g.organization || "").toLowerCase().includes(q) ||
          (g.description || "").toLowerCase().includes(q)
        );
      }
      staticFilteredRef.current = filtered.length;
      const start = (page - 1) * PAGE_SIZE;
      return filtered.slice(start, start + PAGE_SIZE).map((g: any) => ({
        ...g,
        type: g.type as "grant" | "resource",
      }));
    }
    return [];
  }, [
    catalogData, language, selectedCategory, selectedType,
    targetDiagnosis, fundingType, b2VisaEligible,
    hasDeadline, debouncedSearch, page,
    mapCountryCode, mapStateCode, mapCityName,
  ]);

  const usingStatic = !catalogData?.grants && HAS_STATIC_DATA;
  const totalItems = catalogData?.total || (usingStatic ? staticFilteredRef.current : 0);

  // Map items — ALL filtered items for markers (no pagination).
  // displayItems is capped at 30/page; mapItems uses the full static catalog so every
  // matching grant appears on the map regardless of which page the user is on.
  const mapItems: CatalogItem[] = useMemo(() => {
    if (HAS_STATIC_DATA) {
      let filtered: any[] = STATIC_CATALOG;
      if (selectedCategory !== "all") filtered = filtered.filter((g: any) => g.category === selectedCategory);
      if (selectedType !== "all") filtered = filtered.filter((g: any) => g.type === selectedType);
      // Region filter: EU = any of 27 member countries; US/GB = exact match; empty = all
      if (mapRegionCode === "EU" && !mapCountryCode) {
        filtered = filtered.filter((g: any) => EU_MEMBER_CODES.includes(g.country));
      } else if (mapCountryCode) {
        filtered = filtered.filter((g: any) => g.country === mapCountryCode);
      } else if (mapRegionCode === "US") {
        filtered = filtered.filter((g: any) => g.country === "US");
      } else if (mapRegionCode === "GB") {
        filtered = filtered.filter((g: any) => g.country === "GB");
      }
      if (mapStateCode) filtered = filtered.filter((g: any) => !g.state || g.state === "Nationwide" || g.state === mapStateCode);
      if (mapCityName) filtered = filtered.filter((g: any) => !g.city || g.city.toLowerCase() === mapCityName.toLowerCase());
      if (targetDiagnosis !== "all") filtered = filtered.filter((g: any) => g.targetDiagnosis === targetDiagnosis || g.targetDiagnosis === "General");
      if (fundingType !== "all") filtered = filtered.filter((g: any) => g.fundingType === fundingType);
      if (b2VisaEligible !== "all") filtered = filtered.filter((g: any) => g.b2VisaEligible === b2VisaEligible);
      if (hasDeadline) filtered = filtered.filter((g: any) => g.deadline && g.deadline !== "");
      if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase();
        filtered = filtered.filter((g: any) =>
          (g.name || "").toLowerCase().includes(q) ||
          (g.organization || "").toLowerCase().includes(q) ||
          (g.description || "").toLowerCase().includes(q)
        );
      }
      // Snap "Nationwide" items to the selected state/city so their markers appear
      // near the chosen location rather than at the country centre (which would be
      // off-screen after flyTo zooms into the selected state/city).
      return filtered.map((g: any) => {
        const isNationwide = !g.state || /^(nationwide|national)/i.test(g.state.trim());
        return {
          ...g,
          type: g.type as "grant" | "resource",
          state: isNationwide && mapStateCode ? mapStateCode : g.state,
          city:  isNationwide && mapCityName && mapStateCode ? mapCityName : g.city,
        };
      });
    }
    // No static data — fall back to current-page items
    return displayItems;
  }, [
    selectedCategory, selectedType, mapRegionCode, mapCountryCode, mapStateCode, mapCityName,
    targetDiagnosis, fundingType, b2VisaEligible, hasDeadline, debouncedSearch,
    displayItems,
  ]);

  // Stats bar — number of unique countries in the current result set
  const countryCount = useMemo(
    () => new Set(mapItems.map((g) => g.country).filter(Boolean)).size,
    [mapItems],
  );

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

  // Map instance state — shared by useMapFlyTo and useMapMarkers
  const [mapInstance, setMapInstance] = useState<mapboxgl.Map | null>(null);
  const handleMapReady = useCallback((map: mapboxgl.Map) => {
    setMapInstance(map);
  }, []);

  // Phase 3 — fly to selected location whenever region / country / state / city changes
  useMapFlyTo(mapInstance, mapRegionCode, mapCountryCode, mapStateCode, mapCityName);
  // Phase 3b — country/region polygon highlight
  useMapHighlight(mapInstance, mapRegionCode, mapCountryCode, mapStateCode, mapCityName);

  // Phase 4 — clustered grant/resource markers; selectedItemId feeds Phase 5.
  // mapItems (all filtered items, not paginated) is used so every visible marker
  // can be clicked even when it is not on the current display page.
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  // When in Supabase view (SOCIAL/MEDICAL), show Supabase geo-tagged items on the map
  const activeMapItems = isSupabaseView ? supabaseMapItems : mapItems;
  useMapMarkers(mapInstance, activeMapItems, setSelectedItemId);

  // Phase 5 — detail panel for the selected marker.
  // Prefer displayItems (may carry translations) then fall back to mapItems (full catalog).
  const selectedItem = useMemo(
    () =>
      displayItems.find((g) => g.id === selectedItemId) ??
      mapItems.find((g) => g.id === selectedItemId) ??
      supabaseMapItems.find((g) => g.id === selectedItemId) ??
      null,
    [displayItems, mapItems, supabaseMapItems, selectedItemId]
  );
  const toggleSaveMutateRef = useRef(toggleSave.mutate);
  toggleSaveMutateRef.current = toggleSave.mutate;
  const handleToggleSave = useCallback(() => {
    if (!selectedItemId || !isAuthenticated) return;
    toggleSaveMutateRef.current({ grantId: selectedItemId });
  }, [selectedItemId, isAuthenticated]);
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

      {/* Desktop navbar — h-16 (4rem / 64px). Hidden on mobile; MobileHeader comes from App.tsx. */}
      <Navbar />

      {/* Resource type switcher — slim bar above stats bar */}
      <div className="bg-background/95 backdrop-blur-sm border-b border-border px-3 py-1.5 flex items-center gap-2">
        <ResourceTypeTabs
          value={supabaseResourceType}
          onChange={setSupabaseResourceType}
          counts={{ GRANT: mapItems.length }}
        />
        {isSupabaseView && supabaseLoading && (
          <span className="text-xs text-muted-foreground ml-2">Loading…</span>
        )}
        {isSupabaseView && !supabaseLoading && (
          <span className="text-xs text-muted-foreground ml-2">
            {supabaseResources.length} resources
          </span>
        )}
      </div>

      {/*
       * Stats bar — h-10 (2.5rem) — shows grant count, country count, active filter chips.
       * Rendered on both mobile and desktop.
       */}
      <MapStatsBar
        totalCount={isSupabaseView ? supabaseResources.length : mapItems.length}
        countryCount={countryCount}
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
       * Map fills remaining viewport height below whichever header is visible.
       *
       * Mobile (<md):
       *   MobileHeader (sticky h-14 = 3.5rem) — rendered by App.tsx above this page
       *   StatsBar     (h-10 = 2.5rem)
       *   MobileBottomNav (fixed h-16 = 4rem) — rendered by App.tsx
       *   App.tsx wraps the Router in pb-16 (4rem) to keep content above the bottom nav.
       *   Map height = 100dvh - 3.5rem(header) - 2.5rem(stats) - 4rem(bottom-pad) = 100dvh - 10rem
       *
       * Desktop (md+):
       *   Navbar   (h-16 = 4rem) — inside this page
       *   StatsBar (h-10 = 2.5rem)
       *   Map height = 100dvh - 4rem - 2.5rem = 100dvh - 6.5rem
       *
       * Using dvh (dynamic viewport height) so the map fills the currently-visible
       * viewport even when mobile browser chrome (address bar) shows/hides.
       */}
      {/*
       * overflow-hidden is intentionally omitted here so that
       * SearchableSelect dropdowns inside MapFilterPanel can overflow
       * the panel boundary without being clipped.
       */}
      {/* Map height adjusted to account for the additional ResourceTypeTabs bar (~2.25rem) */}
      <div className="relative h-[calc(100dvh-12.25rem)] md:h-[calc(100dvh-8.75rem)]">
        <MapView
          className="absolute inset-0 w-full h-full"
          onMapReady={handleMapReady}
          ariaLabel={t.catalog.title}
        />

        {/* Phase 2 — cascading filter panel overlay (lazy-loaded to defer country-state-city chunk) */}
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
            totalItems={totalItems}
            onClearAll={resetFilters}
          />
        </Suspense>

        {/* Phase 5 — grant detail slide-in panel (lazy: loads after map, not on homepage) */}
        <Suspense fallback={null}>
          <GrantDetailPanel
            item={selectedItem}
            isSaved={selectedItemId ? savedSet.has(selectedItemId) : false}
            onToggleSave={handleToggleSave}
            onClose={handleClosePanel}
          />
        </Suspense>
      </div>
    </div>
  );
}
