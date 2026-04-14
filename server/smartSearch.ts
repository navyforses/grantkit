/**
 * MySQL multi-term smart search fallback.
 * Searches grants + grantTranslations across all 5 languages using LIKE queries.
 * Results are ranked by number of matching terms.
 */

import { getDb } from "./db";
import { grants, grantTranslations } from "../drizzle/schema";
import { eq, or, like, and, sql } from "drizzle-orm";

interface SmartSearchResult {
  itemId: string;
  name: string;
  organization: string | null;
  description: string | null;
  category: string;
  country: string;
  amount: string | null;
  deadline: string | null;
  website: string | null;
  eligibility: string | null;
  fundingType: string | null;
  state: string | null;
  city: string | null;
  matchCount: number;
}

export async function searchGrantsMultiTerm(
  terms: string[],
  options?: {
    country?: string;
    category?: string;
    limit?: number;
  }
): Promise<SmartSearchResult[]> {
  const db = await getDb();
  if (!db || terms.length === 0) return [];

  const limit = options?.limit ?? 20;

  // Filter out very short terms
  const validTerms = terms.filter((t) => t.trim().length >= 2);
  if (validTerms.length === 0) return [];

  // Build LIKE conditions for each term against grants table
  const grantMatchConditions = validTerms.map((term) => {
    const pattern = `%${term}%`;
    return or(
      like(grants.name, pattern),
      like(grants.description, pattern),
      like(grants.organization, pattern),
      like(grants.eligibility, pattern)
    );
  });

  // Base conditions
  const baseConditions = [eq(grants.isActive, true)];
  if (options?.country) baseConditions.push(eq(grants.country, options.country));
  if (options?.category) baseConditions.push(eq(grants.category, options.category));

  // Search grants table: for each term, count if it matches
  // We do a simpler approach: OR all terms, then count matches in JS
  const anyTermMatches = or(...grantMatchConditions);

  const grantResults = await db
    .select({
      itemId: grants.itemId,
      name: grants.name,
      organization: grants.organization,
      description: grants.description,
      category: grants.category,
      country: grants.country,
      amount: grants.amount,
      deadline: grants.deadline,
      website: grants.website,
      eligibility: grants.eligibility,
      fundingType: grants.fundingType,
      state: grants.state,
      city: grants.city,
    })
    .from(grants)
    .where(and(...baseConditions, anyTermMatches!))
    .limit(limit * 3); // fetch extra to allow re-ranking

  // Also search translations table
  const translationMatchConditions = validTerms.map((term) => {
    const pattern = `%${term}%`;
    return or(
      like(grantTranslations.name, pattern),
      like(grantTranslations.description, pattern),
      like(grantTranslations.eligibility, pattern)
    );
  });

  const anyTranslationMatches = or(...translationMatchConditions);

  const translationResults = await db
    .select({
      grantItemId: grantTranslations.grantItemId,
    })
    .from(grantTranslations)
    .where(anyTranslationMatches!)
    .limit(limit * 5);

  // Merge results: count term matches per grant
  const matchCounts = new Map<string, number>();

  for (const g of grantResults) {
    const searchableText = [g.name, g.description, g.organization, g.eligibility]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    let count = 0;
    for (const term of validTerms) {
      if (searchableText.includes(term.toLowerCase())) count++;
    }
    matchCounts.set(g.itemId, (matchCounts.get(g.itemId) ?? 0) + count);
  }

  // Add translation matches
  const translationItemIds = Array.from(new Set(translationResults.map((t) => t.grantItemId)));
  for (const itemId of translationItemIds) {
    matchCounts.set(itemId, (matchCounts.get(itemId) ?? 0) + 1);
  }

  // Build result map from direct grant matches
  const resultMap = new Map<string, SmartSearchResult>();
  for (const g of grantResults) {
    resultMap.set(g.itemId, {
      ...g,
      matchCount: matchCounts.get(g.itemId) ?? 0,
    });
  }

  // For translation-only matches, fetch the grant data
  const missingItemIds = translationItemIds.filter((id) => !resultMap.has(id));
  if (missingItemIds.length > 0) {
    const missingGrants = await db
      .select({
        itemId: grants.itemId,
        name: grants.name,
        organization: grants.organization,
        description: grants.description,
        category: grants.category,
        country: grants.country,
        amount: grants.amount,
        deadline: grants.deadline,
        website: grants.website,
        eligibility: grants.eligibility,
        fundingType: grants.fundingType,
        state: grants.state,
        city: grants.city,
      })
      .from(grants)
      .where(
        and(
          eq(grants.isActive, true),
          sql`${grants.itemId} IN (${sql.join(
            missingItemIds.map((id) => sql`${id}`),
            sql`, `
          )})`
        )
      )
      .limit(limit);

    for (const g of missingGrants) {
      // Apply country/category filters
      if (options?.country && g.country !== options.country) continue;
      if (options?.category && g.category !== options.category) continue;
      resultMap.set(g.itemId, {
        ...g,
        matchCount: matchCounts.get(g.itemId) ?? 0,
      });
    }
  }

  // Sort by match count descending, then by name
  return Array.from(resultMap.values())
    .sort((a, b) => b.matchCount - a.matchCount || (a.name ?? "").localeCompare(b.name ?? ""))
    .slice(0, limit);
}
