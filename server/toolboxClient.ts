/**
 * Grant AI Assistant — direct database integration
 *
 * Implements the same tool-use interface as the googleapis/mcp-toolbox design,
 * but calls the existing Drizzle ORM functions directly instead of going through
 * a separate MCP Toolbox server. This works seamlessly with any DATABASE_URL
 * (Railway, PlanetScale, etc.) without extra infrastructure.
 *
 * The agentic loop: user message → LLM picks tools → tools query DB → LLM answers.
 */

import { ENV } from "./_core/env";
import {
  listGrants,
  getGrantByItemId,
} from "./db";

// ---------------------------------------------------------------------------
// Grant tools — thin wrappers around existing Drizzle queries
// ---------------------------------------------------------------------------

type ToolParams = Record<string, unknown>;
type ToolResult = unknown;

const TOOLS: Record<string, (params: ToolParams) => Promise<ToolResult>> = {
  /** Paginated list — used when no specific keyword is given */
  list_grants: async ({ limit = 20, offset = 0 }) => {
    const result = await listGrants({
      limit: Number(limit),
      offset: Number(offset),
      activeOnly: true,
    });
    return result.grants.map((g) => ({
      itemId: g.itemId,
      name: g.name,
      organization: g.organization,
      category: g.category,
      country: g.country,
      amount: g.amount,
      deadline: g.deadline,
      fundingType: g.fundingType,
      type: g.type,
    }));
  },

  /** Full-text keyword search across name, description, organization */
  search_grants_by_keyword: async ({ keyword = "", limit = 20 }) => {
    const result = await listGrants({
      search: String(keyword),
      limit: Number(limit),
      activeOnly: true,
    });
    return result.grants.map((g) => ({
      itemId: g.itemId,
      name: g.name,
      organization: g.organization,
      description: g.description,
      category: g.category,
      country: g.country,
      amount: g.amount,
      deadline: g.deadline,
      website: g.website,
      eligibility: g.eligibility,
      fundingType: g.fundingType,
      targetDiagnosis: g.targetDiagnosis,
    }));
  },

  /** Filter by category */
  list_grants_by_category: async ({ category = "" }) => {
    const result = await listGrants({
      category: String(category),
      limit: 50,
      activeOnly: true,
    });
    return result.grants.map((g) => ({
      itemId: g.itemId,
      name: g.name,
      organization: g.organization,
      description: g.description,
      country: g.country,
      amount: g.amount,
      deadline: g.deadline,
      website: g.website,
      eligibility: g.eligibility,
      fundingType: g.fundingType,
    }));
  },

  /** Filter by country */
  list_grants_by_country: async ({ country = "" }) => {
    const result = await listGrants({
      country: String(country),
      limit: 50,
      activeOnly: true,
    });
    return result.grants.map((g) => ({
      itemId: g.itemId,
      name: g.name,
      organization: g.organization,
      description: g.description,
      category: g.category,
      amount: g.amount,
      deadline: g.deadline,
      website: g.website,
      eligibility: g.eligibility,
      fundingType: g.fundingType,
    }));
  },

  /** Full record for a single grant */
  get_grant_detail: async ({ item_id = "" }) => {
    const grant = await getGrantByItemId(String(item_id));
    if (!grant) return { error: `Grant '${item_id}' not found` };
    return grant;
  },

  /** All distinct categories with counts */
  list_categories: async () => {
    const result = await listGrants({ limit: 1000, activeOnly: true });
    const counts: Record<string, number> = {};
    for (const g of result.grants) {
      counts[g.category] = (counts[g.category] ?? 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([category, grant_count]) => ({ category, grant_count }));
  },

  /** All distinct countries with counts */
  list_countries: async () => {
    const result = await listGrants({ limit: 1000, activeOnly: true });
    const counts: Record<string, number> = {};
    for (const g of result.grants) {
      counts[g.country] = (counts[g.country] ?? 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([country, grant_count]) => ({ country, grant_count }));
  },
};

/** Execute any registered tool by name */
export async function callToolboxTool(
  name: string,
  params: ToolParams
): Promise<ToolResult> {
  const fn = TOOLS[name];
  if (!fn) throw new Error(`Unknown tool: '${name}'`);
  return fn(params);
}

// ---------------------------------------------------------------------------
// OpenAI-format tool definitions (sent to LLM on each turn)
// ---------------------------------------------------------------------------

export type OAITool = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export const GRANT_ASSISTANT_TOOLS: OAITool[] = [
  {
    type: "function",
    function: {
      name: "search_grants_by_keyword",
      description:
        "Search for grants whose name, description, or organization contains a keyword.",
      parameters: {
        type: "object",
        properties: {
          keyword: {
            type: "string",
            description: "Search keyword (e.g. 'cancer', 'housing', 'disability')",
          },
          limit: {
            type: "integer",
            description: "Max results to return (default 20)",
          },
        },
        required: ["keyword", "limit"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_grants_by_category",
      description:
        "List all active grants in a specific category (e.g. Medical, Housing, Education). " +
        "Call list_categories first if unsure of valid category names.",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            description: "Exact category name",
          },
        },
        required: ["category"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_grants_by_country",
      description:
        "List all active grants available in a specific country (e.g. USA, Canada, UK). " +
        "Call list_countries first if unsure of the exact country name.",
      parameters: {
        type: "object",
        properties: {
          country: {
            type: "string",
            description: "Country name as it appears in the database",
          },
        },
        required: ["country"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_grant_detail",
      description:
        "Retrieve the full record for a single grant: application process, required documents, " +
        "eligibility, contact info, and deadlines.",
      parameters: {
        type: "object",
        properties: {
          item_id: {
            type: "string",
            description: "The unique itemId of the grant, obtained from search/list tools",
          },
        },
        required: ["item_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_categories",
      description:
        "Return all grant categories with their active-grant counts. " +
        "Use this to discover available categories.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "list_countries",
      description:
        "Return all countries that have at least one active grant, with counts. " +
        "Use this to discover valid country names.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "list_grants",
      description: "List active grants with pagination when no specific search term is needed.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "integer", description: "Number of grants to return (1–50)" },
          offset: { type: "integer", description: "Number of grants to skip (0 = first page)" },
        },
        required: ["limit", "offset"],
      },
    },
  },
];

// ---------------------------------------------------------------------------
// Agentic loop
// ---------------------------------------------------------------------------

type OAIMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
};

type OAIResponse = {
  choices: Array<{
    message: {
      role: string;
      content: string | null;
      tool_calls?: OAIMessage["tool_calls"];
    };
    finish_reason: string | null;
  }>;
};

const SYSTEM_PROMPT = `You are a compassionate, knowledgeable grant advisor for GrantKit — a curated database of 600+ grants, scholarships, and support resources spanning 29 countries.

Your mission is to help users find financial assistance and support resources that match their specific situation. Users may be individuals, families, or caregivers dealing with medical conditions, housing challenges, education needs, or other hardships.

Guidelines:
- Always use the available tools to search the live database; do not invent grant names or details
- When a user mentions a condition or need, search for relevant keywords AND relevant categories
- Present results in a clear, readable format: name, amount (if known), country, deadline, and a brief why-it-fits
- If a search returns no results, suggest alternative keywords, categories, or countries
- Mention the grant's website or contact when available so the user can apply
- Be warm and empathetic — people searching for grants are often in difficult circumstances`;

/**
 * Run the grant-assistant agentic loop for a single user message.
 *
 * Drives a tool-use loop (up to MAX_ITERATIONS rounds):
 *   1. Send messages + tools to the LLM
 *   2. If the model returns tool calls, execute them via Drizzle
 *   3. Feed results back and repeat until the model gives a final text answer
 */
export async function runGrantAssistant(userMessage: string): Promise<string> {
  const forgeApiUrl = ENV.forgeApiUrl || "https://forge.manus.im";
  const apiUrl = `${forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions`;

  if (!ENV.forgeApiKey) {
    throw new Error("BUILT_IN_FORGE_API_KEY is not configured");
  }

  const messages: OAIMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userMessage },
  ];

  const MAX_ITERATIONS = 6;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages,
        tools: GRANT_ASSISTANT_TOOLS,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`LLM request failed: ${response.status} ${text}`);
    }

    const data = (await response.json()) as OAIResponse;
    const choice = data.choices[0];

    // No tool calls → final text answer
    if (!choice.message.tool_calls || choice.message.tool_calls.length === 0) {
      return choice.message.content ?? "(No response)";
    }

    // Append assistant turn (with tool calls)
    messages.push({
      role: "assistant",
      content: choice.message.content ?? null,
      tool_calls: choice.message.tool_calls,
    });

    // Execute each tool call against the Drizzle database
    for (const tc of choice.message.tool_calls) {
      let toolResult: unknown;
      try {
        const args = JSON.parse(tc.function.arguments) as ToolParams;
        toolResult = await callToolboxTool(tc.function.name, args);
      } catch (err) {
        toolResult = { error: String(err) };
      }

      messages.push({
        role: "tool",
        tool_call_id: tc.id,
        content: JSON.stringify(toolResult),
      });
    }
  }

  return "I was unable to find relevant grants within the allowed search steps. Please try rephrasing your query.";
}
