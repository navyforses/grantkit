/**
 * useSmartSearch — Hook for AI-powered multilingual grant search.
 * Debounces input (600ms), calls catalog.smartSearch tRPC endpoint.
 */

import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";

interface SmartSearchMeta {
  originalQuery: string;
  detectedLanguage: string;
  englishQuery: string;
  resultCount: number;
  termsUsed: number;
}

export function useSmartSearch(options?: {
  country?: string;
  category?: string;
}) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce query changes (600ms)
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 600);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]);

  const enabled = debouncedQuery.length >= 2;

  const { data, isLoading, error } = trpc.catalog.smartSearch.useQuery(
    {
      query: debouncedQuery,
      country: options?.country,
      category: options?.category,
      limit: 20,
    },
    {
      enabled,
      staleTime: 60_000, // Cache for 60s
      retry: false,
    }
  );

  return {
    query,
    setQuery,
    results: data?.results ?? [],
    meta: (data?.meta ?? null) as SmartSearchMeta | null,
    loading: enabled && isLoading,
    error: error?.message ?? null,
  };
}
