/**
 * External Grants Search Service
 *
 * Proxies requests to the GrantedAI API to search 84,000+ grants
 * and 133,000+ US foundations. Results can be previewed and imported
 * into the local catalog via the admin panel.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExternalGrantSearchParams {
  query: string;
  source?: "federal" | "state" | "international" | "foundation";
  state?: string;
  orgType?: string;
  limit?: number;
}

export interface ExternalGrantResult {
  slug: string;
  name: string;
  funder: string;
  amount: string;
  deadline: string;
  summary: string;
  applyUrl: string;
  detailsUrl: string;
  confidence: string;
  fitScore: string;
  matchReasons: string[];
}

export interface ExternalGrantDetail {
  slug: string;
  name: string;
  funder: string;
  status: string;
  deadline: string;
  amount: string;
  eligibility: string;
  summary: string;
  eligibleOrgTypes: string;
  topics: string[];
  agencyCategory: string;
  applyUrl: string;
  detailsUrl: string;
  lastVerified: string;
}

export interface FunderSearchParams {
  query?: string;
  state?: string;
  ntee?: string;
  assetsMin?: number;
  assetsMax?: number;
  limit?: number;
  sort?: "relevance" | "name" | "assets_desc" | "income_desc";
}

export interface FunderResult {
  slug: string;
  name: string;
  state: string;
  totalAssets: number;
  annualIncome: number;
  nteeCategory: string;
  mission: string;
}

/** Shape used by admin.importExternalGrant to add a grant to the local DB */
export interface ImportableGrant {
  name: string;
  organization: string;
  description: string;
  category: string;
  type: "grant" | "resource";
  country: string;
  eligibility: string;
  website: string;
  amount: string;
  status: string;
  deadline: string;
  fundingType: string;
  geographicScope: string;
}

// ---------------------------------------------------------------------------
// GrantedAI API base URL
// ---------------------------------------------------------------------------

const GRANTED_AI_BASE = "https://api.grantedai.com/v1";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse the markdown-style search results returned by the GrantedAI MCP
 * into structured objects. The MCP returns results in a textual format,
 * so we work with the raw API endpoint instead when available, falling
 * back to parsing the text response.
 */

async function fetchJSON(url: string, body: Record<string, unknown>): Promise<unknown> {
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    throw new Error(`GrantedAI API error: ${resp.status} ${resp.statusText}`);
  }
  return resp.json();
}

// ---------------------------------------------------------------------------
// Search grants — wraps GrantedAI /search_grants
// ---------------------------------------------------------------------------

export async function searchExternalGrants(
  params: ExternalGrantSearchParams,
): Promise<ExternalGrantResult[]> {
  try {
    const body: Record<string, unknown> = {
      query: params.query,
      limit: params.limit ?? 15,
    };
    if (params.source) body.source = params.source;
    if (params.state) body.state = params.state;
    if (params.orgType) body.org_type = params.orgType;

    const data = await fetchJSON(`${GRANTED_AI_BASE}/search_grants`, body) as any;

    // Normalise – the API may return an array directly or nested under a key
    const items: any[] = Array.isArray(data) ? data : (data?.results ?? data?.grants ?? []);

    return items.map((item: any) => ({
      slug: item.slug ?? "",
      name: item.name ?? item.title ?? "",
      funder: item.funder ?? item.funder_name ?? "",
      amount: item.amount ?? "",
      deadline: item.deadline ?? "No deadline",
      summary: item.summary ?? item.description ?? "",
      applyUrl: item.apply_url ?? item.applyUrl ?? "",
      detailsUrl: item.details_url ?? item.detailsUrl ?? "",
      confidence: item.confidence ?? "",
      fitScore: item.fit_score ?? item.fitScore ?? "",
      matchReasons: item.match_reasons ?? item.matchReasons ?? [],
    }));
  } catch (err) {
    console.error("[externalGrants] searchExternalGrants failed:", err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Get grant detail — wraps GrantedAI /get_grant
// ---------------------------------------------------------------------------

export async function getExternalGrantDetail(
  slug: string,
): Promise<ExternalGrantDetail | null> {
  try {
    const data = await fetchJSON(`${GRANTED_AI_BASE}/get_grant`, { slug }) as any;

    return {
      slug,
      name: data.name ?? data.title ?? "",
      funder: data.funder ?? "",
      status: data.status ?? "active",
      deadline: data.deadline ?? "No deadline",
      amount: data.amount ?? "",
      eligibility: data.eligibility ?? "",
      summary: data.summary ?? data.description ?? "",
      eligibleOrgTypes: data.eligible_org_types ?? "",
      topics: data.topics ?? [],
      agencyCategory: data.agency_category ?? "",
      applyUrl: data.apply_url ?? "",
      detailsUrl: data.details_url ?? "",
      lastVerified: data.last_verified ?? "",
    };
  } catch (err) {
    console.error("[externalGrants] getExternalGrantDetail failed:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Search funders — wraps GrantedAI /search_funders
// ---------------------------------------------------------------------------

export async function searchExternalFunders(
  params: FunderSearchParams,
): Promise<FunderResult[]> {
  try {
    const body: Record<string, unknown> = {
      limit: params.limit ?? 15,
    };
    if (params.query) body.query = params.query;
    if (params.state) body.state = params.state;
    if (params.ntee) body.ntee = params.ntee;
    if (params.assetsMin) body.assets_min = params.assetsMin;
    if (params.assetsMax) body.assets_max = params.assetsMax;
    if (params.sort) body.sort = params.sort;

    const data = await fetchJSON(`${GRANTED_AI_BASE}/search_funders`, body) as any;
    const items: any[] = Array.isArray(data) ? data : (data?.results ?? data?.funders ?? []);

    return items.map((item: any) => ({
      slug: item.slug ?? "",
      name: item.name ?? "",
      state: item.state ?? "",
      totalAssets: item.total_assets ?? item.totalAssets ?? 0,
      annualIncome: item.annual_income ?? item.annualIncome ?? 0,
      nteeCategory: item.ntee_category ?? item.nteeCategory ?? "",
      mission: item.mission ?? "",
    }));
  } catch (err) {
    console.error("[externalGrants] searchExternalFunders failed:", err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Map external grant → local catalog format
// ---------------------------------------------------------------------------

/** Map GrantedAI topics/agencyCategory to local category slugs */
function mapCategory(topics: string[], agencyCategory: string): string {
  const all = [...topics, agencyCategory].map((s) => s.toLowerCase());

  if (all.some((t) => t.includes("health") || t.includes("medical") || t.includes("clinical")))
    return "medical_treatment";
  if (all.some((t) => t.includes("education") || t.includes("scholarship")))
    return "scholarships";
  if (all.some((t) => t.includes("housing") || t.includes("shelter")))
    return "housing";
  if (all.some((t) => t.includes("social") || t.includes("community")))
    return "social_services";
  if (all.some((t) => t.includes("assistive") || t.includes("technology") || t.includes("equipment")))
    return "assistive_technology";
  if (all.some((t) => t.includes("transport") || t.includes("travel")))
    return "travel_transport";
  if (all.some((t) => t.includes("food") || t.includes("nutrition")))
    return "food_basic_needs";
  if (all.some((t) => t.includes("business") || t.includes("startup") || t.includes("sbir")))
    return "startup";
  if (all.some((t) => t.includes("research")))
    return "research";
  if (all.some((t) => t.includes("international")))
    return "international";

  return "financial_assistance";
}

export function mapExternalGrantToLocal(
  detail: ExternalGrantDetail,
): ImportableGrant {
  return {
    name: detail.name,
    organization: detail.funder,
    description: detail.summary,
    category: mapCategory(detail.topics, detail.agencyCategory),
    type: "grant",
    country: "US",
    eligibility: detail.eligibility,
    website: detail.applyUrl,
    amount: detail.amount,
    status: detail.status === "active" ? "Open" : detail.status,
    deadline: detail.deadline === "No deadline" ? "" : detail.deadline,
    fundingType: "",
    geographicScope: "",
  };
}
