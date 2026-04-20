/**
 * Grant Chat Assistant — per-grant AI conversations.
 *
 * The user opens a chat on a specific grant's detail page and asks
 * questions about that grant / organization. The client prepends the
 * grant's context (name, org, country, amount, deadline, website) to
 * every user message via `client/src/lib/grantFocusContext.ts`, so the
 * LLM always has those fields even without DB lookups.
 *
 * This runner mirrors the agentic loop in `toolboxClient.ts` but with:
 *   • a grant-focused system prompt (knows the conversation is about a
 *     single organisation, not general catalog search)
 *   • an explicit extension point for the upcoming Phase A2+ tools
 *     (website fetch via Jina Reader, GrantedAI similar-grants /
 *     funders search). Today the runner only exposes the DB tools,
 *     so behaviour is identical to the general assistant — but the
 *     seam is in place for the next phase.
 *   • dev-only observability: every tool call is logged with its
 *     latency so we can see which tools the LLM actually reaches for.
 */

import Anthropic from "@anthropic-ai/sdk";
import { ENV } from "./_core/env";
import { GRANT_TOOLS, callTool } from "./toolboxClient";
import { fetchWebsiteMarkdown } from "./tools/webFetch";
import {
  SEARCH_SIMILAR_GRANTS_TOOL,
  executeSearchSimilarGrants,
} from "./tools/externalGrantsTools";

export type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

type ToolParams = Record<string, unknown>;

// Phase A2: fetch_org_website — pulls the organisation's own website
// through Jina Reader and returns clean markdown. Used when the DB
// context does not contain the specific fact the user is asking about
// (e.g. "what products does this org sell?", "what are their hours?").
const FETCH_ORG_WEBSITE_TOOL: Anthropic.Tool = {
  name: "fetch_org_website",
  description:
    "Fetch the organisation's own website and return its content as markdown. " +
    "Use this when the user asks about the organisation's specific offerings, " +
    "services, products, policies, opening hours, staff, or any detail that " +
    "is NOT already in the grant context block and NOT available via the " +
    "catalog search tools. Prefer the official website URL from the grant " +
    "context. The response is truncated after ~8000 characters.",
  input_schema: {
    type: "object",
    properties: {
      url: {
        type: "string",
        description:
          "Absolute http(s) URL of the organisation's website. Usually the " +
          "`website` field from the grant context block.",
      },
    },
    required: ["url"],
  },
};

const GRANT_CHAT_TOOLS: Anthropic.Tool[] = [
  ...GRANT_TOOLS,
  FETCH_ORG_WEBSITE_TOOL,
  SEARCH_SIMILAR_GRANTS_TOOL,
];

async function callGrantChatTool(
  name: string,
  params: ToolParams,
): Promise<unknown> {
  if (name === "fetch_org_website") {
    const url = typeof params.url === "string" ? params.url : "";
    const result = await fetchWebsiteMarkdown(url);
    return {
      url: result.url,
      cached: result.cached,
      truncated: result.truncated,
      markdown: result.markdown,
    };
  }
  if (name === "search_similar_grants") {
    return executeSearchSimilarGrants(params);
  }
  return callTool(name, params);
}

// ---------------------------------------------------------------------------
// System prompt — per-grant context
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a compassionate, knowledgeable assistant for a GrantKit user who is currently viewing a specific grant / organisation detail page. The user's message includes a context block at the top listing what GrantKit already knows about that grant (name, organisation, country, amount, deadline, website). Always ground your answer in that context first.

Your job on this page:
- Answer questions about the specific grant / organisation the user is looking at.
- Help the user understand eligibility, application process, fit for their situation, and how to get in touch.
- When the user asks about "similar grants" or "other options", use the catalog tools to find matches (by keyword / country / category) and always include the grant's website URL as a clickable markdown link.

Tool usage order (important):
1. Answer from the grant context block if the fact is already there.
2. If the user asks about the organisation's own offerings / services / policies / hours / staff and that info is NOT in the context, call \`fetch_org_website\` with the website URL from the context block. Cite the URL in your answer.
3. If the user asks for similar grants or other options, first try the catalog tools (\`search_grants_by_keyword\`, \`list_grants_by_category\`, \`list_grants_by_country\`, \`get_grant_detail\`) — these search GrantKit's curated 640-grant DB.
4. If the catalog tools return nothing useful, or the user explicitly asks for a wider search, call \`search_similar_grants\` — this queries an external 84 000-grant index (GrantedAI). Always include each result's applyUrl as a markdown link.
5. Never call \`fetch_org_website\` on a URL that is not the organisation's official website.

Rules:
- Do NOT invent facts about the organisation. If neither the context block nor any tool returns the answer, say so honestly and suggest the user visit the official website or contact the organisation directly.
- When you cite facts from a tool, include the source as a markdown link.
- Respond in the same language as the user's message. If the user writes in Georgian (ქართული), respond fully in Georgian using ONLY Georgian Unicode characters (U+10A0–U+10FF) and Latin script for proper nouns, URLs, and organisation names. Match Russian, French, Spanish, English the same way.
- CRITICAL: Never mix scripts. Do NOT use Korean (한국어), Bengali (বাংলা), Japanese (日本語), Chinese (中文), or any other Asian script characters in your responses. Use only the script appropriate for the response language.
- Be warm and empathetic — people asking about grants are often in difficult circumstances.`;

// ---------------------------------------------------------------------------
// Agentic loop
// ---------------------------------------------------------------------------

const MAX_ITERATIONS = 8;
const MODEL = "claude-haiku-4-5";
const IS_DEV = process.env.NODE_ENV !== "production";

export async function runGrantChatAssistant(
  userMessage: string,
  history: ConversationMessage[] = [],
): Promise<string> {
  if (!ENV.anthropicApiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const client = new Anthropic({ apiKey: ENV.anthropicApiKey });

  const messages: Anthropic.MessageParam[] = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: userMessage },
  ];

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: GRANT_CHAT_TOOLS,
      messages,
    });

    if (response.stop_reason === "end_turn") {
      const textBlock = response.content.find((b) => b.type === "text");
      return textBlock?.type === "text" ? textBlock.text : "(No response)";
    }

    if (response.stop_reason === "tool_use") {
      messages.push({ role: "assistant", content: response.content });

      const toolResults: Array<{
        type: "tool_result";
        tool_use_id: string;
        content: string;
      }> = [];

      for (const block of response.content) {
        if (block.type === "tool_use") {
          const start = Date.now();
          let result: unknown;
          try {
            result = await callGrantChatTool(block.name, block.input as ToolParams);
          } catch (err) {
            result = { error: String(err) };
          }
          if (IS_DEV) {
            // eslint-disable-next-line no-console
            console.log(
              `[grantChat] tool=${block.name} duration=${Date.now() - start}ms`,
            );
          }
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: JSON.stringify(result),
          });
        }
      }

      messages.push({ role: "user", content: toolResults });
    } else {
      break;
    }
  }

  return "I was unable to finish processing this request. Please try rephrasing your question.";
}
