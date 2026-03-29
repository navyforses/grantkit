/*
 * Grants Directory Page — GrantKit
 * Design: Structured Clarity — dense card grid with sticky filter bar
 * Members-only content with trust-based access (banner at top)
 * Now with 199 real grants from grants.supportnow.org
 * Search works across both original and translated content
 */

import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import FilterBar from "@/components/FilterBar";
import Footer from "@/components/Footer";
import GrantCard from "@/components/GrantCard";
import Navbar from "@/components/Navbar";
import grantsData from "@/data/grants.json";
import grantContentTranslations from "@/data/grantContentTranslations.json";
import { GUMROAD_URL, type CategoryValue, type CountryValue, type Grant } from "@/lib/constants";
import { useLanguage } from "@/contexts/LanguageContext";

type ContentTransMap = Record<string, Record<string, { name: string; description: string; eligibility: string }>>;
const contentTrans = grantContentTranslations as ContentTransMap;

const allGrants = grantsData as Grant[];

export default function Grants() {
  const [selectedCategory, setSelectedCategory] = useState<CategoryValue>("all");
  const [selectedCountry, setSelectedCountry] = useState<CountryValue>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { t, language } = useLanguage();

  const filteredGrants = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return allGrants.filter((grant) => {
      const categoryMatch = selectedCategory === "all" || grant.category === selectedCategory;
      const countryMatch = selectedCountry === "all" || grant.country === selectedCountry;

      let searchMatch = true;
      if (query) {
        // Search in original English content
        const origMatch =
          grant.name.toLowerCase().includes(query) ||
          grant.organization.toLowerCase().includes(query) ||
          grant.description.toLowerCase().includes(query) ||
          grant.situations.some(s => s.toLowerCase().includes(query)) ||
          grant.types.some(tp => tp.toLowerCase().includes(query));

        // Also search in translated content for current language
        const trans = contentTrans[String(grant.id)]?.[language];
        const transMatch = trans
          ? (trans.name || "").toLowerCase().includes(query) ||
            (trans.description || "").toLowerCase().includes(query) ||
            (trans.eligibility || "").toLowerCase().includes(query)
          : false;

        searchMatch = origMatch || transMatch;
      }

      return categoryMatch && countryMatch && searchMatch;
    });
  }, [selectedCategory, selectedCountry, searchQuery, language]);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />

      {/* Member banner */}
      <div className="bg-[#1e3a5f] text-white">
        <div className="container py-3 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-sm text-blue-100">
            {t.grants.memberBanner}
          </p>
          <a
            href={GUMROAD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#22c55e] hover:text-green-300 transition-colors"
          >
            {t.grants.memberBannerCta}
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Filter bar */}
      <FilterBar
        selectedCategory={selectedCategory}
        selectedCountry={selectedCountry}
        onCategoryChange={setSelectedCategory}
        onCountryChange={setSelectedCountry}
        grantCount={filteredGrants.length}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Grants grid */}
      <main className="flex-1 py-8">
        <div className="container">
          {filteredGrants.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredGrants.map((grant, i) => (
                <GrantCard key={grant.id} grant={grant} index={i} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <p className="text-gray-400 text-lg mb-2">{t.grants.noResults}</p>
              <p className="text-gray-400 text-sm">
                {t.grants.noResultsHint}
              </p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
