/**
 * SmartSearchPanel — AI-powered multilingual grant search.
 * Shows search input, example suggestions, loading state, and results grid.
 * Reuses existing CatalogCard component for displaying results.
 */

import { Search, Sparkles, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSmartSearch } from "@/hooks/useSmartSearch";
import CatalogCard from "@/components/CatalogCard";
import type { CatalogItem } from "@/lib/constants";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useMemo } from "react";

export default function SmartSearchPanel() {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const { query, setQuery, results, meta, loading, error } = useSmartSearch();

  const { data: savedData } = trpc.grants.savedList.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });
  const savedSet = useMemo(() => new Set(savedData?.grantIds ?? []), [savedData]);

  const utils = trpc.useUtils();
  const toggleSave = trpc.grants.toggleSave.useMutation({
    onSettled: () => utils.grants.savedList.invalidate(),
  });

  // Map results to CatalogItem format for CatalogCard
  const catalogItems: CatalogItem[] = useMemo(
    () =>
      results.map((r) => ({
        id: r.id,
        name: r.name,
        organization: r.organization,
        description: r.description,
        category: r.category,
        type: "grant" as const,
        country: r.country,
        eligibility: r.eligibility,
        website: r.website,
        phone: "",
        email: "",
        amount: r.amount,
        status: "",
        applicationProcess: "",
        deadline: r.deadline,
        fundingType: r.fundingType,
        targetDiagnosis: "",
        ageRange: "",
        geographicScope: "",
        documentsRequired: "",
        b2VisaEligible: "",
        state: r.state,
        city: r.city,
      })),
    [results]
  );

  const examples = [t.smartSearch.example1, t.smartSearch.example2, t.smartSearch.example3];

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.smartSearch.placeholder}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green text-sm"
        />
      </div>

      {/* Hint */}
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Sparkles className="w-3.5 h-3.5 text-brand-green" />
        {t.smartSearch.hint}
      </p>

      {/* Examples — shown only when query is empty */}
      {!query && (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground">{t.smartSearch.tryExample}</span>
          {examples.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => setQuery(example)}
              className="text-xs px-3 py-1.5 rounded-full border border-border bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
            >
              {example}
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-brand-green" />
          <span className="ml-2 text-sm text-muted-foreground">{t.smartSearch.searching}</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Results count + meta */}
      {meta && !loading && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {t.smartSearch.resultsCount.replace("{count}", String(meta.resultCount))}
          </p>
          {meta.detectedLanguage !== "en" && meta.englishQuery && (
            <p className="text-xs text-muted-foreground/70">
              → {meta.englishQuery}
            </p>
          )}
        </div>
      )}

      {/* No results */}
      {meta && meta.resultCount === 0 && !loading && (
        <div className="text-center py-8">
          <Search className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">{t.smartSearch.noResults}</p>
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {examples.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setQuery(example)}
                className="text-xs px-3 py-1.5 rounded-full border border-border bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results grid */}
      {catalogItems.length > 0 && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {catalogItems.map((item, index) => (
            <CatalogCard
              key={item.id}
              item={item}
              index={index}
              isSaved={savedSet.has(item.id)}
              onToggleSave={(grantId) => toggleSave.mutate({ grantId })}
              isAuthenticated={isAuthenticated}
            />
          ))}
        </div>
      )}

      {/* Powered by */}
      {query && (
        <p className="text-center text-[10px] text-muted-foreground/50">
          {t.smartSearch.poweredBy}
        </p>
      )}
    </div>
  );
}
