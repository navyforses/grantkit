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
import { searchExternalGrants, searchExternalFunders } from "../externalGrants";

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

// ---------------------------------------------------------------------------
// search_funders — US foundations index
// ---------------------------------------------------------------------------

const FUNDERS_DEFAULT_LIMIT = 5;
const FUNDERS_MAX_LIMIT = 10;
const MISSION_MAX_CHARS = 400;

export const SEARCH_FUNDERS_TOOL: Anthropic.Tool = {
  name: "search_funders",
  description:
    "Search the GrantedAI funders index (133 000+ US foundations) for " +
    "organisations whose mission matches the user's cause. Use this when " +
    "the user asks 'which foundations fund X?', 'who else supports this " +
    "cause?', or names a condition / region and wants funders rather than " +
    "individual grant programs. For actual open grant programs, prefer " +
    "search_similar_grants.",
  input_schema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description:
          "Free-text query describing the cause, population, or mission " +
          "area (e.g. 'pediatric disability', 'immigrant legal aid').",
      },
      state: {
        type: "string",
        description:
          "Optional US state abbreviation (e.g. 'CA') to narrow results " +
          "to foundations headquartered there.",
      },
      limit: {
        type: "number",
        description: `Max results to return (default ${FUNDERS_DEFAULT_LIMIT}, max ${FUNDERS_MAX_LIMIT}).`,
      },
    },
    required: ["query"],
  },
};

interface FundersParams {
  query?: unknown;
  state?: unknown;
  limit?: unknown;
}

function formatUsd(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "";
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

export async function executeSearchFunders(params: FundersParams) {
  const query = typeof params.query === "string" ? params.query.trim() : "";
  if (!query) {
    return { error: "query is required" };
  }

  const state = typeof params.state === "string" && params.state.trim()
    ? params.state.trim()
    : undefined;

  const rawLimit = Number(params.limit ?? FUNDERS_DEFAULT_LIMIT);
  const limit = Math.max(
    1,
    Math.min(Number.isFinite(rawLimit) ? rawLimit : FUNDERS_DEFAULT_LIMIT, FUNDERS_MAX_LIMIT),
  );

  const results = await searchExternalFunders({ query, state, limit });

  return {
    query,
    count: results.length,
    results: results.map((f) => ({
      name: f.name,
      state: f.state,
      totalAssets: formatUsd(f.totalAssets),
      annualIncome: formatUsd(f.annualIncome),
      nteeCategory: f.nteeCategory,
      mission: f.mission.length > MISSION_MAX_CHARS
        ? f.mission.slice(0, MISSION_MAX_CHARS) + "…"
        : f.mission,
    })),
  };
}
