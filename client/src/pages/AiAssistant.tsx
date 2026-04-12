/*
 * AI Grant Assistant — powered by MCP Toolbox for Databases
 *
 * Natural-language interface to the live GrantKit MySQL database.
 * Viewport-constrained layout: chat fills available height with sticky input.
 */

import { useState, useEffect, useCallback } from "react";
import { AIChatBox, type Message } from "@/components/AIChatBox";
import { trpc } from "@/lib/trpc";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { Sparkles, Database, Globe, Search } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function AiAssistant() {
  const { t } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [lastInput, setLastInput] = useState<{ message: string; history: { role: "user" | "assistant"; content: string }[] } | null>(null);

  // Lock body scroll for full-viewport chat layout
  useEffect(() => {
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, []);

  const grantChat = trpc.ai.grantChat.useMutation();

  const handleClearMessages = useCallback(() => {
    setMessages([]);
    setLastInput(null);
    grantChat.reset();
  }, [grantChat]);

  const handleSend = useCallback((content: string) => {
    const history = messages
      .filter((m): m is { role: "user" | "assistant"; content: string; timestamp?: Date } =>
        m.role === "user" || m.role === "assistant"
      )
      .map((m) => ({ role: m.role, content: m.content }));

    const input = { message: content, history };
    setLastInput(input);
    setMessages((prev) => [...prev, { role: "user", content, timestamp: new Date() }]);
    grantChat.mutate(input, {
      onSuccess: (data) => {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.reply, timestamp: new Date() },
        ]);
      },
    });
  }, [messages, grantChat]);

  const handleRetry = useCallback(() => {
    if (!lastInput) return;
    grantChat.mutate(lastInput, {
      onSuccess: (data) => {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.reply, timestamp: new Date() },
        ]);
      },
    });
  }, [lastInput, grantChat]);

  const FEATURE_PILLS = [
    { icon: Database, label: t.aiAssistant.liveDatabase },
    { icon: Globe, label: t.aiAssistant.countries },
    { icon: Search, label: t.aiAssistant.grants },
  ];

  return (
    <div className="h-[calc(100dvh-3.5rem)] md:h-[100dvh] overflow-hidden flex flex-col bg-secondary">
      <SEO
        title="AI Grant Assistant — GrantKit"
        description="Find grants and support resources using natural language. Powered by AI and the live GrantKit database of 640+ grants across 29 countries."
        canonicalPath="/ai-assistant"
      />
      <Navbar />

      <main className="flex-1 min-h-0 container py-4 md:py-5 pb-20 md:pb-5 flex flex-col gap-3 max-w-4xl overflow-hidden">
        {/* ── Page header ───────────────────────────────────────────── */}
        <div className="flex flex-col gap-2 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground leading-tight">
                {t.aiAssistant.title}
              </h1>
              <p className="text-xs text-muted-foreground">
                {t.aiAssistant.subtitle}
              </p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground max-w-2xl">
            {t.aiAssistant.description}
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
          onClearMessages={handleClearMessages}
          isLoading={grantChat.isPending}
          error={grantChat.isError}
          onRetry={handleRetry}
          placeholder={t.aiAssistant.placeholder}
          className="flex-1 min-h-0"
          headerTitle={t.aiAssistant.title}
          emptyStateMessage={t.aiAssistant.emptyState}
          newChatLabel={t.aiAssistant.newChat}
          copyLabel={t.aiAssistant.copy}
          errorMessage={t.aiAssistant.error}
          retryLabel={t.aiAssistant.retry}
          suggestedPrompts={t.aiAssistant.suggestedPrompts}
        />
      </main>
    </div>
  );
}
