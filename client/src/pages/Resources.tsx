/*
 * Resources Directory Page
 * Design: Structured Clarity — dense, scannable resource cards with category filters and search
 */

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Search, SlidersHorizontal, X } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ResourceCard from "@/components/ResourceCard";
import PricingCTA from "@/components/PricingCTA";
import { RESOURCE_CATEGORIES, GUMROAD_URL, type Resource, type ResourceCategoryValue } from "@/lib/constants";
import { useLanguage } from "@/contexts/LanguageContext";
import resourcesData from "@/data/resources.json";

const resources: Resource[] = resourcesData as Resource[];

const ITEMS_PER_PAGE = 30;

export default function Resources() {
  const { t, tResourceCategory, tResourceContent } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<ResourceCategoryValue>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  const filtered = useMemo(() => {
    let result = resources;

    if (selectedCategory !== "all") {
      result = result.filter(r => r.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r => {
        // Search in English content
        const matchEn =
          r.name.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          (r.eligibility && r.eligibility.toLowerCase().includes(q)) ||
          (r.contact.location && r.contact.location.toLowerCase().includes(q));

        // Search in translated content
        const translated = tResourceContent(r.id, {
          name: r.name,
          description: r.description,
          eligibility: r.eligibility || "",
        });
        const matchTr =
          translated.name.toLowerCase().includes(q) ||
          translated.description.toLowerCase().includes(q) ||
          translated.eligibility.toLowerCase().includes(q);

        return matchEn || matchTr;
      });
    }

    return result;
  }, [selectedCategory, searchQuery, tResourceContent]);

  const visibleResources = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + ITEMS_PER_PAGE);
  };

  const handleCategoryChange = (cat: ResourceCategoryValue) => {
    setSelectedCategory(cat);
    setVisibleCount(ITEMS_PER_PAGE);
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setVisibleCount(ITEMS_PER_PAGE);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f9fb]">
      <Navbar />

      {/* Member banner */}
      <div className="bg-[#1e3a5f] text-white">
        <div className="container py-3 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-sm text-blue-100">{t.resources.memberBanner}</p>
          <a
            href={GUMROAD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-[#22c55e] hover:text-[#4ade80] transition-colors whitespace-nowrap"
          >
            {t.resources.memberBannerCta} →
          </a>
        </div>
      </div>

      <main className="flex-1">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="container py-8">
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="text-2xl sm:text-3xl font-bold text-[#0f172a] mb-2"
            >
              {t.resources.title}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="text-gray-600 max-w-2xl"
            >
              {t.resources.subtitle}
            </motion.p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border-b border-gray-200 sticky top-16 z-20">
          <div className="container py-4">
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => handleSearchChange(e.target.value)}
                placeholder={t.resources.searchPlaceholder}
                className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]/40 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => handleSearchChange("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Category pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <SlidersHorizontal className="w-4 h-4 text-gray-400 shrink-0" />
              {RESOURCE_CATEGORIES.map(cat => {
                const isActive = selectedCategory === cat.value;
                const label = cat.value === "all" ? t.resources.allResources : tResourceCategory(cat.value);
                return (
                  <button
                    key={cat.value}
                    onClick={() => handleCategoryChange(cat.value as ResourceCategoryValue)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      isActive
                        ? "bg-[#1e3a5f] text-white border-[#1e3a5f]"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <span className="mr-1">{cat.icon}</span>
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="container py-6">
          {/* Count */}
          <p className="text-sm text-gray-500 mb-4">
            <span className="font-semibold text-[#0f172a]">{filtered.length}</span>{" "}
            {t.resources.resourcesCount}
          </p>

          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-lg font-semibold text-gray-700 mb-2">{t.resources.noResults}</p>
              <p className="text-sm text-gray-500">{t.resources.noResultsHint}</p>
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {visibleResources.map((resource, index) => (
                  <ResourceCard key={resource.id} resource={resource} index={index} />
                ))}
              </div>

              {hasMore && (
                <div className="flex justify-center mt-8">
                  <button
                    onClick={handleLoadMore}
                    className="px-6 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all"
                  >
                    {t.resources.loadMore} ({filtered.length - visibleCount} {t.resources.remaining})
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* CTA */}
        <div className="bg-[#1e3a5f] py-12">
          <div className="container text-center">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">
              {t.finalCta.title}
            </h2>
            <p className="text-blue-200 mb-6 max-w-lg mx-auto">
              {t.finalCta.subtitle}
            </p>
            <PricingCTA text={t.finalCta.cta} size="large" />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
