/*
 * AI Grant Assistant — powered by MCP Toolbox for Databases
 *
 * Natural-language interface to the live GrantKit MySQL database.
 * The page wires the existing AIChatBox component to the server-side
 * ai.grantChat tRPC mutation which drives an agentic tool-use loop via
 * googleapis/mcp-toolbox and the Forge LLM.
 */

import { useState } from "react";
import { AIChatBox, type Message } from "@/components/AIChatBox";
import { trpc } from "@/lib/trpc";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { Sparkles, Database, Globe, Search } from "lucide-react";

const SUGGESTED_PROMPTS = [
  "Find cancer treatment grants in the USA",
  "What housing assistance is available in Canada?",
  "Show me education grants for low-income families",
  "Find disability support grants in the UK",
  "Are there grants available for rare disease patients?",
  "What grants exist for medical expenses in Europe?",
];

const FEATURE_PILLS = [
  { icon: Database, label: "Live database" },
  { icon: Globe, label: "29 countries" },
  { icon: Search, label: "640+ grants" },
];

export default function AiAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);

  const grantChat = trpc.ai.grantChat.useMutation({
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply },
      ]);
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, I encountered an error searching the database. " +
            "Please try again or browse the [grant catalog](/catalog) directly.",
        },
      ]);
    },
  });

  const handleSend = (content: string) => {
    // Capture history before updating state (previous turns only)
    const history = messages
      .filter((m): m is { role: "user" | "assistant"; content: string } =>
        m.role === "user" || m.role === "assistant"
      )
      .map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, { role: "user", content }]);
    grantChat.mutate({ message: content, history });
  };

  return (
    <div className="min-h-screen flex flex-col bg-secondary">
      <SEO
        title="AI Grant Assistant — GrantKit"
        description="Find grants and support resources using natural language. Powered by AI and the live GrantKit database of 640+ grants across 29 countries."
        canonicalPath="/ai-assistant"
      />
      <Navbar />

      <main className="flex-1 container py-6 md:py-8 flex flex-col gap-5 max-w-4xl">
        {/* ── Page header ───────────────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground leading-tight">
                AI Grant Assistant
              </h1>
              <p className="text-xs text-muted-foreground">
                Powered by MCP Toolbox · Live database search
              </p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground max-w-2xl">
            Describe what you're looking for — a condition, location, type of support —
            and the assistant will search the live database to find matching grants
            and resources.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2">
            {FEATURE_PILLS.map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 text-xs font-medium bg-card border border-border text-muted-foreground px-3 py-1 rounded-full"
              >
                <Icon className="w-3 h-3" />
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* ── Chat box ──────────────────────────────────────────────── */}
        <AIChatBox
          messages={messages}
          onSendMessage={handleSend}
          isLoading={grantChat.isPending}
          placeholder='Ask about grants… e.g. "cancer treatment grants in USA"'
          className="flex-1"
          height="calc(100vh - 300px)"
          emptyStateMessage="Ask me about grants, funding, or support resources"
          suggestedPrompts={SUGGESTED_PROMPTS}
        />
      </main>

      <Footer />
    </div>
  );
}
