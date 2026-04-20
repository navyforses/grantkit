/**
 * Jina Reader wrapper — turns any public URL into clean markdown the LLM
 * can read as context, with an in-memory LRU cache so the same page is
 * never fetched twice within its TTL.
 *
 * Why Jina Reader: zero-cost for our expected volume, no API key
 * required for the free tier, returns markdown that strips boilerplate
 * (nav, ads, footers) — exactly what the grant-chat assistant needs when
 * the user asks "what does this organisation offer?" and the answer is
 * on their website, not in our DB.
 *
 * Reference: https://jina.ai/reader/
 */

import { LRUCache } from "lru-cache";

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

const CACHE_MAX_ENTRIES = 200;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

const cache = new LRUCache<string, string>({
  max: CACHE_MAX_ENTRIES,
  ttl: CACHE_TTL_MS,
});

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

const JINA_BASE = "https://r.jina.ai/";
const FETCH_TIMEOUT_MS = 10_000;
const MAX_MARKDOWN_CHARS = 8_000;

export interface FetchWebsiteResult {
  url: string;
  markdown: string;
  truncated: boolean;
  cached: boolean;
}

/**
 * Normalise a user-supplied URL. Returns null for non-http(s) schemes
 * so the tool never fetches file:// or javascript: URLs.
 */
function normaliseUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(withScheme);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.href;
  } catch {
    return null;
  }
}

/**
 * Fetch a URL through Jina Reader and return its content as markdown.
 * Throws if the URL is invalid, the upstream fails, or the request
 * times out — callers (the LLM tool dispatcher) should catch and
 * surface the error to the model.
 */
export async function fetchWebsiteMarkdown(rawUrl: string): Promise<FetchWebsiteResult> {
  const url = normaliseUrl(rawUrl);
  if (!url) {
    throw new Error(`Invalid URL: "${rawUrl}"`);
  }

  const cached = cache.get(url);
  if (cached !== undefined) {
    return {
      url,
      markdown: cached,
      truncated: cached.length >= MAX_MARKDOWN_CHARS,
      cached: true,
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${JINA_BASE}${url}`, {
      method: "GET",
      headers: {
        Accept: "text/markdown, text/plain;q=0.9, */*;q=0.1",
        "User-Agent": "GrantKit-AI-Assistant/1.0",
      },
      signal: controller.signal,
    });
  } catch (err) {
    if ((err as { name?: string }).name === "AbortError") {
      throw new Error(`Fetch timed out after ${FETCH_TIMEOUT_MS}ms: ${url}`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new Error(`Jina Reader returned ${response.status} for ${url}`);
  }

  const text = await response.text();
  const truncated = text.length > MAX_MARKDOWN_CHARS;
  const markdown = truncated ? text.slice(0, MAX_MARKDOWN_CHARS) : text;

  cache.set(url, markdown);

  return { url, markdown, truncated, cached: false };
}

/** Exposed for tests — clears the in-memory cache. */
export function __resetWebFetchCacheForTests() {
  cache.clear();
}
