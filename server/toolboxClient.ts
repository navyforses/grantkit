/**
 * Grant AI Assistant — Anthropic Claude with direct database integration
 *
 * Uses the Anthropic Claude API with tool use to query the live GrantKit
 * MySQL database. Supports multi-turn conversations via history parameter.
 *
 * The agentic loop: user message → Claude picks tools → tools query DB → Claude answers.
 */

import Anthropic from "@anthropic-ai/sdk";
import { ENV } from "./_core/env";
import { listGrants, getGrantByItemId } from "./db";

// ---------------------------------------------------------------------------
// Tool implementations — thin wrappers around Drizzle ORM queries
// ---------------------------------------------------------------------------

type ToolParams = Record<string, unknown>;

async function callTool(name: string, params: ToolParams): Promise<unknown> {
  switch (name) {
    case "search_grants_by_keyword": {
      const result = await listGrants({
        search: String(params.keyword ?? ""),
        limit: Math.min(Number(params.limit ?? 20), 30),
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
    }

    case "list_grants_by_category": {
      const result = await listGrants({
        category: String(params.category ?? ""),
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
    }

    case "list_grants_by_country": {
      const result = await listGrants({
        country: String(params.country ?? ""),
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
    }

    case "get_grant_detail": {
      const grant = await getGrantByItemId(String(params.item_id ?? ""));
      if (!grant) return { error: `Grant '${params.item_id}' not found` };
      return grant;
    }

    case "list_categories": {
      const result = await listGrants({ limit: 1000, activeOnly: true });
      const counts: Record<string, number> = {};
      for (const g of result.grants) {
        counts[g.category] = (counts[g.category] ?? 0) + 1;
      }
      return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([category, grant_count]) => ({ category, grant_count }));
    }

    case "list_countries": {
      const result = await listGrants({ limit: 1000, activeOnly: true });
      const counts: Record<string, number> = {};
      for (const g of result.grants) {
        counts[g.country] = (counts[g.country] ?? 0) + 1;
      }
      return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([country, grant_count]) => ({ country, grant_count }));
    }

    case "list_grants": {
      const result = await listGrants({
        limit: Math.min(Number(params.limit ?? 20), 30),
        offset: Number(params.offset ?? 0),
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
      }));
    }

    default:
      throw new Error(`Unknown tool: '${name}'`);
  }
}

// ---------------------------------------------------------------------------
// Anthropic-format tool definitions
// ---------------------------------------------------------------------------

const GRANT_TOOLS: Anthropic.Tool[] = [
  {
    name: "search_grants_by_keyword",
    description:
      "Search for grants whose name, description, or organization contains a keyword. " +
      "Use this first when a user mentions a specific condition, need, or topic.",
    input_schema: {
      type: "object",
      properties: {
        keyword: {
          type: "string",
          description:
            "Search keyword (e.g. 'cancer', 'housing', 'disability', 'education')",
        },
        limit: {
          type: "number",
          description: "Max results to return (default 20, max 30)",
        },
      },
      required: ["keyword"],
    },
  },
  {
    name: "list_grants_by_category",
    description:
      "List all active grants in a specific category (e.g. Medical, Housing, Education, Disability). " +
      "Call list_categories first if unsure of valid category names.",
    input_schema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          description: "Exact category name from the database",
        },
      },
      required: ["category"],
    },
  },
  {
    name: "list_grants_by_country",
    description:
      "List all active grants available in a specific country (e.g. USA, Canada, UK). " +
      "Call list_countries first if unsure of the exact country name.",
    input_schema: {
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
  {
    name: "get_grant_detail",
    description:
      "Retrieve the full record for a single grant: application process, required documents, " +
      "eligibility criteria, contact info, and deadlines.",
    input_schema: {
      type: "object",
      properties: {
        item_id: {
          type: "string",
          description:
            "The unique itemId of the grant, obtained from search or list tools",
        },
      },
      required: ["item_id"],
    },
  },
  {
    name: "list_categories",
    description:
      "Return all grant categories with their active-grant counts. " +
      "Use this to discover available categories before filtering.",
    input_schema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "list_countries",
    description:
      "Return all countries that have at least one active grant, with counts. " +
      "Use this to discover valid country names before filtering.",
    input_schema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "list_grants",
    description:
      "List active grants with pagination when no specific search term is needed.",
    input_schema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Number of grants to return (1–30)",
        },
        offset: {
          type: "number",
          description: "Number of grants to skip (0 = first page)",
        },
      },
      required: ["limit", "offset"],
    },
  },
];

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a compassionate, knowledgeable grant advisor for GrantKit — a curated database of 600+ grants, scholarships, and support resources spanning 29 countries.

Your mission is to help users find financial assistance and support resources that match their specific situation. Users may be individuals, families, or caregivers dealing with medical conditions, housing challenges, education needs, or other hardships.

Guidelines:
- Always use the available tools to search the live database; do not invent grant names or details
- When a user mentions a condition or need, search for relevant keywords AND relevant categories
- Present results in a clear, readable format: name, amount (if known), country, deadline, and a brief why-it-fits explanation
- If a search returns no results, suggest alternative keywords, categories, or countries
- Mention the grant's website or contact when available so the user can apply
- Be warm and empathetic — people searching for grants are often in difficult circumstances
- Respond in the same language as the user's message. If the user writes in Georgian (ქართული), respond fully in Georgian using ONLY Georgian Unicode characters (U+10A0–U+10FF) and Latin script for proper nouns, URLs, and organization names. If the user writes in Russian, respond in Russian. Match the user's language at all times.
- CRITICAL: Never mix scripts. Do NOT use Korean (한국어), Bengali (বাংলা), Japanese (日本語), Chinese (中文), or any other Asian script characters in your responses. Use only the script appropriate for the response language.`;

// ---------------------------------------------------------------------------
// Conversation message type (exported for use in routers.ts)
// ---------------------------------------------------------------------------

export type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

// ---------------------------------------------------------------------------
// Agentic loop
// ---------------------------------------------------------------------------

/**
 * Run the grant-assistant agentic loop for a single user turn.
 * Supports multi-turn conversations via the history parameter.
 */
export async function runGrantAssistant(
  userMessage: string,
  history: ConversationMessage[] = []
): Promise<string> {
  if (!ENV.anthropicApiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const client = new Anthropic({ apiKey: ENV.anthropicApiKey });

  // Build the full message history for this turn
  const messages: Anthropic.MessageParam[] = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: userMessage },
  ];

  const MAX_ITERATIONS = 8;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: GRANT_TOOLS,
      messages,
    });

    // Final text answer — no more tool calls
    if (response.stop_reason === "end_turn") {
      const textBlock = response.content.find((b) => b.type === "text");
      return textBlock?.type === "text" ? textBlock.text : "(No response)";
    }

    // Model wants to call tools — execute them and continue
    if (response.stop_reason === "tool_use") {
      // Append the assistant's response (including tool_use blocks)
      messages.push({ role: "assistant", content: response.content });

      // Execute every tool call and collect results
      const toolResults: Array<{
        type: "tool_result";
        tool_use_id: string;
        content: string;
      }> = [];

      for (const block of response.content) {
        if (block.type === "tool_use") {
          let result: unknown;
          try {
            result = await callTool(block.name, block.input as ToolParams);
          } catch (err) {
            result = { error: String(err) };
          }
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: JSON.stringify(result),
          });
        }
      }

      // Append tool results as a user message to continue the loop
      messages.push({ role: "user", content: toolResults });
    } else {
      break;
    }
  }

  return "I was unable to find relevant grants within the allowed search steps. Please try rephrasing your query.";
}
