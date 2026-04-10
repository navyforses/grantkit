/**
 * MCP Toolbox for Databases — GrantKit integration
 * https://github.com/googleapis/mcp-toolbox
 *
 * This module wraps @toolbox-sdk/core to provide:
 *   1. A lazy ToolboxClient that connects to the running toolbox server
 *   2. Static OpenAI-format tool definitions for the grant-assistant LLM call
 *   3. `runGrantAssistant(message)` — an agentic loop that lets the LLM
 *      call toolbox tools and return a final answer
 *
 * The toolbox server must be running before any tool calls are made:
 *   pnpm toolbox:start
 */

import { ToolboxClient } from "@toolbox-sdk/core";
import { ENV } from "./_core/env";

// ---------------------------------------------------------------------------
// Toolbox client — lazily initialised, singleton per process
// ---------------------------------------------------------------------------

type ToolInstance = Awaited<ReturnType<ToolboxClient["loadToolset"]>>[number];

let _client: ToolboxClient | null = null;
let _publicTools: ToolInstance[] | null = null;

function getClient(): ToolboxClient {
  if (!_client) {
    _client = new ToolboxClient(ENV.mcpToolboxUrl);
  }
  return _client;
}

/** Load (and cache) the 'public' toolset from the toolbox server. */
async function getPublicTools(): Promise<ToolInstance[]> {
  if (!_publicTools) {
    _publicTools = await getClient().loadToolset("public");
  }
  return _publicTools;
}

/** Invoke a single tool by name, forwarding `params` to the server. */
export async function callToolboxTool(
  name: string,
  params: Record<string, unknown>
): Promise<unknown> {
  const tools = await getPublicTools();
  const tool = tools.find((t) => t.getName() === name);
  if (!tool) {
    throw new Error(`Toolbox tool '${name}' not found in public toolset`);
  }
  return tool.call(params);
}

// ---------------------------------------------------------------------------
// OpenAI-format tool definitions (mirroring tools.yaml)
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
        "Search for grants whose name, description, or organization contains a keyword. " +
        "Pass the same keyword for keyword, keyword2, and keyword3.",
      parameters: {
        type: "object",
        properties: {
          keyword: {
            type: "string",
            description: "The search keyword (e.g. 'cancer', 'housing', 'disability')",
          },
          keyword2: { type: "string", description: "Same value as keyword" },
          keyword3: { type: "string", description: "Same value as keyword" },
          limit: {
            type: "integer",
            description: "Maximum results to return (default 20)",
          },
        },
        required: ["keyword", "keyword2", "keyword3", "limit"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_grants_by_category",
      description:
        "List all active grants in a specific category (e.g. Medical, Housing, Education). " +
        "Call list_categories first if you are unsure of valid category names.",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            description: "Exact category name as returned by list_categories",
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
        "Call list_countries first if you are unsure of the exact country name.",
      parameters: {
        type: "object",
        properties: {
          country: {
            type: "string",
            description: "Country name as returned by list_countries",
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
        "Retrieve the full record for a single grant including application process, " +
        "required documents, eligibility, contact info, and deadlines.",
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
        "Return all grant categories in the database with their active-grant counts. " +
        "Use this when you need to discover available categories.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "list_countries",
      description:
        "Return all countries that have at least one active grant, with counts. " +
        "Use this when you need to discover available countries.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "list_grants",
      description:
        "List active grants with pagination when no specific search term is needed.",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "integer",
            description: "Number of grants to return (1–50)",
          },
          offset: {
            type: "integer",
            description: "Number of grants to skip (0 = first page)",
          },
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
 * The function drives a tool-use loop (up to MAX_ITERATIONS rounds):
 *   1. Send the conversation to the LLM with the toolbox tools defined
 *   2. If the model returns tool calls, execute them via the toolbox server
 *   3. Feed results back and repeat until the model gives a final text answer
 *
 * @param userMessage  The user's natural-language question
 * @returns            The assistant's final reply
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

    // No tool calls → final answer
    if (!choice.message.tool_calls || choice.message.tool_calls.length === 0) {
      return choice.message.content ?? "(No response)";
    }

    // Append assistant turn (with tool calls)
    messages.push({
      role: "assistant",
      content: choice.message.content ?? null,
      tool_calls: choice.message.tool_calls,
    });

    // Execute each tool call
    for (const tc of choice.message.tool_calls) {
      let toolResult: unknown;
      try {
        const args = JSON.parse(tc.function.arguments) as Record<string, unknown>;
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
