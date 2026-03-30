/*
 * Catalog Page — Unified Grants & Resources Directory
 * Design: Structured Clarity — dense card grid with sticky filters
 * Content locked behind authentication + active subscription
 * Data sourced from database via tRPC
 */

import { useMemo, useState } from "react";
import CatalogCard from "@/components/CatalogCard";
import FilterBar, { type SortValue } from "@/components/FilterBar";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import PricingCTA from "@/components/PricingCTA";
import { type CatalogItem, type CategoryValue, type CountryValue, type TypeValue } from "@/lib/constants";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Lock, LogIn, Loader2 } from "lucide-react";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";

const PAGE_SIZE = 30;
const PREVIEW_ITEMS = 3;

export default function Catalog() {
  const [selectedCategory, setSelectedCategory] = useState<CategoryValue>("all");
  const [selectedCountry, setSelectedCountry] = useState<CountryValue>("all");
  const [selectedType, setSelectedType] = useState<TypeValue>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortValue>("name_asc");
  const [page, setPage] = useState(1);
  const { t, tCategory, tCountry, language } = useLanguage();
  const { isAuthenticated, loading: authLoading } = useAuth();

  const { data: subStatus, isLoading: subLoading } = trpc.subscription.status.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });

  const isActive = subStatus?.isActive || false;
  const isAuthLoading = authLoading || (isAuthenticated && subLoading);

  // Stabilize query input
  const catalogInput = useMemo(
    () => ({
      search: searchQuery || undefined,
      category: selectedCategory !== "all" ? selectedCategory : undefined,
      country: selectedCountry !== "all" ? selectedCountry : undefined,
      type: selectedType !== "all" ? selectedType : undefined,
      sortBy,
      page: isActive ? page : 1,
      pageSize: isActive ? PAGE_SIZE : PREVIEW_ITEMS,
    }),
    [searchQuery, selectedCategory, selectedCountry, selectedType, sortBy, page, isActive]
  );

  const { data: catalogData, isLoading: catalogLoading } = trpc.catalog.list.useQuery(catalogInput, {
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
      // Use translations for current language if available
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
      };
    });
  }, [catalogData, language]);

  const totalItems = catalogData?.total || 0;
  const totalPages = catalogData?.totalPages || 1;
  const isLoading = isAuthLoading || catalogLoading;

  const resetFilters = () => {
    setSelectedCategory("all");
    setSelectedCountry("all");
    setSelectedType("all");
    setSearchQuery("");
    setPage(1);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50/30">
      <Navbar />

      {/* Page header */}
      <div className="bg-[#0f172a] py-10">
        <div className="container">
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-2">
            {t.catalog.title}
          </h1>
          <p className="text-blue-200/70 max-w-xl">
            {t.catalog.subtitle}
          </p>
        </div>
      </div>

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
      />

      {/* Cards grid */}
      <div className="container py-8 flex-1">
        {isLoading ? (
          <div className="text-center py-20">
            <div className="w-8 h-8 border-2 border-[#1e3a5f] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500">Loading...</p>
          </div>
        ) : (
          <>
            {displayItems.length > 0 ? (
              <>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
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

                {/* Pagination — only for active subscribers */}
                {isActive && totalPages > 1 && (
                  <div className="mt-8 flex items-center justify-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      Previous
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                        let pageNum: number;
                        if (totalPages <= 7) pageNum = i + 1;
                        else if (page <= 4) pageNum = i + 1;
                        else if (page >= totalPages - 3) pageNum = totalPages - 6 + i;
                        else pageNum = page - 3 + i;
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setPage(pageNum)}
                            className={`w-9 h-9 text-sm rounded-lg transition-colors ${
                              page === pageNum
                                ? "bg-[#1e3a5f] text-white font-semibold"
                                : "text-gray-600 hover:bg-gray-100"
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
                      className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-20">
                <p className="text-gray-500 text-lg mb-2">{t.catalog.noResults}</p>
                <button
                  onClick={resetFilters}
                  className="text-sm text-[#1e3a5f] hover:underline"
                >
                  {t.catalog.clearFilters}
                </button>
              </div>
            )}

            {/* ===== LOCKED CONTENT OVERLAY ===== */}
            {!isActive && (
              <div className="relative mt-6">
                {/* Blurred placeholder cards */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 blur-sm opacity-40 pointer-events-none select-none">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-white border border-gray-200 rounded-lg p-5 h-48">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
                      <div className="h-3 bg-gray-100 rounded w-1/2 mb-2" />
                      <div className="h-3 bg-gray-100 rounded w-full mb-2" />
                      <div className="h-3 bg-gray-100 rounded w-2/3" />
                    </div>
                  ))}
                </div>

                {/* Lock overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl px-8 py-8 text-center shadow-lg max-w-md">
                    <Lock className="w-10 h-10 text-gray-400 mx-auto mb-4" />

                    {!isAuthenticated ? (
                      <>
                        <h3 className="text-lg font-bold text-[#0f172a] mb-2">
                          {t.catalog.memberBanner}
                        </h3>
                        <p className="text-sm text-gray-500 mb-6">
                          {t.catalog.subtitle}
                        </p>
                        <div className="flex flex-col gap-3">
                          <a
                            href={getLoginUrl()}
                            className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-[#1e3a5f] rounded-lg hover:bg-[#0f172a] transition-colors"
                          >
                            <LogIn className="w-4 h-4" />
                            Login / Register
                          </a>
                          <PricingCTA text={t.catalog.ctaButton} />
                        </div>
                      </>
                    ) : (
                      <>
                        <h3 className="text-lg font-bold text-[#0f172a] mb-2">
                          {t.catalog.ctaTitle}
                        </h3>
                        <p className="text-sm text-gray-500 mb-6">
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
              <div className="mt-12 bg-[#0f172a] rounded-xl p-8 text-center">
                <h3 className="text-xl font-bold text-white mb-2">{t.catalog.ctaTitle}</h3>
                <p className="text-blue-200/70 mb-6 max-w-md mx-auto">{t.catalog.ctaSubtitle}</p>
                <p className="text-green-400 text-sm font-medium">Active Subscriber</p>
              </div>
            )}
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}
