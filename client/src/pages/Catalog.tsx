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
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Lock, LogIn, Loader2 } from "lucide-react";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import SEO from "@/components/SEO";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useIsMobile } from "@/hooks/useMobile";

const PAGE_SIZE = 30;
const PREVIEW_ITEMS = 3;
const SEARCH_DEBOUNCE_MS = 300;

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
  const [selectedCategory, setSelectedCategory] = useState<CategoryValue>("all");
  const [selectedCountry, setSelectedCountry] = useState<CountryValue>("all");
  const [selectedType, setSelectedType] = useState<TypeValue>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortValue>("name_asc");
  const [page, setPage] = useState(1);
  // Enrichment filters
  const [fundingType, setFundingType] = useState("all");
  const [targetDiagnosis, setTargetDiagnosis] = useState("all");
  const [b2VisaEligible, setB2VisaEligible] = useState("all");
  const [hasDeadline, setHasDeadline] = useState(false);
  const [selectedState, setSelectedState] = useState("all");
  const [selectedCity, setSelectedCity] = useState("all");
  const { t, tCategory, tCountry, language } = useLanguage();
  const { isAuthenticated, loading: authLoading } = useAuth();

  // Debounce search query to avoid excessive API calls
  const debouncedSearch = useDebouncedValue(searchQuery, SEARCH_DEBOUNCE_MS);

  const { data: subStatus, isLoading: subLoading } = trpc.subscription.status.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });

  const isActive = subStatus?.isActive || false;
  const isAuthLoading = authLoading || (isAuthenticated && subLoading);
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
      toast.success("Grants refreshed");
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
      page: isActive ? page : 1,
      pageSize: isActive ? PAGE_SIZE : PREVIEW_ITEMS,
    }),
    [debouncedSearch, language, selectedCategory, selectedCountry, selectedType, sortBy, fundingType, targetDiagnosis, b2VisaEligible, hasDeadline, selectedState, selectedCity, page, isActive]
  );

  const { data: catalogData, isLoading: catalogLoading, isFetching } = trpc.catalog.list.useQuery(catalogInput, {
    retry: false,
    placeholderData: (prev: any) => prev,
  });

  // Get total count for display
  const { data: countData } = trpc.catalog.count.useQuery(undefined, { retry: false });

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
      toast.error("Failed to save grant");
    },
    onSettled: () => {
      utils.grants.savedList.invalidate();
    },
  });

  // Map DB results to CatalogItem shape for CatalogCard
  const displayItems: CatalogItem[] = useMemo(() => {
    if (!catalogData?.grants) return [];
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
  }, [catalogData, language]);

  const totalItems = catalogData?.total || 0;
  const totalPages = catalogData?.totalPages || 1;
  const isLoading = isAuthLoading || catalogLoading;
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
    setPage(1);
  };

  return (
    <div ref={containerRef} className="min-h-screen flex flex-col bg-gray-50/30">
      <SEO
        title="Browse Grants & Resources"
        description="Search and filter 600+ grants for medical treatment, financial assistance, academic scholarships, and startup funding. Find the right grant for you."
        canonicalPath="/catalog"
        keywords="grant catalog, search grants, medical grants, startup funding, scholarships, financial aid"
      />
      <Navbar />

      {/* Page header — compact on mobile */}
      <div className="bg-[#0f172a] py-6 md:py-10">
        <div className="container px-4 md:px-0">
          <h1 className="text-xl md:text-3xl font-bold text-white tracking-tight mb-1 md:mb-2">
            {t.catalog.title}
          </h1>
          <p className="text-blue-200/70 text-sm md:text-base max-w-xl">
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
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {Array.from({ length: isMobile ? 4 : 9 }).map((_, i) => (
              <CatalogCardSkeleton key={i} index={i} />
            ))}
          </div>
        ) : (
          <>
            {/* Subtle search loading indicator */}
            {isSearching && (
              <div className="flex items-center gap-2 mb-3 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Searching...</span>
              </div>
            )}

            {displayItems.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
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
                      className="px-3 md:px-4 py-2.5 md:py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg active:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      Prev
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
                                ? "bg-[#1e3a5f] text-white font-semibold"
                                : "text-gray-600 active:bg-gray-100"
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
                      className="px-3 md:px-4 py-2.5 md:py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg active:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-16 md:py-20">
                <p className="text-gray-500 text-base md:text-lg mb-2">{t.catalog.noResults}</p>
                <button
                  onClick={resetFilters}
                  className="text-sm text-[#1e3a5f] active:underline"
                >
                  {t.catalog.clearFilters}
                </button>
              </div>
            )}

            {/* ===== LOCKED CONTENT OVERLAY ===== */}
            {!isActive && (
              <div className="relative mt-4 md:mt-6">
                {/* Blurred placeholder cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 blur-sm opacity-40 pointer-events-none select-none">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 md:p-5 h-40 md:h-48">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
                      <div className="h-3 bg-gray-100 rounded w-1/2 mb-2" />
                      <div className="h-3 bg-gray-100 rounded w-full mb-2" />
                      <div className="h-3 bg-gray-100 rounded w-2/3" />
                    </div>
                  ))}
                </div>

                {/* Lock overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center px-4">
                  <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl px-6 md:px-8 py-6 md:py-8 text-center shadow-lg max-w-md w-full">
                    <Lock className="w-8 h-8 md:w-10 md:h-10 text-gray-400 mx-auto mb-3 md:mb-4" />

                    {!isAuthenticated ? (
                      <>
                        <h3 className="text-base md:text-lg font-bold text-[#0f172a] mb-2">
                          {t.catalog.memberBanner}
                        </h3>
                        <p className="text-sm text-gray-500 mb-5 md:mb-6">
                          {t.catalog.subtitle}
                        </p>
                        <div className="flex flex-col gap-3">
                          <a
                            href={getLoginUrl()}
                            className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-[#1e3a5f] rounded-xl active:bg-[#0f172a] transition-colors"
                          >
                            <LogIn className="w-4 h-4" />
                            Login / Register
                          </a>
                          <PricingCTA text={t.catalog.ctaButton} />
                        </div>
                      </>
                    ) : (
                      <>
                        <h3 className="text-base md:text-lg font-bold text-[#0f172a] mb-2">
                          {t.catalog.ctaTitle}
                        </h3>
                        <p className="text-sm text-gray-500 mb-5 md:mb-6">
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
              <div className="mt-8 md:mt-12 bg-[#0f172a] rounded-xl p-6 md:p-8 text-center">
                <h3 className="text-lg md:text-xl font-bold text-white mb-2">{t.catalog.ctaTitle}</h3>
                <p className="text-blue-200/70 text-sm md:text-base mb-4 md:mb-6 max-w-md mx-auto">{t.catalog.ctaSubtitle}</p>
                <p className="text-green-400 text-sm font-medium">Active Subscriber</p>
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
