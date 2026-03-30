/*
 * Catalog Page — Unified Grants & Resources Directory
 * Design: Structured Clarity — dense card grid with sticky filters
 * Content locked behind authentication + active subscription
 */

import { useMemo, useState } from "react";
import CatalogCard from "@/components/CatalogCard";
import FilterBar, { type SortValue } from "@/components/FilterBar";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import PricingCTA from "@/components/PricingCTA";
import catalogData from "@/data/catalog.json";
import { type CatalogItem, type CategoryValue, type CountryValue, type TypeValue } from "@/lib/constants";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Lock, LogIn } from "lucide-react";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";

const allItems = catalogData as CatalogItem[];
const ITEMS_PER_PAGE = 30;
// Show only 3 preview items for non-subscribers
const PREVIEW_ITEMS = 3;

export default function Catalog() {
  const [selectedCategory, setSelectedCategory] = useState<CategoryValue>("all");
  const [selectedCountry, setSelectedCountry] = useState<CountryValue>("all");
  const [selectedType, setSelectedType] = useState<TypeValue>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortValue>("name_asc");
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const { t, tCatalogContent } = useLanguage();
  const { isAuthenticated, loading: authLoading } = useAuth();

  const { data: subStatus, isLoading: subLoading } = trpc.subscription.status.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });

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

  const isActive = subStatus?.isActive || false;
  const isLoading = authLoading || (isAuthenticated && subLoading);

  const filtered = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    let items = allItems.filter((item) => {
      if (selectedCategory !== "all" && item.category !== selectedCategory) return false;
      if (selectedCountry !== "all" && item.country !== selectedCountry) return false;
      if (selectedType !== "all" && item.type !== selectedType) return false;
      if (query) {
        const content = tCatalogContent(item.id, {
          name: item.name,
          description: item.description,
          eligibility: item.eligibility || "",
        });
        const searchable = [
          item.name,
          item.description,
          item.organization,
          item.eligibility,
          content.name,
          content.description,
          content.eligibility,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!searchable.includes(query)) return false;
      }
      return true;
    });

    // Sort
    items = [...items].sort((a, b) => {
      switch (sortBy) {
        case "name_asc":
          return a.name.localeCompare(b.name);
        case "name_desc":
          return b.name.localeCompare(a.name);
        case "category":
          return a.category.localeCompare(b.category) || a.name.localeCompare(b.name);
        case "country":
          return a.country.localeCompare(b.country) || a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return items;
  }, [selectedCategory, selectedCountry, selectedType, searchQuery, sortBy, tCatalogContent]);

  // If not active subscriber, only show preview items
  const displayItems = isActive ? filtered : filtered.slice(0, PREVIEW_ITEMS);
  const visibleItems = isActive ? displayItems.slice(0, visibleCount) : displayItems;
  const hasMore = isActive && visibleCount < filtered.length;

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

      {/* Filter bar - always visible */}
      <FilterBar
        selectedCategory={selectedCategory}
        selectedCountry={selectedCountry}
        selectedType={selectedType}
        onCategoryChange={(c) => { setSelectedCategory(c); setVisibleCount(ITEMS_PER_PAGE); }}
        onCountryChange={(c) => { setSelectedCountry(c); setVisibleCount(ITEMS_PER_PAGE); }}
        onTypeChange={(t) => { setSelectedType(t); setVisibleCount(ITEMS_PER_PAGE); }}
        itemCount={filtered.length}
        searchQuery={searchQuery}
        onSearchChange={(q) => { setSearchQuery(q); setVisibleCount(ITEMS_PER_PAGE); }}
        sortBy={sortBy}
        onSortChange={setSortBy}
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
            {visibleItems.length > 0 ? (
              <>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {visibleItems.map((item, i) => (
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

                {/* Load more - only for active subscribers */}
                {hasMore && (
                  <div className="mt-8 text-center">
                    <button
                      onClick={() => setVisibleCount((prev) => prev + ITEMS_PER_PAGE)}
                      className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-[#1e3a5f] bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all"
                    >
                      {t.catalog.loadMore} ({filtered.length - visibleCount} {t.catalog.remaining})
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-20">
                <p className="text-gray-500 text-lg mb-2">{t.catalog.noResults}</p>
                <button
                  onClick={() => {
                    setSelectedCategory("all");
                    setSelectedCountry("all");
                    setSelectedType("all");
                    setSearchQuery("");
                  }}
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
