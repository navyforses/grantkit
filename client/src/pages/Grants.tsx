/*
 * Grants Directory Page — GrantKit
 * Design: Structured Clarity — dense card grid with sticky filter bar
 * Members-only content with trust-based access (banner at top)
 */

import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import FilterBar from "@/components/FilterBar";
import Footer from "@/components/Footer";
import GrantCard from "@/components/GrantCard";
import Navbar from "@/components/Navbar";
import grantsData from "@/data/grants.json";
import { GUMROAD_URL, type CategoryValue, type CountryValue, type Grant } from "@/lib/constants";
import { useLanguage } from "@/contexts/LanguageContext";

const allGrants = grantsData as Grant[];

export default function Grants() {
  const [selectedCategory, setSelectedCategory] = useState<CategoryValue>("all");
  const [selectedCountry, setSelectedCountry] = useState<CountryValue>("all");
  const { t } = useLanguage();

  const filteredGrants = useMemo(() => {
    return allGrants.filter((grant) => {
      const categoryMatch = selectedCategory === "all" || grant.category === selectedCategory;
      const countryMatch = selectedCountry === "all" || grant.country === selectedCountry;
      return categoryMatch && countryMatch;
    });
  }, [selectedCategory, selectedCountry]);

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
