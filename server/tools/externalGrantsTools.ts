/**
 * LLM tool bindings for the GrantedAI external grant search.
 *
 * The catalog tools in toolboxClient.ts only see the ~640 grants we
 * have curated in our own DB. `search_similar_grants` reaches into
 * GrantedAI's 84 000+ grant index so the per-grant assistant can
 * answer "are there other programs like this one?" questions without
 * requiring the admin to pre-import every candidate.
 *
 * The tool returns a trimmed shape (name, funder, amount, deadline,
 * summary, applyUrl) — intentionally leaner than the raw API response
 * so the LLM does not burn tokens on fields it rarely uses.
 */

import type Anthropic from "@anthropic-ai/sdk";
import { searchExternalGrants } from "../externalGrants";

// Keep responses compact; the LLM only needs enough to recommend 2-3 options.
const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 10;
const SUMMARY_MAX_CHARS = 500;

export const SEARCH_SIMILAR_GRANTS_TOOL: Anthropic.Tool = {
  name: "search_similar_grants",
  description:
    "Search the external GrantedAI index (84 000+ US grants and foundation " +
    "programs) for opportunities similar to the one the user is currently " +
    "viewing. Use this when the user asks 'are there other grants like " +
    "this?', 'what else could I apply to?', or names a diagnosis / cause / " +
    "region the current grant does not cover. Do NOT use it for questions " +
    "that are specifically about the current organisation — prefer " +
    "fetch_org_website for those.",
  input_schema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description:
          "Free-text search query. Combine the user's intent with the key " +
          "terms of the grant they are viewing (e.g. 'pediatric cerebral " +
          "palsy equipment grant').",
      },
      state: {
        type: "string",
        description:
          "Optional US state abbreviation (e.g. 'CA', 'TX') to narrow the " +
          "search when the user has mentioned a location.",
      },
      limit: {
        type: "number",
        description: `Max results to return (default ${DEFAULT_LIMIT}, max ${MAX_LIMIT}).`,
      },
    },
    required: ["query"],
  },
};

interface SimilarGrantsParams {
  query?: unknown;
  state?: unknown;
  limit?: unknown;
}

export async function executeSearchSimilarGrants(params: SimilarGrantsParams) {
  const query = typeof params.query === "string" ? params.query.trim() : "";
  if (!query) {
    return { error: "query is required" };
  }

  const state = typeof params.state === "string" && params.state.trim()
    ? params.state.trim()
    : undefined;

  const rawLimit = Number(params.limit ?? DEFAULT_LIMIT);
  const limit = Math.max(1, Math.min(Number.isFinite(rawLimit) ? rawLimit : DEFAULT_LIMIT, MAX_LIMIT));

  const results = await searchExternalGrants({ query, state, limit });

  return {
    query,
    count: results.length,
    results: results.map((r) => ({
      name: r.name,
      funder: r.funder,
      amount: r.amount,
      deadline: r.deadline,
      summary: r.summary.length > SUMMARY_MAX_CHARS
        ? r.summary.slice(0, SUMMARY_MAX_CHARS) + "…"
        : r.summary,
      applyUrl: r.applyUrl,
      matchReasons: r.matchReasons,
    })),
  };
}
