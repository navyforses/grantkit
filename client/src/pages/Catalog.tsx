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

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Navbar from "@/components/Navbar";
import { type SortValue } from "@/components/FilterBar";
import { type CatalogItem, type CategoryValue, type CountryValue, type TypeValue } from "@/lib/constants";
import { catalogItems } from "@/data/catalogData";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLocation, useSearch } from "wouter";
import SEO from "@/components/SEO";
import MapView from "@/components/map/MapView";
import MapFilterPanel from "@/components/map/MapFilterPanel";
import { useMapFlyTo } from "@/hooks/useMapFlyTo";
import { useMapMarkers } from "@/components/map/useMapMarkers";
import GrantDetailPanel from "@/components/map/GrantDetailPanel";
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
    country: (params.get("country") || "all") as CountryValue,
    type: (params.get("type") || "all") as TypeValue,
    search: params.get("q") || "",
    sortBy: (params.get("sort") || "name_asc") as SortValue,
    page: parseInt(params.get("page") || "1", 10) || 1,
    fundingType: params.get("funding") || "all",
    targetDiagnosis: params.get("diagnosis") || "all",
    b2VisaEligible: params.get("b2visa") || "all",
    hasDeadline: params.get("deadline") === "1",
    state: params.get("state") || "all",
    city: params.get("city") || "all",
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
  const [selectedCountry, setSelectedCountry] = useState<CountryValue>(initial.country);
  const [selectedType, setSelectedType] = useState<TypeValue>(initial.type);
  const [searchQuery, setSearchQuery] = useState(initial.search);
  const [sortBy, setSortBy] = useState<SortValue>(initial.sortBy);
  const [page, setPage] = useState(initial.page);
  const [fundingType, setFundingType] = useState(initial.fundingType);
  const [targetDiagnosis, setTargetDiagnosis] = useState(initial.targetDiagnosis);
  const [b2VisaEligible, setB2VisaEligible] = useState(initial.b2VisaEligible);
  const [hasDeadline, setHasDeadline] = useState(initial.hasDeadline);
  const [selectedState, setSelectedState] = useState(initial.state);
  const [selectedCity, setSelectedCity] = useState(initial.city);

  // ── Map location state (ISO codes — drives Phase 3 flyTo + filter panel) ──
  const [mapCountryCode, setMapCountryCode] = useState("");
  const [mapStateCode, setMapStateCode] = useState("");
  const [mapCityName, setMapCityName] = useState("");

  const { t, language } = useLanguage();
  const { isAuthenticated } = useAuth();

  // Sync filter state to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedCategory !== "all") params.set("category", selectedCategory);
    if (selectedCountry !== "all") params.set("country", selectedCountry);
    if (selectedType !== "all") params.set("type", selectedType);
    if (searchQuery) params.set("q", searchQuery);
    if (sortBy !== "name_asc") params.set("sort", sortBy);
    if (page > 1) params.set("page", String(page));
    if (fundingType !== "all") params.set("funding", fundingType);
    if (targetDiagnosis !== "all") params.set("diagnosis", targetDiagnosis);
    if (b2VisaEligible !== "all") params.set("b2visa", b2VisaEligible);
    if (hasDeadline) params.set("deadline", "1");
    if (selectedState !== "all") params.set("state", selectedState);
    if (selectedCity !== "all") params.set("city", selectedCity);
    const qs = params.toString();
    navigate(qs ? `/catalog?${qs}` : "/catalog", { replace: true });
  }, [
    selectedCategory, selectedCountry, selectedType, searchQuery, sortBy, page,
    fundingType, targetDiagnosis, b2VisaEligible, hasDeadline,
    selectedState, selectedCity, navigate,
  ]);

  const debouncedSearch = useDebouncedValue(searchQuery, SEARCH_DEBOUNCE_MS);
  const staticFilteredRef = useRef(STATIC_CATALOG.length);

  const { data: subStatus } = trpc.subscription.status.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });

  const catalogInput = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      language: debouncedSearch ? language : undefined,
      category: selectedCategory !== "all" ? selectedCategory : undefined,
      // Map panel location takes priority; fall back to legacy URL-param filters
      country: mapCountryCode || (selectedCountry !== "all" ? selectedCountry : undefined),
      state:   mapStateCode   || (selectedState   !== "all" ? selectedState   : undefined),
      city:    mapCityName    || (selectedCity     !== "all" ? selectedCity    : undefined),
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
      debouncedSearch, language, selectedCategory, selectedCountry, selectedType,
      sortBy, fundingType, targetDiagnosis, b2VisaEligible, hasDeadline,
      selectedState, selectedCity, page, subStatus?.isActive,
      mapCountryCode, mapStateCode, mapCityName,
    ]
  );

  const { data: catalogData } = trpc.catalog.list.useQuery(catalogInput, {
    retry: false,
    placeholderData: (prev: any) => prev,
  });

  const isStaticMode = !catalogData && HAS_STATIC_DATA;

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

      // Map panel location filters (ISO code / city name) take priority over legacy URL params.
      // DB stores country as "US"/"International", state as ISO codes ("CA", "NC"…).
      if (mapCountryCode) {
        filtered = filtered.filter((g: any) => g.country === mapCountryCode);
      } else if (selectedCountry !== "all") {
        filtered = filtered.filter((g: any) => g.country === selectedCountry);
      }
      if (mapStateCode) {
        filtered = filtered.filter((g: any) => !g.state || g.state === "Nationwide" || g.state === mapStateCode);
      } else if (selectedState !== "all") {
        filtered = filtered.filter((g: any) => g.state === selectedState || g.state === "Nationwide");
      }
      if (mapCityName) {
        filtered = filtered.filter((g: any) => !g.city || g.city.toLowerCase() === mapCityName.toLowerCase());
      } else if (selectedCity !== "all") {
        filtered = filtered.filter((g: any) => !g.city || g.city === selectedCity);
      }
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
    catalogData, language, selectedCategory, selectedCountry, selectedType,
    selectedState, selectedCity, targetDiagnosis, fundingType, b2VisaEligible,
    hasDeadline, debouncedSearch, page,
    mapCountryCode, mapStateCode, mapCityName,
  ]);

  const usingStatic = !catalogData?.grants && HAS_STATIC_DATA;
  const totalItems = catalogData?.total || (usingStatic ? staticFilteredRef.current : 0);

  const resetFilters = useCallback(() => {
    setSelectedCategory("all");
    setSelectedCountry("all");
    setSelectedType("all");
    setSearchQuery("");
    setFundingType("all");
    setTargetDiagnosis("all");
    setB2VisaEligible("all");
    setHasDeadline(false);
    setSelectedState("all");
    setSelectedCity("all");
    setPage(1);
    // Also reset map location selectors
    setMapCountryCode("");
    setMapStateCode("");
    setMapCityName("");
  }, []);

  // Map instance — ref for flyTo (no re-render needed), state for markers hook
  const mapInstanceRef = useRef<mapboxgl.Map | null>(null);
  const [mapInstance, setMapInstance] = useState<mapboxgl.Map | null>(null);
  const handleMapReady = useCallback((map: mapboxgl.Map) => {
    mapInstanceRef.current = map;
    setMapInstance(map);
  }, []);

  // Phase 3 — fly to selected location whenever country / state / city changes
  useMapFlyTo(mapInstanceRef, mapCountryCode, mapStateCode, mapCityName);

  // Phase 4 — clustered grant/resource markers; selectedItemId feeds Phase 5
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  useMapMarkers(mapInstance, displayItems, setSelectedItemId);

  // Phase 5 — detail panel for the selected marker
  const selectedItem = useMemo(
    () => displayItems.find((g) => g.id === selectedItemId) ?? null,
    [displayItems, selectedItemId]
  );
  const handleToggleSave = useCallback(() => {
    if (!selectedItemId || !isAuthenticated) return;
    toggleSave.mutate({ grantId: selectedItemId });
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

      {/* Desktop navbar — h-16 (4rem / 64px). Hidden on mobile; MobileHeader comes from App.tsx. */}
      <Navbar />

      {/*
       * Map fills remaining viewport height below whichever header is visible.
       *
       * Mobile (<md):
       *   MobileHeader (sticky h-14 = 3.5rem) — rendered by App.tsx above this page
       *   MobileBottomNav (fixed h-16 = 4rem) — rendered by App.tsx
       *   App.tsx wraps the Router in pb-16 (4rem) to keep content above the bottom nav.
       *   Map height = 100dvh - 3.5rem(header) - 4rem(bottom-pad) = 100dvh - 7.5rem
       *
       * Desktop (md+):
       *   Navbar (h-16 = 4rem) — inside this page, no bottom padding (pb-0)
       *   Map height = 100dvh - 4rem
       *
       * Using dvh (dynamic viewport height) so the map fills the currently-visible
       * viewport even when mobile browser chrome (address bar) shows/hides.
       */}
      {/*
       * overflow-hidden is intentionally omitted here so that
       * SearchableSelect dropdowns inside MapFilterPanel can overflow
       * the panel boundary without being clipped.
       */}
      <div className="relative h-[calc(100dvh-7.5rem)] md:h-[calc(100dvh-4rem)]">
        <MapView
          className="absolute inset-0 w-full h-full"
          onMapReady={handleMapReady}
        />

        {/* Phase 2 — cascading filter panel overlay */}
        <MapFilterPanel
          countryCode={mapCountryCode}
          stateCode={mapStateCode}
          cityName={mapCityName}
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

        {/* Phase 5 — grant detail slide-in panel */}
        <GrantDetailPanel
          item={selectedItem}
          isSaved={selectedItemId ? savedSet.has(selectedItemId) : false}
          onToggleSave={handleToggleSave}
          onClose={handleClosePanel}
        />
      </div>
    </div>
  );
}
