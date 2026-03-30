/*
 * Catalog Page — Unified Grants & Resources Directory
 * Design: Structured Clarity — dense card grid with sticky filters
 */

import { useMemo, useState } from "react";
import CatalogCard from "@/components/CatalogCard";
import FilterBar from "@/components/FilterBar";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import PricingCTA from "@/components/PricingCTA";
import catalogData from "@/data/catalog.json";
import { type CatalogItem, type CategoryValue, type CountryValue, type TypeValue } from "@/lib/constants";
import { useLanguage } from "@/contexts/LanguageContext";

const allItems = catalogData as CatalogItem[];
const ITEMS_PER_PAGE = 30;

export default function Catalog() {
  const [selectedCategory, setSelectedCategory] = useState<CategoryValue>("all");
  const [selectedCountry, setSelectedCountry] = useState<CountryValue>("all");
  const [selectedType, setSelectedType] = useState<TypeValue>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const { t, tCatalogContent } = useLanguage();

  const filtered = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return allItems.filter((item) => {
      if (selectedCategory !== "all" && item.category !== selectedCategory) return false;
      if (selectedCountry !== "all" && item.country !== selectedCountry) return false;
      if (selectedType !== "all" && item.type !== selectedType) return false;
      if (query) {
        // Search in both original and translated content
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
  }, [selectedCategory, selectedCountry, selectedType, searchQuery, tCatalogContent]);

  const visibleItems = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

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
        onCategoryChange={(c) => { setSelectedCategory(c); setVisibleCount(ITEMS_PER_PAGE); }}
        onCountryChange={(c) => { setSelectedCountry(c); setVisibleCount(ITEMS_PER_PAGE); }}
        onTypeChange={(t) => { setSelectedType(t); setVisibleCount(ITEMS_PER_PAGE); }}
        itemCount={filtered.length}
        searchQuery={searchQuery}
        onSearchChange={(q) => { setSearchQuery(q); setVisibleCount(ITEMS_PER_PAGE); }}
      />

      {/* Cards grid */}
      <div className="container py-8 flex-1">
        {visibleItems.length > 0 ? (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleItems.map((item, i) => (
                <CatalogCard key={item.id} item={item} index={i} />
              ))}
            </div>

            {/* Load more */}
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

        {/* Member CTA */}
        <div className="mt-12 bg-[#0f172a] rounded-xl p-8 text-center">
          <h3 className="text-xl font-bold text-white mb-2">{t.catalog.ctaTitle}</h3>
          <p className="text-blue-200/70 mb-6 max-w-md mx-auto">{t.catalog.ctaSubtitle}</p>
          <PricingCTA text={t.catalog.ctaButton} />
        </div>
      </div>

      <Footer />
    </div>
  );
}
