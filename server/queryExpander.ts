/**
 * Query Expander — Uses Claude Haiku to translate and expand search queries
 * for multilingual grant search across 5 languages (EN, KA, FR, ES, RU).
 *
 * Follows the same Anthropic SDK pattern as toolboxClient.ts.
 */

import Anthropic from "@anthropic-ai/sdk";
import { LRUCache } from "lru-cache";
import { ENV } from "./_core/env";

// Cost cap (Phase 0.5): an identical query hits Claude Haiku once per 24 h.
// One cache serves both catalog.smartSearch and organizations.smartSearch.
const expansionCache = new LRUCache<string, ExpandedQuery>({
  max: 5_000,
  ttl: 24 * 60 * 60 * 1000,
});

/** Cache key: NFC(lowercase(collapse-whitespace(query))). */
export function cacheKey(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, " ").normalize("NFC");
}

export interface ExpandedQuery {
  original: string;
  terms: string[];
  detectedLanguage: string;
  englishQuery: string;
}

const SYSTEM_PROMPT = `You are a search query expander for a grants database serving emigrants.
Given a query in ANY language, output JSON:
{
  "detected_language": "en",
  "english": "child rehabilitation in Germany",
  "terms": ["child rehabilitation", "children rehab", "pediatric therapy", "რეაბილიტაცია", "réhabilitation enfant", "rehabilitación infantil", "реабилитация детей"]
}

Rules:
- "terms" must include: the original query, English translation, and translations/synonyms in French, Spanish, Russian, Georgian
- Add 2-3 English synonyms
- Keep each term short (1-4 words)
- Maximum 12 terms total
- Respond with ONLY valid JSON. No markdown, no explanation.`;

export async function expandQuery(userQuery: string): Promise<ExpandedQuery> {
  const trimmed = userQuery.trim();
  if (!trimmed) {
    return { original: "", terms: [], detectedLanguage: "en", englishQuery: "" };
  }

  // Fallback if no API key — return original query split into words
  if (!ENV.anthropicApiKey) {
    return {
      original: trimmed,
      terms: [trimmed, ...trimmed.split(/\s+/).filter((w) => w.length > 2)],
      detectedLanguage: "en",
      englishQuery: trimmed,
    };
  }

  const key = cacheKey(trimmed);
  const cached = expansionCache.get(key);
  if (cached) {
    console.log(`[QueryExpander] cache hit (${expansionCache.size}/${expansionCache.max})`);
    return { ...cached, original: trimmed };
  }
  console.log(`[QueryExpander] cache miss → Anthropic call (${expansionCache.size}/${expansionCache.max})`);

  try {
    const client = new Anthropic({ apiKey: ENV.anthropicApiKey });

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: trimmed }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return fallback(trimmed);
    }

    const parsed = JSON.parse(textBlock.text) as {
      detected_language?: string;
      english?: string;
      terms?: string[];
    };

    const result: ExpandedQuery = {
      original: trimmed,
      terms: Array.isArray(parsed.terms)
        ? parsed.terms.filter((t): t is string => typeof t === "string" && t.length > 0)
        : [trimmed],
      detectedLanguage: parsed.detected_language ?? "en",
      englishQuery: parsed.english ?? trimmed,
    };
    expansionCache.set(key, result);
    return result;
  } catch (err) {
    console.error("[QueryExpander] Failed to expand query:", err);
    return fallback(trimmed);
  }
}

function fallback(query: string): ExpandedQuery {
  return {
    original: query,
    terms: [query, ...query.split(/\s+/).filter((w) => w.length > 2)],
    detectedLanguage: "en",
    englishQuery: query,
  };
}
