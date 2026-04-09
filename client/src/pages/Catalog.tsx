/*
 * Catalog Page — Unified Grants & Resources Directory
 * Design: Structured Clarity — dense card grid with sticky filters
 * Mobile: app-like single-column layout with bottom sheet filters
 * Content locked behind authentication + active subscription
 * Data sourced from database via tRPC with full-text multilingual search
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CatalogCard from "@/components/CatalogCard";
import CatalogCardSkeleton from "@/components/CatalogCardSkeleton";
import FilterBar, { type SortValue } from "@/components/FilterBar";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import PricingCTA from "@/components/PricingCTA";
import PullToRefreshIndicator from "@/components/PullToRefreshIndicator";
import { type CatalogItem, type CategoryValue, type CountryValue, type TypeValue } from "@/lib/constants";
import { catalogItems } from "@/data/catalogData";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Lock, LogIn, Loader2, X as XIcon, Search as SearchIcon } from "lucide-react";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import SEO from "@/components/SEO";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useIsMobile } from "@/hooks/useMobile";
import { useLocation, useSearch } from "wouter";

const PAGE_SIZE = 30;
const PREVIEW_ITEMS = 3;
const SEARCH_DEBOUNCE_MS = 300;

// Module-level constants — immune to Vite's minifier variable reordering
const STATIC_CATALOG = catalogItems;
const HAS_STATIC_DATA = STATIC_CATALOG.length > 0;

/** Read filter state from URL search params */
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

/** Custom hook for debounced value */
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
  // Read initial filter state from URL only on mount (empty deps intentional to avoid
  // feedback loop with the URL-sync effect below)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initial = useMemo(() => readFiltersFromURL(search), []);

  const [selectedCategory, setSelectedCategory] = useState<CategoryValue>(initial.category);
  const [selectedCountry, setSelectedCountry] = useState<CountryValue>(initial.country);
  const [selectedType, setSelectedType] = useState<TypeValue>(initial.type);
  const [searchQuery, setSearchQuery] = useState(initial.search);
  const [sortBy, setSortBy] = useState<SortValue>(initial.sortBy);
  const [page, setPage] = useState(initial.page);
  // Enrichment filters
  const [fundingType, setFundingType] = useState(initial.fundingType);
  const [targetDiagnosis, setTargetDiagnosis] = useState(initial.targetDiagnosis);
  const [b2VisaEligible, setB2VisaEligible] = useState(initial.b2VisaEligible);
  const [hasDeadline, setHasDeadline] = useState(initial.hasDeadline);
  const [selectedState, setSelectedState] = useState(initial.state);
  const [selectedCity, setSelectedCity] = useState(initial.city);
  const { t, tCategory, tCountry, language } = useLanguage();
  const { isAuthenticated, loading: authLoading } = useAuth();

  // Sync filter state to URL query params
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
    const newPath = qs ? `/catalog?${qs}` : "/catalog";
    navigate(newPath, { replace: true });
  }, [selectedCategory, selectedCountry, selectedType, searchQuery, sortBy, page, fundingType, targetDiagnosis, b2VisaEligible, hasDeadline, selectedState, selectedCity, navigate]);

  // Debounce search query to avoid excessive API calls
  const debouncedSearch = useDebouncedValue(searchQuery, SEARCH_DEBOUNCE_MS);
  const staticFilteredRef = useRef(STATIC_CATALOG.length);

  // Use module-level constants for static data (avoids Vite minifier TDZ issues)

  const { data: subStatus, isLoading: subLoading } = trpc.subscription.status.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });

  const isMobile = useIsMobile();

  // Pull-to-refresh: invalidate catalog data on pull
  const utils = trpc.useUtils();
  const { state: pullState, pullDistance, progress, containerRef } = usePullToRefresh({
    onRefresh: async () => {
      await Promise.all([
        utils.catalog.list.invalidate(),
        utils.catalog.count.invalidate(),
        utils.grants.savedList.invalidate(),
      ]);
      toast.success(t.catalog.grantsRefreshed);
    },
    enabled: isMobile,
    threshold: 80,
    maxPull: 140,
  });

  // Stabilize query input with debounced search and language
  const catalogInput = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      language: debouncedSearch ? language : undefined,
      category: selectedCategory !== "all" ? selectedCategory : undefined,
      country: selectedCountry !== "all" ? selectedCountry : undefined,
      type: selectedType !== "all" ? selectedType : undefined,
      sortBy,
      fundingType: fundingType !== "all" ? fundingType : undefined,
      targetDiagnosis: targetDiagnosis !== "all" ? targetDiagnosis : undefined,
      b2VisaEligible: b2VisaEligible !== "all" ? b2VisaEligible : undefined,
      hasDeadline: hasDeadline || undefined,
      state: selectedState !== "all" ? selectedState : undefined,
      city: selectedCity !== "all" ? selectedCity : undefined,
      page: (subStatus?.isActive || HAS_STATIC_DATA) ? page : 1,
      pageSize: (subStatus?.isActive || HAS_STATIC_DATA) ? PAGE_SIZE : PREVIEW_ITEMS,
    }),
    [debouncedSearch, language, selectedCategory, selectedCountry, selectedType, sortBy, fundingType, targetDiagnosis, b2VisaEligible, hasDeadline, selectedState, selectedCity, page, subStatus?.isActive, HAS_STATIC_DATA]
  );

  const { data: catalogData, isLoading: catalogLoading, isFetching } = trpc.catalog.list.useQuery(catalogInput, {
    retry: false,
    placeholderData: (prev: any) => prev,
  });

  // Get total count for display
  const { data: countData } = trpc.catalog.count.useQuery(undefined, { retry: false });

  // On static deployments (no API), treat as active so all content is visible
  const isStaticMode = !catalogData && HAS_STATIC_DATA;
  const isActive = isStaticMode || subStatus?.isActive || false;
  const isAuthLoading = isStaticMode ? false : (authLoading || (isAuthenticated && subLoading));

  // Saved grants
  const { data: savedData } = trpc.grants.savedList.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });
  const savedSet = useMemo(() => new Set(savedData?.grantIds || []), [savedData]);

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
      toast.error(t.grantDetail.failedToSave);
    },
    onSettled: () => {
      utils.grants.savedList.invalidate();
    },
  });

  // Map DB results to CatalogItem shape for CatalogCard
  const displayItems: CatalogItem[] = useMemo(() => {
    // If API returned data, use it
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

    // Static fallback: filter and paginate from bundled catalog.json
    if (STATIC_CATALOG) {
      let filtered: any[] = STATIC_CATALOG;
      if (selectedCategory !== "all") filtered = filtered.filter((g: any) => g.category === selectedCategory);
      if (selectedCountry !== "all") filtered = filtered.filter((g: any) => g.country === selectedCountry);
      if (selectedType !== "all") filtered = filtered.filter((g: any) => g.type === selectedType);
      // Extended filters for enriched data
      if (selectedState !== "all") filtered = filtered.filter((g: any) => g.state === selectedState || g.state === "Nationwide");
      if (selectedCity !== "all") filtered = filtered.filter((g: any) => !g.city || g.city === selectedCity);
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
  }, [catalogData, language, STATIC_CATALOG, selectedCategory, selectedCountry, selectedType, selectedState, selectedCity, targetDiagnosis, fundingType, b2VisaEligible, hasDeadline, debouncedSearch, page]);

  const usingStatic = !catalogData?.grants && HAS_STATIC_DATA;
  const totalItems = catalogData?.total || (usingStatic ? staticFilteredRef.current : 0);
  const totalPages = catalogData?.totalPages || (usingStatic ? Math.ceil(staticFilteredRef.current / PAGE_SIZE) : 1);
  const isLoading = isAuthLoading || (catalogLoading && !HAS_STATIC_DATA);
  const isSearching = isFetching && !!debouncedSearch;

  const resetFilters = () => {
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
  };

  return (
    <div ref={containerRef} className="min-h-screen flex flex-col bg-background theme-transition">
      <SEO
        title={t.seo.catalogTitle}
        description={t.seo.catalogDescription}
        canonicalPath="/catalog"
        keywords="grant catalog, search grants, medical grants, startup funding, scholarships, financial aid"
      />
      <Navbar />

      {/* Page header — compact on mobile */}
      <div className="bg-secondary py-6 md:py-10 border-b border-border">
        <div className="container px-4 md:px-0">
          <h1 className="text-xl md:text-3xl font-bold text-foreground tracking-tight mb-1 md:mb-2">
            {t.catalog.title}
          </h1>
          <p className="text-muted-foreground text-sm md:text-base max-w-xl">
            {t.catalog.subtitle}
          </p>
        </div>
      </div>

      {/* Pull-to-refresh indicator — visible only on mobile during gesture */}
      <PullToRefreshIndicator
        state={pullState}
        pullDistance={pullDistance}
        progress={progress}
      />

      {/* Filter bar */}
      <FilterBar
        selectedCategory={selectedCategory}
        selectedCountry={selectedCountry}
        selectedType={selectedType}
        onCategoryChange={(c) => { setSelectedCategory(c); setPage(1); }}
        onCountryChange={(c) => { setSelectedCountry(c); setPage(1); }}
        onTypeChange={(t) => { setSelectedType(t); setPage(1); }}
        itemCount={totalItems}
        searchQuery={searchQuery}
        onSearchChange={(q) => { setSearchQuery(q); setPage(1); }}
        sortBy={sortBy}
        onSortChange={(s) => { setSortBy(s); setPage(1); }}
        fundingType={fundingType}
        onFundingTypeChange={(v) => { setFundingType(v); setPage(1); }}
        targetDiagnosis={targetDiagnosis}
        onTargetDiagnosisChange={(v) => { setTargetDiagnosis(v); setPage(1); }}
        b2VisaEligible={b2VisaEligible}
        onB2VisaChange={(v) => { setB2VisaEligible(v); setPage(1); }}
        hasDeadline={hasDeadline}
        onHasDeadlineChange={(v) => { setHasDeadline(v); setPage(1); }}
        selectedState={selectedState}
        onStateChange={(v) => { setSelectedState(v); setSelectedCity("all"); setPage(1); }}
        selectedCity={selectedCity}
        onCityChange={(v) => { setSelectedCity(v); setPage(1); }}
      />

      {/* Cards grid — single column on mobile, multi on desktop */}
      <div className="container px-4 md:px-0 py-4 md:py-8 flex-1 pb-24 md:pb-8">

        {/* Results summary bar */}
        {!isLoading && displayItems.length > 0 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
            <span>
              <span className="font-semibold text-foreground">{totalItems}</span> {t.catalog.itemsCount}
              {searchQuery && <span> — "{searchQuery}"</span>}
            </span>
          </div>
        )}

        {/* Active filter chips */}
        {(() => {
          const chips: { key: string; label: string; clear: () => void }[] = [];
          if (selectedCategory !== "all") chips.push({ key: "cat", label: tCategory(selectedCategory), clear: () => { setSelectedCategory("all"); setPage(1); } });
          if (selectedType !== "all") chips.push({ key: "type", label: selectedType === "grant" ? t.catalog.typeGrant : t.catalog.typeResource, clear: () => { setSelectedType("all"); setPage(1); } });
          if (selectedState !== "all") chips.push({ key: "state", label: selectedState, clear: () => { setSelectedState("all"); setSelectedCity("all"); setPage(1); } });
          if (selectedCity !== "all") chips.push({ key: "city", label: selectedCity, clear: () => { setSelectedCity("all"); setPage(1); } });
          if (targetDiagnosis !== "all") chips.push({ key: "diag", label: targetDiagnosis, clear: () => { setTargetDiagnosis("all"); setPage(1); } });
          if (fundingType !== "all") chips.push({ key: "fund", label: fundingType, clear: () => { setFundingType("all"); setPage(1); } });
          if (chips.length === 0) return null;
          return (
            <div className="flex flex-wrap gap-2 mb-3">
              {chips.map((f) => (
                <span key={f.key} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full">
                  {f.label}
                  <button onClick={f.clear} className="hover:text-primary/70"><XIcon className="w-3 h-3" /></button>
                </span>
              ))}
              <button onClick={resetFilters} className="text-xs text-destructive hover:underline ml-1">
                {t.catalog.clearFilters}
              </button>
            </div>
          );
        })()}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
            {Array.from({ length: isMobile ? 4 : 9 }).map((_, i) => (
              <CatalogCardSkeleton key={i} index={i} />
            ))}
          </div>
        ) : (
          <>
            {/* Subtle search loading indicator */}
            {isSearching && (
              <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t.catalog.searching}</span>
              </div>
            )}

            {displayItems.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                  {displayItems.map((item, i) => (
                    <CatalogCard
                      key={item.id}
                      item={item}
                      index={i}
                      isSaved={savedSet.has(item.id)}
                      isAuthenticated={isAuthenticated}
                      onToggleSave={(grantId) => toggleSave.mutate({ grantId })}
                    />
                  ))}
                </div>

                {/* Pagination — mobile-friendly with larger touch targets */}
                {isActive && totalPages > 1 && (
                  <div className="mt-6 md:mt-8 flex items-center justify-center gap-1 md:gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-3 md:px-4 py-2.5 md:py-2 text-sm font-medium text-muted-foreground bg-card border border-border rounded-lg active:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      {t.catalog.prev}
                    </button>
                    <div className="flex items-center gap-0.5 md:gap-1">
                      {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                        let pageNum: number;
                        if (totalPages <= 5) pageNum = i + 1;
                        else if (page <= 3) pageNum = i + 1;
                        else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                        else pageNum = page - 2 + i;
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setPage(pageNum)}
                            className={`w-10 h-10 md:w-9 md:h-9 text-sm rounded-lg transition-colors ${
                              page === pageNum
                                ? "bg-primary text-primary-foreground font-semibold"
                                : "text-muted-foreground active:bg-secondary"
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-3 md:px-4 py-2.5 md:py-2 text-sm font-medium text-muted-foreground bg-card border border-border rounded-lg active:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      {t.catalog.next}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="col-span-full py-16 text-center">
                <SearchIcon className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">{t.catalog.noResults}</h3>
                <p className="text-sm text-muted-foreground mb-6">{t.catalog.noResultsHint}</p>
                <div className="flex gap-3 justify-center">
                  <button onClick={resetFilters} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-secondary transition-colors">
                    {t.catalog.clearFilters}
                  </button>
                </div>
              </div>
            )}

            {/* ===== LOCKED CONTENT OVERLAY ===== */}
            {!isActive && (
              <div className="relative mt-4 md:mt-6">
                {/* Blurred placeholder cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 blur-sm opacity-40 pointer-events-none select-none">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-card border border-border rounded-lg p-4 md:p-5 h-40 md:h-48">
                      <div className="h-4 bg-muted rounded w-3/4 mb-3" />
                      <div className="h-3 bg-muted/60 rounded w-1/2 mb-2" />
                      <div className="h-3 bg-muted/60 rounded w-full mb-2" />
                      <div className="h-3 bg-muted/60 rounded w-2/3" />
                    </div>
                  ))}
                </div>

                {/* Lock overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center px-4">
                  <div className="bg-card/95 backdrop-blur-sm border border-border rounded-xl px-6 md:px-8 py-6 md:py-8 text-center shadow-lg max-w-md w-full">
                    <Lock className="w-8 h-8 md:w-10 md:h-10 text-muted-foreground/60 mx-auto mb-3 md:mb-4" />

                    {!isAuthenticated ? (
                      <>
                        <h3 className="text-base md:text-lg font-bold text-foreground mb-2">
                          {t.catalog.memberBanner}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-5 md:mb-6">
                          {t.catalog.subtitle}
                        </p>
                        <div className="flex flex-col gap-3">
                          <a
                            href={getLoginUrl()}
                            className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-primary-foreground bg-primary rounded-xl active:bg-primary/90 transition-colors"
                          >
                            <LogIn className="w-4 h-4" />
                            {t.catalog.loginRegister}
                          </a>
                          <PricingCTA text={t.catalog.ctaButton} />
                        </div>
                      </>
                    ) : (
                      <>
                        <h3 className="text-base md:text-lg font-bold text-foreground mb-2">
                          {t.catalog.ctaTitle}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-5 md:mb-6">
                          {t.catalog.ctaSubtitle}
                        </p>
                        <div className="flex flex-col gap-3">
                          <PricingCTA text={t.catalog.ctaButton} size="large" />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Member CTA - only show for active subscribers at the bottom */}
            {isActive && (
              <div className="mt-8 md:mt-12 bg-secondary rounded-xl p-6 md:p-8 text-center border border-border">
                <h3 className="text-lg md:text-xl font-bold text-foreground mb-2">{t.catalog.ctaTitle}</h3>
                <p className="text-muted-foreground text-sm md:text-base mb-4 md:mb-6 max-w-md mx-auto">{t.catalog.ctaSubtitle}</p>
                <p className="text-brand-green text-sm font-medium">{t.catalog.activeSubscriber}</p>
              </div>
            )}
          </>
        )}
      </div>

      <div className="hidden md:block">
        <Footer />
      </div>
    </div>
  );
}
